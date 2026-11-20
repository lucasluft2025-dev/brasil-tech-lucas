import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { ActiveView, CategoryId } from '../types/store';

interface HeroProps {
  onSelectCategory: (category: CategoryId) => void;
  onNavigateView: (view: ActiveView) => void;
}

export function Hero({ onSelectCategory, onNavigateView }: HeroProps) {
  const scrollToCatalog = (category: CategoryId = 'todos') => {
    onSelectCategory(category);
    setTimeout(() => {
      const el = document.getElementById('catalogo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl bg-[#13161C] text-[#F8F6F2] min-h-[430px] lg:min-h-[480px] flex items-center">
        {/* Background studio image with fallback surface */}
        <div className="absolute inset-0 bg-[#13161C]">
          <img
            src={HERO_IMAGE}
            alt="Console PlayStation, controle sem fio e smartphone em estúdio Brasil Tech"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center lg:object-right opacity-80"
          />
        </div>

        {/* Contrast scrim ensuring > 4.5:1 text legibility */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#13161C] via-[#13161C]/88 to-[#13161C]/20"
          aria-hidden="true"
        />

        {/* Hero Copy */}
        <div className="relative z-10 max-w-2xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-[#CFB06F]">
            Consoles, celulares e acessórios revisados
          </p>

          <h1
            className="mt-3 font-display font-bold text-[#F8F6F2] leading-[1.08] tracking-tight"
            style={{
              fontSize: 'clamp(2.25rem, 4.2vw, 3.6rem)',
              textWrap: 'balance',
            }}
          >
            Tecnologia revisada com garantia real em cada detalhe.
          </h1>

          <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-[#D5D1C8]">
            PlayStation, Xbox e iPhones selecionados em bancada técnica, prontos para uso com 6 meses de garantia e entrega rastreada para todo o Brasil.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={() => scrollToCatalog('todos')}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFB06F]"
            >
              <span>Ver ofertas</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('tracking')}
              className="inline-flex items-center justify-center min-h-[46px] px-6 py-3 rounded-lg border border-white/25 bg-white/5 hover:bg-white/10 text-[#F8F6F2] text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFB06F]"
            >
              Rastrear pedido
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/12 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-[#D5D1C8]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#CFB06F] shrink-0" aria-hidden="true" />
              <span>6 meses de garantia inclusa</span>
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-white/30">
              ·
            </span>
            <span className="inline-flex items-center gap-2">
              <Truck size={16} className="text-[#CFB06F] shrink-0" aria-hidden="true" />
              <span>Entrega no dia ou em 2 dias</span>
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-white/30">
              ·
            </span>
            <span>Pagamento rápido no Pix com envio segurado</span>
          </div>
        </div>
      </div>
    </section>
  );
}
