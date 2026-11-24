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
    <article className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md min-w-0">
      <div
        className="relative aspect-square bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 sm:p-5 overflow-hidden cursor-pointer"
        onClick={() => onOpenProduct(product.id)}
      >
        {!imageFailed && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => onImageError(product.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
            <span className="text-4xl" aria-hidden="true">
              {product.emoji}
            </span>
            <span className="text-xs font-medium text-slate-500 text-center line-clamp-1 px-2">
              {product.name}
            </span>
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide tabular-nums">
            -{discount}%
          </span>
        )}

        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(product.id);
          }}
          className={`absolute right-2.5 top-2.5 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
            isFavorite
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-900'
          }`}
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.2} />
        </button>
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 truncate mb-1">
          <span>{meta.subCategory}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{product.condition}</span>
        </div>

        <h3
          className="text-[13.5px] sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[2.4rem] cursor-pointer hover:text-blue-600 transition-colors mb-1.5"
          onClick={() => onOpenProduct(product.id)}
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2.5">
          <span className="text-amber-500 font-semibold">★ {product.rating}</span>
          <span className="text-slate-400 tabular-nums">({totalReviews})</span>
          {meta.division === 'mobile' && meta.batteryHealth !== 'N/A' && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-500 truncate">Bateria {meta.batteryHealth}</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-slate-100">
          {hasDiscount && (
            <div className="text-[11px] text-slate-400 line-through tabular-nums">
              {money(product.old)}
            </div>
          )}
          <div className="text-lg sm:text-xl font-bold text-slate-950 tracking-tight tabular-nums">
            {money(product.price)}
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
            À vista no PIX ou {formatInstallmentText(product.price, meta.installmentsMax || installmentsMax)}
          </div>

          <div className="flex items-center justify-between text-[11px] mt-2 mb-3">
            <span className={isOutOfStock ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-medium'}>
              {isOutOfStock ? 'Sob consulta' : `Em estoque (${product.stock} un.)`}
            </span>
            <span className="text-slate-400 hidden sm:inline">{product.warranty.split(' ')[0]} {product.warranty.split(' ')[1]}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onBuyNow(product.id)}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold transition-colors whitespace-nowrap truncate"
            >
              Comprar agora
            </button>
            <button
              type="button"
              disabled={isOutOfStock}
              aria-label="Adicionar ao carrinho"
              title="Adicionar ao carrinho"
              onClick={() => onAddCart(product.id)}
              className="min-h-[40px] w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 flex items-center justify-center transition-colors"
            >
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
