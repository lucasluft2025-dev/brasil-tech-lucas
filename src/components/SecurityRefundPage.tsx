import React from 'react';
import { StoreSettings } from '../services/firestoreStore';

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
    `Olá equipe ${storeSettings.storeName}! Gostaria de tirar uma dúvida sobre garantia e política de reembolso de 7 dias.`
  )}`;

  return (
    <section className="security-page">
      <div className="security-hero">
        <span className="security-hero-tag">🛡️ COMPRA 100% PROTEGIDA • {storeSettings.storeName}</span>
        <h1>Garantia, Segurança & Política de Reembolso</h1>
        <p>
          Na {storeSettings.storeName}, você compra com risco zero. Se o produto não atender às
          suas expectativas, devolvemos <strong>100% do seu dinheiro em até 7 dias corridos</strong>{' '}
          sem letras miúdas.
        </p>
        <div className="security-hero-actions">
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            💬 Falar com Suporte / Solicitar Reembolso
          </a>
          <button type="button" className="btn-outline" onClick={onGoToTracking}>
            🚚 Rastrear Pedido Ao Vivo
          </button>
          <button type="button" className="btn-outline" onClick={onBackToStore}>
            ← Voltar para a Loja
          </button>
        </div>
      </div>

      <div className="security-pillars-grid">
        <article className="security-pillar-card highlight">
          <div className="security-pillar-icon">💸</div>
          <h3>Reembolso Total em 7 Dias</h3>
          <p>
            Não curtiu ou mudou de ideia? Conforme o Art. 49 do Código de Defesa do Consumidor,
            você tem 7 dias corridos após o recebimento para devolver grátis e receber 100% do valor
            pago direto na sua conta PIX.
          </p>
        </article>

        <article className="security-pillar-card">
          <div className="security-pillar-icon">🛠️</div>
          <h3>Garantia Técnica de 90 dias a 12 meses</h3>
          <p>
            Todo console, smartphone ou acessório passa por bancada de testes com laudo de 28 pontos
            antes do despacho, acompanhado de selo de garantia e assistência rápida.
          </p>
        </article>

        <article className="security-pillar-card">
          <div className="security-pillar-icon">🧾</div>
          <h3>Nota Fiscal & Etiqueta Oficial</h3>
          <p>
            Todos os envios saem acompanhados de Nota Fiscal Eletrônica (DANFE) em nome do
            comprador, seguro contra extravio e código de rastreio com localização em tempo real.
          </p>
        </article>

        <article className="security-pillar-card">
          <div className="security-pillar-icon">🏢</div>
          <h3>Empresa Verificada com CNPJ Ativo</h3>
          <p>
            Atuação transparente e endereço físico verificável: <strong>{storeSettings.cnpj}</strong>
            {' — '}
            {storeSettings.address}. Atendimento humano direto no WhatsApp {storeSettings.phone}.
          </p>
        </article>
      </div>

      <div className="security-steps-panel">
        <div className="security-steps-head">
          <h2>Como funciona o Reembolso Garantido em 3 passos</h2>
          <p>Processo simples, sem formulários longos e sem custo de frete reverso.</p>
        </div>
        <div className="security-steps-grid">
          <div className="security-step-item">
            <span className="security-step-num">1</span>
            <h4>Chame no WhatsApp Oficial</h4>
            <p>
              Envie o número do seu pedido ou código de rastreio para {storeSettings.phone} em até 7
              dias corridos após a entrega.
            </p>
          </div>
          <div className="security-step-item">
            <span className="security-step-num">2</span>
            <h4>Receba a Etiqueta Reversa Grátis</h4>
            <p>
              Geramos imediatamente uma autorização de postagem gratuita para você devolver o item na
              agência mais próxima.
            </p>
          </div>
          <div className="security-step-item">
            <span className="security-step-num">3</span>
            <h4>PIX na Conta em até 24h úteis</h4>
            <p>
              Assim que o pacote der entrada na conferência, o reembolso integral é transferido na
              hora via PIX para sua titularidade.
            </p>
          </div>
        </div>
      </div>

      <div className="security-checklist-panel">
        <div>
          <h3>Checklist de Proteção ao Comprador</h3>
          <ul className="security-checklist">
            <li>✓ Ambiente criptografado SSL 256-bit em toda a navegação e checkout</li>
            <li>✓ Conferência em vídeo e lacre numerado antes da embalagem de envio</li>
            <li>✓ Seguro total de carga durante o transporte até a assinatura da entrega</li>
            <li>✓ Troca imediata caso haja qualquer avaria ocorrida no transporte</li>
            <li>✓ Direito de arrependimento com 100% de estorno garantido em 7 dias</li>
          </ul>
        </div>
        <div className="security-company-box">
          <span className="security-company-label">DADOS OFICIAIS DA LOJA</span>
          <h4>{storeSettings.storeName} Eletrônicos & Games</h4>
          <p>
            <strong>CNPJ:</strong> {storeSettings.cnpj}
          </p>
          <p>
            <strong>Endereço:</strong> {storeSettings.address}
          </p>
          <p>
            <strong>WhatsApp Oficial:</strong> {storeSettings.phone}
          </p>
          <p>
            <strong>E-mail de Suporte:</strong> {storeSettings.email}
          </p>
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-block"
          >
            💬 Abrir Atendimento Seguro no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};
