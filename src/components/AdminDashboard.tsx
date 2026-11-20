import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CHECKOUT_URL_SPEC_KEY, MarketplaceProduct, money } from '../data/marketplaceCatalog';
import {
  CostMap,
  PersistedAdmin,
  PersistedCoupon,
  PersistedNewsletter,
  PersistedOrder,
  PersistedQuestion,
  PersistedReview,
  PersistedTracking,
  PersistedUser,
  ReviewStatus,
  StoreSettings,
  addAdminUser,
  adjustProductStockAdmin,
  answerQuestionAdmin,
  buildTrackingWhatsAppMessage,
  deductOrderStockAdmin,
  defaultProgressFromStep,
  deleteCouponAdmin,
  deleteOrderAdmin,
  deleteProductAdmin,
  deleteQuestionAdmin,
  deleteReviewAdmin,
  deleteTrackingAdmin,
  formatCpfMask,
  formatPhoneMask,
  isValidTrackingCodeFormat,
  moderateReviewAdmin,
  normalizeWhatsAppDigits,
  removeAdminUser,
  sanitizeTrackingCodeForAdmin,
  saveCouponAdmin,
  saveProductAdmin,
  saveStoreSettingsAdmin,
  seedInitialCatalogIfEmpty,
  subscribeAdminsAdmin,
  subscribeNewsletterAdmin,
  subscribeTrackingsAdmin,
  subscribeUsersAdmin,
  updateOrderAdmin,
  upsertTrackingAdmin,
} from '../services/firestoreStore';
import { LiveTrackingMap } from './LiveTrackingMap';
import { TrackingDocumentsModal } from './TrackingDocumentsModal';

type AdminTab =
  | 'overview'
  | 'products'
  | 'orders'
  | 'trackings'
  | 'customers'
  | 'marketing'
  | 'settings';

interface AdminDashboardProps {
  products: MarketplaceProduct[];
  hasFirestoreProducts: boolean;
  costMap: CostMap;
  orders: PersistedOrder[];
  coupons: PersistedCoupon[];
  questions: PersistedQuestion[];
  reviews: PersistedReview[];
  storeSettings: StoreSettings;
  adminEmail: string;
  isBootstrappedAdmin: boolean;
  firebaseAuthNotice?: string | null;
  onResendVerificationEmail?: () => Promise<void>;
  onAdminLogout?: () => void;
  onBackToStore: () => void;
  onOpenOrdersShowcase?: () => void;
  onNotify: (msg: string) => void;
}

const STATUS_LABELS = [
  'Pedido confirmado',
  'Em separação e testes',
  'Em transporte',
  'Saiu para entrega',
  'Entregue',
];

export function AdminDashboard({
  products,
  hasFirestoreProducts,
  costMap,
  orders,
  coupons,
  questions,
  reviews,
  storeSettings,
  adminEmail,
  isBootstrappedAdmin,
  firebaseAuthNotice,
  onResendVerificationEmail,
  onAdminLogout,
  onBackToStore,
  onOpenOrdersShowcase,
  onNotify,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [busy, setBusy] = useState<boolean>(false);

  // Filters
  const [productQuery, setProductQuery] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('Todos');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | 'pending' | 'shipping' | 'done'
  >('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Admin-only collections
  const [customers, setCustomers] = useState<PersistedUser[]>([]);
  const [newsletterList, setNewsletterList] = useState<PersistedNewsletter[]>([]);
  const [adminUsers, setAdminUsers] = useState<PersistedAdmin[]>([]);
  const [trackings, setTrackings] = useState<PersistedTracking[]>([]);
  const [trackingRulesWarning, setTrackingRulesWarning] = useState(false);

  useEffect(() => {
    const unsubTrackings = subscribeTrackingsAdmin(
      (items) => {
        setTrackingRulesWarning(false);
        setTrackings(items);
      },
      () => setTrackingRulesWarning(true)
    );
    if (!isBootstrappedAdmin) {
      return () => {
        unsubTrackings();
      };
    }
    const unsubUsers = subscribeUsersAdmin(setCustomers);
    const unsubNews = subscribeNewsletterAdmin(setNewsletterList);
    const unsubAdmins = subscribeAdminsAdmin(setAdminUsers);
    return () => {
      unsubTrackings();
      unsubUsers();
      unsubNews();
      unsubAdmins();
    };
  }, [isBootstrappedAdmin]);

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState(CATEGORIES[0]);
  const [pEmoji, setPEmoji] = useState('🎮');
  const [pPrice, setPPrice] = useState('');
  const [pOld, setPOld] = useState('0');
  const [pCost, setPCost] = useState('');
  const [pStock, setPStock] = useState('10');
  const [pSold, setPSold] = useState('0');
  const [pWarranty, setPWarranty] = useState('6 meses com a Brasil Tech');
  const [pCondition, setPCondition] = useState('Seminovo revisado (Grau A+)');
  const [pFeatured, setPFeatured] = useState(false);
  const [pImage, setPImage] = useState('/src/assets/ref/products/ps5-digital.jpg');
  const [pGallery, setPGallery] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pSpecsText, setPSpecsText] = useState('');
  const [pCheckoutUrl, setPCheckoutUrl] = useState('');

  // Order edits draft map & receipt preview
  const [orderDrafts, setOrderDrafts] = useState<
    Record<
      string,
      { statusStep: number; trackingCode: string; paymentStatus: 'pending' | 'paid' | 'refunded' }
    >
  >({});
  const [receiptOrder, setReceiptOrder] = useState<PersistedOrder | null>(null);

  // Coupon form
  const [cCode, setCCode] = useState('');
  const [cType, setCType] = useState<'percent' | 'fixed'>('percent');
  const [cValue, setCValue] = useState('10');
  const [cLabel, setCLabel] = useState('');

  // Question answer drafts
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  // Admin Team Form
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Tracking Creator & Editor State (Super Complete + Live Route Map + NF-e + Etiqueta)
  const [trackingQuery, setTrackingQuery] = useState('');
  const [tCode, setTCode] = useState('');
  const [tOrderCode, setTOrderCode] = useState('');
  const [tCustomer, setTCustomer] = useState('');
  const [tCustomerCpf, setTCustomerCpf] = useState('');
  const [tCustomerPhone, setTCustomerPhone] = useState('');
  const [tCustomerCep, setTCustomerCep] = useState('');
  const [tCustomerAddress, setTCustomerAddress] = useState('');
  const [tCepLookupBusy, setTCepLookupBusy] = useState(false);
  const [tProduct, setTProduct] = useState('');
  const [tOrigin, setTOrigin] = useState('Curitiba - PR');
  const [tCity, setTCity] = useState('');
  const [tCurrentLocation, setTCurrentLocation] = useState('Curitiba - PR');
  const [tRouteProgress, setTRouteProgress] = useState<number>(35);
  const [tInvoiceNumber, setTInvoiceNumber] = useState('');
  const [tOrderTotal, setTOrderTotal] = useState('1899');
  const [tWeightKg, setTWeightKg] = useState('1.4');
  const [tShipping, setTShipping] = useState('Correios SEDEX • Brasil Tech Express');
  const [tStep, setTStep] = useState<number>(2);
  const [tNote, setTNote] = useState('Objeto postado e em encaminhamento no fluxo logístico');
  const [tActive, setTActive] = useState<boolean>(true);
  const [lastSavedTrackingForActions, setLastSavedTrackingForActions] =
    useState<PersistedTracking | null>(null);
  const [docModalState, setDocModalState] = useState<{
    tracking: PersistedTracking;
    tab: 'nfe' | 'label';
  } | null>(null);
  const [trackingDrafts, setTrackingDrafts] = useState<
    Record<
      string,
      {
        statusStep: number;
        statusNote: string;
        shippingLabel: string;
        originCityState: string;
        destinationCityState: string;
        currentLocation: string;
        routeProgress: number;
        active: boolean;
      }
    >
  >({});

  // Store Settings Form
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(storeSettings);
  useEffect(() => {
    setSettingsDraft(storeSettings);
  }, [storeSettings]);

  // Financial Metrics
  const financials = useMemo(() => {
    const validOrders = orders.filter((o) => o.paymentStatus !== 'refunded');
    const grossRevenue = validOrders.reduce((s, o) => s + o.total, 0);
    const paidRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.total, 0);

    let estimatedCogs = 0;
    validOrders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const unitCost = costMap[item.id] ?? Math.round(item.price * 0.62);
          estimatedCogs += unitCost * item.qty;
        });
      } else {
        estimatedCogs += order.subtotal * 0.62;
      }
    });

    const shippingCostTotal = validOrders.reduce((s, o) => s + (o.shippingCost || 0), 0);
    const netProfit = grossRevenue - estimatedCogs - shippingCostTotal * 0.4;
    const marginPct = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;
    const avgTicket = validOrders.length > 0 ? grossRevenue / validOrders.length : 0;
    const lowStock = products.filter((p) => p.stock <= 5);
    const totalUnitsStock = products.reduce((s, p) => s + p.stock, 0);
    const stockValuation = products.reduce((s, p) => s + p.price * p.stock, 0);
    const pendingQuestions = questions.filter((q) => !q.answered).length;
    const pendingReviews = reviews.filter((r) => r.status === 'pending').length;
    const pendingOrdersCount = orders.filter((o) => o.statusStep < 4).length;

    const categoryStats = CATEGORIES.map((cat) => {
      const catProds = products.filter((p) => p.cat === cat);
      const stockUnits = catProds.reduce((s, p) => s + p.stock, 0);
      const soldUnits = catProds.reduce((s, p) => s + p.sold, 0);
      const stockValue = catProds.reduce((s, p) => s + p.price * p.stock, 0);
      return { cat, count: catProds.length, stockUnits, soldUnits, stockValue };
    });

    const maxStockValue = Math.max(1, ...categoryStats.map((c) => c.stockValue));

    const orderPipeline = STATUS_LABELS.map((label, step) => ({
      label,
      count: orders.filter((o) => o.statusStep === step).length,
    }));

    return {
      grossRevenue,
      paidRevenue,
      estimatedCogs,
      netProfit,
      marginPct,
      avgTicket,
      lowStock,
      totalUnitsStock,
      stockValuation,
      pendingQuestions,
      pendingReviews,
      pendingOrdersCount,
      categoryStats,
      maxStockValue,
      orderPipeline,
      validOrdersCount: validOrders.length,
    };
  }, [orders, products, costMap, questions, reviews]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter(
      (p) =>
        (productCatFilter === 'Todos' || p.cat === productCatFilter) &&
        (!onlyLowStock || p.stock <= 5) &&
        (!q || `${p.name} ${p.cat} ${p.id}`.toLowerCase().includes(q))
    );
  }, [products, productQuery, productCatFilter, onlyLowStock]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQ =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.trackingCode.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (orderStatusFilter === 'pending') return o.paymentStatus === 'pending';
      if (orderStatusFilter === 'shipping') return o.statusStep >= 1 && o.statusStep <= 3;
      if (orderStatusFilter === 'done') return o.statusStep === 4;
      return true;
    });
  }, [orders, orderQuery, orderStatusFilter]);

  const filteredTrackings = useMemo(() => {
    const q = trackingQuery.trim().toLowerCase();
    if (!q) return trackings;
    return trackings.filter((t) =>
      `${t.code} ${t.customerLabel} ${t.customerCpf || ''} ${t.maskedCpf || ''} ${t.customerPhone || ''} ${t.productSummary} ${t.cityState} ${t.originCityState || ''} ${t.destinationCityState || ''} ${t.currentLocation || ''} ${t.invoiceNumber || ''} ${t.orderCode}`
        .toLowerCase()
        .includes(q)
    );
  }, [trackings, trackingQuery]);

  const openNewProductModal = (template?: MarketplaceProduct) => {
    const maxId = products.reduce((m, p) => Math.max(m, p.id), 0);
    const base: MarketplaceProduct = template
      ? { ...template, id: maxId + 1, name: `${template.name} (Cópia)`, sold: 0 }
      : {
          id: maxId + 1,
          name: '',
          cat: CATEGORIES[0],
          emoji: '🎮',
          price: 0,
          old: 0,
          rating: '5,0',
          reviews: 0,
          featured: false,
          desc: '',
          image: '/src/assets/ref/products/ps5-digital.jpg',
          images: ['/src/assets/ref/products/ps5-digital.jpg'],
          stock: 10,
          sold: 0,
          warranty: '6 meses com a Brasil Tech',
          condition: 'Seminovo revisado (Grau A+)',
          specs: [{ label: 'Garantia', value: '6 meses Brasil Tech' }],
        };
    setIsNewProduct(true);
    setEditingProduct(base);
    setPName(base.name);
    setPCat(base.cat);
    setPEmoji(base.emoji);
    setPPrice(base.price > 0 ? String(base.price) : '');
    setPOld(String(base.old || 0));
    setPCost(
      template ? String(costMap[template.id] ?? Math.round(template.price * 0.62)) : ''
    );
    setPStock(String(base.stock));
    setPSold('0');
    setPWarranty(base.warranty);
    setPCondition(base.condition);
    setPFeatured(base.featured);
    setPImage(base.image);
    setPGallery((base.images && base.images.length ? base.images : [base.image]).join('\n'));
    setPDesc(base.desc);
    setPCheckoutUrl(base.checkoutUrl || '');
    setPSpecsText(
      base.specs
        .filter((s) => s.label !== CHECKOUT_URL_SPEC_KEY)
        .map((s) => `${s.label}: ${s.value}`)
        .join('\n')
    );
  };

  const openEditProductModal = (p: MarketplaceProduct) => {
    setIsNewProduct(false);
    setEditingProduct(p);
    setPName(p.name);
    setPCat(p.cat);
    setPEmoji(p.emoji);
    setPPrice(String(p.price));
    setPOld(String(p.old || 0));
    setPCost(String(costMap[p.id] ?? Math.round(p.price * 0.62)));
    setPStock(String(p.stock));
    setPSold(String(p.sold));
    setPWarranty(p.warranty);
    setPCondition(p.condition);
    setPFeatured(p.featured);
    setPImage(p.image);
    setPGallery((p.images && p.images.length ? p.images : [p.image]).join('\n'));
    setPDesc(p.desc);
    setPCheckoutUrl(p.checkoutUrl || '');
    setPSpecsText(
      p.specs
        .filter((s) => s.label !== CHECKOUT_URL_SPEC_KEY)
        .map((s) => `${s.label}: ${s.value}`)
        .join('\n')
    );
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const numericPrice = Number(pPrice);
    if (!pName.trim() || !numericPrice || numericPrice <= 0) {
      onNotify('Informe nome e preço válido maior que zero.');
      return;
    }

    const galleryList = pGallery
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const mainImage = pImage.trim() || galleryList[0] || '/src/assets/ref/products/ps5-digital.jpg';
    const parsedSpecs = pSpecsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
        }
        return { label: 'Detalhe', value: line };
      })
      .filter((s) => s.label !== CHECKOUT_URL_SPEC_KEY);

    const payload: MarketplaceProduct = {
      ...editingProduct,
      name: pName.trim(),
      cat: pCat,
      emoji: pEmoji.trim() || '📦',
      price: numericPrice,
      old: Number(pOld) || 0,
      featured: pFeatured,
      desc: pDesc.trim() || `${pName.trim()} revisado com garantia Brasil Tech.`,
      image: mainImage,
      images: galleryList.length ? galleryList : [mainImage],
      stock: Math.max(0, Number(pStock) || 0),
      sold: Math.max(0, Number(pSold) || 0),
      warranty: pWarranty.trim() || '6 meses com a Brasil Tech',
      condition: pCondition.trim() || 'Seminovo revisado',
      checkoutUrl: pCheckoutUrl.trim(),
      specs: parsedSpecs,
    };

    const costVal = Number(pCost) >= 0 ? Number(pCost) : Math.round(numericPrice * 0.62);

    setBusy(true);
    try {
      await saveProductAdmin(payload, costVal, isNewProduct || !hasFirestoreProducts);
      onNotify(
        isNewProduct ? `Produto "${payload.name}" cadastrado!` : `Produto "${payload.name}" atualizado!`
      );
      setEditingProduct(null);
    } finally {
      setBusy(false);
    }
  };

  const handleSeedCatalog = async () => {
    setBusy(true);
    try {
      const seeded = await seedInitialCatalogIfEmpty();
      onNotify(
        seeded > 0
          ? `${seeded} produto(s) sincronizados com o Firestore!`
          : 'Catálogo já está sincronizado no banco de dados.'
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOrdersCsv = () => {
    const header = [
      'Pedido',
      'Data',
      'Cliente',
      'Email',
      'Telefone',
      'Cidade',
      'Pagamento',
      'StatusPagamento',
      'Etapa',
      'Rastreio',
      'Frete',
      'Desconto',
      'Total',
    ];
    const rows = orders.map((o) => [
      o.code,
      `"${o.createdAt}"`,
      `"${o.customerName}"`,
      o.customerEmail,
      `"${o.customerPhone}"`,
      `"${o.cityState}"`,
      o.paymentMethod,
      o.paymentStatus,
      `"${STATUS_LABELS[o.statusStep] || 'Confirmado'}"`,
      o.trackingCode,
      o.shippingCost.toFixed(2),
      o.discount.toFixed(2),
      o.total.toFixed(2),
    ]);
    downloadCsv(`brasiltech-pedidos-${new Date().toISOString().slice(0, 10)}.csv`, [
      header.join(','),
      ...rows.map((r) => r.join(',')),
    ]);
    onNotify('Relatório de Pedidos CSV exportado!');
  };

  const handleExportStockCsv = () => {
    const header = [
      'ID',
      'Produto',
      'Categoria',
      'PrecoVenda',
      'CustoAtacado',
      'LucroUnitario',
      'Estoque',
      'Vendidos',
      'ValorEmEstoque',
    ];
    const rows = products.map((p) => {
      const cost = costMap[p.id] ?? Math.round(p.price * 0.62);
      const profit = p.price - cost;
      return [
        String(p.id),
        `"${p.name}"`,
        `"${p.cat}"`,
        p.price.toFixed(2),
        cost.toFixed(2),
        profit.toFixed(2),
        String(p.stock),
        String(p.sold),
        (p.price * p.stock).toFixed(2),
      ];
    });
    downloadCsv(`brasiltech-estoque-${new Date().toISOString().slice(0, 10)}.csv`, [
      header.join(','),
      ...rows.map((r) => r.join(',')),
    ]);
    onNotify('Relatório de Estoque e Margem CSV exportado!');
  };

  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const clean = cCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const numericVal = Number(cValue);
    if (!clean || !numericVal || numericVal <= 0) {
      onNotify('Informe um código de cupom e valor válido.');
      return;
    }
    setBusy(true);
    try {
      await saveCouponAdmin(
        {
          code: clean,
          type: cType,
          value: numericVal,
          label:
            cLabel.trim() ||
            (cType === 'percent'
              ? `${numericVal}% OFF Cupom ${clean}`
              : `${money(numericVal)} OFF ${clean}`),
          active: true,
        },
        !coupons.some((c) => c.code === clean)
      );
      setCCode('');
      setCLabel('');
      onNotify(`Cupom ${clean} salvo!`);
    } finally {
      setBusy(false);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim()) return;
    setBusy(true);
    try {
      await addAdminUser(newAdminUid.trim(), newAdminEmail.trim());
      setNewAdminUid('');
      setNewAdminEmail('');
      onNotify('Administrador adicionado com sucesso!');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveStoreSettingsAdmin(settingsDraft);
      onNotify('Configurações da loja atualizadas no Firestore!');
    } finally {
      setBusy(false);
    }
  };

  const generateSuggestedTrackingCode = () => {
    const digits = Math.floor(1000000 + Math.random() * 8999999);
    const code = `BT${digits}BR`;
    setTCode(code);
    if (!tInvoiceNumber) {
      setTInvoiceNumber(`00${String(digits).slice(0, 4)}`);
    }
  };

  const handleTrackingCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setTCustomerCep(formatted);
    if (digits.length !== 8) return;
    setTCepLookupBusy(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (res.ok) {
        const d = await res.json();
        if (!d.erro && (d.logradouro || d.localidade)) {
          if (d.localidade) {
            setTCity(`${d.localidade}${d.uf ? ` - ${d.uf}` : ''}`);
          }
          const addr = [d.logradouro, d.bairro].filter(Boolean).join(' - ');
          if (addr) setTCustomerAddress(addr);
        }
      }
    } catch {
      // ignore offline fallback
    } finally {
      setTCepLookupBusy(false);
    }
  };

  const handlePrefillTrackingFromOrder = (orderCode: string) => {
    const found = orders.find((o) => o.code === orderCode);
    if (!found) return;
    setTOrderCode(found.code);
    setTCustomer(found.customerName);
    setTCustomerCpf(formatCpfMask(found.customerCpf || ''));
    setTCustomerPhone(formatPhoneMask(found.customerPhone || ''));
    setTCustomerCep(found.cep || '');
    setTCustomerAddress(found.address || '');
    setTOrderTotal(String(found.total || 0));
    setTProduct(
      found.items.map((it) => `${it.qty}x ${it.name}`).join(', ').slice(0, 240) ||
        `Pedido ${found.code}`
    );
    setTCity(found.cityState);
    setTShipping(found.shippingLabel || 'Entrega Padrão Brasil Tech');
    setTStep(found.statusStep);
    setTRouteProgress(defaultProgressFromStep(found.statusStep));
    const cleanedExisting = sanitizeTrackingCodeForAdmin(found.trackingCode);
    if (
      isValidTrackingCodeFormat(cleanedExisting) &&
      cleanedExisting !== 'AGUARDANDO-POSTAGEM' &&
      cleanedExisting !== 'AGUARDANDO-ENVIO'
    ) {
      setTCode(cleanedExisting);
    } else if (!tCode) {
      generateSuggestedTrackingCode();
    }
  };

  const handleEditExistingTrackingInForm = (item: PersistedTracking) => {
    setTCode(item.code);
    setTOrderCode(item.orderCode);
    setTCustomer(item.customerLabel);
    setTCustomerCpf(item.customerCpf || '');
    setTCustomerPhone(item.customerPhone || '');
    setTCustomerCep(item.customerCep || '');
    setTCustomerAddress(item.customerAddress || '');
    setTProduct(item.productSummary);
    setTOrigin(item.originCityState || 'Curitiba - PR');
    setTCity(item.destinationCityState || item.cityState);
    setTCurrentLocation(item.currentLocation || item.originCityState || 'Curitiba - PR');
    setTRouteProgress(item.routeProgress ?? defaultProgressFromStep(item.statusStep));
    setTInvoiceNumber(item.invoiceNumber || '');
    setTOrderTotal(String(item.orderTotal || 1899));
    setTWeightKg(String(item.weightKg || 1.2));
    setTShipping(item.shippingLabel);
    setTStep(item.statusStep);
    setTNote(item.statusNote);
    setTActive(item.active);
    onNotify(`Carregado ${item.code} no editor acima para edição.`);
  };

  const handleCreateTracking = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = sanitizeTrackingCodeForAdmin(tCode);
    if (!isValidTrackingCodeFormat(cleanCode)) {
      onNotify('Informe um código válido (mínimo 3 letras/números, ex: BT849201BR).');
      return;
    }
    if (!tCustomer.trim() || !tProduct.trim() || !tCity.trim()) {
      onNotify('Preencha cliente, produto(s) e destino (Cidade - UF) para criar o rastreio.');
      return;
    }

    setBusy(true);
    try {
      const saved = await upsertTrackingAdmin({
        code: cleanCode,
        orderCode: tOrderCode.trim(),
        customerLabel: tCustomer.trim(),
        customerCpf: tCustomerCpf.trim(),
        customerPhone: tCustomerPhone.trim(),
        customerAddress: tCustomerAddress.trim(),
        customerCep: tCustomerCep.trim(),
        productSummary: tProduct.trim(),
        cityState: tCity.trim(),
        originCityState: tOrigin.trim() || 'Curitiba - PR',
        destinationCityState: tCity.trim(),
        currentLocation: tCurrentLocation.trim() || tOrigin.trim() || 'Curitiba - PR',
        routeProgress: tRouteProgress,
        invoiceNumber: tInvoiceNumber.trim(),
        orderTotal: Number(tOrderTotal) || 0,
        weightKg: Number(tWeightKg) || 1.2,
        shippingLabel: tShipping.trim() || 'Correios SEDEX • Brasil Tech Express',
        statusStep: tStep,
        statusNote: tNote.trim(),
        active: tActive,
      });

      const linkedOrder = orders.find(
        (o) => o.code.toUpperCase() === tOrderCode.trim().toUpperCase()
      );
      if (linkedOrder) {
        await updateOrderAdmin(linkedOrder.code, {
          statusStep: tStep,
          trackingCode: cleanCode,
          paymentStatus: linkedOrder.paymentStatus,
        }).catch(() => undefined);
      }

      setLastSavedTrackingForActions(saved);
      onNotify(`Rastreio ${cleanCode} salvo! Agora envie no WhatsApp ou gere NF-e e Etiqueta.`);
    } catch {
      setTrackingRulesWarning(true);
      onNotify('Rastreio salvo localmente. Publique firestore.rules para sincronização global.');
    } finally {
      setBusy(false);
    }
  };

  const modalMarginPreview = (() => {
    const pr = Number(pPrice) || 0;
    const ct = Number(pCost) || 0;
    if (pr <= 0) return null;
    const profit = pr - ct;
    const pct = Math.round((profit / pr) * 100);
    return { profit, pct };
  })();

  return (
    <section className="admin-wrap">
      <div className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-logo-wrap">
            <img
              src="/src/assets/images/brasil_tech_logo_1794944707057.jpg"
              alt={storeSettings.storeName}
              referrerPolicy="no-referrer"
              className="brand-logo-img"
            />
          </div>
          <div>
            <div className="admin-kicker">🛡️ Painel Administrativo • {storeSettings.storeName}</div>
            <h1>Gestão 100% Completa do Marketplace</h1>
            <p>
              Admin: <b>{adminEmail}</b> • CNPJ: {storeSettings.cnpj} • Banco Firestore em tempo real
            </p>
          </div>
        </div>
        <div className="admin-top-actions">
          {!hasFirestoreProducts && (
            <button type="button" className="btn-yellow" disabled={busy} onClick={handleSeedCatalog}>
              ⚡ Sincronizar 26 produtos no Banco
            </button>
          )}
          <button
            type="button"
            className="pdp-back"
            onClick={() => {
              const link = `${window.location.origin}${window.location.pathname}#/entregas`;
              if (navigator.clipboard?.writeText) {
                navigator.clipboard
                  .writeText(link)
                  .then(() =>
                    onNotify('Link dos pedidos (feitos/pagos/entregues) copiado para enviar aos clientes!')
                  )
                  .catch(() => onNotify(`Link pronto: ${link}`));
              }
              onOpenOrdersShowcase?.();
            }}
          >
            🔗 Link Pedidos p/ Clientes
          </button>
          <button type="button" className="pdp-back" onClick={handleExportOrdersCsv}>
            📊 Pedidos CSV
          </button>
          <button type="button" className="pdp-back" onClick={handleExportStockCsv}>
            📦 Estoque CSV
          </button>
          {onAdminLogout && (
            <button type="button" className="pdp-back" onClick={onAdminLogout}>
              🚪 Sair Admin
            </button>
          )}
          <button type="button" className="pdp-back" onClick={onBackToStore}>
            ← Voltar para a loja
          </button>
        </div>
      </div>

      {firebaseAuthNotice && (
        <div className="admin-rules-warning" style={{ marginBottom: 14 }}>
          <strong>🔐 Modo Sessão Administrativa ({adminEmail})</strong>
          <p style={{ margin: '4px 0 8px' }}>{firebaseAuthNotice}</p>
          {onResendVerificationEmail && (
            <button
              type="button"
              className="admin-mini-btn"
              onClick={onResendVerificationEmail}
            >
              ✉️ Reenviar e-mail de verificação Firebase
            </button>
          )}
        </div>
      )}

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          📈 Financeiro & Relatórios
        </button>
        <button
          type="button"
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          📦 Produtos & Estoque ({products.length})
        </button>
        <button
          type="button"
          className={tab === 'orders' ? 'active' : ''}
          onClick={() => setTab('orders')}
        >
          🚚 Pedidos ({orders.length})
        </button>
        <button
          type="button"
          className={tab === 'trackings' ? 'active' : ''}
          onClick={() => setTab('trackings')}
        >
          📍 Rastreios ({trackings.length})
        </button>
        <button
          type="button"
          className={tab === 'customers' ? 'active' : ''}
          onClick={() => setTab('customers')}
        >
          👥 Clientes & Equipe ({customers.length})
        </button>
        <button
          type="button"
          className={tab === 'marketing' ? 'active' : ''}
          onClick={() => setTab('marketing')}
        >
          🏷️ Cupons, Dúvidas & Avaliações ({financials.pendingQuestions + financials.pendingReviews})
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          ⚙️ Config. Loja
        </button>
      </div>

      {tab === 'overview' && (
        <div className="admin-panel">
          <div className="admin-kpi-grid">
            <div className="admin-kpi">
              <small>Faturamento Bruto</small>
              <strong>{money(financials.grossRevenue)}</strong>
              <span>
                {financials.validOrdersCount} pedido(s) • Pago: {money(financials.paidRevenue)}
              </span>
            </div>
            <div className="admin-kpi green">
              <small>Lucro Líquido Estimado</small>
              <strong>{money(financials.netProfit)}</strong>
              <span>Margem média de {financials.marginPct}% após custo</span>
            </div>
            <div className="admin-kpi">
              <small>Ticket Médio</small>
              <strong>{money(financials.avgTicket)}</strong>
              <span>{financials.pendingOrdersCount} pedido(s) em andamento</span>
            </div>
            <div className="admin-kpi">
              <small>Patrimônio em Estoque</small>
              <strong>{money(financials.stockValuation)}</strong>
              <span>
                {financials.totalUnitsStock} unidades em {products.length} anúncios
              </span>
            </div>
          </div>

          <div className="checkout-card" style={{ marginBottom: 14 }}>
            <h2>Funil Operacional de Pedidos</h2>
            <div className="admin-pipeline-grid">
              {financials.orderPipeline.map((stage, idx) => (
                <div className="admin-pipeline-box" key={stage.label}>
                  <small>Etapa {idx + 1}</small>
                  <strong>{stage.count}</strong>
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-overview-grid">
            <div className="checkout-card">
              <h2>Desempenho & Estoque por Categoria</h2>
              <div className="admin-cat-bars">
                {financials.categoryStats.map((row) => {
                  const pct = Math.max(6, Math.round((row.stockValue / financials.maxStockValue) * 100));
                  return (
                    <div className="admin-cat-bar-row" key={row.cat}>
                      <div className="admin-cat-bar-head">
                        <b>
                          {row.cat} ({row.count} anúncios • {row.stockUnits} un.)
                        </b>
                        <span>{money(row.stockValue)}</span>
                      </div>
                      <div className="admin-bar-track">
                        <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="checkout-card">
              <h2>Alertas de Estoque Baixo ({financials.lowStock.length})</h2>
              {financials.lowStock.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Todos os produtos estão com estoque confortável acima de 5 unidades.
                </p>
              ) : (
                <div className="admin-alert-list">
                  {financials.lowStock.map((item) => (
                    <div className="admin-alert-item" key={item.id}>
                      <div>
                        <b>{item.name}</b>
                        <small>
                          {item.cat} • Restam {item.stock} un.
                        </small>
                      </div>
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => {
                          setTab('products');
                          openEditProductModal(item);
                        }}
                      >
                        Repor
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="admin-panel">
          <div className="admin-toolbar">
            <div className="admin-toolbar-filters">
              <input
                type="text"
                placeholder="Buscar produto por nome ou ID..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
              >
                <option value="Todos">Todas as categorias</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`admin-mini-btn ${onlyLowStock ? 'active-pill' : ''}`}
                onClick={() => setOnlyLowStock((prev) => !prev)}
              >
                ⚠️ Estoque baixo ({financials.lowStock.length})
              </button>
            </div>
            <button type="button" className="primary" onClick={() => openNewProductModal()}>
              + Novo Produto
            </button>
          </div>

          <div className="checkout-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Venda / Custo</th>
                  <th>Lucro Unit.</th>
                  <th>Destaque</th>
                  <th>Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const unitCost = costMap[p.id] ?? Math.round(p.price * 0.62);
                  const unitProfit = p.price - unitCost;
                  const delKey = `prod-${p.id}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="admin-prod-cell">
                          <img src={p.image} alt={p.name} referrerPolicy="no-referrer" />
                          <div>
                            <b>{p.name}</b>
                            <small>
                              #{p.id} • {p.sold} vendidos •{' '}
                              {p.checkoutUrl ? '🔗 Link direto configurado' : 'Sem link direto'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{p.cat}</td>
                      <td>
                        <b>{money(p.price)}</b>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>Custo: {money(unitCost)}</small>
                      </td>
                      <td style={{ color: unitProfit >= 0 ? '#138247' : '#c02626', fontWeight: 700 }}>
                        {money(unitProfit)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-mini-btn ${p.featured ? 'active-pill' : ''}`}
                          disabled={!hasFirestoreProducts}
                          onClick={async () => {
                            await saveProductAdmin(
                              { ...p, featured: !p.featured },
                              unitCost,
                              false
                            );
                            onNotify(
                              !p.featured
                                ? `${p.name} adicionado às Ofertas!`
                                : `${p.name} removido das Ofertas.`
                            );
                          }}
                        >
                          {p.featured ? '⚡ Sim' : 'Não'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-stock-ctrl">
                          <button
                            type="button"
                            disabled={!hasFirestoreProducts || p.stock <= 0}
                            onClick={async () => {
                              await adjustProductStockAdmin(p.id, p.stock - 1);
                              onNotify(`Estoque de ${p.name}: ${p.stock - 1} un.`);
                            }}
                          >
                            −
                          </button>
                          <span className={p.stock <= 5 ? 'low' : ''}>{p.stock}</span>
                          <button
                            type="button"
                            disabled={!hasFirestoreProducts}
                            onClick={async () => {
                              await adjustProductStockAdmin(p.id, p.stock + 1);
                              onNotify(`Estoque de ${p.name}: ${p.stock + 1} un.`);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => openEditProductModal(p)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => openNewProductModal(p)}
                          >
                            Duplicar
                          </button>
                          {confirmDeleteId === delKey ? (
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              disabled={!hasFirestoreProducts}
                              onClick={async () => {
                                await deleteProductAdmin(p.id);
                                setConfirmDeleteId(null);
                                onNotify(`Produto "${p.name}" excluído.`);
                              }}
                            >
                              Confirmar?
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              disabled={!hasFirestoreProducts}
                              onClick={() => setConfirmDeleteId(delKey)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="admin-panel">
          <div className="admin-toolbar">
            <div className="admin-toolbar-filters">
              <input
                type="text"
                placeholder="Buscar por #BT-..., cliente ou rastreio..."
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
              />
              <button
                type="button"
                className={`admin-mini-btn ${orderStatusFilter === 'all' ? 'active-pill' : ''}`}
                onClick={() => setOrderStatusFilter('all')}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                className={`admin-mini-btn ${orderStatusFilter === 'pending' ? 'active-pill' : ''}`}
                onClick={() => setOrderStatusFilter('pending')}
              >
                Pag. Pendente
              </button>
              <button
                type="button"
                className={`admin-mini-btn ${orderStatusFilter === 'shipping' ? 'active-pill' : ''}`}
                onClick={() => setOrderStatusFilter('shipping')}
              >
                Em envio
              </button>
              <button
                type="button"
                className={`admin-mini-btn ${orderStatusFilter === 'done' ? 'active-pill' : ''}`}
                onClick={() => setOrderStatusFilter('done')}
              >
                Entregues
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="checkout-card" style={{ textAlign: 'center', padding: 36 }}>
              <h3>Nenhum pedido encontrado</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Os pedidos finalizados no checkout pelos clientes aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) => {
                const draft = orderDrafts[order.code] || {
                  statusStep: order.statusStep,
                  trackingCode: order.trackingCode,
                  paymentStatus: order.paymentStatus,
                };
                const phoneDigits = order.customerPhone.replace(/\D/g, '');
                const waUrl = phoneDigits
                  ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(
                      `Olá ${order.customerName}! Sobre o seu pedido ${order.code} na ${storeSettings.storeName}, código de rastreio: ${draft.trackingCode}`
                    )}`
                  : '';
                const delKey = `ord-${order.code}`;

                return (
                  <div className="checkout-card" key={order.code}>
                    <div className="order-card-top">
                      <div>
                        <strong>
                          {order.code} — {order.customerName}
                        </strong>
                        <small>
                          {order.createdAt} • {order.customerEmail} • CPF: {order.customerCpf} • Tel:{' '}
                          {order.customerPhone}
                        </small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-mini-btn"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={() => setReceiptOrder(order)}
                        >
                          🖨️ Comprovante
                        </button>
                        <div className="order-total-tag">{money(order.total)}</div>
                      </div>
                    </div>

                    <div className="admin-order-items">
                      {order.items.map((it) => (
                        <span key={`${order.code}-${it.id}`}>
                          {it.qty}x {it.name} ({money(it.price)})
                        </span>
                      ))}
                      {order.couponCode && <span>🏷️ Cupom: {order.couponCode}</span>}
                    </div>

                    <div className="admin-order-edit-grid">
                      <label>
                        Etapa da entrega
                        <select
                          value={draft.statusStep}
                          onChange={(e) =>
                            setOrderDrafts((prev) => ({
                              ...prev,
                              [order.code]: { ...draft, statusStep: Number(e.target.value) },
                            }))
                          }
                        >
                          {STATUS_LABELS.map((lbl, idx) => (
                            <option key={lbl} value={idx}>
                              {idx + 1}. {lbl}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status pagamento ({order.paymentMethod.toUpperCase()})
                        <select
                          value={draft.paymentStatus}
                          onChange={(e) =>
                            setOrderDrafts((prev) => ({
                              ...prev,
                              [order.code]: {
                                ...draft,
                                paymentStatus: e.target.value as 'pending' | 'paid' | 'refunded',
                              },
                            }))
                          }
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago / Aprovado</option>
                          <option value="refunded">Cancelado / Reembolsado</option>
                        </select>
                      </label>
                      <label>
                        Código de rastreio
                        <input
                          type="text"
                          value={draft.trackingCode}
                          onChange={(e) =>
                            setOrderDrafts((prev) => ({
                              ...prev,
                              [order.code]: { ...draft, trackingCode: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="primary"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await updateOrderAdmin(order.code, draft);
                              onNotify(`Pedido ${order.code} atualizado!`);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="admin-mini-btn approve"
                          disabled={busy}
                          onClick={async () => {
                            const cleanCode = sanitizeTrackingCodeForAdmin(draft.trackingCode);
                            if (
                              !isValidTrackingCodeFormat(cleanCode) ||
                              cleanCode === 'AGUARDANDO-POSTAGEM' ||
                              cleanCode === 'AGUARDANDO-ENVIO'
                            ) {
                              onNotify(
                                'Digite um código de rastreio válido (ex: BT849201BR) antes de publicar.'
                              );
                              return;
                            }
                            setBusy(true);
                            try {
                              await updateOrderAdmin(order.code, {
                                ...draft,
                                trackingCode: cleanCode,
                              });
                              await upsertTrackingAdmin({
                                code: cleanCode,
                                orderCode: order.code,
                                customerLabel: order.customerName,
                                productSummary:
                                  order.items
                                    .map((it) => `${it.qty}x ${it.name}`)
                                    .join(', ')
                                    .slice(0, 240) || `Pedido ${order.code}`,
                                cityState: order.cityState,
                                shippingLabel: order.shippingLabel || 'Entrega Padrão Brasil Tech',
                                statusStep: draft.statusStep,
                                statusNote:
                                  STATUS_LABELS[draft.statusStep] || 'Objeto em acompanhamento',
                                active: true,
                              });
                              onNotify(
                                `Rastreio ${cleanCode} publicado para consulta exata do cliente!`
                              );
                            } catch {
                              setTrackingRulesWarning(true);
                              onNotify(
                                'Não foi possível publicar o rastreio. Verifique as regras do Firestore.'
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          📍 Publicar Rastreio
                        </button>
                        {hasFirestoreProducts && (
                          <button
                            type="button"
                            className="admin-mini-btn"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                const count = await deductOrderStockAdmin(order.items, products);
                                onNotify(`Estoque baixado para ${count} produto(s) do pedido ${order.code}.`);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Baixar Estoque
                          </button>
                        )}
                        {confirmDeleteId === delKey ? (
                          <button
                            type="button"
                            className="admin-mini-btn danger"
                            onClick={async () => {
                              await deleteOrderAdmin(order.code);
                              setConfirmDeleteId(null);
                              onNotify(`Pedido ${order.code} removido.`);
                            }}
                          >
                            Confirmar?
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-mini-btn danger"
                            onClick={() => setConfirmDeleteId(delKey)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="order-card-footer">
                      <span>
                        📍 {order.address} — {order.cityState} (CEP {order.cep})
                      </span>
                      <span>🚚 {order.shippingLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'trackings' && (
        <div className="admin-panel" style={{ display: 'grid', gap: 14 }}>
          {trackingRulesWarning && (
            <div className="tracking-not-found-box">
              <strong>Atenção: coleção de rastreios aguardando publicação das regras</strong>
              <p>
                Publique o arquivo <code>firestore.rules</code> atualizado no Console do Firebase
                para liberar a gravação e leitura exata de códigos em <code>/trackings</code>.
              </p>
            </div>
          )}

          <div className="admin-overview-grid admin-tracking-layout">
            <div className="checkout-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0 }}>Criar / Editar Rastreio Completo</h2>
                {tCode && (
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => {
                      setTCode('');
                      setTOrderCode('');
                      setTCustomer('');
                      setTCustomerCpf('');
                      setTCustomerPhone('');
                      setTCustomerCep('');
                      setTCustomerAddress('');
                      setTProduct('');
                      setTCity('');
                      setTRouteProgress(15);
                    }}
                  >
                    + Limpar
                  </button>
                )}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                Edite origem, destino, localização ao vivo, CPF, WhatsApp e gere automaticamente
                Nota Fiscal (NF-e), Etiqueta de Envio e Mapa com caminhão em tempo real.
              </p>

              {orders.length > 0 && (
                <label className="admin-prefill-select">
                  <span>Puxar dados de um pedido existente (opcional)</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handlePrefillTrackingFromOrder(e.target.value);
                    }}
                  >
                    <option value="">Selecionar pedido...</option>
                    {orders.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.code} — {o.customerName} ({o.cityState})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <form className="admin-prod-form" onSubmit={handleCreateTracking}>
                <div className="form-grid-2">
                  <label>
                    Código de rastreio exato *
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={{ flex: 1, fontWeight: 800, letterSpacing: '0.5px' }}
                        placeholder="Ex: BT849201BR"
                        value={tCode}
                        onChange={(e) => setTCode(sanitizeTrackingCodeForAdmin(e.target.value))}
                        required
                      />
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={generateSuggestedTrackingCode}
                      >
                        🎲 Gerar
                      </button>
                    </div>
                  </label>
                  <label>
                    Pedido vinculado (opcional)
                    <input
                      placeholder="Ex: BT-48210"
                      value={tOrderCode}
                      onChange={(e) => setTOrderCode(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid-2">
                  <label>
                    Nome do cliente *
                    <input
                      placeholder="Ex: Marcos Silva"
                      value={tCustomer}
                      onChange={(e) => setTCustomer(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    CPF do cliente *
                    <input
                      placeholder="000.000.000-00"
                      value={tCustomerCpf}
                      onChange={(e) => setTCustomerCpf(formatCpfMask(e.target.value))}
                      required
                    />
                  </label>
                </div>

                <div className="form-grid-2">
                  <label>
                    Telefone / WhatsApp do cliente *
                    <input
                      placeholder="(41) 99999-9999"
                      value={tCustomerPhone}
                      onChange={(e) => setTCustomerPhone(formatPhoneMask(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    CEP de destino {tCepLookupBusy ? '(Buscando...)' : ''}
                    <input
                      placeholder="01001-000"
                      value={tCustomerCep}
                      onChange={(e) => handleTrackingCepChange(e.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Endereço completo do destinatário (Rua, Nº, Bairro)
                  <input
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                    value={tCustomerAddress}
                    onChange={(e) => setTCustomerAddress(e.target.value)}
                  />
                </label>

                <div className="form-grid-2">
                  <label>
                    De onde está saindo (Origem) *
                    <input
                      placeholder="Ex: Curitiba - PR"
                      value={tOrigin}
                      onChange={(e) => setTOrigin(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Para onde vai (Destino Cidade - UF) *
                    <input
                      placeholder="Ex: São Paulo - SP"
                      value={tCity}
                      onChange={(e) => setTCity(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="admin-live-route-control">
                  <div className="admin-live-route-head">
                    <span>🚚 Controle do Caminhão em Tempo Real ({tRouteProgress}%)</span>
                    <div className="admin-route-presets">
                      {[10, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          className={`admin-mini-btn ${tRouteProgress === pct ? 'active-pill' : ''}`}
                          onClick={() => {
                            setTRouteProgress(pct);
                            if (pct === 100) setTStep(4);
                            else if (pct >= 75) setTStep(3);
                            else if (pct >= 40) setTStep(2);
                            else if (pct >= 20) setTStep(1);
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={tRouteProgress}
                    onChange={(e) => setTRouteProgress(Number(e.target.value))}
                    className="admin-route-slider"
                  />
                  <label style={{ marginTop: 8 }}>
                    Localização atual do caminhão (exibida no mapa)
                    <input
                      placeholder="Ex: Centro de Distribuição Registro - SP"
                      value={tCurrentLocation}
                      onChange={(e) => setTCurrentLocation(e.target.value)}
                    />
                  </label>
                </div>

                <LiveTrackingMap
                  originCityState={tOrigin || 'Curitiba - PR'}
                  destinationCityState={tCity || 'São Paulo - SP'}
                  currentLocation={tCurrentLocation || tOrigin || 'Curitiba - PR'}
                  routeProgress={tRouteProgress}
                  statusStep={tStep}
                  trackingCode={tCode || 'PRÉVIA'}
                  compact
                />

                <label>
                  Produto(s) enviado(s) *
                  <input
                    placeholder="Ex: 1x PlayStation 5 Mídia Digital"
                    value={tProduct}
                    onChange={(e) => setTProduct(e.target.value)}
                    required
                  />
                </label>

                <div className="form-grid-3">
                  <label>
                    Valor NF-e (R$)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tOrderTotal}
                      onChange={(e) => setTOrderTotal(e.target.value)}
                    />
                  </label>
                  <label>
                    Nº Nota Fiscal (NF-e)
                    <input
                      placeholder="Ex: 001482"
                      value={tInvoiceNumber}
                      onChange={(e) => setTInvoiceNumber(e.target.value)}
                    />
                  </label>
                  <label>
                    Peso (kg)
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={tWeightKg}
                      onChange={(e) => setTWeightKg(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid-2">
                  <label>
                    Transportadora / Modalidade
                    <input
                      placeholder="Ex: Correios SEDEX / Entrega Expressa"
                      value={tShipping}
                      onChange={(e) => setTShipping(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Etapa atual do envio
                    <select
                      value={tStep}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setTStep(next);
                        setTRouteProgress(defaultProgressFromStep(next));
                      }}
                    >
                      {STATUS_LABELS.map((lbl, idx) => (
                        <option key={lbl} value={idx}>
                          {idx + 1}. {lbl}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Observação detalhada para o cliente
                  <input
                    placeholder="Ex: Objeto postado em Curitiba/PR em direção ao destino"
                    value={tNote}
                    onChange={(e) => setTNote(e.target.value)}
                  />
                </label>

                <label className="admin-check-row">
                  <input
                    type="checkbox"
                    checked={tActive}
                    onChange={(e) => setTActive(e.target.checked)}
                  />
                  Rastreio ativo para consulta ao vivo do cliente
                </label>

                <button type="submit" className="primary" disabled={busy}>
                  {busy ? 'Salvando...' : '📍 Salvar Rastreio Completo'}
                </button>
              </form>

              {lastSavedTrackingForActions && (
                <div className="admin-tracking-saved-bar">
                  <strong>✅ Rastreio {lastSavedTrackingForActions.code} pronto!</strong>
                  <div className="admin-row-actions" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                    {normalizeWhatsAppDigits(lastSavedTrackingForActions.customerPhone || '') && (
                      <a
                        className="btn-whatsapp-mini"
                        href={`https://wa.me/${normalizeWhatsAppDigits(
                          lastSavedTrackingForActions.customerPhone || ''
                        )}?text=${encodeURIComponent(
                          buildTrackingWhatsAppMessage(
                            lastSavedTrackingForActions,
                            storeSettings.storeName
                          )
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        💬 Enviar no WhatsApp de {lastSavedTrackingForActions.customerLabel}
                      </a>
                    )}
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() =>
                        setDocModalState({ tracking: lastSavedTrackingForActions, tab: 'nfe' })
                      }
                    >
                      🧾 Gerar Nota Fiscal
                    </button>
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() =>
                        setDocModalState({ tracking: lastSavedTrackingForActions, tab: 'label' })
                      }
                    >
                      🏷️ Gerar Etiqueta de Envio
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-card">
              <div className="admin-rev-mod-head">
                <div>
                  <h2>Rastreios Ativos & Tempo Real ({filteredTrackings.length})</h2>
                  <p style={{ color: 'var(--muted)', fontSize: 12, margin: '2px 0 0' }}>
                    Arraste o caminhão em tempo real, envie no WhatsApp do cliente ou imprima a
                    NF-e e a Etiqueta.
                  </p>
                </div>
              </div>

              <div className="admin-toolbar-filters" style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Filtrar por código, cliente, CPF, produto ou cidade..."
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {filteredTrackings.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {trackings.length === 0
                    ? 'Nenhum código de rastreio criado ainda. Crie o primeiro no formulário ao lado.'
                    : 'Nenhum rastreio corresponde ao filtro digitado.'}
                </p>
              ) : (
                <div className="orders-list">
                  {filteredTrackings.map((item) => {
                    const draft = trackingDrafts[item.code] || {
                      statusStep: item.statusStep,
                      statusNote: item.statusNote,
                      shippingLabel: item.shippingLabel,
                      originCityState: item.originCityState || 'Curitiba - PR',
                      destinationCityState: item.destinationCityState || item.cityState,
                      currentLocation:
                        item.currentLocation || item.originCityState || 'Curitiba - PR',
                      routeProgress: item.routeProgress ?? defaultProgressFromStep(item.statusStep),
                      active: item.active,
                    };
                    const delKey = `trk-${item.code}`;
                    const waDigits = normalizeWhatsAppDigits(item.customerPhone || '');
                    const previewTracking: PersistedTracking = {
                      ...item,
                      statusStep: draft.statusStep,
                      statusNote: draft.statusNote,
                      shippingLabel: draft.shippingLabel,
                      originCityState: draft.originCityState,
                      destinationCityState: draft.destinationCityState,
                      cityState: draft.destinationCityState,
                      currentLocation: draft.currentLocation,
                      routeProgress: draft.routeProgress,
                      active: draft.active,
                    };
                    const waUrl = `https://wa.me/${
                      waDigits || storeSettings.whatsappDigits
                    }?text=${encodeURIComponent(
                      buildTrackingWhatsAppMessage(previewTracking, storeSettings.storeName)
                    )}`;

                    return (
                      <div className="admin-tracking-card" key={item.code}>
                        <div className="admin-tracking-head">
                          <div>
                            <div className="tracking-code-row">
                              <span className="tracking-code-pill">{item.code}</span>
                              <button
                                type="button"
                                className="admin-mini-btn"
                                onClick={() => {
                                  const link = `${window.location.origin}/#/rastreio/${item.code}`;
                                  navigator.clipboard?.writeText(link);
                                  onNotify(`Link ao vivo de ${item.code} copiado!`);
                                }}
                              >
                                🔗 Link Mapa
                              </button>
                              <button
                                type="button"
                                className="admin-mini-btn"
                                onClick={() => handleEditExistingTrackingInForm(item)}
                              >
                                ✏️ Editar Completo
                              </button>
                              <span
                                className={`admin-rev-badge ${
                                  draft.active ? 'status-approved' : 'status-rejected'
                                }`}
                              >
                                {draft.active ? 'Ativo' : 'Oculto'}
                              </span>
                            </div>
                            <b style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                              {item.productSummary}
                            </b>
                            <small style={{ color: 'var(--muted)', fontSize: 11.5 }}>
                              {item.customerLabel}
                              {item.customerCpf || item.maskedCpf
                                ? ` • CPF ${item.customerCpf || item.maskedCpf}`
                                : ''}
                              {item.customerPhone ? ` • 📱 ${item.customerPhone}` : ''}
                            </small>
                            <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11.5 }}>
                              Rota: <b>{draft.originCityState}</b> ➔{' '}
                              <b>{draft.destinationCityState}</b> • Atual:{' '}
                              <b>{draft.currentLocation}</b> ({draft.routeProgress}%)
                            </small>
                          </div>
                        </div>

                        <div className="admin-live-route-control" style={{ marginTop: 8 }}>
                          <div className="admin-live-route-head">
                            <span>🚚 Posição ao vivo do caminhão: {draft.routeProgress}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={draft.routeProgress}
                            onChange={(e) => {
                              const nextPct = Number(e.target.value);
                              setTrackingDrafts((prev) => ({
                                ...prev,
                                [item.code]: { ...draft, routeProgress: nextPct },
                              }));
                            }}
                            className="admin-route-slider"
                          />
                        </div>

                        <div className="admin-tracking-edit-grid">
                          <label>
                            Origem
                            <input
                              value={draft.originCityState}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: { ...draft, originCityState: e.target.value },
                                }))
                              }
                            />
                          </label>
                          <label>
                            Destino
                            <input
                              value={draft.destinationCityState}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: { ...draft, destinationCityState: e.target.value },
                                }))
                              }
                            />
                          </label>
                          <label>
                            Local atual (GPS)
                            <input
                              value={draft.currentLocation}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: { ...draft, currentLocation: e.target.value },
                                }))
                              }
                            />
                          </label>
                          <label>
                            Etapa
                            <select
                              value={draft.statusStep}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    ...draft,
                                    statusStep: Number(e.target.value),
                                  },
                                }))
                              }
                            >
                              {STATUS_LABELS.map((lbl, idx) => (
                                <option key={lbl} value={idx}>
                                  {idx + 1}. {lbl}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="span-2">
                            Observação da entrega
                            <input
                              value={draft.statusNote}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: { ...draft, statusNote: e.target.value },
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="admin-tracking-doc-bar">
                          <a
                            className="btn-whatsapp-mini"
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            💬 Enviar WhatsApp {waDigits ? `(${item.customerPhone})` : ''}
                          </a>
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => setDocModalState({ tracking: previewTracking, tab: 'nfe' })}
                          >
                            🧾 Nota Fiscal
                          </button>
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() =>
                              setDocModalState({ tracking: previewTracking, tab: 'label' })
                            }
                          >
                            🏷️ Etiqueta
                          </button>
                        </div>

                        <div className="admin-tracking-actions">
                          <label className="admin-check-row" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={draft.active}
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: { ...draft, active: e.target.checked },
                                }))
                              }
                            />
                            Público
                          </label>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-mini-btn approve"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await upsertTrackingAdmin({
                                    code: item.code,
                                    orderCode: item.orderCode,
                                    customerLabel: item.customerLabel,
                                    customerCpf: item.customerCpf,
                                    customerPhone: item.customerPhone,
                                    customerAddress: item.customerAddress,
                                    customerCep: item.customerCep,
                                    productSummary: item.productSummary,
                                    cityState: draft.destinationCityState,
                                    originCityState: draft.originCityState,
                                    destinationCityState: draft.destinationCityState,
                                    currentLocation: draft.currentLocation,
                                    routeProgress: draft.routeProgress,
                                    invoiceNumber: item.invoiceNumber,
                                    orderTotal: item.orderTotal,
                                    weightKg: item.weightKg,
                                    shippingLabel: draft.shippingLabel,
                                    statusStep: draft.statusStep,
                                    statusNote: draft.statusNote,
                                    active: draft.active,
                                  });
                                  onNotify(`Caminhão & rastreio ${item.code} atualizados ao vivo!`);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              💾 Atualizar Ao Vivo
                            </button>
                            {confirmDeleteId === delKey ? (
                              <button
                                type="button"
                                className="admin-mini-btn danger"
                                onClick={async () => {
                                  await deleteTrackingAdmin(item.code);
                                  setConfirmDeleteId(null);
                                  onNotify(`Rastreio ${item.code} removido.`);
                                }}
                              >
                                Confirmar?
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-mini-btn danger"
                                onClick={() => setConfirmDeleteId(delKey)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {docModalState && (
            <TrackingDocumentsModal
              tracking={docModalState.tracking}
              storeSettings={storeSettings}
              initialTab={docModalState.tab}
              onClose={() => setDocModalState(null)}
            />
          )}
        </div>
      )}

      {tab === 'customers' && (
        <div className="admin-overview-grid">
          <div className="checkout-card">
            <h2>Clientes Cadastrados ({customers.length})</h2>
            {customers.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Nenhum cliente registrado no Firestore ainda.
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>CEP</th>
                      <th>Pedidos</th>
                      <th>Total Comprado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => {
                      const userOrders = orders.filter((o) => o.userId === c.uid);
                      const spent = userOrders.reduce((s, o) => s + o.total, 0);
                      return (
                        <tr key={c.uid}>
                          <td>
                            <b>{c.name}</b>
                            <br />
                            <small style={{ color: 'var(--muted)' }}>{c.email}</small>
                          </td>
                          <td>{c.cep || '—'}</td>
                          <td>{userOrders.length}</td>
                          <td>
                            <b>{money(spent)}</b>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="checkout-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <h2 style={{ margin: 0 }}>Newsletter ({newsletterList.length})</h2>
                {newsletterList.length > 0 && (
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => {
                      navigator.clipboard?.writeText(newsletterList.map((n) => n.email).join(', '));
                      onNotify('Lista de e-mails copiada!');
                    }}
                  >
                    Copiar e-mails
                  </button>
                )}
              </div>
              {newsletterList.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nenhum inscrito sincronizado ainda.
                </p>
              ) : (
                <div className="admin-alert-list">
                  {newsletterList.map((n) => (
                    <div className="admin-alert-item" key={n.docId}>
                      <span>{n.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isBootstrappedAdmin && (
              <div className="checkout-card">
                <h2>Equipe Administradora</h2>
                <form className="admin-coupon-form" onSubmit={handleAddAdmin}>
                  <input
                    type="text"
                    placeholder="UID do usuário Firebase"
                    value={newAdminUid}
                    onChange={(e) => setNewAdminUid(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="E-mail Google do admin"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="primary" disabled={busy}>
                    Adicionar Administrador
                  </button>
                </form>
                <div className="admin-alert-list" style={{ marginTop: 12 }}>
                  <div className="admin-alert-item">
                    <div>
                      <b>brasilgames@gmail.com</b>
                      <small>Proprietário Principal (Permanente)</small>
                    </div>
                  </div>
                  <div className="admin-alert-item">
                    <div>
                      <b>lucasluft2025@gmail.com</b>
                      <small>Proprietário Google Principal (Permanente)</small>
                    </div>
                  </div>
                  <div className="admin-alert-item">
                    <div>
                      <b>luft446@gmail.com</b>
                      <small>Proprietário Google Secundário (Permanente)</small>
                    </div>
                  </div>
                  {adminUsers.map((adm) => (
                    <div className="admin-alert-item" key={adm.uid}>
                      <div>
                        <b>{adm.email}</b>
                        <small>UID: {adm.uid}</small>
                      </div>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={async () => {
                          await removeAdminUser(adm.uid);
                          onNotify(`Acesso de ${adm.email} removido.`);
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'marketing' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="admin-overview-grid">
            <div className="checkout-card">
              <h2>Cupons de Desconto</h2>
              <form className="admin-coupon-form" onSubmit={handleCreateCoupon}>
                <input
                  type="text"
                  placeholder="Código (ex: NATAL15)"
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value)}
                  required
                />
                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value as 'percent' | 'fixed')}
                >
                  <option value="percent">% Percentual</option>
                  <option value="fixed">R$ Fixo</option>
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Valor"
                  value={cValue}
                  onChange={(e) => setCValue(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={cLabel}
                  onChange={(e) => setCLabel(e.target.value)}
                />
                <button type="submit" className="primary" disabled={busy}>
                  Salvar Cupom
                </button>
              </form>

              <div className="admin-alert-list" style={{ marginTop: 14 }}>
                {coupons.map((c) => (
                  <div className="admin-alert-item" key={c.code}>
                    <div>
                      <b>
                        {c.code} — {c.type === 'percent' ? `${c.value}%` : money(c.value)}
                      </b>
                      <small>
                        {c.label} • {c.active ? 'Ativo' : 'Pausado'}
                      </small>
                    </div>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={async () => {
                          await saveCouponAdmin({ ...c, active: !c.active }, false);
                          onNotify(`Cupom ${c.code} ${!c.active ? 'ativado' : 'pausado'}.`);
                        }}
                      >
                        {c.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={async () => {
                          await deleteCouponAdmin(c.code);
                          onNotify(`Cupom ${c.code} excluído.`);
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="checkout-card">
              <h2>Perguntas dos Clientes ({questions.length})</h2>
              {questions.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nenhuma pergunta enviada nos produtos ainda.
                </p>
              ) : (
                <div className="admin-alert-list">
                  {questions.map((q) => (
                    <div className="admin-qa-card" key={q.docId}>
                      <div className="admin-qa-head">
                        <b>{q.productName}</b>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={q.answered ? 'ok' : 'wait'}>
                            {q.answered ? 'Respondida' : 'Aguardando'}
                          </span>
                          <button
                            type="button"
                            className="admin-mini-btn danger"
                            onClick={async () => {
                              await deleteQuestionAdmin(q.docId);
                              onNotify('Pergunta removida.');
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="q-text">
                        <strong>{q.authorName}:</strong> {q.question}
                      </p>
                      <div className="admin-qa-reply">
                        <input
                          type="text"
                          placeholder={`Digite a resposta oficial da ${storeSettings.storeName}...`}
                          value={answerDrafts[q.docId] ?? q.answer}
                          onChange={(e) =>
                            setAnswerDrafts((prev) => ({ ...prev, [q.docId]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={async () => {
                            const text = (answerDrafts[q.docId] ?? q.answer).trim();
                            if (!text) return;
                            await answerQuestionAdmin(q.docId, text);
                            onNotify('Resposta publicada na página do produto!');
                          }}
                        >
                          Responder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="checkout-card">
            <div className="admin-rev-mod-head">
              <div>
                <h2>Moderação de Avaliações ({reviews.length})</h2>
                <p style={{ color: 'var(--muted)', fontSize: 12, margin: '2px 0 0' }}>
                  Avaliações enviadas pelos clientes ficam ocultas até você aprovar ou recusar.
                </p>
              </div>
              <div className="admin-rev-filter-pills">
                {[
                  { key: 'all' as const, label: `Todas (${reviews.length})` },
                  {
                    key: 'pending' as const,
                    label: `⏳ Pendentes (${reviews.filter((r) => r.status === 'pending').length})`,
                  },
                  {
                    key: 'approved' as const,
                    label: `✓ Aprovadas (${reviews.filter((r) => r.status === 'approved').length})`,
                  },
                  {
                    key: 'rejected' as const,
                    label: `✕ Recusadas (${reviews.filter((r) => r.status === 'rejected').length})`,
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`admin-mini-btn ${reviewStatusFilter === opt.key ? 'active-pill' : ''}`}
                    onClick={() => setReviewStatusFilter(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filteredAdminReviews = [...reviews]
                .filter((r) => reviewStatusFilter === 'all' || r.status === reviewStatusFilter)
                .sort((a, b) => {
                  const weight = { pending: 0, approved: 1, rejected: 2 };
                  if (weight[a.status] !== weight[b.status]) return weight[a.status] - weight[b.status];
                  return b.id - a.id;
                });

              if (filteredAdminReviews.length === 0) {
                return (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {reviews.length === 0
                      ? 'Nenhuma avaliação enviada pelos clientes para moderar no momento.'
                      : 'Nenhuma avaliação encontrada neste filtro.'}
                  </p>
                );
              }

              return (
                <div className="admin-alert-list">
                  {filteredAdminReviews.map((rev) => (
                    <div className={`admin-alert-item admin-rev-row status-${rev.status}`} key={rev.docId}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="admin-rev-meta-row">
                          <span className={`admin-rev-badge status-${rev.status}`}>
                            {rev.status === 'approved'
                              ? '✓ Aprovada'
                              : rev.status === 'rejected'
                                ? '✕ Recusada'
                                : '⏳ Aguardando aprovação'}
                          </span>
                          <span className="pdp-review-stars">{'★'.repeat(rev.rating)}</span>
                          <b>
                            {rev.author} — {rev.product}
                          </b>
                        </div>
                        <p className="admin-rev-comment">“{rev.comment}”</p>
                        <small>Enviada em {rev.date}</small>
                      </div>
                      <div className="admin-row-actions" style={{ flexWrap: 'wrap' }}>
                        {rev.status !== 'approved' && (
                          <button
                            type="button"
                            className="admin-mini-btn approve"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await moderateReviewAdmin(rev.docId, 'approved');
                                onNotify('Avaliação aprovada e publicada na página do produto!');
                              } catch {
                                onNotify('Não foi possível aprovar agora. Verifique as regras do Firestore.');
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            ✓ Aprovar
                          </button>
                        )}
                        {rev.status !== 'rejected' && (
                          <button
                            type="button"
                            className="admin-mini-btn reject"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await moderateReviewAdmin(rev.docId, 'rejected');
                                onNotify('Avaliação recusada e ocultada da loja.');
                              } catch {
                                onNotify('Não foi possível recusar agora. Verifique as regras do Firestore.');
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            ✕ Recusar
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-mini-btn danger"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await deleteReviewAdmin(rev.docId);
                              onNotify('Avaliação removida.');
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="checkout-card">
          <h2>Dados Oficiais, Frete & Pagamento da Loja</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
            Estas informações aparecem automaticamente no rodapé, atendimento WhatsApp, cálculo de
            frete e comprovantes PIX.
          </p>
          <form className="admin-prod-form" onSubmit={handleSaveSettings}>
            <div className="form-grid-2">
              <label>
                Nome da loja
                <input
                  value={settingsDraft.storeName}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, storeName: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                CNPJ oficial
                <input
                  value={settingsDraft.cnpj}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, cnpj: e.target.value }))}
                  required
                />
              </label>
              <label>
                Endereço físico
                <input
                  value={settingsDraft.address}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, address: e.target.value }))}
                  required
                />
              </label>
              <label>
                E-mail de atendimento
                <input
                  type="email"
                  value={settingsDraft.email}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, email: e.target.value }))}
                  required
                />
              </label>
              <label>
                Telefone exibido
                <input
                  value={settingsDraft.phone}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
              </label>
              <label>
                Número WhatsApp (somente dígitos com DDI 55)
                <input
                  value={settingsDraft.whatsappDigits}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, whatsappDigits: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <div className="form-grid-4">
              <label>
                Frete Express (Mesmo dia R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsDraft.expressShippingPrice}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      expressShippingPrice: Number(e.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label>
                Frete Padrão (2 dias R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsDraft.standardShippingPrice}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      standardShippingPrice: Number(e.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label>
                Desconto no PIX (%)
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={settingsDraft.pixDiscountPercent}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      pixDiscountPercent: Number(e.target.value),
                    }))
                  }
                  required
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button type="submit" className="primary" style={{ width: '100%' }} disabled={busy}>
                  Salvar Configurações
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Criar/Editar Produto */}
      {editingProduct && (
        <div
          className="modal-wrap show"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProduct(null);
          }}
        >
          <div className="modal admin-modal">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>
                {isNewProduct ? 'Cadastrar Novo Produto' : `Editar #${editingProduct.id}`}
              </h2>
              <button type="button" className="x" onClick={() => setEditingProduct(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="admin-prod-form">
              <div className="admin-img-preview-row">
                <img src={pImage} alt="Prévia" referrerPolicy="no-referrer" />
                <div style={{ flex: 1 }}>
                  <div className="form-grid-2">
                    <label>
                      Nome do produto *
                      <input value={pName} onChange={(e) => setPName(e.target.value)} required />
                    </label>
                    <label>
                      Categoria *
                      <select value={pCat} onChange={(e) => setPCat(e.target.value)}>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {modalMarginPreview && (
                    <div className="admin-margin-badge">
                      Lucro unitário previsto: <b>{money(modalMarginPreview.profit)}</b> (
                      {modalMarginPreview.pct}% de margem)
                    </div>
                  )}
                </div>
              </div>
              <div className="form-grid-4">
                <label>
                  Preço venda (R$) *
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Preço antigo (R$)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pOld}
                    onChange={(e) => setPOld(e.target.value)}
                  />
                </label>
                <label>
                  Custo atacado (R$)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pCost}
                    onChange={(e) => setPCost(e.target.value)}
                  />
                </label>
                <label>
                  Estoque (un.)
                  <input
                    type="number"
                    min="0"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                  />
                </label>
              </div>
              <div className="form-grid-2">
                <label>
                  Condição
                  <input value={pCondition} onChange={(e) => setPCondition(e.target.value)} />
                </label>
                <label>
                  Garantia
                  <input value={pWarranty} onChange={(e) => setPWarranty(e.target.value)} />
                </label>
              </div>
              <div className="form-grid-2">
                <label>
                  Imagem principal (caminho ou URL)
                  <input value={pImage} onChange={(e) => setPImage(e.target.value)} required />
                </label>
                <label>
                  Emoji fallback & Vendidos
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ width: 70 }}
                      value={pEmoji}
                      onChange={(e) => setPEmoji(e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      value={pSold}
                      onChange={(e) => setPSold(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              <label>
                Link direto de compra do produto (Mini Checkout)
                <input
                  type="text"
                  inputMode="url"
                  placeholder="https://pay.seulink.com/produto"
                  value={pCheckoutUrl}
                  onChange={(e) => setPCheckoutUrl(e.target.value)}
                />
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Ao clicar em &quot;Ir para a compra&quot; no mini checkout, o cliente será
                  direcionado para este link.
                </small>
              </label>
              <label>
                Galeria de fotos (1 URL por linha)
                <textarea rows={2} value={pGallery} onChange={(e) => setPGallery(e.target.value)} />
              </label>
              <label>
                Descrição do anúncio
                <textarea rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
              </label>
              <label>
                Ficha técnica (Ex: Armazenamento: 825 GB SSD, 1 por linha)
                <textarea
                  rows={2}
                  value={pSpecsText}
                  onChange={(e) => setPSpecsText(e.target.value)}
                />
              </label>
              <label className="admin-check-row">
                <input
                  type="checkbox"
                  checked={pFeatured}
                  onChange={(e) => setPFeatured(e.target.checked)}
                />
                Exibir em Ofertas em Destaque na Home
              </label>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Salvando...' : 'Salvar Produto no Firestore'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Comprovante de Pedido para Impressão */}
      {receiptOrder && (
        <div
          className="modal-wrap show"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptOrder(null);
          }}
        >
          <div className="modal admin-modal">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Comprovante {receiptOrder.code}</h2>
              <button type="button" className="x" onClick={() => setReceiptOrder(null)}>
                ✕
              </button>
            </div>
            <div className="receipt-box">
              <p>
                <b>{storeSettings.storeName}</b> • CNPJ: {storeSettings.cnpj}
                <br />
                {storeSettings.address} • {storeSettings.phone} • {storeSettings.email}
              </p>
              <hr />
              <p>
                <b>Cliente:</b> {receiptOrder.customerName} ({receiptOrder.customerCpf})
                <br />
                <b>Entrega:</b> {receiptOrder.address} — {receiptOrder.cityState} (CEP{' '}
                {receiptOrder.cep})
                <br />
                <b>Rastreio:</b> {receiptOrder.trackingCode} • <b>Status:</b>{' '}
                {STATUS_LABELS[receiptOrder.statusStep]}
              </p>
              <hr />
              {receiptOrder.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {it.qty}x {it.name}
                  </span>
                  <b>{money(it.price * it.qty)}</b>
                </div>
              ))}
              <hr />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                <b>Total do Pedido:</b>
                <b>{money(receiptOrder.total)}</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" className="primary" onClick={() => window.print()}>
                🖨️ Imprimir / Salvar PDF
              </button>
              <button type="button" className="pdp-back" onClick={() => setReceiptOrder(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
