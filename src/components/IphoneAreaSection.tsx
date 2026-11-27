import { useMemo, useState } from 'react';
import { BatteryCharging, Check, ShieldCheck, Smartphone } from 'lucide-react';
import {
  MarketplaceProduct,
  deriveProductMeta,
  formatInstallmentText,
  money,
} from '../data/marketplaceCatalog';

interface IphoneAreaSectionProps {
  products: MarketplaceProduct[];
  favorites: Set<number>;
  failedImages: Set<number>;
  installmentsMax?: number;
  onOpenProduct: (id: number) => void;
  onAddCart: (id: number) => void;
  onBuyNow: (id: number) => void;
  onToggleFav: (id: number) => void;
  onImageError: (id: number) => void;
}

export function IphoneAreaSection({
  products,
  failedImages,
  installmentsMax = 12,
  onOpenProduct,
  onAddCart,
  onBuyNow,
  onImageError,
}: IphoneAreaSectionProps) {
  const [modelFilter, setModelFilter] = useState<string>('Todos');
  const [storageFilter, setStorageFilter] = useState<string>('Todas');
  const [colorFilter, setColorFilter] = useState<string>('Todas');
  const [conditionFilter, setConditionFilter] = useState<string>('Todas');
  const [priceFilter, setPriceFilter] = useState<string>('all');

  const iphoneProducts = useMemo(() => {
    return products
      .filter((p) => p.name.toLowerCase().includes('iphone'))
      .map((p) => ({ product: p, meta: deriveProductMeta(p) }));
  }, [products]);

  const modelOptions = [
    'Todos',
    'iPhone 17',
    'iPhone 16',
    'iPhone 15',
    'iPhone 14',
    'iPhone 13',
    'iPhone 12',
    'iPhone 11',
    'iPhone XR / 8',
  ];

  const storageOptions = useMemo(() => {
    const set = new Set<string>();
    iphoneProducts.forEach(({ meta }) => set.add(meta.storage));
    return ['Todas', ...Array.from(set)];
  }, [iphoneProducts]);

  const colorOptions = useMemo(() => {
    const set = new Set<string>();
    iphoneProducts.forEach(({ meta }) => set.add(meta.color));
    return ['Todas', ...Array.from(set)];
  }, [iphoneProducts]);

  const conditionOptions = useMemo(() => {
    const set = new Set<string>();
    iphoneProducts.forEach(({ product }) => set.add(product.condition));
    return ['Todas', ...Array.from(set)];
  }, [iphoneProducts]);

  const filtered = useMemo(() => {
    return iphoneProducts.filter(({ product, meta }) => {
      if (modelFilter !== 'Todos') {
        const lower = product.name.toLowerCase();
        if (modelFilter === 'iPhone XR / 8') {
          if (!lower.includes('iphone xr') && !lower.includes('iphone 8')) return false;
        } else if (!lower.includes(modelFilter.toLowerCase())) {
          return false;
        }
      }
      if (storageFilter !== 'Todas' && meta.storage !== storageFilter) return false;
      if (colorFilter !== 'Todas' && meta.color !== colorFilter) return false;
      if (conditionFilter !== 'Todas' && product.condition !== conditionFilter) return false;
      if (priceFilter === 'under1500' && product.price > 1500) return false;
      if (priceFilter === '1500to3000' && (product.price <= 1500 || product.price > 3000))
        return false;
      if (priceFilter === 'over3000' && product.price <= 3000) return false;
      return true;
    });
  }, [iphoneProducts, modelFilter, storageFilter, colorFilter, conditionFilter, priceFilter]);

  const resetFilters = () => {
    setModelFilter('Todos');
    setStorageFilter('Todas');
    setColorFilter('Todas');
    setConditionFilter('Todas');
    setPriceFilter('all');
  };

  return (
    <section
      className="max-w-7xl mx-auto px-4 py-8 sm:py-12"
      aria-label="Brasil Tech Mobile — Área Exclusiva de iPhones"
    >
      {/* Header Apple / iPlace Style */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-lime-800 uppercase tracking-wide mb-2">
            <Smartphone size={15} />
            <span>Brasil Tech Mobile · Linha Apple Selecionada</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight text-balance">
            iPhones com transparência técnica em cada detalhe.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 mt-2 leading-relaxed">
            Inspeção de 28 pontos: iCloud livre, desbloqueado Anatel, saúde de bateria conferida,
            acessórios inclusos, nota fiscal quando aplicável e garantia real.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-zinc-600 shrink-0">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <strong className="block text-zinc-950 font-bold">Bateria Conferida</strong>
            <span>Percentual real no anúncio</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <strong className="block text-zinc-950 font-bold">Garantia Real</strong>
            <span>90 dias a 12 meses</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 col-span-2 sm:col-span-1">
            <strong className="block text-zinc-950 font-bold">7 Dias Devolução</strong>
            <span>CDC Art. 49 garantido</span>
          </div>
        </div>
      </div>

      {/* Filtros dedicados iPhones */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 sm:p-5 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {modelOptions.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => setModelFilter(model)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                modelFilter === model
                  ? 'bg-lime-400 text-zinc-950 border border-lime-500'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
              }`}
            >
              {model}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
              Capacidade
            </label>
            <select
              value={storageFilter}
              onChange={(e) => setStorageFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-950 font-medium"
            >
              {storageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
              Faixa de Preço
            </label>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-950 font-medium"
            >
              <option value="all">Todos os preços</option>
              <option value="under1500">Até R$ 1.500</option>
              <option value="1500to3000">R$ 1.501 a R$ 3.000</option>
              <option value="over3000">Acima de R$ 3.000</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Cor</label>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-950 font-medium"
            >
              {colorOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
              Condição do Aparelho
            </label>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-950 font-medium"
            >
              {conditionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full min-h-[42px] px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-800 transition-colors"
            >
              Limpar filtros ({filtered.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid Sofisticado de iPhones */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center">
          <p className="text-zinc-700 font-semibold">
            Nenhum iPhone encontrado com os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 px-5 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold"
          >
            Mostrar todos os iPhones
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(({ product, meta }) => {
            const hasDiscount = product.old > product.price;
            const discount = hasDiscount ? Math.round((1 - product.price / product.old) * 100) : 0;
            return (
              <article
                key={product.id}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col hover:border-lime-500 hover:shadow-md transition-all"
              >
                <div
                  className="bg-white aspect-[4/3] p-6 flex items-center justify-center border-b border-zinc-100 cursor-pointer relative"
                  onClick={() => onOpenProduct(product.id)}
                >
                  {!failedImages.has(product.id) && product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain hover:scale-[1.03] transition-transform duration-200"
                      onError={() => onImageError(product.id)}
                    />
                  ) : (
                    <span className="text-5xl">📱</span>
                  )}
                  <span className="absolute left-4 top-4 text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md">
                    {meta.storage} · {meta.color}
                  </span>
                  {hasDiscount && (
                    <span className="absolute right-4 top-4 text-[11px] font-extrabold text-zinc-950 bg-lime-400 px-2 py-0.5 rounded-md tabular-nums">
                      -{discount}%
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="text-xs text-lime-800 font-bold mb-1">
                    {product.condition}
                  </div>
                  <h2
                    className="text-base font-bold text-zinc-950 leading-snug cursor-pointer hover:text-lime-700 mb-3"
                    onClick={() => onOpenProduct(product.id)}
                  >
                    {product.name}
                  </h2>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-600 py-3 border-y border-zinc-100 mb-4">
                    <div>
                      <dt className="text-[11px] text-zinc-400">Capacidade</dt>
                      <dd className="font-semibold text-zinc-950">{meta.storage}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-zinc-400">Saúde da Bateria</dt>
                      <dd className="font-semibold text-emerald-700 flex items-center gap-1">
                        <BatteryCharging size={13} />
                        {meta.batteryHealth}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-zinc-400">Cor</dt>
                      <dd className="font-semibold text-zinc-950 truncate">{meta.color}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-zinc-400">Garantia</dt>
                      <dd className="font-semibold text-zinc-950 truncate">{product.warranty}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[11px] text-zinc-400">Incluso &amp; Nota</dt>
                      <dd className="font-medium text-zinc-700 flex items-center gap-1.5">
                        <Check size={13} className="text-lime-700 shrink-0" />
                        <span className="truncate">
                          {meta.accessoriesIncluded} · NF-e quando aplicável
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto">
                    {hasDiscount && (
                      <div className="text-xs text-zinc-400 line-through tabular-nums">
                        {money(product.old)}
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                        {money(product.price)}
                      </div>
                      <span className="text-[11px] font-bold text-lime-800">À vista no PIX</span>
                    </div>
                    <div className="text-xs text-zinc-600 tabular-nums mt-0.5 mb-4">
                      Parcelamento:{' '}
                      {formatInstallmentText(product.price, meta.installmentsMax || installmentsMax)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onBuyNow(product.id)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold transition-colors"
                      >
                        Comprar agora
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddCart(product.id)}
                        className="min-h-[44px] px-3.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-950 hover:border-zinc-950 hover:text-white text-zinc-800 text-xs font-bold transition-colors"
                      >
                        + Carrinho
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-zinc-50 border border-zinc-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-600">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-lime-700 shrink-0" />
          <span>
            Todos os iPhones possuem IMEI conferido, iCloud livre para sua conta e direito de
            arrependimento de 7 dias após a entrega.
          </span>
        </div>
      </div>
    </section>
  );
}
