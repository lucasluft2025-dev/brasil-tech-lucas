import React, { useMemo, useState } from 'react';
import { PersistedTracking, StoreSettings } from '../services/firestoreStore';

interface TrackingDocumentsModalProps {
  tracking: PersistedTracking;
  storeSettings: StoreSettings;
  initialTab?: 'nfe' | 'label';
  onClose: () => void;
}

function buildCode128Bars(seed: string, barCount = 68, maxW = 240): Array<{ x: number; w: number }> {
  const bars: Array<{ x: number; w: number }> = [];
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rawUnits: Array<{ w: number; gap: number }> = [];
  let totalUnits = 0;
  for (let i = 0; i < barCount; i += 1) {
    hash ^= (i + 1) * 374761393;
    hash = Math.imul(hash, 668265263);
    const w = ((Math.abs(hash) % 3) + 1) * 1.1;
    const gap = ((Math.abs(hash >> 4) % 3) + 1) * 0.95;
    rawUnits.push({ w, gap });
    totalUnits += w + gap;
  }

  const usableWidth = maxW - 12;
  const scale = usableWidth / Math.max(1, totalUnits);
  let cursor = 6;
  for (const unit of rawUnits) {
    const bw = Math.max(0.9, unit.w * scale);
    bars.push({ x: Number(cursor.toFixed(2)), w: Number(bw.toFixed(2)) });
    cursor += (unit.w + unit.gap) * scale;
  }
  return bars;
}

function buildQrModules(seed: string, size = 21): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const markFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const outer = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[oy + y][ox + x] = outer || inner;
      }
    }
  };
  markFinder(0, 0);
  markFinder(size - 7, 0);
  markFinder(0, size - 7);

  // Timing strips
  for (let i = 8; i < size - 8; i += 1) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder =
        (x < 8 && y < 8) ||
        (x >= size - 8 && y < 8) ||
        (x < 8 && y >= size - 8);
      if (inFinder || x === 6 || y === 6) continue;
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      grid[y][x] = (h & 3) === 0 || (h & 7) === 3;
    }
  }
  return grid;
}

function computeMod11Digit(digits43: string): string {
  let weight = 2;
  let sum = 0;
  for (let i = digits43.length - 1; i >= 0; i -= 1) {
    sum += Number(digits43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const dv = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return String(dv);
}

function buildChaveAcesso(tracking: PersistedTracking, cnpjDigits: string): string {
  const cleanCnpj = cnpjDigits.padStart(14, '0').slice(0, 14);
  const nNF = (tracking.invoiceNumber.replace(/\D/g, '') || '001482').padStart(9, '0').slice(-9);
  const numericSeed = `${tracking.code}${tracking.orderCode}`
    .split('')
    .map((c) => c.charCodeAt(0) % 10)
    .join('');
  const cNF = `${numericSeed}98451234`.slice(0, 8);
  const body43 = `412611${cleanCnpj}55001${nNF}1${cNF}`.slice(0, 43).padEnd(43, '7');
  const full44 = `${body43}${computeMod11Digit(body43)}`;
  return full44.replace(/(.{4})/g, '$1 ').trim();
}

function resolveProductNcm(summary: string): string {
  const lower = summary.toLowerCase();
  if (lower.includes('iphone') || lower.includes('celular') || lower.includes('smartphone')) {
    return '8517.13.00';
  }
  if (lower.includes('pc gamer') || lower.includes('ryzen') || lower.includes('intel')) {
    return '8471.50.10';
  }
  if (lower.includes('controle')) {
    return '9504.50.00';
  }
  return '9504.50.00';
}

function extractCityAndUf(raw: string): { city: string; uf: string } {
  const parts = raw.split(/\s*[-/]\s*/).filter(Boolean);
  if (parts.length >= 2) {
    const maybeUf = parts[parts.length - 1].toUpperCase().slice(0, 2);
    const city = parts.slice(0, -1).join(' - ').trim();
    return { city: city || raw, uf: maybeUf || 'PR' };
  }
  return { city: raw || 'Curitiba', uf: 'PR' };
}

function buildProtocolNumber(tracking: PersistedTracking): string {
  const seedDigits = `${tracking.code}${tracking.invoiceNumber}`
    .split('')
    .map((c) => c.charCodeAt(0) % 10)
    .join('');
  return `14126${(`${seedDigits}0089451203`).slice(0, 10)}`;
}

export const TrackingDocumentsModal: React.FC<TrackingDocumentsModalProps> = ({
  tracking,
  storeSettings,
  initialTab = 'nfe',
  onClose,
}) => {
  const [tab, setTab] = useState<'nfe' | 'label'>(initialTab);

  const cnpjDigits = useMemo(() => storeSettings.cnpj.replace(/\D/g, ''), [storeSettings.cnpj]);
  const chaveAcesso = useMemo(
    () => buildChaveAcesso(tracking, cnpjDigits),
    [tracking, cnpjDigits]
  );
  const protocolNumber = useMemo(() => buildProtocolNumber(tracking), [tracking]);
  const mainBarcode = useMemo(
    () => buildCode128Bars(`${tracking.code}-${tracking.invoiceNumber}`, 72, 240),
    [tracking.code, tracking.invoiceNumber]
  );
  const cepBarcode = useMemo(
    () => buildCode128Bars(tracking.customerCep || tracking.destinationCityState || '80000000', 46, 160),
    [tracking.customerCep, tracking.destinationCityState]
  );
  const qrModules = useMemo(
    () => buildQrModules(`${tracking.code}|${tracking.invoiceNumber}|${tracking.orderCode}`, 21),
    [tracking.code, tracking.invoiceNumber, tracking.orderCode]
  );

  const numericTotal = tracking.orderTotal > 0 ? tracking.orderTotal : 0;
  const formatBrl = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDecimal = (val: number) =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalFormatted = formatBrl(numericTotal);
  const isExpress = (tracking.shippingLabel || '').toLowerCase().includes('express');
  const freightValue = numericTotal > 0 ? (isExpress ? 30 : 15) : 0;
  const productsSubtotal = Math.max(0, numericTotal - freightValue);
  const weightKg = Number(tracking.weightKg || 1.2);
  const netWeightKg = Math.max(0.1, Number((weightKg * 0.88).toFixed(2)));

  const recipientCpf = tracking.customerCpf || tracking.maskedCpf || 'Consumidor Final';
  const recipientPhone = tracking.customerPhone || 'Não informado';
  const recipientCep = tracking.customerCep || '00000-000';
  const recipientAddress =
    tracking.customerAddress || `${tracking.destinationCityState || tracking.cityState}`;
  const originText = tracking.originCityState || 'Curitiba - PR';
  const destText = tracking.destinationCityState || tracking.cityState || 'São Paulo - SP';
  const originParsed = extractCityAndUf(originText);
  const destParsed = extractCityAndUf(destText);
  const cfopCode = originParsed.uf === destParsed.uf ? '5.102' : '6.102';
  const invoicePadded = (tracking.invoiceNumber.replace(/\D/g, '') || '001482').padStart(9, '0');
  const invoiceFormatted = `${invoicePadded.slice(0, 3)}.${invoicePadded.slice(3, 6)}.${invoicePadded.slice(6, 9)}`;
  const issueDateStr = (tracking.createdAtLabel || new Date().toLocaleDateString('pt-BR')).split(',')[0];
  const issueTimeStr =
    (tracking.createdAtLabel || '').split(',')[1]?.trim().slice(0, 5) || '14:30';
  const ncmCode = resolveProductNcm(tracking.productSummary);

  return (
    <div className="modal-backdrop doc-modal-backdrop" onClick={onClose}>
      <div
        className="modal-card doc-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="doc-modal-toolbar no-print">
          <div className="doc-tabs">
            <button
              type="button"
              className={`doc-tab-btn ${tab === 'nfe' ? 'active' : ''}`}
              onClick={() => setTab('nfe')}
            >
              Nota Fiscal Eletrônica (DANFE)
            </button>
            <button
              type="button"
              className={`doc-tab-btn ${tab === 'label' ? 'active' : ''}`}
              onClick={() => setTab('label')}
            >
              Etiqueta Térmica de Envio
            </button>
          </div>
          <div className="doc-toolbar-actions">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => window.print()}
            >
              Imprimir / Salvar PDF
            </button>
            <button type="button" className="btn-outline btn-sm" onClick={onClose}>
              Fechar ✕
            </button>
          </div>
        </div>

        <div className="printable-doc-area">
          {tab === 'nfe' ? (
            <div className="danfe-sheet" aria-label="DANFE - Documento Auxiliar da Nota Fiscal Eletrônica">
              {/* Canhoto de Recebimento */}
              <div className="danfe-canhoto">
                <div className="danfe-canhoto-left">
                  <div className="danfe-canhoto-declaration">
                    RECEBEMOS DE <strong>{storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA</strong> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: {issueDateStr} — VALOR TOTAL: {totalFormatted} — DESTINATÁRIO: {tracking.customerLabel || 'CONSUMIDOR FINAL'}
                  </div>
                  <div className="danfe-canhoto-sign-row">
                    <div className="danfe-box-cell">
                      <span className="danfe-field-lbl">DATA DE RECEBIMENTO</span>
                      <span className="danfe-field-val">&nbsp;</span>
                    </div>
                    <div className="danfe-box-cell flex-2">
                      <span className="danfe-field-lbl">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
                      <span className="danfe-field-val">&nbsp;</span>
                    </div>
                  </div>
                </div>
                <div className="danfe-canhoto-right">
                  <strong>NF-e</strong>
                  <span>Nº {invoiceFormatted}</span>
                  <small>SÉRIE 001</small>
                </div>
              </div>

              <div className="danfe-cut-line" aria-hidden="true" />

              {/* Quadro Principal: Emitente + DANFE + Chave */}
              <div className="danfe-main-header">
                <div className="danfe-emitter-box">
                  <div className="danfe-emitter-brand-row">
                    <div className="danfe-emitter-monogram">BT</div>
                    <div>
                      <div className="danfe-emitter-title">
                        {storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA
                      </div>
                      <div className="danfe-emitter-sub">
                        {storeSettings.address} • CEP 80230-010
                      </div>
                      <div className="danfe-emitter-sub">
                        {originParsed.city} / {originParsed.uf} • Fone: {storeSettings.phone}
                      </div>
                      <div className="danfe-emitter-sub">
                        CNPJ: {storeSettings.cnpj} • IE: 908.451.23-44
                      </div>
                    </div>
                  </div>
                </div>

                <div className="danfe-center-box">
                  <div className="danfe-title-main">DANFE</div>
                  <div className="danfe-title-sub">Documento Auxiliar da Nota Fiscal Eletrônica</div>
                  <div className="danfe-inout-row">
                    <div className="danfe-inout-legend">
                      <span>0 - ENTRADA</span>
                      <span>1 - SAÍDA</span>
                    </div>
                    <div className="danfe-inout-digit">1</div>
                  </div>
                  <div className="danfe-nf-num">Nº {invoiceFormatted}</div>
                  <div className="danfe-nf-serie">SÉRIE 001 • FOLHA 1/1</div>
                </div>

                <div className="danfe-barcode-box">
                  <div className="danfe-fisco-caption">CONTROLE DO FISCO</div>
                  <svg viewBox="0 0 240 42" className="doc-barcode-svg" aria-hidden="true">
                    {mainBarcode.map((b, i) => (
                      <rect key={i} x={b.x} y="2" width={b.w} height="38" fill="#0f172a" />
                    ))}
                  </svg>
                  <div className="danfe-chave-box">
                    <span className="danfe-field-lbl">CHAVE DE ACESSO</span>
                    <div className="danfe-chave-value">{chaveAcesso}</div>
                  </div>
                  <div className="danfe-sefaz-note">
                    Consulta de autenticidade no portal nacional da NF-e{' '}
                    <strong>www.nfe.fazenda.gov.br/portal</strong> ou no site da Sefaz Autorizadora
                  </div>
                </div>
              </div>

              {/* Natureza + Protocolo + IE / CNPJ */}
              <div className="danfe-grid-row cols-2">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">NATUREZA DA OPERAÇÃO</span>
                  <strong className="danfe-field-val">
                    {cfopCode} - Venda de mercadoria adquirida ou recebida de terceiros
                  </strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
                  <strong className="danfe-field-val">
                    {protocolNumber} - {issueDateStr} às {issueTimeStr}
                  </strong>
                </div>
              </div>
              <div className="danfe-grid-row cols-3">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">INSCRIÇÃO ESTADUAL</span>
                  <strong className="danfe-field-val">908.451.23-44</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">INSC. ESTADUAL DO SUBST. TRIBUTÁRIO</span>
                  <strong className="danfe-field-val">—</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">CNPJ</span>
                  <strong className="danfe-field-val">{storeSettings.cnpj}</strong>
                </div>
              </div>

              {/* DESTINATÁRIO / REMETENTE */}
              <div className="danfe-section-title">DESTINATÁRIO / REMETENTE</div>
              <div className="danfe-grid-row cols-dest-1">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">NOME / RAZÃO SOCIAL</span>
                  <strong className="danfe-field-val">
                    {(tracking.customerLabel || 'Consumidor Final').toUpperCase()}
                  </strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">CNPJ / CPF</span>
                  <strong className="danfe-field-val">{recipientCpf}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">DATA DA EMISSÃO</span>
                  <strong className="danfe-field-val">{issueDateStr}</strong>
                </div>
              </div>
              <div className="danfe-grid-row cols-dest-2">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">ENDEREÇO</span>
                  <strong className="danfe-field-val">{recipientAddress}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">CEP</span>
                  <strong className="danfe-field-val">{recipientCep}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">DATA DA SAÍDA / ENTRADA</span>
                  <strong className="danfe-field-val">{issueDateStr}</strong>
                </div>
              </div>
              <div className="danfe-grid-row cols-dest-3">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">MUNICÍPIO</span>
                  <strong className="danfe-field-val">{destParsed.city.toUpperCase()}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">FONE / WHATSAPP</span>
                  <strong className="danfe-field-val">{recipientPhone}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">UF</span>
                  <strong className="danfe-field-val">{destParsed.uf}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">INSCRIÇÃO ESTADUAL</span>
                  <strong className="danfe-field-val">ISENTO</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">HORA DA SAÍDA</span>
                  <strong className="danfe-field-val">{issueTimeStr}</strong>
                </div>
              </div>

              {/* CÁLCULO DO IMPOSTO */}
              <div className="danfe-section-title">CÁLCULO DO IMPOSTO</div>
              <div className="danfe-grid-row cols-tax">
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">BASE DE CÁLC. DO ICMS</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR DO ICMS</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">BASE CÁLC. ICMS ST</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR ICMS SUBST.</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR DO PIS</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">V. TOTAL PRODUTOS</span>
                  <strong className="danfe-field-val">{formatDecimal(productsSubtotal)}</strong>
                </div>
              </div>
              <div className="danfe-grid-row cols-tax">
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR DO FRETE</span>
                  <strong className="danfe-field-val">{formatDecimal(freightValue)}</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR DO SEGURO</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">DESCONTO</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">OUTRAS DESPESAS</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">VALOR TOTAL IPI</span>
                  <strong className="danfe-field-val">0,00</strong>
                </div>
                <div className="danfe-box-cell num danfe-cell-highlight">
                  <span className="danfe-field-lbl">VALOR TOTAL DA NOTA</span>
                  <strong className="danfe-field-val">{totalFormatted}</strong>
                </div>
              </div>

              {/* TRANSPORTADOR / VOLUMES TRANSPORTADOS */}
              <div className="danfe-section-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
              <div className="danfe-grid-row cols-transp-1">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">RAZÃO SOCIAL</span>
                  <strong className="danfe-field-val">
                    {tracking.shippingLabel || 'BRASIL TECH LOGÍSTICA EXPRESS LTDA'}
                  </strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">FRETE POR CONTA</span>
                  <strong className="danfe-field-val">0 - Por conta do Remetente (CIF)</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">CÓDIGO ANTT</span>
                  <strong className="danfe-field-val">RNTRC-498210</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">UF</span>
                  <strong className="danfe-field-val">{originParsed.uf}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">CNPJ / CPF</span>
                  <strong className="danfe-field-val">{storeSettings.cnpj}</strong>
                </div>
              </div>
              <div className="danfe-grid-row cols-vols">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">QUANTIDADE</span>
                  <strong className="danfe-field-val">1</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">ESPÉCIE</span>
                  <strong className="danfe-field-val">CAIXA LACRADA</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">MARCA</span>
                  <strong className="danfe-field-val">{storeSettings.storeName.toUpperCase()}</strong>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">NUMERAÇÃO / RASTREIO</span>
                  <strong className="danfe-field-val">{tracking.code}</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">PESO BRUTO</span>
                  <strong className="danfe-field-val">{weightKg.toFixed(2)} kg</strong>
                </div>
                <div className="danfe-box-cell num">
                  <span className="danfe-field-lbl">PESO LÍQUIDO</span>
                  <strong className="danfe-field-val">{netWeightKg.toFixed(2)} kg</strong>
                </div>
              </div>

              {/* DADOS DOS PRODUTOS / SERVIÇOS */}
              <div className="danfe-section-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
              <table className="danfe-items-table">
                <thead>
                  <tr>
                    <th>CÓD. PROD.</th>
                    <th>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                    <th>NCM/SH</th>
                    <th>CSOSN</th>
                    <th>CFOP</th>
                    <th>UN</th>
                    <th className="num">QTDE</th>
                    <th className="num">V. UNIT.</th>
                    <th className="num">V. TOTAL</th>
                    <th className="num">BC ICMS</th>
                    <th className="num">V. ICMS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono">BT-{tracking.code.slice(-4)}</td>
                    <td>
                      <strong>{tracking.productSummary}</strong>
                    </td>
                    <td className="mono">{ncmCode}</td>
                    <td className="mono">0102</td>
                    <td className="mono">{cfopCode.replace('.', '')}</td>
                    <td>UN</td>
                    <td className="num">1,00</td>
                    <td className="num">{formatDecimal(productsSubtotal)}</td>
                    <td className="num">
                      <strong>{formatDecimal(productsSubtotal)}</strong>
                    </td>
                    <td className="num">0,00</td>
                    <td className="num">0,00</td>
                  </tr>
                </tbody>
              </table>

              {/* DADOS ADICIONAIS */}
              <div className="danfe-section-title">DADOS ADICIONAIS</div>
              <div className="danfe-additional-grid">
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">INFORMAÇÕES COMPLEMENTARES</span>
                  <p className="danfe-additional-text">
                    Pedido: <strong>{tracking.orderCode || tracking.code}</strong> | Código de
                    Rastreio: <strong>{tracking.code}</strong> | Trajeto: {originText} ➔{' '}
                    {destText}. DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL
                    (LC 123/2006). Não gera direito a crédito fiscal de IPI/ICMS. Garantia
                    contratual {storeSettings.storeName} e direito de arrependimento/reembolso em
                    até 7 dias corridos (Art. 49 do CDC).
                  </p>
                </div>
                <div className="danfe-box-cell">
                  <span className="danfe-field-lbl">RESERVADO AO FISCO</span>
                  <p className="danfe-additional-text">
                    NF-e autorizada via SEFAZ-PR. Protocolo {protocolNumber}.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="shipping-label-sheet" aria-label="Etiqueta Oficial de Envio">
              {/* Thermal 100x150 Header */}
              <div className="label-top-band">
                <div className="label-carrier-brand">
                  <div className="label-carrier-badges">
                    <span className="label-carrier-tag">SEDEX / EXPRESSO</span>
                    <span className="label-contract-tag">CONTRATO 9912487201</span>
                  </div>
                  <strong>{storeSettings.storeName.toUpperCase()} LOGÍSTICA</strong>
                  <small>{tracking.shippingLabel || 'Entrega Expressa Rastreada'}</small>
                </div>
                <div className="label-qr-box">
                  <svg viewBox="0 0 21 21" className="label-qr-svg" aria-label="QR Code Rastreio">
                    {qrModules.map((row, y) =>
                      row.map((on, x) =>
                        on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null
                      )
                    )}
                  </svg>
                  <span>PLP • {tracking.code.slice(-6)}</span>
                </div>
              </div>

              <div className="label-meta-strip">
                <div>
                  <span>NF-e:</span> <strong>{invoiceFormatted}</strong>
                </div>
                <div>
                  <span>Pedido:</span> <strong>{tracking.orderCode || tracking.code}</strong>
                </div>
                <div>
                  <span>Peso:</span> <strong>{weightKg.toFixed(2)} kg</strong>
                </div>
                <div>
                  <span>Volume:</span> <strong>1 / 1</strong>
                </div>
              </div>

              <div className="label-barcode-hero">
                <div className="label-tracking-code">{tracking.code}</div>
                <svg viewBox="0 0 240 48" className="label-main-barcode" aria-hidden="true">
                  {mainBarcode.map((b, i) => (
                    <rect key={i} x={b.x} y="2" width={b.w} height="44" fill="#0f172a" />
                  ))}
                </svg>
                <div className="label-route-pill">
                  <span>
                    TRIAGEM {originParsed.uf}-{originParsed.city.slice(0, 3).toUpperCase()}
                  </span>
                  <strong>➔</strong>
                  <span>
                    DESTINO {destParsed.uf}-{destParsed.city.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="label-recipient-card">
                <div className="label-card-header">
                  <span>DESTINATÁRIO</span>
                  <strong>CEP {recipientCep}</strong>
                </div>
                <div className="label-recipient-name">
                  {(tracking.customerLabel || 'Cliente Brasil Tech').toUpperCase()}
                </div>
                <p className="label-recipient-address">{recipientAddress}</p>
                <p className="label-recipient-city">
                  {destParsed.city.toUpperCase()} - {destParsed.uf}
                </p>
                <div className="label-recipient-contacts">
                  <span>
                    <strong>CPF/CNPJ:</strong> {recipientCpf}
                  </span>
                  <span>
                    <strong>Fone:</strong> {recipientPhone}
                  </span>
                </div>
                <div className="label-cep-barcode-wrap">
                  <svg viewBox="0 0 160 24" className="label-cep-barcode" aria-hidden="true">
                    {cepBarcode.map((b, i) => (
                      <rect key={i} x={b.x} y="1" width={b.w} height="22" fill="#0f172a" />
                    ))}
                  </svg>
                  <span>CEP {recipientCep}</span>
                </div>
              </div>

              <div className="label-content-summary">
                <div>
                  <strong>DECLARAÇÃO DE CONTEÚDO:</strong> {tracking.productSummary}
                </div>
                <div>
                  <strong>VALOR SEGURADO:</strong> {totalFormatted} •{' '}
                  <strong>LACRE DE SEGURANÇA CONFERIDO</strong>
                </div>
              </div>

              <div className="label-signature-strip">
                <div>
                  <span>RECEBEDOR:</span>
                  <span className="label-sig-line" />
                </div>
                <div className="label-sig-sub">
                  <span>DOC/RG: ___________________</span>
                  <span>DATA/HORA: ____/____ ____:____</span>
                </div>
              </div>

              <div className="label-sender-card">
                <div className="label-sender-badge">REMETENTE</div>
                <strong>{storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA</strong>{' '}
                • CNPJ: {storeSettings.cnpj}
                <div>
                  {storeSettings.address} • {originText} • SAC: {storeSettings.phone}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
