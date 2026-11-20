import { CheckCircle2, Star } from 'lucide-react';
import { CUSTOMER_REVIEWS, RATING_DISTRIBUTION } from '../data/catalog';

export function ReviewsSection() {
  return (
    <section className="border-t border-[#E3DFD6] bg-white py-12 lg:py-16">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
            Avaliações verificadas
          </p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181B22]">
            Confiança de quem já comprou
          </h2>
        </div>

        {/* Summary & Breakdown */}
        <div className="mt-7 rounded-2xl border border-[#E3DFD6] bg-[#F8F6F2] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
            <div className="md:col-span-4 md:border-r md:border-[#E3DFD6] md:pr-8 flex items-center md:block gap-5">
              <div>
                <p className="font-display text-5xl font-bold text-[#181B22] tabular-nums leading-none">
                  4,9
                </p>
                <div className="mt-2 flex items-center gap-1" aria-label="Nota 4,9 de 5 estrelas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      className="fill-[#B5892E] text-[#B5892E]"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
              <p className="md:mt-3 text-sm text-[#555B66] leading-snug">
                Baseado em <strong className="text-[#181B22] tabular-nums">2.418</strong> avaliações
                de compras confirmadas em todo o Brasil.
              </p>
            </div>

            <div className="md:col-span-8 space-y-2">
              {RATING_DISTRIBUTION.map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="w-8 font-medium text-[#555B66] shrink-0">{row.stars} ★</span>
                  <div className="flex-1 h-2 rounded-full bg-[#E3DFD6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#13161C]"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[#555B66] shrink-0">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Quantitative Proof Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#E3DFD6] divide-y sm:divide-y-0 sm:divide-x divide-[#E3DFD6] bg-white">
            <div className="py-4 px-6 text-center">
              <p className="font-display text-2xl font-bold text-[#181B22] tabular-nums">97%</p>
              <p className="mt-0.5 text-xs text-[#555B66]">Clientes que voltariam a comprar</p>
            </div>
            <div className="py-4 px-6 text-center">
              <p className="font-display text-2xl font-bold text-[#181B22] tabular-nums">13.247+</p>
              <p className="mt-0.5 text-xs text-[#555B66]">Pedidos revisados e entregues</p>
            </div>
            <div className="py-4 px-6 text-center">
              <p className="font-display text-2xl font-bold text-[#181B22] tabular-nums">6 meses</p>
              <p className="mt-0.5 text-xs text-[#555B66]">Garantia técnica inclusa</p>
            </div>
          </div>
        </div>

        {/* Review Cards */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {CUSTOMER_REVIEWS.map((review) => (
            <article
              key={review.id}
              className="flex flex-col p-5 rounded-xl border border-[#E3DFD6] bg-[#F8F6F2]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#13161C] text-[#CFB06F] flex items-center justify-center font-display text-sm font-bold shrink-0">
                  {review.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#181B22] flex items-center gap-1.5 truncate">
                    <span>{review.name}</span>
                    <CheckCircle2 size={14} className="text-[#825F19] shrink-0" aria-hidden="true" />
                  </p>
                  <p className="text-xs text-[#555B66] truncate">
                    {review.city} · {review.date}
                  </p>
                </div>
              </div>

              <p className="mt-3.5 text-sm leading-relaxed text-[#181B22] flex-1">
                "{review.text}"
              </p>

              <p className="mt-4 pt-3 border-t border-[#E3DFD6] text-xs font-medium text-[#555B66]">
                Compra: <span className="text-[#181B22]">{review.product}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
