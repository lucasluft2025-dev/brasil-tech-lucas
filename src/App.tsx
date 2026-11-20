import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  ArrowRight,
  Award,
  Check,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Heart,
  Lock,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Truck,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_CARDS,
  CartEntry,
  MarketplaceOrder,
  MarketplaceProduct,
  OrderItem,
  PRODUCTS,
  STORE_REVIEWS,
  money,
} from './data/marketplaceCatalog';
import { getProductReviewTotalCount } from './data/productReviews';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutView, OrdersTrackingView } from './components/MarketplaceCheckout';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicOrdersShowcase } from './components/PublicOrdersShowcase';
import { ClientTrustBar } from './components/ClientTrustBar';
import { SeasonalSantaTrack } from './components/SeasonalSantaTrack';
import { FooterTrustSeals } from './components/FooterTrustSeals';
import { SecurityRefundPage } from './components/SecurityRefundPage';
import {
  PRIMARY_ADMIN_LOGIN_EMAIL,
  auth,
  createVerifiedAdminSessionToken,
  googleAuthProvider,
  isBootstrappedAdminUser,
  isValidAdminSessionToken,
  validateAdminPasswordLogin,
} from './lib/firebase';
import { applyStorefrontSeo } from './lib/seo';
import { detectVisitorRegion, VisitorRegion } from './services/regionLookup';
import {
  CostMap,
  DEFAULT_STORE_SETTINGS,
  PersistedCoupon,
  PersistedOrder,
  PersistedQuestion,
  PersistedReview,
  StoreSettings,
  checkIsUserAdmin,
  createOrderFirestore,
  createQuestionFirestore,
  createReviewFirestore,
  seedInitialCatalogIfEmpty,
  subscribeCoupons,
  subscribeOrders,
  subscribeProductCostsAdmin,
  subscribeProducts,
  subscribeQuestions,
  subscribeReviews,
  subscribeStoreSettings,
  subscribeNewsletterFirestore,
  subscribeUserReviews,
  syncUserProfile,
  updateUserSavedCep,
} from './services/firestoreStore';

type ViewMode = 'home' | 'product' | 'checkout' | 'orders' | 'showcase' | 'security' | 'admin';

const ADMIN_SESSION_STORAGE_KEY = 'bt_admin_session_v2';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseAdmin, setFirebaseAdmin] = useState<boolean>(false);
  const [sessionAdminVerified, setSessionAdminVerified] = useState<boolean>(() => {
    try {
      return isValidAdminSessionToken(sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminPassInput, setAdminPassInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [firebaseAdminNotice, setFirebaseAdminNotice] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [firestoreProducts, setFirestoreProducts] = useState<MarketplaceProduct[]>([]);
  const [costMap, setCostMap] = useState<CostMap>({});
  const [coupons, setCoupons] = useState<PersistedCoupon[]>([]);
  const [persistedReviews, setPersistedReviews] = useState<PersistedReview[]>([]);
  const [userOwnReviews, setUserOwnReviews] = useState<PersistedReview[]>([]);
  const [persistedQuestions, setPersistedQuestions] = useState<PersistedQuestion[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<PersistedOrder[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [cart, setCart] = useState<CartEntry[]>(() => {
    try {
      const saved = localStorage.getItem('bt_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('bt_favs_v1');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [localOrders, setLocalOrders] = useState<MarketplaceOrder[]>(() => {
    try {
      const saved = localStorage.getItem('bt_orders_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [userCep, setUserCep] = useState<string>(() => localStorage.getItem('bt_cep_v1') || '');
  const [newsletterEmails, setNewsletterEmails] = useState<string[]>([]);

  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set());
  const [activeCat, setActiveCat] = useState<string>('Todos');
  const [onlyStock, setOnlyStock] = useState<boolean>(false);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortMode, setSortMode] = useState<string>('featured');
  const [priceMode, setPriceMode] = useState<string>('all');

  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showcaseOrderCode, setShowcaseOrderCode] = useState<string | null>(null);
  const [initialTrackingCode, setInitialTrackingCode] = useState<string | undefined>(undefined);
  const [directCheckoutEntry, setDirectCheckoutEntry] = useState<CartEntry | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<'express' | 'standard'>('standard');
  const [visitorRegion, setVisitorRegion] = useState<VisitorRegion | null>(null);

  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [cepModalOpen, setCepModalOpen] = useState<boolean>(false);
  const [cepDraft, setCepDraft] = useState<string>(userCep);

  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const [offerTab, setOfferTab] = useState<'featured' | 'discounts' | 'gifts' | 'flagships'>('featured');
  const [savedCoupon, setSavedCoupon] = useState<string>(() => {
    try {
      return localStorage.getItem('bt_saved_coupon_v1') || '';
    } catch {
      return '';
    }
  });
  const [countdown, setCountdown] = useState<{ d: string; h: string; m: string; s: string }>({
    d: '02',
    h: '14',
    m: '38',
    s: '45',
  });

  const catalogProducts = firestoreProducts.length > 0 ? firestoreProducts : PRODUCTS;
  const userName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    (sessionAdminVerified ? 'Administrador' : '');
  const orders: MarketplaceOrder[] = currentUser ? firestoreOrders : localOrders;
  const isBootstrappedAdmin = isBootstrappedAdminUser(
    currentUser?.email,
    currentUser?.emailVerified
  );
  const isAdmin = firebaseAdmin || sessionAdminVerified;

  useEffect(() => {
    try {
      localStorage.setItem('bt_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('bt_favs_v1', JSON.stringify([...favorites]));
    } catch {
      // ignore storage errors
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('bt_orders_v1', JSON.stringify(localOrders));
    } catch {
      // ignore storage errors
    }
  }, [localOrders]);

  // Firebase Auth listener + profile sync + auto-seed for admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setFirebaseAdmin(false);
        setFirestoreOrders([]);
        setUserOwnReviews([]);
        setCostMap({});
        return;
      }

      const adminStatus = await checkIsUserAdmin(user);
      setFirebaseAdmin(adminStatus);
      if (adminStatus) {
        setFirebaseAdminNotice(null);
      }

      try {
        const profile = await syncUserProfile(user, userCep || undefined);
        if (profile.cep && !userCep) {
          setUserCep(profile.cep);
          setCepDraft(profile.cep);
        }
      } catch {
        // handled by ErrorBoundary if rules fail
      }

      if (adminStatus) {
        await seedInitialCatalogIfEmpty().catch(() => undefined);
      }
    });
    return () => unsub();
  }, []);

  // Public Firestore real-time catalog, questions & store settings
  useEffect(() => {
    const unsubProd = subscribeProducts(setFirestoreProducts);
    const unsubQa = subscribeQuestions(setPersistedQuestions);
    const unsubSettings = subscribeStoreSettings(setStoreSettings);
    return () => {
      unsubProd();
      unsubQa();
      unsubSettings();
    };
  }, []);

  // Reviews listener (admin receives pending/approved/rejected; storefront receives approved only)
  useEffect(() => {
    const unsubRev = subscribeReviews(isBootstrappedAdmin, setPersistedReviews);
    return () => unsubRev();
  }, [isBootstrappedAdmin]);

  // Coupons listener (admin sees paused coupons too)
  useEffect(() => {
    const unsubCoupons = subscribeCoupons(firebaseAdmin, setCoupons);
    return () => unsubCoupons();
  }, [firebaseAdmin]);

  // Authenticated Orders, User's Own Reviews & Admin Costs listeners
  useEffect(() => {
    if (!currentUser) return;
    const unsubOrders = subscribeOrders(currentUser.uid, firebaseAdmin, setFirestoreOrders);
    const unsubUserReviews = subscribeUserReviews(currentUser.uid, setUserOwnReviews);
    const unsubCosts = firebaseAdmin ? subscribeProductCostsAdmin(setCostMap) : () => undefined;
    return () => {
      unsubOrders();
      unsubUserReviews();
      unsubCosts();
    };
  }, [currentUser, firebaseAdmin]);

  // IP-based visitor region detection (stores only regional store proximity notice)
  useEffect(() => {
    let active = true;
    detectVisitorRegion()
      .then((region) => {
        if (active && region) setVisitorRegion(region);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Hash URL sync for Back/Forward navigation
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash;
      if (h.startsWith('#/produto/')) {
        const id = Number(h.replace('#/produto/', ''));
        if (id > 0) {
          setSelectedProductId(id);
          setViewMode('product');
        }
      } else if (h === '#/checkout') {
        setViewMode('checkout');
      } else if (h === '#/pedidos') {
        setInitialTrackingCode(undefined);
        setViewMode('orders');
      } else if (h.startsWith('#/rastreio/')) {
        const code = decodeURIComponent(h.replace('#/rastreio/', '').trim()).toUpperCase();
        setInitialTrackingCode(code || undefined);
        setViewMode('orders');
      } else if (h === '#/garantia' || h === '#/reembolso') {
        setViewMode('security');
      } else if (h === '#/entregas' || h.startsWith('#/entregas/')) {
        const code = h.startsWith('#/entregas/')
          ? decodeURIComponent(h.replace('#/entregas/', '').trim())
          : '';
        setShowcaseOrderCode(code || null);
        setViewMode('showcase');
      } else if (h === '#/admin') {
        setViewMode('admin');
      } else if (h === '' || h === '#/' || h === '#') {
        setViewMode('home');
        setSelectedProductId(null);
        setShowcaseOrderCode(null);
        setInitialTrackingCode(undefined);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Storefront / Category / Route dynamic SEO & Organization JSON-LD
  useEffect(() => {
    const prodExists =
      selectedProductId !== null && catalogProducts.some((p) => p.id === selectedProductId);
    if (viewMode === 'product' && prodExists) return;
    applyStorefrontSeo({
      storeSettings,
      activeCat,
      viewMode: viewMode === 'product' || viewMode === 'showcase' ? 'home' : viewMode,
    });
  }, [viewMode, activeCat, storeSettings, selectedProductId, catalogProducts]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2300);
  };

  useEffect(() => {
    const computeCountdown = () => {
      const now = new Date();
      // Rolling 72-hour seasonal campaign window aligned to midnight UTC-3
      const cycleMs = 72 * 60 * 60 * 1000;
      const remaining = cycleMs - (now.getTime() % cycleMs);
      const totalSec = Math.max(0, Math.floor(remaining / 1000));
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      setCountdown({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    computeCountdown();
    const timer = window.setInterval(computeCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activateSeasonalCoupon = (code: string, desc: string) => {
    const cleanCode = code.trim().toUpperCase();
    setSavedCoupon(cleanCode);
    try {
      localStorage.setItem('bt_saved_coupon_v1', cleanCode);
    } catch {
      // ignore storage errors
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanCode).catch(() => undefined);
    }
    showToast(`Cupom ${cleanCode} (${desc}) ativado para o checkout!`);
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      setLoginOpen(false);
      showToast(`Bem-vindo(a), ${cred.user.displayName || 'Cliente'}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        showToast('Não foi possível concluir o login Google. Tente novamente.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminPasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (!validateAdminPasswordLogin(adminEmailInput, adminPassInput)) {
      setAdminAuthError('E-mail ou senha de administrador incorretos.');
      return;
    }

    setAuthLoading(true);
    try {
      const cleanEmail = PRIMARY_ADMIN_LOGIN_EMAIL;
      const verifiedToken = createVerifiedAdminSessionToken(cleanEmail, adminPassInput);
      if (!verifiedToken) {
        setAdminAuthError('Credenciais administrativas inválidas.');
        return;
      }
      setSessionAdminVerified(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, verifiedToken);
      } catch {
        // ignore storage quota
      }

      // Attempt real Firebase Email/Password auth alongside session unlock
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, adminPassInput);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user).catch(() => undefined);
          setFirebaseAdminNotice(
            'Sua conta Firebase ainda precisa confirmar o link enviado ao seu e-mail administrativo para sincronizar o catálogo global. O módulo de rastreios, mapa ao vivo, Nota Fiscal e Etiqueta já está 100% liberado nesta sessão.'
          );
        } else {
          setFirebaseAdminNotice(null);
        }
      } catch (fbErr: unknown) {
        const fbCode = (fbErr as { code?: string })?.code || '';
        if (fbCode === 'auth/user-not-found' || fbCode === 'auth/invalid-credential') {
          try {
            const created = await createUserWithEmailAndPassword(auth, cleanEmail, adminPassInput);
            await sendEmailVerification(created.user).catch(() => undefined);
            setFirebaseAdminNotice(
              'Conta criada no Firebase! Verifique o e-mail enviado para liberar escrita global no Firestore. Rastreio ao vivo, NF-e e Etiqueta já funcionam imediatamente.'
            );
          } catch (createErr: unknown) {
            const createCode = (createErr as { code?: string })?.code || '';
            if (createCode === 'auth/operation-not-allowed') {
              setFirebaseAdminNotice(
                'Ative o provedor E-mail/Senha no Console do Firebase (Authentication → Sign-in method) para sincronizar o banco em nuvem. Rastreios, mapa em tempo real, NF-e e Etiqueta já estão operacionais nesta sessão.'
              );
            }
          }
        } else if (fbCode === 'auth/operation-not-allowed') {
          setFirebaseAdminNotice(
            'Ative o provedor E-mail/Senha no Console do Firebase (Authentication → Sign-in method) para sincronizar o banco em nuvem. Rastreios, mapa em tempo real, NF-e e Etiqueta já estão operacionais nesta sessão.'
          );
        }
      }

      setLoginOpen(false);
      setAdminPassInput('');
      navigateView('admin');
      showToast('Painel Administrativo desbloqueado!');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendAdminVerification = async () => {
    if (!auth.currentUser) {
      showToast('Ative E-mail/Senha no Console Firebase e faça login novamente.');
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser);
      showToast(`E-mail de verificação enviado para ${auth.currentUser.email}!`);
    } catch {
      showToast('Aguarde alguns instantes antes de reenviar o e-mail de verificação.');
    }
  };

  const handleSignOut = async () => {
    setSessionAdminVerified(false);
    setFirebaseAdminNotice(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    await signOut(auth).catch(() => undefined);
    setLoginOpen(false);
    if (viewMode === 'admin') {
      setViewMode('home');
      window.location.hash = '#/';
    }
    showToast('Você saiu da sua conta.');
  };

  const updateCep = (cep: string) => {
    setUserCep(cep);
    setCepDraft(cep);
    try {
      localStorage.setItem('bt_cep_v1', cep);
    } catch {
      // ignore
    }
    if (currentUser) {
      updateUserSavedCep(currentUser.uid, cep).catch(() => undefined);
    }
  };

  const openProduct = (id: number) => {
    setSelectedProductId(id);
    setViewMode('product');
    window.location.hash = `#/produto/${id}`;
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateView = (mode: ViewMode) => {
    setMobileMenuOpen(false);
    setViewMode(mode);
    if (mode === 'checkout') window.location.hash = '#/checkout';
    if (mode === 'orders') {
      setInitialTrackingCode(undefined);
      window.location.hash = '#/pedidos';
    }
    if (mode === 'showcase') {
      setShowcaseOrderCode(null);
      window.location.hash = '#/entregas';
    }
    if (mode === 'security') window.location.hash = '#/garantia';
    if (mode === 'admin') window.location.hash = '#/admin';
    if (mode === 'home') window.location.hash = '#/';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTrackingCode = (trackingCode: string) => {
    const clean = trackingCode.trim().toUpperCase();
    if (!clean) {
      navigateView('orders');
      return;
    }
    setMobileMenuOpen(false);
    setInitialTrackingCode(clean);
    setViewMode('orders');
    window.location.hash = `#/rastreio/${encodeURIComponent(clean)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openShowcaseOrder = (orderCode: string) => {
    const clean = orderCode.trim();
    if (!clean) {
      navigateView('showcase');
      return;
    }
    setMobileMenuOpen(false);
    setShowcaseOrderCode(clean);
    setViewMode('showcase');
    window.location.hash = `#/entregas/${encodeURIComponent(clean)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = (scrollTargetId?: string) => {
    setMobileMenuOpen(false);
    setViewMode('home');
    setSelectedProductId(null);
    setShowcaseOrderCode(null);
    setDirectCheckoutEntry(null);
    if (window.location.hash.startsWith('#/')) {
      window.location.hash = '#/';
    }
    if (scrollTargetId) {
      window.setTimeout(() => {
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth' });
      }, 45);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const addCart = (id: number, qtyToAdd = 1, openDrawer = true) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === id);
      if (existing) {
        return prev.map((x) => (x.id === id ? { ...x, qty: x.qty + qtyToAdd } : x));
      }
      return [...prev, { id, qty: qtyToAdd }];
    });
    if (openDrawer) setCartOpen(true);
    showToast('Produto adicionado à sacola!');
  };

  const buyNow = (id: number, qtyToAdd = 1) => {
    setDirectCheckoutEntry({ id, qty: Math.max(1, qtyToAdd) });
    setCartOpen(false);
    navigateView('checkout');
  };

  const toggleFav = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removido dos favoritos');
      } else {
        next.add(id);
        showToast('Salvo nos seus favoritos');
      }
      return next;
    });
  };

  const changeQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: x.qty + delta } : x))
        .filter((x) => x.qty >= 1)
    );
  };

  const removeCart = (id: number) => {
    setCart((prev) => prev.filter((x) => x.id !== id));
  };

  const setCat = (cat: string) => {
    setOnlyFavorites(false);
    setActiveCat(cat);
    goHome('catalogo');
  };

  const clearFilters = () => {
    setActiveCat('Todos');
    setOnlyStock(false);
    setOnlyFavorites(false);
    setSearchInput('');
    setSearchTerm('');
    setPriceMode('all');
    setSortMode('featured');
    setViewMode('home');
  };

  const handleImageError = (id: number) => {
    setFailedImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filteredProducts = (() => {
    let list = catalogProducts.filter(
      (p) =>
        (activeCat === 'Todos' || p.cat === activeCat) &&
        (!onlyStock || p.stock > 0) &&
        (!onlyFavorites || favorites.has(p.id)) &&
        `${p.name} ${p.cat} ${p.desc}`.toLowerCase().includes(searchTerm)
    );
    if (priceMode === 'low') list = list.filter((p) => p.price <= 500);
    if (priceMode === 'mid') list = list.filter((p) => p.price > 500 && p.price <= 1500);
    if (priceMode === 'high') list = list.filter((p) => p.price > 1500);
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'price') list = [...list].sort((a, b) => a.price - b.price);
    if (sortMode === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  })();

  const featuredProducts = (() => {
    if (offerTab === 'discounts') {
      return [...catalogProducts]
        .filter((p) => p.old > p.price)
        .sort((a, b) => (1 - b.price / b.old) - (1 - a.price / a.old))
        .slice(0, 4);
    }
    if (offerTab === 'gifts') {
      return [...catalogProducts]
        .filter((p) => p.price <= 600)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 4);
    }
    if (offerTab === 'flagships') {
      return [...catalogProducts]
        .filter((p) => p.price >= 1400)
        .sort((a, b) => b.price - a.price)
        .slice(0, 4);
    }
    return catalogProducts.filter((p) => p.featured).slice(0, 4);
  })();
  const cartCount = cart.reduce((n, x) => n + x.qty, 0);
  const cartTotal = cart.reduce((sum, x) => {
    const product = catalogProducts.find((p) => p.id === x.id);
    return sum + (product ? product.price * x.qty : 0);
  }, 0);

  const selectedProduct =
    selectedProductId !== null
      ? catalogProducts.find((p) => p.id === selectedProductId) ?? null
      : null;

  const waHref = `https://wa.me/${storeSettings.whatsappDigits}?text=Ol%C3%A1%2C%20estou%20na%20${encodeURIComponent(storeSettings.storeName)}%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida!`;

  const renderProductCard = (p: MarketplaceProduct) => {
    const hasDiscount = p.old > p.price;
    const discount = hasDiscount ? Math.round((1 - p.price / p.old) * 100) : 0;
    const isFav = favorites.has(p.id);
    const showImage = Boolean(p.image) && !failedImages.has(p.id);

    return (
      <article
        className="product product-clickable"
        key={p.id}
        onClick={() => openProduct(p.id)}
      >
        <div className="product-img">
          {showImage ? (
            <img
              src={p.image}
              alt={p.name}
              referrerPolicy="no-referrer"
              onError={() => handleImageError(p.id)}
            />
          ) : (
            <span className="fallback">{p.emoji}</span>
          )}
          {hasDiscount && <span className="discount">-{discount}% BLACK</span>}
          <button
            type="button"
            className={`heart ${isFav ? 'on' : ''}`}
            aria-label="Favoritar"
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(p.id);
            }}
          >
            {isFav ? '♥' : '♡'}
          </button>
        </div>
        <div className="product-body">
          <div className="seller">{storeSettings.storeName} • BLACK &amp; NATAL</div>
          <h3>{p.name}</h3>
          <div className="rating">
            ★ {p.rating}{' '}
            <span>
              (
              {getProductReviewTotalCount(
                p,
                persistedReviews.filter((r) => r.productId === p.id && r.status === 'approved').length
              )}
              <span className="rating-word"> avaliações</span>)
            </span>
          </div>
          <div className="product-price-box">
            {hasDiscount && <div className="price-old">{money(p.old)}</div>}
            <div className="price">{money(p.price)}</div>
            <div className="pix-line">⚡ À vista no PIX • Reembolso 7 dias</div>
          </div>
          <div className="shipping">
            ✓ {userCep ? `Entrega p/ Natal em ${userCep}` : 'Envio garantido p/ o Natal'}
          </div>
          <div className="product-card-actions">
            <button
              type="button"
              className="buy"
              onClick={(e) => {
                e.stopPropagation();
                buyNow(p.id, 1);
              }}
            >
              Comprar agora
            </button>
            <button
              type="button"
              className="buy-bag"
              aria-label={`Adicionar ${p.name} à sacola`}
              title="Adicionar à sacola"
              onClick={(e) => {
                e.stopPropagation();
                addCart(p.id);
              }}
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
      <div className="top top-seasonal">
        <div className="container">
          <span className="top-guarantee">
            <Sparkles size={14} strokeWidth={2.4} />
            <span>
              Black Friday &amp; Natal {storeSettings.storeName}: ofertas especiais com{' '}
              <strong>Garantia &amp; Reembolso 7 dias</strong>
            </span>
          </span>
          <span className="top-shipping-desktop">
            🎁 Entrega Expressa hoje ({money(storeSettings.expressShippingPrice)}) com garantia para o
            Natal
          </span>
          <a
            href="#rastreio"
            onClick={(e) => {
              e.preventDefault();
              navigateView('orders');
            }}
          >
            Meus pedidos e rastreio
          </a>
        </div>
      </div>

      <header className="header">
        <div className="container head-main">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <a
            className="brand"
            href="#"
            aria-label={storeSettings.storeName}
            onClick={(e) => {
              e.preventDefault();
              goHome();
            }}
          >
            <img
              src="/src/assets/ref/logo.png"
              alt={storeSettings.storeName}
              referrerPolicy="no-referrer"
              className="brand-mark-img"
            />
            <span className="brand-wordmark">
              <strong>Brasil</strong>
              <em> Tech</em>
            </span>
          </a>

          <button
            type="button"
            className="location"
            onClick={() => setCepModalOpen(true)}
          >
            <MapPin size={15} className="loc-pin" />
            <span>
              Enviar para <b>{userCep ? `CEP ${userCep}` : 'Informe seu CEP'}</b>
            </span>
          </button>

          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(searchInput.toLowerCase().trim());
              goHome('catalogo');
            }}
          >
            <input
              id="search"
              placeholder="Buscar PlayStation, Xbox, iPhone, PC Gamer..."
              aria-label="Buscar"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchTerm(e.target.value.toLowerCase().trim());
                if (viewMode !== 'home') setViewMode('home');
              }}
            />
            <button id="searchBtn" type="submit" aria-label="Buscar produtos">
              <Search size={17} strokeWidth={2.5} />
              <span className="search-btn-label">Buscar</span>
            </button>
          </form>

          <button
            type="button"
            className="head-action head-action-account"
            id="loginBtn"
            onClick={() => setLoginOpen(true)}
          >
            <span className="symbol">
              <UserIcon size={19} strokeWidth={2} />
            </span>
            <span>
              <small>{userName ? `Olá, ${userName.split(' ')[0]}` : 'Olá, visitante'}</small>
              <b>{userName ? 'Minha conta' : 'Entre ou cadastre-se'}</b>
            </span>
          </button>

          <button
            type="button"
            className="head-action head-action-desktop-only"
            id="ordersBtn"
            onClick={() => navigateView('orders')}
          >
            <span className="symbol">
              <Package size={19} strokeWidth={2} />
            </span>
            <span>
              <small>Acompanhar</small>
              <b>Pedidos ({orders.length})</b>
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="head-action admin-pill"
              id="adminBtn"
              onClick={() => navigateView('admin')}
            >
              <span className="symbol">
                <ShieldCheck size={18} strokeWidth={2.2} />
              </span>
              <span>
                <small>Gestão</small>
                <b>Painel Admin</b>
              </span>
            </button>
          )}

          <button
            type="button"
            className="head-action head-action-desktop-only"
            id="wishBtn"
            onClick={() => {
              const ids = [...favorites];
              if (!ids.length) {
                showToast('Clique no ♥ de qualquer produto para salvar nos favoritos.');
                return;
              }
              setActiveCat('Todos');
              setOnlyFavorites((prev) => !prev);
              setSearchInput('');
              setSearchTerm('');
              goHome('catalogo');
              showToast(`${ids.length} produto(s) salvo(s) nos favoritos`);
            }}
          >
            <span className="symbol">
              <Heart size={19} strokeWidth={2} />
            </span>
            <span>
              <small>Seus</small>
              <b>Favoritos ({favorites.size})</b>
            </span>
          </button>

          <button
            type="button"
            className="head-action head-action-bag"
            id="cartBtn"
            onClick={() => setCartOpen(true)}
          >
            <span className="symbol">
              <ShoppingBag size={19} strokeWidth={2} />
            </span>
            <span>
              <small>Sua</small>
              <b>Sacola</b>
            </span>
            <span className="cart-count" id="cartCount">
              {cartCount}
            </span>
          </button>
        </div>

        <div className="navline">
          <div className="container">
            <a
              className="all"
              href="#categorias"
              onClick={(e) => {
                e.preventDefault();
                setOnlyFavorites(false);
                setActiveCat('Todos');
                goHome('categorias');
              }}
            >
              <Menu size={14} /> Todas as categorias
            </a>
            <a
              className="navline-seasonal"
              href="#ofertas"
              onClick={(e) => {
                e.preventDefault();
                goHome('ofertas');
              }}
            >
              <Gift size={13} strokeWidth={2.3} /> Black Friday &amp; Natal
            </a>
            {CATEGORIES.map((cat) => (
              <a
                key={cat}
                href="#catalogo"
                onClick={(e) => {
                  e.preventDefault();
                  setCat(cat);
                }}
              >
                {cat}
              </a>
            ))}
            <a
              href="#avaliacoes"
              onClick={(e) => {
                e.preventDefault();
                goHome('avaliacoes');
              }}
            >
              Avaliações verificadas
            </a>
            <a
              href="#/entregas"
              onClick={(e) => {
                e.preventDefault();
                navigateView('showcase');
              }}
            >
              Pedidos e Entregues (320+)
            </a>
            <a
              href="#/garantia"
              onClick={(e) => {
                e.preventDefault();
                navigateView('security');
              }}
            >
              Garantia e Reembolso
            </a>
            <a
              href="#rastreio"
              onClick={(e) => {
                e.preventDefault();
                navigateView('orders');
              }}
            >
              Rastrear pedido
            </a>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <div className="container">
              <div className="mobile-nav-quick">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCepModalOpen(true);
                  }}
                >
                  <MapPin size={15} />
                  <span>{userCep ? `CEP ${userCep} (Alterar)` : 'Informar CEP de entrega'}</span>
                </button>
                <button type="button" onClick={() => navigateView('orders')}>
                  <Package size={15} />
                  <span>Meus pedidos e rastreio ({orders.length})</span>
                </button>
                <button type="button" onClick={() => navigateView('security')}>
                  <ShieldCheck size={15} />
                  <span>Garantia e Reembolso 7 dias</span>
                </button>
                <button type="button" onClick={() => navigateView('showcase')}>
                  <Check size={15} />
                  <span>Pedidos e Entregues (320+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const ids = [...favorites];
                    if (!ids.length) {
                      showToast('Clique no ♥ de qualquer produto para salvar nos favoritos.');
                      return;
                    }
                    setActiveCat('Todos');
                    setOnlyFavorites(true);
                    goHome('catalogo');
                  }}
                >
                  <Heart size={15} />
                  <span>Favoritos ({favorites.size})</span>
                </button>
                <button type="button" onClick={() => goHome('ofertas')}>
                  <Zap size={15} />
                  <span>Ofertas em destaque</span>
                </button>
                <button type="button" onClick={() => goHome('avaliacoes')}>
                  <Award size={15} />
                  <span>Avaliações verificadas</span>
                </button>
                {isAdmin && (
                  <button type="button" className="mobile-nav-admin" onClick={() => navigateView('admin')}>
                    <ShieldCheck size={15} />
                    <span>Painel Administrativo</span>
                  </button>
                )}
              </div>
              <div className="mobile-nav-cats-title">Categorias</div>
              <div className="mobile-nav-cats">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCat(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="container">
        {viewMode === 'admin' ? (
          isAdmin ? (
            <AdminDashboard
              products={catalogProducts}
              hasFirestoreProducts={firestoreProducts.length > 0}
              costMap={costMap}
              orders={firestoreOrders}
              coupons={coupons}
              questions={persistedQuestions}
              reviews={persistedReviews}
              storeSettings={storeSettings}
              adminEmail={currentUser?.email || (sessionAdminVerified ? PRIMARY_ADMIN_LOGIN_EMAIL : '')}
              isBootstrappedAdmin={isBootstrappedAdmin}
              firebaseAuthNotice={firebaseAdminNotice}
              onResendVerificationEmail={handleResendAdminVerification}
              onAdminLogout={handleSignOut}
              onBackToStore={() => goHome()}
              onOpenOrdersShowcase={() => navigateView('showcase')}
              onNotify={showToast}
            />
          ) : (
            <div className="checkout-card admin-login-gate">
              <h2>🔒 Acesso Exclusivo do Proprietário</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Esta área é restrita exclusivamente ao proprietário da{' '}
                <strong>{storeSettings.storeName}</strong>. Entre com suas credenciais
                administrativas exclusivas para gerenciar pedidos, rastreios, NF-e e etiquetas.
              </p>

              {currentUser && !firebaseAdmin && (
                <div className="admin-auth-error" style={{ marginBottom: 14, textAlign: 'left' }}>
                  <strong>Acesso bloqueado para esta conta:</strong>{' '}
                  {currentUser.email || 'Conta sem e-mail autorizado'} não tem permissão
                  administrativa na {storeSettings.storeName}.
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={handleSignOut}
                    >
                      Sair desta conta para entrar como administrador
                    </button>
                  </div>
                </div>
              )}

              <form className="admin-login-form" onSubmit={handleAdminPasswordLogin}>
                <label>
                  E-mail administrativo
                  <input
                    type="email"
                    placeholder="E-mail exclusivo do administrador"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Senha
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    required
                  />
                </label>
                {adminAuthError && <div className="admin-auth-error">{adminAuthError}</div>}
                <button type="submit" className="primary" disabled={authLoading}>
                  <Lock size={15} /> {authLoading ? 'Validando...' : 'Entrar no Painel Admin'}
                </button>
              </form>

              <div className="admin-login-divider">
                <span>ou</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="pdp-back" onClick={handleGoogleSignIn}>
                  Entrar com Google autorizado
                </button>
                <button type="button" className="pdp-back" onClick={() => goHome()}>
                  Voltar à loja
                </button>
              </div>
            </div>
          )
        ) : viewMode === 'security' ? (
          <SecurityRefundPage
            storeSettings={storeSettings}
            onBackToStore={() => goHome()}
            onGoToTracking={() => navigateView('orders')}
          />
        ) : viewMode === 'product' && selectedProduct ? (
          <ProductDetailPage
            key={selectedProduct.id}
            product={selectedProduct}
            allProducts={catalogProducts}
            favorites={favorites}
            failedImages={failedImages}
            userCep={userCep}
            selectedShipping={selectedShipping}
            currentUser={currentUser}
            persistedReviews={persistedReviews.filter((r) => r.status === 'approved')}
            userOwnReviews={userOwnReviews}
            persistedQuestions={persistedQuestions}
            storeSettings={storeSettings}
            onChangeShipping={setSelectedShipping}
            onUpdateCep={updateCep}
            onBack={() => goHome()}
            onSelectCategory={setCat}
            onOpenProduct={openProduct}
            onToggleFav={toggleFav}
            onAddCart={(id, qty, openDrawer) => addCart(id, qty, openDrawer)}
            onBuyNow={buyNow}
            onImageError={handleImageError}
            onNotify={showToast}
            onRequireLogin={() => setLoginOpen(true)}
            onOpenSecurityPage={() => navigateView('security')}
            onSubmitQuestion={async (product, question) => {
              if (!currentUser) return;
              await createQuestionFirestore(currentUser, product.id, product.name, question);
            }}
            onSubmitReview={async (product, payload) => {
              if (!currentUser) return;
              await createReviewFirestore(currentUser, {
                productId: product.id,
                productName: product.name,
                author: payload.author,
                rating: payload.rating,
                comment: payload.comment,
              });
            }}
            renderProductCard={renderProductCard}
          />
        ) : viewMode === 'checkout' ? (
          <CheckoutView
            cart={directCheckoutEntry ? [directCheckoutEntry] : cart}
            products={catalogProducts}
            coupons={coupons}
            userCep={userCep}
            userName={userName}
            currentUser={currentUser}
            visitorRegion={visitorRegion}
            storeSettings={storeSettings}
            selectedShipping={selectedShipping}
            onChangeShipping={setSelectedShipping}
            onChangeItemQty={(productId, delta) => {
              if (directCheckoutEntry && directCheckoutEntry.id === productId) {
                setDirectCheckoutEntry({
                  ...directCheckoutEntry,
                  qty: Math.max(1, directCheckoutEntry.qty + delta),
                });
              } else {
                changeQty(productId, delta);
              }
            }}
            onUpdateCep={updateCep}
            onRecordDirectCheckout={(order, items: OrderItem[], couponCode: string) => {
              if (currentUser) {
                createOrderFirestore(currentUser, order, items, couponCode).catch(() => undefined);
              } else {
                setLocalOrders((prev) => [order, ...prev]);
              }
            }}
            onRequireLogin={() => setLoginOpen(true)}
            onOpenSecurityPage={() => navigateView('security')}
            onBack={() => goHome()}
            onGoOrders={() => navigateView('orders')}
            onNotify={showToast}
          />
        ) : viewMode === 'orders' ? (
          <OrdersTrackingView
            orders={orders}
            storeSettings={storeSettings}
            initialTrackingCode={initialTrackingCode}
            onBack={() => goHome()}
            onGoShowcase={() => navigateView('showcase')}
            onNotify={showToast}
          />
        ) : viewMode === 'showcase' ? (
          <PublicOrdersShowcase
            products={catalogProducts}
            liveOrders={orders}
            initialOrderCode={showcaseOrderCode}
            isAdmin={isAdmin}
            onBack={() => goHome()}
            onOpenProduct={openProduct}
            onGoTracking={() => navigateView('orders')}
            onTrackCode={openTrackingCode}
            onNotify={showToast}
          />
        ) : (
          <>
            <button
              type="button"
              className="mobile-cep-bar"
              onClick={() => setCepModalOpen(true)}
            >
              <span>
                <MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />
                {userCep ? `Entregar em CEP ${userCep}` : 'Informe seu CEP para calcular prazo'}
              </span>
              <strong>{userCep ? 'Alterar' : 'Informar CEP'}</strong>
            </button>

            <div className="regional-store-strip" role="status" aria-live="polite">
              <MapPin size={15} />
              <span>
                {visitorRegion && (visitorRegion.city || visitorRegion.uf) ? (
                  <>
                    Região localizada ({[visitorRegion.city, visitorRegion.uf].filter(Boolean).join(' - ')}):{' '}
                    <strong>
                      Temos uma loja {storeSettings.storeName} na sua região próxima a você.
                    </strong>
                  </>
                ) : (
                  <strong>
                    Temos uma loja {storeSettings.storeName} na sua região próxima a você.
                  </strong>
                )}
              </span>
            </div>

            <section className="hero">
              <SeasonalSantaTrack
                couponActive={savedCoupon === 'NATAL50'}
                onActivateGift={() => activateSeasonalCoupon('NATAL50', 'R$ 50 OFF de Natal')}
              />

              <div className="hero-main hero-seasonal">
                <img
                  src="/src/assets/ref/hero.jpg"
                  alt="Black Friday e Natal Brasil Tech: Consoles PlayStation, Xbox, PC Gamer e iPhones"
                  referrerPolicy="no-referrer"
                  className="hero-bg-img"
                />
                <div className="hero-scrim" aria-hidden="true" />
                <div className="hero-festive-glow" aria-hidden="true" />
                <div className="hero-snow-layer" aria-hidden="true">
                  <span className="flake f1" />
                  <span className="flake f2" />
                  <span className="flake f3" />
                  <span className="flake f4" />
                  <span className="flake f5" />
                  <span className="flake f6" />
                  <span className="flake f7" />
                  <span className="flake f8" />
                </div>
                <div className="hero-copy">
                  <div className="hero-kicker-row">
                    <span className="hero-kicker hero-kicker-crimson">
                      <Snowflake size={12} strokeWidth={2.4} /> Black Friday &amp; Natal
                    </span>
                    <span className="hero-editorial-tag">Edição Limitada de Fim de Ano</span>
                  </div>
                  <h1>
                    Presentes de elite.
                    <br />
                    Preços de <em>Black Friday</em>.
                  </h1>
                  <p>
                    Consoles PlayStation, Xbox, Nintendo, PC Gamer e iPhones revisados com até{' '}
                    <strong>12 meses de garantia</strong>, reembolso garantido em 7 dias e entrega
                    expressa para o Natal.
                  </p>
                  <div className="hero-cta-row">
                    <a
                      className="btn-yellow"
                      href="#ofertas"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('ofertas')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Explorar ofertas Black &amp; Natal <ArrowRight size={16} strokeWidth={2.4} />
                    </a>
                    <button
                      type="button"
                      className="btn-hero-outline"
                      onClick={() => navigateView('security')}
                    >
                      <ShieldCheck size={15} /> Reembolso 7 dias &amp; Garantia
                    </button>
                  </div>
                  <div className="hero-trust-inline">
                    <span>
                      <ShieldCheck size={14} /> Reembolso garantido em 7 dias
                    </span>
                    <span>
                      <Truck size={14} /> Entrega garantida p/ Natal
                    </span>
                    <span>
                      <CreditCard size={14} /> PIX com aprovação imediata
                    </span>
                  </div>
                </div>

                <aside className="hero-season-panel" aria-label="Ofertas e segurança Black Friday e Natal">
                  <div className="hero-season-top">
                    <span className="hero-season-badge">
                      <Clock size={13} strokeWidth={2.4} /> Ciclo Black &amp; Natal
                    </span>
                    <div className="hero-countdown" aria-label="Tempo restante do ciclo promocional">
                      <div>
                        <b>{countdown.d}</b>
                        <small>dias</small>
                      </div>
                      <span>:</span>
                      <div>
                        <b>{countdown.h}</b>
                        <small>hrs</small>
                      </div>
                      <span>:</span>
                      <div>
                        <b>{countdown.m}</b>
                        <small>min</small>
                      </div>
                      <span>:</span>
                      <div>
                        <b>{countdown.s}</b>
                        <small>seg</small>
                      </div>
                    </div>
                  </div>

                  <div className="hero-coupon-list">
                    <button
                      type="button"
                      className="hero-coupon-card"
                      onClick={() => navigateView('security')}
                    >
                      <div>
                        <small>COMPRA PROTEGIDA</small>
                        <strong>REEMBOLSO • 7 DIAS</strong>
                      </div>
                      <span className="hero-coupon-action">
                        <ShieldCheck size={13} strokeWidth={2.4} /> Ver regras
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`hero-coupon-card is-natal ${savedCoupon === 'NATAL50' ? 'active' : ''}`}
                      onClick={() => activateSeasonalCoupon('NATAL50', 'R$ 50 OFF de Natal')}
                    >
                      <div>
                        <small>PRESENTE DE NATAL</small>
                        <strong>NATAL50 • R$ 50 OFF</strong>
                      </div>
                      <span className="hero-coupon-action">
                        {savedCoupon === 'NATAL50' ? (
                          <>
                            <Check size={13} strokeWidth={2.6} /> Ativo
                          </>
                        ) : (
                          <>
                            <Copy size={13} strokeWidth={2.2} /> Ativar
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </aside>
              </div>
            </section>

            <section className="section" id="categorias">
              <div className="section-head">
                <div>
                  <h2>Compre por categoria</h2>
                  <p>Escolha uma seção e monte o presente ideal de fim de ano.</p>
                </div>
                <a
                  className="seeall"
                  href="#catalogo"
                  onClick={(e) => {
                    e.preventDefault();
                    setCat('Todos');
                  }}
                >
                  Ver tudo →
                </a>
              </div>
              <div className="category-grid">
                {CATEGORY_CARDS.map((item) => (
                  <a
                    key={item.cat}
                    className={`cat-card ${activeCat === item.cat ? 'active' : ''}`}
                    href="#catalogo"
                    onClick={(e) => {
                      e.preventDefault();
                      setCat(item.cat);
                    }}
                  >
                    <span className="emoji">
                      <img src={item.icon} alt={item.cat} referrerPolicy="no-referrer" />
                    </span>
                    <b>{item.cat}</b>
                  </a>
                ))}
              </div>
            </section>

            <section className="section flash flash-seasonal" id="ofertas">
              <div className="flash-head">
                <span className="flash-ico" aria-hidden="true">
                  <Gift size={19} strokeWidth={2.2} />
                </span>
                <div>
                  <h2>Black Friday &amp; Presentes de Natal</h2>
                  <p className="flash-sub">
                    Curadoria com envio imediato, revisão técnica e garantia de reembolso em 7 dias
                  </p>
                </div>
                <div className="ofertas-tabs" role="tablist" aria-label="Curadoria Black Friday e Natal">
                  <button
                    type="button"
                    className={offerTab === 'featured' ? 'active' : ''}
                    onClick={() => setOfferTab('featured')}
                  >
                    <Zap size={13} /> Destaques
                  </button>
                  <button
                    type="button"
                    className={offerTab === 'discounts' ? 'active' : ''}
                    onClick={() => setOfferTab('discounts')}
                  >
                    <Sparkles size={13} /> Maiores Descontos
                  </button>
                  <button
                    type="button"
                    className={offerTab === 'gifts' ? 'active' : ''}
                    onClick={() => setOfferTab('gifts')}
                  >
                    <Gift size={13} /> Presentes até R$ 600
                  </button>
                  <button
                    type="button"
                    className={offerTab === 'flagships' ? 'active' : ''}
                    onClick={() => setOfferTab('flagships')}
                  >
                    <Award size={13} /> Consoles &amp; iPhones Pro
                  </button>
                </div>
              </div>
              <div className="products featured-carousel" id="featured">
                {featuredProducts.map(renderProductCard)}
              </div>
              <div className="featured-mobile-more">
                <a
                  href="#catalogo"
                  onClick={(e) => {
                    e.preventDefault();
                    setCat('Todos');
                  }}
                >
                  Ver todo o catálogo →
                </a>
              </div>
            </section>

            <section className="section" id="catalogo">
              <div className="section-head">
                <div>
                  <h2>Explore nossos produtos</h2>
                  <p>
                    Clique em qualquer item para ver todas as fotos, garantia, opiniões e calcular o
                    frete.
                  </p>
                </div>
                <a
                  className="seeall"
                  href="#catalogo"
                  id="showAll"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFilters();
                  }}
                >
                  Limpar filtros ×
                </a>
              </div>

              <div className="mobile-cat-pills" role="tablist" aria-label="Filtro rápido de categorias">
                <button
                  type="button"
                  className={activeCat === 'Todos' && !onlyFavorites ? 'active' : ''}
                  onClick={() => {
                    setOnlyFavorites(false);
                    setActiveCat('Todos');
                  }}
                >
                  Todos ({catalogProducts.length})
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={activeCat === c && !onlyFavorites ? 'active' : ''}
                    onClick={() => {
                      setOnlyFavorites(false);
                      setActiveCat(c);
                    }}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  className={onlyFavorites ? 'active' : ''}
                  onClick={() => {
                    setActiveCat('Todos');
                    setOnlyFavorites((prev) => !prev);
                  }}
                >
                  ♥ Favoritos ({favorites.size})
                </button>
              </div>

              {mobileFiltersOpen && (
                <div
                  className="mobile-filter-backdrop"
                  onClick={() => setMobileFiltersOpen(false)}
                />
              )}

              <div className="layout-products">
                <aside className={`filters ${mobileFiltersOpen ? 'mobile-open' : ''}`}>
                  <div className="mobile-filter-sheet-head">
                    <span className="mobile-sheet-handle" aria-hidden="true" />
                    <div>
                      <h3>Filtrar produtos</h3>
                      <button
                        type="button"
                        className="x"
                        aria-label="Fechar filtros"
                        onClick={() => setMobileFiltersOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <h3 className="desktop-filter-title">Filtrar produtos</h3>
                  <button type="button" className="clear" id="clearFilters" onClick={clearFilters}>
                    Limpar tudo
                  </button>
                  <div className="filter-group">
                    <b>Categorias</b>
                    <div id="categoryFilters">
                      <label>
                        <input
                          type="radio"
                          name="cat"
                          value="Todos"
                          checked={activeCat === 'Todos' && !onlyFavorites}
                          onChange={() => {
                            setOnlyFavorites(false);
                            setActiveCat('Todos');
                          }}
                        />{' '}
                        Todas as categorias ({catalogProducts.length})
                      </label>
                      {CATEGORIES.map((c) => (
                        <label key={c}>
                          <input
                            type="radio"
                            name="cat"
                            value={c}
                            checked={activeCat === c && !onlyFavorites}
                            onChange={() => {
                              setOnlyFavorites(false);
                              setActiveCat(c);
                            }}
                          />{' '}
                          {c} ({catalogProducts.filter((p) => p.cat === c).length})
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <b>Disponibilidade</b>
                    <label>
                      <input
                        type="checkbox"
                        checked={onlyStock}
                        onChange={(e) => setOnlyStock(e.target.checked)}
                      />{' '}
                      Pronta entrega em estoque
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(e) => setOnlyFavorites(e.target.checked)}
                      />{' '}
                      Apenas meus favoritos ({favorites.size})
                    </label>
                  </div>
                  <div className="filter-group">
                    <b>Faixa de preço</b>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="all"
                        checked={priceMode === 'all'}
                        onChange={() => setPriceMode('all')}
                      />{' '}
                      Todos os preços
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="low"
                        checked={priceMode === 'low'}
                        onChange={() => setPriceMode('low')}
                      />{' '}
                      Até R$ 500
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="mid"
                        checked={priceMode === 'mid'}
                        onChange={() => setPriceMode('mid')}
                      />{' '}
                      R$ 500 a R$ 1.500
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="high"
                        checked={priceMode === 'high'}
                        onChange={() => setPriceMode('high')}
                      />{' '}
                      Acima de R$ 1.500
                    </label>
                  </div>
                  <div className="mobile-filter-sheet-foot">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      Ver {filteredProducts.length} produto(s)
                    </button>
                  </div>
                </aside>

                <div className="catalog">
                  <div className="catalog-toolbar">
                    <div>
                      <h2 id="catalogTitle">
                        {onlyFavorites
                          ? 'Meus favoritos'
                          : activeCat === 'Todos'
                            ? 'Produtos divididos por categoria'
                            : activeCat}
                      </h2>
                      <span id="resultCount">
                        {filteredProducts.length} produto(s) encontrado(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="mobile-filter-btn"
                        onClick={() => setMobileFiltersOpen((prev) => !prev)}
                      >
                        ☰ {mobileFiltersOpen ? 'Fechar filtros' : 'Filtrar'}
                      </button>
                      <select
                        id="sort"
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value)}
                      >
                        <option value="featured">Ordenar: Recomendados</option>
                        <option value="name">Nome: A a Z</option>
                        <option value="price">Menor preço</option>
                        <option value="price-desc">Maior preço</option>
                      </select>
                    </div>
                  </div>

                  <div id="products">
                    {filteredProducts.length === 0 ? (
                      <div className="products">
                        <div className="empty">
                          Nenhum produto encontrado. Tente outro termo ou limpe os filtros.
                        </div>
                      </div>
                    ) : activeCat === 'Todos' && !onlyFavorites ? (
                      CATEGORIES.map((catName) => {
                        const items = filteredProducts.filter((p) => p.cat === catName);
                        if (items.length === 0) return null;
                        const catCard = CATEGORY_CARDS.find((c) => c.cat === catName);
                        return (
                          <div className="cat-section" key={catName}>
                            <div className="cat-section-head">
                              <div className="cat-section-title">
                                {catCard && (
                                  <img src={catCard.icon} alt={catName} referrerPolicy="no-referrer" />
                                )}
                                <h3>{catName}</h3>
                                <span>
                                  ({items.length} produto{items.length > 1 ? 's' : ''})
                                </span>
                              </div>
                              <button
                                type="button"
                                className="cat-section-link"
                                onClick={() => setCat(catName)}
                              >
                                Filtrar {catName} →
                              </button>
                            </div>
                            <div className="products">{items.map(renderProductCard)}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="products">{filteredProducts.map(renderProductCard)}</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Avaliações Verificadas dos Clientes */}
            <section className="trust-section" id="avaliacoes">
              <div className="trust-header">
                <div>
                  <h2>Avaliações verificadas de quem já comprou</h2>
                  <p>
                    Transparência total em cada pedido: mais de 4.200 clientes atendidos em todo o
                    Brasil.
                  </p>
                </div>
                <div className="trust-score-pill">★ 4,9 / 5,0 • 99,4% entregas no prazo</div>
              </div>
              <div className="reviews-grid">
                {STORE_REVIEWS.map((rev) => (
                  <article className="review-card" key={rev.id}>
                    <div className="review-stars">{'★'.repeat(rev.rating)}</div>
                    <p>“{rev.comment}”</p>
                    <div>
                      <div className="review-author">
                        ✓ {rev.author} • {rev.city}
                      </div>
                      <div className="review-meta">
                        Comprou {rev.product} • {rev.date}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="banner-wide banner-seasonal" id="seller">
              <div className="banner-wide-copy">
                <div className="banner-season-kicker">
                  <ShieldCheck size={14} strokeWidth={2.3} /> Compra 100% Protegida{' '}
                  {storeSettings.storeName}
                </div>
                <h2>Não curtiu? Reembolso 100% Garantido em 7 Dias</h2>
                <p>
                  Cada console, PC Gamer e iPhone passa por bancada técnica antes do envio, sai com
                  Nota Fiscal, rastreio com caminhão ao vivo no mapa e direito a devolução grátis
                  com estorno total via PIX.
                </p>
              </div>
              <div className="banner-wide-actions">
                <button
                  type="button"
                  className="btn-yellow"
                  onClick={() => navigateView('security')}
                >
                  🛡️ Ver Política de Reembolso &amp; Segurança
                </button>
                <button
                  type="button"
                  className="btn-hero-outline"
                  onClick={() => navigateView('orders')}
                >
                  Rastrear meu pedido ao vivo →
                </button>
              </div>
            </section>

            <section className="newsletter newsletter-seasonal">
              <div>
                <h3>Receba ofertas de Black Friday, Natal e cupons VIP</h3>
                <p>
                  Cadastre seu e-mail para desbloquear ofertas antecipadas e usar o cupom{' '}
                  <strong>NATAL50</strong> (R$ 50 OFF).
                  {newsletterEmails.length > 0 &&
                    ` (${newsletterEmails.length} inscrito(s) nesta sessão)`}
                </p>
              </div>
              <form
                className="news-form"
                id="newsForm"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.querySelector('input');
                  const email = input?.value.trim() || '';
                  if (email) {
                    setNewsletterEmails((prev) => [...prev, email]);
                    if (currentUser) {
                      await subscribeNewsletterFirestore(currentUser, email).catch(() => undefined);
                    }
                  }
                  activateSeasonalCoupon('NATAL50', 'R$ 50 OFF de Natal');
                  form.reset();
                }}
              >
                <input type="email" placeholder="Seu melhor e-mail" required />
                <button type="submit">Quero meu cupom</button>
              </form>
            </section>

            <ClientTrustBar
              products={catalogProducts}
              liveOrders={orders}
              storeName={storeSettings.storeName}
              onOpenTracking={openTrackingCode}
              onOpenOrder={openShowcaseOrder}
              onOpenShowcase={() => navigateView('showcase')}
              onGoTrackingLookup={() => navigateView('orders')}
            />
          </>
        )}
      </main>

      <section className="benefits-band">
        <div className="container benefits">
          <div className="benefit">
            <span className="ico">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </span>
            <span>
              <b>Compra Garantida</b>
              <small>Receba ou devolvemos 100% do valor</small>
            </span>
          </div>
          <div className="benefit">
            <span className="ico">
              <Truck size={20} strokeWidth={2.2} />
            </span>
            <span>
              <b>Entrega Expressa e Padrão</b>
              <small>
                Hoje por {money(storeSettings.expressShippingPrice)} ou em 2 dias por{' '}
                {money(storeSettings.standardShippingPrice)}
              </small>
            </span>
          </div>
          <div className="benefit">
            <span className="ico">
              <CreditCard size={20} strokeWidth={2.2} />
            </span>
            <span>
              <b>Pagamento via PIX Oficial</b>
              <small>Aprovação imediata com proteção SSL</small>
            </span>
          </div>
          <div className="benefit">
            <span className="ico">
              <Award size={20} strokeWidth={2.2} />
            </span>
            <span>
              <b>Garantia e Devolução Grátis</b>
              <small>7 dias para reembolso 100% e suporte WhatsApp</small>
            </span>
          </div>
        </div>
      </section>

      <footer id="ajuda">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <a
                className="brand"
                href="#"
                aria-label={storeSettings.storeName}
                onClick={(e) => {
                  e.preventDefault();
                  goHome();
                }}
              >
                <img
                  src="/src/assets/ref/logo.png"
                  alt={storeSettings.storeName}
                  referrerPolicy="no-referrer"
                  className="brand-mark-img"
                />
                <span className="brand-wordmark">
                  <strong>Brasil</strong>
                  <em> Tech</em>
                </span>
              </a>
              <p className="footer-desc">
                Seu marketplace de tecnologia com Compra Garantida. Smartphones, consoles e PCs
                Gamer testados em bancada, com nota de compra, entrega rápida e atendimento humano.
              </p>
            </div>

            <div className="footer-col">
              <h4>Categorias</h4>
              <div className="footer-links">
                {CATEGORIES.map((c) => (
                  <a
                    key={c}
                    href="#catalogo"
                    onClick={(e) => {
                      e.preventDefault();
                      setCat(c);
                    }}
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-col">
              <h4>Atendimento e Pedidos</h4>
              <div className="footer-links">
                <a
                  href="#/garantia"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateView('security');
                  }}
                >
                  Garantia e Reembolso 7 dias
                </a>
                <a
                  href="#/entregas"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateView('showcase');
                  }}
                >
                  Pedidos feitos e entregues
                </a>
                <a
                  href="#rastreio"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateView('orders');
                  }}
                >
                  Meus pedidos e rastreio
                </a>
                <a
                  href="#avaliacoes"
                  onClick={(e) => {
                    e.preventDefault();
                    goHome('avaliacoes');
                  }}
                >
                  Avaliações de clientes
                </a>
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  WhatsApp: {storeSettings.phone}
                </a>
                <a href={`mailto:${storeSettings.email}`}>E-mail: {storeSettings.email}</a>
                <a
                  href="#/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateView('admin');
                  }}
                >
                  Acesso Administrativo
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Loja Física &amp; Segurança</h4>
              <div className="footer-company-info">
                <strong>{storeSettings.storeName}</strong>
                <span>CNPJ: {storeSettings.cnpj}</span>
                <span>📍 {storeSettings.address}</span>
              </div>
              <p className="footer-warranty-note">
                Garantia de 90 dias a 12 meses em todo o catálogo, devolução gratuita em até 7 dias
                e proteção total com pagamento via PIX.
              </p>
            </div>
          </div>

          <FooterTrustSeals pixDiscountPercent={storeSettings.pixDiscountPercent} />

          <div className="footer-bottom">
            <div className="footer-bottom-group">
              <span>CNPJ: {storeSettings.cnpj} — {storeSettings.storeName}</span>
              <span aria-hidden="true">•</span>
              <span>{storeSettings.address}</span>
            </div>
            <div className="footer-bottom-group footer-bottom-contact">
              <span>{storeSettings.phone}</span>
              <span aria-hidden="true">•</span>
              <span>{storeSettings.email}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Sacola / Carrinho Lateral */}
      <div
        className={`overlay ${cartOpen ? 'show' : ''}`}
        id="cartOverlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setCartOpen(false);
        }}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Sua sacola ({cartCount})</h2>
            <button
              type="button"
              className="x"
              id="closeCart"
              onClick={() => setCartOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="cart-list" id="cartList">
            {cart.length === 0 ? (
              <div className="empty">
                Sua sacola está vazia.
                <br />
                Explore os produtos e escolha seus favoritos.
              </div>
            ) : (
              cart.map((entry) => {
                const p = catalogProducts.find((y) => y.id === entry.id);
                if (!p) return null;
                return (
                  <div className="cart-item" key={entry.id}>
                    <div
                      className="cart-thumb"
                      style={{ cursor: 'pointer' }}
                      onClick={() => openProduct(p.id)}
                    >
                      {p.image && !failedImages.has(p.id) ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          onError={() => handleImageError(p.id)}
                        />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    <div className="cart-detail">
                      <b style={{ cursor: 'pointer' }} onClick={() => openProduct(p.id)}>
                        {p.name}
                      </b>
                      <small>{money(p.price)} cada</small>
                      <div className="qty">
                        <button type="button" onClick={() => changeQty(p.id, -1)}>
                          −
                        </button>
                        {entry.qty}
                        <button type="button" onClick={() => changeQty(p.id, 1)}>
                          +
                        </button>
                        <button
                          type="button"
                          style={{ marginLeft: 7, color: '#b23' }}
                          onClick={() => removeCart(p.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    <b>{money(p.price * entry.qty)}</b>
                  </div>
                );
              })
            )}
          </div>
          <div className="cart-total">
            <span>Subtotal</span>
            <span id="cartTotal">{money(cartTotal)}</span>
          </div>
          {cartTotal > 0 && (
            <div style={{ fontSize: 11, color: '#138247', fontWeight: 700, marginBottom: 10 }}>
              🛡️ Compra Garantida • Reembolso 100% em até 7 dias após entrega
            </div>
          )}
          <button
            type="button"
            className="primary"
            id="checkout"
            onClick={() => {
              if (!cart.length) {
                showToast('Sua sacola está vazia.');
                return;
              }
              setDirectCheckoutEntry(null);
              setCartOpen(false);
              navigateView('checkout');
            }}
          >
            Ir para o mini checkout →
          </button>
          <div className="fine">
            🛡️ Compra Garantida • Entrega hoje ({money(storeSettings.expressShippingPrice)}) ou em
            2 dias úteis ({money(storeSettings.standardShippingPrice)}).
          </div>
        </aside>
      </div>

      {/* Modal de Conta do Cliente (Firebase Google Auth) */}
      <div
        className={`modal-wrap ${loginOpen ? 'show' : ''}`}
        id="loginModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setLoginOpen(false);
        }}
      >
        <div className="modal">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>{currentUser ? `Olá, ${userName}` : 'Entrar com segurança'}</h2>
            <button
              type="button"
              className="x"
              id="closeLogin"
              onClick={() => setLoginOpen(false)}
            >
              ✕
            </button>
          </div>
          {currentUser || sessionAdminVerified ? (
            <>
              <div className="user-profile-pill">
                {currentUser?.photoURL && (
                  <img src={currentUser.photoURL} alt={userName} referrerPolicy="no-referrer" />
                )}
                <div>
                  <b>{userName}</b>
                  <small>
                    {currentUser?.email || (sessionAdminVerified ? PRIMARY_ADMIN_LOGIN_EMAIL : '')}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setLoginOpen(false);
                  navigateView('orders');
                }}
              >
                Ver meus pedidos ({orders.length})
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-yellow"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  onClick={() => {
                    setLoginOpen(false);
                    navigateView('admin');
                  }}
                >
                  🛡️ Abrir Painel Administrativo
                </button>
              )}
              <button
                type="button"
                className="pdp-back"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                onClick={handleSignOut}
              >
                Sair da conta
              </button>
            </>
          ) : (
            <div>
              <p>
                Conecte sua conta Google para finalizar compras, acompanhar rastreamento em tempo
                real e enviar avaliações verificadas.
              </p>
              <button
                type="button"
                className="google-auth-btn"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
              >
                <span style={{ fontSize: 18 }}>G</span>
                <span>{authLoading ? 'Conectando...' : 'Entrar com Google'}</span>
              </button>

              <div className="admin-login-divider" style={{ margin: '14px 0' }}>
                <span>Acesso Administrador (E-mail e Senha)</span>
              </div>

              <form className="admin-login-form compact" onSubmit={handleAdminPasswordLogin}>
                <input
                  type="email"
                  placeholder="E-mail administrativo"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha administrativa"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  required
                />
                {adminAuthError && <div className="admin-auth-error">{adminAuthError}</div>}
                <button type="submit" className="primary" disabled={authLoading}>
                  <Lock size={14} /> {authLoading ? 'Entrando...' : 'Entrar no Painel Admin'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Modal de CEP no Cabeçalho */}
      <div
        className={`modal-wrap ${cepModalOpen ? 'show' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCepModalOpen(false);
        }}
      >
        <div className="modal">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Onde você quer receber?</h2>
            <button type="button" className="x" onClick={() => setCepModalOpen(false)}>
              ✕
            </button>
          </div>
          <p>
            Informe seu CEP para exibir prazos de entrega expressa (no mesmo dia:{' '}
            {money(storeSettings.expressShippingPrice)}) e padrão (2 dias úteis:{' '}
            {money(storeSettings.standardShippingPrice)}).
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const digits = cepDraft.replace(/\D/g, '');
              if (digits.length < 8) {
                showToast('Digite um CEP válido com 8 números.');
                return;
              }
              const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
              updateCep(formatted);
              setCepModalOpen(false);
              showToast(`CEP ${formatted} salvo para suas entregas!`);
            }}
          >
            <input
              placeholder="Ex: 80010-000"
              maxLength={9}
              value={cepDraft}
              onChange={(e) => setCepDraft(e.target.value)}
              required
            />
            <button type="submit" className="primary">
              Confirmar CEP
            </button>
          </form>
        </div>
      </div>

      {/* Botão Flutuante WhatsApp */}
      <a
        className={`wa-fab ${viewMode === 'product' && selectedProduct ? 'wa-fab-pdp-offset' : ''}`}
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Atendimento via WhatsApp"
      >
        💬 <span>WhatsApp {storeSettings.phone}</span>
      </a>

      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast">
        {toastMsg}
      </div>
    </>
  );
}
