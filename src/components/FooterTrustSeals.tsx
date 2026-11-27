import { Award, Lock, PackageCheck, ShieldCheck, Truck } from 'lucide-react';

interface FooterTrustSealsProps {
  pixDiscountPercent?: number;
  cnpj?: string;
}

export function FooterTrustSeals({ cnpj = '62.250.039/0001-14' }: FooterTrustSealsProps) {
  return (
    <section
      className="mt-8 pt-7 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
      aria-label="Pagamentos, segurança e envio"
    >
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 mb-3">
          Formas de Pagamento
        </h4>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 min-w-0">
            <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
              <path
                d="M12 2.5L16.2 6.7C17 7.5 17 8.8 16.2 9.6L13.4 12.4C12.6 13.2 11.4 13.2 10.6 12.4L7.8 9.6C7 8.8 7 7.5 7.8 6.7L12 2.5Z"
                fill="#0D9488"
              />
              <path
                d="M12 21.5L7.8 17.3C7 16.5 7 15.2 7.8 14.4L10.6 11.6C11.4 10.8 12.6 10.8 13.4 11.6L16.2 14.4C17 15.2 17 16.5 16.2 17.3L12 21.5Z"
                fill="#0D9488"
              />
            </svg>
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold truncate">PIX Oficial</b>
              <small className="text-[10.5px] text-zinc-500 block truncate">À vista na hora</small>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 min-w-0">
            <ShieldCheck size={18} className="text-lime-700 shrink-0" />
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold truncate">Cartão Parcelado</b>
              <small className="text-[10.5px] text-zinc-500 block truncate">Mercado Pago</small>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 mb-3">
          Segurança &amp; Autenticidade
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 min-w-0">
            <Lock size={16} className="text-lime-700 shrink-0" />
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold text-zinc-900 truncate">SSL 256-bit</b>
              <small className="text-[10.5px] text-zinc-500 block truncate">Conexão HTTPS</small>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 min-w-0">
            <PackageCheck size={16} className="text-lime-700 shrink-0" />
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold text-zinc-900 truncate">CNPJ Ativo</b>
              <small className="text-[10.5px] text-zinc-500 block truncate tabular-nums">
                {cnpj}
              </small>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 mb-3">
          Logística &amp; Direito do Cliente
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 min-w-0">
            <Truck size={16} className="text-lime-700 shrink-0" />
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold text-zinc-900 truncate">Envio Rastreado</b>
              <small className="text-[10.5px] text-zinc-500 block truncate">Todo o Brasil</small>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 min-w-0">
            <Award size={16} className="text-lime-700 shrink-0" />
            <div className="leading-tight min-w-0">
              <b className="block text-xs font-bold text-zinc-900 truncate">CDC Art. 49</b>
              <small className="text-[10.5px] text-zinc-500 block truncate">7 dias devolução</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
