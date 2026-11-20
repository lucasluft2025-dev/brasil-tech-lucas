import { ArrowLeft, ChevronDown, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { FAQ_ITEMS, STORE_INFO } from '../data/catalog';

interface InfoViewProps {
  mode: 'about' | 'faq' | 'policies';
  onBack: () => void;
}

export function InfoView({ mode, onBack }: InfoViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string>(FAQ_ITEMS[0].id);

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

      {mode === 'about' && (
        <div className="mt-6 space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
              Sobre a loja
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#181B22]">
              Brasil Tech: curadoria técnica e garantia real
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#555B66]">
              Nascemos com o propósito de tornar consoles clássicos, atuais e iPhones seminovos
              acessíveis com a mesma confiabilidade de um produto novo de fábrica. Cada aparelho é
              revisado em bancada própria em Curitiba e recebe laudo técnico antes da venda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-white border border-[#E3DFD6]">
              <Wrench size={20} className="text-[#825F19]" aria-hidden="true" />
              <h2 className="mt-3 font-display text-base font-semibold text-[#181B22]">
                Revisão em 18 pontos
              </h2>
              <p className="mt-1.5 text-sm text-[#555B66] leading-relaxed">
                Troca de pasta térmica, higienização interna, calibração de leitores, testes de
                bateria e portas HDMI/USB.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E3DFD6]">
              <ShieldCheck size={20} className="text-[#825F19]" aria-hidden="true" />
              <h2 className="mt-3 font-display text-base font-semibold text-[#181B22]">
                6 meses de garantia
              </h2>
              <p className="mt-1.5 text-sm text-[#555B66] leading-relaxed">
                Cobertura completa de hardware com selo de garantia e envio reverso sem custo
                adicional para o cliente.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E3DFD6]">
              <MapPin size={20} className="text-[#825F19]" aria-hidden="true" />
              <h2 className="mt-3 font-display text-base font-semibold text-[#181B22]">
                Loja física e envio nacional
              </h2>
              <p className="mt-1.5 text-sm text-[#555B66] leading-relaxed">
                {STORE_INFO.address}. Despacho diário segurado para todo o território nacional.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#13161C] text-[#F8F6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Fale direto com nossa equipe técnica</h2>
              <p className="mt-1 text-sm text-[#D5D1C8]">
                Atendimento de {STORE_INFO.hours} · {STORE_INFO.email}
              </p>
            </div>
            <a
              href={STORE_INFO.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-semibold whitespace-nowrap transition-colors"
            >
              <Phone size={15} aria-hidden="true" />
              <span>WhatsApp {STORE_INFO.whatsappDisplay}</span>
            </a>
          </div>
        </div>
      )}

      {mode === 'faq' && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
            Dúvidas frequentes
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#181B22]">
            Perguntas frequentes
          </h1>

          <div className="mt-6 space-y-3">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#E3DFD6] rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-display text-base font-semibold text-[#181B22] hover:bg-[#F8F6F2]/60 transition-colors"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#555B66] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm leading-relaxed text-[#555B66] border-t border-[#EFECE6] pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'policies' && (
        <div className="mt-6 space-y-6 bg-white border border-[#E3DFD6] rounded-2xl p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#825F19]">
              Transparência ao consumidor
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#181B22]">
              Garantia, trocas e privacidade
            </h1>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-[#555B66]">
            <div>
              <h2 className="font-display text-base font-semibold text-[#181B22]">
                Garantia técnica de 6 meses
              </h2>
              <p className="mt-1">
                Todos os consoles, celulares e controles comercializados pela Brasil Tech têm
                garantia de 180 dias para defeitos funcionais. Caso ocorra qualquer falha dentro do
                prazo, geramos etiqueta de postagem gratuita e realizamos o reparo ou troca por
                unidade equivalente.
              </p>
            </div>

            <div>
              <h2 className="font-display text-base font-semibold text-[#181B22]">
                Direito de arrependimento (7 dias)
              </h2>
              <p className="mt-1">
                Conforme o art. 49 do Código de Defesa do Consumidor, você pode solicitar a
                devolução em até 7 dias corridos após o recebimento com reembolso integral na mesma
                forma de pagamento.
              </p>
            </div>

            <div>
              <h2 className="font-display text-base font-semibold text-[#181B22]">
                Privacidade e proteção de dados (LGPD)
              </h2>
              <p className="mt-1">
                Os dados informados no pedido (nome, CPF, endereço e contato) são utilizados
                exclusivamente para emissão fiscal, despacho logístico e suporte de garantia,
                nunca sendo compartilhados com terceiros não envolvidos na entrega.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
