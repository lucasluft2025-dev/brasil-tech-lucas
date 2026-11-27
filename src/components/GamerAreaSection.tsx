import { useMemo } from 'react';
import { Gamepad2, ShieldCheck } from 'lucide-react';
import {
  MarketplaceProduct,
  deriveProductMeta,
  formatInstallmentText,
  money,
} from '../data/marketplaceCatalog';

export type GamerSubPage =
  | 'Todos Gamer'
  | 'PlayStation 2'
  | 'PlayStation 3'
  | 'PlayStation 4'
  | 'PlayStation 5'
  | 'Xbox 360'
  | 'Xbox One'
  | 'Xbox Series S e X'
  | 'Jogos'
  | 'Controles'
  | 'Acessórios'
  | 'Nintendo'
  | 'PC Gamer';

const GAMER_SUBPAGES: GamerSubPage[] = [
  'Todos Gamer',
  'PlayStation 5',
  'PlayStation 4',
  'PlayStation 3',
  'PlayStation 2',
  'Xbox Series S e X',
  'Xbox One',
  'Xbox 360',
  'Jogos',
  'Controles',
  'Acessórios',
  'Nintendo',
  'PC Gamer',
];

interface GamerAreaSectionProps {
  products: MarketplaceProduct[];
  activeSubPage: GamerSubPage;
  onChangeSubPage: (sub: GamerSubPage) => void;
  failedImages: Set<number>;
  installmentsMax?: number;
  onOpenProduct: (id: number) => void;
  onAddCart: (id: number) => void;
  onBuyNow: (id: number) => void;
  onImageError: (id: number) => void;
}

export function GamerAreaSection({
  products,
  activeSubPage,
  onChangeSubPage,
  failedImages,
  installmentsMax = 12,
  onOpenProduct,
  onAddCart,
  onBuyNow,
  onImageError,
}: GamerAreaSectionProps) {
  const gamerProducts = useMemo(() => {
    return products
      .map((p) => ({ product: p, meta: deriveProductMeta(p) }))
      .filter(({ meta }) => meta.division === 'gamer');
  }, [products]);

  const filtered = useMemo(() => {
    if (activeSubPage === 'Todos Gamer') return gamerProducts;
    return gamerProducts.filter(({ product, meta }) => {
      const n = product.name.toLowerCase();
      switch (activeSubPage) {
        case 'PlayStation 2':
          return n.includes('playstation 2') || n.includes('ps2');
        case 'PlayStation 3':
          return n.includes('playstation 3') || n.includes('ps3');
        case 'PlayStation 4':
          return n.includes('playstation 4') || n.includes('ps4');
        case 'PlayStation 5':
          return (n.includes('playstation 5') || n.includes('ps5')) && product.cat === 'PlayStation';
        case 'Xbox 360':
          return n.includes('xbox 360');
        case 'Xbox One':
          return n.includes('xbox one');
        case 'Xbox Series S e X':
          return n.includes('xbox series');
        case 'Jogos':
          return product.cat === 'Jogos' || meta.subCategory === 'Jogos' || meta.gamesCount > 0;
        case 'Controles':
          return meta.subCategory === 'Controles' || n.includes('controle') || n.includes('dualsense');
        case 'Acessórios':
          return product.cat === 'Acessórios';
        case 'Nintendo':
          return product.cat === 'Nintendo';
        case 'PC Gamer':
          return product.cat === 'PC Gamer';
        default:
          return true;
      }
    });
  }, [gamerProducts, activeSubPage]);

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12" aria-label="Brasil Tech Gamer">
      <div className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-8 mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border border-zinc-800">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wide mb-2">
            <Gamepad2 size={16} />
            <span>Brasil Tech Gamer · Consoles, Jogos e Periféricos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
            {activeSubPage === 'Todos Gamer'
              ? 'Consoles clássicos e nova geração revisados em bancada técnica.'
              : `${activeSubPage} — Seleção verificada com garantia Brasil Tech.`}
          </h1>
          <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
            Limpeza interna, troca de pasta térmica quando aplicável, testes de leitor, HDMI e
            controles calibrados com garantia de 90 dias a 12 meses.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-300 shrink-0">
          <div className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <strong className="block text-lime-400 font-bold tabular-nums">
              {filtered.length} itens disponíveis
            </strong>
            <span>Envio seguro e rastreável</span>
          </div>
        </div>
      </div>

      {/* Navegação por Geração / Plataforma */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {GAMER_SUBPAGES.map((sub) => (
          <button
            key={sub}
            type="button"
            onClick={() => onChangeSubPage(sub)}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              activeSubPage === sub
                ? 'bg-lime-400 text-zinc-950 border border-lime-500'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center">
          <p className="text-zinc-700 font-semibold">
            Nenhum item cadastrado atualmente em {activeSubPage}.
          </p>
          <button
            type="button"
            onClick={() => onChangeSubPage('Todos Gamer')}
            className="mt-4 px-5 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold"
          >
            Ver toda a área Gamer
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
                  className="bg-white aspect-[4/3] p-5 flex items-center justify-center border-b border-zinc-100 cursor-pointer relative"
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
                    <span className="text-5xl">{product.emoji}</span>
                  )}
                  <span className="absolute left-3.5 top-3.5 text-[11px] font-semibold bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md">
                    {meta.subCategory}
                  </span>
                  {hasDiscount && (
                    <span className="absolute right-3.5 top-3.5 text-[11px] font-extrabold bg-lime-400 text-zinc-950 px-2 py-0.5 rounded-md tabular-nums">
                      -{discount}%
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                    <span>{product.condition}</span>
                    <span
                      className={
                        product.stock > 0
                          ? 'text-emerald-700 font-semibold'
                          : 'text-rose-600 font-semibold'
                      }
                    >
                      {product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível'}
                    </span>
                  </div>

                  <h2
                    className="text-base font-bold text-zinc-950 leading-snug cursor-pointer hover:text-lime-700 mb-2"
                    onClick={() => onOpenProduct(product.id)}
                  >
                    {product.name}
                  </h2>

                  <p className="text-xs text-zinc-600 line-clamp-2 mb-3">{product.desc}</p>

                  <dl className="grid grid-cols-1 gap-1.5 text-xs text-zinc-600 py-3 border-y border-zinc-100 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-400">Itens inclusos</dt>
                      <dd className="font-medium text-zinc-800 text-right truncate max-w-[65%]">
                        {meta.accessoriesIncluded}
                      </dd>
                    </div>
                    {meta.gamesCount > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-zinc-400">Jogos inclusos</dt>
                        <dd className="font-bold text-lime-800">
                          {meta.gamesCount} {meta.gamesCount === 1 ? 'jogo' : 'jogos'}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-400">Garantia real</dt>
                      <dd className="font-semibold text-zinc-950 flex items-center gap-1">
                        <ShieldCheck size={13} className="text-lime-700" />
                        {product.warranty}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto">
                    {hasDiscount && (
                      <div className="text-xs text-zinc-400 line-through tabular-nums">
                        {money(product.old)}
                      </div>
                    )}
                    <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                      {money(product.price)}
                    </div>
                    <div className="text-xs text-lime-800 font-medium tabular-nums mt-0.5 mb-4">
                      À vista no PIX ou{' '}
                      {formatInstallmentText(product.price, meta.installmentsMax || installmentsMax)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => onBuyNow(product.id)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-lime-400 hover:bg-lime-500 disabled:bg-zinc-200 text-zinc-950 text-xs font-extrabold transition-colors"
                      >
                        Comprar agora
                      </button>
                      <button
                        type="button"
                        disabled={product.stock <= 0}
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
    </section>
  );
}
