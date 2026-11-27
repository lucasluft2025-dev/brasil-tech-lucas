import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  CreditCard,
  Gamepad2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
} from 'lucide-react';
import {
  DEFAULT_BANNERS,
  DEFAULT_CATEGORIES,
  MarketplaceOrder,
  MarketplaceProduct,
  StoreBanner,
  StoreCategory,
  deriveProductMeta,
  money,
} from '../data/marketplaceCatalog';
import { StoreSettings } from '../services/firestoreStore';
import { VisitorRegion } from '../services/regionLookup';
import { ClientTrustBar } from './ClientTrustBar';
import { ProductCard } from './ProductCard';

export type FeaturedTabKey = 'bestsellers' | 'new' | 'smartphones' | 'gamer' | 'deals';

export type ShowcaseNavTarget =
  | 'iphones'
  | 'android'
  | 'playstation'
  | 'xbox'
  | 'gamer'
  | 'acessorios'
  | 'ofertas'
  | 'lancamentos';

interface HomeShowcaseProps {
  products: MarketplaceProduct[];
  banners: StoreBanner[];
  categories: StoreCategory[];
  storeSettings: StoreSettings;
  liveOrders: MarketplaceOrder[];
  favorites: Set<number>;
  failedImages: Set<number>;
  installmentsMax: number;
  visitorRegion: VisitorRegion | null;
  searchTerm: string;
  onlyFavorites: boolean;
  onClearSearchAndFavs: () => void;
  onNavigateDivision: (target: ShowcaseNavTarget) => void;
  onSelectCategoryFilter: (catName: string) => void;
  onOpenProduct: (id: number) => void;
  onToggleFav: (id: number) => void;
  onAddCart: (id: number) => void;
  onBuyNow: (id: number) => void;
  onImageError: (id: number) => void;
  onOpenTracking: (code: string) => void;
  onOpenOrderShowcase: (code?: string) => void;
  onGoTrackingLookup: () => void;
  onOpenSecurityPage: () => void;
}

const BESTSELLER_TABS: Array<{ key: FeaturedTabKey; label: string }> = [
  { key: 'bestsellers', label: 'Mais vendidos' },
  { key: 'new', label: 'Lançamentos' },
  { key: 'smartphones', label: 'Smartphones' },
  { key: 'gamer', label: 'Videogames' },
];

export function HomeShowcase({
  products,
  banners,
  categories,
  storeSettings,
  liveOrders,
  favorites,
  failedImages,
  installmentsMax,
  visitorRegion,
  searchTerm,
  onlyFavorites,
  onClearSearchAndFavs,
  onNavigateDivision,
  onSelectCategoryFilter,
  onOpenProduct,
  onToggleFav,
  onAddCart,
  onBuyNow,
  onImageError,
  onOpenTracking,
  onOpenOrderShowcase,
  onGoTrackingLookup,
  onOpenSecurityPage,
}: HomeShowcaseProps) {
  const [catalogTab, setCatalogTab] = useState<FeaturedTabKey>('bestsellers');

  const activeBanners = useMemo(() => {
    return (banners.length > 0 ? banners : DEFAULT_BANNERS)
      .filter((b) => b.active)
      .sort((a, b) => a.order - b.order);
  }, [banners]);

  const heroBanner = useMemo(
    () => activeBanners.find((b) => b.slot === 'hero') || DEFAULT_BANNERS[0],
    [activeBanners]
  );

  const secondaryBanners = useMemo(
    () => activeBanners.filter((b) => b.slot === 'secondary').slice(0, 3),
    [activeBanners]
  );

  const visibleCategories = useMemo(() => {
    return (categories.length > 0 ? categories : DEFAULT_CATEGORIES)
      .filter((c) => c.active)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  // 1. Ofertas em destaque (visíveis logo na primeira dobra/topo)
  const featuredDeals = useMemo(() => {
    return [...products]
      .filter((p) => p.old > p.price)
      .sort((a, b) => (1 - b.price / b.old) - (1 - a.price / a.old) || b.sold - a.sold)
      .slice(0, 4);
  }, [products]);

  // 2. Produtos Mais Vendidos / Lançamentos / Segmentos
  const catalogShowcaseProducts = useMemo(() => {
    switch (catalogTab) {
      case 'new':
        return [...products]
          .sort(
            (a, b) =>
              Number(deriveProductMeta(b).isNewArrival) -
                Number(deriveProductMeta(a).isNewArrival) || b.id - a.id
          )
          .slice(0, 8);
      case 'smartphones':
        return [...products]
          .filter((p) => deriveProductMeta(p).division === 'mobile')
          .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
          .slice(0, 8);
      case 'gamer':
        return [...products]
          .filter((p) => deriveProductMeta(p).division === 'gamer')
          .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
          .slice(0, 8);
      case 'bestsellers':
      default:
        return [...products].sort((a, b) => b.sold - a.sold).slice(0, 8);
    }
  }, [products, catalogTab]);

  // 3. Vitrine dedicada de iPhones (referência iPlace)
  const iphoneShowcaseProducts = useMemo(() => {
    return [...products]
      .filter((p) => p.name.toLowerCase().includes('iphone'))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
      .slice(0, 4);
  }, [products]);

  // 4. Vitrine dedicada de Videogames (PlayStation, Xbox e Controles)
  const gamerShowcaseProducts = useMemo(() => {
    return [...products]
      .filter((p) => deriveProductMeta(p).division === 'gamer')
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
      .slice(0, 4);
  }, [products]);

  // Busca ou Favoritos ativos
  const searchOrFavoriteResults = useMemo(() => {
    if (!searchTerm && !onlyFavorites) return null;
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (onlyFavorites && !favorites.has(p.id)) return false;
      if (!q) return true;
      const meta = deriveProductMeta(p);
      return `${p.name} ${p.cat} ${meta.brand} ${meta.subCategory} ${meta.storage} ${p.desc}`
        .toLowerCase()
        .includes(q);
    });
  }, [products, searchTerm, onlyFavorites, favorites]);

  const handleBannerTarget = (b: StoreBanner) => {
    if (b.targetDivision === 'iphones') onNavigateDivision('iphones');
    else if (b.targetDivision === 'android') onNavigateDivision('android');
    else if (b.targetDivision === 'ofertas') onNavigateDivision('ofertas');
    else if (b.targetDivision === 'gamer') {
      if (b.targetCategory === 'PlayStation') onNavigateDivision('playstation');
      else if (b.targetCategory === 'Xbox') onNavigateDivision('xbox');
      else if (b.targetCategory === 'Acessórios') onNavigateDivision('acessorios');
      else onNavigateDivision('gamer');
    } else {
      onNavigateDivision('ofertas');
    }
  };

  const handleCategoryCardClick = (cat: StoreCategory) => {
    const slug = cat.slug.toLowerCase();
    if (slug.includes('iphone')) onNavigateDivision('iphones');
    else if (slug.includes('android')) onNavigateDivision('android');
    else if (slug.includes('playstation')) onNavigateDivision('playstation');
    else if (slug.includes('xbox')) onNavigateDivision('xbox');
    else if (slug.includes('acessorio')) onNavigateDivision('acessorios');
    else if (cat.division === 'gamer') onSelectCategoryFilter(cat.name);
    else onNavigateDivision('gamer');
  };

  const whatsappDirectUrl = `https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
    `Olá equipe ${storeSettings.storeName}! Estou no site e gostaria de atendimento para escolher um aparelho.`
  )}`;

  const scrollToOfertas = () => {
    const el = document.getElementById('ofertas-destaque');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onNavigateDivision('ofertas');
    }
  };

  return (
    <div className="bg-white">
      {/* Resultados de Busca / Favoritos quando ativos */}
      {searchOrFavoriteResults && (
        <section className="max-w-7xl mx-auto px-4 pt-6 pb-10 border-b border-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-950">
                {onlyFavorites
                  ? `Meus Favoritos (${searchOrFavoriteResults.length})`
                  : `Resultados para "${searchTerm}" (${searchOrFavoriteResults.length})`}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Clique em qualquer item para conferir ficha técnica, bateria, garantia e PIX.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearSearchAndFavs}
              className="min-h-[40px] px-4 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800"
            >
              Voltar para a loja completa
            </button>
          </div>

          {searchOrFavoriteResults.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-zinc-700">
                Nenhum produto encontrado para essa seleção.
              </p>
              <button
                type="button"
                onClick={onClearSearchAndFavs}
                className="mt-4 px-5 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {searchOrFavoriteResults.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFavorite={favorites.has(p.id)}
                  imageFailed={failedImages.has(p.id)}
                  installmentsMax={installmentsMax}
                  onOpenProduct={onOpenProduct}
                  onToggleFav={onToggleFav}
                  onAddCart={onAddCart}
                  onBuyNow={onBuyNow}
                  onImageError={onImageError}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* MOBILE PRIMEIRA DOBRA ULTRA-RÁPIDA: Oferta + Atalhos diretos sem empurrar produtos para baixo */}
      {!searchOrFavoriteResults && (
        <section className="md:hidden max-w-7xl mx-auto px-3 pt-3 pb-1 space-y-2.5">
          <div className="bg-zinc-950 text-white rounded-xl p-3.5 flex flex-col gap-2.5 border border-zinc-800">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-lime-400 uppercase tracking-wide">
                <ShieldCheck size={12} className="shrink-0" />
                <span>Garantia Real · PIX &amp; Parcelamento</span>
              </div>
              <h1 className="text-[15px] font-extrabold leading-snug tracking-tight mt-1">
                iPhones, Samsung, PlayStation e Xbox com envio imediato
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigateDivision('iphones')}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-lime-400 text-zinc-950 text-xs font-extrabold whitespace-nowrap"
              >
                Ver iPhones
              </button>
              <button
                type="button"
                onClick={() => onNavigateDivision('gamer')}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs font-semibold whitespace-nowrap"
              >
                Área Videogames
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
            aria-label="Atalhos rápidos de categorias"
          >
            {[
              { label: 'Ofertas', dest: 'ofertas' as ShowcaseNavTarget, highlight: true },
              { label: 'iPhones', dest: 'iphones' as ShowcaseNavTarget },
              { label: 'Samsung & Android', dest: 'android' as ShowcaseNavTarget },
              { label: 'PlayStation', dest: 'playstation' as ShowcaseNavTarget },
              { label: 'Xbox', dest: 'xbox' as ShowcaseNavTarget },
              { label: 'Lançamentos', dest: 'lancamentos' as ShowcaseNavTarget },
              { label: 'Acessórios', dest: 'acessorios' as ShowcaseNavTarget },
            ].map((pill) => (
              <button
                key={pill.dest}
                type="button"
                onClick={() => onNavigateDivision(pill.dest)}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold whitespace-nowrap shrink-0 border transition-colors ${
                  pill.highlight
                    ? 'bg-lime-400 border-lime-500 text-zinc-950'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800 active:bg-lime-50'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. BANNER PROMOCIONAL PRINCIPAL DESKTOP (Estilo iPlace: limpo, direto e focado em conversão) */}
      {!searchOrFavoriteResults && (
        <section className="hidden md:block max-w-7xl mx-auto px-4 pt-5 pb-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center bg-zinc-50 border border-zinc-200 rounded-2xl p-7 lg:p-10">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lime-800">
                <ShieldCheck size={15} className="text-lime-700" />
                <span>{heroBanner.badge}</span>
              </div>

              <h1 className="text-3xl lg:text-[40px] font-extrabold text-zinc-950 tracking-tight leading-[1.12] text-balance">
                {heroBanner.title}
              </h1>

              <p className="text-sm lg:text-base text-zinc-600 leading-relaxed max-w-xl">
                {heroBanner.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={scrollToOfertas}
                  className="min-h-[46px] px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-sm font-extrabold inline-flex items-center gap-2 transition-colors shadow-xs"
                >
                  <Tag size={16} />
                  <span>Ver Ofertas em Destaque</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('iphones')}
                  className="min-h-[46px] px-5 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors"
                >
                  <Smartphone size={16} />
                  <span>Vitrine iPhones</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('gamer')}
                  className="min-h-[46px] px-4 py-3 rounded-xl border border-zinc-300 bg-white hover:border-zinc-950 text-zinc-900 text-sm font-bold inline-flex items-center gap-2 transition-colors"
                >
                  <Gamepad2 size={16} />
                  <span>Área Gamer</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-200 text-xs text-zinc-600">
                <div>
                  <strong className="block text-zinc-950 font-bold">Garantia Real</strong>
                  <span>90 dias a 12 meses</span>
                </div>
                <div>
                  <strong className="block text-zinc-950 font-bold">PIX e Parcelado</strong>
                  <span>Condições transparentes</span>
                </div>
                <div>
                  <strong className="block text-zinc-950 font-bold">
                    {visitorRegion?.city || 'Envio Nacional'}
                  </strong>
                  <span>Rastreamento em tempo real</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden aspect-[16/10] shadow-xs">
                <img
                  src={heroBanner.image}
                  alt={heroBanner.title}
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BLOCO DE FLUXO COMERCIAL DE ALTA CONVERSÃO */}
      <div className="flex flex-col">
        {/* 4. OFERTAS EM DESTAQUE — visível logo no topo mobile e imediatamente após o banner no desktop */}
        {featuredDeals.length > 0 && (
          <section
            id="ofertas-destaque"
            className="order-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 pb-6 md:py-7"
          >
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-lime-800 mb-0.5">
                  <Tag size={12} />
                  <span>Oportunidades com preço reduzido no PIX</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                  Ofertas em destaque
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateDivision('ofertas')}
                className="text-xs sm:text-sm font-bold text-lime-800 hover:text-zinc-950 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Ver todas as ofertas</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
              {featuredDeals.map((p) => (
                <ProductCard
                  key={`deal-${p.id}`}
                  product={p}
                  isFavorite={favorites.has(p.id)}
                  imageFailed={failedImages.has(p.id)}
                  installmentsMax={installmentsMax}
                  onOpenProduct={onOpenProduct}
                  onToggleFav={onToggleFav}
                  onAddCart={onAddCart}
                  onBuyNow={onBuyNow}
                  onImageError={onImageError}
                />
              ))}
            </div>
          </section>
        )}

        {/* 5. PRODUTOS MAIS VENDIDOS & LANÇAMENTOS */}
        <section
          className="order-2 max-w-7xl w-full mx-auto px-3 sm:px-4 py-6 md:py-8 border-t border-zinc-100"
          id="mais-vendidos"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-5">
            <div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                Produtos mais vendidos
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Escolha os campeões de procura ou filtre por lançamentos, smartphones e videogames.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filtrar vitrine principal"
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar"
            >
              {BESTSELLER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={catalogTab === t.key}
                  onClick={() => setCatalogTab(t.key)}
                  className={`min-h-[36px] sm:min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-[11.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    catalogTab === t.key
                      ? 'bg-zinc-950 text-lime-400'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onNavigateDivision('lancamentos')}
                className="min-h-[36px] sm:min-h-[38px] px-3 py-1.5 rounded-lg bg-lime-50 border border-lime-300 text-lime-900 hover:bg-lime-100 text-[11.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1"
              >
                <Sparkles size={12} />
                <span>Ver Lançamentos</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {catalogShowcaseProducts.map((p) => (
              <ProductCard
                key={`best-${p.id}`}
                product={p}
                isFavorite={favorites.has(p.id)}
                imageFailed={failedImages.has(p.id)}
                installmentsMax={installmentsMax}
                onOpenProduct={onOpenProduct}
                onToggleFav={onToggleFav}
                onAddCart={onAddCart}
                onBuyNow={onBuyNow}
                onImageError={onImageError}
              />
            ))}
          </div>
        </section>

        {/* 6. VITRINE DEDICADA DE IPHONES (Padrão iPlace) */}
        {!searchOrFavoriteResults && iphoneShowcaseProducts.length > 0 && (
          <section
            id="vitrine-iphones"
            className="order-3 bg-zinc-50 border-y border-zinc-200 py-8 md:py-10"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lime-800 mb-1">
                    <Smartphone size={14} />
                    <span>Vitrine Apple Brasil Tech</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                    iPhones com garantia, bateria verificada e envio imediato
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                    iCloud livre, saúde da bateria transparente, acessórios e NF-e quando aplicável.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigateDivision('android')}
                    className="min-h-[40px] px-3.5 rounded-xl border border-zinc-300 bg-white hover:border-zinc-950 text-xs font-bold text-zinc-800 whitespace-nowrap"
                  >
                    Ver Samsung &amp; Android
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateDivision('iphones')}
                    className="min-h-[40px] px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-lime-400 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Ver todos os iPhones</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
                {iphoneShowcaseProducts.map((p) => (
                  <ProductCard
                    key={`iphone-${p.id}`}
                    product={p}
                    isFavorite={favorites.has(p.id)}
                    imageFailed={failedImages.has(p.id)}
                    installmentsMax={installmentsMax}
                    onOpenProduct={onOpenProduct}
                    onToggleFav={onToggleFav}
                    onAddCart={onAddCart}
                    onBuyNow={onBuyNow}
                    onImageError={onImageError}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. VITRINE DEDICADA DE VIDEOGAMES (PlayStation, Xbox e Controles) */}
        {!searchOrFavoriteResults && gamerShowcaseProducts.length > 0 && (
          <section id="vitrine-gamer" className="order-4 max-w-7xl w-full mx-auto px-3 sm:px-4 py-8 md:py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lime-800 mb-1">
                  <Gamepad2 size={14} />
                  <span>Vitrine Gamer Brasil Tech</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                  PlayStation, Xbox, Controles e Acessórios
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                  PS2 ao PS5, Xbox 360, Xbox One e Series S/X revisados em bancada técnica com garantia.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateDivision('playstation')}
                  className="min-h-[38px] px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-zinc-950 text-xs font-bold text-zinc-800"
                >
                  PlayStation
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('xbox')}
                  className="min-h-[38px] px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-zinc-950 text-xs font-bold text-zinc-800"
                >
                  Xbox
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('acessorios')}
                  className="min-h-[38px] px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-zinc-950 text-xs font-bold text-zinc-800"
                >
                  Controles e Acessórios
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('gamer')}
                  className="min-h-[38px] px-4 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5"
                >
                  <span>Área Gamer</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
              {gamerShowcaseProducts.map((p) => (
                <ProductCard
                  key={`gamer-${p.id}`}
                  product={p}
                  isFavorite={favorites.has(p.id)}
                  imageFailed={failedImages.has(p.id)}
                  installmentsMax={installmentsMax}
                  onOpenProduct={onOpenProduct}
                  onToggleFav={onToggleFav}
                  onAddCart={onAddCart}
                  onBuyNow={onBuyNow}
                  onImageError={onImageError}
                />
              ))}
            </div>
          </section>
        )}

        {/* CATEGORIAS ESTRUTURADAS (Smartphones · Videogames · Outros) + Grade Visual */}
        <section
          className="hidden md:block order-5 max-w-7xl w-full mx-auto px-4 py-7 border-t border-zinc-100"
          id="categorias"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-lime-800">
                Smartphones
              </div>
              <h3 className="text-base font-extrabold text-zinc-950">
                iPhones, Samsung e Android
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateDivision('iphones')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-lime-500 text-xs font-bold text-zinc-900"
                >
                  iPhones →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('android')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-lime-500 text-xs font-bold text-zinc-900"
                >
                  Samsung &amp; Android →
                </button>
              </div>
            </div>

            <div className="bg-zinc-950 text-white border border-zinc-800 rounded-xl p-5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-lime-400">
                Videogames
              </div>
              <h3 className="text-base font-extrabold">
                PlayStation 2–5, Xbox e Controles
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateDivision('playstation')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-lime-400 text-xs font-bold text-white"
                >
                  PlayStation →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('xbox')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-lime-400 text-xs font-bold text-white"
                >
                  Xbox →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('acessorios')}
                  className="px-3 py-1.5 rounded-lg bg-lime-400 text-zinc-950 text-xs font-extrabold"
                >
                  Controles →
                </button>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-lime-800">
                Outros Departamentos
              </div>
              <h3 className="text-base font-extrabold text-zinc-950">
                Acessórios, Ofertas e Lançamentos
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateDivision('acessorios')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-lime-500 text-xs font-bold text-zinc-900"
                >
                  Acessórios →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('ofertas')}
                  className="px-3 py-1.5 rounded-lg bg-lime-400 text-zinc-950 text-xs font-extrabold"
                >
                  Ofertas →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('lancamentos')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-lime-500 text-xs font-bold text-zinc-900"
                >
                  Lançamentos →
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryCardClick(cat)}
                className="group bg-white border border-zinc-200 hover:border-lime-500 rounded-xl p-3 text-center flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-xs"
              >
                <div className="w-12 h-12 rounded-lg bg-zinc-50 flex items-center justify-center p-1.5">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-900 leading-tight line-clamp-2">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* BANNERS SECUNDÁRIOS EDITÁVEIS (enxutos) */}
        {secondaryBanners.length > 0 && (
          <section className="order-6 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 md:py-6">
            <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
              {secondaryBanners.map((b) => (
                <div
                  key={b.id}
                  className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50 flex items-stretch hover:border-lime-500 transition-colors"
                >
                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <span className="text-[10.5px] font-bold text-lime-800 uppercase tracking-wide">
                        {b.badge}
                      </span>
                      <h3 className="text-sm font-extrabold text-zinc-950 mt-1 leading-snug line-clamp-2">
                        {b.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBannerTarget(b)}
                      className="mt-3 w-fit inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-lime-400 hover:text-zinc-950 text-white text-xs font-bold transition-colors"
                    >
                      <span>{b.ctaLabel}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className="w-28 bg-white border-l border-zinc-200 overflow-hidden shrink-0">
                    <img
                      src={b.image}
                      alt={b.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 8. BENEFÍCIOS & INFORMAÇÕES DE CONFIANÇA + ATENDIMENTO */}
      <section className="bg-zinc-50 border-y border-zinc-200 py-9 mt-4">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
              <ShieldCheck size={22} className="text-lime-700" />
              <h3 className="text-sm font-bold text-zinc-950">Garantia e Inspeção Técnica</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Cada console e smartphone passa por revisão em bancada antes do envio, com cobertura
                de 90 dias a 12 meses.
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
              <Truck size={22} className="text-lime-700" />
              <h3 className="text-sm font-bold text-zinc-950">Envio Rápido &amp; Rastreável</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Entrega expressa ({money(storeSettings.expressShippingPrice)}) ou padrão nacional (
                {money(storeSettings.standardShippingPrice)}) com código de rastreio ao vivo.
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
              <CreditCard size={22} className="text-lime-700" />
              <h3 className="text-sm font-bold text-zinc-950">PIX &amp; Nota Fiscal</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Pagamento transparente à vista no PIX ou parcelamento com nota fiscal quando
                aplicável.
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
              <Award size={22} className="text-lime-700" />
              <h3 className="text-sm font-bold text-zinc-950">Devolução Garantida em 7 Dias</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Direito de arrependimento assegurado pelo Código de Defesa do Consumidor com suporte
                direto.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-800">
                <CheckCircle2 size={14} className="text-lime-700" />
                <span>Atendimento Especializado {storeSettings.storeName}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-950">
                Quer fotos reais, vídeo de funcionamento ou ajuda para fechar sua compra?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Atendimento direto pelo WhatsApp {storeSettings.phone} ou em nossa unidade na{' '}
                {storeSettings.address}. CNPJ {storeSettings.cnpj}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors"
              >
                <MessageCircle size={17} />
                <span>Falar no WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onOpenSecurityPage}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 text-xs sm:text-sm font-bold transition-colors"
              >
                Garantia &amp; Políticas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Central Pública de Pedidos e Rastreamento */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ClientTrustBar
          products={products}
          liveOrders={liveOrders}
          storeName={storeSettings.storeName}
          onOpenTracking={onOpenTracking}
          onOpenOrder={(code) => onOpenOrderShowcase(code)}
          onOpenShowcase={() => onOpenOrderShowcase()}
          onGoTrackingLookup={onGoTrackingLookup}
        />
        {(visitorRegion?.city || visitorRegion?.uf) && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <MapPin size={13} className="text-lime-700" />
            <span>
              Atendimento e envios expressos disponíveis para{' '}
              {[visitorRegion.city, visitorRegion.uf].filter(Boolean).join(' - ')}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
