import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Navigation,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { MarketplaceOrder, MarketplaceProduct, money } from '../data/marketplaceCatalog';
import {
  ShowcaseOrder,
  buildShowcaseOrders,
  loadShowcaseOverrides,
} from '../data/orderShowcase';

type TrustTab = 'entregues' | 'pagos' | 'todos';

interface ClientTrustBarProps {
  products: MarketplaceProduct[];
  liveOrders: MarketplaceOrder[];
  storeName: string;
  onOpenTracking: (trackingCode: string) => void;
  onOpenOrder: (orderCode: string) => void;
  onOpenShowcase: () => void;
  onGoTrackingLookup: () => void;
}

export function ClientTrustBar({
  products,
  liveOrders,
  storeName,
  onOpenTracking,
  onOpenOrder,
  onOpenShowcase,
  onGoTrackingLookup,
}: ClientTrustBarProps) {
  const [activeTab, setActiveTab] = useState<TrustTab>('entregues');

  const allOrders = useMemo<ShowcaseOrder[]>(() => {
    const overrides = loadShowcaseOverrides();
    return buildShowcaseOrders(products, liveOrders, overrides);
  }, [products, liveOrders]);

  const paidOrders = useMemo(
    () => allOrders.filter((o) => o.status === 'pago'),
    [allOrders]
  );

  const deliveredOrders = useMemo(
    () => allOrders.filter((o) => o.status === 'entregue'),
    [allOrders]
  );

  const visibleList = useMemo(() => {
    if (activeTab === 'entregues') return deliveredOrders.slice(0, 6);
    if (activeTab === 'pagos') return paidOrders.slice(0, 6);
    return allOrders.slice(0, 6);
  }, [activeTab, paidOrders, deliveredOrders, allOrders]);

  return (
    <section
      className="client-trust-bar"
      id="entregas-bar"
      aria-label="Central pública de aparelhos entregues, pedidos pagos e rastreamento"
    >
      <div className="client-trust-head">
        <div className="client-trust-title-wrap">
          <div className="client-trust-kicker-line">
            <ShieldCheck size={14} strokeWidth={2.2} />
            <span>
              Transparência Verificada · {storeName} · {deliveredOrders.length}+ aparelhos entregues
            </span>
          </div>
          <h2>Pedidos pagos, rastreios e aparelhos entregues em todo o Brasil</h2>
          <p>
            Confira entregas concluídas com garantia ou consulte o código de rastreio enviado pela
            nossa equipe no seu WhatsApp.
          </p>
        </div>

        <div className="client-trust-header-actions">
          <button
            type="button"
            className="client-trust-detail-btn"
            onClick={onGoTrackingLookup}
          >
            <Search size={14} />
            <span>Rastrear meu código</span>
          </button>
          <button
            type="button"
            className="client-trust-all-btn"
            onClick={onOpenShowcase}
          >
            <span>Ver todos ({allOrders.length} pedidos)</span>
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="client-trust-tabs" role="tablist" aria-label="Categorias de transparência">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'entregues'}
          className={`client-trust-tab is-delivered ${activeTab === 'entregues' ? 'active' : ''}`}
          onClick={() => setActiveTab('entregues')}
        >
          <PackageCheck size={15} />
          <span>Aparelhos Entregues</span>
          <b>{deliveredOrders.length}</b>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pagos'}
          className={`client-trust-tab ${activeTab === 'pagos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagos')}
        >
          <CheckCircle2 size={15} />
          <span>Pedidos Pagos (PIX)</span>
          <b>{paidOrders.length}</b>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'todos'}
          className={`client-trust-tab ${activeTab === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          <Truck size={15} />
          <span>Histórico Completo</span>
          <b>{allOrders.length}</b>
        </button>
      </div>

      <div className="client-trust-grid">
        {visibleList.map((ord) => {
          const isDelivered = ord.status === 'entregue';

          return (
            <article
              key={`${activeTab}-${ord.code}`}
              className={`client-trust-card ${isDelivered ? 'is-delivered' : 'is-paid'}`}
            >
              <div className="client-trust-card-top">
                <span className="tracking-code-pill">{ord.code}</span>
                <span
                  className={`client-trust-status-pill ${
                    isDelivered ? 'is-entregue' : 'is-pago'
                  }`}
                >
                  {isDelivered
                    ? 'Entregue com Garantia'
                    : ord.status === 'pago'
                      ? 'PIX Pago · Em Rota'
                      : 'Pedido Registrado'}
                </span>
              </div>

              <div className="client-trust-card-body">
                <img
                  src={ord.productImage}
                  alt={ord.productName}
                  referrerPolicy="no-referrer"
                />
                <div className="client-trust-card-info">
                  <strong>{ord.productName}</strong>
                  <div className="client-trust-customer">
                    <span>{ord.customerName}</span>
                    <small>
                      <MapPin size={11} /> {ord.cityState}
                    </small>
                  </div>
                  <div className="client-trust-meta-row">
                    <span>{ord.createdAt}</span>
                    <b>{money(ord.totalPixPrice)} no PIX</b>
                  </div>
                </div>
              </div>

              <div className="client-trust-route-box">
                <div className="client-trust-route-labels">
                  <span>
                    <Navigation size={11} /> {ord.currentLocation}
                  </span>
                  <b>{ord.routeProgress}%</b>
                </div>
                <div className="client-trust-progress-track">
                  <div
                    className={`client-trust-progress-fill ${isDelivered ? 'done' : ''}`}
                    style={{ width: `${Math.min(100, Math.max(8, ord.routeProgress))}%` }}
                  />
                </div>
                <div className="client-trust-route-endpoints">
                  <small>Origem: {ord.originCityState}</small>
                  <small>Destino: {ord.cityState}</small>
                </div>
              </div>

              {isDelivered && (
                <div className="client-trust-warranty-note">
                  <ShieldCheck size={13} />
                  <span>{ord.note}</span>
                </div>
              )}

              <div className="client-trust-card-actions">
                {ord.hasAdminTracking && (
                  <button
                    type="button"
                    className="client-trust-track-btn"
                    onClick={() => onOpenTracking(ord.trackingCode)}
                  >
                    <Truck size={14} />
                    <span>Entrar no rastreio ({ord.trackingCode})</span>
                  </button>
                )}
                <button
                  type="button"
                  className="client-trust-detail-btn"
                  style={{ flex: ord.hasAdminTracking ? undefined : 1 }}
                  onClick={() => onOpenOrder(ord.code)}
                >
                  {isDelivered ? 'Ver entrega e garantia' : 'Ver detalhes do pedido'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
