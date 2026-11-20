import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBRL, getPixPrice, SHIPPING_OPTIONS } from '../data/catalog';
import { CartItem, ShippingOptionId } from '../types/store';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  simulatedCep: string;
  selectedShippingId: ShippingOptionId;
  onSimulateShipping: (cep: string, shippingId: ShippingOptionId) => void;
  onClose: () => void;
  onUpdateQuantity: (productId: string, variantId: string, quantity: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  simulatedCep,
  selectedShippingId,
  onSimulateShipping,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const [cepInput, setCepInput] = useState(simulatedCep);
  const [cepError, setCepError] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState(simulatedCep.replace(/\D/g, '').length === 8);

  useEffect(() => {
    if (simulatedCep) {
      setCepInput(simulatedCep);
      setHasSimulated(simulatedCep.replace(/\D/g, '').length === 8);
    }
  }, [simulatedCep]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price + item.variant.priceDelta) * item.quantity,
    0
  );
  const selectedShipping =
    SHIPPING_OPTIONS.find((opt) => opt.id === selectedShippingId) || SHIPPING_OPTIONS[1];
  const shippingCost = hasSimulated ? selectedShipping.price : 0;
  const pixTotal = getPixPrice(subtotal) + shippingCost;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSimulateCep = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cepInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setCepError('Informe um CEP com 8 dígitos.');
      setHasSimulated(false);
      return;
    }
    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    setCepError(null);
    setHasSimulated(true);
    onSimulateShipping(formatted, selectedShippingId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#13161C]/65 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full flex flex-col border-l border-[#E3DFD6]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3DFD6]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-[#181B22]" aria-hidden="true" />
            <h2 id="cart-drawer-title" className="font-display text-lg font-bold text-[#181B22]">
              Seu carrinho ({totalCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#555B66] hover:text-[#181B22] hover:bg-[#F8F6F2] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-full bg-[#EFECE6] flex items-center justify-center text-[#555B66]">
                <ShoppingBag size={22} />
              </div>
              <p className="mt-4 font-display text-base font-semibold text-[#181B22]">
                Seu carrinho está vazio
              </p>
              <p className="mt-1 text-sm text-[#555B66] max-w-xs">
                Escolha um console, celular ou acessório revisado para iniciar seu pedido.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-[42px] px-5 py-2 rounded-lg bg-[#13161C] text-[#F8F6F2] text-sm font-medium hover:bg-[#232833] transition-colors"
              >
                Explorar catálogo
              </button>
            </div>
          ) : (
            items.map((item) => {
              const unitPrice = item.product.price + item.variant.priceDelta;
              return (
                <div
                  key={`${item.product.id}-${item.variant.id}`}
                  className="flex gap-4 pb-4 border-b border-[#EFECE6] last:border-b-0"
                >
                  <div className="w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0 border border-[#E3DFD6]">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[#181B22] truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-xs text-[#555B66] mt-0.5">{item.variant.label}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, item.variant.id)}
                        aria-label={`Remover ${item.product.name}`}
                        className="p-1.5 text-[#555B66] hover:text-[#B91C1C] transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center border border-[#E3DFD6] rounded-lg bg-[#F8F6F2]">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.variant.id, item.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                          className="w-8 h-8 flex items-center justify-center text-[#181B22] hover:bg-[#EFECE6] rounded-l-lg transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.variant.id, item.quantity + 1)
                          }
                          aria-label="Aumentar quantidade"
                          className="w-8 h-8 flex items-center justify-center text-[#181B22] hover:bg-[#EFECE6] rounded-r-lg transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <p className="font-display text-sm font-bold text-[#181B22] tabular-nums">
                        {formatBRL(unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#E3DFD6] bg-[#F8F6F2] px-6 py-5 space-y-4">
            {/* Shipping Simulator */}
            <form onSubmit={handleSimulateCep} className="space-y-2">
              <label htmlFor="cep-cart" className="block text-xs font-semibold text-[#181B22]">
                Simular frete por CEP
              </label>
              <div className="flex gap-2">
                <input
                  id="cep-cart"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={cepInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const masked =
                      digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                    setCepInput(masked);
                    if (cepError) setCepError(null);
                  }}
                  placeholder="00000-000"
                  className="flex-1 min-h-[40px] px-3 rounded-lg border border-[#E3DFD6] bg-white text-xs font-mono tabular-nums focus:outline-none focus:border-[#13161C]"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-3.5 rounded-lg border border-[#13161C] text-xs font-semibold text-[#181B22] hover:bg-[#13161C] hover:text-[#F8F6F2] transition-colors whitespace-nowrap"
                >
                  Calcular
                </button>
              </div>
              {cepError && <p className="text-xs text-[#991B1B]">{cepError}</p>}

              {hasSimulated && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {SHIPPING_OPTIONS.map((opt) => {
                    const active = selectedShippingId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSimulateShipping(cepInput, opt.id)}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          active
                            ? 'bg-[#13161C] border-[#13161C] text-[#F8F6F2]'
                            : 'bg-white border-[#E3DFD6] text-[#181B22] hover:border-[#181B22]'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{opt.label}</span>
                        <span
                          className={`block text-xs font-mono font-bold tabular-nums mt-0.5 ${
                            active ? 'text-[#CFB06F]' : 'text-[#825F19]'
                          }`}
                        >
                          {formatBRL(opt.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </form>

            <div className="space-y-1.5 text-sm pt-2 border-t border-[#E3DFD6]">
              <div className="flex items-center justify-between text-[#555B66]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#181B22]">
                  {formatBRL(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#555B66]">
                <span>{hasSimulated ? selectedShipping.label : 'Frete'}</span>
                <span className="font-semibold text-[#181B22] tabular-nums">
                  {hasSimulated ? formatBRL(shippingCost) : 'Simule pelo CEP'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E3DFD6]">
                <span className="font-semibold text-[#181B22]">Total no Pix</span>
                <span className="font-display text-xl font-bold text-[#181B22] tabular-nums">
                  {formatBRL(pixTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onCheckout}
                className="w-full min-h-[46px] px-5 py-3 rounded-lg bg-[#13161C] hover:bg-[#232833] text-[#F8F6F2] text-sm font-semibold transition-colors"
              >
                Finalizar compra
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[42px] px-5 py-2 rounded-lg border border-[#E3DFD6] bg-white hover:border-[#181B22] text-[#181B22] text-sm font-medium transition-colors"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
