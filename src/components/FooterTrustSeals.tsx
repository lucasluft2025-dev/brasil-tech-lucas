interface FooterTrustSealsProps {
  pixDiscountPercent?: number;
}

export function FooterTrustSeals(_props: FooterTrustSealsProps) {
  return (
    <section className="footer-trust-strip" aria-label="Formas de pagamento, segurança e entregas">
      {/* Grupo 1: Pagamento Oficial via PIX */}
      <div className="footer-trust-group">
        <h4>Pagamento Instantâneo</h4>
        <div className="footer-brand-grid">
          <div className="footer-brand-badge is-light" title="Pagamento instantâneo via PIX Oficial">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.5L16.2 6.7C17 7.5 17 8.8 16.2 9.6L13.4 12.4C12.6 13.2 11.4 13.2 10.6 12.4L7.8 9.6C7 8.8 7 7.5 7.8 6.7L12 2.5Z"
                fill="#32BCAD"
              />
              <path
                d="M12 21.5L7.8 17.3C7 16.5 7 15.2 7.8 14.4L10.6 11.6C11.4 10.8 12.6 10.8 13.4 11.6L16.2 14.4C17 15.2 17 16.5 16.2 17.3L12 21.5Z"
                fill="#32BCAD"
              />
              <path
                d="M2.5 12L6.7 7.8C7.5 7 8.8 7 9.6 7.8L12.4 10.6C13.2 11.4 13.2 12.6 12.4 13.4L9.6 16.2C8.8 17 7.5 17 6.7 16.2L2.5 12Z"
                fill="#229B8E"
              />
              <path
                d="M21.5 12L17.3 16.2C16.5 17 15.2 17 14.4 16.2L11.6 13.4C10.8 12.6 10.8 11.4 11.6 10.6L14.4 7.8C15.2 7 16.5 7 17.3 7.8L21.5 12Z"
                fill="#229B8E"
              />
            </svg>
            <span>
              <b>PIX Oficial</b>
              <small>Aprovação na hora • Sem taxas</small>
            </span>
          </div>

          <div className="footer-brand-badge is-light" title="Pagamento protegido pelo Banco Central via PIX">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2L4 5.5V11.2C4 16.4 7.4 21.1 12 22.5C16.6 21.1 20 16.4 20 11.2V5.5L12 2Z"
                fill="#15803D"
              />
              <path
                d="M8.8 12.2L11 14.4L15.4 9.8"
                stroke="#FFFFFF"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span>
              <b>PIX Protegido</b>
              <small>Liberação imediata do pedido</small>
            </span>
          </div>
        </div>
      </div>

      {/* Grupo 2: Selos de Segurança e Reputação */}
      <div className="footer-trust-group">
        <h4>Segurança &amp; Credibilidade</h4>
        <div className="footer-seal-grid">
          <div className="footer-verified-seal">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2L4 5.5V11.2C4 16.4 7.4 21.1 12 22.5C16.6 21.1 20 16.4 20 11.2V5.5L12 2Z"
                fill="#166534"
                stroke="#4ADE80"
                strokeWidth="1.2"
              />
              <path
                d="M8.8 12.2L11 14.4L15.4 9.8"
                stroke="#FAF7F2"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div>
              <b>Google Safe Browsing</b>
              <small>Site verificado e livre de ameaças</small>
            </div>
          </div>

          <div className="footer-verified-seal">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#CFB06F" />
              <path
                d="M8 10V7.5C8 5.3 9.8 3.5 12 3.5C14.2 3.5 16 5.3 16 7.5V10"
                stroke="#CFB06F"
                strokeWidth="2.2"
                fill="none"
              />
              <circle cx="12" cy="15.2" r="1.6" fill="#14161B" />
            </svg>
            <div>
              <b>SSL Blindado 256-bit</b>
              <small>Criptografia HTTPS ponta a ponta</small>
            </div>
          </div>

          <div className="footer-verified-seal">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" fill="#15803D" stroke="#86EFAC" strokeWidth="1.1" />
              <circle cx="9.2" cy="10" r="1.2" fill="#FFFFFF" />
              <circle cx="14.8" cy="10" r="1.2" fill="#FFFFFF" />
              <path
                d="M8.2 13.8C9.2 15.8 14.8 15.8 15.8 13.8"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div>
              <b>ReclameAQUI • Ótimo</b>
              <small>Atendimento verificado RA1000</small>
            </div>
          </div>

          <div className="footer-verified-seal">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" fill="#009EE3" />
              <path
                d="M7.5 12.2C9 10.2 11 10.2 12 11.4C13 10.2 15 10.2 16.5 12.2C15 14.2 13 14.2 12 13C11 14.2 9 14.2 7.5 12.2Z"
                fill="#FFFFFF"
              />
            </svg>
            <div>
              <b>Compra Garantida</b>
              <small>Proteção antifraude e reembolso</small>
            </div>
          </div>
        </div>
      </div>

      {/* Grupo 3: Envios Oficiais & Garantia */}
      <div className="footer-trust-group">
        <h4>Logística &amp; Envio Oficial</h4>
        <div className="footer-seal-grid">
          <div className="footer-verified-seal">
            <svg width="26" height="24" viewBox="0 0 28 24" aria-hidden="true">
              <rect x="1" y="2" width="26" height="20" rx="5" fill="#FFCC00" />
              <path d="M6 12L12 7.5L10.5 12L16.5 12L11 16.5L12.5 12Z" fill="#00416B" />
              <path d="M16 12L22 7.5L20.5 12L23.5 12L18 16.5L19.5 12Z" fill="#0066A4" />
            </svg>
            <div>
              <b>Correios SEDEX &amp; PAC</b>
              <small>Rastreamento oficial em tempo real</small>
            </div>
          </div>

          <div className="footer-verified-seal">
            <svg width="26" height="24" viewBox="0 0 28 24" aria-hidden="true">
              <rect x="1" y="2" width="26" height="20" rx="5" fill="#9E1C28" />
              <path
                d="M6 13H19M15 8.5L20.5 13L15 17.5"
                stroke="#CFB06F"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div>
              <b>Jadlog &amp; Entrega Expressa</b>
              <small>Despacho protegido para todo Brasil</small>
            </div>
          </div>

          <div className="footer-verified-seal">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="10" r="6" fill="none" stroke="#CFB06F" strokeWidth="2" />
              <path d="M9.5 10L11.2 11.8L14.8 8.2" stroke="#CFB06F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M9 15.5L8 21L12 19L16 21L15 15.5" stroke="#CFB06F" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <b>Loja Verificada Ebit</b>
              <small>Garantia de 90 dias a 12 meses</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
