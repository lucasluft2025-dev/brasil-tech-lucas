import { ArrowLeft, CheckCircle2, Clock, Package, Search } from 'lucide-react';
import { useState } from 'react';
import { formatBRL } from '../data/catalog';
import { Order } from '../types/store';

interface TrackingViewProps {
  orders: Order[];
  initialQuery?: string;
  onBack: () => void;
}

export function TrackingView({ orders, initialQuery = '', onBack }: TrackingViewProps) {
  const [query, setQuery] = useState(initialQuery || orders[0]?.trackingCode || '');
  const [searchedCode, setSearchedCode] = useState(
    initialQuery || orders[0]?.trackingCode || ''
  );

  const normalized = searchedCode.trim().toUpperCase();
  const matchedOrder = orders.find(
    (o) =>
      o.trackingCode.toUpperCase() === normalized || o.orderNumber.toUpperCase() === normalized
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedCode(query);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[40px] text-sm font-medium text-[#555B66] hover:text-[#181B22] transition-colors"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Voltar ao catálogo</span>
      </button>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
          Acompanhamento em tempo real
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181B22]">
          Rastrear pedido
        </h1>
        <p className="mt-2 text-sm text-[#555B66]">
          Digite o código de rastreio (ex.: <span className="font-mono">BR849201745TECH</span>) ou
          o número do pedido (<span className="font-mono">BT-8492</span>).
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555B66] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Informe o código de rastreio ou pedido..."
            aria-label="Código de rastreio ou pedido"
            className="w-full min-h-[46px] pl-10 pr-4 rounded-lg border border-[#E3DFD6] bg-white font-mono text-sm text-[#181B22] focus:outline-none focus:border-[#13161C]"
          />
        </div>
        <button
          type="submit"
          className="min-h-[46px] px-6 py-2.5 rounded-lg bg-[#13161C] hover:bg-[#232833] text-[#F8F6F2] text-sm font-semibold whitespace-nowrap transition-colors"
        >
          Consultar rastreio
        </button>
      </form>

      {/* Recent Orders Quick Switcher */}
      {orders.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#555B66]">
          <span>Pedidos recentes:</span>
          {orders.slice(0, 4).map((o) => (
            <button
              key={o.trackingCode}
              type="button"
              onClick={() => {
                setQuery(o.trackingCode);
                setSearchedCode(o.trackingCode);
              }}
              className="font-mono px-2.5 py-1 rounded-md border border-[#E3DFD6] bg-white hover:border-[#13161C] text-[#181B22] transition-colors"
            >
              {o.trackingCode}
            </button>
          ))}
        </div>
      )}

      {/* Tracking Result */}
      {matchedOrder ? (
        <div className="mt-8 bg-white border border-[#E3DFD6] rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-8 bg-[#13161C] text-[#F8F6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-[#CFB06F]">
                {matchedOrder.orderNumber} · {matchedOrder.trackingCode}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">{matchedOrder.statusLabel}</h2>
              <p className="mt-1 text-xs text-[#D5D1C8]">{matchedOrder.estimatedDelivery}</p>
            </div>
            <div className="text-left sm:text-right text-xs text-[#D5D1C8]">
              <p>Destino</p>
              <p className="text-sm font-semibold text-[#F8F6F2]">
                {matchedOrder.customer.city}, {matchedOrder.customer.state}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-display text-base font-semibold text-[#181B22]">
                Histórico de movimentação
              </h3>
              <ol className="mt-4 space-y-5">
                {matchedOrder.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          step.completed
                            ? 'bg-[#13161C] text-[#CFB06F]'
                            : 'bg-[#EFECE6] text-[#555B66]'
                        }`}
                      >
                        {step.completed ? <CheckCircle2 size={15} /> : <Clock size={14} />}
                      </div>
                      {index < matchedOrder.steps.length - 1 && (
                        <div className="w-px flex-1 bg-[#E3DFD6] my-1.5" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <p className="font-display text-sm font-semibold text-[#181B22]">
                          {step.title}
                        </p>
                        <span className="font-mono text-xs text-[#555B66]">{step.timestamp}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#555B66]">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-5 border-t border-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2.5 text-[#555B66]">
                <Package size={16} className="text-[#825F19] shrink-0" aria-hidden="true" />
                <span>
                  {matchedOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </span>
              </div>
              <span className="font-display font-bold text-[#181B22] tabular-nums">
                Total: {formatBRL(matchedOrder.total)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-white border border-[#E3DFD6] rounded-2xl p-8 text-center">
          <p className="font-display text-lg font-semibold text-[#181B22]">
            Nenhum pedido encontrado para "{searchedCode}".
          </p>
          <p className="mt-1.5 text-sm text-[#555B66]">
            Confira o código digitado ou clique em um dos códigos de exemplo acima.
          </p>
        </div>
      )}
    </section>
  );
}
