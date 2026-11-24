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

async function fetchPublicServerStoreData(force = false): Promise<ServerStoreDataShape> {
  if (!force && publicStoreCache) return publicStoreCache;
  if (!force && publicStorePromise) return publicStorePromise;

  publicStorePromise = (async () => {
    try {
      const res = await fetch('/api/store-data', { cache: 'no-store' });
      if (!res.ok) return publicStoreCache || EMPTY_SERVER_DATA;
      const data = (await res.json()) as ServerStoreDataShape;
      publicStoreCache = { ...EMPTY_SERVER_DATA, ...data };
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
      const res = await fetch('/api/admin/store-data', { headers, cache: 'no-store' });
      if (!res.ok) return fetchPublicServerStoreData(force);
      const data = (await res.json()) as ServerStoreDataShape;
      adminStoreCache = { ...EMPTY_SERVER_DATA, ...data };
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

  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      product: cleanProduct,
      costPrice: Math.max(0, Number(costPrice || 0)),
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao publicar alterações do produto.');
  }
  broadcastStoreTopic('products', String(product.id));

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    const ref = doc(db, 'products', String(product.id));
    try {
      const firestorePayload = {
        id: cleanProduct.id,
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
      if (isNew) {
        await setDoc(ref, { ...firestorePayload, createdAt: serverTimestamp() });
      } else {
        await setDoc(ref, firestorePayload, { merge: true });
      }
      await setDoc(doc(db, 'productCosts', String(product.id)), {
        productId: product.id,
        costPrice: Math.max(0, Number(costPrice || 0)),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Server store already published globally without errors
    }
  }
}

export async function adjustProductStockAdmin(
  productId: number,
  nextStock: number,
  productSnapshot?: MarketplaceProduct
): Promise<void> {
  const safeStock = Math.max(0, Math.round(nextStock));
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/products/${encodeURIComponent(String(productId))}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ stock: safeStock, product: productSnapshot }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao atualizar estoque.');
  }
  broadcastStoreTopic('products', String(productId));

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await updateDoc(doc(db, 'products', String(productId)), {
        stock: safeStock,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore Firestore mirror failure
    }
  }
}

export async function deleteProductAdmin(productId: number): Promise<void> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/products/${encodeURIComponent(String(productId))}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao excluir produto.');
  }
  broadcastStoreTopic('products', String(productId));

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await deleteDoc(doc(db, 'products', String(productId)));
      await deleteDoc(doc(db, 'productCosts', String(productId))).catch(() => undefined);
    } catch {
      // ignore Firestore mirror failure
    }
  }
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
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderCode)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      statusStep: updates.statusStep,
      trackingCode: updates.trackingCode.trim().slice(0, 60),
      paymentStatus: updates.paymentStatus,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao atualizar pedido.');
  }
  broadcastStoreTopic('orders', orderCode);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await updateDoc(doc(db, 'orders', orderCode), {
        statusStep: updates.statusStep,
        trackingCode: updates.trackingCode.trim().slice(0, 60),
        paymentStatus: updates.paymentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

// --- Coupons ---

export async function saveCouponAdmin(coupon: PersistedCoupon, isNew: boolean): Promise<void> {
  const code = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      code,
      type: coupon.type,
      value: Number(coupon.value),
      label: coupon.label.trim().slice(0, 80),
      active: coupon.active,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao salvar cupom.');
  }
  broadcastStoreTopic('coupons', code);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      const payload = {
        code,
        type: coupon.type,
        value: Number(coupon.value),
        label: coupon.label.trim().slice(0, 80),
        active: coupon.active,
        updatedAt: serverTimestamp(),
      };
      if (isNew) {
        await setDoc(doc(db, 'coupons', code), { ...payload, createdAt: serverTimestamp() });
      } else {
        await setDoc(doc(db, 'coupons', code), payload, { merge: true });
      }
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function deleteCouponAdmin(code: string): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/coupons/${encodeURIComponent(cleanCode)}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao excluir cupom.');
  }
  broadcastStoreTopic('coupons', cleanCode);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await deleteDoc(doc(db, 'coupons', cleanCode));
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
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
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/questions/${encodeURIComponent(docId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ answer: cleanAnswer, date: dateLabel }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao responder pergunta.');
  }
  broadcastStoreTopic('questions', docId);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await updateDoc(doc(db, 'questions', docId), {
        answer: cleanAnswer,
        answered: true,
        date: dateLabel,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function deleteQuestionAdmin(docId: string): Promise<void> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/questions/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao remover pergunta.');
  }
  broadcastStoreTopic('questions', docId);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await deleteDoc(doc(db, 'questions', docId));
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function moderateReviewAdmin(
  docId: string,
  status: ReviewStatus
): Promise<void> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/reviews/${encodeURIComponent(docId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao moderar avaliação.');
  }
  broadcastStoreTopic('reviews', docId);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await updateDoc(doc(db, 'reviews', docId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function deleteReviewAdmin(docId: string): Promise<void> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/reviews/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao excluir avaliação.');
  }
  broadcastStoreTopic('reviews', docId);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await deleteDoc(doc(db, 'reviews', docId));
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function deleteOrderAdmin(orderCode: string): Promise<void> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderCode)}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao remover pedido.');
  }
  broadcastStoreTopic('orders', orderCode);

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await deleteDoc(doc(db, 'orders', orderCode));
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
}

export async function deductOrderStockAdmin(
  items: OrderItem[],
  currentProducts: MarketplaceProduct[]
): Promise<number> {
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/products/deduct-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      items,
      productsSnapshot: currentProducts,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao baixar estoque.');
  }
  const json = (await res.json().catch(() => ({}))) as { updated?: number };
  broadcastStoreTopic('products');

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      const batch = writeBatch(db);
      let updated = 0;
      items.forEach((item) => {
        const prod = currentProducts.find((p) => p.id === item.id);
        if (!prod) return;
        batch.update(doc(db, 'products', String(prod.id)), {
          stock: Math.max(0, prod.stock - item.qty),
          sold: prod.sold + item.qty,
          updatedAt: serverTimestamp(),
        });
        updated += 1;
      });
      if (updated > 0) {
        await batch.commit();
      }
    } catch {
      // ignore optional Firestore mirror failure
    }
  }

  return Number(json.updated || 0);
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

  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/store-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao salvar configurações da loja.');
  }
  broadcastStoreTopic('store-settings');

  if (isBootstrappedAdminUser(auth.currentUser?.email, auth.currentUser?.emailVerified)) {
    try {
      await setDoc(doc(db, 'storeSettings', 'public'), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore optional Firestore mirror failure
    }
  }
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

export function defaultProgressFromStep(step: number): number {
  const map: Record<number, number> = { 0: 8, 1: 24, 2: 52, 3: 84, 4: 100 };
  return map[Math.min(4, Math.max(0, Math.round(step)))] ?? 10;
}

export function buildTrackingWhatsAppMessage(
  tracking: PersistedTracking,
  storeName = 'Brasil Tech'
): string {
  const stepLabels = [
    'Pedido Confirmado',
    'Em Preparação / NF-e Emitida',
    'Enviado • Em Trânsito',
    'Saiu para Entrega',
    'Pedido Entregue',
  ];
  const stepText = stepLabels[tracking.statusStep] || 'Em atualização';
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
    `⚡ *Status:* ${stepText}`,
    tracking.statusNote ? `💬 *Obs.:* ${tracking.statusNote}` : '',
    ``,
    `🗺️ *Acompanhe o caminhão ao vivo no mapa:*`,
    link,
  ]
    .filter(Boolean)
    .join('\n');
}

const ADMIN_SESSION_STORAGE_KEY = 'bt_admin_session_v2';

async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const token = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      if (isValidAdminSessionToken(token) && token) {
        headers['X-Admin-Session'] = token;
      }
    } catch {
      // ignore sessionStorage errors
    }
  }
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      // ignore token errors
    }
  }
  return headers;
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
    if (res.status === 404) {
      return { ok: true, status: 404, tracking: null };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, tracking: null };
    }
    const data = (await res.json()) as { tracking?: Record<string, unknown> };
    if (!data?.tracking) {
      return { ok: true, status: 200, tracking: null };
    }
    const mapped = mapTrackingDoc(normalizedCode, data.tracking);
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
  try {
    const snap = await getDoc(doc(db, 'trackings', normalized));
    if (snap.exists()) {
      const mapped = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
      if (mapped.active && mapped.code === normalized) {
        return { tracking: mapped };
      }
      return { tracking: null };
    }
  } catch {
    // Firestore /trackings may be inaccessible when server API is authoritative
  }

  if (localMatch && localMatch.active) {
    return { tracking: localMatch };
  }
  if (!apiRes.ok) {
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
    if (apiSettled) {
      onData(null, !apiHealthy);
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
      if (snap.exists()) {
        latestFirestore = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
      } else {
        latestFirestore = null;
      }
      emitBest();
    },
    () => {
      // Ignore Firestore /trackings permission error when /api/trackings handles global reads
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
  let apiList: PersistedTracking[] = [];
  let firestoreList: PersistedTracking[] = [];
  const privateCache: Record<
    string,
    { customerCpf?: string; customerPhone?: string; customerAddress?: string; customerCep?: string }
  > = {};

  const mergeAndEmit = () => {
    if (disposed) return;
    const localMap = readLocalTrackings();
    const mergedByCode = new Map<string, PersistedTracking>();

    // Start with local cache
    Object.values(localMap).forEach((localItem) => {
      mergedByCode.set(localItem.code, localItem);
    });

    // Layer Firestore records if available
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

    // Authoritative central server trackings override stale local entries
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
        mergeAndEmit();
        return;
      }
      const res = await fetch('/api/trackings', { headers, cache: 'no-store' });
      if (!res.ok) {
        if (!apiHealthy) {
          onPermissionError?.();
        }
        mergeAndEmit();
        return;
      }
      const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
      apiHealthy = true;
      apiList = Array.isArray(data.items)
        ? data.items.map((item) => mapTrackingDoc(String(item.code || ''), item))
        : [];

      // Auto-migrate any trackings previously saved only in localStorage up to the shared server
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
              const pushRes = await fetch('/api/trackings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(item),
              });
              if (pushRes.ok) {
                const pushed = (await pushRes.json()) as { tracking?: Record<string, unknown> };
                if (pushed?.tracking) {
                  apiList.push(mapTrackingDoc(item.code, pushed.tracking));
                }
              }
            } catch {
              // ignore individual migration error
            }
          }
        }
      }

      mergeAndEmit();
    } catch {
      mergeAndEmit();
    }
  };

  fetchAdminTrackings();

  const canUseFirestoreAdmin = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );

  let unsubFirestore: () => void = () => {};
  if (canUseFirestoreAdmin) {
    unsubFirestore = onSnapshot(
      collection(db, 'trackings'),
      (snap) => {
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
        // Only warn if central /api/trackings is also unavailable
        if (!apiHealthy) {
          mergeAndEmit();
        }
      }
    );
  }

  const handleLocalChange = () => {
    fetchAdminTrackings();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
    disposed = true;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
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
  const orderTotal = Math.max(0, Number(payload.orderTotal || 0));
  const weightKg = Math.max(0.1, Math.min(500, Number(payload.weightKg || 1.2)));

  const existingLocal = readLocalTrackings()[cleanCode];
  let resultTracking: PersistedTracking = {
    code: cleanCode,
    orderCode: payload.orderCode.trim().slice(0, 40),
    customerLabel: payload.customerLabel.trim().slice(0, 80),
    maskedCpf,
    customerCpf: cleanCpf,
    customerPhone: cleanPhone,
    customerAddress: cleanAddress,
    customerCep: cleanCep,
    productSummary: payload.productSummary.trim().slice(0, 240),
    cityState: destinationCityState,
    originCityState,
    destinationCityState,
    currentLocation,
    routeProgress,
    invoiceNumber,
    orderTotal,
    weightKg,
    shippingLabel: (payload.shippingLabel.trim() || 'Entrega Padrão Brasil Tech').slice(0, 120),
    statusStep,
    statusNote: payload.statusNote.trim().slice(0, 300),
    active: Boolean(payload.active),
    createdAtLabel: existingLocal?.createdAtLabel || nowLabel,
    updatedAtLabel: nowLabel,
  };

  // Persist to shared server first so any client device can immediately view it
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch('/api/trackings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(resultTracking),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errBody.error || 'Não foi possível liberar o rastreio no servidor. Faça login novamente.'
    );
  }

  const savedJson = (await res.json().catch(() => ({}))) as {
    tracking?: Record<string, unknown>;
  };
  if (savedJson?.tracking) {
    resultTracking = mapTrackingDoc(cleanCode, savedJson.tracking);
  }
  writeLocalTracking(resultTracking);

  // Best-effort Firestore mirror when signed in via verified Google Admin
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    const ref = doc(db, 'trackings', cleanCode);
    const privRef = doc(db, 'trackings', cleanCode, 'private', 'details');
    try {
      const existingSnap = await getDoc(ref);
      const publicData = {
        orderCode: resultTracking.orderCode,
        customerLabel: resultTracking.customerLabel,
        maskedCpf,
        productSummary: resultTracking.productSummary,
        cityState: destinationCityState,
        originCityState,
        destinationCityState,
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

      const batch = writeBatch(db);
      if (!existingSnap.exists()) {
        batch.set(ref, {
          code: cleanCode,
          ...publicData,
          createdAtLabel: resultTracking.createdAtLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(ref, {
          ...publicData,
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(privRef, privateData);
      await batch.commit();
    } catch {
      // /api/trackings already persisted globally; never fail UI over un-deployed Firestore /trackings rules
    }
  }

  return resultTracking;
}

export async function deleteTrackingAdmin(code: string): Promise<void> {
  const cleanCode = sanitizeTrackingCodeForAdmin(code);
  const authHeaders = await getAdminAuthHeaders();
  const res = await fetch(`/api/trackings/${encodeURIComponent(cleanCode)}`, {
    method: 'DELETE',
    headers: authHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao excluir rastreio no servidor.');
  }
  deleteLocalTracking(cleanCode);

  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (!canWriteFirestore) return;

  try {
    await deleteDoc(doc(db, 'trackings', cleanCode, 'private', 'details')).catch(() => undefined);
    await deleteDoc(doc(db, 'trackings', cleanCode)).catch(() => undefined);
  } catch {
    // Ignore optional Firestore cleanup error
  }
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
      if (!res.ok || disposed) return;
      const data = (await res.json()) as Partial<StorefrontContentState>;
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
  const authHeaders = await getAdminAuthHeaders();
  const payload: StorefrontContentState = {
    banners: next.banners.slice(0, 20),
    categories: next.categories.slice(0, 30),
    metaPixelId: (next.metaPixelId || '').replace(/\D/g, '').slice(0, 24),
    installmentsMax: Math.min(24, Math.max(1, Math.round(Number(next.installmentsMax || 12)))),
  };

  const res = await fetch('/api/storefront-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Erro ao salvar banners e categorias no servidor.');
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
