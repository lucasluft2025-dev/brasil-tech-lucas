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
  MarketplaceOrder,
  MarketplaceProduct,
  OrderItem,
  PRODUCTS,
  extractCheckoutUrlAndCleanSpecs,
  mergeCheckoutUrlIntoSpecs,
} from '../data/marketplaceCatalog';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isBootstrappedAdminUser,
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

// --- Subscriptions ---

export function subscribeProducts(
  onData: (items: MarketplaceProduct[]) => void
): () => void {
  const q = query(collection(db, 'products'), where('price', '>', 0));
  return onSnapshot(
    q,
    (snap) => {
      const list: MarketplaceProduct[] = snap.docs
        .map((d) => {
          const data = d.data();
          const numId = Number(data.id);
          const catalogMatch = PRODUCTS.find((cp) => cp.id === numId);
          const rawSpecs = Array.isArray(data.specs) ? data.specs : [];
          const { checkoutUrl, cleanSpecs } = extractCheckoutUrlAndCleanSpecs(
            rawSpecs,
            catalogMatch?.checkoutUrl
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
            specs: cleanSpecs,
          };
        })
        .sort((a, b) => a.id - b.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
    }
  );
}

export function subscribeProductCostsAdmin(onData: (costs: CostMap) => void): () => void {
  return onSnapshot(
    collection(db, 'productCosts'),
    (snap) => {
      const next: CostMap = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        next[Number(data.productId)] = Number(data.costPrice || 0);
      });
      onData(next);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'productCosts');
    }
  );
}

export function subscribeCoupons(
  isAdmin: boolean,
  onData: (coupons: PersistedCoupon[]) => void
): () => void {
  const source = isAdmin
    ? collection(db, 'coupons')
    : query(collection(db, 'coupons'), where('active', '==', true));

  return onSnapshot(
    source,
    (snap) => {
      const list: PersistedCoupon[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          code: String(data.code || d.id),
          type: data.type === 'fixed' ? 'fixed' : 'percent',
          value: Number(data.value || 0),
          label: String(data.label || ''),
          active: Boolean(data.active),
        };
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'coupons');
    }
  );
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
  let activeUnsub: () => void = () => undefined;
  let disposed = false;

  const primarySource = isAdminView
    ? collection(db, 'reviews')
    : query(collection(db, 'reviews'), where('status', '==', 'approved'));

  activeUnsub = onSnapshot(
    primarySource,
    (snap) => {
      const mapped = mapReviewSnapshotDocs(snap.docs);
      onData(isAdminView ? mapped : mapped.filter((r) => r.status === 'approved'));
    },
    () => {
      if (disposed) return;
      // Resilient fallback when legacy rules require rating >= 1 on list
      const fallbackQuery = query(collection(db, 'reviews'), where('rating', '>=', 1));
      activeUnsub = onSnapshot(
        fallbackQuery,
        (snap) => {
          const mapped = mapReviewSnapshotDocs(snap.docs);
          onData(isAdminView ? mapped : mapped.filter((r) => r.status === 'approved'));
        },
        () => {
          onData([]);
        }
      );
    }
  );

  return () => {
    disposed = true;
    activeUnsub();
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
  const q = query(collection(db, 'questions'), where('productId', '>=', 1));
  return onSnapshot(
    q,
    (snap) => {
      const list: PersistedQuestion[] = snap.docs.map((d) => {
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
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'questions');
    }
  );
}

export function subscribeOrders(
  userId: string,
  isAdmin: boolean,
  onData: (orders: PersistedOrder[]) => void
): () => void {
  const source = isAdmin
    ? collection(db, 'orders')
    : query(collection(db, 'orders'), where('userId', '==', userId));

  return onSnapshot(
    source,
    (snap) => {
      const list: PersistedOrder[] = snap.docs
        .map((d): PersistedOrder => {
          const data = d.data();
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
            docId: d.id,
            code: String(data.code || d.id),
            userId: String(data.userId || ''),
            customerEmail: String(data.customerEmail || ''),
            createdAt: String(data.createdAtLabel || ''),
            createdAtLabel: String(data.createdAtLabel || ''),
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
            items: Array.isArray(data.items) ? data.items : [],
          };
        })
        .sort((a, b) => b.code.localeCompare(a.code));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

// --- Seed & Admin CRUD ---

export async function seedInitialCatalogIfEmpty(): Promise<number> {
  const path = 'products';
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
        specs: mergeCheckoutUrlIntoSpecs(p.specs, p.checkoutUrl),
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

    // Seed initial coupons if missing
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
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveProductAdmin(
  product: MarketplaceProduct,
  costPrice: number,
  isNew: boolean
): Promise<void> {
  const path = `products/${product.id}`;
  const ref = doc(db, 'products', String(product.id));
  const normalizedImages =
    product.images && product.images.length > 0
      ? product.images.filter(Boolean).slice(0, 10)
      : [product.image || '/src/assets/ref/products/ps5-digital.jpg'];

  try {
    if (isNew) {
      await setDoc(ref, {
        id: product.id,
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
        specs: mergeCheckoutUrlIntoSpecs(product.specs, product.checkoutUrl),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
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
        specs: mergeCheckoutUrlIntoSpecs(product.specs, product.checkoutUrl),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'productCosts', String(product.id)), {
      productId: product.id,
      costPrice: Math.max(0, Number(costPrice || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function adjustProductStockAdmin(
  productId: number,
  nextStock: number
): Promise<void> {
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', String(productId)), {
      stock: Math.max(0, Math.round(nextStock)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProductAdmin(productId: number): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', String(productId)));
    await deleteDoc(doc(db, 'productCosts', String(productId))).catch(() => undefined);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Orders ---

export async function createOrderFirestore(
  user: User,
  order: MarketplaceOrder,
  items: OrderItem[],
  couponCode: string
): Promise<void> {
  const path = `orders/${order.code}`;
  try {
    await setDoc(doc(db, 'orders', order.code), {
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
      paymentStatus: 'pending',
      couponCode: couponCode.slice(0, 40),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      statusStep: 1,
      trackingCode: order.trackingCode.slice(0, 60),
      items: items.slice(0, 50),
      createdAtLabel: order.createdAt.slice(0, 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateOrderAdmin(
  orderCode: string,
  updates: {
    statusStep: number;
    trackingCode: string;
    paymentStatus: 'pending' | 'paid' | 'refunded';
  }
): Promise<void> {
  const path = `orders/${orderCode}`;
  try {
    await updateDoc(doc(db, 'orders', orderCode), {
      statusStep: updates.statusStep,
      trackingCode: updates.trackingCode.trim().slice(0, 60),
      paymentStatus: updates.paymentStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Coupons ---

export async function saveCouponAdmin(coupon: PersistedCoupon, isNew: boolean): Promise<void> {
  const code = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  const path = `coupons/${code}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'coupons', code), {
        code,
        type: coupon.type,
        value: Number(coupon.value),
        label: coupon.label.trim().slice(0, 80),
        active: coupon.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'coupons', code), {
        type: coupon.type,
        value: Number(coupon.value),
        label: coupon.label.trim().slice(0, 80),
        active: coupon.active,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteCouponAdmin(code: string): Promise<void> {
  const path = `coupons/${code}`;
  try {
    await deleteDoc(doc(db, 'coupons', code));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
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
  const path = `reviews/${docId}`;
  try {
    await setDoc(doc(db, 'reviews', docId), {
      id,
      productId: payload.productId,
      product: payload.productName.slice(0, 160),
      author: payload.author.trim().slice(0, 80),
      city: 'Cliente Verificado',
      rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
      date: new Date().toLocaleDateString('pt-BR'),
      comment: payload.comment.trim().slice(0, 1000),
      userId: user.uid,
      status: 'pending',
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
  const path = `questions/${docId}`;
  try {
    await setDoc(doc(db, 'questions', docId), {
      productId,
      productName: productName.slice(0, 160),
      userId: user.uid,
      authorName: (user.displayName || user.email?.split('@')[0] || 'Cliente').slice(0, 80),
      question: question.trim().slice(0, 600),
      answer: '',
      date: new Date().toLocaleDateString('pt-BR'),
      answered: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function answerQuestionAdmin(docId: string, answer: string): Promise<void> {
  const path = `questions/${docId}`;
  try {
    await updateDoc(doc(db, 'questions', docId), {
      answer: answer.trim().slice(0, 1200),
      answered: true,
      date: `${new Date().toLocaleDateString('pt-BR')} • Brasil Tech Oficial`,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteQuestionAdmin(docId: string): Promise<void> {
  const path = `questions/${docId}`;
  try {
    await deleteDoc(doc(db, 'questions', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function moderateReviewAdmin(
  docId: string,
  status: ReviewStatus
): Promise<void> {
  const path = `reviews/${docId}`;
  try {
    await updateDoc(doc(db, 'reviews', docId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteReviewAdmin(docId: string): Promise<void> {
  const path = `reviews/${docId}`;
  try {
    await deleteDoc(doc(db, 'reviews', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteOrderAdmin(orderCode: string): Promise<void> {
  const path = `orders/${orderCode}`;
  try {
    await deleteDoc(doc(db, 'orders', orderCode));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deductOrderStockAdmin(
  items: OrderItem[],
  currentProducts: MarketplaceProduct[]
): Promise<number> {
  const path = 'products';
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
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
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
  const ref = doc(db, 'storeSettings', 'public');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_STORE_SETTINGS);
        return;
      }
      const d = snap.data();
      const rawName = String(d.storeName || DEFAULT_STORE_SETTINGS.storeName).trim();
      const normalizedStoreName =
        rawName.toLowerCase() === 'brasiltech' ? 'Brasil Tech' : rawName;
      onData({
        storeName: normalizedStoreName || DEFAULT_STORE_SETTINGS.storeName,
        cnpj: String(d.cnpj || DEFAULT_STORE_SETTINGS.cnpj),
        address: String(d.address || DEFAULT_STORE_SETTINGS.address),
        phone: String(d.phone || DEFAULT_STORE_SETTINGS.phone),
        whatsappDigits: String(d.whatsappDigits || DEFAULT_STORE_SETTINGS.whatsappDigits),
        email: String(d.email || DEFAULT_STORE_SETTINGS.email),
        expressShippingPrice: Number(
          d.expressShippingPrice ?? DEFAULT_STORE_SETTINGS.expressShippingPrice
        ),
        standardShippingPrice: Number(
          d.standardShippingPrice ?? DEFAULT_STORE_SETTINGS.standardShippingPrice
        ),
        pixDiscountPercent: Number(
          d.pixDiscountPercent ?? DEFAULT_STORE_SETTINGS.pixDiscountPercent
        ),
      });
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'storeSettings/public');
    }
  );
}

export async function saveStoreSettingsAdmin(settings: StoreSettings): Promise<void> {
  const path = 'storeSettings/public';
  try {
    await setDoc(doc(db, 'storeSettings', 'public'), {
      storeName: settings.storeName.trim().slice(0, 100),
      cnpj: settings.cnpj.trim().slice(0, 40),
      address: settings.address.trim().slice(0, 200),
      phone: settings.phone.trim().slice(0, 30),
      whatsappDigits: settings.whatsappDigits.replace(/\D/g, '').slice(0, 20),
      email: settings.email.trim().slice(0, 160),
      expressShippingPrice: Math.max(0, Number(settings.expressShippingPrice)),
      standardShippingPrice: Math.max(0, Number(settings.standardShippingPrice)),
      pixDiscountPercent: Math.min(50, Math.max(0, Number(settings.pixDiscountPercent))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
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
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
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
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'newsletter');
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
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'admins');
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
      ? `${window.location.origin}/#/rastreio/${tracking.code}`
      : `#/rastreio/${tracking.code}`;

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
  return raw.trim().toUpperCase();
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

export async function lookupTrackingByCode(
  rawCode: string
): Promise<{ tracking: PersistedTracking | null; rulesError?: boolean }> {
  const normalized = normalizeTrackingLookupInput(rawCode);
  if (!isValidTrackingCodeFormat(normalized)) {
    return { tracking: null };
  }
  const localMatch = readLocalTrackings()[normalized];
  try {
    const snap = await getDoc(doc(db, 'trackings', normalized));
    if (!snap.exists()) {
      if (localMatch && localMatch.active) {
        return { tracking: localMatch };
      }
      return { tracking: null };
    }
    const mapped = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
    if (!mapped.active || mapped.code !== normalized) {
      return { tracking: null };
    }
    return { tracking: mapped };
  } catch (err) {
    if (localMatch && localMatch.active) {
      return { tracking: localMatch };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
      return { tracking: null, rulesError: true };
    }
    return { tracking: null };
  }
}

export function subscribeLiveTrackingByCode(
  rawCode: string,
  onData: (tracking: PersistedTracking | null, rulesError?: boolean) => void
): () => void {
  const normalized = normalizeTrackingLookupInput(rawCode);
  if (!isValidTrackingCodeFormat(normalized)) {
    onData(null);
    return () => undefined;
  }

  let latestFirestore: PersistedTracking | null = null;
  let lastRulesError = false;

  const emitBest = () => {
    const localMatch = readLocalTrackings()[normalized];
    if (latestFirestore) {
      if (!latestFirestore.active) {
        onData(null, false);
        return;
      }
      onData(latestFirestore, false);
      return;
    }
    if (localMatch) {
      onData(localMatch.active ? localMatch : null, false);
      return;
    }
    onData(null, lastRulesError);
  };

  const unsubFirestore = onSnapshot(
    doc(db, 'trackings', normalized),
    (snap) => {
      lastRulesError = false;
      if (snap.exists()) {
        latestFirestore = mapTrackingDoc(snap.id, snap.data() as Record<string, unknown>);
      } else {
        latestFirestore = null;
      }
      emitBest();
    },
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      lastRulesError =
        msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient');
      emitBest();
    }
  );

  const handleLocalChange = () => emitBest();
  if (typeof window !== 'undefined') {
    window.addEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
      window.removeEventListener('storage', handleLocalChange);
    }
  };
}

export function subscribeTrackingsAdmin(
  onData: (items: PersistedTracking[]) => void,
  onPermissionError?: () => void
): () => void {
  let firestoreList: PersistedTracking[] = [];
  const privateCache: Record<
    string,
    { customerCpf?: string; customerPhone?: string; customerAddress?: string; customerCep?: string }
  > = {};

  const mergeAndEmit = () => {
    const localMap = readLocalTrackings();
    const mergedByCode = new Map<string, PersistedTracking>();
    firestoreList.forEach((item) => {
      const local = localMap[item.code];
      const priv = privateCache[item.code];
      mergedByCode.set(item.code, {
        ...item,
        customerCpf: priv?.customerCpf || local?.customerCpf || '',
        customerPhone: priv?.customerPhone || local?.customerPhone || '',
        customerAddress: priv?.customerAddress || local?.customerAddress || '',
        customerCep: priv?.customerCep || local?.customerCep || '',
      });
    });
    Object.values(localMap).forEach((localItem) => {
      if (!mergedByCode.has(localItem.code)) {
        mergedByCode.set(localItem.code, localItem);
      }
    });
    const sorted = Array.from(mergedByCode.values()).sort((a, b) =>
      b.updatedAtLabel.localeCompare(a.updatedAtLabel)
    );
    onData(sorted);
  };

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
        // Hydrate private PII details for NF-e, Etiqueta & WhatsApp dispatch
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
        onPermissionError?.();
        mergeAndEmit();
      }
    );
  } else {
    mergeAndEmit();
  }

  const handleLocalChange = () => mergeAndEmit();
  if (typeof window !== 'undefined') {
    window.addEventListener(TRACKING_UPDATED_EVENT, handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
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
  const resultTracking: PersistedTracking = {
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

  writeLocalTracking(resultTracking);

  // Persist to Firestore if signed in with a verified admin account
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (canWriteFirestore) {
    const path = `trackings/${cleanCode}`;
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
        updatedAtLabel: nowLabel,
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
          createdAtLabel: nowLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const prevData = existingSnap.data() as Record<string, unknown>;
        resultTracking.createdAtLabel = String(prevData.createdAtLabel || nowLabel);
        writeLocalTracking(resultTracking);
        batch.update(ref, {
          ...publicData,
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(privRef, privateData);
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  return resultTracking;
}

export async function deleteTrackingAdmin(code: string): Promise<void> {
  const cleanCode = sanitizeTrackingCodeForAdmin(code);
  deleteLocalTracking(cleanCode);
  const canWriteFirestore = isBootstrappedAdminUser(
    auth.currentUser?.email,
    auth.currentUser?.emailVerified
  );
  if (!canWriteFirestore) return;

  const path = `trackings/${cleanCode}`;
  try {
    await deleteDoc(doc(db, 'trackings', cleanCode, 'private', 'details')).catch(() => undefined);
    await deleteDoc(doc(db, 'trackings', cleanCode));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
