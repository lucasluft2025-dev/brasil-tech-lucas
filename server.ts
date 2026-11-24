import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isBootstrappedAdminEmail,
  isValidAdminSessionToken,
} from './src/lib/adminSession.ts';

interface StoredTracking {
  code: string;
  orderCode: string;
  customerLabel: string;
  maskedCpf?: string;
  customerCpf?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCep?: string;
  productSummary: string;
  cityState: string;
  originCityState: string;
  destinationCityState: string;
  currentLocation: string;
  routeProgress: number;
  invoiceNumber: string;
  orderTotal: number;
  weightKg: number;
  shippingLabel: string;
  statusStep: number;
  statusNote: string;
  active: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readFirebaseApiKey(): string {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

const FIREBASE_API_KEY = readFirebaseApiKey();

function resolveStorageFile(): string {
  const localDir = path.join(__dirname, '.data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testPath = path.join(localDir, 'trackings.json');
    if (!fs.existsSync(testPath)) {
      fs.writeFileSync(testPath, '{}', 'utf8');
    }
    return testPath;
  } catch {
    const tmpPath = '/tmp/brasiltech-trackings.json';
    if (!fs.existsSync(tmpPath)) {
      fs.writeFileSync(tmpPath, '{}', 'utf8');
    }
    return tmpPath;
  }
}

const STORAGE_FILE = resolveStorageFile();
const trackingStore = new Map<string, StoredTracking>();

function loadInitialTrackings(): void {
  try {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, StoredTracking>;
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, val]) => {
        if (val && typeof val === 'object' && val.code) {
          trackingStore.set(key.toUpperCase(), {
            ...val,
            code: String(val.code).toUpperCase(),
          });
        }
      });
    }
  } catch {
    // start empty if file unreadable
  }
}

function persistTrackingsToDisk(): void {
  try {
    const obj: Record<string, StoredTracking> = {};
    trackingStore.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // keep in-memory store even if disk write fails
  }
}

loadInitialTrackings();

function sanitizeTrackingCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 60);
}

function isValidCode(code: string): boolean {
  return /^[A-Z0-9_-]{3,60}$/.test(code);
}

function toPublicTracking(item: StoredTracking): Omit<
  StoredTracking,
  'customerCpf' | 'customerPhone' | 'customerAddress' | 'customerCep'
> {
  return {
    code: item.code,
    orderCode: item.orderCode,
    customerLabel: item.customerLabel,
    maskedCpf: item.maskedCpf || '',
    productSummary: item.productSummary,
    cityState: item.cityState,
    originCityState: item.originCityState,
    destinationCityState: item.destinationCityState,
    currentLocation: item.currentLocation,
    routeProgress: item.routeProgress,
    invoiceNumber: item.invoiceNumber,
    orderTotal: item.orderTotal,
    weightKg: item.weightKg,
    shippingLabel: item.shippingLabel,
    statusStep: item.statusStep,
    statusNote: item.statusNote,
    active: item.active,
    createdAtLabel: item.createdAtLabel,
    updatedAtLabel: item.updatedAtLabel,
  };
}

const verifiedTokenCache = new Map<string, { email: string; expiresAt: number }>();

async function verifyFirebaseAdminBearer(authHeader?: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !FIREBASE_API_KEY) {
    return false;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return false;
  const cached = verifiedTokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return true;
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    const ok = Boolean(user && isBootstrappedAdminEmail(user.email, user.emailVerified));
    if (ok && user?.email) {
      verifiedTokenCache.set(idToken, {
        email: user.email,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }
    return ok;
  } catch {
    return false;
  }
}

async function isAuthorizedAdminRequest(req: express.Request): Promise<boolean> {
  const sessionToken = req.header('x-admin-session');
  if (isValidAdminSessionToken(sessionToken)) {
    return true;
  }
  return verifyFirebaseAdminBearer(req.header('authorization'));
}

// --- Real-Time SSE Broadcast Hub ---
const sseClients = new Set<express.Response>();

function broadcastStoreEvent(topic: string, code?: string): void {
  const payload = JSON.stringify({ topic, ...(code ? { code } : {}), ts: Date.now() });
  const frame = `data: ${payload}\n\n`;
  sseClients.forEach((clientRes) => {
    try {
      clientRes.write(frame);
    } catch {
      sseClients.delete(clientRes);
    }
  });
}

// --- Shared Persistent Store Data (Products, Settings, Coupons, Reviews, Q&A, Orders) ---
interface StoredCouponRecord {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  label: string;
  active: boolean;
}

interface StoredReviewOverride {
  status: 'pending' | 'approved' | 'rejected';
  deleted?: boolean;
}

interface StoredQuestionOverride {
  answer?: string;
  answered?: boolean;
  date?: string;
  deleted?: boolean;
}

interface StoredOrderOverride {
  statusStep?: number;
  trackingCode?: string;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  deleted?: boolean;
}

interface StoreDataFileState {
  productsById: Record<string, Record<string, unknown>>;
  deletedProductIds: number[];
  costs: Record<string, number>;
  storeSettings: Record<string, unknown> | null;
  couponsByCode: Record<string, StoredCouponRecord>;
  deletedCouponCodes: string[];
  reviewOverrides: Record<string, StoredReviewOverride>;
  reviewsById: Record<string, Record<string, unknown>>;
  questionOverrides: Record<string, StoredQuestionOverride>;
  questionsById: Record<string, Record<string, unknown>>;
  orderOverrides: Record<string, StoredOrderOverride>;
  ordersByCode: Record<string, Record<string, unknown>>;
  updatedAt: string;
}

function createEmptyStoreData(): StoreDataFileState {
  return {
    productsById: {},
    deletedProductIds: [],
    costs: {},
    storeSettings: null,
    couponsByCode: {},
    deletedCouponCodes: [],
    reviewOverrides: {},
    reviewsById: {},
    questionOverrides: {},
    questionsById: {},
    orderOverrides: {},
    ordersByCode: {},
    updatedAt: new Date().toISOString(),
  };
}

function resolveStoreDataFile(): string {
  const localDir = path.join(__dirname, '.data');
  try {
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const filePath = path.join(localDir, 'store_data.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(createEmptyStoreData(), null, 2), 'utf8');
    }
    return filePath;
  } catch {
    const tmp = '/tmp/brasiltech-store-data.json';
    if (!fs.existsSync(tmp)) {
      fs.writeFileSync(tmp, JSON.stringify(createEmptyStoreData(), null, 2), 'utf8');
    }
    return tmp;
  }
}

const STORE_DATA_FILE = resolveStoreDataFile();
let storeDataState: StoreDataFileState = createEmptyStoreData();

try {
  const raw = fs.readFileSync(STORE_DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw) as Partial<StoreDataFileState>;
  if (parsed && typeof parsed === 'object') {
    storeDataState = {
      ...createEmptyStoreData(),
      ...parsed,
      productsById: parsed.productsById && typeof parsed.productsById === 'object' ? parsed.productsById : {},
      deletedProductIds: Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds.map(Number) : [],
      costs: parsed.costs && typeof parsed.costs === 'object' ? parsed.costs : {},
      storeSettings: parsed.storeSettings && typeof parsed.storeSettings === 'object' ? parsed.storeSettings : null,
      couponsByCode: parsed.couponsByCode && typeof parsed.couponsByCode === 'object' ? parsed.couponsByCode : {},
      deletedCouponCodes: Array.isArray(parsed.deletedCouponCodes) ? parsed.deletedCouponCodes.map(String) : [],
      reviewOverrides: parsed.reviewOverrides && typeof parsed.reviewOverrides === 'object' ? parsed.reviewOverrides : {},
      reviewsById: parsed.reviewsById && typeof parsed.reviewsById === 'object' ? parsed.reviewsById : {},
      questionOverrides: parsed.questionOverrides && typeof parsed.questionOverrides === 'object' ? parsed.questionOverrides : {},
      questionsById: parsed.questionsById && typeof parsed.questionsById === 'object' ? parsed.questionsById : {},
      orderOverrides: parsed.orderOverrides && typeof parsed.orderOverrides === 'object' ? parsed.orderOverrides : {},
      ordersByCode: parsed.ordersByCode && typeof parsed.ordersByCode === 'object' ? parsed.ordersByCode : {},
    };
  }
} catch {
  storeDataState = createEmptyStoreData();
}

function persistStoreData(): void {
  storeDataState.updatedAt = new Date().toISOString();
  try {
    fs.writeFileSync(STORE_DATA_FILE, JSON.stringify(storeDataState, null, 2), 'utf8');
  } catch {
    // keep in-memory store even if disk write fails
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // SSE stream for instant live updates across storefront visitors & admin tabs
  app.get('/api/store-events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Public store data (no wholesale costs, no customer PII orders)
  app.get('/api/store-data', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      productsById: storeDataState.productsById,
      deletedProductIds: storeDataState.deletedProductIds,
      storeSettings: storeDataState.storeSettings,
      couponsByCode: storeDataState.couponsByCode,
      deletedCouponCodes: storeDataState.deletedCouponCodes,
      reviewOverrides: storeDataState.reviewOverrides,
      reviewsById: storeDataState.reviewsById,
      questionOverrides: storeDataState.questionOverrides,
      questionsById: storeDataState.questionsById,
      orderOverrides: storeDataState.orderOverrides,
      updatedAt: storeDataState.updatedAt,
    });
  });

  // Admin full store data (includes wholesale costs & server-recorded orders)
  app.get('/api/admin/store-data', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(storeDataState);
  });

  // Admin: upsert product + wholesale cost
  app.post('/api/admin/products', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as {
      product?: Record<string, unknown>;
      costPrice?: number;
    };
    const prod = body.product;
    const prodId = Number(prod?.id);
    if (!prod || !Number.isFinite(prodId) || prodId <= 0) {
      res.status(400).json({ error: 'Produto inválido.' });
      return;
    }
    const key = String(prodId);
    storeDataState.productsById[key] = { ...prod, id: prodId };
    storeDataState.deletedProductIds = storeDataState.deletedProductIds.filter((id) => id !== prodId);
    if (typeof body.costPrice === 'number' && Number.isFinite(body.costPrice)) {
      storeDataState.costs[key] = Math.max(0, Number(body.costPrice));
    }
    persistStoreData();
    broadcastStoreEvent('products', key);
    res.json({ ok: true, product: storeDataState.productsById[key] });
  });

  // Admin: adjust single product stock
  app.patch('/api/admin/products/:id/stock', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const prodId = Number(req.params.id);
    if (!Number.isFinite(prodId) || prodId <= 0) {
      res.status(400).json({ error: 'ID de produto inválido.' });
      return;
    }
    const body = (req.body || {}) as { stock?: number; product?: Record<string, unknown> };
    const nextStock = Math.max(0, Math.round(Number(body.stock ?? 0)));
    const key = String(prodId);
    const base = storeDataState.productsById[key] || body.product || { id: prodId };
    storeDataState.productsById[key] = { ...base, id: prodId, stock: nextStock };
    storeDataState.deletedProductIds = storeDataState.deletedProductIds.filter((id) => id !== prodId);
    persistStoreData();
    broadcastStoreEvent('products', key);
    res.json({ ok: true, stock: nextStock });
  });

  // Admin: deduct stock from order items
  app.post('/api/admin/products/deduct-stock', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as {
      items?: Array<{ id: number; qty: number }>;
      productsSnapshot?: Array<Record<string, unknown>>;
    };
    const items = Array.isArray(body.items) ? body.items : [];
    const snapshot = Array.isArray(body.productsSnapshot) ? body.productsSnapshot : [];
    let updated = 0;
    items.forEach((item) => {
      const idNum = Number(item.id);
      const qty = Math.max(1, Math.round(Number(item.qty || 1)));
      const key = String(idNum);
      const existing =
        storeDataState.productsById[key] ||
        snapshot.find((p) => Number(p.id) === idNum);
      if (!existing) return;
      const curStock = Number(existing.stock ?? 0);
      const curSold = Number(existing.sold ?? 0);
      storeDataState.productsById[key] = {
        ...existing,
        id: idNum,
        stock: Math.max(0, curStock - qty),
        sold: curSold + qty,
      };
      updated += 1;
    });
    if (updated > 0) {
      persistStoreData();
      broadcastStoreEvent('products');
    }
    res.json({ ok: true, updated });
  });

  // Admin: delete product
  app.delete('/api/admin/products/:id', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const prodId = Number(req.params.id);
    if (!Number.isFinite(prodId) || prodId <= 0) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    const key = String(prodId);
    delete storeDataState.productsById[key];
    delete storeDataState.costs[key];
    if (!storeDataState.deletedProductIds.includes(prodId)) {
      storeDataState.deletedProductIds.push(prodId);
    }
    persistStoreData();
    broadcastStoreEvent('products', key);
    res.json({ ok: true });
  });

  // Admin: store settings
  app.post('/api/admin/store-settings', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    storeDataState.storeSettings = {
      storeName: String(body.storeName || 'Brasil Tech').trim().slice(0, 100),
      cnpj: String(body.cnpj || '').trim().slice(0, 40),
      address: String(body.address || '').trim().slice(0, 200),
      phone: String(body.phone || '').trim().slice(0, 30),
      whatsappDigits: String(body.whatsappDigits || '').replace(/\D/g, '').slice(0, 20),
      email: String(body.email || '').trim().slice(0, 160),
      expressShippingPrice: Math.max(0, Number(body.expressShippingPrice ?? 30)),
      standardShippingPrice: Math.max(0, Number(body.standardShippingPrice ?? 15)),
      pixDiscountPercent: Math.min(50, Math.max(0, Number(body.pixDiscountPercent ?? 0))),
    };
    persistStoreData();
    broadcastStoreEvent('store-settings');
    res.json({ ok: true, storeSettings: storeDataState.storeSettings });
  });

  // Admin: upsert coupon
  app.post('/api/admin/coupons', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as Partial<StoredCouponRecord>;
    const code = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32);
    if (!code) {
      res.status(400).json({ error: 'Código de cupom inválido.' });
      return;
    }
    const record: StoredCouponRecord = {
      code,
      type: body.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(body.value || 0)),
      label: String(body.label || '').trim().slice(0, 80),
      active: body.active !== false,
    };
    storeDataState.couponsByCode[code] = record;
    storeDataState.deletedCouponCodes = storeDataState.deletedCouponCodes.filter((c) => c !== code);
    persistStoreData();
    broadcastStoreEvent('coupons', code);
    res.json({ ok: true, coupon: record });
  });

  // Admin: delete coupon
  app.delete('/api/admin/coupons/:code', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const code = String(req.params.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32);
    if (!code) {
      res.status(400).json({ error: 'Código inválido.' });
      return;
    }
    delete storeDataState.couponsByCode[code];
    if (!storeDataState.deletedCouponCodes.includes(code)) {
      storeDataState.deletedCouponCodes.push(code);
    }
    persistStoreData();
    broadcastStoreEvent('coupons', code);
    res.json({ ok: true });
  });

  // Public: record customer Q&A / review fallback so admin always sees it
  app.post('/api/questions', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const docId = String(body.docId || `q_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!docId || !String(body.question || '').trim()) {
      res.status(400).json({ error: 'Pergunta inválida.' });
      return;
    }
    storeDataState.questionsById[docId] = {
      docId,
      productId: Number(body.productId || 1),
      productName: String(body.productName || '').slice(0, 160),
      userId: String(body.userId || '').slice(0, 120),
      authorName: String(body.authorName || 'Cliente').slice(0, 80),
      question: String(body.question || '').trim().slice(0, 600),
      answer: '',
      date: String(body.date || new Date().toLocaleDateString('pt-BR')).slice(0, 60),
      answered: false,
    };
    persistStoreData();
    broadcastStoreEvent('questions', docId);
    res.json({ ok: true });
  });

  app.post('/api/reviews', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const docId = String(body.docId || `rev_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!docId || !String(body.comment || '').trim()) {
      res.status(400).json({ error: 'Avaliação inválida.' });
      return;
    }
    storeDataState.reviewsById[docId] = {
      docId,
      id: Number(body.id || Date.now()),
      productId: Number(body.productId || 1),
      product: String(body.product || '').slice(0, 160),
      author: String(body.author || 'Cliente').slice(0, 80),
      city: String(body.city || 'Cliente Verificado').slice(0, 80),
      rating: Math.min(5, Math.max(1, Math.round(Number(body.rating || 5)))),
      date: String(body.date || new Date().toLocaleDateString('pt-BR')).slice(0, 60),
      comment: String(body.comment || '').trim().slice(0, 1000),
      userId: String(body.userId || '').slice(0, 120),
      status: 'pending',
    };
    persistStoreData();
    broadcastStoreEvent('reviews', docId);
    res.json({ ok: true });
  });

  // Public checkout -> record order snapshot securely for Admin visibility (never listed publicly)
  app.post('/api/orders', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const code = String(body.code || '').trim().slice(0, 60);
    if (!code) {
      res.status(400).json({ error: 'Pedido inválido.' });
      return;
    }
    storeDataState.ordersByCode[code] = { ...body, code, docId: code };
    persistStoreData();
    broadcastStoreEvent('orders', code);
    res.json({ ok: true });
  });

  // Admin: answer / delete question
  app.post('/api/admin/questions/:docId', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const docId = String(req.params.docId || '').slice(0, 80);
    const body = (req.body || {}) as { answer?: string; date?: string };
    const answer = String(body.answer || '').trim().slice(0, 1200);
    const dateLabel = String(
      body.date || `${new Date().toLocaleDateString('pt-BR')} • Brasil Tech Oficial`
    ).slice(0, 80);
    storeDataState.questionOverrides[docId] = {
      answer,
      answered: true,
      date: dateLabel,
      deleted: false,
    };
    if (storeDataState.questionsById[docId]) {
      storeDataState.questionsById[docId] = {
        ...storeDataState.questionsById[docId],
        answer,
        answered: true,
        date: dateLabel,
      };
    }
    persistStoreData();
    broadcastStoreEvent('questions', docId);
    res.json({ ok: true });
  });

  app.delete('/api/admin/questions/:docId', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const docId = String(req.params.docId || '').slice(0, 80);
    storeDataState.questionOverrides[docId] = { deleted: true };
    delete storeDataState.questionsById[docId];
    persistStoreData();
    broadcastStoreEvent('questions', docId);
    res.json({ ok: true });
  });

  // Admin: moderate / delete review
  app.post('/api/admin/reviews/:docId', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const docId = String(req.params.docId || '').slice(0, 80);
    const body = (req.body || {}) as { status?: string };
    const status =
      body.status === 'approved' || body.status === 'rejected' ? body.status : 'pending';
    storeDataState.reviewOverrides[docId] = { status, deleted: false };
    if (storeDataState.reviewsById[docId]) {
      storeDataState.reviewsById[docId] = {
        ...storeDataState.reviewsById[docId],
        status,
      };
    }
    persistStoreData();
    broadcastStoreEvent('reviews', docId);
    res.json({ ok: true });
  });

  app.delete('/api/admin/reviews/:docId', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const docId = String(req.params.docId || '').slice(0, 80);
    storeDataState.reviewOverrides[docId] = { status: 'rejected', deleted: true };
    delete storeDataState.reviewsById[docId];
    persistStoreData();
    broadcastStoreEvent('reviews', docId);
    res.json({ ok: true });
  });

  // Admin: update / delete order
  app.post('/api/admin/orders/:code', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const code = String(req.params.code || '').trim().slice(0, 60);
    const body = (req.body || {}) as StoredOrderOverride;
    const paymentStatus =
      body.paymentStatus === 'paid' || body.paymentStatus === 'refunded'
        ? body.paymentStatus
        : 'pending';
    const statusStep = Math.min(4, Math.max(0, Math.round(Number(body.statusStep ?? 0))));
    const trackingCode = String(body.trackingCode || '').trim().slice(0, 60);
    storeDataState.orderOverrides[code] = {
      statusStep,
      trackingCode,
      paymentStatus,
      deleted: false,
    };
    if (storeDataState.ordersByCode[code]) {
      storeDataState.ordersByCode[code] = {
        ...storeDataState.ordersByCode[code],
        statusStep,
        trackingCode,
        paymentStatus,
      };
    }
    persistStoreData();
    broadcastStoreEvent('orders', code);
    res.json({ ok: true });
  });

  app.delete('/api/admin/orders/:code', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const code = String(req.params.code || '').trim().slice(0, 60);
    storeDataState.orderOverrides[code] = { deleted: true };
    delete storeDataState.ordersByCode[code];
    persistStoreData();
    broadcastStoreEvent('orders', code);
    res.json({ ok: true });
  });

  // Admin: list all trackings (includes full NF-e/label/WhatsApp details)
  app.get('/api/trackings', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const items = Array.from(trackingStore.values()).sort((a, b) =>
      b.updatedAtLabel.localeCompare(a.updatedAtLabel)
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ items });
  });

  // Public: exact tracking code lookup (zero unmasked PII, active records only)
  app.get('/api/trackings/:code', (req, res) => {
    const cleanCode = sanitizeTrackingCode(req.params.code);
    if (!isValidCode(cleanCode)) {
      res.status(404).json({ error: 'Código inválido.' });
      return;
    }
    const found = trackingStore.get(cleanCode);
    if (!found || !found.active) {
      res.status(404).json({ error: 'Rastreio não encontrado.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ tracking: toPublicTracking(found) });
  });

  // Admin: create or update tracking record
  app.post('/api/trackings', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as Partial<StoredTracking>;
    const cleanCode = sanitizeTrackingCode(body.code);
    if (!isValidCode(cleanCode)) {
      res.status(400).json({ error: 'Código de rastreio inválido.' });
      return;
    }
    const customerLabel = String(body.customerLabel || '').trim().slice(0, 80);
    const productSummary = String(body.productSummary || '').trim().slice(0, 240);
    const dest = String(body.destinationCityState || body.cityState || '').trim().slice(0, 120);
    if (!customerLabel || !productSummary || !dest) {
      res.status(400).json({ error: 'Cliente, produto e destino são obrigatórios.' });
      return;
    }

    const existing = trackingStore.get(cleanCode);
    const nowLabel = new Date().toLocaleString('pt-BR').slice(0, 60);
    const statusStep = Math.min(4, Math.max(0, Math.round(Number(body.statusStep) || 0)));
    const origin = String(body.originCityState || 'Curitiba - PR').trim().slice(0, 120);
    const routeProgress = Math.min(
      100,
      Math.max(0, Math.round(Number(body.routeProgress ?? existing?.routeProgress ?? 15)))
    );

    const saved: StoredTracking = {
      code: cleanCode,
      orderCode: String(body.orderCode || '').trim().slice(0, 40),
      customerLabel,
      maskedCpf: String(body.maskedCpf || '').trim().slice(0, 30),
      customerCpf: String(body.customerCpf || '').trim().slice(0, 30),
      customerPhone: String(body.customerPhone || '').trim().slice(0, 30),
      customerAddress: String(body.customerAddress || '').trim().slice(0, 300),
      customerCep: String(body.customerCep || '').trim().slice(0, 20),
      productSummary,
      cityState: dest,
      originCityState: origin || 'Curitiba - PR',
      destinationCityState: dest,
      currentLocation: String(body.currentLocation || origin || 'Curitiba - PR')
        .trim()
        .slice(0, 160),
      routeProgress,
      invoiceNumber: String(body.invoiceNumber || existing?.invoiceNumber || '')
        .trim()
        .slice(0, 40),
      orderTotal: Math.max(0, Number(body.orderTotal || 0)),
      weightKg: Math.max(0.1, Math.min(500, Number(body.weightKg || 1.2))),
      shippingLabel: String(body.shippingLabel || 'Correios SEDEX • Brasil Tech Express')
        .trim()
        .slice(0, 120),
      statusStep,
      statusNote: String(body.statusNote || '').trim().slice(0, 300),
      active: body.active !== false,
      createdAtLabel: existing?.createdAtLabel || String(body.createdAtLabel || nowLabel).slice(0, 60),
      updatedAtLabel: String(body.updatedAtLabel || nowLabel).slice(0, 60),
    };

    trackingStore.set(cleanCode, saved);
    persistTrackingsToDisk();
    broadcastStoreEvent('trackings', cleanCode);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ tracking: saved });
  });

  // Admin: delete tracking record
  app.delete('/api/trackings/:code', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const cleanCode = sanitizeTrackingCode(req.params.code);
    trackingStore.delete(cleanCode);
    persistTrackingsToDisk();
    broadcastStoreEvent('trackings', cleanCode);
    res.json({ ok: true });
  });

  // --- Shared Storefront Banners & Categories Config (Admin-editable, zero-code) ---
  const storefrontConfigFile = (() => {
    const localDir = path.join(__dirname, '.data');
    try {
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const filePath = path.join(localDir, 'storefront_content.json');
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}', 'utf8');
      return filePath;
    } catch {
      const tmp = '/tmp/brasiltech-storefront-content.json';
      if (!fs.existsSync(tmp)) fs.writeFileSync(tmp, '{}', 'utf8');
      return tmp;
    }
  })();

  let storefrontContentCache: {
    banners?: unknown[];
    categories?: unknown[];
    metaPixelId?: string;
    installmentsMax?: number;
    updatedAt?: string;
  } = {};
  try {
    const raw = fs.readFileSync(storefrontConfigFile, 'utf8');
    const parsed = JSON.parse(raw) as typeof storefrontContentCache;
    if (parsed && typeof parsed === 'object') {
      storefrontContentCache = parsed;
    }
  } catch {
    storefrontContentCache = {};
  }

  app.get('/api/storefront-content', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(storefrontContentCache);
  });

  app.post('/api/storefront-content', async (req, res) => {
    if (!(await isAuthorizedAdminRequest(req))) {
      res.status(401).json({ error: 'Acesso administrativo necessário.' });
      return;
    }
    const body = (req.body || {}) as {
      banners?: unknown[];
      categories?: unknown[];
      metaPixelId?: string;
      installmentsMax?: number;
    };
    const next = {
      banners: Array.isArray(body.banners) ? body.banners.slice(0, 20) : storefrontContentCache.banners,
      categories: Array.isArray(body.categories)
        ? body.categories.slice(0, 30)
        : storefrontContentCache.categories,
      metaPixelId:
        typeof body.metaPixelId === 'string'
          ? body.metaPixelId.replace(/\D/g, '').slice(0, 24)
          : storefrontContentCache.metaPixelId || '',
      installmentsMax:
        typeof body.installmentsMax === 'number'
          ? Math.min(24, Math.max(1, Math.round(body.installmentsMax)))
          : storefrontContentCache.installmentsMax || 12,
      updatedAt: new Date().toISOString(),
    };
    storefrontContentCache = next;
    try {
      fs.writeFileSync(storefrontConfigFile, JSON.stringify(next, null, 2), 'utf8');
    } catch {
      // keep in-memory cache
    }
    broadcastStoreEvent('storefront-content');
    res.setHeader('Cache-Control', 'no-store');
    res.json(next);
  });

  // --- Real Mercado Pago PIX API & Webhook Confirmation (NEVER simulates approval) ---
  interface StoredMpPayment {
    paymentId: string;
    orderCode: string;
    status: string;
    statusDetail: string;
    amount: number;
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl: string;
    expiresAt: string;
    updatedAt: string;
  }

  const mpPaymentsFile = (() => {
    const localDir = path.join(__dirname, '.data');
    try {
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const filePath = path.join(localDir, 'mp_payments.json');
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}', 'utf8');
      return filePath;
    } catch {
      const tmp = '/tmp/brasiltech-mp-payments.json';
      if (!fs.existsSync(tmp)) fs.writeFileSync(tmp, '{}', 'utf8');
      return tmp;
    }
  })();

  const mpPaymentStore = new Map<string, StoredMpPayment>();
  try {
    const raw = fs.readFileSync(mpPaymentsFile, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, StoredMpPayment>;
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]) => {
        if (v && v.paymentId) mpPaymentStore.set(String(k), v);
      });
    }
  } catch {
    // ignore read error
  }

  const persistMpPayments = () => {
    try {
      const obj: Record<string, StoredMpPayment> = {};
      mpPaymentStore.forEach((v, k) => {
        obj[k] = v;
      });
      fs.writeFileSync(mpPaymentsFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch {
      // ignore write error
    }
  };

  app.get('/api/payments/mercadopago/status', (_req, res) => {
    const configured = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
    res.setHeader('Cache-Control', 'no-store');
    res.json({ configured });
  });

  app.post('/api/payments/mercadopago/pix', async (req, res) => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!token) {
      res.status(503).json({
        configured: false,
        error:
          'Gateway PIX Mercado Pago ainda não configurado no servidor (MERCADOPAGO_ACCESS_TOKEN).',
      });
      return;
    }

    const body = (req.body || {}) as {
      orderCode?: string;
      amount?: number;
      description?: string;
      payerEmail?: string;
      payerName?: string;
      payerCpf?: string;
    };

    const orderCode = String(body.orderCode || `BT-${Date.now()}`).trim().slice(0, 60);
    const amount = Number(Number(body.amount || 0).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Valor inválido para geração do PIX.' });
      return;
    }

    const fullName = String(body.payerName || 'Cliente Brasil Tech').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Brasil Tech';
    const cpfDigits = String(body.payerCpf || '').replace(/\D/g, '').slice(0, 11);
    const email = String(body.payerEmail || 'contato@brasiltech.com.br').trim().slice(0, 160);

    const protocol = req.header('x-forwarded-proto') || req.protocol || 'https';
    const host = req.header('x-forwarded-host') || req.header('host') || '';
    const notificationUrl =
      host && !host.includes('localhost') && !host.includes('127.0.0.1')
        ? `${protocol}://${host}/api/payments/mercadopago/webhook`
        : undefined;

    try {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `bt-pix-${orderCode}-${amount}`,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: String(body.description || `Pedido ${orderCode} - Brasil Tech`).slice(0, 200),
          payment_method_id: 'pix',
          external_reference: orderCode,
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
          payer: {
            email,
            first_name: firstName,
            last_name: lastName,
            ...(cpfDigits.length === 11
              ? { identification: { type: 'CPF', number: cpfDigits } }
              : {}),
          },
        }),
      });

      const mpData = (await mpRes.json()) as {
        id?: number | string;
        status?: string;
        status_detail?: string;
        date_of_expiration?: string;
        message?: string;
        point_of_interaction?: {
          transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
          };
        };
      };

      if (!mpRes.ok || !mpData.id) {
        res.status(502).json({
          error: mpData.message || 'Falha ao gerar cobrança PIX no Mercado Pago.',
        });
        return;
      }

      const tx = mpData.point_of_interaction?.transaction_data;
      const saved: StoredMpPayment = {
        paymentId: String(mpData.id),
        orderCode,
        status: String(mpData.status || 'pending'),
        statusDetail: String(mpData.status_detail || ''),
        amount,
        qrCode: String(tx?.qr_code || ''),
        qrCodeBase64: String(tx?.qr_code_base64 || ''),
        ticketUrl: String(tx?.ticket_url || ''),
        expiresAt: String(mpData.date_of_expiration || ''),
        updatedAt: new Date().toISOString(),
      };
      mpPaymentStore.set(saved.paymentId, saved);
      persistMpPayments();
      res.setHeader('Cache-Control', 'no-store');
      res.json(saved);
    } catch {
      res.status(502).json({ error: 'Erro de comunicação com a API do Mercado Pago.' });
    }
  });

  app.get('/api/payments/mercadopago/:paymentId', async (req, res) => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    const paymentId = String(req.params.paymentId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!paymentId) {
      res.status(400).json({ error: 'ID de pagamento inválido.' });
      return;
    }
    if (!token) {
      res.status(503).json({ configured: false, error: 'Mercado Pago não configurado.' });
      return;
    }
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!mpRes.ok) {
        const cached = mpPaymentStore.get(paymentId);
        if (cached) {
          res.json(cached);
          return;
        }
        res.status(404).json({ error: 'Pagamento não localizado.' });
        return;
      }
      const mpData = (await mpRes.json()) as {
        id: number | string;
        status?: string;
        status_detail?: string;
        external_reference?: string;
      };
      const existing = mpPaymentStore.get(paymentId);
      const updated: StoredMpPayment = {
        paymentId,
        orderCode: String(mpData.external_reference || existing?.orderCode || ''),
        status: String(mpData.status || existing?.status || 'pending'),
        statusDetail: String(mpData.status_detail || existing?.statusDetail || ''),
        amount: existing?.amount || 0,
        qrCode: existing?.qrCode || '',
        qrCodeBase64: existing?.qrCodeBase64 || '',
        ticketUrl: existing?.ticketUrl || '',
        expiresAt: existing?.expiresAt || '',
        updatedAt: new Date().toISOString(),
      };
      mpPaymentStore.set(paymentId, updated);
      persistMpPayments();
      res.setHeader('Cache-Control', 'no-store');
      res.json(updated);
    } catch {
      res.status(502).json({ error: 'Não foi possível consultar o status do pagamento.' });
    }
  });

  app.post('/api/payments/mercadopago/webhook', async (req, res) => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    const body = (req.body || {}) as {
      type?: string;
      topic?: string;
      data?: { id?: string | number };
    };
    const queryTopic = String(req.query.topic || req.query.type || '');
    const queryId = String(req.query.id || req.query['data.id'] || '');
    const paymentId = String(body.data?.id || queryId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const isPaymentEvent =
      body.type === 'payment' ||
      body.topic === 'payment' ||
      queryTopic === 'payment';

    if (token && isPaymentEvent && paymentId) {
      try {
        const mpRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (mpRes.ok) {
          const mpData = (await mpRes.json()) as {
            status?: string;
            status_detail?: string;
            external_reference?: string;
          };
          const existing = mpPaymentStore.get(paymentId);
          mpPaymentStore.set(paymentId, {
            paymentId,
            orderCode: String(mpData.external_reference || existing?.orderCode || ''),
            status: String(mpData.status || 'pending'),
            statusDetail: String(mpData.status_detail || ''),
            amount: existing?.amount || 0,
            qrCode: existing?.qrCode || '',
            qrCodeBase64: existing?.qrCodeBase64 || '',
            ticketUrl: existing?.ticketUrl || '',
            expiresAt: existing?.expiresAt || '',
            updatedAt: new Date().toISOString(),
          });
          persistMpPayments();
        }
      } catch {
        // ignore webhook fetch failure; MP retries automatically
      }
    }
    res.status(200).json({ received: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Brasil Tech server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
