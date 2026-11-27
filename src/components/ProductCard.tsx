import { Heart, ShoppingBag } from 'lucide-react';
import {
  MarketplaceProduct,
  deriveProductMeta,
  formatInstallmentText,
  money,
} from '../data/marketplaceCatalog';
import { getProductReviewTotalCount } from '../data/productReviews';

interface ProductCardProps {
  product: MarketplaceProduct;
  isFavorite: boolean;
  imageFailed: boolean;
  installmentsMax?: number;
  onOpenProduct: (id: number) => void;
  onToggleFav: (id: number) => void;
  onAddCart: (id: number) => void;
  onBuyNow: (id: number) => void;
  onImageError: (id: number) => void;
}

export function ProductCard({
  product,
  isFavorite,
  imageFailed,
  installmentsMax = 12,
  onOpenProduct,
  onToggleFav,
  onAddCart,
  onBuyNow,
  onImageError,
}: ProductCardProps) {
  const meta = deriveProductMeta(product);
  const hasDiscount = product.old > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.old) * 100) : 0;
  const totalReviews = getProductReviewTotalCount(product);
  const isOutOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-lime-500 hover:shadow-[0_10px_28px_rgba(9,9,11,0.08)] min-w-0">
      <div
        className="relative aspect-[4/3] sm:aspect-square bg-white border-b border-zinc-100 flex items-center justify-center pt-10 pb-3 px-3 sm:pt-11 sm:pb-4 sm:px-5 overflow-hidden cursor-pointer"
        onClick={() => onOpenProduct(product.id)}
      >
        {!imageFailed && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.04]"
            onError={() => onImageError(product.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-400 gap-1">
            <span className="text-4xl" aria-hidden="true">
              {product.emoji}
            </span>
            <span className="text-xs font-medium text-zinc-500 text-center line-clamp-1 px-2">
              {product.name}
            </span>
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2 top-2 bg-lime-400 text-zinc-950 text-[10.5px] font-extrabold px-2 py-0.5 rounded-md tracking-wide tabular-nums shadow-xs">
            -{discount}% OFF
          </span>
        )}

        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(product.id);
          }}
          className={`absolute right-2 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-colors ${
            isFavorite
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-white/95 border-zinc-200 text-zinc-500 hover:text-zinc-950'
          }`}
        >
          <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.2} />
        </button>
      </div>

      <div className="p-2.5 sm:p-4 flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium text-zinc-500 truncate mb-1">
          <span className="truncate">{meta.subCategory}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{product.condition}</span>
        </div>

        <h3
          className="text-[12.5px] sm:text-sm font-semibold text-zinc-950 leading-snug line-clamp-2 min-h-[2.2rem] sm:min-h-[2.45rem] cursor-pointer hover:text-lime-700 transition-colors mb-1"
          onClick={() => onOpenProduct(product.id)}
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-zinc-600 mb-2 min-w-0">
          <span className="text-amber-500 font-semibold shrink-0">★ {product.rating}</span>
          <span className="text-zinc-400 tabular-nums shrink-0">({totalReviews})</span>
          {meta.division === 'mobile' && meta.batteryHealth !== 'N/A' && (
            <>
              <span aria-hidden="true" className="text-zinc-300 hidden sm:inline">
                ·
              </span>
              <span className="text-zinc-500 truncate hidden sm:inline">
                Bateria {meta.batteryHealth}
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-zinc-100 min-w-0">
          {hasDiscount && (
            <div className="text-[10.5px] sm:text-[11px] text-zinc-400 line-through tabular-nums">
              {money(product.old)}
            </div>
          )}
          <div className="text-base sm:text-xl font-extrabold text-zinc-950 tracking-tight tabular-nums truncate">
            {money(product.price)}
          </div>
          <div className="text-[10.5px] sm:text-[11px] font-medium text-lime-800 tabular-nums mt-0.5 line-clamp-1">
            À vista no PIX · {formatInstallmentText(product.price, meta.installmentsMax || installmentsMax)}
          </div>

          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] mt-1.5 mb-2.5 gap-1">
            <span
              className={`truncate ${
                isOutOfStock ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'
              }`}
            >
              {isOutOfStock ? 'Sob consulta' : `Pronta entrega · ${product.stock} un.`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onBuyNow(product.id)}
              className="flex-1 min-w-0 min-h-[38px] sm:min-h-[40px] px-2 sm:px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-500 disabled:bg-zinc-200 disabled:text-zinc-500 text-zinc-950 text-[11.5px] sm:text-xs font-extrabold transition-colors whitespace-nowrap truncate"
            >
              <span className="sm:hidden">Comprar</span>
              <span className="hidden sm:inline">Comprar agora</span>
            </button>
            <button
              type="button"
              disabled={isOutOfStock}
              aria-label="Adicionar ao carrinho"
              title="Adicionar ao carrinho"
              onClick={() => onAddCart(product.id)}
              className="min-h-[38px] sm:min-h-[40px] w-9 sm:w-10 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-950 hover:border-zinc-950 hover:text-white text-zinc-800 flex items-center justify-center transition-colors"
            >
              <ShoppingBag size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
