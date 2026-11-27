import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  CheckCircle2,
  Instagram,
  Lock,
  MessageCircle,
  Package,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  CartEntry,
  MarketplaceOrder,
  MarketplaceProduct,
  OrderItem,
  PRODUCTS,
  deriveProductMeta,
  money,
} from './data/marketplaceCatalog';
import { StoreHeader, NavDestination } from './components/StoreHeader';
import { HomeShowcase } from './components/HomeShowcase';
import { IphoneAreaSection } from './components/IphoneAreaSection';
import { GamerAreaSection, GamerSubPage } from './components/GamerAreaSection';
import { ProductCard } from './components/ProductCard';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutView, OrdersTrackingView } from './components/MarketplaceCheckout';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicOrdersShowcase } from './components/PublicOrdersShowcase';
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
import { initMetaPixel, trackMetaAddToCart } from './lib/metaPixel';
import { applyStorefrontSeo } from './lib/seo';
import { detectVisitorRegion, VisitorRegion } from './services/regionLookup';
import {
  CostMap,
  DEFAULT_STOREFRONT_CONTENT,
  DEFAULT_STORE_SETTINGS,
  PersistedCoupon,
  PersistedOrder,
  PersistedQuestion,
  PersistedReview,
  StoreSettings,
  StorefrontContentState,
  checkIsUserAdmin,
  clearAdminSessionToken,
  createOrderFirestore,
  createQuestionFirestore,
  createReviewFirestore,
  exchangeFirebaseAdminSession,
  normalizeTrackingLookupInput,
  persistAdminSessionToken,
  readStoredAdminSessionToken,
  recordGuestOrderOnServer,
  seedInitialCatalogIfEmpty,
  subscribeCoupons,
  subscribeOrders,
  subscribeProductCostsAdmin,
  subscribeProducts,
  subscribeQuestions,
  subscribeReviews,
  subscribeStoreSettings,
  subscribeStorefrontContent,
  subscribeUserReviews,
  syncUserProfile,
  updateUserSavedCep,
} from './services/firestoreStore';

type ViewMode =
  | 'home'
  | 'iphones'
  | 'android'
  | 'gamer'
  | 'acessorios'
  | 'ofertas'
  | 'lancamentos'
  | 'product'
  | 'checkout'
  | 'orders'
  | 'showcase'
  | 'security'
  | 'admin';

const ADMIN_SESSION_STORAGE_KEY = 'bt_admin_session_v2';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseAdmin, setFirebaseAdmin] = useState<boolean>(false);
  const [sessionAdminVerified, setSessionAdminVerified] = useState<boolean>(() =>
    Boolean(readStoredAdminSessionToken())
  );
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminPassInput, setAdminPassInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [firestoreProducts, setFirestoreProducts] = useState<MarketplaceProduct[]>([]);
  const [costMap, setCostMap] = useState<CostMap>({});
  const [coupons, setCoupons] = useState<PersistedCoupon[]>([]);
  const [persistedReviews, setPersistedReviews] = useState<PersistedReview[]>([]);
  const [userOwnReviews, setUserOwnReviews] = useState<PersistedReview[]>([]);
  const [persistedQuestions, setPersistedQuestions] = useState<PersistedQuestion[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<PersistedOrder[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [storefrontContent, setStorefrontContent] = useState<StorefrontContentState>(
    DEFAULT_STOREFRONT_CONTENT
  );

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

  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set());
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [androidBrandFilter, setAndroidBrandFilter] = useState<string>('Todas');

  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [gamerSubPage, setGamerSubPage] = useState<GamerSubPage>('Todos Gamer');
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

  const catalogProducts = firestoreProducts.length > 0 ? firestoreProducts : PRODUCTS;
  const userName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    (sessionAdminVerified ? 'Administrador' : '');
  const isAdmin = firebaseAdmin || sessionAdminVerified;
  const orders: MarketplaceOrder[] =
    currentUser || isAdmin ? firestoreOrders : localOrders;
  const isBootstrappedAdmin = isBootstrappedAdminUser(
    currentUser?.email,
    currentUser?.emailVerified
  );

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

      try {
        const profile = await syncUserProfile(user, userCep || undefined);
        if (profile.cep && !userCep) {
          setUserCep(profile.cep);
          setCepDraft(profile.cep);
        }
      } catch {
        // ignore profile sync failure when guest rules block
      }

      if (adminStatus) {
        await exchangeFirebaseAdminSession().catch(() => null);
        await seedInitialCatalogIfEmpty().catch(() => undefined);
      }
    });
    return () => unsub();
  }, []);

  // Public Firestore real-time catalog, questions, store settings & storefront banners/categories
  useEffect(() => {
    const unsubProd = subscribeProducts(setFirestoreProducts);
    const unsubQa = subscribeQuestions(setPersistedQuestions);
    const unsubSettings = subscribeStoreSettings(setStoreSettings);
    const unsubStorefront = subscribeStorefrontContent(setStorefrontContent);
    return () => {
      unsubProd();
      unsubQa();
      unsubSettings();
      unsubStorefront();
    };
  }, []);

  // Initialize Meta Pixel when configured in Admin or VITE_META_PIXEL_ID
  useEffect(() => {
    initMetaPixel(storefrontContent.metaPixelId);
  }, [storefrontContent.metaPixelId]);

  // Reviews listener
  useEffect(() => {
    const unsubRev = subscribeReviews(isAdmin, setPersistedReviews);
    return () => unsubRev();
  }, [isAdmin]);

  // Coupons listener
  useEffect(() => {
    const unsubCoupons = subscribeCoupons(isAdmin, setCoupons);
    return () => unsubCoupons();
  }, [isAdmin]);

  // Authenticated Orders & User's Own Reviews listeners
  useEffect(() => {
    if (!currentUser && !isAdmin) return;
    const unsubOrders = subscribeOrders(currentUser?.uid || '', isAdmin, setFirestoreOrders);
    const unsubUserReviews = currentUser
      ? subscribeUserReviews(currentUser.uid, setUserOwnReviews)
      : () => undefined;
    return () => {
      unsubOrders();
      unsubUserReviews();
    };
  }, [currentUser, isAdmin]);

  // Admin wholesale costs listener
  useEffect(() => {
    if (!isAdmin) {
      setCostMap({});
      return;
    }
    return subscribeProductCostsAdmin(setCostMap);
  }, [isAdmin]);

  // IP-based visitor region detection
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
      } else if (h === '#/iphones') {
        setViewMode('iphones');
      } else if (h === '#/android') {
        setViewMode('android');
      } else if (h === '#/gamer' || h.startsWith('#/gamer/')) {
        const slug = h.replace('#/gamer/', '').toLowerCase();
        if (slug === 'ps2') setGamerSubPage('PlayStation 2');
        else if (slug === 'ps3') setGamerSubPage('PlayStation 3');
        else if (slug === 'ps4') setGamerSubPage('PlayStation 4');
        else if (slug === 'ps5' || slug === 'playstation') setGamerSubPage('PlayStation 5');
        else if (slug === 'xbox360') setGamerSubPage('Xbox 360');
        else if (slug === 'xboxone') setGamerSubPage('Xbox One');
        else if (slug === 'xbox' || slug === 'xboxseries') setGamerSubPage('Xbox Series S e X');
        else if (slug === 'jogos') setGamerSubPage('Jogos');
        else if (slug === 'controles') setGamerSubPage('Controles');
        else if (slug === 'acessorios') setGamerSubPage('Acessórios');
        else if (slug === 'nintendo') setGamerSubPage('Nintendo');
        else if (slug === 'pcgamer') setGamerSubPage('PC Gamer');
        else setGamerSubPage('Todos Gamer');
        setViewMode('gamer');
      } else if (h === '#/acessorios') {
        setViewMode('acessorios');
      } else if (h === '#/ofertas') {
        setViewMode('ofertas');
      } else if (h === '#/lancamentos') {
        setViewMode('lancamentos');
      } else if (h === '#/checkout') {
        setViewMode('checkout');
      } else if (h === '#/pedidos') {
        setInitialTrackingCode(undefined);
        setViewMode('orders');
      } else if (h.startsWith('#/rastreio/')) {
        const code = decodeURIComponent(h.replace('#/rastreio/', '').trim()).toUpperCase();
        setInitialTrackingCode(code || undefined);
        setViewMode('orders');
      } else if (
        h === '#/garantia' ||
        h === '#/reembolso' ||
        h === '#/politicas' ||
        h === '#/privacidade'
      ) {
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
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Storefront / Route dynamic SEO & Organization JSON-LD
  useEffect(() => {
    const prodExists =
      selectedProductId !== null && catalogProducts.some((p) => p.id === selectedProductId);
    if (viewMode === 'product' && prodExists) return;

    const subtitleMap: Record<Exclude<ViewMode, 'product'>, string | undefined> = {
      home: undefined,
      iphones: 'iPhones Certificados',
      android: 'Samsung & Smartphones Android',
      gamer: `Brasil Tech Gamer — ${gamerSubPage}`,
      acessorios: 'Acessórios & Controles',
      ofertas: 'Ofertas Especiais',
      lancamentos: 'Lançamentos e Novidades',
      checkout: 'Checkout Seguro',
      orders: 'Pedidos e Rastreamento ao Vivo',
      showcase: 'Pedidos Enviados e Entregues',
      security: 'Garantia, Trocas, Entrega e Privacidade',
      admin: 'Painel Administrativo',
    };
    applyStorefrontSeo(storeSettings, subtitleMap[viewMode === 'product' ? 'home' : viewMode]);
  }, [viewMode, gamerSubPage, storeSettings, selectedProductId, catalogProducts]);

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

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      setLoginOpen(false);
      showToast(`Bem-vindo(a), ${cred.user.displayName || 'Cliente'}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unauthorized-domain')) {
        showToast(
          `Domínio (${window.location.hostname}) não autorizado no Firebase Auth. Adicione em Authentication > Settings > Authorized domains.`
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        showToast('Não foi possível concluir o login Google. Tente novamente.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminPasswordLogin = (e: FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (!validateAdminPasswordLogin(adminEmailInput, adminPassInput)) {
      setAdminAuthError('E-mail ou senha de administrador incorretos.');
      return;
    }

    const verifiedToken = createVerifiedAdminSessionToken(
      PRIMARY_ADMIN_LOGIN_EMAIL,
      adminPassInput
    );
    if (!verifiedToken) {
      setAdminAuthError('Credenciais administrativas inválidas.');
      return;
    }
    setSessionAdminVerified(true);
    persistAdminSessionToken(verifiedToken);

    setLoginOpen(false);
    setAdminPassInput('');
    navigateView('admin');
    showToast('Painel Administrativo desbloqueado! Alterações são publicadas ao vivo.');
  };

  const handleSignOut = async () => {
    setSessionAdminVerified(false);
    clearAdminSessionToken();
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

  const scrollTopInstant = () => {
    window.scrollTo(0, 0);
  };

  const openProduct = (id: number) => {
    setSelectedProductId(id);
    setViewMode('product');
    window.location.hash = `#/produto/${id}`;
    setCartOpen(false);
    scrollTopInstant();
  };

  const navigateView = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'iphones') window.location.hash = '#/iphones';
    if (mode === 'android') window.location.hash = '#/android';
    if (mode === 'gamer') window.location.hash = '#/gamer';
    if (mode === 'acessorios') window.location.hash = '#/acessorios';
    if (mode === 'ofertas') window.location.hash = '#/ofertas';
    if (mode === 'lancamentos') window.location.hash = '#/lancamentos';
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
    scrollTopInstant();
  };

  const handleHeaderNavigate = (dest: NavDestination) => {
    setOnlyFavorites(false);
    setSearchTerm('');
    if (dest === 'home') {
      setSearchInput('');
      navigateView('home');
      return;
    }
    if (dest === 'iphones') {
      navigateView('iphones');
      return;
    }
    if (dest === 'android') {
      setAndroidBrandFilter('Todas');
      navigateView('android');
      return;
    }
    if (dest === 'playstation') {
      setGamerSubPage('PlayStation 5');
      setViewMode('gamer');
      window.location.hash = '#/gamer/ps5';
      scrollTopInstant();
      return;
    }
    if (dest === 'xbox') {
      setGamerSubPage('Xbox Series S e X');
      setViewMode('gamer');
      window.location.hash = '#/gamer/xbox';
      scrollTopInstant();
      return;
    }
    if (dest === 'gamer') {
      setGamerSubPage('Todos Gamer');
      navigateView('gamer');
      return;
    }
    if (dest === 'acessorios') {
      navigateView('acessorios');
      return;
    }
    if (dest === 'ofertas') {
      navigateView('ofertas');
      return;
    }
    if (dest === 'lancamentos') {
      navigateView('lancamentos');
      return;
    }
    if (dest === 'orders') {
      navigateView('orders');
      return;
    }
    if (dest === 'security') {
      navigateView('security');
      return;
    }
    if (dest === 'admin') {
      navigateView('admin');
    }
  };

  const handleSelectCategoryFilter = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('iphone') || lower.includes('celular')) {
      navigateView('iphones');
      return;
    }
    if (lower.includes('android')) {
      navigateView('android');
      return;
    }
    if (lower.includes('playstation')) {
      setGamerSubPage('PlayStation 5');
      setViewMode('gamer');
      window.location.hash = '#/gamer/ps5';
      scrollTopInstant();
      return;
    }
    if (lower.includes('xbox')) {
      setGamerSubPage('Xbox Series S e X');
      setViewMode('gamer');
      window.location.hash = '#/gamer/xbox';
      scrollTopInstant();
      return;
    }
    if (lower.includes('nintendo')) {
      setGamerSubPage('Nintendo');
      setViewMode('gamer');
      window.location.hash = '#/gamer/nintendo';
      scrollTopInstant();
      return;
    }
    if (lower.includes('pc')) {
      setGamerSubPage('PC Gamer');
      setViewMode('gamer');
      window.location.hash = '#/gamer/pcgamer';
      scrollTopInstant();
      return;
    }
    if (lower.includes('jogo')) {
      setGamerSubPage('Jogos');
      setViewMode('gamer');
      window.location.hash = '#/gamer/jogos';
      scrollTopInstant();
      return;
    }
    if (lower.includes('controle')) {
      setGamerSubPage('Controles');
      setViewMode('gamer');
      window.location.hash = '#/gamer/controles';
      scrollTopInstant();
      return;
    }
    if (lower.includes('acess')) {
      navigateView('acessorios');
      return;
    }
    setGamerSubPage('Todos Gamer');
    navigateView('gamer');
  };

  const openTrackingCode = (trackingCode: string) => {
    const clean = normalizeTrackingLookupInput(trackingCode);
    if (!clean) {
      navigateView('orders');
      return;
    }
    setInitialTrackingCode(clean);
    setViewMode('orders');
    window.location.hash = `#/rastreio/${encodeURIComponent(clean)}`;
    scrollTopInstant();
  };

  const openShowcaseOrder = (orderCode?: string) => {
    const clean = (orderCode || '').trim();
    if (!clean) {
      navigateView('showcase');
      return;
    }
    setShowcaseOrderCode(clean);
    setViewMode('showcase');
    window.location.hash = `#/entregas/${encodeURIComponent(clean)}`;
    scrollTopInstant();
  };

  const goHome = () => {
    setViewMode('home');
    setSelectedProductId(null);
    setShowcaseOrderCode(null);
    setDirectCheckoutEntry(null);
    if (window.location.hash.startsWith('#/')) {
      window.location.hash = '#/';
    }
    scrollTopInstant();
  };

  const addCart = (id: number, qtyToAdd = 1, openDrawer = true) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === id);
      if (existing) {
        return prev.map((x) => (x.id === id ? { ...x, qty: x.qty + qtyToAdd } : x));
      }
      return [...prev, { id, qty: qtyToAdd }];
    });

    const prod = catalogProducts.find((p) => p.id === id);
    if (prod) {
      trackMetaAddToCart({
        id: prod.id,
        name: prod.name,
        cat: prod.cat,
        price: prod.price,
        qty: qtyToAdd,
      });
    }

    if (openDrawer) setCartOpen(true);
    showToast('Produto adicionado ao carrinho!');
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

  const handleImageError = (id: number) => {
    setFailedImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handlePlaceOrder = async (
    order: MarketplaceOrder,
    items: OrderItem[],
    couponCode: string
  ): Promise<void> => {
    if (currentUser) {
      await createOrderFirestore(currentUser, order, items, couponCode);
    } else {
      recordGuestOrderOnServer(order, items, couponCode);
      setLocalOrders((prev) => [order, ...prev]);
    }
  };

  const androidProducts = useMemo(() => {
    return catalogProducts
      .map((p) => ({ product: p, meta: deriveProductMeta(p) }))
      .filter(({ product, meta }) => {
        const lower = product.name.toLowerCase();
        const isAndroid =
          meta.subCategory === 'Smartphones Android' ||
          lower.includes('samsung') ||
          lower.includes('galaxy') ||
          lower.includes('xiaomi') ||
          lower.includes('redmi') ||
          lower.includes('motorola');
        if (!isAndroid) return false;
        if (androidBrandFilter === 'Outros') {
          const b = meta.brand.toLowerCase();
          return b !== 'samsung' && b !== 'xiaomi';
        }
        if (androidBrandFilter !== 'Todas') {
          return meta.brand.toLowerCase() === androidBrandFilter.toLowerCase();
        }
        return true;
      });
  }, [catalogProducts, androidBrandFilter]);

  const accessoriesProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const meta = deriveProductMeta(p);
      return (
        p.cat === 'Acessórios' ||
        meta.subCategory === 'Controles' ||
        meta.subCategory === 'Acessórios'
      );
    });
  }, [catalogProducts]);

  const dealsProducts = useMemo(() => {
    return [...catalogProducts]
      .filter((p) => p.old > p.price)
      .sort((a, b) => (1 - b.price / b.old) - (1 - a.price / a.old));
  }, [catalogProducts]);

  const newArrivalsProducts = useMemo(() => {
    return [...catalogProducts].sort(
      (a, b) =>
        Number(deriveProductMeta(b).isNewArrival) - Number(deriveProductMeta(a).isNewArrival) ||
        b.id - a.id
    );
  }, [catalogProducts]);

  const cartCount = useMemo(() => cart.reduce((n, x) => n + x.qty, 0), [cart]);
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, x) => {
        const product = catalogProducts.find((p) => p.id === x.id);
        return sum + (product ? product.price * x.qty : 0);
      }, 0),
    [cart, catalogProducts]
  );

  const selectedProduct =
    selectedProductId !== null
      ? catalogProducts.find((p) => p.id === selectedProductId) ?? null
      : null;

  const activeHeaderNav: NavDestination = useMemo(() => {
    if (viewMode === 'iphones') return 'iphones';
    if (viewMode === 'android') return 'android';
    if (viewMode === 'acessorios') return 'acessorios';
    if (viewMode === 'ofertas') return 'ofertas';
    if (viewMode === 'lancamentos') return 'lancamentos';
    if (viewMode === 'orders') return 'orders';
    if (viewMode === 'security') return 'security';
    if (viewMode === 'admin') return 'admin';
    if (viewMode === 'gamer') {
      if (gamerSubPage.startsWith('PlayStation')) return 'playstation';
      if (gamerSubPage.startsWith('Xbox')) return 'xbox';
      return 'gamer';
    }
    return 'home';
  }, [viewMode, gamerSubPage]);

  const waHref = `https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
    `Olá equipe ${storeSettings.storeName}! Estou no site e gostaria de atendimento.`
  )}`;

  const renderProductCard = (p: MarketplaceProduct) => (
    <ProductCard
      key={p.id}
      product={p}
      isFavorite={favorites.has(p.id)}
      imageFailed={failedImages.has(p.id)}
      installmentsMax={storefrontContent.installmentsMax}
      onOpenProduct={openProduct}
      onToggleFav={toggleFav}
      onAddCart={(id) => addCart(id)}
      onBuyNow={(id) => buyNow(id, 1)}
      onImageError={handleImageError}
    />
  );

  const hideFloatingWaOnMobile =
    viewMode === 'checkout' ||
    viewMode === 'product' ||
    viewMode === 'admin' ||
    cartOpen ||
    loginOpen ||
    cepModalOpen;

  return (
    <div className="min-h-screen max-w-full overflow-x-clip flex flex-col bg-white text-slate-900">
      <StoreHeader
        storeSettings={storeSettings}
        products={catalogProducts}
        searchInput={searchInput}
        onSearchInputChange={(val) => {
          setSearchInput(val);
          setSearchTerm(val.toLowerCase().trim());
          if (val.trim().length > 0 && viewMode !== 'home') {
            setViewMode('home');
          }
        }}
        onSubmitSearch={(rawQuery) => {
          if (
            /rastreio\/[^?#/\s]+/i.test(rawQuery) ||
            /^#?\/?BT[A-Z0-9_-]{3,}$/i.test(rawQuery.replace(/\s+/g, ''))
          ) {
            openTrackingCode(rawQuery);
            return;
          }
          setSearchTerm(rawQuery.toLowerCase());
          setOnlyFavorites(false);
          setViewMode('home');
          scrollTopInstant();
        }}
        onOpenProduct={openProduct}
        onNavigate={handleHeaderNavigate}
        activeNav={activeHeaderNav}
        userName={userName}
        isAdmin={isAdmin}
        favoritesCount={favorites.size}
        cartCount={cartCount}
        userCep={userCep}
        visitorRegion={visitorRegion}
        onOpenCepModal={() => setCepModalOpen(true)}
        onOpenAccount={() => setLoginOpen(true)}
        onToggleFavoritesOnly={() => {
          const ids = [...favorites];
          if (!ids.length) {
            showToast('Clique no coração de qualquer produto para salvar nos favoritos.');
            return;
          }
          setSearchInput('');
          setSearchTerm('');
          setOnlyFavorites((prev) => !prev);
          setViewMode('home');
          scrollTopInstant();
        }}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1 w-full min-w-0">
        {viewMode === 'admin' ? (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {isAdmin ? (
              <AdminDashboard
                products={catalogProducts}
                costMap={costMap}
                orders={firestoreOrders}
                coupons={coupons}
                questions={persistedQuestions}
                reviews={persistedReviews}
                storeSettings={storeSettings}
                storefrontContent={storefrontContent}
                adminEmail={
                  currentUser?.email || (sessionAdminVerified ? PRIMARY_ADMIN_LOGIN_EMAIL : '')
                }
                isBootstrappedAdmin={isBootstrappedAdmin}
                onConnectGoogleAdmin={handleGoogleSignIn}
                onAdminLogout={handleSignOut}
                onBackToStore={() => goHome()}
                onOpenOrdersShowcase={() => navigateView('showcase')}
                onNotify={showToast}
              />
            ) : (
              <div className="max-w-md mx-auto bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm my-8">
                <div className="flex items-center gap-2 text-lime-800 text-xs font-bold mb-2">
                  <Lock size={15} />
                  <span>Área Administrativa Protegida</span>
                </div>
                <h1 className="text-xl font-bold text-zinc-950 mb-2">
                  Acesso Exclusivo do Proprietário
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 mb-5">
                  Entre com suas credenciais administrativas da{' '}
                  <strong>{storeSettings.storeName}</strong> para gerenciar catálogo, preços,
                  banners, pedidos, rastreios, NF-e e etiquetas.
                </p>

                {currentUser && !firebaseAdmin && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                    <div>
                      <strong>Acesso bloqueado:</strong>{' '}
                      {currentUser.email || 'Esta conta'} não possui permissão administrativa.
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 font-semibold text-rose-800"
                    >
                      Sair desta conta
                    </button>
                  </div>
                )}

                <form className="space-y-3" onSubmit={handleAdminPasswordLogin}>
                  <label className="block text-xs font-semibold text-zinc-700">
                    E-mail administrativo
                    <input
                      type="email"
                      placeholder="E-mail exclusivo do administrador"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      required
                      className="mt-1 w-full min-h-[42px] px-3 rounded-lg border border-zinc-300 text-sm text-zinc-950"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Senha
                    <input
                      type="password"
                      placeholder="Digite sua senha"
                      value={adminPassInput}
                      onChange={(e) => setAdminPassInput(e.target.value)}
                      required
                      className="mt-1 w-full min-h-[42px] px-3 rounded-lg border border-zinc-300 text-sm text-zinc-950"
                    />
                  </label>
                  {adminAuthError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {adminAuthError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full min-h-[44px] rounded-xl bg-zinc-950 hover:bg-lime-400 hover:text-zinc-950 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Lock size={15} />
                    <span>{authLoading ? 'Validando...' : 'Entrar no Painel Admin'}</span>
                  </button>
                </form>

                <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span>ou</span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
                  >
                    Google autorizado
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome()}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    Voltar à loja
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'security' ? (
          <SecurityRefundPage
            storeSettings={storeSettings}
            onBackToStore={() => goHome()}
            onGoToTracking={() => navigateView('orders')}
          />
        ) : viewMode === 'product' && selectedProduct ? (
          <div className="max-w-7xl mx-auto px-4">
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
              onSelectCategory={handleSelectCategoryFilter}
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
          </div>
        ) : viewMode === 'checkout' ? (
          <div className="max-w-7xl mx-auto px-4">
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
              onRemoveItem={(productId) => {
                if (directCheckoutEntry && directCheckoutEntry.id === productId) {
                  setDirectCheckoutEntry(null);
                  goHome();
                } else {
                  removeCart(productId);
                }
              }}
              onClearCart={() => {
                if (directCheckoutEntry) {
                  setDirectCheckoutEntry(null);
                } else {
                  setCart([]);
                }
              }}
              onUpdateCep={updateCep}
              onPlaceOrder={handlePlaceOrder}
              onRecordDirectCheckout={(order, items: OrderItem[], couponCode: string) => {
                if (currentUser) {
                  createOrderFirestore(currentUser, order, items, couponCode).catch(() => undefined);
                } else {
                  recordGuestOrderOnServer(order, items, couponCode);
                  setLocalOrders((prev) => [order, ...prev]);
                }
              }}
              onRequireLogin={() => setLoginOpen(true)}
              onOpenSecurityPage={() => navigateView('security')}
              onBack={() => goHome()}
              onGoOrders={() => navigateView('orders')}
              onNotify={showToast}
            />
          </div>
        ) : viewMode === 'orders' ? (
          <div className="max-w-7xl mx-auto px-4">
            <OrdersTrackingView
              orders={orders}
              storeSettings={storeSettings}
              initialTrackingCode={initialTrackingCode}
              onBack={() => goHome()}
              onGoShowcase={() => navigateView('showcase')}
              onNotify={showToast}
            />
          </div>
        ) : viewMode === 'showcase' ? (
          <div className="max-w-7xl mx-auto px-4">
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
          </div>
        ) : viewMode === 'iphones' ? (
          <IphoneAreaSection
            products={catalogProducts}
            favorites={favorites}
            failedImages={failedImages}
            installmentsMax={storefrontContent.installmentsMax}
            onOpenProduct={openProduct}
            onAddCart={(id) => addCart(id)}
            onBuyNow={(id) => buyNow(id, 1)}
            onToggleFav={toggleFav}
            onImageError={handleImageError}
          />
        ) : viewMode === 'android' ? (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12" aria-label="Smartphones Android">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-lime-800 mb-2">
                  <Smartphone size={15} />
                  <span>Brasil Tech Mobile · Samsung &amp; Android</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  Samsung Galaxy, Xiaomi e smartphones Android
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-2xl">
                  Aparelhos homologados pela Anatel, testados em bancada, com garantia real e
                  condições transparentes à vista no PIX ou parcelamento.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Todas', 'Samsung', 'Xiaomi', 'Outros'].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setAndroidBrandFilter(brand)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      androidBrandFilter === brand
                        ? 'bg-lime-400 text-zinc-950 border border-lime-500'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {androidProducts.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center">
                <p className="text-sm font-semibold text-zinc-700">
                  Nenhum aparelho Android encontrado para essa seleção no momento.
                </p>
                <button
                  type="button"
                  onClick={() => setAndroidBrandFilter('Todas')}
                  className="mt-4 px-5 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold"
                >
                  Mostrar todos os Android
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {androidProducts.map(({ product }) => renderProductCard(product))}
              </div>
            )}
          </section>
        ) : viewMode === 'gamer' ? (
          <GamerAreaSection
            products={catalogProducts}
            activeSubPage={gamerSubPage}
            onChangeSubPage={(sub) => {
              setGamerSubPage(sub);
            }}
            failedImages={failedImages}
            installmentsMax={storefrontContent.installmentsMax}
            onOpenProduct={openProduct}
            onAddCart={(id) => addCart(id)}
            onBuyNow={(id) => buyNow(id, 1)}
            onImageError={handleImageError}
          />
        ) : viewMode === 'acessorios' ? (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12" aria-label="Acessórios e Controles">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 mb-6">
              <div className="text-xs font-bold uppercase tracking-wide text-lime-800 mb-1.5">
                Acessórios &amp; Controles Oficiais
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                Controles, carregadores, headsets e acessórios testados
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1.5">
                Periféricos para PlayStation, Xbox e smartphones com garantia de funcionamento.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {accessoriesProducts.map(renderProductCard)}
            </div>
          </section>
        ) : viewMode === 'ofertas' ? (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12" aria-label="Ofertas Especiais">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lime-800 mb-1.5">
                  <Tag size={14} />
                  <span>Condições Especiais Brasil Tech</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  Ofertas com desconto direto no valor à vista
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                  Produtos selecionados de Mobile e Gamer com redução real sobre o preço anterior.
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-950 bg-lime-400 px-3.5 py-2 rounded-lg shrink-0 tabular-nums">
                {dealsProducts.length} produtos em oferta
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {dealsProducts.map(renderProductCard)}
            </div>
          </section>
        ) : viewMode === 'lancamentos' ? (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12" aria-label="Lançamentos">
            <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lime-400 mb-1.5">
                  <Sparkles size={14} />
                  <span>Novidades no Catálogo Brasil Tech</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Lançamentos e gerações recentes
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Modelos mais recentes de smartphones e consoles com estoque disponível para envio.
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-950 bg-lime-400 px-3.5 py-2 rounded-lg shrink-0 tabular-nums">
                {newArrivalsProducts.length} itens
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {newArrivalsProducts.slice(0, 12).map(renderProductCard)}
            </div>
          </section>
        ) : (
          <HomeShowcase
            products={catalogProducts}
            banners={storefrontContent.banners}
            categories={storefrontContent.categories}
            storeSettings={storeSettings}
            liveOrders={orders}
            favorites={favorites}
            failedImages={failedImages}
            installmentsMax={storefrontContent.installmentsMax}
            visitorRegion={visitorRegion}
            searchTerm={searchTerm}
            onlyFavorites={onlyFavorites}
            onClearSearchAndFavs={() => {
              setSearchInput('');
              setSearchTerm('');
              setOnlyFavorites(false);
            }}
            onNavigateDivision={handleHeaderNavigate}
            onSelectCategoryFilter={handleSelectCategoryFilter}
            onOpenProduct={openProduct}
            onToggleFav={toggleFav}
            onAddCart={(id) => addCart(id)}
            onBuyNow={(id) => buyNow(id, 1)}
            onImageError={handleImageError}
            onOpenTracking={openTrackingCode}
            onOpenOrderShowcase={(code) => openShowcaseOrder(code)}
            onGoTrackingLookup={() => navigateView('orders')}
            onOpenSecurityPage={() => navigateView('security')}
          />
        )}
      </main>

      {/* RODAPÉ INSTITUCIONAL DE ALTA CONFIANÇA */}
      <footer id="ajuda" className="bg-white border-t border-zinc-200 mt-10 sm:mt-12 w-full">
        <div className="bg-zinc-950 text-white border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck size={18} className="text-lime-400 shrink-0" />
              <div className="text-xs sm:text-sm min-w-0">
                <strong className="font-bold text-white">Loja Verificada · Compra 100% Segura</strong>
                <span className="text-zinc-300 block sm:inline sm:ml-2 text-[11px] sm:text-xs">
                  Loja física em Curitiba/PR · CNPJ ativo {storeSettings.cnpj} · Devolução em 7 dias (CDC Art. 49)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigateView('orders')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-white whitespace-nowrap transition-colors"
              >
                Rastrear Pedido
              </button>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <MessageCircle size={14} />
                <span>Falar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-8 pb-20 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 sm:gap-8">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => goHome()}
                className="flex items-center gap-2.5 text-left"
              >
                <img
                  src="/src/assets/ref/logo.png"
                  alt={storeSettings.storeName}
                  className="w-8 h-8 object-contain rounded-md"
                />
                <span className="text-lg font-extrabold tracking-tight text-zinc-950 font-[Plus_Jakarta_Sans] flex items-center gap-1">
                  Brasil{' '}
                  <span className="text-zinc-950 bg-lime-400 px-1.5 py-0.5 rounded-md leading-none">
                    Tech
                  </span>
                </span>
              </button>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Loja de tecnologia completa:{' '}
                <strong className="text-zinc-950">Smartphones</strong> (iPhones e Samsung/Android) e{' '}
                <strong className="text-zinc-950">Videogames</strong> (PlayStation, Xbox, controles
                e acessórios).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Brasil Tech"
                  className="w-9 h-9 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-lime-500 text-zinc-700 hover:text-zinc-950 flex items-center justify-center transition-colors"
                >
                  <MessageCircle size={16} />
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-lime-500 text-zinc-700 hover:text-zinc-950 flex items-center justify-center transition-colors"
                >
                  <Instagram size={16} />
                </a>
                <button
                  type="button"
                  aria-label="Compartilhar loja"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.origin).catch(() => undefined);
                    }
                    showToast('Link da loja copiado!');
                  }}
                  className="w-9 h-9 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-lime-500 text-zinc-700 hover:text-zinc-950 flex items-center justify-center transition-colors"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:contents gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
                  Categorias
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-600">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('iphones')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      iPhones Selecionados
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('android')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Samsung &amp; Android
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('playstation')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      PlayStation (PS2 ao PS5)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('xbox')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Xbox (360, One e Series)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('acessorios')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Controles e Acessórios
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHeaderNavigate('ofertas')}
                      className="hover:text-lime-800 transition-colors text-left font-semibold"
                    >
                      Ofertas &amp; Lançamentos
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
                  Atendimento &amp; Leis
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-600">
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('security')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Garantia &amp; Devolução (7 dias)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('security')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Política de Privacidade (LGPD)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('orders')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Meus Pedidos e Rastreio
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('showcase')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Central de Pedidos Enviados
                    </button>
                  </li>
                  <li>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-lime-800 transition-colors"
                    >
                      WhatsApp: {storeSettings.phone}
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('admin')}
                      className="hover:text-lime-800 transition-colors text-left"
                    >
                      Painel Administrativo
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
                Dados Comerciais Verificados
              </h4>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>Empresa Brasileira Regularizada</span>
                </div>
                <strong className="block text-sm text-zinc-950">{storeSettings.storeName}</strong>
                <span className="block tabular-nums">
                  <b>CNPJ:</b> {storeSettings.cnpj}
                </span>
                <span className="block">
                  <b>Endereço:</b> {storeSettings.address}
                </span>
                <span className="block">
                  <b>SAC / E-mail:</b> {storeSettings.email}
                </span>
                <span className="block text-[11px] text-zinc-500 pt-1 border-t border-zinc-200">
                  Atendimento: Seg a Sáb, 09h às 19h (horário de Brasília)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Garantia real conforme termo de cada produto e direito de arrependimento em 7 dias
                (CDC Art. 49).
              </p>
            </div>
          </div>

          <FooterTrustSeals cnpj={storeSettings.cnpj} />

          <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-zinc-500">
            <span>
              © {new Date().getFullYear()} {storeSettings.storeName} Comércio de Eletrônicos · CNPJ {storeSettings.cnpj}
            </span>
            <span>
              {storeSettings.phone} · {storeSettings.email}
            </span>
          </div>
        </div>
      </footer>

      {/* Carrinho Lateral */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[2px] flex justify-end"
          id="cartOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCartOpen(false);
          }}
        >
          <aside className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-zinc-200">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950">
                Carrinho de Compras ({cartCount})
              </h2>
              <button
                type="button"
                aria-label="Fechar carrinho"
                onClick={() => setCartOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Package size={36} className="mx-auto text-zinc-300" />
                  <div className="text-sm font-semibold text-zinc-700">
                    Seu carrinho está vazio.
                  </div>
                  <p className="text-xs text-zinc-500">
                    Explore iPhones, Androids, consoles e acessórios e adicione seus favoritos.
                  </p>
                </div>
              ) : (
                cart.map((entry) => {
                  const p = catalogProducts.find((y) => y.id === entry.id);
                  if (!p) return null;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => openProduct(p.id)}
                        className="w-16 h-16 rounded-lg bg-zinc-50 border border-zinc-100 p-1.5 flex items-center justify-center shrink-0"
                      >
                        {p.image && !failedImages.has(p.id) ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => handleImageError(p.id)}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl">{p.emoji}</span>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => openProduct(p.id)}
                          className="text-xs font-semibold text-zinc-900 hover:text-lime-700 text-left line-clamp-2"
                        >
                          {p.name}
                        </button>
                        <div className="text-xs font-bold text-zinc-950 mt-0.5 tabular-nums">
                          {money(p.price * entry.qty)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-zinc-50">
                            <button
                              type="button"
                              onClick={() => changeQty(p.id, -1)}
                              className="w-7 h-7 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-l-lg"
                            >
                              −
                            </button>
                            <span className="px-2.5 text-xs font-semibold tabular-nums">
                              {entry.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQty(p.id, 1)}
                              className="w-7 h-7 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-r-lg"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCart(p.id)}
                            aria-label="Remover item"
                            className="text-[11px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-5 border-t border-zinc-200 bg-zinc-50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 font-medium">Subtotal</span>
                <span className="text-lg font-extrabold text-zinc-950 tabular-nums">
                  {money(cartTotal)}
                </span>
              </div>
              {cartTotal > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <ShieldCheck size={14} />
                  <span>Garantia real e direito de devolução em até 7 dias</span>
                </div>
              )}
              <button
                type="button"
                id="checkout"
                onClick={() => {
                  if (!cart.length) {
                    showToast('Seu carrinho está vazio.');
                    return;
                  }
                  setDirectCheckoutEntry(null);
                  setCartOpen(false);
                  navigateView('checkout');
                }}
                className="w-full min-h-[46px] rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-sm font-extrabold transition-colors"
              >
                Finalizar Compra →
              </button>
              <p className="text-[11px] text-zinc-500 text-center">
                Frete expresso ({money(storeSettings.expressShippingPrice)}) ou padrão (
                {money(storeSettings.standardShippingPrice)}) calculado no checkout.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Modal Conta do Cliente / Admin */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          id="loginModal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLoginOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-zinc-950">
                {currentUser || sessionAdminVerified ? `Olá, ${userName}` : 'Entrar na sua conta'}
              </h2>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                aria-label="Fechar modal"
                className="w-9 h-9 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {currentUser || sessionAdminVerified ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  {currentUser?.photoURL && (
                    <img
                      src={currentUser.photoURL}
                      alt={userName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-950 truncate">{userName}</div>
                    <div className="text-xs text-zinc-500 truncate">
                      {currentUser?.email ||
                        (sessionAdminVerified ? PRIMARY_ADMIN_LOGIN_EMAIL : '')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoginOpen(false);
                    navigateView('orders');
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs sm:text-sm font-extrabold"
                >
                  Meus Pedidos e Rastreamento ({orders.length})
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginOpen(false);
                      navigateView('admin');
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold"
                  >
                    Abrir Painel Administrativo
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
                >
                  Sair da conta
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-zinc-600">
                  Conecte sua conta Google para acompanhar pedidos, rastreamento ao vivo e enviar
                  avaliações.
                </p>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <span className="font-bold text-lime-700">G</span>
                  <span>{authLoading ? 'Conectando...' : 'Entrar com Google'}</span>
                </button>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span className="flex-1 h-px bg-zinc-200" />
                  <span>Acesso Administrativo</span>
                  <span className="flex-1 h-px bg-zinc-200" />
                </div>

                <form className="space-y-2.5" onSubmit={handleAdminPasswordLogin}>
                  <input
                    type="email"
                    placeholder="E-mail administrativo"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    required
                    className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-300 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Senha administrativa"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    required
                    className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-300 text-sm"
                  />
                  {adminAuthError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {adminAuthError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full min-h-[44px] rounded-xl bg-zinc-950 hover:bg-lime-400 hover:text-zinc-950 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Lock size={14} />
                    <span>{authLoading ? 'Entrando...' : 'Entrar no Painel Admin'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de CEP */}
      {cepModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCepModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-zinc-950">Onde você quer receber?</h2>
              <button
                type="button"
                onClick={() => setCepModalOpen(false)}
                aria-label="Fechar"
                className="w-9 h-9 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 mb-4">
              Informe seu CEP para exibir opções de entrega expressa (
              {money(storeSettings.expressShippingPrice)}) e padrão (
              {money(storeSettings.standardShippingPrice)}).
            </p>
            <form
              className="space-y-3"
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
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-300 text-sm"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-sm font-extrabold"
              >
                Confirmar CEP
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botão Flutuante WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Atendimento via WhatsApp"
        className={`fixed bottom-4 right-4 z-40 h-12 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-lg items-center gap-2 transition-transform hover:scale-[1.02] ${
          hideFloatingWaOnMobile ? 'hidden' : 'inline-flex'
        }`}
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">WhatsApp {storeSettings.phone}</span>
      </a>

      {/* Toast Feedback */}
      {toastVisible && (
        <div
          id="toast"
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] px-4 py-2.5 rounded-xl bg-zinc-950 text-white text-xs sm:text-sm font-medium shadow-xl flex items-center gap-2"
        >
          <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
