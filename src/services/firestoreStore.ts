import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  COUPONS,
  DEFAULT_BANNERS,
  DEFAULT_CATEGORIES,
  MarketplaceOrder,
  MarketplaceProduct,
  OrderItem,
  PRODUCTS,
  ProductExtendedMeta,
  StoreBanner,
  StoreCategory,
  extractCheckoutUrlAndCleanSpecs,
  mergeCheckoutUrlIntoSpecs,
} from '../data/marketplaceCatalog';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isBootstrappedAdminUser,
  isValidAdminSessionToken,
} from '../lib/firebase';

export interface PersistedCoupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  label: string;
  active: boolean;
}

export interface PersistedOrder extends MarketplaceOrder {
  docId: string;
  userId: string;
  customerEmail: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  couponCode: string;
  items: OrderItem[];
  createdAtLabel: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface PersistedReview {
  docId: string;
  id: number;
  productId: number;
  product: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  comment: string;
  userId: string;
  status: ReviewStatus;
}

export interface PersistedQuestion {
  docId: string;
  productId: number;
  productName: string;
  userId: string;
  authorName: string;
  question: string;
  answer: string;
  date: string;
  answered: boolean;
}

export type CostMap = Record<number, number>;

export interface StoreSettings {
  storeName: string;
  cnpj: string;
  address: string;
  phone: string;
  whatsappDigits: string;
  email: string;
  expressShippingPrice: number;
  standardShippingPrice: number;
  pixDiscountPercent: number;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Brasil Tech',
  cnpj: '62.250.039/0001-14',
  address: 'Av. Getúlio Vargas, 22 – Loja 2',
  phone: '(41) 99662-6482',
  whatsappDigits: '5541996626482',
  email: 'brasiltech@gmail.com',
  expressShippingPrice: 30,
  standardShippingPrice: 15,
  pixDiscountPercent: 0,
};

export interface PersistedUser {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  cep?: string;
  phone?: string;
}

export interface PersistedNewsletter {
  docId: string;
  userId: string;
  email: string;
}

export interface PersistedAdmin {
  uid: string;
  email: string;
}

export interface PersistedTracking {
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

// --- Authoritative Server Store Cache & Real-Time SSE + BroadcastChannel Hub ---

interface ServerStoreDataShape {
  productsById: Record<string, Record<string, unknown>>;
  deletedProductIds: number[];
  costs?: Record<string, number>;
  storeSettings: Record<string, unknown> | null;
  couponsByCode: Record<string, PersistedCoupon>;
  deletedCouponCodes: string[];
  reviewOverrides: Record<string, { status: ReviewStatus; deleted?: boolean }>;
  reviewsById: Record<string, Record<string, unknown>>;
  questionOverrides: Record<string, { answer?: string; answered?: boolean; date?: string; deleted?: boolean }>;
  questionsById: Record<string, Record<string, unknown>>;
  orderOverrides: Record<string, { statusStep?: number; trackingCode?: string; paymentStatus?: 'pending' | 'paid' | 'refunded'; deleted?: boolean }>;
  ordersByCode?: Record<string, Record<string, unknown>>;
  updatedAt?: string;
}

const EMPTY_SERVER_DATA: ServerStoreDataShape = {
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
};

const STORE_SYNC_EVENT = 'bt-store-sync-event';
const STORE_BROADCAST_CHANNEL = 'bt-store-sync';

let publicStoreCache: ServerStoreDataShape | null = null;
let publicStorePromise: Promise<ServerStoreDataShape> | null = null;
let adminStoreCache: ServerStoreDataShape | null = null;
let adminStorePromise: Promise<ServerStoreDataShape> | null = null;
let sseStarted = false;
let broadcastChannelRef: BroadcastChannel | null = null;

function notifyLocalStoreTopic(topic: string, code?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORE_SYNC_EVENT, { detail: { topic, code } }));
  if (topic === 'storefront-content') {
    window.dispatchEvent(new CustomEvent('bt-storefront-updated'));
  }
  if (topic === 'trackings') {
    window.dispatchEvent(new CustomEvent('bt-tracking-updated', { detail: { code } }));
  }
}

function invalidateServerCaches(): void {
  publicStoreCache = null;
  publicStorePromise = null;
  adminStoreCache = null;
  adminStorePromise = null;
}

function broadcastStoreTopic(topic: string, code?: string): void {
  invalidateServerCaches();
  if (broadcastChannelRef) {
    try {
      broadcastChannelRef.postMessage({ topic, code });
    } catch {
      // ignore broadcast errors
    }
  }
  notifyLocalStoreTopic(topic, code);
}

function ensureStoreSyncHub(): void {
  if (typeof window === 'undefined' || sseStarted) return;
  sseStarted = true;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannelRef = new BroadcastChannel(STORE_BROADCAST_CHANNEL);
      broadcastChannelRef.onmessage = (ev) => {
        const msg = ev.data as { topic?: string; code?: string } | null;
        if (msg?.topic) {
          invalidateServerCaches();
          notifyLocalStoreTopic(msg.topic, msg.code);
        }
      };
    } catch {
      broadcastChannelRef = null;
    }
  }

  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/store-events');
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as { topic?: string; code?: string };
          if (parsed?.topic) {
            invalidateServerCaches();
            notifyLocalStoreTopic(parsed.topic, parsed.code);
          }
        } catch {
          // ignore malformed event
        }
      };
    } catch {
      // ignore EventSource init error
    }
  }
}

async function readJsonApiResponse<T>(
  res: Response
): Promise<{ isJson: boolean; data: T | null }> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return { isJson: false, data: null };
  }
  try {
    const data = (await res.json()) as T;
    return { isJson: true, data };
  } catch {
    return { isJson: false, data: null };
  }
}

function getStaticHostingAuthMessage(actionLabel: string): string {
  return `Este site está em hospedagem estática (Netlify) sem servidor Node (/api). Para ${actionLabel} na nuvem para todos os clientes, clique em "Conectar Google Admin (Firebase)" no topo do painel.`;
}

export async function probeBackendApiAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    const res = await fetch('/api/store-data', { cache: 'no-store' });
    const parsed = await readJsonApiResponse<ServerStoreDataShape>(res);
    return res.ok && parsed.isJson;
  } catch {
    return false;
  }
}

async function fetchPublicServerStoreData(force = false): Promise<ServerStoreDataShape> {
  if (!force && publicStoreCache) return publicStoreCache;
  if (!force && publicStorePromise) return publicStorePromise;

  publicStorePromise = (async () => {
    try {
      const res = await fetch('/api/store-data', { cache: 'no-store' });
      const parsed = await readJsonApiResponse<ServerStoreDataShape>(res);
      if (!res.ok || !parsed.isJson || !parsed.data) {
        return publicStoreCache || EMPTY_SERVER_DATA;
      }
      publicStoreCache = { ...EMPTY_SERVER_DATA, ...parsed.data };
      return publicStoreCache;
    } catch {
      return publicStoreCache || EMPTY_SERVER_DATA;
    } finally {
      publicStorePromise = null;
    }
  })();

  return publicStorePromise;
}

async function fetchAdminServerStoreData(force = false): Promise<ServerStoreDataShape> {
  if (!force && adminStoreCache) return adminStoreCache;
  if (!force && adminStorePromise) return adminStorePromise;

  adminStorePromise = (async () => {
    try {
      const headers = await getAdminAuthHeaders();
      if (!headers['X-Admin-Session'] && !headers.Authorization) {
        return fetchPublicServerStoreData(force);
      }
      const res = await fetchAdminWithAuthRetry('/api/admin/store-data', { cache: 'no-store' });
      const parsed = await readJsonApiResponse<ServerStoreDataShape>(res);
      if (!res.ok || !parsed.isJson || !parsed.data) {
        return fetchPublicServerStoreData(force);
      }
      adminStoreCache = { ...EMPTY_SERVER_DATA, ...parsed.data };
      publicStoreCache = adminStoreCache;
      return adminStoreCache;
    } catch {
      return adminStoreCache || fetchPublicServerStoreData(force);
    } finally {
      adminStorePromise = null;
    }
  })();

  return adminStorePromise;
}

function mapRawToMarketplaceProduct(data: Record<string, unknown>): MarketplaceProduct {
  const numId = Number(data.id);
  const catalogMatch = PRODUCTS.find((cp) => cp.id === numId);
  const rawSpecs = Array.isArray(data.specs)
    ? (data.specs as Array<{ label: string; value: string }>)
    : [];
  const { checkoutUrl, meta, cleanSpecs } = extractCheckoutUrlAndCleanSpecs(
    rawSpecs,
    typeof data.checkoutUrl === 'string' && data.checkoutUrl
      ? data.checkoutUrl
      : catalogMatch?.checkoutUrl
  );
  return {
    id: numId,
    name: String(data.name || ''),
    cat: String(data.cat || 'Acessórios'),
    emoji: String(data.emoji || '📦'),
    price: Number(data.price || 0),
    old: Number(data.old || 0),
    rating: String(data.rating || '5,0'),
    reviews: Number(data.reviews || 0),
    featured: Boolean(data.featured),
    desc: String(data.desc || ''),
    image: String(data.image || ''),
    images: Array.isArray(data.images) ? data.images.map(String) : [String(data.image || '')],
    stock: Number(data.stock ?? 0),
    sold: Number(data.sold ?? 0),
    warranty: String(data.warranty || '6 meses com a Brasil Tech'),
    condition: String(data.condition || 'Seminovo revisado'),
    checkoutUrl,
    brand: typeof data.brand === 'string' ? data.brand : meta.brand,
    division:
      data.division === 'mobile' || data.division === 'gamer' ? data.division : meta.division,
    subCategory: typeof data.subCategory === 'string' ? data.subCategory : meta.subCategory,
    storage: typeof data.storage === 'string' ? data.storage : meta.storage,
    color: typeof data.color === 'string' ? data.color : meta.color,
    batteryHealth:
      typeof data.batteryHealth === 'string' ? data.batteryHealth : meta.batteryHealth,
    accessoriesIncluded:
      typeof data.accessoriesIncluded === 'string'
        ? data.accessoriesIncluded
        : meta.accessoriesIncluded,
    gamesCount:
      typeof data.gamesCount === 'number' ? data.gamesCount : meta.gamesCount,
    isNewArrival:
      typeof data.isNewArrival === 'boolean' ? data.isNewArrival : meta.isNewArrival,
    installmentsMax:
      typeof data.installmentsMax === 'number' ? data.installmentsMax : meta.installmentsMax,
    nfeIncluded:
      typeof data.nfeIncluded === 'boolean' ? data.nfeIncluded : meta.nfeIncluded,
    specs: cleanSpecs,
  };
}

export function checkIsUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return Promise.resolve(false);
  if (isBootstrappedAdminUser(user.email, user.emailVerified)) {
    return Promise.resolve(true);
  }
  return getDoc(doc(db, 'admins', user.uid))
    .then((snap) => snap.exists())
    .catch(() => false);
}

export async function syncUserProfile(user: User, cep?: string): Promise<{ cep?: string }> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: (user.displayName || user.email?.split('@')[0] || 'Cliente').slice(0, 120),
        email: (user.email || '').slice(0, 160),
        photoUrl: (user.photoURL || '').slice(0, 500),
        cep: (cep || '').slice(0, 20),
        phone: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { cep };
    }
    const existing = snap.data();
    await updateDoc(ref, {
      name: (user.displayName || existing.name || 'Cliente').slice(0, 120),
      photoUrl: (user.photoURL || existing.photoUrl || '').slice(0, 500),
      ...(cep !== undefined ? { cep: cep.slice(0, 20) } : {}),
      updatedAt: serverTimestamp(),
    });
    return { cep: existing.cep || cep };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserSavedCep(uid: string, cep: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      cep: cep.slice(0, 20),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Subscriptions (Layer Defaults -> Firestore -> Authoritative Server Overrides) ---

export function subscribeProducts(
  onData: (items: MarketplaceProduct[]) => void
): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreList: MarketplaceProduct[] = [];
  let serverData: ServerStoreDataShape = publicStoreCache || EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const byId = new Map<number, MarketplaceProduct>();
    PRODUCTS.forEach((p) => byId.set(p.id, p));
    firestoreList.forEach((p) => byId.set(p.id, p));
    Object.values(serverData.productsById || {}).forEach((raw) => {
      const mapped = mapRawToMarketplaceProduct(raw);
      if (mapped.id > 0 && mapped.price > 0) {
        byId.set(mapped.id, mapped);
      }
    });
    const deletedSet = new Set((serverData.deletedProductIds || []).map(Number));
    deletedSet.forEach((id) => byId.delete(id));
    const sorted = Array.from(byId.values()).sort((a, b) => a.id - b.id);
    onData(sorted);
  };

  const refreshServer = async (force = false) => {
    serverData = await fetchPublicServerStoreData(force);
    emitMerged();
  };

  refreshServer();

  const q = query(collection(db, 'products'), where('price', '>', 0));
  const unsubFirestore = onSnapshot(
    q,
    (snap) => {
      firestoreList = snap.docs.map((d) =>
        mapRawToMarketplaceProduct(d.data() as Record<string, unknown>)
      );
      emitMerged();
    },
    () => {
      // Fall back silently to defaults + server data if Firestore read is unavailable
      emitMerged();
    }
  );

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'products') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

export function subscribeProductCostsAdmin(onData: (costs: CostMap) => void): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreCosts: CostMap = {};
  let serverCosts: CostMap = {};

  const emitMerged = () => {
    if (disposed) return;
    onData({ ...firestoreCosts, ...serverCosts });
  };

  const refreshServer = async (force = false) => {
    const data = await fetchAdminServerStoreData(force);
    const next: CostMap = {};
    Object.entries(data.costs || {}).forEach(([k, v]) => {
      next[Number(k)] = Number(v || 0);
    });
    serverCosts = next;
    emitMerged();
  };

  refreshServer();

  let unsubFirestore: () => void = () => undefined;
  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    unsubFirestore = onSnapshot(
      collection(db, 'productCosts'),
      (snap) => {
        const next: CostMap = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          next[Number(data.productId)] = Number(data.costPrice || 0);
        });
        firestoreCosts = next;
        emitMerged();
      },
      () => {
        emitMerged();
      }
    );
  }

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'products') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

export function subscribeCoupons(
  isAdmin: boolean,
  onData: (coupons: PersistedCoupon[]) => void
): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreCoupons: PersistedCoupon[] = [];
  let serverData: ServerStoreDataShape = publicStoreCache || EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const byCode = new Map<string, PersistedCoupon>();
    Object.entries(COUPONS).forEach(([code, c]) => {
      byCode.set(code.toUpperCase(), {
        code: code.toUpperCase(),
        type: c.type,
        value: c.value,
        label: c.label,
        active: true,
      });
    });
    firestoreCoupons.forEach((c) => byCode.set(c.code.toUpperCase(), c));
    Object.values(serverData.couponsByCode || {}).forEach((c) => {
      if (c && c.code) {
        byCode.set(c.code.toUpperCase(), {
          code: c.code.toUpperCase(),
          type: c.type === 'fixed' ? 'fixed' : 'percent',
          value: Number(c.value || 0),
          label: String(c.label || ''),
          active: Boolean(c.active),
        });
      }
    });
    (serverData.deletedCouponCodes || []).forEach((code) => {
      byCode.delete(String(code).toUpperCase());
    });
    const list = Array.from(byCode.values()).filter((c) => isAdmin || c.active);
    onData(list);
  };

  const refreshServer = async (force = false) => {
    serverData = await fetchPublicServerStoreData(force);
    emitMerged();
  };

  refreshServer();

  const canReadAllFirestore =
    isAdmin && isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified);
  const source = canReadAllFirestore
    ? collection(db, 'coupons')
    : query(collection(db, 'coupons'), where('active', '==', true));

  const unsubFirestore = onSnapshot(
    source,
    (snap) => {
      firestoreCoupons = snap.docs.map((d) => {
        const data = d.data();
        return {
          code: String(data.code || d.id).toUpperCase(),
          type: data.type === 'fixed' ? 'fixed' : 'percent',
          value: Number(data.value || 0),
          label: String(data.label || ''),
          active: Boolean(data.active),
        };
      });
      emitMerged();
    },
    () => {
      emitMerged();
    }
  );

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'coupons') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

function mapReviewSnapshotDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): PersistedReview[] {
  return docs
    .map((d) => {
      const data = d.data();
      const rawStatus = data.status;
      const status: ReviewStatus =
        rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending';
      return {
        docId: d.id,
        id: Number(data.id || 1),
        productId: Number(data.productId || 1),
        product: String(data.product || ''),
        author: String(data.author || ''),
        city: String(data.city || ''),
        rating: Number(data.rating || 5),
        date: String(data.date || 'Agora'),
        comment: String(data.comment || ''),
        userId: String(data.userId || ''),
        status,
      };
    })
    .sort((a, b) => b.id - a.id);
}

export function subscribeReviews(
  isAdminView: boolean,
  onData: (reviews: PersistedReview[]) => void
): () => void {
  ensureStoreSyncHub();
  let activeUnsub: () => void = () => undefined;
  let disposed = false;
  let firestoreList: PersistedReview[] = [];
  let serverData: ServerStoreDataShape = publicStoreCache || EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const byId = new Map<string, PersistedReview>();
    firestoreList.forEach((r) => byId.set(r.docId, r));
    Object.values(serverData.reviewsById || {}).forEach((raw) => {
      const docId = String(raw.docId || '');
      if (!docId) return;
      const rawStatus = raw.status;
      const status: ReviewStatus =
        rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending';
      byId.set(docId, {
        docId,
        id: Number(raw.id || 1),
        productId: Number(raw.productId || 1),
        product: String(raw.product || ''),
        author: String(raw.author || ''),
        city: String(raw.city || ''),
        rating: Number(raw.rating || 5),
        date: String(raw.date || 'Agora'),
        comment: String(raw.comment || ''),
        userId: String(raw.userId || ''),
        status,
      });
    });

    const overrides = serverData.reviewOverrides || {};
    const list: PersistedReview[] = [];
    byId.forEach((rev, docId) => {
      const ov = overrides[docId];
      if (ov?.deleted) return;
      const finalRev = ov ? { ...rev, status: ov.status } : rev;
      if (isAdminView || finalRev.status === 'approved') {
        list.push(finalRev);
      }
    });
    list.sort((a, b) => b.id - a.id);
    onData(list);
  };

  const refreshServer = async (force = false) => {
    serverData = await fetchPublicServerStoreData(force);
    emitMerged();
  };
  refreshServer();

  const canReadAllFirestore =
    isAdminView && isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified);
  const primarySource = canReadAllFirestore
    ? collection(db, 'reviews')
    : query(collection(db, 'reviews'), where('status', '==', 'approved'));

  activeUnsub = onSnapshot(
    primarySource,
    (snap) => {
      firestoreList = mapReviewSnapshotDocs(snap.docs);
      emitMerged();
    },
    () => {
      if (disposed) return;
      const fallbackQuery = query(collection(db, 'reviews'), where('rating', '>=', 1));
      activeUnsub = onSnapshot(
        fallbackQuery,
        (snap) => {
          firestoreList = mapReviewSnapshotDocs(snap.docs);
          emitMerged();
        },
        () => {
          emitMerged();
        }
      );
    }
  );

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'reviews') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    activeUnsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

export function subscribeUserReviews(
  userId: string,
  onData: (reviews: PersistedReview[]) => void
): () => void {
  const q = query(collection(db, 'reviews'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(mapReviewSnapshotDocs(snap.docs));
    },
    () => {
      onData([]);
    }
  );
}

export function subscribeQuestions(onData: (questions: PersistedQuestion[]) => void): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreList: PersistedQuestion[] = [];
  let serverData: ServerStoreDataShape = publicStoreCache || EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const byId = new Map<string, PersistedQuestion>();
    firestoreList.forEach((q) => byId.set(q.docId, q));
    Object.values(serverData.questionsById || {}).forEach((raw) => {
      const docId = String(raw.docId || '');
      if (!docId) return;
      byId.set(docId, {
        docId,
        productId: Number(raw.productId || 1),
        productName: String(raw.productName || ''),
        userId: String(raw.userId || ''),
        authorName: String(raw.authorName || 'Cliente'),
        question: String(raw.question || ''),
        answer: String(raw.answer || ''),
        date: String(raw.date || ''),
        answered: Boolean(raw.answered),
      });
    });

    const overrides = serverData.questionOverrides || {};
    const list: PersistedQuestion[] = [];
    byId.forEach((q, docId) => {
      const ov = overrides[docId];
      if (ov?.deleted) return;
      list.push(
        ov
          ? {
              ...q,
              answer: ov.answer ?? q.answer,
              answered: ov.answered ?? q.answered,
              date: ov.date ?? q.date,
            }
          : q
      );
    });
    onData(list);
  };

  const refreshServer = async (force = false) => {
    serverData = await fetchPublicServerStoreData(force);
    emitMerged();
  };
  refreshServer();

  const q = query(collection(db, 'questions'), where('productId', '>=', 1));
  const unsubFirestore = onSnapshot(
    q,
    (snap) => {
      firestoreList = snap.docs.map((d) => {
        const data = d.data();
        return {
          docId: d.id,
          productId: Number(data.productId || 1),
          productName: String(data.productName || ''),
          userId: String(data.userId || ''),
          authorName: String(data.authorName || 'Cliente'),
          question: String(data.question || ''),
          answer: String(data.answer || ''),
          date: String(data.date || ''),
          answered: Boolean(data.answered),
        };
      });
      emitMerged();
    },
    () => {
      emitMerged();
    }
  );

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'questions') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

function mapRawOrder(docId: string, data: Record<string, unknown>): PersistedOrder {
  const shippingMethod: 'express' | 'standard' =
    data.shippingMethod === 'express' ? 'express' : 'standard';
  const paymentMethod: 'pix' | 'card' | 'boleto' =
    data.paymentMethod === 'card' || data.paymentMethod === 'boleto'
      ? data.paymentMethod
      : 'pix';
  const paymentStatus: 'pending' | 'paid' | 'refunded' =
    data.paymentStatus === 'paid' || data.paymentStatus === 'refunded'
      ? data.paymentStatus
      : 'pending';
  return {
    docId,
    code: String(data.code || docId),
    userId: String(data.userId || ''),
    customerEmail: String(data.customerEmail || ''),
    createdAt: String(data.createdAtLabel || data.createdAt || ''),
    createdAtLabel: String(data.createdAtLabel || data.createdAt || ''),
    customerName: String(data.customerName || ''),
    customerCpf: String(data.customerCpf || ''),
    customerPhone: String(data.customerPhone || ''),
    cep: String(data.cep || ''),
    address: String(data.address || ''),
    cityState: String(data.cityState || ''),
    shippingMethod,
    shippingLabel: String(data.shippingLabel || ''),
    shippingCost: Number(data.shippingCost || 0),
    paymentMethod,
    paymentStatus,
    couponCode: String(data.couponCode || ''),
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    total: Number(data.total || 0),
    statusStep: Number(data.statusStep ?? 0),
    trackingCode: String(data.trackingCode || ''),
    items: Array.isArray(data.items) ? (data.items as OrderItem[]) : [],
  };
}

export function subscribeOrders(
  userId: string,
  isAdmin: boolean,
  onData: (orders: PersistedOrder[]) => void
): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreList: PersistedOrder[] = [];
  let serverData: ServerStoreDataShape = EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const byCode = new Map<string, PersistedOrder>();
    firestoreList.forEach((o) => byCode.set(o.code, o));
    if (isAdmin && serverData.ordersByCode) {
      Object.entries(serverData.ordersByCode).forEach(([code, raw]) => {
        byCode.set(code, mapRawOrder(code, raw));
      });
    }
    const overrides = serverData.orderOverrides || {};
    const list: PersistedOrder[] = [];
    byCode.forEach((ord, code) => {
      const ov = overrides[code];
      if (ov?.deleted) return;
      list.push(
        ov
          ? {
              ...ord,
              statusStep: typeof ov.statusStep === 'number' ? ov.statusStep : ord.statusStep,
              trackingCode: typeof ov.trackingCode === 'string' ? ov.trackingCode : ord.trackingCode,
              paymentStatus: ov.paymentStatus || ord.paymentStatus,
            }
          : ord
      );
    });
    list.sort((a, b) => b.code.localeCompare(a.code));
    onData(list);
  };

  const refreshServer = async (force = false) => {
    serverData = isAdmin
      ? await fetchAdminServerStoreData(force)
      : await fetchPublicServerStoreData(force);
    emitMerged();
  };
  refreshServer();

  let unsubFirestore: () => void = () => undefined;
  const canReadAllFirestore =
    isAdmin && isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified);
  if (canReadAllFirestore || userId) {
    const source = canReadAllFirestore
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('userId', '==', userId));
    unsubFirestore = onSnapshot(
      source,
      (snap) => {
        firestoreList = snap.docs.map((d) => mapRawOrder(d.id, d.data() as Record<string, unknown>));
        emitMerged();
      },
      () => {
        emitMerged();
      }
    );
  }

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'orders') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

// --- Seed & Admin CRUD (Authoritative Server Save + Live Push + Silent Firestore Mirror) ---

export async function seedInitialCatalogIfEmpty(): Promise<number> {
  if (!isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    return 0;
  }
  try {
    const existingSnap = await getDocs(query(collection(db, 'products'), where('price', '>', 0)));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const missing = PRODUCTS.filter((p) => !existingIds.has(String(p.id)));
    if (missing.length === 0) return 0;

    const batch = writeBatch(db);
    missing.forEach((p) => {
      const pRef = doc(db, 'products', String(p.id));
      batch.set(pRef, {
        id: p.id,
        name: p.name.slice(0, 200),
        cat: p.cat.slice(0, 60),
        emoji: p.emoji.slice(0, 16),
        price: p.price,
        old: p.old,
        rating: p.rating,
        reviews: p.reviews,
        featured: p.featured,
        desc: p.desc.slice(0, 2000),
        image: p.image.slice(0, 500),
        images: (p.images && p.images.length ? p.images : [p.image]).slice(0, 10),
        stock: p.stock,
        sold: p.sold,
        warranty: p.warranty.slice(0, 120),
        condition: p.condition.slice(0, 120),
        specs: mergeCheckoutUrlIntoSpecs(p.specs, p.checkoutUrl, {
          brand: p.brand,
          division: p.division,
          subCategory: p.subCategory,
          storage: p.storage,
          color: p.color,
          batteryHealth: p.batteryHealth,
          accessoriesIncluded: p.accessoriesIncluded,
          gamesCount: p.gamesCount,
          isNewArrival: p.isNewArrival,
          installmentsMax: p.installmentsMax,
          nfeIncluded: p.nfeIncluded,
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const costRef = doc(db, 'productCosts', String(p.id));
      batch.set(costRef, {
        productId: p.id,
        costPrice: Math.round(p.price * 0.62),
        updatedAt: serverTimestamp(),
      });
    });

    for (const [code, coupon] of Object.entries(COUPONS)) {
      const cRef = doc(db, 'coupons', code);
      batch.set(
        cRef,
        {
          code,
          type: coupon.type,
          value: coupon.value,
          label: coupon.label,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    }

    await batch.commit();
    return missing.length;
  } catch {
    return 0;
  }
}

export async function saveProductAdmin(
  product: MarketplaceProduct,
  costPrice: number,
  isNew: boolean
): Promise<void> {
  const normalizedImages =
    product.images && product.images.length > 0
      ? product.images.filter(Boolean).slice(0, 10)
      : [product.image || '/src/assets/ref/products/ps5-digital.jpg'];

  const productMeta: ProductExtendedMeta = {
    brand: product.brand,
    division: product.division,
    subCategory: product.subCategory,
    storage: product.storage,
    color: product.color,
    batteryHealth: product.batteryHealth,
    accessoriesIncluded: product.accessoriesIncluded,
    gamesCount: product.gamesCount,
    isNewArrival: product.isNewArrival,
    installmentsMax: product.installmentsMax,
    nfeIncluded: product.nfeIncluded,
  };

  const mergedSpecs = mergeCheckoutUrlIntoSpecs(
    product.specs,
    product.checkoutUrl,
    productMeta
  );
  const cleanProduct: MarketplaceProduct = {
    ...product,
    name: product.name.trim().slice(0, 200),
    cat: product.cat.trim().slice(0, 60),
    emoji: (product.emoji || '📦').slice(0, 16),
    price: Number(product.price),
    old: Number(product.old || 0),
    rating: (product.rating || '5,0').slice(0, 16),
    reviews: Number(product.reviews || 0),
    featured: Boolean(product.featured),
    desc: product.desc.trim().slice(0, 2000),
    image: (product.image || normalizedImages[0]).slice(0, 500),
    images: normalizedImages,
    stock: Math.max(0, Math.round(Number(product.stock || 0))),
    sold: Math.max(0, Math.round(Number(product.sold || 0))),
    warranty: (product.warranty || '6 meses com a Brasil Tech').slice(0, 120),
    condition: (product.condition || 'Seminovo revisado').slice(0, 120),
    specs: mergedSpecs,
  };

  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: cleanProduct,
        costPrice: Math.max(0, Number(costPrice || 0)),
      }),
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  let firestoreError = '';
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    const ref = doc(db, 'products', String(product.id));
    try {
      const existingSnap = !isNew ? await getDoc(ref) : null;
      const mutableFields = {
        name: cleanProduct.name,
        cat: cleanProduct.cat,
        emoji: cleanProduct.emoji,
        price: cleanProduct.price,
        old: cleanProduct.old,
        rating: cleanProduct.rating,
        reviews: cleanProduct.reviews,
        featured: cleanProduct.featured,
        desc: cleanProduct.desc,
        image: cleanProduct.image,
        images: cleanProduct.images,
        stock: cleanProduct.stock,
        sold: cleanProduct.sold,
        warranty: cleanProduct.warranty,
        condition: cleanProduct.condition,
        specs: mergedSpecs,
        updatedAt: serverTimestamp(),
      };
      if (isNew || !existingSnap?.exists() || !existingSnap.data()?.createdAt) {
        await setDoc(ref, {
          id: cleanProduct.id,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, mutableFields);
      }
      await setDoc(doc(db, 'productCosts', String(product.id)), {
        productId: product.id,
        costPrice: Math.max(0, Number(costPrice || 0)),
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch (err) {
      firestoreError = err instanceof Error ? err.message : '';
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('publicar produtos'));
    }
    throw new Error(apiError || firestoreError || 'Erro ao publicar alterações do produto.');
  }
  broadcastStoreTopic('products', String(product.id));
}

export async function adjustProductStockAdmin(
  productId: number,
  nextStock: number,
  productSnapshot?: MarketplaceProduct
): Promise<void> {
  const safeStock = Math.max(0, Math.round(nextStock));
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/products/${encodeURIComponent(String(productId))}/stock`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: safeStock, product: productSnapshot }),
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await updateDoc(doc(db, 'products', String(productId)), {
        stock: safeStock,
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch {
      // ignore Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('atualizar estoque'));
    }
    throw new Error(apiError || 'Erro ao atualizar estoque.');
  }
  broadcastStoreTopic('products', String(productId));
}

export async function deleteProductAdmin(productId: number): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/products/${encodeURIComponent(String(productId))}`,
      {
        method: 'DELETE',
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'products', String(productId)));
      await deleteDoc(doc(db, 'productCosts', String(productId))).catch(() => undefined);
      firestoreOk = true;
    } catch {
      // ignore Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('excluir produtos'));
    }
    throw new Error(apiError || 'Erro ao excluir produto.');
  }
  broadcastStoreTopic('products', String(productId));
}

// --- Orders ---

export async function createOrderFirestore(
  user: User,
  order: MarketplaceOrder,
  items: OrderItem[],
  couponCode: string
): Promise<void> {
  const orderRecord = {
    code: order.code,
    userId: user.uid,
    customerEmail: (user.email || 'cliente@brasiltech.com').slice(0, 160),
    customerName: order.customerName.slice(0, 120),
    customerCpf: order.customerCpf.slice(0, 30),
    customerPhone: order.customerPhone.slice(0, 30),
    cep: order.cep.slice(0, 20),
    address: order.address.slice(0, 300),
    cityState: order.cityState.slice(0, 120),
    shippingMethod: order.shippingMethod,
    shippingLabel: order.shippingLabel.slice(0, 120),
    shippingCost: Number(order.shippingCost),
    paymentMethod: order.paymentMethod,
    paymentStatus: 'pending' as const,
    couponCode: couponCode.slice(0, 40),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    statusStep: 1,
    trackingCode: order.trackingCode.slice(0, 60),
    items: items.slice(0, 50),
    createdAtLabel: order.createdAt.slice(0, 60),
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderRecord),
  }).catch(() => undefined);

  const path = `orders/${order.code}`;
  try {
    await setDoc(doc(db, 'orders', order.code), {
      ...orderRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function recordGuestOrderOnServer(
  order: MarketplaceOrder,
  items: OrderItem[],
  couponCode: string
): void {
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: order.code,
      userId: '',
      customerEmail: 'visitante@brasiltech.com.br',
      customerName: order.customerName.slice(0, 120),
      customerCpf: order.customerCpf.slice(0, 30),
      customerPhone: order.customerPhone.slice(0, 30),
      cep: order.cep.slice(0, 20),
      address: order.address.slice(0, 300),
      cityState: order.cityState.slice(0, 120),
      shippingMethod: order.shippingMethod,
      shippingLabel: order.shippingLabel.slice(0, 120),
      shippingCost: Number(order.shippingCost),
      paymentMethod: order.paymentMethod,
      paymentStatus: 'pending',
      couponCode: couponCode.slice(0, 40),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      statusStep: 1,
      trackingCode: order.trackingCode.slice(0, 60),
      items: items.slice(0, 50),
      createdAtLabel: order.createdAt.slice(0, 60),
    }),
  }).catch(() => undefined);
}

export async function updateOrderAdmin(
  orderCode: string,
  updates: {
    statusStep: number;
    trackingCode: string;
    paymentStatus: 'pending' | 'paid' | 'refunded';
  }
): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiErrorMessage = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/orders/${encodeURIComponent(orderCode)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusStep: updates.statusStep,
          trackingCode: updates.trackingCode.trim().slice(0, 60),
          paymentStatus: updates.paymentStatus,
        }),
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiErrorMessage = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await updateDoc(doc(db, 'orders', orderCode), {
        statusStep: updates.statusStep,
        trackingCode: updates.trackingCode.trim().slice(0, 60),
        paymentStatus: updates.paymentStatus,
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('atualizar pedidos'));
    }
    throw new Error(apiErrorMessage || 'Erro ao atualizar pedido.');
  }
  broadcastStoreTopic('orders', orderCode);
}

// --- Coupons ---

export async function saveCouponAdmin(coupon: PersistedCoupon, isNew: boolean): Promise<void> {
  const code = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        type: coupon.type,
        value: Number(coupon.value),
        label: coupon.label.trim().slice(0, 80),
        active: coupon.active,
      }),
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      const ref = doc(db, 'coupons', code);
      const existingSnap = !isNew ? await getDoc(ref) : null;
      const mutable = {
        type: coupon.type,
        value: Number(coupon.value),
        label: coupon.label.trim().slice(0, 80),
        active: coupon.active,
        updatedAt: serverTimestamp(),
      };
      if (isNew || !existingSnap?.exists() || !existingSnap.data()?.createdAt) {
        await setDoc(ref, { code, ...mutable, createdAt: serverTimestamp() });
      } else {
        await updateDoc(ref, mutable);
      }
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('salvar cupons'));
    }
    throw new Error(apiError || 'Erro ao salvar cupom.');
  }
  broadcastStoreTopic('coupons', code);
}

export async function deleteCouponAdmin(code: string): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/coupons/${encodeURIComponent(cleanCode)}`,
      {
        method: 'DELETE',
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'coupons', cleanCode));
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('excluir cupons'));
    }
    throw new Error(apiError || 'Erro ao excluir cupom.');
  }
  broadcastStoreTopic('coupons', cleanCode);
}

// --- Reviews & Q&A ---

export async function createReviewFirestore(
  user: User,
  payload: {
    productId: number;
    productName: string;
    author: string;
    rating: number;
    comment: string;
  }
): Promise<void> {
  const id = Date.now();
  const docId = `rev_${id}_${user.uid.slice(0, 6)}`;
  const reviewDoc = {
    docId,
    id,
    productId: payload.productId,
    product: payload.productName.slice(0, 160),
    author: payload.author.trim().slice(0, 80),
    city: 'Cliente Verificado',
    rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
    date: new Date().toLocaleDateString('pt-BR'),
    comment: payload.comment.trim().slice(0, 1000),
    userId: user.uid,
    status: 'pending' as const,
  };

  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewDoc),
  }).catch(() => undefined);

  const path = `reviews/${docId}`;
  try {
    await setDoc(doc(db, 'reviews', docId), {
      ...reviewDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function createQuestionFirestore(
  user: User,
  productId: number,
  productName: string,
  question: string
): Promise<void> {
  const docId = `q_${Date.now()}_${user.uid.slice(0, 6)}`;
  const questionDoc = {
    docId,
    productId,
    productName: productName.slice(0, 160),
    userId: user.uid,
    authorName: (user.displayName || user.email?.split('@')[0] || 'Cliente').slice(0, 80),
    question: question.trim().slice(0, 600),
    answer: '',
    date: new Date().toLocaleDateString('pt-BR'),
    answered: false,
  };

  fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionDoc),
  }).catch(() => undefined);

  const path = `questions/${docId}`;
  try {
    await setDoc(doc(db, 'questions', docId), {
      ...questionDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function answerQuestionAdmin(docId: string, answer: string): Promise<void> {
  const cleanAnswer = answer.trim().slice(0, 1200);
  const dateLabel = `${new Date().toLocaleDateString('pt-BR')} • Brasil Tech Oficial`;
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/questions/${encodeURIComponent(docId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: cleanAnswer, date: dateLabel }),
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await updateDoc(doc(db, 'questions', docId), {
        answer: cleanAnswer,
        answered: true,
        date: dateLabel,
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('responder perguntas'));
    }
    throw new Error(apiError || 'Erro ao responder pergunta.');
  }
  broadcastStoreTopic('questions', docId);
}

export async function deleteQuestionAdmin(docId: string): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/questions/${encodeURIComponent(docId)}`,
      { method: 'DELETE', cache: 'no-store' }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'questions', docId));
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('remover perguntas'));
    }
    throw new Error(apiError || 'Erro ao remover pergunta.');
  }
  broadcastStoreTopic('questions', docId);
}

export async function moderateReviewAdmin(
  docId: string,
  status: ReviewStatus
): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/reviews/${encodeURIComponent(docId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await updateDoc(doc(db, 'reviews', docId), {
        status,
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('moderar avaliações'));
    }
    throw new Error(apiError || 'Erro ao moderar avaliação.');
  }
  broadcastStoreTopic('reviews', docId);
}

export async function deleteReviewAdmin(docId: string): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/reviews/${encodeURIComponent(docId)}`,
      { method: 'DELETE', cache: 'no-store' }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'reviews', docId));
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('excluir avaliações'));
    }
    throw new Error(apiError || 'Erro ao excluir avaliação.');
  }
  broadcastStoreTopic('reviews', docId);
}

export async function deleteOrderAdmin(orderCode: string): Promise<void> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/admin/orders/${encodeURIComponent(orderCode)}`,
      { method: 'DELETE', cache: 'no-store' }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'orders', orderCode));
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('remover pedidos'));
    }
    throw new Error(apiError || 'Erro ao remover pedido.');
  }
  broadcastStoreTopic('orders', orderCode);
}

export async function deductOrderStockAdmin(
  items: OrderItem[],
  currentProducts: MarketplaceProduct[]
): Promise<number> {
  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  let apiUpdated = 0;
  try {
    const res = await fetchAdminWithAuthRetry('/api/admin/products/deduct-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        productsSnapshot: currentProducts,
      }),
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ updated?: number; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
      apiUpdated = Number(parsed.data?.updated || 0);
    } else if (parsed.data?.error) {
      apiError = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreUpdated = 0;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const prod = currentProducts.find((p) => p.id === item.id);
        if (!prod) return;
        batch.update(doc(db, 'products', String(prod.id)), {
          stock: Math.max(0, prod.stock - item.qty),
          sold: prod.sold + item.qty,
          updatedAt: serverTimestamp(),
        });
        firestoreUpdated += 1;
      });
      if (firestoreUpdated > 0) {
        await batch.commit();
      }
    } catch {
      firestoreUpdated = 0;
    }
  }

  if (!apiOk && firestoreUpdated === 0) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('baixar estoque'));
    }
    throw new Error(apiError || 'Erro ao baixar estoque.');
  }
  broadcastStoreTopic('products');
  return apiOk ? apiUpdated : firestoreUpdated;
}

export async function subscribeNewsletterFirestore(user: User, email: string): Promise<void> {
  const docId = user.uid;
  const path = `newsletter/${docId}`;
  try {
    await setDoc(doc(db, 'newsletter', docId), {
      userId: user.uid,
      email: email.trim().slice(0, 160),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// --- Store Settings & Admin Team / Customers ---

export function subscribeStoreSettings(onData: (settings: StoreSettings) => void): () => void {
  ensureStoreSyncHub();
  let disposed = false;
  let firestoreSettings: Partial<StoreSettings> | null = null;
  let serverData: ServerStoreDataShape = publicStoreCache || EMPTY_SERVER_DATA;

  const emitMerged = () => {
    if (disposed) return;
    const srv = (serverData.storeSettings || null) as Partial<StoreSettings> | null;
    const rawName = String(
      srv?.storeName || firestoreSettings?.storeName || DEFAULT_STORE_SETTINGS.storeName
    ).trim();
    const normalizedStoreName =
      rawName.toLowerCase() === 'brasiltech' ? 'Brasil Tech' : rawName;
    onData({
      storeName: normalizedStoreName || DEFAULT_STORE_SETTINGS.storeName,
      cnpj: String(srv?.cnpj ?? firestoreSettings?.cnpj ?? DEFAULT_STORE_SETTINGS.cnpj),
      address: String(srv?.address ?? firestoreSettings?.address ?? DEFAULT_STORE_SETTINGS.address),
      phone: String(srv?.phone ?? firestoreSettings?.phone ?? DEFAULT_STORE_SETTINGS.phone),
      whatsappDigits: String(
        srv?.whatsappDigits ??
          firestoreSettings?.whatsappDigits ??
          DEFAULT_STORE_SETTINGS.whatsappDigits
      ),
      email: String(srv?.email ?? firestoreSettings?.email ?? DEFAULT_STORE_SETTINGS.email),
      expressShippingPrice: Number(
        srv?.expressShippingPrice ??
          firestoreSettings?.expressShippingPrice ??
          DEFAULT_STORE_SETTINGS.expressShippingPrice
      ),
      standardShippingPrice: Number(
        srv?.standardShippingPrice ??
          firestoreSettings?.standardShippingPrice ??
          DEFAULT_STORE_SETTINGS.standardShippingPrice
      ),
      pixDiscountPercent: Number(
        srv?.pixDiscountPercent ??
          firestoreSettings?.pixDiscountPercent ??
          DEFAULT_STORE_SETTINGS.pixDiscountPercent
      ),
    });
  };

  const refreshServer = async (force = false) => {
    serverData = await fetchPublicServerStoreData(force);
    emitMerged();
  };
  refreshServer();

  const ref = doc(db, 'storeSettings', 'public');
  const unsubFirestore = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        firestoreSettings = snap.data() as Partial<StoreSettings>;
      }
      emitMerged();
    },
    () => {
      emitMerged();
    }
  );

  const handleSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'store-settings') {
      refreshServer(true);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STORE_SYNC_EVENT, handleSync);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORE_SYNC_EVENT, handleSync);
    }
  };
}

export async function saveStoreSettingsAdmin(settings: StoreSettings): Promise<void> {
  const payload: StoreSettings = {
    storeName: settings.storeName.trim().slice(0, 100),
    cnpj: settings.cnpj.trim().slice(0, 40),
    address: settings.address.trim().slice(0, 200),
    phone: settings.phone.trim().slice(0, 30),
    whatsappDigits: settings.whatsappDigits.replace(/\D/g, '').slice(0, 20),
    email: settings.email.trim().slice(0, 160),
    expressShippingPrice: Math.max(0, Number(settings.expressShippingPrice)),
    standardShippingPrice: Math.max(0, Number(settings.standardShippingPrice)),
    pixDiscountPercent: Math.min(50, Math.max(0, Number(settings.pixDiscountPercent))),
  };

  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry('/api/admin/store-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await setDoc(doc(db, 'storeSettings', 'public'), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      firestoreOk = true;
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('salvar configurações da loja'));
    }
    throw new Error(apiError || 'Erro ao salvar configurações da loja.');
  }
  broadcastStoreTopic('store-settings');
}

export function subscribeUsersAdmin(onData: (users: PersistedUser[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.uid || d.id),
            name: String(data.name || 'Cliente'),
            email: String(data.email || ''),
            photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
            cep: data.cep ? String(data.cep) : undefined,
            phone: data.phone ? String(data.phone) : undefined,
          };
        })
      );
    },
    () => {
      onData([]);
    }
  );
}

export function subscribeNewsletterAdmin(
  onData: (items: PersistedNewsletter[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'newsletter'),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            docId: d.id,
            userId: String(data.userId || ''),
            email: String(data.email || ''),
          };
        })
      );
    },
    () => {
      onData([]);
    }
  );
}

export function subscribeAdminsAdmin(onData: (admins: PersistedAdmin[]) => void): () => void {
  return onSnapshot(
    collection(db, 'admins'),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.uid || d.id),
            email: String(data.email || ''),
          };
        })
      );
    },
    () => {
      onData([]);
    }
  );
}

export async function addAdminUser(uid: string, email: string): Promise<void> {
  const cleanUid = uid.trim();
  const path = `admins/${cleanUid}`;
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: email.trim().slice(0, 160),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeAdminUser(uid: string): Promise<void> {
  const path = `admins/${uid}`;
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Exact-Match Public Shipment Tracking & Real-Time Route ---

const LOCAL_TRACKINGS_STORAGE_KEY = 'bt_local_trackings_v1';
const TRACKING_UPDATED_EVENT = 'bt-tracking-updated';

export function formatCpfMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskCpfForPublic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6) return '';
  const mid = digits.slice(3, Math.min(9, digits.length - 2));
  return `***.${mid.slice(0, 3)}.${mid.slice(3) || '***'}-**`;
}

export function formatPhoneMask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function normalizeWhatsAppDigits(rawPhone: string): string {
  const d = rawPhone.replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
}

export const TRACKING_STAGE_LABELS = [
  'Pedido criado',
  'Pedido em andamento',
  'Pedido em logística',
  'Saiu para entrega',
  'Entregue',
] as const;

export const TRACKING_STAGE_DESCRIPTIONS = [
  'Pedido registrado e confirmado no sistema da loja.',
  'Produto em conferência técnica, emissão de NF-e e embalagem lacrada.',
  'Objeto coletado e em encaminhamento na rede logística.',
  'Objeto na rota final de entrega para o endereço do destinatário.',
  'Entrega concluída ao destinatário com comprovante assinado.',
] as const;

export function defaultProgressFromStep(step: number): number {
  const map: Record<number, number> = { 0: 10, 1: 28, 2: 56, 3: 85, 4: 100 };
  return map[Math.min(4, Math.max(0, Math.round(step)))] ?? 10;
}

export function buildTrackingWhatsAppMessage(
  tracking: PersistedTracking,
  storeName = 'Brasil Tech'
): string {
  const stepText = TRACKING_STAGE_LABELS[tracking.statusStep] || 'Pedido em logística';
  const origin = tracking.originCityState || 'Curitiba - PR';
  const dest = tracking.destinationCityState || tracking.cityState || 'Destino';
  const current = tracking.currentLocation || origin;
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#/rastreio/${encodeURIComponent(tracking.code)}`
      : `#/rastreio/${encodeURIComponent(tracking.code)}`;

  return [
    `📦 *Atualização do seu Rastreio ${storeName}*`,
    `Olá, *${tracking.customerLabel || 'Cliente'}*!`,
    ``,
    `🔎 *Código de Rastreio:* ${tracking.code}`,
    tracking.orderCode ? `🧾 *Pedido:* ${tracking.orderCode}` : '',
    `📱 *Produto:* ${tracking.productSummary}`,
    `📍 *Trajeto:* ${origin} ➔ ${dest}`,
    `🚚 *Localização Atual:* ${current} (${Math.round(tracking.routeProgress)}%)`,
    `⚡ *Etapa:* ${stepText}`,
    tracking.statusNote ? `💬 *Obs.:* ${tracking.statusNote}` : '',
    ``,
    `🗺️ *Acompanhe o caminhão e todas as etapas ao vivo:*`,
    link,
  ]
    .filter(Boolean)
    .join('\n');
}

const ADMIN_SESSION_STORAGE_KEY = 'bt_admin_session_v2';

export function readStoredAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (isValidAdminSessionToken(fromSession)) return fromSession;
  } catch {
    // ignore sessionStorage error
  }
  try {
    const fromLocal = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (isValidAdminSessionToken(fromLocal)) return fromLocal;
  } catch {
    // ignore localStorage error
  }
  return null;
}

export function persistAdminSessionToken(token: string): void {
  if (typeof window === 'undefined' || !isValidAdminSessionToken(token)) return;
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  } catch {
    // ignore
  }
  try {
    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAdminSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function exchangeFirebaseAdminSession(
  forceRefresh = false
): Promise<string | null> {
  if (!auth.currentUser) return null;
  try {
    const idToken = await auth.currentUser.getIdToken(forceRefresh);
    if (!idToken) return null;
    const res = await fetch('/api/admin/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sessionToken?: string };
    if (data.sessionToken && isValidAdminSessionToken(data.sessionToken)) {
      persistAdminSessionToken(data.sessionToken);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bt-admin-session-ready'));
      }
      return data.sessionToken;
    }
  } catch {
    // ignore exchange failure
  }
  return null;
}

async function getAdminAuthHeaders(forceRefreshToken = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const sessionToken = readStoredAdminSessionToken();
  if (sessionToken) {
    headers['X-Admin-Session'] = sessionToken;
  }
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(forceRefreshToken);
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      // ignore token errors
    }
  }
  return headers;
}

async function fetchAdminWithAuthRetry(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const initialHeaders = await getAdminAuthHeaders(false);
  const mergedInit: RequestInit = {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...initialHeaders,
    },
  };
  let res = await fetch(url, mergedInit);
  if (res.status === 401 && auth.currentUser) {
    await exchangeFirebaseAdminSession(true);
    const refreshedHeaders = await getAdminAuthHeaders(true);
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...refreshedHeaders,
      },
    });
  }
  return res;
}

function readLocalTrackings(): Record<string, PersistedTracking> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_TRACKINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PersistedTracking>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalTracking(item: PersistedTracking): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readLocalTrackings();
    all[item.code] = item;
    window.localStorage.setItem(LOCAL_TRACKINGS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(TRACKING_UPDATED_EVENT, { detail: { code: item.code } }));
  } catch {
    // Ignore storage quota errors
  }
}

function deleteLocalTracking(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readLocalTrackings();
    delete all[code];
    window.localStorage.setItem(LOCAL_TRACKINGS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(TRACKING_UPDATED_EVENT, { detail: { code } }));
  } catch {
    // Ignore storage quota errors
  }
}

export function sanitizeTrackingCodeForAdmin(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 60);
}

export function normalizeTrackingLookupInput(raw: string): string {
  let candidate = raw.trim();
  const routeMatch = candidate.match(/rastreio\/([^?#/\s]+)/i);
  if (routeMatch && routeMatch[1]) {
    try {
      candidate = decodeURIComponent(routeMatch[1]);
    } catch {
      candidate = routeMatch[1];
    }
  }
  return candidate
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 60);
}

export function isValidTrackingCodeFormat(code: string): boolean {
  return /^[A-Z0-9_-]{3,60}$/.test(code);
}

function mapTrackingDoc(id: string, data: Record<string, unknown>): PersistedTracking {
  const statusStep = Math.min(4, Math.max(0, Number(data.statusStep ?? 0)));
  const dest = String(data.destinationCityState || data.cityState || '');
  const origin = String(data.originCityState || 'Curitiba - PR');
  return {
    code: String(data.code || id).toUpperCase(),
    orderCode: String(data.orderCode || ''),
    customerLabel: String(data.customerLabel || ''),
    maskedCpf: data.maskedCpf ? String(data.maskedCpf) : '',
    customerCpf: data.customerCpf ? String(data.customerCpf) : undefined,
    customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
    customerAddress: data.customerAddress ? String(data.customerAddress) : undefined,
    customerCep: data.customerCep ? String(data.customerCep) : undefined,
    productSummary: String(data.productSummary || ''),
    cityState: dest || String(data.cityState || ''),
    originCityState: origin,
    destinationCityState: dest || String(data.cityState || ''),
    currentLocation: String(data.currentLocation || origin),
    routeProgress:
      typeof data.routeProgress === 'number'
        ? Math.min(100, Math.max(0, data.routeProgress))
        : defaultProgressFromStep(statusStep),
    invoiceNumber: String(data.invoiceNumber || ''),
    orderTotal: Number(data.orderTotal || 0),
    weightKg: Number(data.weightKg || 1.2),
    shippingLabel: String(data.shippingLabel || ''),
    statusStep,
    statusNote: String(data.statusNote || ''),
    active: data.active !== false,
    createdAtLabel: String(data.createdAtLabel || ''),
    updatedAtLabel: String(data.updatedAtLabel || ''),
  };
}

async function fetchTrackingFromApi(
  normalizedCode: string
): Promise<{ ok: boolean; status: number; tracking: PersistedTracking | null }> {
  try {
    const res = await fetch(`/api/trackings/${encodeURIComponent(normalizedCode)}`, {
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ tracking?: Record<string, unknown> }>(res);
    if (!parsed.isJson) {
      return { ok: false, status: res.status, tracking: null };
    }
    if (res.status === 404) {
      return { ok: true, status: 404, tracking: null };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, tracking: null };
    }
    if (!parsed.data?.tracking) {
      return { ok: true, status: 200, tracking: null };
    }
    const mapped = mapTrackingDoc(normalizedCode, parsed.data.tracking);
    if (!mapped.active || mapped.code !== normalizedCode) {
      return { ok: true, status: 200, tracking: null };
    }
    return { ok: true, status: 200, tracking: mapped };
  } catch {
    return { ok: false, status: 0, tracking: null };
  }
}

export async function lookupTrackingByCode(
  rawCode: string
): Promise<{ tracking: PersistedTracking | null; rulesError?: boolean }> {
  const normalized = normalizeTrackingLookupInput(rawCode);
  if (!isValidTrackingCodeFormat(normalized)) {
    return { tracking: null };
  }

  const apiRes = await fetchTrackingFromApi(normalized);
  if (apiRes.ok && apiRes.tracking) {
    return { tracking: apiRes.tracking };
  }

  const localMatch = readLocalTrackings()[normalized];
  let firestoreAnswered = false;
  try {
    const snap = await getDoc(doc(db, 'trackings', normalized));
    firestoreAnswered = true;
    if (snap.exists()) {
      const mapped = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
      if (mapped.active && mapped.code === normalized) {
        return { tracking: mapped };
      }
      return { tracking: null };
    }
  } catch {
    firestoreAnswered = false;
  }

  if (localMatch && localMatch.active) {
    return { tracking: localMatch };
  }
  if (!apiRes.ok && !firestoreAnswered) {
    return { tracking: null, rulesError: true };
  }
  return { tracking: null };
}

export function subscribeLiveTrackingByCode(
  rawCode: string,
  onData: (tracking: PersistedTracking | null, rulesError?: boolean) => void
): () => void {
  const normalized = normalizeTrackingLookupInput(rawCode);
  if (!isValidTrackingCodeFormat(normalized)) {
    onData(null, false);
    return () => undefined;
  }

  let disposed = false;
  let apiSettled = false;
  let apiHealthy = false;
  let firestoreSettled = false;
  let firestoreHealthy = false;
  let latestApi: PersistedTracking | null = null;
  let latestFirestore: PersistedTracking | null = null;

  const emitBest = () => {
    if (disposed) return;
    if (latestApi) {
      onData(latestApi.active ? latestApi : null, false);
      return;
    }
    if (latestFirestore) {
      onData(latestFirestore.active ? latestFirestore : null, false);
      return;
    }
    const localMatch = readLocalTrackings()[normalized];
    if (localMatch && localMatch.active) {
      onData(localMatch, false);
      return;
    }
    if (apiSettled || firestoreSettled) {
      onData(null, !apiHealthy && !firestoreHealthy && apiSettled && firestoreSettled);
    }
  };

  const pollApi = async () => {
    const res = await fetchTrackingFromApi(normalized);
    if (disposed) return;
    apiSettled = true;
    apiHealthy = res.ok;
    latestApi = res.tracking;
    emitBest();
  };

  pollApi();
  const pollTimer =
    typeof window !== 'undefined' ? window.setInterval(pollApi, 4000) : undefined;

  const unsubFirestore = onSnapshot(
    doc(db, 'trackings', normalized),
    (snap) => {
      firestoreSettled = true;
      firestoreHealthy = true;
      if (snap.exists()) {
        latestFirestore = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
      } else {
        latestFirestore = null;
      }
      emitBest();
    },
    () => {
      firestoreSettled = true;
      emitBest();
    }
  );

  ensureStoreSyncHub();
  const handleLocalChange = () => {
    pollApi();
  };
  const handleSseTracking = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'trackings') {
      pollApi();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
    window.addEventListener(STORE_SYNC_EVENT, handleSseTracking);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
    disposed = true;
    if (pollTimer !== undefined && typeof window !== 'undefined') {
      window.clearInterval(pollTimer);
    }
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
      window.removeEventListener(STORE_SYNC_EVENT, handleSseTracking);
      window.removeEventListener('storage', handleLocalChange);
    }
  };
}

export function subscribeTrackingsAdmin(
  onData: (items: PersistedTracking[]) => void,
  onPermissionError?: () => void
): () => void {
  let disposed = false;
  let apiHealthy = false;
  let apiChecked = false;
  let firestoreHealthy = false;
  let apiList: PersistedTracking[] = [];
  let firestoreList: PersistedTracking[] = [];
  const privateCache: Record<
    string,
    { customerCpf?: string; customerPhone?: string; customerAddress?: string; customerCep?: string }
  > = {};

  const canUseFirestoreAdmin = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );

  const mergeAndEmit = () => {
    if (disposed) return;
    const localMap = readLocalTrackings();
    const mergedByCode = new Map<string, PersistedTracking>();

    Object.values(localMap).forEach((localItem) => {
      mergedByCode.set(localItem.code, localItem);
    });

    firestoreList.forEach((item) => {
      const existing = mergedByCode.get(item.code);
      const priv = privateCache[item.code];
      mergedByCode.set(item.code, {
        ...item,
        customerCpf: priv?.customerCpf || existing?.customerCpf || '',
        customerPhone: priv?.customerPhone || existing?.customerPhone || '',
        customerAddress: priv?.customerAddress || existing?.customerAddress || '',
        customerCep: priv?.customerCep || existing?.customerCep || '',
      });
    });

    apiList.forEach((item) => {
      const existing = mergedByCode.get(item.code);
      mergedByCode.set(item.code, {
        ...item,
        customerCpf: item.customerCpf || existing?.customerCpf || '',
        customerPhone: item.customerPhone || existing?.customerPhone || '',
        customerAddress: item.customerAddress || existing?.customerAddress || '',
        customerCep: item.customerCep || existing?.customerCep || '',
      });
    });

    const sorted = Array.from(mergedByCode.values()).sort((a, b) =>
      b.updatedAtLabel.localeCompare(a.updatedAtLabel)
    );
    onData(sorted);
  };

  let syncedLocalOnce = false;
  const fetchAdminTrackings = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      if (!headers['X-Admin-Session'] && !headers.Authorization) {
        apiChecked = true;
        if (!canUseFirestoreAdmin) {
          onPermissionError?.();
        }
        mergeAndEmit();
        return;
      }
      const res = await fetchAdminWithAuthRetry('/api/trackings', { cache: 'no-store' });
      const parsed = await readJsonApiResponse<{ items?: Array<Record<string, unknown>> }>(res);
      apiChecked = true;
      if (!res.ok || !parsed.isJson || !parsed.data) {
        if (!apiHealthy && !canUseFirestoreAdmin && !firestoreHealthy) {
          onPermissionError?.();
        }
        mergeAndEmit();
        return;
      }
      apiHealthy = true;
      apiList = Array.isArray(parsed.data.items)
        ? parsed.data.items.map((item) => mapTrackingDoc(String(item.code || ''), item))
        : [];

      if (!syncedLocalOnce) {
        syncedLocalOnce = true;
        const apiCodes = new Set(apiList.map((t) => t.code));
        const localMissing = Object.values(readLocalTrackings()).filter(
          (localItem) =>
            localItem &&
            localItem.code &&
            !apiCodes.has(localItem.code) &&
            localItem.customerLabel &&
            localItem.productSummary &&
            (localItem.destinationCityState || localItem.cityState)
        );
        if (localMissing.length > 0) {
          for (const item of localMissing) {
            try {
              const pushRes = await fetchAdminWithAuthRetry('/api/trackings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
              });
              const pushed = await readJsonApiResponse<{ tracking?: Record<string, unknown> }>(
                pushRes
              );
              if (pushRes.ok && pushed.isJson && pushed.data?.tracking) {
                apiList.push(mapTrackingDoc(item.code, pushed.data.tracking));
              }
            } catch {
              // ignore individual migration error
            }
          }
        }
      }

      mergeAndEmit();
    } catch {
      apiChecked = true;
      if (!canUseFirestoreAdmin && !firestoreHealthy) {
        onPermissionError?.();
      }
      mergeAndEmit();
    }
  };

  fetchAdminTrackings();

  let unsubFirestore: () => void = () => {};
  if (canUseFirestoreAdmin) {
    unsubFirestore = onSnapshot(
      collection(db, 'trackings'),
      (snap) => {
        firestoreHealthy = true;
        firestoreList = snap.docs.map((d) =>
          mapTrackingDoc(d.id, d.data() as Record<string, unknown>)
        );
        mergeAndEmit();
        firestoreList.forEach((item) => {
          if (!privateCache[item.code]) {
            getDoc(doc(db, 'trackings', item.code, 'private', 'details'))
              .then((pSnap) => {
                if (pSnap.exists()) {
                  const pData = pSnap.data();
                  privateCache[item.code] = {
                    customerCpf: String(pData.customerCpf || ''),
                    customerPhone: String(pData.customerPhone || ''),
                    customerAddress: String(pData.customerAddress || ''),
                    customerCep: String(pData.customerCep || ''),
                  };
                  mergeAndEmit();
                }
              })
              .catch(() => undefined);
          }
        });
      },
      () => {
        firestoreHealthy = false;
        if (apiChecked && !apiHealthy) {
          onPermissionError?.();
        }
        mergeAndEmit();
      }
    );
  }

  ensureStoreSyncHub();
  const handleLocalChange = () => {
    fetchAdminTrackings();
  };
  const handleSseTracking = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'trackings') {
      fetchAdminTrackings();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
    window.addEventListener(STORE_SYNC_EVENT, handleSseTracking);
    window.addEventListener('bt-admin-session-ready', handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
      window.removeEventListener(STORE_SYNC_EVENT, handleSseTracking);
      window.removeEventListener('bt-admin-session-ready', handleLocalChange);
      window.removeEventListener('storage', handleLocalChange);
    }
  };
}

export async function upsertTrackingAdmin(payload: {
  code: string;
  orderCode: string;
  customerLabel: string;
  customerCpf?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCep?: string;
  productSummary: string;
  cityState: string;
  originCityState?: string;
  destinationCityState?: string;
  currentLocation?: string;
  routeProgress?: number;
  invoiceNumber?: string;
  orderTotal?: number;
  weightKg?: number;
  shippingLabel: string;
  statusStep: number;
  statusNote: string;
  active: boolean;
}): Promise<PersistedTracking> {
  const cleanCode = sanitizeTrackingCodeForAdmin(payload.code);
  if (!isValidTrackingCodeFormat(cleanCode)) {
    throw new Error('Código de rastreio inválido. Use ao menos 3 letras ou números.');
  }
  const nowLabel = new Date().toLocaleString('pt-BR').slice(0, 60);
  const statusStep = Math.min(4, Math.max(0, Math.round(Number(payload.statusStep) || 0)));
  const originCityState = (payload.originCityState?.trim() || 'Curitiba - PR').slice(0, 120);
  const destinationCityState = (
    payload.destinationCityState?.trim() ||
    payload.cityState.trim() ||
    'São Paulo - SP'
  ).slice(0, 120);
  const currentLocation = (
    payload.currentLocation?.trim() ||
    (statusStep >= 4 ? destinationCityState : originCityState)
  ).slice(0, 160);
  const routeProgress =
    typeof payload.routeProgress === 'number'
      ? Math.min(100, Math.max(0, Math.round(payload.routeProgress)))
      : defaultProgressFromStep(statusStep);
  const cleanCpf = formatCpfMask(payload.customerCpf || '').slice(0, 30);
  const cleanPhone = formatPhoneMask(payload.customerPhone || '').slice(0, 30);
  const cleanAddress = (payload.customerAddress || '').trim().slice(0, 300);
  const cleanCep = (payload.customerCep || '').trim().slice(0, 20);
  const maskedCpf = maskCpfForPublic(cleanCpf).slice(0, 30);
  const invoiceNumber = (
    payload.invoiceNumber?.trim() ||
    `NFE-${cleanCode.replace(/[^0-9]/g, '').slice(0, 6) || '001482'}`
  ).slice(0, 40);
  const parsedOrderTotal = Number(payload.orderTotal ?? 0);
  const orderTotal = Number.isFinite(parsedOrderTotal)
    ? Math.min(5000000, Math.max(0, parsedOrderTotal))
    : 0;
  const parsedWeightKg = Number(payload.weightKg ?? 1.2);
  const weightKg = Number.isFinite(parsedWeightKg)
    ? Math.max(0.1, Math.min(500, parsedWeightKg))
    : 1.2;

  const safeCustomerLabel = (payload.customerLabel.trim() || 'Cliente Brasil Tech').slice(0, 80);
  const safeProductSummary = (payload.productSummary.trim() || 'Pedido Brasil Tech').slice(0, 240);
  const safeDestination = (
    destinationCityState.length >= 2 ? destinationCityState : 'São Paulo - SP'
  ).slice(0, 120);
  const rawShipping = payload.shippingLabel.trim();
  const safeShippingLabel = (
    rawShipping.length >= 2 ? rawShipping : 'Correios SEDEX • Brasil Tech Express'
  ).slice(0, 120);

  const existingLocal = readLocalTrackings()[cleanCode];
  let resultTracking: PersistedTracking = {
    code: cleanCode,
    orderCode: payload.orderCode.trim().slice(0, 40),
    customerLabel: safeCustomerLabel,
    maskedCpf,
    customerCpf: cleanCpf,
    customerPhone: cleanPhone,
    customerAddress: cleanAddress,
    customerCep: cleanCep,
    productSummary: safeProductSummary,
    cityState: safeDestination,
    originCityState,
    destinationCityState: safeDestination,
    currentLocation,
    routeProgress,
    invoiceNumber,
    orderTotal,
    weightKg,
    shippingLabel: safeShippingLabel,
    statusStep,
    statusNote: payload.statusNote.trim().slice(0, 300),
    active: Boolean(payload.active),
    createdAtLabel: existingLocal?.createdAtLabel || nowLabel,
    updatedAtLabel: nowLabel,
  };

  // Persist to shared server first (retry once on transient error; only consider success when valid JSON is returned)
  let apiOk = false;
  let apiIsJson = false;
  let apiStatus = 0;
  let apiErrorMsg = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetchAdminWithAuthRetry('/api/trackings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultTracking),
        cache: 'no-store',
      });
      apiStatus = res.status;
      const parsed = await readJsonApiResponse<{
        tracking?: Record<string, unknown>;
        error?: string;
      }>(res);
      apiIsJson = parsed.isJson;
      if (res.ok && parsed.isJson && parsed.data?.tracking?.code) {
        apiOk = true;
        resultTracking = mapTrackingDoc(cleanCode, parsed.data.tracking);
        break;
      }
      if (parsed.data?.error) {
        apiErrorMsg = parsed.data.error;
      }
      if (apiStatus === 400 || apiStatus === 401 || attempt === 1) {
        break;
      }
    } catch {
      apiOk = false;
    }
  }

  if (apiIsJson && apiStatus === 400) {
    throw new Error(apiErrorMsg || 'Verifique código, cliente, produto e cidade de destino.');
  }

  // Also persist directly in Firestore whenever Firebase Admin is signed in (resilient dual-write)
  let firestoreOk = false;
  let firestoreError = '';
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    const ref = doc(db, 'trackings', cleanCode);
    const privRef = doc(db, 'trackings', cleanCode, 'private', 'details');
    const publicData = {
      orderCode: resultTracking.orderCode,
      customerLabel: resultTracking.customerLabel,
      maskedCpf,
      productSummary: resultTracking.productSummary,
      cityState: safeDestination,
      originCityState,
      destinationCityState: safeDestination,
      currentLocation,
      routeProgress,
      invoiceNumber,
      orderTotal,
      weightKg,
      shippingLabel: resultTracking.shippingLabel,
      statusStep,
      statusNote: resultTracking.statusNote,
      active: resultTracking.active,
      updatedAtLabel: resultTracking.updatedAtLabel,
    };
    const privateData = {
      code: cleanCode,
      customerCpf: cleanCpf,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
      customerCep: cleanCep,
      updatedAt: serverTimestamp(),
    };

    const commitCreateFresh = async (createdLabel: string) => {
      const freshBatch = writeBatch(db);
      freshBatch.set(ref, {
        code: cleanCode,
        ...publicData,
        createdAtLabel: createdLabel.slice(0, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      freshBatch.set(privRef, privateData);
      await freshBatch.commit();
    };

    try {
      const existingSnap = await getDoc(ref);
      const existingData = existingSnap.exists()
        ? (existingSnap.data() as Record<string, unknown>)
        : null;

      if (!existingSnap.exists()) {
        await commitCreateFresh(resultTracking.createdAtLabel);
        firestoreOk = true;
      } else if (!existingData?.createdAt || !existingData?.createdAtLabel || typeof existingData?.code !== 'string') {
        // Legacy/partial doc cannot pass `update` rule immutable checks -> recreate cleanly
        await deleteDoc(ref).catch(() => undefined);
        await commitCreateFresh(
          String(existingData?.createdAtLabel || resultTracking.createdAtLabel)
        );
        firestoreOk = true;
      } else {
        try {
          const batch = writeBatch(db);
          batch.update(ref, {
            ...publicData,
            updatedAt: serverTimestamp(),
          });
          batch.set(privRef, privateData);
          await batch.commit();
          firestoreOk = true;
        } catch {
          // If an unexpected legacy field caused update validation failure, delete and recreate cleanly
          await deleteDoc(ref).catch(() => undefined);
          await commitCreateFresh(
            String(existingData?.createdAtLabel || resultTracking.createdAtLabel)
          );
          firestoreOk = true;
        }
      }
    } catch (err) {
      firestoreError = err instanceof Error ? err.message : '';
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('criar e liberar rastreios'));
    }
    if (firestoreError) {
      throw new Error(`Erro ao gravar rastreio no Firebase: ${firestoreError}`);
    }
    throw new Error(
      apiErrorMsg ||
        'Não foi possível liberar o rastreio no servidor. Clique em "Conectar Google Admin" ou faça login novamente.'
    );
  }

  writeLocalTracking(resultTracking);
  broadcastStoreTopic('trackings', cleanCode);
  return resultTracking;
}

export async function deleteTrackingAdmin(code: string): Promise<void> {
  const cleanCode = sanitizeTrackingCodeForAdmin(code);
  let apiOk = false;
  let apiIsJson = false;
  let apiErrorMsg = '';
  try {
    const res = await fetchAdminWithAuthRetry(
      `/api/trackings/${encodeURIComponent(cleanCode)}`,
      {
        method: 'DELETE',
        cache: 'no-store',
      }
    );
    const parsed = await readJsonApiResponse<{ ok?: boolean; error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) {
      apiOk = true;
    } else if (parsed.data?.error) {
      apiErrorMsg = parsed.data.error;
    }
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      await deleteDoc(doc(db, 'trackings', cleanCode, 'private', 'details')).catch(() => undefined);
      await deleteDoc(doc(db, 'trackings', cleanCode));
      firestoreOk = true;
    } catch {
      // Ignore optional Firestore cleanup error
    }
  }

  if (!apiOk && !firestoreOk) {
    if (!apiIsJson && !canWriteFirestore) {
      throw new Error(getStaticHostingAuthMessage('excluir rastreios'));
    }
    throw new Error(apiErrorMsg || 'Erro ao excluir rastreio no servidor.');
  }
  deleteLocalTracking(cleanCode);
  broadcastStoreTopic('trackings', cleanCode);
}

// --- Editable Storefront Banners, Categories & Pixel Config ---

export interface StorefrontContentState {
  banners: StoreBanner[];
  categories: StoreCategory[];
  metaPixelId: string;
  installmentsMax: number;
}

const STOREFRONT_CONTENT_LOCAL_KEY = 'bt_storefront_content_v1';
const STOREFRONT_CONTENT_EVENT = 'bt-storefront-updated';

export const DEFAULT_STOREFRONT_CONTENT: StorefrontContentState = {
  banners: DEFAULT_BANNERS,
  categories: DEFAULT_CATEGORIES,
  metaPixelId: '',
  installmentsMax: 12,
};

function readLocalStorefrontContent(): StorefrontContentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STOREFRONT_CONTENT_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StorefrontContentState>;
    return {
      banners:
        Array.isArray(parsed.banners) && parsed.banners.length > 0
          ? parsed.banners
          : DEFAULT_BANNERS,
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : DEFAULT_CATEGORIES,
      metaPixelId: typeof parsed.metaPixelId === 'string' ? parsed.metaPixelId : '',
      installmentsMax:
        typeof parsed.installmentsMax === 'number' ? parsed.installmentsMax : 12,
    };
  } catch {
    return null;
  }
}

export function subscribeStorefrontContent(
  onData: (state: StorefrontContentState) => void
): () => void {
  ensureStoreSyncHub();
  let disposed = false;

  const loadFromServer = async () => {
    try {
      const res = await fetch('/api/storefront-content', { cache: 'no-store' });
      const parsed = await readJsonApiResponse<Partial<StorefrontContentState>>(res);
      if (!res.ok || !parsed.isJson || !parsed.data || disposed) {
        const localFallback = readLocalStorefrontContent();
        if (localFallback && !disposed) {
          onData(localFallback);
        }
        return;
      }
      const data = parsed.data;
      const localFallback = readLocalStorefrontContent();
      const merged: StorefrontContentState = {
        banners:
          Array.isArray(data.banners) && data.banners.length > 0
            ? data.banners
            : localFallback?.banners || DEFAULT_BANNERS,
        categories:
          Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : localFallback?.categories || DEFAULT_CATEGORIES,
        metaPixelId:
          typeof data.metaPixelId === 'string'
            ? data.metaPixelId
            : localFallback?.metaPixelId || '',
        installmentsMax:
          typeof data.installmentsMax === 'number'
            ? data.installmentsMax
            : localFallback?.installmentsMax || 12,
      };
      if (!disposed) {
        onData(merged);
      }
    } catch {
      const local = readLocalStorefrontContent();
      if (!disposed) {
        onData(local || DEFAULT_STOREFRONT_CONTENT);
      }
    }
  };

  loadFromServer();
  const handleLocalUpdate = () => {
    const local = readLocalStorefrontContent();
    if (local && !disposed) {
      onData(local);
    }
    loadFromServer();
  };
  const handleSseStorefront = (ev: Event) => {
    const detail = (ev as CustomEvent<{ topic?: string }>).detail;
    if (!detail?.topic || detail.topic === 'storefront-content') {
      loadFromServer();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(STOREFRONT_CONTENT_EVENT, handleLocalUpdate);
    window.addEventListener(STORE_SYNC_EVENT, handleSseStorefront);
  }
  return () => {
    disposed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener(STOREFRONT_CONTENT_EVENT, handleLocalUpdate);
      window.removeEventListener(STORE_SYNC_EVENT, handleSseStorefront);
    }
  };
}

export async function saveStorefrontContentAdmin(
  next: StorefrontContentState
): Promise<StorefrontContentState> {
  const payload: StorefrontContentState = {
    banners: next.banners.slice(0, 20),
    categories: next.categories.slice(0, 30),
    metaPixelId: (next.metaPixelId || '').replace(/\D/g, '').slice(0, 24),
    installmentsMax: Math.min(24, Math.max(1, Math.round(Number(next.installmentsMax || 12)))),
  };

  let apiOk = false;
  let apiIsJson = false;
  let apiError = '';
  try {
    const res = await fetchAdminWithAuthRetry('/api/storefront-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const parsed = await readJsonApiResponse<{ error?: string }>(res);
    apiIsJson = parsed.isJson;
    if (res.ok && parsed.isJson) apiOk = true;
    else if (parsed.data?.error) apiError = parsed.data.error;
  } catch {
    apiOk = false;
  }

  let firestoreOk = false;
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    try {
      const batch = writeBatch(db);
      payload.banners.forEach((b, idx) => {
        const cleanId = String(b.id || `ban_${idx}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
        if (!cleanId) return;
        batch.set(doc(db, 'banners', cleanId), {
          id: cleanId,
          slot: b.slot === 'hero' ? 'hero' : 'secondary',
          badge: String(b.badge || '').slice(0, 80),
          title: String(b.title || 'Banner').slice(0, 160),
          subtitle: String(b.subtitle || '').slice(0, 320),
          ctaLabel: String(b.ctaLabel || '').slice(0, 60),
          targetDivision: String(b.targetDivision || 'all').slice(0, 60),
          targetCategory: String(b.targetCategory || '').slice(0, 60),
          image: String(b.image || '').slice(0, 500),
          order: idx,
          active: b.active !== false,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      firestoreOk = true;
    } catch {
      firestoreOk = false;
    }
  }

  if (!apiOk && !firestoreOk && apiIsJson) {
    throw new Error(apiError || 'Erro ao salvar banners e categorias no servidor.');
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STOREFRONT_CONTENT_LOCAL_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(STOREFRONT_CONTENT_EVENT));
    } catch {
      // ignore storage errors
    }
  }
  broadcastStoreTopic('storefront-content');

  return payload;
}
