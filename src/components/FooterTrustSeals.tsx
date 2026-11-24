import { Lock, PackageCheck, ShieldCheck, Truck } from 'lucide-react';

interface FooterTrustSealsProps {
  pixDiscountPercent?: number;
  cnpj?: string;
}

export function FooterTrustSeals({ cnpj = '62.250.039/0001-14' }: FooterTrustSealsProps) {
  return (
    <section
      className="mt-8 pt-7 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6"
      aria-label="Pagamentos, segurança e envio"
    >
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
          Formas de Pagamento
        </h4>
        <div className="flex flex-wrap gap-2.5">
          <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.5L16.2 6.7C17 7.5 17 8.8 16.2 9.6L13.4 12.4C12.6 13.2 11.4 13.2 10.6 12.4L7.8 9.6C7 8.8 7 7.5 7.8 6.7L12 2.5Z"
                fill="#0D9488"
              />
              <path
                d="M12 21.5L7.8 17.3C7 16.5 7 15.2 7.8 14.4L10.6 11.6C11.4 10.8 12.6 10.8 13.4 11.6L16.2 14.4C17 15.2 17 16.5 16.2 17.3L12 21.5Z"
                fill="#0D9488"
              />
            </svg>
            <div className="leading-tight">
              <b className="block text-xs font-bold">PIX Oficial</b>
              <small className="text-[11px] text-slate-500">À vista com confirmação rápida</small>
            </div>
          </div>

          <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
            <ShieldCheck size={18} className="text-blue-600 shrink-0" />
            <div className="leading-tight">
              <b className="block text-xs font-bold">Cartão de Crédito</b>
              <small className="text-[11px] text-slate-500">Parcelamento conforme anúncio</small>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
          Segurança &amp; Transparência
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <Lock size={16} className="text-blue-600 shrink-0" />
            <div className="leading-tight">
              <b className="block text-xs font-bold text-slate-900">Navegação SSL 256-bit</b>
              <small className="text-[11px] text-slate-500">Criptografia HTTPS</small>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <PackageCheck size={16} className="text-blue-600 shrink-0" />
            <div className="leading-tight">
              <b className="block text-xs font-bold text-slate-900">CNPJ Regular</b>
              <small className="text-[11px] text-slate-500">{cnpj}</small>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
          Envio &amp; Garantia
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <Truck size={16} className="text-blue-600 shrink-0" />
            <div className="leading-tight">
              <b className="block text-xs font-bold text-slate-900">Correios &amp; Expressa</b>
              <small className="text-[11px] text-slate-500">Rastreio código oficial</small>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            <div className="leading-tight">
              <b className="block text-xs font-bold text-slate-900">CDC Art. 49</b>
              <small className="text-[11px] text-slate-500">Troca ou devolução em 7 dias</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
