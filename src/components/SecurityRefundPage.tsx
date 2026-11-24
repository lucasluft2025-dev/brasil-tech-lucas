import React from 'react';
import {
  Building2,
  FileCheck2,
  Lock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { StoreSettings } from '../services/firestoreStore';
import { money } from '../data/marketplaceCatalog';

interface SecurityRefundPageProps {
  storeSettings: StoreSettings;
  onBackToStore: () => void;
  onGoToTracking: () => void;
}

export const SecurityRefundPage: React.FC<SecurityRefundPageProps> = ({
  storeSettings,
  onBackToStore,
  onGoToTracking,
}) => {
  const whatsappHelpUrl = `https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
    `Olá equipe ${storeSettings.storeName}! Gostaria de tirar uma dúvida sobre garantia, entrega ou política de trocas e privacidade.`
  )}`;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-10 space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400">
          <ShieldCheck size={16} />
          <span>Central de Confiança e Transparência · {storeSettings.storeName}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Garantia, Troca, Privacidade e Informações de Entrega
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          Consulte nossas regras reais de garantia técnica, direito de arrependimento em 7 dias
          (Art. 49 do CDC), política de privacidade (LGPD), modalidades de envio e dados comerciais.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <MessageCircle size={16} />
            <span>Falar com Atendimento no WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={onGoToTracking}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Truck size={16} />
            <span>Rastrear meu pedido</span>
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            ← Voltar à loja
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <article className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-blue-600 font-bold text-sm">
            <RefreshCw size={18} />
            <h2>Política de Troca e Devolução (7 Dias)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Conforme o Art. 49 do Código de Defesa do Consumidor, compras realizadas à distância têm
            direito de arrependimento em até <strong>7 dias corridos</strong> após o recebimento. O
            aparelho deve retornar com os mesmos acessórios enviados e sem marcas de mau uso ou queda.
            Conferido o retorno, o estorno é feito integralmente pelo mesmo meio utilizado na compra.
          </p>
        </article>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-blue-600 font-bold text-sm">
            <ShieldCheck size={18} />
            <h2>Garantia Real Conforme Cada Produto</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Cada produto exibe sua garantia específica na página do anúncio (variando de 90 dias para
            itens seminovos revisados até 12 meses para novos/lacrados conforme fabricante ou termo
            da loja). A garantia cobre defeitos de funcionamento de hardware não decorrentes de mau
            uso, oxidação por líquidos ou abertura por terceiros não autorizados.
          </p>
        </article>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-blue-600 font-bold text-sm">
            <Truck size={18} />
            <h2>Informações de Entrega e Rastreamento</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Oferecemos <strong>Entrega Expressa</strong> (para regiões atendidas no mesmo dia,{' '}
            {money(storeSettings.expressShippingPrice)}) e <strong>Entrega Padrão</strong> (prazo
            estimado em até 2 dias úteis após confirmação, {money(storeSettings.standardShippingPrice)}
            ). Assim que o envio é postado, nossa equipe disponibiliza o código oficial para
            acompanhamento em tempo real aqui no site.
          </p>
        </article>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-blue-600 font-bold text-sm">
            <Lock size={18} />
            <h2>Política de Privacidade (LGPD)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletamos
            apenas os dados estritamente necessários para faturamento, envio (nome, telefone, CEP e
            endereço) e emissão de Nota Fiscal quando aplicável. Não vendemos nem compartilhamos seus
            dados pessoais com terceiros fora da operação logística e de pagamento. Você pode
            solicitar acesso ou exclusão de seus dados pelo e-mail {storeSettings.email}.
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-950 font-bold text-base">
            <FileCheck2 size={18} className="text-blue-600" />
            <h2>Como acionar suporte, garantia ou devolução</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-blue-600">Passo 1</span>
              <h3 className="text-sm font-bold text-slate-900">Contato Direto</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Envie o número do pedido ou código de rastreio para o WhatsApp {storeSettings.phone}.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-blue-600">Passo 2</span>
              <h3 className="text-sm font-bold text-slate-900">Avaliação Técnica</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Para devoluções dentro de 7 dias ou assistência em garantia, orientamos a postagem
                sem complicação.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-blue-600">Passo 3</span>
              <h3 className="text-sm font-bold text-slate-900">Solução Rápida</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estorno no mesmo meio de pagamento ou reparo/troca conforme cobertura do produto.
              </p>
            </div>
          </div>
        </div>

        <aside className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <Building2 size={15} />
            <span>Dados Comerciais</span>
          </div>
          <h3 className="text-base font-bold text-slate-950">{storeSettings.storeName}</h3>
          <dl className="space-y-1.5 text-xs text-slate-700">
            <div>
              <dt className="text-slate-400">CNPJ</dt>
              <dd className="font-semibold text-slate-900">{storeSettings.cnpj}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Endereço Comercial</dt>
              <dd className="font-semibold text-slate-900">{storeSettings.address}</dd>
            </div>
            <div>
              <dt className="text-slate-400">WhatsApp Oficial</dt>
              <dd className="font-semibold text-slate-900">{storeSettings.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-400">E-mail de Atendimento</dt>
              <dd className="font-semibold text-slate-900">{storeSettings.email}</dd>
            </div>
          </dl>
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <MessageCircle size={15} />
            <span>Atendimento ao Cliente</span>
          </a>
        </aside>
      </div>
    </section>
  );
};
