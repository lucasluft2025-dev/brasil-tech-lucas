import { ArrowLeft, CheckCircle2, Copy, CreditCard, QrCode, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { formatBRL, getPixPrice, SHIPPING_OPTIONS } from '../data/catalog';
import { CartItem, Order, OrderCustomer, PaymentMethod, ShippingOptionId } from '../types/store';

interface CheckoutViewProps {
  items: CartItem[];
  simulatedCep: string;
  selectedShippingId: ShippingOptionId;
  onSimulateShipping: (cep: string, shippingId: ShippingOptionId) => void;
  onBack: () => void;
  onOrderCreated: (order: Order) => void;
  onGoToTracking: (trackingCode: string) => void;
}

export function CheckoutView({
  items,
  simulatedCep,
  selectedShippingId,
  onSimulateShipping,
  onBack,
  onOrderCreated,
  onGoToTracking,
}: CheckoutViewProps) {
  const [customer, setCustomer] = useState<OrderCustomer>({
    name: '',
    cpf: '',
    email: '',
    whatsapp: '',
    cep: simulatedCep,
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [installmentsCount, setInstallmentsCount] = useState(12);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price + item.variant.priceDelta) * item.quantity,
    0
  );
  const selectedShipping =
    SHIPPING_OPTIONS.find((opt) => opt.id === selectedShippingId) || SHIPPING_OPTIONS[1];
  const shippingCost = selectedShipping.price;
  const pixDiscount = paymentMethod === 'pix' ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const total = Math.round((subtotal - pixDiscount + shippingCost) * 100) / 100;

  const maskCPF = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const maskCEP = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customer.name.trim() ||
      customer.cpf.replace(/\D/g, '').length < 11 ||
      !customer.email.includes('@') ||
      customer.whatsapp.replace(/\D/g, '').length < 10 ||
      customer.cep.replace(/\D/g, '').length < 8 ||
      !customer.street.trim() ||
      !customer.number.trim() ||
      !customer.city.trim() ||
      !customer.state.trim()
    ) {
      setErrorMsg('Preencha todos os campos obrigatórios de contato e endereço para continuar.');
      return;
    }

    setErrorMsg(null);
    const num = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `BT-${num}`;
    const trackingCode = `BR${num}${Math.floor(10000 + Math.random() * 89999)}TECH`;
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString('pt-BR')} · ${now
      .toTimeString()
      .slice(0, 5)}`;

    const newOrder: Order = {
      orderNumber,
      trackingCode,
      createdAt: formattedTime,
      customer,
      items: items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        variantLabel: item.variant.label,
        quantity: item.quantity,
        unitPrice: item.product.price + item.variant.priceDelta,
      })),
      subtotal,
      discountAmount: pixDiscount,
      total,
      paymentMethod,
      installmentsCount: paymentMethod === 'cartao' ? installmentsCount : undefined,
      statusLabel: 'Pedido confirmado — em preparação na bancada',
      estimatedDelivery: `${selectedShipping.label} · ${selectedShipping.eta}`,
      steps: [
        {
          title: 'Pedido confirmado',
          detail:
            paymentMethod === 'pix'
              ? 'Aguardando confirmação instantânea do Pix.'
              : paymentMethod === 'cartao'
              ? `Pagamento aprovado em ${installmentsCount}x no cartão.`
              : 'Boleto emitido — compensação em até 1 dia útil.',
          timestamp: formattedTime,
          completed: true,
        },
        {
          title: 'Revisão técnica em 18 pontos',
          detail: 'Equipamento na fila de conferência e selagem de garantia.',
          timestamp: 'Em andamento',
          completed: false,
        },
        {
          title: 'Embalado e despachado com seguro',
          detail: 'Saída pelo Centro Logístico Curitiba – PR.',
          timestamp: 'Próxima etapa',
          completed: false,
        },
        {
          title: 'Em trânsito para o destino',
          detail: `Destino: ${customer.city}, ${customer.state.toUpperCase()}.`,
          timestamp: 'Aguardando postagem',
          completed: false,
        },
      ],
    };

    onOrderCreated(newOrder);
    setConfirmedOrder(newOrder);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (confirmedOrder) {
    const samplePixPayload = `00020126580014BR.GOV.BCB.PIX0136brasiltech-${confirmedOrder.orderNumber.toLowerCase()}5204000053039865406${confirmedOrder.total.toFixed(
      2
    )}5802BR5911BRASIL TECH6008CURITIBA62070503***6304A91F`;

    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="bg-white border border-[#E3DFD6] rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-3 text-[#825F19]">
            <CheckCircle2 size={26} aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Pedido registrado com sucesso
            </span>
          </div>

          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-[#181B22]">
            Pedido {confirmedOrder.orderNumber} confirmado
          </h1>
          <p className="mt-2 text-sm text-[#555B66]">
            Enviamos o resumo para <strong>{confirmedOrder.customer.email}</strong>. Utilize o código
            abaixo para acompanhar cada etapa da preparação e entrega.
          </p>

          {/* Order Summary Strip */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F8F6F2] border border-[#E3DFD6]">
            <div>
              <p className="text-xs text-[#555B66]">Código de rastreio</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-[#181B22]">
                {confirmedOrder.trackingCode}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#555B66]">Entrega para</p>
              <p className="mt-0.5 text-sm font-semibold text-[#181B22]">
                {confirmedOrder.customer.city}, {confirmedOrder.customer.state.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#555B66]">Total do pedido</p>
              <p className="mt-0.5 font-display text-base font-bold text-[#181B22] tabular-nums">
                {formatBRL(confirmedOrder.total)}
              </p>
            </div>
          </div>

          {/* Pix Code Box if Pix */}
          {confirmedOrder.paymentMethod === 'pix' && (
            <div className="mt-6 p-5 rounded-xl border border-[#E3DFD6] bg-[#EFECE6]/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#181B22]">
                <QrCode size={18} className="text-[#825F19]" aria-hidden="true" />
                <span>Pix Copia e Cola — confirmação imediata</span>
              </div>
              <p className="mt-2 font-mono text-xs text-[#555B66] break-all bg-white p-3 rounded-lg border border-[#E3DFD6]">
                {samplePixPayload}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(samplePixPayload);
                  setCopiedPix(true);
                  setTimeout(() => setCopiedPix(false), 2500);
                }}
                className="mt-3 inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg bg-[#13161C] text-[#F8F6F2] text-xs font-semibold hover:bg-[#232833] transition-colors"
              >
                <Copy size={14} aria-hidden="true" />
                <span>{copiedPix ? 'Código Pix copiado' : 'Copiar código Pix'}</span>
              </button>
            </div>
          )}

          {/* Itemized Receipt */}
          <div className="mt-6 pt-6 border-t border-[#EFECE6]">
            <h2 className="font-display text-base font-semibold text-[#181B22]">Itens do pedido</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {confirmedOrder.items.map((it) => (
                <li
                  key={`${it.productId}-${it.variantLabel}`}
                  className="flex items-center justify-between gap-4 text-[#181B22]"
                >
                  <span>
                    {it.quantity}x {it.name} ({it.variantLabel})
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatBRL(it.unitPrice * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onGoToTracking(confirmedOrder.trackingCode)}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-semibold transition-colors"
            >
              <Truck size={16} aria-hidden="true" />
              <span>Rastrear meu pedido</span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#E3DFD6] hover:border-[#181B22] text-sm font-medium text-[#181B22] transition-colors"
            >
              Voltar à loja
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#181B22]">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-[#555B66]">
          Adicione ao menos um produto antes de finalizar a compra.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 min-h-[44px] px-6 py-2.5 rounded-lg bg-[#13161C] text-[#F8F6F2] text-sm font-semibold"
        >
          Explorar catálogo
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[40px] text-sm font-medium text-[#555B66] hover:text-[#181B22] transition-colors"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Continuar comprando</span>
      </button>

      <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-[#181B22]">
        Finalizar pedido
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Customer & Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Data */}
          <div className="bg-white border border-[#E3DFD6] rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#181B22]">
              1. Dados do comprador e entrega
            </h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#555B66] mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Ex.: Mariana Oliveira"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555B66] mb-1">CPF *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customer.cpf}
                  onChange={(e) => setCustomer({ ...customer, cpf: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm font-mono tabular-nums focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555B66] mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  value={customer.whatsapp}
                  onChange={(e) => setCustomer({ ...customer, whatsapp: maskPhone(e.target.value) })}
                  placeholder="(41) 99999-9999"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm font-mono tabular-nums focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#555B66] mb-1">E-mail *</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="voce@email.com.br"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555B66] mb-1">CEP *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customer.cep}
                  onChange={(e) => setCustomer({ ...customer, cep: maskCEP(e.target.value) })}
                  placeholder="00000-000"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm font-mono tabular-nums focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555B66] mb-1">Número *</label>
                <input
                  type="text"
                  value={customer.number}
                  onChange={(e) => setCustomer({ ...customer, number: e.target.value })}
                  placeholder="Ex.: 222"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#555B66] mb-1">
                  Endereço (Rua / Avenida) *
                </label>
                <input
                  type="text"
                  value={customer.street}
                  onChange={(e) => setCustomer({ ...customer, street: e.target.value })}
                  placeholder="Ex.: Av. Getúlio Vargas"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#555B66] mb-1">Cidade *</label>
                <input
                  type="text"
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  placeholder="Curitiba"
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#555B66] mb-1">UF *</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={customer.state}
                    onChange={(e) =>
                      setCustomer({ ...customer, state: e.target.value.toUpperCase() })
                    }
                    placeholder="PR"
                    className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm uppercase focus:outline-none focus:border-[#13161C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555B66] mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={customer.complement}
                    onChange={(e) => setCustomer({ ...customer, complement: e.target.value })}
                    placeholder="Apto / Bloco"
                    className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm focus:outline-none focus:border-[#13161C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="bg-white border border-[#E3DFD6] rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#181B22]">
              2. Opção de entrega
            </h2>
            <p className="mt-1 text-xs text-[#555B66]">
              {customer.cep.replace(/\D/g, '').length === 8
                ? `Opções disponíveis para o CEP ${customer.cep}:`
                : 'Informe seu CEP acima ou escolha a modalidade de envio:'}
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHIPPING_OPTIONS.map((option) => {
                const active = selectedShippingId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSimulateShipping(customer.cep, option.id)}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                        : 'border-[#E3DFD6] bg-[#F8F6F2] text-[#181B22] hover:border-[#181B22]'
                    }`}
                  >
                    <div>
                      <p className="font-display text-sm font-semibold">{option.label}</p>
                      <p
                        className={`mt-0.5 text-xs ${
                          active ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                        }`}
                      >
                        {option.eta}
                      </p>
                    </div>
                    <span
                      className={`font-display text-base font-bold tabular-nums shrink-0 ${
                        active ? 'text-[#CFB06F]' : 'text-[#181B22]'
                      }`}
                    >
                      {formatBRL(option.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-[#E3DFD6] rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#181B22]">
              3. Forma de pagamento
            </h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  paymentMethod === 'pix'
                    ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                    : 'border-[#E3DFD6] bg-[#F8F6F2] text-[#181B22] hover:border-[#181B22]'
                }`}
              >
                <QrCode
                  size={18}
                  className={paymentMethod === 'pix' ? 'text-[#CFB06F]' : 'text-[#825F19]'}
                  aria-hidden="true"
                />
                <p className="mt-2 font-display text-sm font-semibold">Pix Instantâneo</p>
                <p
                  className={`mt-0.5 text-xs tabular-nums ${
                    paymentMethod === 'pix' ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                  }`}
                >
                  {formatBRL(getPixPrice(subtotal))}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  paymentMethod === 'cartao'
                    ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                    : 'border-[#E3DFD6] bg-[#F8F6F2] text-[#181B22] hover:border-[#181B22]'
                }`}
              >
                <CreditCard
                  size={18}
                  className={paymentMethod === 'cartao' ? 'text-[#CFB06F]' : 'text-[#825F19]'}
                  aria-hidden="true"
                />
                <p className="mt-2 font-display text-sm font-semibold">Cartão até 12x</p>
                <p
                  className={`mt-0.5 text-xs tabular-nums ${
                    paymentMethod === 'cartao' ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                  }`}
                >
                  12x de {formatBRL(subtotal / 12)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('boleto')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  paymentMethod === 'boleto'
                    ? 'border-[#13161C] bg-[#13161C] text-[#F8F6F2]'
                    : 'border-[#E3DFD6] bg-[#F8F6F2] text-[#181B22] hover:border-[#181B22]'
                }`}
              >
                <ShieldCheck
                  size={18}
                  className={paymentMethod === 'boleto' ? 'text-[#CFB06F]' : 'text-[#825F19]'}
                  aria-hidden="true"
                />
                <p className="mt-2 font-display text-sm font-semibold">Boleto Bancário</p>
                <p
                  className={`mt-0.5 text-xs tabular-nums ${
                    paymentMethod === 'boleto' ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                  }`}
                >
                  {formatBRL(subtotal)}
                </p>
              </button>
            </div>

            {paymentMethod === 'cartao' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-[#555B66] mb-1">
                  Número de parcelas
                </label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#E3DFD6] bg-[#F8F6F2] text-sm tabular-nums focus:outline-none focus:border-[#13161C]"
                >
                  {[1, 2, 3, 6, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatBRL(subtotal / n)} (total {formatBRL(subtotal)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#E3DFD6] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-[#181B22]">Resumo do pedido</h2>

          <ul className="space-y-3 border-b border-[#EFECE6] pb-4">
            {items.map((item) => {
              const price = (item.product.price + item.variant.priceDelta) * item.quantity;
              return (
                <li
                  key={`${item.product.id}-${item.variant.id}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#181B22] truncate">
                      {item.quantity}x {item.product.name}
                    </p>
                    <p className="text-xs text-[#555B66]">{item.variant.label}</p>
                  </div>
                  <span className="font-semibold text-[#181B22] tabular-nums shrink-0">
                    {formatBRL(price)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#555B66]">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatBRL(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#555B66]">
              <span>{selectedShipping.label}</span>
              <span className="font-semibold text-[#181B22] tabular-nums">
                {formatBRL(shippingCost)}
              </span>
            </div>
            {pixDiscount > 0 && (
              <div className="flex justify-between text-[#825F19] font-medium">
                <span>Ajuste promocional</span>
                <span className="tabular-nums">-{formatBRL(pixDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-[#EFECE6]">
              <span className="font-semibold text-[#181B22]">Total</span>
              <span className="font-display text-2xl font-bold text-[#181B22] tabular-nums">
                {formatBRL(total)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <p className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-bold transition-colors"
          >
            Confirmar pedido
          </button>

          <p className="text-xs text-[#555B66] flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#825F19] shrink-0" aria-hidden="true" />
            <span>Garantia de 6 meses e código de rastreio gerado na confirmação.</span>
          </p>
        </aside>
      </form>
    </section>
  );
}
