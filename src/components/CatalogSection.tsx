import { Search, X } from 'lucide-react';
import { CATEGORIES } from '../data/catalog';
import { CategoryId, Product, ProductVariant } from '../types/store';
import { ProductCard } from './ProductCard';

export type SortOption = 'popular' | 'price-asc' | 'price-desc';

interface CatalogSectionProps {
  products: Product[];
  activeCategory: CategoryId;
  searchQuery: string;
  sortBy: SortOption;
  onCategoryChange: (cat: CategoryId) => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: SortOption) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
}

export function CatalogSection({
  products,
  activeCategory,
  searchQuery,
  sortBy,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  onSelectProduct,
  onQuickAdd,
}: CatalogSectionProps) {
  const filtered = products
    .filter((p) => {
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.sold - a.sold;
    });

  return (
    <section
      id="catalogo"
      className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 scroll-mt-20"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E3DFD6]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
            Escolhas dos clientes
          </p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181B22]">
            Os mais desejados
          </h2>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555B66] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar console, iPhone ou acessório..."
              aria-label="Buscar produtos"
              className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-lg border border-[#E3DFD6] bg-white text-sm text-[#181B22] placeholder:text-[#555B66] focus:outline-none focus:border-[#13161C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#555B66] hover:text-[#181B22]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Ordenar produtos"
            className="min-h-[42px] px-3.5 py-2 rounded-lg border border-[#E3DFD6] bg-white text-sm font-medium text-[#181B22] focus:outline-none focus:border-[#13161C]"
          >
            <option value="popular">Mais vendidos</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      {/* Interactive Category Visual Filter Strip */}
      <div className="mt-6 flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Filtrar por categoria"
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-3 min-h-[56px] px-3.5 py-2.5 rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#13161C] ${
                  isActive
                    ? 'bg-[#13161C] border-[#13161C] text-[#F8F6F2]'
                    : 'bg-white border-[#E3DFD6] text-[#181B22] hover:border-[#181B22]'
                }`}
              >
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.label}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-contain shrink-0 rounded-md bg-white p-0.5"
                  />
                )}
                <div className="min-w-0">
                  <span className="block font-display text-sm font-semibold truncate">
                    {cat.label}
                  </span>
                  <span
                    className={`block text-[11px] truncate ${
                      isActive ? 'text-[#D5D1C8]' : 'text-[#555B66]'
                    }`}
                  >
                    {cat.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-[#555B66] tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
        </p>
      </div>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 bg-white border border-[#E3DFD6] rounded-2xl p-10 text-center">
          <p className="font-display text-lg font-semibold text-[#181B22]">
            Nenhum produto encontrado para "{searchQuery}".
          </p>
          <p className="mt-1.5 text-sm text-[#555B66]">
            Tente buscar por PlayStation, Xbox, iPhone ou limpe os filtros ativos.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange('todos');
            }}
            className="mt-5 min-h-[42px] px-5 py-2 rounded-lg bg-[#13161C] text-[#F8F6F2] text-sm font-medium hover:bg-[#232833] transition-colors"
          >
            Ver todos os produtos
          </button>
        </div>
      )}
    </section>
  );
}
