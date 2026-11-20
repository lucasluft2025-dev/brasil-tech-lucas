import { MessageCircle } from 'lucide-react';
import { STORE_INFO } from '../data/catalog';

const SUPPORT_MESSAGE = encodeURIComponent(
  'Olá! Gostaria de atendimento sobre um produto da Brasil Tech.'
);

export function WhatsAppFab() {
  const href = `${STORE_INFO.whatsappLink}?text=${SUPPORT_MESSAGE}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Atendimento via WhatsApp ${STORE_INFO.whatsappDisplay}`}
      title={`WhatsApp ${STORE_INFO.whatsappDisplay}`}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 min-h-[48px] px-4 py-3 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold shadow-lg transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13161C]"
    >
      <MessageCircle size={20} className="shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline whitespace-nowrap">Atendimento WhatsApp</span>
    </a>
  );
}
