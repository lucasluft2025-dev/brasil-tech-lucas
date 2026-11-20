import { ArrowLeft, Check, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { useState } from 'react';
import { formatBRL, getPixPrice, SHIPPING_OPTIONS } from '../data/catalog';
import { Product, ProductVariant, ShippingOptionId } from '../types/store';

interface ProductDetailViewProps {
  product: Product;
  simulatedCep: string;
  selectedShippingId: ShippingOptionId;
  onSimulateShipping: (cep: string, shippingId: ShippingOptionId) => void;
  onBack: () => void;
  onAddToCart: (product: Product, variant: ProductVariant) => void;
  onBuyNow: (product: Product, variant: ProductVariant) => void;
}

export function ProductDetailView({
  product,
  simulatedCep,
  selectedShippingId,
  onSimulateShipping,
  onBack,
  onAddToCart,
  onBuyNow,
}: ProductDetailViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [selectedImage, setSelectedImage] = useState<string>(product.images[0] || product.image);
  const [cepInput, setCepInput] = useState(simulatedCep);
  const [cepError, setCepError] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState(simulatedCep.replace(/\D/g, '').length === 8);

  const unitPrice = product.price + selectedVariant.priceDelta;
  const pixPrice = getPixPrice(unitPrice);
  const installmentPrice = unitPrice / product.installments;

  const handleCepCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cepInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setCepError('Informe um CEP válido com 8 dígitos.');
      setHasSimulated(false);
      return;
    }
    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    setCepError(null);
    setHasSimulated(true);
    onSimulateShipping(formatted, selectedShippingId);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[40px] text-sm font-medium text-[#555B66] hover:text-[#181B22] transition-colors focus-visible:outline-2 focus-visible:outline-[#13161C] rounded-md"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Voltar ao catálogo</span>
      </button>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image Gallery + Technical Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square max-h-[540px] w-full rounded-2xl overflow-hidden bg-white border border-[#E3DFD6]">
            <img
              src={selectedImage}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>

          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {product.images.map((imgUrl, idx) => {
                const active = selectedImage === imgUrl;
                return (
                  <button
                    key={imgUrl}
                    type="button"
                    onClick={() => setSelectedImage(imgUrl)}
                    aria-label={`Ver foto ${idx + 1} de ${product.name}`}
                    className={`w-20 h-20 rounded-xl overflow-hidden bg-white border-2 shrink-0 transition-colors ${
                      active ? 'border-[#13161C]' : 'border-[#E3DFD6] hover:border-[#825F19]'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} — ângulo ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#181B22]">
                Especificações revisadas
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm text-[#555B66]">
                {product.specs.map((spec) => (
                  <li key={spec} className="flex items-start gap-2.5">
                    <Check size={16} className="text-[#825F19] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-[#181B22]">
                O que acompanha
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm text-[#555B66]">
                {product.includedItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={16} className="text-[#825F19] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Contiguous Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#E3DFD6] rounded-2xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-wider font-medium text-[#555B66]">
            {product.brand} · {product.categoryLabel} · {product.stock} unidades em estoque
          </p>

          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#181B22] leading-tight">
            {product.name}
          </h1>

          <div className="mt-2.5 flex items-center gap-2 text-sm text-[#555B66] tabular-nums">
            <Star size={15} className="fill-[#B5892E] text-[#B5892E]" aria-hidden="true" />
            <span className="font-semibold text-[#181B22]">
              {product.rating.toFixed(1).replace('.', ',')}
            </span>
            <span>({product.reviews.toLocaleString('pt-BR')} avaliações)</span>
            <span aria-hidden="true">·</span>
            <span>{product.sold.toLocaleString('pt-BR')} vendidos</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#555B66]">{product.description}</p>

          {/* Variant Selector */}
          <div className="mt-6 pt-5 border-t border-[#EFECE6]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#181B22]">
              Escolha a configuração
            </p>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {product.variants.map((variant) => {
                const isSelected = selectedVariant.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-lg border text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#13161C] ${
                      isSelected
                        ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                        : 'border-[#E3DFD6] bg-white text-[#181B22] hover:border-[#181B22]'
                    }`}
                  >
                    <span className="block truncate">{variant.label}</span>
                    {variant.priceDelta > 0 && (
                      <span
                        className={`block text-xs tabular-nums ${
                          isSelected ? 'text-[#CFB06F]' : 'text-[#555B66]'
                        }`}
                      >
                        + {formatBRL(variant.priceDelta)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Block */}
          <div className="mt-6 pt-5 border-t border-[#EFECE6]">
            {product.originalPrice && (
              <p className="text-sm text-[#555B66] line-through tabular-nums">
                {formatBRL(product.originalPrice + selectedVariant.priceDelta)}
              </p>
            )}
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="font-display text-3xl sm:text-4xl font-bold text-[#181B22] tabular-nums">
                {formatBRL(pixPrice)}
              </span>
              <span className="text-sm font-semibold text-[#825F19]">à vista no Pix</span>
            </div>
            <p className="mt-1 text-sm text-[#555B66] tabular-nums">
              ou {formatBRL(unitPrice)} em até {product.installments}x de{' '}
              <strong className="text-[#181B22]">{formatBRL(installmentPrice)}</strong>
            </p>
          </div>

          {/* Primary & Secondary CTAs */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => onBuyNow(product, selectedVariant)}
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13161C]"
            >
              Comprar agora
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(product, selectedVariant)}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-lg bg-[#13161C] hover:bg-[#232833] text-[#F8F6F2] text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13161C]"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              <span>Adicionar ao carrinho</span>
            </button>
          </div>

          {/* Shipping Estimator */}
          <form onSubmit={handleCepCheck} className="mt-6 pt-5 border-t border-[#EFECE6]">
            <label htmlFor="cep-pdp" className="block text-xs font-semibold uppercase tracking-wider text-[#181B22]">
              Simular frete e prazo de entrega
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="cep-pdp"
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={cepInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                  const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                  setCepInput(masked);
                  if (cepError) setCepError(null);
                }}
                placeholder="00000-000"
                className="flex-1 min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm text-[#181B22] font-mono tabular-nums focus:outline-none focus:border-[#13161C]"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-lg border border-[#13161C] text-sm font-medium text-[#181B22] hover:bg-[#13161C] hover:text-[#F8F6F2] transition-colors whitespace-nowrap"
              >
                Simular frete
              </button>
            </div>
            {cepError && <p className="mt-2 text-xs text-[#991B1B]">{cepError}</p>}

            {hasSimulated && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-[#555B66]">
                  Opções para o CEP <strong className="font-mono text-[#181B22]">{cepInput}</strong>:
                </p>
                {SHIPPING_OPTIONS.map((option) => {
                  const isSelected = selectedShippingId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onSimulateShipping(cepInput, option.id)}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                          : 'border-[#E3DFD6] bg-[#F8F6F2] text-[#181B22] hover:border-[#181B22]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold">{option.label}</p>
                        <p
                          className={`text-[11px] ${
                            isSelected ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                          }`}
                        >
                          {option.eta}
                        </p>
                      </div>
                      <span
                        className={`font-display text-sm font-bold tabular-nums shrink-0 ${
                          isSelected ? 'text-[#CFB06F]' : 'text-[#181B22]'
                        }`}
                      >
                        {formatBRL(option.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </form>

          {/* Guarantees */}
          <div className="mt-6 pt-5 border-t border-[#EFECE6] space-y-2.5 text-xs text-[#555B66]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#825F19] shrink-0" aria-hidden="true" />
              <span>{product.conditionNote}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Truck size={16} className="text-[#825F19] shrink-0" aria-hidden="true" />
              <span>Despacho em até 24h úteis com código de rastreio e seguro total.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
