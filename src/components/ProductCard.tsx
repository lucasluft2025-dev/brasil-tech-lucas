import { ShoppingBag, Star } from 'lucide-react';
import { formatBRL, getPixPrice } from '../data/catalog';
import { Product, ProductVariant } from '../types/store';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
}

export function ProductCard({ product, onSelectProduct, onQuickAdd }: ProductCardProps) {
  const defaultVariant = product.variants[0];
  const pixPrice = getPixPrice(product.price);
  const installmentPrice = product.price / product.installments;

  return (
    <article className="group flex flex-col bg-white border border-[#E3DFD6] rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#C5BEB0]">
      {/* Product Photo Frame */}
      <button
        type="button"
        onClick={() => onSelectProduct(product)}
        className="relative aspect-square w-full bg-white overflow-hidden text-left border-b border-[#EFECE6] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#13161C]"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-5">
        {/* Unboxed metadata line */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#555B66]">
          <span className="uppercase tracking-wider font-medium">
            {product.brand} · {product.categoryLabel}
          </span>
          {product.discount && product.discount > 0 && (
            <span className="font-mono font-semibold text-[#825F19] tabular-nums">
              -{product.discount}%
            </span>
          )}
        </div>

        {/* Title */}
        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="mt-1.5 text-left font-display text-lg font-semibold text-[#181B22] group-hover:text-[#825F19] transition-colors line-clamp-1 focus-visible:outline-2 focus-visible:outline-[#13161C] rounded-sm"
        >
          {product.name}
        </button>

        {/* Rating & Sales */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#555B66] tabular-nums">
          <Star size={13} className="fill-[#B5892E] text-[#B5892E] shrink-0" aria-hidden="true" />
          <span className="font-semibold text-[#181B22]">
            {product.rating.toFixed(1).replace('.', ',')}
          </span>
          <span>({product.reviews.toLocaleString('pt-BR')})</span>
          <span aria-hidden="true">·</span>
          <span>Envio rápido</span>
        </div>

        {/* Pricing Block */}
        <div className="mt-auto pt-4 border-t border-[#EFECE6]">
          {product.originalPrice && (
            <p className="text-xs text-[#555B66] line-through tabular-nums">
              {formatBRL(product.originalPrice)}
            </p>
          )}
          <div className="flex items-baseline justify-between gap-2 mt-0.5">
            <p className="font-display text-2xl font-bold text-[#181B22] tabular-nums">
              {formatBRL(pixPrice)}
            </p>
            <span className="text-xs font-medium text-[#825F19] whitespace-nowrap">
              à vista no Pix
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#555B66] tabular-nums">
            ou {formatBRL(product.price)} em até {product.installments}x de{' '}
            {formatBRL(installmentPrice)}
          </p>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuickAdd(product, defaultVariant)}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-lg bg-[#13161C] hover:bg-[#232833] text-[#F8F6F2] text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13161C]"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>Comprar</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="min-h-[42px] px-3.5 py-2 rounded-lg border border-[#E3DFD6] hover:border-[#181B22] text-[#181B22] text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#13161C]"
            >
              Detalhes
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
