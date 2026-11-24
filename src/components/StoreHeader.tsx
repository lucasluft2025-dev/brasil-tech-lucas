import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { MarketplaceProduct, money } from '../data/marketplaceCatalog';
import { StoreSettings } from '../services/firestoreStore';
import { VisitorRegion } from '../services/regionLookup';

export type NavDestination =
  | 'home'
  | 'iphones'
  | 'android'
  | 'playstation'
  | 'xbox'
  | 'gamer'
  | 'acessorios'
  | 'ofertas'
  | 'orders'
  | 'security'
  | 'admin';

interface StoreHeaderProps {
  storeSettings: StoreSettings;
  products: MarketplaceProduct[];
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  onSubmitSearch: (term: string) => void;
  onOpenProduct: (id: number) => void;
  onNavigate: (dest: NavDestination) => void;
  activeNav: NavDestination;
  userName: string;
  isAdmin: boolean;
  favoritesCount: number;
  cartCount: number;
  userCep: string;
  visitorRegion: VisitorRegion | null;
  onOpenCepModal: () => void;
  onOpenAccount: () => void;
  onToggleFavoritesOnly: () => void;
  onOpenCart: () => void;
}

const TOP_CATEGORIES: Array<{ label: string; dest: NavDestination }> = [
  { label: 'iPhones', dest: 'iphones' },
  { label: 'Smartphones Android', dest: 'android' },
  { label: 'PlayStation', dest: 'playstation' },
  { label: 'Xbox', dest: 'xbox' },
  { label: 'Videogames', dest: 'gamer' },
  { label: 'Acessórios', dest: 'acessorios' },
  { label: 'Ofertas', dest: 'ofertas' },
];

export function StoreHeader({
  storeSettings,
  products,
  searchInput,
  onSearchInputChange,
  onSubmitSearch,
  onOpenProduct,
  onNavigate,
  activeNav,
  userName,
  isAdmin,
  favoritesCount,
  cartCount,
  userCep,
  visitorRegion,
  onOpenCepModal,
  onOpenAccount,
  onToggleFavoritesOnly,
  onOpenCart,
}: StoreHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => `${p.name} ${p.cat} ${p.brand || ''} ${p.storage || ''}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [products, searchInput]);

  const regionText =
    visitorRegion && (visitorRegion.city || visitorRegion.uf)
      ? [visitorRegion.city, visitorRegion.uf].filter(Boolean).join(' - ')
      : 'Curitiba e Região';
  const whatsappUrl = `https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
    `Olá equipe ${storeSettings.storeName}! Gostaria de atendimento sobre um produto.`
  )}`;

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    onSubmitSearch(searchInput.trim());
  };

  const handleNavClick = (dest: NavDestination) => {
    setMobileMenuOpen(false);
    onNavigate(dest);
  };

  return (
    <>
      <div className="bg-slate-950 text-slate-200 text-[11px] sm:text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 min-h-[34px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck size={14} className="text-blue-400 shrink-0" />
            <span className="truncate">
              Entrega no mesmo dia em <strong className="text-white">{regionText}</strong> · Envio
              seguro para todo o Brasil
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 shrink-0 text-slate-300">
            <button
              type="button"
              onClick={() => handleNavClick('orders')}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Rastrear Pedido
            </button>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <button
              type="button"
              onClick={() => handleNavClick('security')}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Garantia e Reembolso
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="min-h-[68px] py-2.5 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-auto md:mr-0 shrink-0">
              <button
                type="button"
                className="md:hidden w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-center"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
              >
                <img
                  src="/src/assets/ref/logo.png"
                  alt=""
                  className="w-8 h-8 object-contain rounded-md"
                />
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-[Plus_Jakarta_Sans]">
                  Brasil <span className="text-blue-600">Tech</span>
                </span>
              </button>
            </div>

            {/* Smart Search Bar */}
            <div className="relative order-last md:order-none w-full md:flex-1 md:max-w-xl">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center h-11 rounded-lg border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition-all overflow-hidden"
              >
                <input
                  type="search"
                  value={searchInput}
                  onFocus={() => {
                    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
                    setSearchFocused(true);
                  }}
                  onBlur={() => {
                    blurTimeoutRef.current = window.setTimeout(() => setSearchFocused(false), 180);
                  }}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  placeholder="Buscar iPhone 14 Pro, Galaxy S24, PS5, Xbox, controles..."
                  aria-label="Pesquisar produtos"
                  className="flex-1 min-w-0 h-full px-3.5 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 outline-none"
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="h-full px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Search size={15} />
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </form>

              {searchFocused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchFocused(false);
                        onOpenProduct(item.id);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-left border-b border-slate-100 last:border-b-0"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 object-contain rounded bg-slate-50 p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.cat}</div>
                      </div>
                      <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                        {money(item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Utility Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenCepModal}
                className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left transition-colors"
              >
                <MapPin size={16} className="text-blue-600 shrink-0" />
                <span className="leading-tight">
                  <small className="block text-[10px] text-slate-500">Entregar em</small>
                  <b className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    {userCep || visitorRegion?.city || 'Informar CEP'}
                  </b>
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenAccount}
                aria-label="Minha conta"
                className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <UserIcon size={18} />
                <span className="hidden xl:block text-left leading-tight">
                  <small className="block text-[10px] text-slate-500">
                    {userName ? 'Conectado' : 'Minha conta'}
                  </small>
                  <b className="text-xs font-semibold text-slate-900 max-w-[96px] truncate block">
                    {userName || 'Entrar'}
                  </b>
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleFavoritesOnly}
                aria-label="Favoritos"
                className="relative min-h-[44px] min-w-[44px] px-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors"
              >
                <Heart size={18} />
                {favoritesCount > 0 && (
                  <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {favoritesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                aria-label="Carrinho de compras"
                className="relative min-h-[44px] min-w-[44px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingBag size={17} />
                <span className="hidden sm:inline text-xs font-semibold">Carrinho</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex min-h-[44px] px-3.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Desktop Category Menu */}
          <nav
            aria-label="Categorias principais"
            className="hidden md:flex items-center justify-between gap-6 border-t border-slate-100 h-11 text-[13px] font-medium text-slate-600 overflow-x-auto"
          >
            <div className="flex items-center gap-6">
              {TOP_CATEGORIES.map((item) => (
                <button
                  key={item.dest}
                  type="button"
                  onClick={() => handleNavClick(item.dest)}
                  className={`whitespace-nowrap py-2.5 border-b-2 transition-colors ${
                    activeNav === item.dest
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className={`whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeNav === 'orders' ? 'text-blue-600 font-semibold' : 'hover:text-slate-950'
                }`}
              >
                <Package size={14} />
                <span>Meus Pedidos</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className="whitespace-nowrap px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                >
                  Painel Admin
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 max-h-[75dvh] overflow-y-auto shadow-lg">
            <div className="grid grid-cols-2 gap-2">
              {TOP_CATEGORIES.map((item) => (
                <button
                  key={item.dest}
                  type="button"
                  onClick={() => handleNavClick(item.dest)}
                  className={`min-h-[44px] px-3 rounded-lg border text-left text-xs font-semibold transition-colors ${
                    activeNav === item.dest
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-left text-xs font-semibold text-slate-800 flex items-center gap-2"
              >
                <Package size={15} className="text-blue-600" />
                <span>Meus Pedidos e Rastreamento</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('security')}
                className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-left text-xs font-semibold text-slate-800 flex items-center gap-2"
              >
                <ShieldCheck size={15} className="text-blue-600" />
                <span>Garantia, Trocas e Reembolso (7 dias)</span>
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2"
              >
                <MessageCircle size={15} />
                <span>Falar com Consultor no WhatsApp</span>
              </a>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className="min-h-[44px] px-3 rounded-lg bg-slate-900 text-white text-left text-xs font-semibold"
                >
                  Acessar Painel Administrativo
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
