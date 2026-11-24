import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Package,
  Search,
  Share2,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { MarketplaceOrder, MarketplaceProduct, money } from '../data/marketplaceCatalog';
import {
  ShowcaseOrder,
  ShowcaseOrderStatus,
  ShowcaseOverride,
  buildShowcaseOrders,
  loadShowcaseOverrides,
  saveShowcaseOverride,
} from '../data/orderShowcase';

interface PublicOrdersShowcaseProps {
  products: MarketplaceProduct[];
  liveOrders: MarketplaceOrder[];
  initialOrderCode?: string | null;
  isAdmin?: boolean;
  onBack: () => void;
  onOpenProduct: (productId: number) => void;
  onGoTracking: () => void;
  onTrackCode?: (trackingCode: string) => void;
  onNotify: (msg: string) => void;
}

const ORDER_STEPS = [
  'Pedido feito',
  'PIX aprovado',
  'Em separação e testes',
  'Em transporte',
  'Entregue',
];

const STATUS_META: Record<
  ShowcaseOrderStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  feito: {
    label: 'Pedido Feito',
    badgeClass: 'is-feito',
    desc: 'Pedido registrado aguardando confirmação do pagamento via PIX.',
  },
  pago: {
    label: 'Pedido Pago',
    badgeClass: 'is-pago',
    desc: 'Pagamento PIX aprovado! Produto em separação ou em transporte.',
  },
  entregue: {
    label: 'Pedido Entregue',
    badgeClass: 'is-entregue',
    desc: 'Pedido entregue ao cliente com garantia e rastreamento concluído.',
  },
};

export function PublicOrdersShowcase({
  products,
  liveOrders,
  initialOrderCode,
  isAdmin = false,
  onBack,
  onOpenProduct,
  onGoTracking,
  onTrackCode,
  onNotify,
}: PublicOrdersShowcaseProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | ShowcaseOrderStatus>('all');
  const [catFilter, setCatFilter] = useState<'all' | 'Celular' | 'Videogames'>('all');
  const [query, setQuery] = useState('');
  const [overrides, setOverrides] = useState<Record<string, ShowcaseOverride>>(() =>
    loadShowcaseOverrides()
  );
  const [selectedCode, setSelectedCode] = useState<string | null>(initialOrderCode || null);
  const [editPriceDraft, setEditPriceDraft] = useState('');
  const [editStatusDraft, setEditStatusDraft] = useState<ShowcaseOrderStatus>('pago');
  const [visibleCount, setVisibleCount] = useState(24);

  const allOrders = useMemo(
    () => buildShowcaseOrders(products, liveOrders, overrides),
    [products, liveOrders, overrides]
  );

  useEffect(() => {
    setVisibleCount(24);
  }, [statusFilter, catFilter, query]);

  useEffect(() => {
    if (initialOrderCode) {
      setSelectedCode(initialOrderCode);
    }
  }, [initialOrderCode]);

  const selectedOrder: ShowcaseOrder | null = useMemo(() => {
    if (!selectedCode) return null;
    return allOrders.find((o) => o.code.toUpperCase() === selectedCode.toUpperCase()) || null;
  }, [allOrders, selectedCode]);

  useEffect(() => {
    if (selectedOrder) {
      setEditPriceDraft(String(selectedOrder.unitPixPrice));
      setEditStatusDraft(selectedOrder.status);
    }
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOrders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (catFilter === 'Celular' && ord.category !== 'Celular') return false;
      if (
        catFilter === 'Videogames' &&
        !['PlayStation', 'Xbox', 'Nintendo', 'PC Gamer', 'Acessórios'].includes(ord.category)
      ) {
        return false;
      }
      if (!q) return true;
      return `${ord.code} ${ord.productName} ${ord.customerName} ${ord.cityState} ${ord.trackingCode}`
        .toLowerCase()
        .includes(q);
    });
  }, [allOrders, statusFilter, catFilter, query]);

  const counts = useMemo(() => {
    return {
      all: allOrders.length,
      feito: allOrders.filter((o) => o.status === 'feito').length,
      pago: allOrders.filter((o) => o.status === 'pago').length,
      entregue: allOrders.filter((o) => o.status === 'entregue').length,
    };
  }, [allOrders]);

  const shareListUrl = `${window.location.origin}${window.location.pathname}#/entregas`;

  const copyShareUrl = (orderCode?: string) => {
    const url = orderCode
      ? `${window.location.origin}${window.location.pathname}#/entregas/${encodeURIComponent(orderCode)}`
      : shareListUrl;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          onNotify(
            orderCode
              ? `Link do pedido ${orderCode} copiado para enviar ao cliente!`
              : 'Link dos pedidos copiado! Agora é só colar e enviar no WhatsApp.'
          );
        })
        .catch(() => onNotify(`Link pronto: ${url}`));
    } else {
      onNotify(`Link pronto: ${url}`);
    }
  };

  if (selectedOrder) {
    const meta = STATUS_META[selectedOrder.status];
    return (
      <section className="checkout-wrap">
        <div className="pdp-top">
          <button
            type="button"
            className="pdp-back"
            onClick={() => {
              setSelectedCode(null);
              if (window.location.hash.startsWith('#/entregas/')) {
                window.location.hash = '#/entregas';
              }
            }}
          >
            ← Voltar para todos os pedidos
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pdp-back"
              onClick={() => copyShareUrl(selectedOrder.code)}
            >
              <Share2 size={14} /> Copiar link deste pedido
            </button>
            <div className="checkout-ssl-pill">🛡️ Comprovante Verificado Brasil Tech</div>
          </div>
        </div>

        <div className="checkout-card showcase-detail-card">
          <div className="showcase-detail-head">
            <div>
              <div className="showcase-detail-badges">
                <span className="tracking-code-pill">{selectedOrder.code}</span>
                <span className={`showcase-status-pill ${meta.badgeClass}`}>{meta.label}</span>
                <span className="showcase-pix-pill">⚡ {selectedOrder.paymentLabel}</span>
              </div>
              <h1 className="checkout-heading" style={{ margin: '10px 0 4px' }}>
                {selectedOrder.productName}
              </h1>
              <p className="showcase-detail-meta">
                Cliente: <b>{selectedOrder.customerName}</b> • Destino:{' '}
                <b>{selectedOrder.cityState}</b> • Registrado em <b>{selectedOrder.createdAt}</b>
              </p>
            </div>
            <div className="showcase-detail-price-box">
              <small>Valor no PIX</small>
              <strong>{money(selectedOrder.totalPixPrice)}</strong>
              <span>
                {selectedOrder.qty > 1
                  ? `${selectedOrder.qty}x ${money(selectedOrder.unitPixPrice)}`
                  : 'Pagamento à vista via PIX'}
              </span>
            </div>
          </div>

          <div className="showcase-detail-product-row">
            <img
              src={selectedOrder.productImage}
              alt={selectedOrder.productName}
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <div className="showcase-detail-product-info">
              <span className="pdp-cat-tag">{selectedOrder.category}</span>
              <b>{selectedOrder.productName}</b>
              <small>
                {selectedOrder.condition} • {selectedOrder.warranty} • Quantidade:{' '}
                {selectedOrder.qty} un.
              </small>
              <div className="showcase-detail-note">{selectedOrder.note}</div>
            </div>
            <div className="showcase-detail-actions">
              {selectedOrder.hasAdminTracking ? (
                <button
                  type="button"
                  className="client-trust-track-btn"
                  onClick={() =>
                    onTrackCode ? onTrackCode(selectedOrder.trackingCode) : onGoTracking()
                  }
                >
                  <Truck size={15} />
                  <span>Entrar no rastreio ao vivo ({selectedOrder.trackingCode})</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="client-trust-detail-btn"
                  onClick={onGoTracking}
                >
                  <Truck size={15} />
                  <span>Consultar meu código de rastreio</span>
                </button>
              )}
              <button
                type="button"
                className="primary"
                onClick={() => onOpenProduct(selectedOrder.productId)}
              >
                Ver produto na loja →
              </button>
            </div>
          </div>

          <div className="order-meta-grid" style={{ marginTop: 18 }}>
            <div className="pdp-spec">
              <small>Situação atual</small>
              <b>{meta.label}</b>
            </div>
            <div className="pdp-spec">
              <small>Forma de pagamento</small>
              <b>PIX Instantâneo</b>
            </div>
            <div className="pdp-spec">
              <small>Envio</small>
              <b>{selectedOrder.shippingLabel}</b>
            </div>
            <div className="pdp-spec">
              <small>Código de rastreio</small>
              <b>{selectedOrder.trackingCode}</b>
            </div>
          </div>

          <div className="order-timeline" style={{ marginTop: 18 }}>
            {ORDER_STEPS.map((step, idx) => (
              <div
                key={step}
                className={`timeline-step ${idx <= selectedOrder.statusStep ? 'done' : ''}`}
              >
                <span className="dot">{idx <= selectedOrder.statusStep ? '✓' : idx + 1}</span>
                <small>{step}</small>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="showcase-admin-editor">
              <b>Ajustar exibição deste pedido (Modo Administrador)</b>
              <div className="showcase-admin-editor-row">
                <label>
                  <span>Status do pedido</span>
                  <select
                    value={editStatusDraft}
                    onChange={(e) => setEditStatusDraft(e.target.value as ShowcaseOrderStatus)}
                  >
                    <option value="feito">Pedido Feito</option>
                    <option value="pago">Pedido Pago</option>
                    <option value="entregue">Pedido Entregue</option>
                  </select>
                </label>
                <label>
                  <span>Valor unitário PIX (R$)</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={editPriceDraft}
                    onChange={(e) => setEditPriceDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    const parsed = Number(editPriceDraft);
                    const nextOverrides = saveShowcaseOverride(selectedOrder.code, {
                      status: editStatusDraft,
                      unitPixPrice: parsed > 0 ? parsed : selectedOrder.unitPixPrice,
                    });
                    setOverrides(nextOverrides);
                    onNotify(`Pedido ${selectedOrder.code} atualizado!`);
                  }}
                >
                  Salvar alteração
                </button>
              </div>
            </div>
          )}
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="pdp-back" onClick={onGoTracking}>
            🔎 Rastrear meu código
          </button>
          <button type="button" className="checkout-share-btn" onClick={() => copyShareUrl()}>
            <Copy size={14} /> Copiar link para enviar aos clientes
          </button>
        </div>
      </div>

      <div className="showcase-hero-card">
        <div>
          <span className="tracking-kicker">TRANSPARÊNCIA BRASIL TECH • PAGAMENTO VIA PIX</span>
          <h1 className="checkout-heading" style={{ margin: '6px 0 6px', color: '#FAF7F2' }}>
            Pedidos Pagos, Rastreios e Aparelhos Entregues
          </h1>
          <p className="showcase-hero-sub">
            Acompanhe pedidos reais em andamento e entregas concluídas de iPhones, consoles
            PlayStation, Xbox, Nintendo e PC Gamer em todo o Brasil. Clique em qualquer pedido para
            entrar e ver os detalhes completos.
          </p>
        </div>
        <div className="showcase-kpis">
          <div>
            <b>{counts.feito}</b>
            <span>Pedidos Feitos</span>
          </div>
          <div>
            <b>{counts.pago}</b>
            <span>Pagos (PIX)</span>
          </div>
          <div>
            <b>{counts.entregue}</b>
            <span>Entregues</span>
          </div>
        </div>
      </div>

      <div className="checkout-card" style={{ marginBottom: 16 }}>
        <div className="showcase-controls">
          <div className="showcase-filter-pills" role="tablist" aria-label="Filtrar por status">
            <button
              type="button"
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              Todos ({counts.all})
            </button>
            <button
              type="button"
              className={statusFilter === 'feito' ? 'active' : ''}
              onClick={() => setStatusFilter('feito')}
            >
              <Clock size={13} /> Pedido Feito ({counts.feito})
            </button>
            <button
              type="button"
              className={statusFilter === 'pago' ? 'active' : ''}
              onClick={() => setStatusFilter('pago')}
            >
              <ShieldCheck size={13} /> Pedido Pago ({counts.pago})
            </button>
            <button
              type="button"
              className={statusFilter === 'entregue' ? 'active' : ''}
              onClick={() => setStatusFilter('entregue')}
            >
              <CheckCircle2 size={13} /> Aparelhos Entregues ({counts.entregue})
            </button>
          </div>

          <div className="showcase-secondary-filters">
            <div className="showcase-cat-pills">
              <button
                type="button"
                className={catFilter === 'all' ? 'active' : ''}
                onClick={() => setCatFilter('all')}
              >
                Tudo
              </button>
              <button
                type="button"
                className={catFilter === 'Celular' ? 'active' : ''}
                onClick={() => setCatFilter('Celular')}
              >
                iPhones
              </button>
              <button
                type="button"
                className={catFilter === 'Videogames' ? 'active' : ''}
                onClick={() => setCatFilter('Videogames')}
              >
                Videogames &amp; PC
              </button>
            </div>
            <div className="showcase-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar produto, código ou cidade..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="checkout-card" style={{ textAlign: 'center', padding: 34 }}>
          <h3>Nenhum pedido encontrado neste filtro</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Limpe a busca ou troque o filtro de status para ver todos os pedidos.
          </p>
        </div>
      ) : (
        <>
          <div className="showcase-grid">
            {filteredOrders.slice(0, visibleCount).map((ord) => {
              const meta = STATUS_META[ord.status];
              return (
                <article
                  key={ord.code}
                  className="showcase-order-card"
                  onClick={() => {
                    setSelectedCode(ord.code);
                    window.location.hash = `#/entregas/${encodeURIComponent(ord.code)}`;
                    window.scrollTo(0, 0);
                  }}
                >
                  <div className="showcase-order-top">
                    <span className="tracking-code-pill">{ord.code}</span>
                    <span className={`showcase-status-pill ${meta.badgeClass}`}>{meta.label}</span>
                  </div>

                  <div className="showcase-order-body">
                    <img
                      src={ord.productImage}
                      alt={ord.productName}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className="showcase-order-info">
                      <b>{ord.productName}</b>
                      <small>
                        {ord.customerName} • {ord.cityState}
                      </small>
                      <small>
                        {ord.createdAt} • {ord.qty} un.
                      </small>
                    </div>
                  </div>

                  <div className="showcase-order-bottom">
                    <div className="showcase-order-price">
                      <small>PIX</small>
                      <strong>{money(ord.totalPixPrice)}</strong>
                    </div>
                    <div className="showcase-order-cta">
                      {ord.hasAdminTracking && (
                        <button
                          type="button"
                          className="showcase-card-track-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTrackCode) {
                              onTrackCode(ord.trackingCode);
                            } else {
                              onGoTracking();
                            }
                          }}
                        >
                          <Truck size={12} /> Rastrear
                        </button>
                      )}
                      <span>
                        {ord.status === 'entregue' ? (
                          <Package size={13} />
                        ) : ord.status === 'pago' ? (
                          <Truck size={13} />
                        ) : (
                          <Clock size={13} />
                        )}
                        Ver pedido <Eye size={13} />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredOrders.length > visibleCount && (
            <div className="showcase-pagination-bar">
              <span>
                Exibindo {Math.min(visibleCount, filteredOrders.length)} de {filteredOrders.length}{' '}
                pedidos verificados
              </span>
              <button
                type="button"
                className="primary"
                onClick={() => setVisibleCount((prev) => prev + 24)}
              >
                Carregar mais pedidos (+24)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
