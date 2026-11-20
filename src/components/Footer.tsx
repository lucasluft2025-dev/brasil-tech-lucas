import { CheckCircle2, Headphones, Lock, Mail, RotateCcw, Truck } from 'lucide-react';
import { useState } from 'react';
import { STORE_INFO } from '../data/catalog';
import { ActiveView, CategoryId } from '../types/store';

interface FooterProps {
  onNavigateHome: (category?: CategoryId) => void;
  onNavigateView: (view: ActiveView) => void;
}

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: 'Compra Segura',
    desc: 'Dados protegidos e pagamento validado',
  },
  {
    icon: Truck,
    title: 'Entrega Expressa',
    desc: 'Receba no dia (R$ 30) ou em 2 dias (R$ 15)',
  },
  {
    icon: Headphones,
    title: 'Atendimento Real',
    desc: 'Suporte técnico humano via WhatsApp',
  },
  {
    icon: RotateCcw,
    title: '6 Meses de Garantia',
    desc: 'Revisão em 18 pontos e troca garantida',
  },
];

export function Footer({ onNavigateHome, onNavigateView }: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribedEmails, setSubscribedEmails] = useState<string[]>([]);
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!isValidEmail) {
      setNewsletterFeedback({
        type: 'error',
        message: 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    if (subscribedEmails.includes(trimmed)) {
      setNewsletterFeedback({
        type: 'error',
        message: 'Este e-mail já está inscrito para receber ofertas.',
      });
      return;
    }

    setSubscribedEmails((prev) => [...prev, trimmed]);
    setNewsletterEmail('');
    setNewsletterFeedback({
      type: 'success',
      message: 'Inscrição confirmada! Você receberá novidades e ofertas da Brasil Tech.',
    });
  };

  const goToCategory = (category: CategoryId) => {
    onNavigateHome(category);
    setTimeout(() => {
      const el = document.getElementById('catalogo');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const goToView = (view: ActiveView) => {
    onNavigateView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#13161C] text-[#F8F6F2] border-t border-white/10">
      {/* 4 Store Trust Pillars */}
      <div className="border-b border-white/10 bg-[#1B1F27]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_PILLARS.map((item) => (
              <div key={item.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#CFB06F]/12 border border-[#CFB06F]/25 flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-[#CFB06F]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-[#F8F6F2]">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#D5D1C8]/80 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="inline-flex items-center rounded-lg overflow-hidden bg-[#0a1a35] border border-white/15">
              <img
                src="/src/assets/images/brasil_tech_logo_1794944707057.jpg"
                alt="Brasil Tech"
                referrerPolicy="no-referrer"
                className="h-11 w-[164px] object-cover scale-125"
              />
            </div>
            <p className="mt-3 text-sm text-[#D5D1C8]/80 leading-relaxed">
              Consoles PlayStation e Xbox, celulares iPhone e acessórios selecionados em bancada técnica própria.
            </p>
            <p className="mt-4 text-xs text-[#D5D1C8]/70">CNPJ {STORE_INFO.cnpj}</p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-[#F8F6F2]">Categorias</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#D5D1C8]/80">
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('playstation')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Consoles PlayStation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('xbox')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Consoles Xbox
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('celular')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Celulares iPhone
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('acessorios')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Controles e Acessórios
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-[#F8F6F2]">Ajuda e Rastreio</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#D5D1C8]/80">
              <li>
                <button
                  type="button"
                  onClick={() => goToView('tracking')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Rastrear meu pedido
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToView('faq')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Perguntas frequentes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToView('policies')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Garantia, trocas e privacidade
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToView('about')}
                  className="hover:text-[#CFB06F] transition-colors"
                >
                  Sobre a Brasil Tech
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-[#F8F6F2]">Loja e Atendimento</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#D5D1C8]/80">
              <li>{STORE_INFO.address}</li>
              <li>WhatsApp: {STORE_INFO.whatsappDisplay}</li>
              <li>{STORE_INFO.email}</li>
              <li>{STORE_INFO.hours}</li>
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-md">
            <h4 className="font-display text-base font-semibold text-[#F8F6F2]">
              Receba ofertas de consoles e celulares
            </h4>
            <p className="mt-1 text-sm text-[#D5D1C8]/80">
              Cadastre seu e-mail para receber reposições de estoque e descontos exclusivos no Pix.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[420px]">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5" noValidate>
              <div className="relative flex-1">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D5D1C8]/60 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterFeedback) setNewsletterFeedback(null);
                  }}
                  placeholder="seuemail@exemplo.com.br"
                  aria-label="E-mail para newsletter"
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-[#1B1F27] border border-white/15 text-sm text-[#F8F6F2] placeholder:text-[#D5D1C8]/55 focus:outline-none focus:border-[#CFB06F]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#CFB06F] hover:bg-[#DFC387] text-[#13161C] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFB06F]"
              >
                Inscrever-se
              </button>
            </form>

            {newsletterFeedback && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-2.5 text-xs flex items-center gap-1.5 ${
                  newsletterFeedback.type === 'success' ? 'text-[#CFB06F]' : 'text-[#FCA5A5]'
                }`}
              >
                {newsletterFeedback.type === 'success' && (
                  <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
                )}
                <span>{newsletterFeedback.message}</span>
              </p>
            )}

            {subscribedEmails.length > 0 && (
              <p className="mt-2 text-xs text-[#D5D1C8]/65 tabular-nums">
                {subscribedEmails.length}{' '}
                {subscribedEmails.length === 1 ? 'e-mail inscrito' : 'e-mails inscritos'} nesta sessão:{' '}
                <span className="text-[#D5D1C8]">{subscribedEmails[subscribedEmails.length - 1]}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D5D1C8]/65">
          <p>© {new Date().getFullYear()} Brasil Tech. Todos os direitos reservados.</p>
          <p>Pagamentos via Pix, Cartão em até 12x e Boleto · Envio segurado para todo o Brasil</p>
        </div>
      </div>
    </footer>
  );
}
