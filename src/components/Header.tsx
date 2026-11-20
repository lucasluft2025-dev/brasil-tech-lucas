import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { ActiveView, CategoryId } from '../types/store';

interface HeaderProps {
  activeView: ActiveView;
  activeCategory: CategoryId;
  totalItems: number;
  onNavigateHome: (category?: CategoryId) => void;
  onNavigateView: (view: ActiveView) => void;
  onOpenCart: () => void;
}

export function Header({
  activeView,
  activeCategory,
  totalItems,
  onNavigateHome,
  onNavigateView,
  onOpenCart,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCategoryClick = (category: CategoryId) => {
    onNavigateHome(category);
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById('catalogo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleViewClick = (view: ActiveView) => {
    onNavigateView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#13161C] text-[#F8F6F2] border-b border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center rounded-lg text-[#F8F6F2] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F]"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateHome('todos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Brasil Tech"
            className="inline-flex items-center shrink-0 rounded-lg overflow-hidden bg-[#0a1a35] border border-white/15 focus-visible:outline-2 focus-visible:outline-[#CFB06F]"
          >
            <img
              src="/src/assets/images/brasil_tech_logo_1794944707057.jpg"
              alt="Brasil Tech"
              referrerPolicy="no-referrer"
              className="h-10 w-[148px] object-cover scale-125"
            />
          </button>
        </div>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#D5D1C8]"
        >
          <button
            type="button"
            onClick={() => handleCategoryClick('todos')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F] ${
              activeView === 'home' && activeCategory === 'todos'
                ? 'border-[#CFB06F] text-[#F8F6F2]'
                : 'border-transparent hover:text-[#F8F6F2] hover:border-white/30'
            }`}
          >
            Ofertas
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('playstation')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F] ${
              activeView === 'home' && (activeCategory === 'playstation' || activeCategory === 'xbox')
                ? 'border-[#CFB06F] text-[#F8F6F2]'
                : 'border-transparent hover:text-[#F8F6F2] hover:border-white/30'
            }`}
          >
            Consoles
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('celular')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F] ${
              activeView === 'home' && activeCategory === 'celular'
                ? 'border-[#CFB06F] text-[#F8F6F2]'
                : 'border-transparent hover:text-[#F8F6F2] hover:border-white/30'
            }`}
          >
            Celulares
          </button>
          <button
            type="button"
            onClick={() => handleViewClick('tracking')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F] ${
              activeView === 'tracking'
                ? 'border-[#CFB06F] text-[#F8F6F2]'
                : 'border-transparent hover:text-[#F8F6F2] hover:border-white/30'
            }`}
          >
            Rastrear Pedido
          </button>
          <button
            type="button"
            onClick={() => handleViewClick('about')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#CFB06F] ${
              activeView === 'about'
                ? 'border-[#CFB06F] text-[#F8F6F2]'
                : 'border-transparent hover:text-[#F8F6F2] hover:border-white/30'
            }`}
          >
            Sobre
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2.5 min-h-[40px] px-4 py-2 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFB06F]"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            <span>Carrinho</span>
            {totalItems > 0 && (
              <span className="tabular-nums font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[#13161C] text-[#F8F6F2]">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1B1F27] px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleCategoryClick('todos')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Ofertas e Catálogo
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('playstation')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Consoles PlayStation
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('xbox')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Consoles Xbox
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('celular')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Celulares iPhone
          </button>
          <button
            type="button"
            onClick={() => handleViewClick('tracking')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Rastrear Pedido
          </button>
          <button
            type="button"
            onClick={() => handleViewClick('about')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F6F2] hover:bg-white/10 transition-colors"
          >
            Sobre a Loja
          </button>
        </div>
      )}
    </header>
  );
}
