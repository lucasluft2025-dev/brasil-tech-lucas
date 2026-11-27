import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
} from 'lucide-react';
import {
  COUPONS,
  CartEntry,
  MarketplaceOrder,
  MarketplaceProduct,
  OrderItem,
  money,
} from '../data/marketplaceCatalog';
import {
  PersistedCoupon,
  PersistedTracking,
  StoreSettings,
  TRACKING_STAGE_DESCRIPTIONS,
  TRACKING_STAGE_LABELS,
  isValidTrackingCodeFormat,
  normalizeTrackingLookupInput,
  subscribeLiveTrackingByCode,
} from '../services/firestoreStore';
import { VisitorRegion } from '../services/regionLookup';
import { trackMetaInitiateCheckout, trackMetaPurchase } from '../lib/metaPixel';
import { LiveTrackingMap } from './LiveTrackingMap';
import { TrackingDocumentsModal } from './TrackingDocumentsModal';

interface MercadoPagoPixState {
  paymentId: string;
  orderCode: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
}

interface CheckoutViewProps {
  cart: CartEntry[];
  products: MarketplaceProduct[];
  coupons: PersistedCoupon[];
  storeSettings: StoreSettings;
  userCep: string;
  userName: string;
  currentUser: User | null;
  visitorRegion?: VisitorRegion | null;
  selectedShipping: 'express' | 'standard';
  onChangeShipping: (method: 'express' | 'standard') => void;
  onChangeItemQty?: (productId: number, delta: number) => void;
  onRemoveItem?: (productId: number) => void;
  onClearCart?: () => void;
  onUpdateCep: (cep: string) => void;
  onPlaceOrder?: (
    order: MarketplaceOrder,
    items: OrderItem[],
    couponCode: string
  ) => Promise<void>;
  onRecordDirectCheckout?: (
    order: MarketplaceOrder,
    items: OrderItem[],
    couponCode: string
  ) => void;
  onRequireLogin?: () => void;
  onOpenSecurityPage?: () => void;
  onBack: () => void;
  onGoOrders: () => void;
  onNotify: (msg: string) => void;
}

function formatCepMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

function normalizeBrPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

function formatBrPhoneDisplay(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function findCursorAfterNDigits(formatted: string, targetDigits: number): number {
  if (targetDigits <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count += 1;
      if (count === targetDigits) {
        return i + 1;
      }
    }
  }
  return formatted.length;
}

function normalizeProductCheckoutUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

type CepLookupStatus = 'idle' | 'loading' | 'found' | 'not_found';

export function CheckoutView({
  cart,
  products,
  coupons,
  storeSettings,
  userCep,
  userName,
  currentUser,
  visitorRegion,
  selectedShipping,
  onChangeShipping,
  onChangeItemQty,
  onRemoveItem,
  onClearCart,
  onUpdateCep,
  onPlaceOrder,
  onRecordDirectCheckout,
  onOpenSecurityPage,
  onBack,
  onGoOrders,
  onNotify,
}: CheckoutViewProps) {
  const [name, setName] = useState(currentUser?.displayName || userName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState(() => formatCepMask(userCep || ''));
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityState, setCityState] = useState('');
  const [cepStatus, setCepStatus] = useState<CepLookupStatus>('idle');
  const [lastFetchedCep, setLastFetchedCep] = useState('');
  const [redirectTriggeredUrl, setRedirectTriggeredUrl] = useState('');
  const [mpConfigured, setMpConfigured] = useState(false);
  const [mpBusy, setMpBusy] = useState(false);
  const [mpPix, setMpPix] = useState<MercadoPagoPixState | null>(null);
  const [mpPaidOrderCode, setMpPaidOrderCode] = useState('');

  const [couponInput, setCouponInput] = useState<string>(() => {
    try {
      return localStorage.getItem('bt_saved_coupon_v1') || '';
    } catch {
      return '';
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<string>(() => {
    try {
      const saved = (localStorage.getItem('bt_saved_coupon_v1') || '').trim().toUpperCase();
      return saved && COUPONS[saved] ? saved : '';
    } catch {
      return '';
    }
  });

  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const houseNumberInputRef = useRef<HTMLInputElement | null>(null);
  const cepRequestIdRef = useRef(0);

  const couponMap = (() => {
    const map: Record<string, { type: 'percent' | 'fixed'; value: number; label: string }> = {};
    if (coupons.length === 0) {
      return { ...COUPONS };
    }
    coupons.forEach((c) => {
      if (c.active) {
        map[c.code.toUpperCase()] = { type: c.type, value: c.value, label: c.label };
      }
    });
    return map;
  })();

  const items = cart
    .map((entry) => {
      const product = products.find((p) => p.id === entry.id);
      return product ? { product, qty: entry.qty } : null;
    })
    .filter((x): x is { product: MarketplaceProduct; qty: number } => Boolean(x));

  const primaryProduct = items[0]?.product || null;
  const directBuyUrl = normalizeProductCheckoutUrl(primaryProduct?.checkoutUrl);

  const subtotal = items.reduce((sum, x) => sum + x.product.price * x.qty, 0);
  const shippingCost =
    selectedShipping === 'express'
      ? storeSettings.expressShippingPrice
      : storeSettings.standardShippingPrice;

  const couponData = appliedCoupon ? couponMap[appliedCoupon] : undefined;
  const couponDiscount = couponData
    ? couponData.type === 'percent'
      ? Number(((subtotal * couponData.value) / 100).toFixed(2))
      : Math.min(subtotal, couponData.value)
    : 0;

  const subtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const totalPix = Number((subtotalAfterCoupon + shippingCost).toFixed(2));

  // Cursor-safe WhatsApp phone handler (prevents cursor jumping back to position 0 or stripping digits)
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const rawValue = inputEl.value;
    const selStart = inputEl.selectionStart ?? rawValue.length;
    const rawBeforeCursor = rawValue.slice(0, selStart);
    const digitsBeforeCursor = rawBeforeCursor.replace(/\D/g, '').length;

    const normalizedDigits = normalizeBrPhoneDigits(rawValue);
    const formatted = formatBrPhoneDisplay(normalizedDigits);
    setPhone(formatted);

    // Adjust target digit count if country prefix "55" was stripped on paste/autofill
    const rawTotalDigits = rawValue.replace(/\D/g, '').length;
    const strippedCount = Math.max(0, rawTotalDigits - normalizedDigits.length);
    const adjustedDigitsBefore = Math.max(0, digitsBeforeCursor - strippedCount);
    const nextCursor = findCursorAfterNDigits(formatted, adjustedDigitsBefore);

    window.requestAnimationFrame(() => {
      if (phoneInputRef.current && document.activeElement === phoneInputRef.current) {
        phoneInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  // Automatic CEP address lookup (ViaCEP primary + BrasilAPI fallback)
  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length < 8) {
      setCepStatus('idle');
      setLastFetchedCep('');
      return;
    }
    if (digits === lastFetchedCep) return;

    const reqId = ++cepRequestIdRef.current;
    const controller = new AbortController();
    setCepStatus('loading');

    const lookupAddress = async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (reqId !== cepRequestIdRef.current) return;
          if (!data.erro && (data.logradouro || data.localidade)) {
            setStreet(data.logradouro || '');
            setNeighborhood(data.bairro || '');
            setCityState(
              data.localidade ? `${data.localidade}${data.uf ? ` - ${data.uf}` : ''}` : ''
            );
            setLastFetchedCep(digits);
            setCepStatus('found');
            onUpdateCep(formatCepMask(digits));
            window.setTimeout(() => houseNumberInputRef.current?.focus(), 60);
            return;
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }

      try {
        const fallbackRes = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
          signal: controller.signal,
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (reqId !== cepRequestIdRef.current) return;
          if (data.city || data.street) {
            setStreet(data.street || '');
            setNeighborhood(data.neighborhood || '');
            setCityState(data.city ? `${data.city}${data.state ? ` - ${data.state}` : ''}` : '');
            setLastFetchedCep(digits);
            setCepStatus('found');
            onUpdateCep(formatCepMask(digits));
            window.setTimeout(() => houseNumberInputRef.current?.focus(), 60);
            return;
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }

      if (reqId === cepRequestIdRef.current) {
        setLastFetchedCep(digits);
        setCepStatus('not_found');
      }
    };

    lookupAddress();
    return () => controller.abort();
  }, [cep, lastFetchedCep, onUpdateCep]);

  useEffect(() => {
    let active = true;
    fetch('/api/payments/mercadopago/status')
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data: { configured?: boolean }) => {
        if (active) setMpConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (active) setMpConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      trackMetaInitiateCheckout(
        items.map((i) => ({ id: i.product.id, qty: i.qty })),
        totalPix
      );
    }
  }, [items.length, totalPix]);

  useEffect(() => {
    if (!mpPix || mpPix.status === 'approved') return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/mercadopago/${encodeURIComponent(mpPix.paymentId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        const nextStatus = String(data.status || 'pending');
        if (nextStatus !== mpPix.status) {
          setMpPix((prev) => (prev ? { ...prev, status: nextStatus } : null));
          if (nextStatus === 'approved') {
            const { order, orderItems } = buildOrderRecord();
            order.code = mpPix.orderCode;
            order.statusStep = 1;
            order.trackingCode = 'Pagamento PIX confirmado — Em separação';
            if (onPlaceOrder) {
              await onPlaceOrder(order, orderItems, appliedCoupon).catch(() => undefined);
            } else {
              onRecordDirectCheckout?.(order, orderItems, appliedCoupon);
            }
            trackMetaPurchase(
              order.code,
              orderItems.map((i) => ({ id: i.id, qty: i.qty })),
              totalPix
            );
            setMpPaidOrderCode(order.code);
            onClearCart?.();
            onNotify('Pagamento PIX confirmado pelo Mercado Pago!');
          }
        }
      } catch {
        // keep polling silently
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [mpPix, appliedCoupon, onPlaceOrder, onRecordDirectCheckout, onClearCart, onNotify, totalPix]);

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (!couponMap[code]) {
      onNotify('Cupom não encontrado ou expirado. Experimente BEMVINDO50 ou PRIMEIRACOMPRA.');
      return;
    }
    setAppliedCoupon(code);
    try {
      localStorage.setItem('bt_saved_coupon_v1', code);
    } catch {
      // ignore storage error
    }
    onNotify(`Cupom ${code} aplicado!`);
  };

  const buildOrderRecord = () => {
    const cleanCep = formatCepMask(cep);
    const fullAddress = street.trim()
      ? `${street.trim()}${houseNumber.trim() ? `, nº ${houseNumber.trim()}` : ''}${
          complement.trim() ? ` (${complement.trim()})` : ''
        }${neighborhood.trim() ? ` - ${neighborhood.trim()}` : ''}`
      : 'A combinar via WhatsApp';

    const order: MarketplaceOrder = {
      code: `BT-${Math.floor(10000 + Math.random() * 89999)}`,
      createdAt: new Date().toLocaleString('pt-BR'),
      customerName: name.trim() || 'Cliente WhatsApp',
      customerCpf: 'Mini Checkout',
      customerPhone: phone.trim() || 'Não informado',
      cep: cleanCep || 'Não informado',
      address: fullAddress,
      cityState: cityState.trim() || 'Brasil',
      shippingMethod: selectedShipping,
      shippingLabel:
        selectedShipping === 'express'
          ? 'Entrega Expressa (No mesmo dia)'
          : 'Entrega Padrão (Até 2 dias úteis)',
      shippingCost,
      paymentMethod: 'pix',
      subtotal,
      discount: couponDiscount,
      total: totalPix,
      statusStep: 0,
      trackingCode: 'Aguardando pagamento PIX',
    };

    const orderItems: OrderItem[] = items.map(({ product, qty }) => ({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      qty,
    }));

    return { order, orderItems, cleanCep };
  };

  // Pre-filled WhatsApp message identifying the exact product + filled customer info
  const buildWhatsAppMessage = (): string => {
    const cleanCep = formatCepMask(cep);
    const itemsText = items
      .map(
        ({ product, qty }) =>
          `• *${qty}x ${product.name}* (#${product.id}) — ${money(product.price * qty)}`
      )
      .join('\n');

    const filledCustomerLines = [
      name.trim() ? `• Nome: *${name.trim()}*` : '',
      phone.trim() ? `• WhatsApp: ${phone.trim()}` : '',
      cleanCep ? `• CEP: ${cleanCep}` : '',
      street.trim()
        ? `• Endereço: ${street.trim()}${houseNumber.trim() ? `, nº ${houseNumber.trim()}` : ''}${
            complement.trim() ? ` (${complement.trim()})` : ''
          }`
        : houseNumber.trim()
          ? `• Número da casa: ${houseNumber.trim()}${
              complement.trim() ? ` (${complement.trim()})` : ''
            }`
          : '',
      neighborhood.trim() ? `• Bairro: ${neighborhood.trim()}` : '',
      cityState.trim() ? `• Cidade/UF: ${cityState.trim()}` : '',
    ].filter(Boolean);

    const lines = [
      `Olá! Quero finalizar minha compra na *${storeSettings.storeName}* via *PIX* ⚡`,
      '',
      `*Produto que estou vendo:*`,
      itemsText || '• Produto selecionado',
      '',
      `*Valores e entrega:*`,
      `• Entrega: ${
        selectedShipping === 'express' ? 'Expressa (Hoje)' : 'Padrão (2 dias úteis)'
      } (${money(shippingCost)})`,
      appliedCoupon ? `• Cupom aplicado: ${appliedCoupon} (-${money(couponDiscount)})` : '',
      `• Total à vista no PIX: *${money(totalPix)}*`,
      '',
      ...(filledCustomerLines.length > 0
        ? [`*Meus dados preenchidos:*`, ...filledCustomerLines]
        : [`*Dados:* Gostaria de finalizar meu atendimento pelo WhatsApp.`]),
    ].filter((line) => line !== '');

    return `https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
      lines.join('\n')
    )}`;
  };

  const handleGoToProductLink = (e: MouseEvent<HTMLAnchorElement>) => {
    const { order, orderItems, cleanCep } = buildOrderRecord();
    if (cleanCep.replace(/\D/g, '').length === 8) {
      onUpdateCep(cleanCep);
    }

    if (!directBuyUrl) {
      e.preventDefault();
      onNotify(
        'Link direto não cadastrado para este item. Clique abaixo para finalizar direto no WhatsApp!'
      );
      return;
    }

    onRecordDirectCheckout?.(order, orderItems, appliedCoupon);
    setRedirectTriggeredUrl(directBuyUrl);
    onNotify('Abrindo o link oficial do produto!');
  };

  // Never blocks or jumps back to unfilled fields when sending to WhatsApp!
  const handleWhatsAppCheckout = () => {
    const { order, orderItems, cleanCep } = buildOrderRecord();
    if (cleanCep.replace(/\D/g, '').length === 8) {
      onUpdateCep(cleanCep);
    }
    onRecordDirectCheckout?.(order, orderItems, appliedCoupon);
    onNotify('Abrindo WhatsApp com o produto e seus dados já montados!');
  };

  const handleGenerateMercadoPagoPix = async () => {
    if (!name.trim()) {
      onNotify('Informe seu nome completo para gerar a cobrança PIX.');
      return;
    }
    const { order, orderItems, cleanCep } = buildOrderRecord();
    if (cleanCep.replace(/\D/g, '').length === 8) {
      onUpdateCep(cleanCep);
    }
    setMpBusy(true);
    try {
      const res = await fetch('/api/payments/mercadopago/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.code,
          amount: totalPix,
          description: `${storeSettings.storeName} - Pedido ${order.code}`,
          payerName: name.trim(),
          payerEmail: email.trim() || currentUser?.email || '',
          items: orderItems.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        }),
      });
      const data = (await res.json()) as Partial<MercadoPagoPixState> & { error?: string };
      if (!res.ok || !data.paymentId) {
        onNotify(data.error || 'Não foi possível gerar o PIX agora.');
        return;
      }
      setMpPix({
        paymentId: String(data.paymentId),
        orderCode: order.code,
        status: String(data.status || 'pending'),
        qrCode: String(data.qrCode || ''),
        qrCodeBase64: String(data.qrCodeBase64 || ''),
        ticketUrl: String(data.ticketUrl || ''),
      });
      onNotify('QR Code PIX gerado! Aguardando confirmação oficial do Mercado Pago.');
    } catch {
      onNotify('Falha de comunicação ao gerar o PIX.');
    } finally {
      setMpBusy(false);
    }
  };

  const cepDigitsCount = cep.replace(/\D/g, '').length;
  const ipRegionLabel =
    visitorRegion && (visitorRegion.city || visitorRegion.uf)
      ? [visitorRegion.city, visitorRegion.uf].filter(Boolean).join(' - ')
      : '';
  const expressRegionLabel = cityState.trim() || ipRegionLabel;
  const showAddressDetails =
    cepStatus === 'found' ||
    cepStatus === 'not_found' ||
    cepDigitsCount === 8 ||
    Boolean(street || cityState);

  if (items.length === 0) {
    return (
      <section className="checkout-wrap">
        <div className="pdp-top">
          <button type="button" className="pdp-back" onClick={onBack}>
            ← Voltar para a loja
          </button>
          <div className="checkout-ssl-pill">🔒 Mini Checkout Rápido • Pagamento via PIX</div>
        </div>
        <div className="checkout-card" style={{ textAlign: 'center', padding: 36 }}>
          <h2>Nenhum produto selecionado</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Escolha um produto no catálogo e clique em <b>Comprar agora</b> para preencher seus dados
            e finalizar no PIX ou WhatsApp.
          </p>
          <button type="button" className="primary" onClick={onBack} style={{ marginTop: 10 }}>
            Voltar ao catálogo
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-wrap">
      <div className="pdp-top">
        <button type="button" className="pdp-back" onClick={onBack}>
          ← Voltar para a loja
        </button>
        <div className="checkout-ssl-pill">🔒 Mini Checkout Seguro • Pagamento via PIX</div>
      </div>

      <div className="mini-checkout-header">
        <h1 className="checkout-heading">Finalizar compra rápida</h1>
        <p className="mini-checkout-sub">
          Preencha seu nome, WhatsApp e CEP para localizarmos seu endereço automaticamente — ou chame
          direto no WhatsApp com o produto já selecionado.
        </p>
      </div>

      <div className="checkout-grid">
        <div className="checkout-forms">
          <div className="checkout-card">
            <h2>1. Seus dados de contato e CEP</h2>
            <div className="form-grid-2">
              <label>
                <span>Seu nome completo</span>
                <input
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label>
                <span>E-mail para nota e comprovante</span>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                <span>Seu número de WhatsApp</span>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(41) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </label>

              <label>
                <span>CEP de entrega</span>
                <div className="cep-input-wrap">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="00000-000"
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(formatCepMask(e.target.value))}
                  />
                  {cepStatus === 'loading' && (
                    <span className="cep-spinner" aria-label="Buscando CEP">
                      <Loader2 size={16} className="spin" />
                    </span>
                  )}
                </div>
              </label>
            </div>

            {cepStatus === 'loading' && (
              <div className="cep-status-pill is-loading">
                <Loader2 size={15} className="spin" />
                <span>Buscando endereço automático para o CEP {cep}...</span>
              </div>
            )}

            {cepStatus === 'found' && (
              <div className="cep-status-pill is-found">
                <CheckCircle2 size={15} />
                <span>
                  Endereço localizado automaticamente! Preencha o <strong>número da casa</strong>{' '}
                  abaixo.
                </span>
              </div>
            )}

            {cepStatus === 'not_found' && (
              <div className="cep-status-pill is-warn">
                <MapPin size={15} />
                <span>
                  Não encontramos esse CEP automaticamente. Você pode preencher o endereço abaixo ou
                  enviar direto pelo WhatsApp.
                </span>
              </div>
            )}

            {showAddressDetails && (
              <div className="checkout-address-box">
                <div className="checkout-address-box-head">
                  <MapPin size={16} />
                  <strong>Endereço encontrado e número da casa</strong>
                </div>

                {cepStatus === 'found' && (street || cityState) && (
                  <div className="checkout-address-preview">
                    <strong>{street || 'Logradouro não especificado pelo CEP'}</strong>
                    <span>
                      {[neighborhood, cityState].filter(Boolean).join(' • ')} — CEP{' '}
                      {formatCepMask(cep)}
                    </span>
                  </div>
                )}

                <div className="form-grid-2">
                  <label className="span-2">
                    <span>Rua / Avenida</span>
                    <input
                      placeholder="Rua ou Avenida"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </label>

                  <label className="checkout-house-field">
                    <span>Número da casa</span>
                    <input
                      ref={houseNumberInputRef}
                      placeholder="Ex: 245"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Complemento (opcional)</span>
                    <input
                      placeholder="Apto, Bloco, Casa..."
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Bairro</span>
                    <input
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Cidade - UF</span>
                    <input
                      placeholder="Curitiba - PR"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="checkout-card">
            <h2>2. Opção de entrega e pagamento</h2>
            <div className="checkout-ip-region-pill" role="status" aria-live="polite">
              <MapPin size={15} />
              <span>
                {ipRegionLabel ? (
                  <>
                    Região identificada pelo seu IP: <strong>{ipRegionLabel}</strong> — Entrega
                    no mesmo dia liberada!
                  </>
                ) : (
                  <>
                    Entrega expressa disponível na sua região — confirme seu CEP para entrega{' '}
                    <strong>no mesmo dia</strong>.
                  </>
                )}
              </span>
            </div>
            <div className="checkout-radio-list">
              <label
                className={`checkout-radio-item ${selectedShipping === 'express' ? 'active' : ''}`}
              >
                <div>
                  <input
                    type="radio"
                    name="shipMethod"
                    checked={selectedShipping === 'express'}
                    onChange={() => onChangeShipping('express')}
                  />
                  <div>
                    <b>
                      ⚡ Entrega Expressa — No mesmo dia
                      {expressRegionLabel ? ` (${expressRegionLabel})` : ''}
                    </b>
                    <small>
                      {expressRegionLabel
                        ? `Região localizada (${expressRegionLabel}): entregamos no mesmo dia com rastreamento em tempo real`
                        : 'Prioridade máxima com rastreio em tempo real na sua região'}
                    </small>
                  </div>
                </div>
                <strong>{money(storeSettings.expressShippingPrice)}</strong>
              </label>

              <label
                className={`checkout-radio-item ${selectedShipping === 'standard' ? 'active' : ''}`}
              >
                <div>
                  <input
                    type="radio"
                    name="shipMethod"
                    checked={selectedShipping === 'standard'}
                    onChange={() => onChangeShipping('standard')}
                  />
                  <div>
                    <b>📦 Entrega Padrão — Até 2 dias úteis</b>
                    <small>Envio protegido com seguro contra extravio</small>
                  </div>
                </div>
                <strong>{money(storeSettings.standardShippingPrice)}</strong>
              </label>

              <div className="checkout-radio-item active" style={{ cursor: 'default' }}>
                <div>
                  <div>
                    <b>⚡ Pagamento via PIX — Aprovação imediata</b>
                    <small>Confirmação instantânea e liberação prioritária do envio</small>
                  </div>
                </div>
                <strong className="green">PIX Oficial</strong>
              </div>
            </div>
          </div>
        </div>

        <aside className="checkout-summary">
          <div className="checkout-card">
            <h2>Resumo do pedido</h2>
            <div className="checkout-items">
              {items.map(({ product, qty }) => (
                <div className="checkout-mini-item" key={product.id}>
                  <img
                    src={product.image}
                    alt={product.name}
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <b>{product.name}</b>
                    <small>
                      {product.condition} • {product.warranty}
                    </small>
                    {onChangeItemQty && (
                      <div className="mini-checkout-qty">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          onClick={() => onChangeItemQty(product.id, -1)}
                        >
                          −
                        </button>
                        <span>{qty} un.</span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          onClick={() => onChangeItemQty(product.id, 1)}
                        >
                          +
                        </button>
                        {onRemoveItem && items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            style={{
                              width: 'auto',
                              padding: '0 8px',
                              fontSize: 11,
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              background: '#FEF2F2',
                            }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="checkout-mini-price">{money(product.price * qty)}</span>
                </div>
              ))}
            </div>

            <div className="coupon-box">
              <input
                type="text"
                placeholder="Cupom (ex: BEMVINDO50, PRIMEIRACOMPRA)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
              />
              <button type="button" onClick={handleApplyCoupon}>
                Aplicar
              </button>
            </div>
            {appliedCoupon && (
              <div className="coupon-applied">
                ✓ {couponMap[appliedCoupon]?.label || appliedCoupon} aplicado{' '}
                <button type="button" onClick={() => setAppliedCoupon('')}>
                  Remover
                </button>
              </div>
            )}

            <div className="summary-lines">
              <div>
                <span>Produtos ({items.reduce((a, b) => a + b.qty, 0)})</span>
                <span>{money(subtotal)}</span>
              </div>
              <div>
                <span>Frete ({selectedShipping === 'express' ? 'Mesmo dia' : '2 dias'})</span>
                <span>{money(shippingCost)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="discount-line">
                  <span>Desconto ({appliedCoupon})</span>
                  <span>− {money(couponDiscount)}</span>
                </div>
              )}
              <div className="summary-pix-highlight">
                <span>Total à vista no PIX</span>
                <strong>{money(totalPix)}</strong>
              </div>
            </div>

            <div className="checkout-cta-stack">
              {mpConfigured && (
                <div className="border border-lime-300 bg-lime-50/70 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-950">
                    <span>PIX Oficial Mercado Pago</span>
                    <span className="text-lime-800">Confirmação automática</span>
                  </div>

                  {mpPaidOrderCode ? (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                      <strong>Pagamento confirmado! Pedido {mpPaidOrderCode}</strong>
                      <p className="m-0">
                        Recebemos sua confirmação PIX pelo Mercado Pago. Acompanhe seu envio em
                        Meus Pedidos.
                      </p>
                      <button
                        type="button"
                        onClick={onGoOrders}
                        className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Acompanhar meu pedido →
                      </button>
                    </div>
                  ) : mpPix ? (
                    <div className="space-y-3 text-center">
                      {mpPix.qrCodeBase64 && (
                        <img
                          src={`data:image/png;base64,${mpPix.qrCodeBase64}`}
                          alt="QR Code PIX Mercado Pago"
                          className="w-44 h-44 mx-auto rounded-lg border border-slate-200 bg-white p-2"
                        />
                      )}
                      {mpPix.qrCode && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(mpPix.qrCode);
                            onNotify('Código PIX Copia e Cola copiado!');
                          }}
                          className="w-full py-2.5 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                        >
                          Copiar código PIX Copia e Cola
                        </button>
                      )}
                      <div className="text-[11px] text-slate-600">
                        Aguardando confirmação em tempo real do Mercado Pago...
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={mpBusy}
                      onClick={handleGenerateMercadoPagoPix}
                      className="checkout-go-buy-btn"
                    >
                      {mpBusy ? 'Gerando QR Code PIX...' : `Gerar PIX de ${money(totalPix)}`}
                    </button>
                  )}
                </div>
              )}

              {directBuyUrl && (
                <a
                  href={directBuyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="checkout-go-buy-btn"
                  onClick={handleGoToProductLink}
                >
                  <span>Ir para o pagamento</span>
                  <ArrowRight size={17} strokeWidth={2.5} />
                </a>
              )}

              {!mpConfigured && !directBuyUrl && (
                <div className="checkout-no-link-alert">
                  Finalize diretamente pelo WhatsApp com atendimento humano: geramos a chave PIX
                  oficial e conferimos seus dados na hora.
                </div>
              )}

              {redirectTriggeredUrl && (
                <div className="checkout-redirect-banner">
                  <CheckCircle2 size={16} />
                  <div>
                    <b>Link de pagamento aberto em nova aba!</b>
                    <span>
                      Se preferir atendimento imediato ou se a página não abriu,{' '}
                      <a href={redirectTriggeredUrl} target="_blank" rel="noopener noreferrer">
                        clique aqui para abrir novamente <ExternalLink size={12} />
                      </a>{' '}
                      ou finalize pelo WhatsApp abaixo.
                    </span>
                  </div>
                </div>
              )}

              <div className="checkout-or-divider">
                <span>ou finalize direto no WhatsApp</span>
              </div>

              <a
                href={buildWhatsAppMessage()}
                target="_blank"
                rel="noopener noreferrer"
                className="checkout-wa-btn"
                onClick={handleWhatsAppCheckout}
              >
                <MessageCircle size={18} strokeWidth={2.3} />
                <span>Chamar no WhatsApp para finalizar compra</span>
              </a>
            </div>

            <div className="checkout-trust-notes">
              <div>
                <ShieldCheck
                  size={14}
                  style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }}
                />
                Compra Garantida {storeSettings.storeName}: reembolso em até 7 dias.
              </div>
              <div>⚡ Pagamento instantâneo via PIX com aprovação na hora.</div>
              {onOpenSecurityPage && (
                <div>
                  <button
                    type="button"
                    className="pdp-security-link"
                    onClick={onOpenSecurityPage}
                  >
                    Ver garantia e política de reembolso 7 dias →
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

interface OrdersTrackingViewProps {
  orders: MarketplaceOrder[];
  storeSettings: StoreSettings;
  initialTrackingCode?: string;
  onBack: () => void;
  onGoShowcase?: () => void;
  onNotify?: (msg: string) => void;
}

const TIMELINE_STEPS = [...TRACKING_STAGE_LABELS];

export function OrdersTrackingView({
  orders,
  storeSettings,
  initialTrackingCode,
  onBack,
  onGoShowcase,
  onNotify,
}: OrdersTrackingViewProps) {
  const [trackingInput, setTrackingInput] = useState(
    () => normalizeTrackingLookupInput(initialTrackingCode || '')
  );
  const [searching, setSearching] = useState(false);
  const [lookupNonce, setLookupNonce] = useState(0);
  const [searchedCode, setSearchedCode] = useState<string | null>(() => {
    const clean = normalizeTrackingLookupInput(initialTrackingCode || '');
    return clean || null;
  });
  const [foundTracking, setFoundTracking] = useState<PersistedTracking | null>(null);
  const [lookupRulesError, setLookupRulesError] = useState(false);
  const [docModalTab, setDocModalTab] = useState<'nfe' | 'label' | null>(null);

  useEffect(() => {
    const clean = normalizeTrackingLookupInput(initialTrackingCode || '');
    if (clean) {
      setTrackingInput(clean);
      setSearchedCode(clean);
      setLookupNonce((n) => n + 1);
    }
  }, [initialTrackingCode]);

  // Real-time live subscription to the searched tracking code (drives live truck movement)
  useEffect(() => {
    if (!searchedCode) {
      setFoundTracking(null);
      setSearching(false);
      return;
    }
    if (!isValidTrackingCodeFormat(searchedCode)) {
      setFoundTracking(null);
      setLookupRulesError(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    let firstEmission = true;
    const unsub = subscribeLiveTrackingByCode(searchedCode, (tracking, rulesErr) => {
      setFoundTracking(tracking);
      setLookupRulesError(Boolean(rulesErr));
      if (firstEmission) {
        firstEmission = false;
        setSearching(false);
      }
    });
    return unsub;
  }, [searchedCode, lookupNonce]);

  const executeTrackingLookup = (rawCode: string) => {
    const clean = normalizeTrackingLookupInput(rawCode);
    if (!clean) {
      onNotify?.(`Digite o código de rastreio fornecido pela ${storeSettings.storeName}.`);
      return;
    }
    if (!isValidTrackingCodeFormat(clean)) {
      onNotify?.('Digite o código completo (mínimo 3 letras ou números, ex: BT849201BR).');
      setTrackingInput(clean);
      setSearchedCode(clean);
      setFoundTracking(null);
      setSearching(false);
      return;
    }
    setTrackingInput(clean);
    setLookupRulesError(false);
    setSearchedCode(clean);
    setLookupNonce((n) => n + 1);
  };

  const handleTrackingSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeTrackingLookup(trackingInput);
  };

  const resetTrackingSearch = () => {
    setTrackingInput('');
    setSearchedCode(null);
    setFoundTracking(null);
    setLookupRulesError(false);
  };

  return (
    <section className="checkout-wrap">
      <div className="pdp-top">
        <button type="button" className="pdp-back" onClick={onBack}>
          ← Voltar para a loja
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onGoShowcase && (
            <button type="button" className="pdp-back" onClick={onGoShowcase}>
              <Package size={14} /> Ver pedidos feitos e entregues →
            </button>
          )}
          <div className="checkout-ssl-pill">
            📦 Central de Rastreamento {storeSettings.storeName}
          </div>
        </div>
      </div>

      <div className="checkout-card tracking-lookup-card">
        <div className="tracking-lookup-head">
          <div>
            <span className="tracking-kicker">
              RASTREIO OFICIAL {storeSettings.storeName.toUpperCase()} • TEMPO REAL
            </span>
            <h1 className="checkout-heading" style={{ margin: '6px 0 4px' }}>
              Rastrear meu produto ao vivo
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              Digite o código de rastreio enviado no seu WhatsApp para acompanhar o caminhão no
              mapa em tempo real, conferir sua entrega e acessar seus comprovantes.
            </p>
          </div>
        </div>

        <form className="tracking-search-form" onSubmit={handleTrackingSubmit}>
          <input
            type="text"
            placeholder="Digite seu código de rastreio exato (ex: BT849201BR)"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
            aria-label="Código de rastreio"
          />
          <button type="submit" className="primary" disabled={searching}>
            {searching ? 'Buscando...' : 'Rastrear produto'}
          </button>
          {searchedCode && (
            <button type="button" className="pdp-back" onClick={resetTrackingSearch}>
              Limpar
            </button>
          )}
        </form>

        {!searchedCode && (
          <div className="tracking-stages-overview">
            <div className="tracking-stages-overview-head">
              <strong>Etapas do acompanhamento em tempo real</strong>
              <span>Atualização automática da central Brasil Tech até a entrega</span>
            </div>
            <div className="order-timeline is-preview">
              {TIMELINE_STEPS.map((step, idx) => (
                <div key={step} className="timeline-step is-preview-step">
                  <span className="dot">{idx + 1}</span>
                  <div className="timeline-step-copy">
                    <small>{step}</small>
                    <span className="timeline-step-desc">
                      {TRACKING_STAGE_DESCRIPTIONS[idx]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchedCode && !searching && (
          <div className="tracking-result-area">
            {foundTracking ? (
              <div className="tracking-found-box">
                <div className="tracking-found-top">
                  <div>
                    <div className="tracking-code-row">
                      <span className="tracking-code-pill">{foundTracking.code}</span>
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(foundTracking.code);
                          onNotify?.(`Código ${foundTracking.code} copiado!`);
                        }}
                      >
                        Copiar código
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => setDocModalTab('nfe')}
                      >
                        🧾 Ver Nota Fiscal
                      </button>
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => setDocModalTab('label')}
                      >
                        🏷️ Etiqueta de Envio
                      </button>
                    </div>
                    <h2 style={{ margin: '8px 0 2px', fontSize: 18 }}>
                      {foundTracking.productSummary}
                    </h2>
                    <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                      Destinatário: <b>{foundTracking.customerLabel}</b>
                      {foundTracking.maskedCpf ? ` • CPF: ${foundTracking.maskedCpf}` : ''} •
                      Trajeto: <b>{foundTracking.originCityState}</b> ➔{' '}
                      <b>{foundTracking.destinationCityState || foundTracking.cityState}</b>
                      {foundTracking.orderCode ? ` • Pedido: ${foundTracking.orderCode}` : ''}
                    </small>
                  </div>
                  <div className="tracking-status-badge">
                    {TIMELINE_STEPS[foundTracking.statusStep] || 'Pedido em logística'}
                  </div>
                </div>

                {foundTracking.statusNote && (
                  <div className="tracking-note-banner">
                    <strong>Última atualização:</strong> {foundTracking.statusNote}
                    {foundTracking.updatedAtLabel && (
                      <span> • {foundTracking.updatedAtLabel}</span>
                    )}
                  </div>
                )}

                <div className="tracking-stage-section">
                  <div className="tracking-stage-section-head">
                    <strong>Etapas do envio</strong>
                    <span>
                      Etapa {foundTracking.statusStep + 1} de {TIMELINE_STEPS.length} •{' '}
                      {TIMELINE_STEPS[foundTracking.statusStep]}
                    </span>
                  </div>
                  <div className="order-timeline">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isDone = idx < foundTracking.statusStep || foundTracking.statusStep === 4;
                      const isCurrent = idx === foundTracking.statusStep && foundTracking.statusStep < 4;
                      return (
                        <div
                          key={step}
                          className={`timeline-step ${
                            isDone ? 'done' : ''
                          } ${isCurrent ? 'done current' : ''}`}
                        >
                          <span className="dot">{idx <= foundTracking.statusStep ? '✓' : idx + 1}</span>
                          <div className="timeline-step-copy">
                            <small>{step}</small>
                            <span className="timeline-step-state">
                              {isCurrent
                                ? 'Etapa atual'
                                : idx <= foundTracking.statusStep
                                ? 'Concluído'
                                : 'Aguardando'}
                            </span>
                            <span className="timeline-step-desc">
                              {TRACKING_STAGE_DESCRIPTIONS[idx]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <LiveTrackingMap
                  originCityState={foundTracking.originCityState || 'Curitiba - PR'}
                  destinationCityState={
                    foundTracking.destinationCityState || foundTracking.cityState
                  }
                  currentLocation={foundTracking.currentLocation}
                  routeProgress={foundTracking.routeProgress}
                  statusStep={foundTracking.statusStep}
                  trackingCode={foundTracking.code}
                  shippingLabel={foundTracking.shippingLabel}
                  createdAtLabel={foundTracking.createdAtLabel}
                  updatedAtLabel={foundTracking.updatedAtLabel || foundTracking.createdAtLabel}
                />

                <div className="order-card-footer" style={{ marginTop: 14 }}>
                  <span>🚚 Modalidade: {foundTracking.shippingLabel}</span>
                  <span>
                    🕒 Atualizado em {foundTracking.updatedAtLabel || foundTracking.createdAtLabel}
                  </span>
                </div>
              </div>
            ) : (
              <div className="tracking-not-found-box">
                <strong>
                  {lookupRulesError
                    ? 'Consulta temporariamente indisponível'
                    : `Código "${searchedCode}" não encontrado`}
                </strong>
                <p>
                  {lookupRulesError
                    ? 'Não foi possível validar o rastreio no momento. Tente novamente em instantes ou fale com nosso suporte no WhatsApp.'
                    : `Nenhum envio ativo corresponde exatamente a esse código. Confira se digitou todas as letras e números exatamente como enviados pela ${storeSettings.storeName}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {docModalTab && foundTracking && (
        <TrackingDocumentsModal
          tracking={foundTracking}
          storeSettings={storeSettings}
          initialTab={docModalTab}
          onClose={() => setDocModalTab(null)}
          onNotify={onNotify}
        />
      )}

      <div className="orders-head" style={{ marginTop: 24 }}>
        <div>
          <h2 className="checkout-heading" style={{ fontSize: 19, marginBottom: 4 }}>
            Meus Pedidos na Conta ({orders.length})
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
            Compras realizadas com sua conta conectada nesta loja.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="checkout-card" style={{ textAlign: 'center', padding: 30 }}>
          <h3 style={{ marginTop: 0 }}>Nenhum pedido registrado nesta conta</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Se você recebeu um código de rastreio da nossa equipe, use o campo acima para consultar
            com o código exato.
          </p>
          <button type="button" className="primary" onClick={onBack} style={{ marginTop: 10 }}>
            Explorar catálogo
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const hasIssuedTracking =
              Boolean(order.trackingCode) &&
              order.trackingCode !== 'Aguardando postagem' &&
              order.trackingCode !== 'Aguardando envio';

            return (
              <div className="checkout-card" key={order.code}>
                <div className="order-card-top">
                  <div>
                    <strong>Pedido {order.code}</strong>
                    <small>
                      Realizado em {order.createdAt} • Rastreio:{' '}
                      <b>{order.trackingCode || 'Aguardando postagem'}</b>
                    </small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {hasIssuedTracking && (
                      <button
                        type="button"
                        className="admin-mini-btn"
                        onClick={() => executeTrackingLookup(order.trackingCode)}
                      >
                        Rastrear código →
                      </button>
                    )}
                    <div className="order-total-tag">{money(order.total)}</div>
                  </div>
                </div>

                <div className="order-timeline">
                  {TIMELINE_STEPS.map((step, idx) => (
                    <div
                      key={step}
                      className={`timeline-step ${idx <= order.statusStep ? 'done' : ''}`}
                    >
                      <span className="dot">{idx <= order.statusStep ? '✓' : idx + 1}</span>
                      <small>{step}</small>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <span>
                    📍 {order.address} — {order.cityState} (CEP {order.cep})
                  </span>
                  <span>🚚 {order.shippingLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
