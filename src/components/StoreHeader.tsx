import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  Heart,
  Lock,
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
  | 'lancamentos'
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
  { label: 'Início', dest: 'home' },
  { label: 'iPhones', dest: 'iphones' },
  { label: 'Samsung & Android', dest: 'android' },
  { label: 'PlayStation', dest: 'playstation' },
  { label: 'Xbox', dest: 'xbox' },
  { label: 'Videogames', dest: 'gamer' },
  { label: 'Acessórios', dest: 'acessorios' },
  { label: 'Ofertas', dest: 'ofertas' },
  { label: 'Lançamentos', dest: 'lancamentos' },
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) =>
        `${p.name} ${p.cat} ${p.brand || ''} ${p.storage || ''}`.toLowerCase().includes(q)
      )
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
    setMobileSearchOpen(false);
    onSubmitSearch(searchInput.trim());
  };

  const handleNavClick = (dest: NavDestination) => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    onNavigate(dest);
  };

  const handleToggleMobileSearch = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => mobileSearchInputRef.current?.focus(), 40);
      }
      return next;
    });
  };

  return (
    <>
      {/* Faixa superior institucional enxuta (não fixa no scroll) */}
      <div className="bg-zinc-950 text-zinc-300 text-[11px] sm:text-xs border-b border-zinc-800 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 min-h-[34px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={12} className="text-lime-400 shrink-0" />
            <span className="truncate">
              Compra Segura SSL · PIX imediato e envio para{' '}
              <strong className="text-white font-semibold">{regionText}</strong> e todo Brasil
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-zinc-300">
            <span className="text-zinc-400 whitespace-nowrap tabular-nums">
              CNPJ {storeSettings.cnpj}
            </span>
            <span aria-hidden="true" className="text-zinc-700">
              |
            </span>
            <button
              type="button"
              onClick={() => handleNavClick('orders')}
              className="hover:text-lime-400 transition-colors whitespace-nowrap"
            >
              Rastrear Pedido
            </button>
            <span aria-hidden="true" className="text-zinc-700">
              |
            </span>
            <button
              type="button"
              onClick={() => handleNavClick('security')}
              className="hover:text-lime-400 transition-colors whitespace-nowrap"
            >
              Garantia &amp; Devolução 7 dias
            </button>
          </div>
        </div>
      </div>

      {/* Cabeçalho principal compacto e ágil */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-[0_1px_10px_rgba(9,9,11,0.04)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="h-[58px] md:h-[66px] flex items-center justify-between gap-2 sm:gap-4 md:gap-6 min-w-0">
            {/* Marca + Gatilho Menu Mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
              <button
                type="button"
                className="md:hidden w-10 h-10 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-950 flex items-center justify-center shrink-0"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                onClick={() => {
                  setMobileSearchOpen(false);
                  setMobileMenuOpen((v) => !v);
                }}
              >
                {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className="flex items-center gap-2 text-left whitespace-nowrap shrink-0"
              >
                <img
                  src="/src/assets/ref/logo.png"
                  alt=""
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md shrink-0"
                />
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-zinc-950 font-[Plus_Jakarta_Sans] flex items-center gap-1">
                  Brasil{' '}
                  <span className="text-zinc-950 bg-lime-400 px-1.5 py-0.5 rounded-md leading-none">
                    Tech
                  </span>
                </span>
              </button>
            </div>

            {/* Busca Inteligente Desktop */}
            <div className="hidden md:block relative flex-1 max-w-xl min-w-0">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center h-11 rounded-xl border border-zinc-300 bg-zinc-50 focus-within:bg-white focus-within:border-zinc-950 focus-within:ring-2 focus-within:ring-lime-500/25 transition-all overflow-hidden"
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
                  placeholder="Buscar iPhone 15, Samsung Galaxy S24, PS5, Xbox, controles..."
                  aria-label="Pesquisar produtos"
                  className="flex-1 min-w-0 h-full px-3.5 bg-transparent text-sm text-zinc-950 placeholder:text-zinc-500 outline-none"
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="h-full px-4 bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Search size={15} strokeWidth={2.4} />
                  <span>Buscar</span>
                </button>
              </form>

              {searchFocused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchFocused(false);
                        onOpenProduct(item.id);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-lime-50/70 text-left border-b border-zinc-100 last:border-b-0"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 object-contain rounded bg-white border border-zinc-100 p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-950 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">{item.cat}</div>
                      </div>
                      <span className="text-xs font-extrabold text-zinc-950 tabular-nums shrink-0">
                        {money(item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ações do Cliente */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleMobileSearch}
                aria-label="Pesquisar produtos"
                className={`md:hidden w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
                  mobileSearchOpen
                    ? 'border-lime-500 bg-lime-50 text-zinc-950'
                    : 'border-zinc-200 bg-white text-zinc-800'
                }`}
              >
                {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
              </button>

              <button
                type="button"
                onClick={onOpenCepModal}
                className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 text-left transition-colors"
              >
                <MapPin size={16} className="text-lime-700 shrink-0" />
                <span className="leading-tight">
                  <small className="block text-[10px] text-zinc-500">Entregar em</small>
                  <b className="text-xs font-semibold text-zinc-950 whitespace-nowrap">
                    {userCep || visitorRegion?.city || 'Informar CEP'}
                  </b>
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenAccount}
                aria-label="Minha conta"
                className="w-10 h-10 md:w-auto md:min-h-[42px] md:px-2.5 rounded-lg hover:bg-zinc-100 text-zinc-800 flex items-center justify-center gap-2 transition-colors"
              >
                <UserIcon size={18} />
                <span className="hidden xl:block text-left leading-tight">
                  <small className="block text-[10px] text-zinc-500">
                    {userName ? 'Conectado' : 'Minha conta'}
                  </small>
                  <b className="text-xs font-semibold text-zinc-950 max-w-[96px] truncate block">
                    {userName || 'Entrar'}
                  </b>
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleFavoritesOnly}
                aria-label="Favoritos"
                className="hidden sm:flex relative w-10 h-10 md:min-h-[42px] rounded-lg hover:bg-zinc-100 text-zinc-800 items-center justify-center transition-colors"
              >
                <Heart size={18} />
                {favoritesCount > 0 && (
                  <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-lime-400 text-zinc-950 text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                    {favoritesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                aria-label="Carrinho de compras"
                className="relative h-10 md:min-h-[42px] px-2.5 sm:px-3.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <ShoppingBag size={17} />
                <span className="hidden sm:inline text-xs font-semibold">Carrinho</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-lime-400 text-zinc-950 text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex min-h-[42px] px-3.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Painel de Busca Mobile */}
          {mobileSearchOpen && (
            <div className="md:hidden pb-3 pt-1 border-t border-zinc-100 relative">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center h-11 rounded-xl border border-zinc-300 bg-zinc-50 focus-within:bg-white focus-within:border-zinc-950 overflow-hidden"
              >
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  placeholder="Buscar iPhone, Samsung, PS5, Xbox..."
                  aria-label="Pesquisar produtos no celular"
                  className="flex-1 min-w-0 h-full px-3 bg-transparent text-base text-zinc-950 placeholder:text-zinc-500 outline-none"
                />
                <button
                  type="submit"
                  className="h-full px-4 bg-lime-400 text-zinc-950 text-xs font-extrabold shrink-0"
                >
                  Buscar
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMobileSearchOpen(false);
                        onOpenProduct(item.id);
                      }}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-lime-50/70 text-left border-b border-zinc-100 last:border-b-0"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="w-9 h-9 object-contain rounded bg-white border border-zinc-100 p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-950 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">{item.cat}</div>
                      </div>
                      <span className="text-xs font-extrabold text-zinc-950 tabular-nums shrink-0">
                        {money(item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Barra de Categorias Desktop */}
          <nav
            aria-label="Categorias principais"
            className="hidden md:flex items-center justify-between gap-4 border-t border-zinc-100 h-11 text-[13px] font-medium text-zinc-600 overflow-x-auto no-scrollbar"
          >
            <div className="flex items-center gap-4 lg:gap-5">
              {TOP_CATEGORIES.map((item) => {
                const isActive = activeNav === item.dest;
                const isOfertas = item.dest === 'ofertas';
                return (
                  <button
                    key={item.dest}
                    type="button"
                    onClick={() => handleNavClick(item.dest)}
                    className={`whitespace-nowrap shrink-0 py-2.5 border-b-2 transition-colors ${
                      isActive
                        ? 'border-lime-500 text-zinc-950 font-bold'
                        : isOfertas
                          ? 'border-transparent text-lime-800 font-bold hover:text-zinc-950'
                          : 'border-transparent hover:text-zinc-950'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  activeNav === 'orders' ? 'text-lime-800 font-bold' : 'hover:text-zinc-950'
                }`}
              >
                <Package size={14} />
                <span>Meus Pedidos</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('security')}
                className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  activeNav === 'security' ? 'text-lime-800 font-bold' : 'hover:text-zinc-950'
                }`}
              >
                <ShieldCheck size={14} />
                <span>Garantia</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-md bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 transition-colors"
                >
                  Painel Admin
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Drawer Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 bg-white px-3.5 py-4 space-y-3.5 max-h-[75dvh] overflow-y-auto shadow-xl">
            <div className="grid grid-cols-2 gap-2">
              {TOP_CATEGORIES.map((item) => (
                <button
                  key={item.dest}
                  type="button"
                  onClick={() => handleNavClick(item.dest)}
                  className={`min-h-[44px] px-3 rounded-lg border text-left text-xs font-semibold transition-colors ${
                    activeNav === item.dest
                      ? 'bg-lime-400 border-lime-500 text-zinc-950 font-bold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onToggleFavoritesOnly();
                }}
                className="min-h-[44px] px-3 rounded-lg border border-zinc-200 text-left text-xs font-semibold text-zinc-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Heart size={15} className="text-lime-700" />
                  <span>Meus Favoritos</span>
                </span>
                <span className="text-zinc-500 tabular-nums">{favoritesCount}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCepModal();
                }}
                className="min-h-[44px] px-3 rounded-lg border border-zinc-200 text-left text-xs font-semibold text-zinc-800 flex items-center gap-2"
              >
                <MapPin size={15} className="text-lime-700" />
                <span>CEP de Entrega ({userCep || regionText})</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className="min-h-[44px] px-3 rounded-lg border border-zinc-200 text-left text-xs font-semibold text-zinc-800 flex items-center gap-2"
              >
                <Package size={15} className="text-lime-700" />
                <span>Meus Pedidos e Rastreamento</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('security')}
                className="min-h-[44px] px-3 rounded-lg border border-zinc-200 text-left text-xs font-semibold text-zinc-800 flex items-center gap-2"
              >
                <ShieldCheck size={15} className="text-lime-700" />
                <span>Garantia, Trocas e Reembolso (7 dias)</span>
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2"
              >
                <MessageCircle size={15} />
                <span>Atendimento Oficial WhatsApp</span>
              </a>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className="min-h-[44px] px-3 rounded-lg bg-zinc-950 text-lime-400 text-left text-xs font-bold"
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
