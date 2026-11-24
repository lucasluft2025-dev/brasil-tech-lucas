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

export type FeaturedTabKey = 'bestsellers' | 'deals' | 'new' | 'gamer' | 'smartphones';

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
  onNavigateDivision: (target: 'iphones' | 'android' | 'playstation' | 'xbox' | 'gamer' | 'acessorios' | 'ofertas') => void;
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

const FEATURED_TABS: Array<{ key: FeaturedTabKey; label: string }> = [
  { key: 'bestsellers', label: 'Mais vendidos' },
  { key: 'deals', label: 'Ofertas especiais' },
  { key: 'new', label: 'Novidades' },
  { key: 'gamer', label: 'Produtos gamer' },
  { key: 'smartphones', label: 'Smartphones em destaque' },
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
  const [featuredTab, setFeaturedTab] = useState<FeaturedTabKey>('bestsellers');

  const activeBanners = useMemo(() => {
    const list = (banners.length > 0 ? banners : DEFAULT_BANNERS)
      .filter((b) => b.active)
      .sort((a, b) => a.order - b.order);
    return list;
  }, [banners]);

  const heroBanner = useMemo(
    () => activeBanners.find((b) => b.slot === 'hero') || DEFAULT_BANNERS[0],
    [activeBanners]
  );

  const secondaryBanners = useMemo(
    () => activeBanners.filter((b) => b.slot === 'secondary').slice(0, 5),
    [activeBanners]
  );

  const visibleCategories = useMemo(() => {
    const list = (categories.length > 0 ? categories : DEFAULT_CATEGORIES)
      .filter((c) => c.active)
      .sort((a, b) => a.order - b.order);
    return list;
  }, [categories]);

  const featuredProducts = useMemo(() => {
    switch (featuredTab) {
      case 'deals':
        return [...products]
          .filter((p) => p.old > p.price)
          .sort((a, b) => (1 - b.price / b.old) - (1 - a.price / a.old))
          .slice(0, 8);
      case 'new':
        return [...products]
          .filter((p) => deriveProductMeta(p).isNewArrival)
          .sort((a, b) => b.id - a.id)
          .slice(0, 8);
      case 'gamer':
        return [...products]
          .filter((p) => deriveProductMeta(p).division === 'gamer')
          .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
          .slice(0, 8);
      case 'smartphones':
        return [...products]
          .filter((p) => deriveProductMeta(p).division === 'mobile')
          .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold)
          .slice(0, 8);
      case 'bestsellers':
      default:
        return [...products].sort((a, b) => b.sold - a.sold).slice(0, 8);
    }
  }, [products, featuredTab]);

  // Se houver busca ativa ou filtro exclusivo de favoritos, exibe grade focada de resultados no topo
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
    `Olá equipe ${storeSettings.storeName}! Estou no site e gostaria de ajuda para escolher um produto.`
  )}`;

  return (
    <div className="bg-white">
      {/* Resultados de Busca / Favoritos quando ativos */}
      {searchOrFavoriteResults && (
        <section className="max-w-7xl mx-auto px-4 pt-6 pb-10 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-950">
                {onlyFavorites
                  ? `Meus Favoritos (${searchOrFavoriteResults.length})`
                  : `Resultados para "${searchTerm}" (${searchOrFavoriteResults.length})`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Clique em qualquer item para ver ficha técnica, garantia e envio.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearSearchAndFavs}
              className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Voltar para a loja completa
            </button>
          </div>

          {searchOrFavoriteResults.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum produto encontrado para essa seleção.
              </p>
              <button
                type="button"
                onClick={onClearSearchAndFavs}
                className="mt-4 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
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

      {/* 1. BANNER PRINCIPAL — Tecnologia Completa: Mobile + Gamer */}
      {!searchOrFavoriteResults && (
        <section className="max-w-7xl mx-auto px-4 pt-5 sm:pt-7 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-9 lg:p-11">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
                <ShieldCheck size={15} />
                <span>{heroBanner.badge}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-950 tracking-tight leading-[1.12] text-balance">
                {heroBanner.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                {heroBanner.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateDivision('iphones')}
                  className="min-h-[46px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Smartphone size={16} />
                  <span>Explorar iPhones &amp; Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateDivision('gamer')}
                  className="min-h-[46px] px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Gamepad2 size={16} />
                  <span>Área Brasil Tech Gamer</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/80 text-xs text-slate-600">
                <div>
                  <strong className="block text-slate-950 font-bold">Garantia Real</strong>
                  <span>90 dias a 12 meses</span>
                </div>
                <div>
                  <strong className="block text-slate-950 font-bold">Reembolso 7 dias</strong>
                  <span>CDC Art. 49 garantido</span>
                </div>
                <div>
                  <strong className="block text-slate-950 font-bold">
                    {visitorRegion?.city || 'Envio Seguro'}
                  </strong>
                  <span>Rastreio ao vivo</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden aspect-[16/10] shadow-sm">
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

      {/* Duas Grandes Frentes Comerciais: Brasil Tech Mobile & Brasil Tech Gamer */}
      {!searchOrFavoriteResults && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => onNavigateDivision('iphones')}
              className="group text-left bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 transition-all hover:shadow-md flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Brasil Tech Mobile
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-950 mt-1">
                  iPhones e Smartphones Android
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Saúde de bateria informada, aparelhos revisados, NF-e quando aplicável e garantia.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 mt-3 group-hover:translate-x-0.5 transition-transform">
                  Ver iPhones e Smartphones <ArrowRight size={14} />
                </span>
              </div>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-2">
                <img
                  src="/src/assets/ref/cats/celular.png"
                  alt="Brasil Tech Mobile"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateDivision('gamer')}
              className="group text-left bg-slate-950 text-white border border-slate-800 hover:border-blue-500 rounded-2xl p-6 transition-all hover:shadow-md flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Brasil Tech Gamer
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  PlayStation, Xbox, Jogos e Acessórios
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  PS2 ao PS5, Xbox 360 ao Series X, controles, PCs Gamer e mídia física testados.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 mt-3 group-hover:translate-x-0.5 transition-transform">
                  Explorar Área Gamer <ArrowRight size={14} />
                </span>
              </div>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-2">
                <img
                  src="/src/assets/ref/cats/playstation.png"
                  alt="Brasil Tech Gamer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* 2. CATEGORIAS VISUAIS */}
      <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8" id="categorias">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
              Navegue por categoria
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Escolha entre nossa linha Mobile e nossa divisão Gamer completa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateDivision('ofertas')}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Ver ofertas →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryCardClick(cat)}
              className="group bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 text-center flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center p-2">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-xs font-semibold text-slate-900 leading-tight line-clamp-2">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. BANNERS SECUNDÁRIOS EDITÁVEIS (iPhones, Smartphones, PlayStation, Xbox, Acessórios Gamer) */}
      {secondaryBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secondaryBanners.map((b, idx) => (
              <div
                key={b.id}
                className={`border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col sm:flex-row items-stretch hover:border-blue-300 transition-colors ${
                  idx === 0 ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                      {b.badge}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950 mt-1 leading-snug">
                      {b.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{b.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBannerTarget(b)}
                    className="mt-4 w-fit inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
                  >
                    <span>{b.ctaLabel}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
                <div className="sm:w-44 aspect-[4/3] sm:aspect-auto bg-white border-t sm:border-t-0 sm:border-l border-slate-200 overflow-hidden shrink-0">
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

      {/* 4. PRODUTOS EM DESTAQUE (5 Abas Curadas) */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10" id="ofertas">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
              Produtos em destaque
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Seleção atualizada com preços à vista no PIX e parcelamento no cartão.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtros de destaque"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {FEATURED_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={featuredTab === t.key}
                onClick={() => setFeaturedTab(t.key)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  featuredTab === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {featuredProducts.map((p) => (
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
      </section>

      {/* 5. BENEFÍCIOS DA LOJA & ATENDIMENTO */}
      <section className="bg-slate-50 border-y border-slate-200 py-10 mt-4">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <ShieldCheck size={22} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Garantia e Inspeção Técnica</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cada console e smartphone passa por revisão em bancada antes do envio, com cobertura
                de 90 dias a 12 meses.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <Truck size={22} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Envio Rápido &amp; Rastreável</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Entrega expressa ({money(storeSettings.expressShippingPrice)}) ou padrão nacional (
                {money(storeSettings.standardShippingPrice)}) com código de rastreio ao vivo.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <CreditCard size={22} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">PIX &amp; Condições Claras</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pagamento transparente à vista no PIX ou parcelamento conforme condições de cada
                anúncio.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <Award size={22} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Troca &amp; Devolução em 7 Dias</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direito de arrependimento assegurado pelo Código de Defesa do Consumidor com suporte
                direto.
              </p>
            </div>
          </div>

          {/* Área de Atendimento Humano + Políticas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <CheckCircle2 size={14} />
                <span>Atendimento Especializado {storeSettings.storeName}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-950">
                Precisa de fotos reais, vídeo de teste ou ajuda na escolha?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Nossa equipe atende diretamente pelo WhatsApp {storeSettings.phone} ou em nossa loja
                física na {storeSettings.address}. CNPJ {storeSettings.cnpj}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <MessageCircle size={17} />
                <span>Falar no WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onOpenSecurityPage}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-colors"
              >
                Garantia &amp; Políticas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Central Pública de Pedidos e Rastreamento (discreta na parte inferior da Home) */}
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
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <MapPin size={13} className="text-blue-600" />
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
