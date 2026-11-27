import { jsPDF } from 'jspdf';
import type { PersistedTracking, StoreSettings } from '../services/firestoreStore';

export function buildCode128Bars(
  seed: string,
  barCount = 68,
  maxW = 240
): Array<{ x: number; w: number }> {
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

export function buildQrModules(seed: string, size = 21): boolean[][] {
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
        (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
      if (inFinder || x === 6 || y === 6) continue;
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      grid[y][x] = (h & 3) === 0 || (h & 7) === 3;
    }
  }
  return grid;
}

export function computeMod11Digit(digits43: string): string {
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

export function buildChaveAcesso(tracking: PersistedTracking, cnpjDigits: string): string {
  const cleanCnpj = cnpjDigits.replace(/\D/g, '').padStart(14, '0').slice(0, 14);
  const nNF = ((tracking.invoiceNumber || '').replace(/\D/g, '') || '001482')
    .padStart(9, '0')
    .slice(-9);
  const numericSeed = `${tracking.code}${tracking.orderCode || ''}`
    .split('')
    .map((c) => c.charCodeAt(0) % 10)
    .join('');
  const cNF = `${numericSeed}98451234`.slice(0, 8);
  const body43 = `412611${cleanCnpj}55001${nNF}1${cNF}`.slice(0, 43).padEnd(43, '7');
  const full44 = `${body43}${computeMod11Digit(body43)}`;
  return full44.replace(/(.{4})/g, '$1 ').trim();
}

export function resolveProductNcm(summary: string): string {
  const lower = (summary || '').toLowerCase();
  if (lower.includes('iphone') || lower.includes('celular') || lower.includes('smartphone')) {
    return '8517.13.00';
  }
  if (lower.includes('pc gamer') || lower.includes('ryzen') || lower.includes('intel')) {
    return '8471.50.10';
  }
  return '9504.50.00';
}

export function extractCityAndUf(raw: string): { city: string; uf: string } {
  const clean = (raw || '').trim();
  const parts = clean.split(/\s*[-/]\s*/).filter(Boolean);
  if (parts.length >= 2) {
    const maybeUf = parts[parts.length - 1].toUpperCase().slice(0, 2);
    const city = parts.slice(0, -1).join(' - ').trim();
    return { city: city || clean, uf: maybeUf || 'PR' };
  }
  return { city: clean || 'Curitiba', uf: 'PR' };
}

export function buildProtocolNumber(tracking: PersistedTracking): string {
  const seedDigits = `${tracking.code}${tracking.invoiceNumber || ''}`
    .split('')
    .map((c) => c.charCodeAt(0) % 10)
    .join('');
  return `14126${`${seedDigits}0089451203`.slice(0, 10)}`;
}

export function computeTrackingDocumentMeta(
  tracking: PersistedTracking,
  storeSettings: StoreSettings
) {
  const cnpjDigits = (storeSettings.cnpj || '62.250.039/0001-14').replace(/\D/g, '');
  const chaveAcesso = buildChaveAcesso(tracking, cnpjDigits);
  const protocolNumber = buildProtocolNumber(tracking);
  const numericTotal = Number(tracking.orderTotal) > 0 ? Number(tracking.orderTotal) : 0;
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
  const originText = tracking.originCityState || 'Curitiba - PR';
  const destText = tracking.destinationCityState || tracking.cityState || 'São Paulo - SP';
  const recipientAddress = tracking.customerAddress || destText;
  const originParsed = extractCityAndUf(originText);
  const destParsed = extractCityAndUf(destText);
  const cfopCode = originParsed.uf === destParsed.uf ? '5.102' : '6.102';
  const invoiceRawDigits = (tracking.invoiceNumber || '').replace(/\D/g, '') || '001482';
  const invoicePadded = invoiceRawDigits.padStart(9, '0').slice(-9);
  const invoiceFormatted = `${invoicePadded.slice(0, 3)}.${invoicePadded.slice(3, 6)}.${invoicePadded.slice(6, 9)}`;
  const issueDateStr = (tracking.createdAtLabel || new Date().toLocaleDateString('pt-BR')).split(',')[0];
  const issueTimeStr =
    (tracking.createdAtLabel || '').split(',')[1]?.trim().slice(0, 5) || '14:30';
  const ncmCode = resolveProductNcm(tracking.productSummary || '');

  return {
    chaveAcesso,
    protocolNumber,
    numericTotal,
    totalFormatted,
    freightValue,
    productsSubtotal,
    weightKg,
    netWeightKg,
    recipientCpf,
    recipientPhone,
    recipientCep,
    recipientAddress,
    originText,
    destText,
    originParsed,
    destParsed,
    cfopCode,
    invoiceFormatted,
    issueDateStr,
    issueTimeStr,
    ncmCode,
    formatBrl,
    formatDecimal,
  };
}

function pdfTextSafe(text: string): string {
  // Replace non-WinAnsi characters like ➔ with ASCII-friendly -> for built-in Helvetica font metrics
  return (text || '')
    .replace(/➔|→/g, '->')
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function drawLabeledBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  opts?: { align?: 'left' | 'right'; fill?: [number, number, number]; fontSize?: number }
) {
  if (opts?.fill) {
    doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfTextSafe(label.toUpperCase()), x + 1.5, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(opts?.fontSize ?? 7.5);
  doc.setTextColor(15, 23, 42);
  const safeVal = pdfTextSafe(value || '-');
  if (opts?.align === 'right') {
    doc.text(safeVal, x + w - 1.5, y + 6.8, { align: 'right', maxWidth: w - 3 });
  } else {
    const lines = doc.splitTextToSize(safeVal, Math.max(8, w - 3));
    doc.text(lines.slice(0, 2), x + 1.5, y + 6.8);
  }
}

export function createDanfePdfDocument(
  tracking: PersistedTracking,
  storeSettings: StoreSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const meta = computeTrackingDocumentMeta(tracking, storeSettings);
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = 10;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);

  // 1. Canhoto de recebimento
  const canhotoH = 18;
  const canhotoRightW = 36;
  const canhotoLeftW = contentW - canhotoRightW;
  doc.rect(margin, y, canhotoLeftW, canhotoH);
  doc.rect(margin + canhotoLeftW, y, canhotoRightW, canhotoH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  const canhotoMsg = pdfTextSafe(
    `RECEBEMOS DE ${storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA OS PRODUTOS CONSTANTES DA NF-E ABAIXO. EMISSÃO: ${meta.issueDateStr} - VALOR TOTAL: ${meta.totalFormatted} - DESTINATÁRIO: ${(tracking.customerLabel || 'CONSUMIDOR FINAL').toUpperCase()}`
  );
  doc.text(doc.splitTextToSize(canhotoMsg, canhotoLeftW - 4).slice(0, 2), margin + 2, y + 3.5);
  doc.line(margin, y + 9, margin + canhotoLeftW, y + 9);
  doc.line(margin + 44, y + 9, margin + 44, y + canhotoH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATA DE RECEBIMENTO', margin + 2, y + 12.2);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', margin + 46, y + 12.2);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text('NF-e', margin + canhotoLeftW + canhotoRightW / 2, y + 6, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(`N. ${meta.invoiceFormatted}`, margin + canhotoLeftW + canhotoRightW / 2, y + 10.5, {
    align: 'center',
  });
  doc.setFontSize(6.5);
  doc.text('SÉRIE 001', margin + canhotoLeftW + canhotoRightW / 2, y + 14.5, {
    align: 'center',
  });

  y += canhotoH + 2.5;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);
  y += 3;

  // 2. Quadro principal DANFE
  const headerH = 36;
  const col1W = 72;
  const col2W = 34;
  const col3W = contentW - col1W - col2W;

  doc.rect(margin, y, col1W, headerH);
  doc.rect(margin + col1W, y, col2W, headerH);
  doc.rect(margin + col1W + col2W, y, col3W, headerH);

  // Monogram BT
  doc.setFillColor(15, 23, 42);
  doc.rect(margin + 3, y + 3.2, 11, 11, 'F');
  doc.setTextColor(163, 230, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BT', margin + 8.5, y + 10.4, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.8);
  const emitterLines = doc.splitTextToSize(
    pdfTextSafe(`${storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA`),
    col1W - 18
  );
  doc.text(emitterLines.slice(0, 2), margin + 16, y + 6.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  doc.text(pdfTextSafe(`${storeSettings.address} - CEP 80230-010`).slice(0, 48), margin + 3, y + 17.8);
  doc.text(
    pdfTextSafe(`${meta.originParsed.city} / ${meta.originParsed.uf} - Fone: ${storeSettings.phone}`).slice(0, 48),
    margin + 3,
    y + 21.5
  );
  doc.text(pdfTextSafe(`CNPJ: ${storeSettings.cnpj} - IE: 908.451.23-44`).slice(0, 48), margin + 3, y + 25.2);

  // Auth pill inside emitter box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.rect(margin + 3, y + 28, col1W - 6, 5.2, 'FD');
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.3);
  doc.text('NF-e AUTORIZADA - AMBIENTE PRODUÇÃO SEFAZ', margin + col1W / 2, y + 31.5, {
    align: 'center',
  });
  doc.setDrawColor(15, 23, 42);

  // Center box DANFE
  const cMid = margin + col1W + col2W / 2;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DANFE', cMid, y + 6.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Documento Auxiliar da', cMid, y + 9.5, { align: 'center' });
  doc.text('Nota Fiscal Eletrônica', cMid, y + 12, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('0 - ENTRADA', margin + col1W + 3, y + 17.2);
  doc.text('1 - SAÍDA', margin + col1W + 3, y + 20);
  doc.rect(margin + col1W + col2W - 10, y + 14.8, 6.5, 6.5);
  doc.setFontSize(9);
  doc.text('1', margin + col1W + col2W - 6.75, y + 19.4, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`N. ${meta.invoiceFormatted}`, cMid, y + 27, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('SÉRIE 001 - FOLHA 1/1', cMid, y + 31.5, { align: 'center' });

  // Barcode + Chave de Acesso
  const bX = margin + col1W + col2W + 2;
  const bW = col3W - 4;
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CONTROLE DO FISCO', bX, y + 3.5);
  const bars = buildCode128Bars(`${tracking.code}-${tracking.invoiceNumber}`, 64, bW);
  doc.setFillColor(15, 23, 42);
  for (const bar of bars) {
    doc.rect(bX + bar.x, y + 5, bar.w, 10.8, 'F');
  }
  doc.line(margin + col1W + col2W, y + 17.8, pageW - margin, y + 17.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.text('CHAVE DE ACESSO', bX, y + 20.6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(meta.chaveAcesso, bW).slice(0, 2), bX, y + 23.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Consulta de autenticidade em www.nfe.fazenda.gov.br/portal ou Sefaz Autorizadora',
    bX,
    y + 32.2,
    { maxWidth: bW }
  );

  y += headerH;

  // Natureza & Protocolo
  drawLabeledBox(
    doc,
    margin,
    y,
    contentW * 0.56,
    9,
    'NATUREZA DA OPERAÇÃO',
    `${meta.cfopCode} - Venda de mercadoria adquirida ou recebida de terceiros`
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.56,
    y,
    contentW * 0.44,
    9,
    'PROTOCOLO DE AUTORIZAÇÃO DE USO',
    `${meta.protocolNumber} - ${meta.issueDateStr} às ${meta.issueTimeStr}`
  );
  y += 9;

  // IE / CNPJ
  const colThird = contentW / 3;
  drawLabeledBox(doc, margin, y, colThird, 8.5, 'INSCRIÇÃO ESTADUAL', '908.451.23-44');
  drawLabeledBox(
    doc,
    margin + colThird,
    y,
    colThird,
    8.5,
    'INSC. ESTADUAL DO SUBST. TRIBUTÁRIO',
    '-'
  );
  drawLabeledBox(doc, margin + colThird * 2, y, colThird, 8.5, 'CNPJ', storeSettings.cnpj);
  y += 10;

  // Section Helper
  const drawSectionBar = (title: string) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentW, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin + 2, y + 3.6);
    y += 5;
  };

  // DESTINATÁRIO / REMETENTE
  drawSectionBar('DESTINATÁRIO / REMETENTE');
  drawLabeledBox(
    doc,
    margin,
    y,
    contentW * 0.55,
    9,
    'NOME / RAZÃO SOCIAL',
    (tracking.customerLabel || 'Consumidor Final').toUpperCase()
  );
  drawLabeledBox(doc, margin + contentW * 0.55, y, contentW * 0.27, 9, 'CNPJ / CPF', meta.recipientCpf);
  drawLabeledBox(
    doc,
    margin + contentW * 0.82,
    y,
    contentW * 0.18,
    9,
    'DATA DA EMISSÃO',
    meta.issueDateStr
  );
  y += 9;

  drawLabeledBox(doc, margin, y, contentW * 0.58, 9, 'ENDEREÇO', meta.recipientAddress);
  drawLabeledBox(doc, margin + contentW * 0.58, y, contentW * 0.2, 9, 'CEP', meta.recipientCep);
  drawLabeledBox(
    doc,
    margin + contentW * 0.78,
    y,
    contentW * 0.22,
    9,
    'DATA DA SAÍDA / ENTRADA',
    meta.issueDateStr
  );
  y += 9;

  drawLabeledBox(
    doc,
    margin,
    y,
    contentW * 0.34,
    9,
    'MUNICÍPIO',
    meta.destParsed.city.toUpperCase()
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.34,
    y,
    contentW * 0.24,
    9,
    'FONE / WHATSAPP',
    meta.recipientPhone
  );
  drawLabeledBox(doc, margin + contentW * 0.58, y, contentW * 0.08, 9, 'UF', meta.destParsed.uf);
  drawLabeledBox(doc, margin + contentW * 0.66, y, contentW * 0.18, 9, 'INSCRIÇÃO ESTADUAL', 'ISENTO');
  drawLabeledBox(
    doc,
    margin + contentW * 0.84,
    y,
    contentW * 0.16,
    9,
    'HORA DA SAÍDA',
    meta.issueTimeStr
  );
  y += 10.5;

  // FATURA / DADOS DO PAGAMENTO
  drawSectionBar('FATURA / DADOS DO PAGAMENTO');
  drawLabeledBox(
    doc,
    margin,
    y,
    contentW * 0.24,
    8.5,
    'N. FATURA / PEDIDO',
    tracking.orderCode || tracking.code
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.24,
    y,
    contentW * 0.36,
    8.5,
    'FORMA DE PAGAMENTO',
    'PIX / APROVAÇÃO CONFIRMADA'
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.6,
    y,
    contentW * 0.2,
    8.5,
    'VALOR ORIGINAL',
    meta.totalFormatted,
    { align: 'right' }
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.8,
    y,
    contentW * 0.2,
    8.5,
    'VALOR LÍQUIDO QUITADO',
    meta.totalFormatted,
    { align: 'right', fill: [241, 245, 249] }
  );
  y += 10;

  // CÁLCULO DO IMPOSTO
  drawSectionBar('CÁLCULO DO IMPOSTO');
  const taxW = contentW / 6;
  drawLabeledBox(doc, margin, y, taxW, 8.8, 'BASE CÁLC. ICMS', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW, y, taxW, 8.8, 'VALOR DO ICMS', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 2, y, taxW, 8.8, 'BASE ICMS ST', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 3, y, taxW, 8.8, 'VALOR ICMS ST', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 4, y, taxW, 8.8, 'VALOR DO PIS', '0,00', { align: 'right' });
  drawLabeledBox(
    doc,
    margin + taxW * 5,
    y,
    taxW,
    8.8,
    'V. TOTAL PRODUTOS',
    meta.formatDecimal(meta.productsSubtotal),
    { align: 'right' }
  );
  y += 8.8;

  drawLabeledBox(
    doc,
    margin,
    y,
    taxW,
    8.8,
    'VALOR DO FRETE',
    meta.formatDecimal(meta.freightValue),
    { align: 'right' }
  );
  drawLabeledBox(doc, margin + taxW, y, taxW, 8.8, 'VALOR DO SEGURO', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 2, y, taxW, 8.8, 'DESCONTO', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 3, y, taxW, 8.8, 'OUTRAS DESPESAS', '0,00', { align: 'right' });
  drawLabeledBox(doc, margin + taxW * 4, y, taxW, 8.8, 'VALOR TOTAL IPI', '0,00', { align: 'right' });
  drawLabeledBox(
    doc,
    margin + taxW * 5,
    y,
    taxW,
    8.8,
    'VALOR TOTAL DA NOTA',
    meta.totalFormatted,
    { align: 'right', fill: [241, 245, 249] }
  );
  y += 10.3;

  // TRANSPORTADOR
  drawSectionBar('TRANSPORTADOR / VOLUMES TRANSPORTADOS');
  drawLabeledBox(
    doc,
    margin,
    y,
    contentW * 0.36,
    8.8,
    'RAZÃO SOCIAL',
    tracking.shippingLabel || 'BRASIL TECH LOGÍSTICA EXPRESS LTDA'
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.36,
    y,
    contentW * 0.24,
    8.8,
    'FRETE POR CONTA',
    '0 - Remetente (CIF)'
  );
  drawLabeledBox(doc, margin + contentW * 0.6, y, contentW * 0.14, 8.8, 'CÓDIGO ANTT', 'RNTRC-498210');
  drawLabeledBox(doc, margin + contentW * 0.74, y, contentW * 0.06, 8.8, 'UF', meta.originParsed.uf);
  drawLabeledBox(
    doc,
    margin + contentW * 0.8,
    y,
    contentW * 0.2,
    8.8,
    'CNPJ / CPF',
    storeSettings.cnpj
  );
  y += 8.8;

  drawLabeledBox(doc, margin, y, contentW * 0.11, 8.8, 'QUANTIDADE', '1');
  drawLabeledBox(doc, margin + contentW * 0.11, y, contentW * 0.19, 8.8, 'ESPÉCIE', 'CAIXA LACRADA');
  drawLabeledBox(
    doc,
    margin + contentW * 0.3,
    y,
    contentW * 0.18,
    8.8,
    'MARCA',
    storeSettings.storeName.toUpperCase()
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.48,
    y,
    contentW * 0.24,
    8.8,
    'NUMERAÇÃO / RASTREIO',
    tracking.code
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.72,
    y,
    contentW * 0.14,
    8.8,
    'PESO BRUTO',
    `${meta.weightKg.toFixed(2)} kg`,
    { align: 'right' }
  );
  drawLabeledBox(
    doc,
    margin + contentW * 0.86,
    y,
    contentW * 0.14,
    8.8,
    'PESO LÍQUIDO',
    `${meta.netWeightKg.toFixed(2)} kg`,
    { align: 'right' }
  );
  y += 10.3;

  // PRODUTOS / SERVIÇOS
  drawSectionBar('DADOS DOS PRODUTOS / SERVIÇOS');
  const cols = [
    { label: 'CÓD.', w: 18, align: 'left' as const },
    { label: 'DESCRIÇÃO DO PRODUTO / SERVIÇO', w: 72, align: 'left' as const },
    { label: 'NCM/SH', w: 19, align: 'left' as const },
    { label: 'CSOSN', w: 12, align: 'left' as const },
    { label: 'CFOP', w: 11, align: 'left' as const },
    { label: 'UN', w: 8, align: 'left' as const },
    { label: 'QTDE', w: 12, align: 'right' as const },
    { label: 'V. UNIT.', w: 19, align: 'right' as const },
    { label: 'V. TOTAL', w: 19, align: 'right' as const },
  ];

  // Header row
  let cx = margin;
  doc.setFillColor(241, 245, 249);
  for (const c of cols) {
    doc.rect(cx, y, c.w, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    if (c.align === 'right') {
      doc.text(c.label, cx + c.w - 1.2, y + 4, { align: 'right' });
    } else {
      doc.text(c.label, cx + 1.2, y + 4);
    }
    cx += c.w;
  }
  y += 6;

  // Item row
  const itemRowH = 21;
  const rowVals = [
    `BT-${tracking.code.slice(-4)}`,
    `${tracking.productSummary || `Pedido ${tracking.orderCode || tracking.code}`} (Garantia ${storeSettings.storeName})`,
    meta.ncmCode,
    '0102',
    meta.cfopCode.replace('.', ''),
    'UN',
    '1,00',
    meta.formatDecimal(meta.productsSubtotal),
    meta.formatDecimal(meta.productsSubtotal),
  ];
  cx = margin;
  for (let idx = 0; idx < cols.length; idx += 1) {
    const c = cols[idx];
    doc.rect(cx, y, c.w, itemRowH);
    doc.setFont('helvetica', idx === 1 || idx === 8 ? 'bold' : 'normal');
    doc.setFontSize(6.7);
    doc.setTextColor(15, 23, 42);
    const val = pdfTextSafe(rowVals[idx]);
    if (c.align === 'right') {
      doc.text(val, cx + c.w - 1.2, y + 5, { align: 'right' });
    } else {
      const wrapped = doc.splitTextToSize(val, c.w - 2.4);
      doc.text(wrapped.slice(0, 4), cx + 1.2, y + 5);
    }
    cx += c.w;
  }
  y += itemRowH + 3.5;

  // DADOS ADICIONAIS + QR CODE SEFAZ
  drawSectionBar('DADOS ADICIONAIS');
  const addH = 26;
  const addRightW = 28;
  const addMidW = 50;
  const addLeftW = contentW - addMidW - addRightW;
  doc.rect(margin, y, addLeftW, addH);
  doc.rect(margin + addLeftW, y, addMidW, addH);
  doc.rect(margin + addLeftW + addMidW, y, addRightW, addH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INFORMAÇÕES COMPLEMENTARES', margin + 2, y + 3.2);
  doc.text('RESERVADO AO FISCO', margin + addLeftW + 2, y + 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  const compText = pdfTextSafe(
    `Pedido: ${tracking.orderCode || tracking.code} | Código de Rastreio: ${tracking.code} | Trajeto: ${meta.originText} -> ${meta.destText}. DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL (LC 123/2006). Garantia contratual ${storeSettings.storeName} e direito de arrependimento em até 7 dias corridos (Art. 49 do CDC).`
  );
  doc.text(doc.splitTextToSize(compText, addLeftW - 4).slice(0, 5), margin + 2, y + 7);
  doc.text(
    doc.splitTextToSize(
      `NF-e autorizada via SEFAZ-PR.\nProtocolo: ${meta.protocolNumber}\nSAC: ${storeSettings.phone}`,
      addMidW - 4
    ),
    margin + addLeftW + 2,
    y + 7
  );

  // Embedded verification QR inside DADOS ADICIONAIS
  const danfeQrSize = 18;
  const danfeQrX = margin + addLeftW + addMidW + (addRightW - danfeQrSize) / 2;
  const danfeQrY = y + 2;
  const danfeQrModules = buildQrModules(
    `${tracking.code}|${tracking.invoiceNumber}|${meta.chaveAcesso.replace(/\s+/g, '')}`,
    21
  );
  const danfeCell = danfeQrSize / 21;
  doc.setFillColor(15, 23, 42);
  danfeQrModules.forEach((row, ry) => {
    row.forEach((on, rx) => {
      if (on) {
        doc.rect(danfeQrX + rx * danfeCell, danfeQrY + ry * danfeCell, danfeCell, danfeCell, 'F');
      }
    });
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'AUTENTICIDADE NF-e',
    margin + addLeftW + addMidW + addRightW / 2,
    y + 23.8,
    { align: 'center' }
  );

  return doc;
}

export function createShippingLabelPdfDocument(
  tracking: PersistedTracking,
  storeSettings: StoreSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const meta = computeTrackingDocumentMeta(tracking, storeSettings);
  const w = 100;
  const m = 4;
  const cw = w - m * 2;
  let y = 4;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.rect(m, y, cw, 142);

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(m + 2, y + 2.2, 24, 4.6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.text('SEDEX EXPRESSO', m + 14, y + 5.4, { align: 'center' });

  doc.setFillColor(163, 230, 53);
  doc.rect(m + 27, y + 2.2, 16, 4.6, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(5.2);
  doc.text('PRIORITÁRIO', m + 35, y + 5.4, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.rect(m + 44, y + 2.2, 23, 4.6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(4.8);
  doc.text('CT 9912487201', m + 55.5, y + 5.3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(pdfTextSafe(`${storeSettings.storeName.toUpperCase()} LOGÍSTICA`), m + 2, y + 12.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(51, 65, 85);
  doc.text(
    pdfTextSafe(tracking.shippingLabel || 'Entrega Expressa Rastreada').slice(0, 42),
    m + 2,
    y + 16.2
  );

  // QR Matrix top-right
  const qrSize = 18;
  const qrX = m + cw - qrSize - 2;
  const qrY = y + 2.2;
  doc.setDrawColor(15, 23, 42);
  doc.rect(qrX, qrY, qrSize, qrSize + 4);
  const qrModules = buildQrModules(
    `${tracking.code}|${tracking.invoiceNumber}|${tracking.orderCode}`,
    21
  );
  const cell = (qrSize - 2) / 21;
  doc.setFillColor(15, 23, 42);
  qrModules.forEach((row, ry) => {
    row.forEach((on, rx) => {
      if (on) {
        doc.rect(qrX + 1 + rx * cell, qrY + 1 + ry * cell, cell, cell, 'F');
      }
    });
  });
  doc.setFont('courier', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(15, 23, 42);
  doc.text(`PLP ${tracking.code.slice(-6)}`, qrX + qrSize / 2, qrY + qrSize + 2.6, {
    align: 'center',
  });

  y += 25.5;
  doc.line(m, y, w - m, y);

  // Meta strip
  doc.setFillColor(248, 250, 252);
  doc.rect(m, y, cw, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.7);
  doc.setTextColor(15, 23, 42);
  doc.text(`NF-e: ${meta.invoiceFormatted}`, m + 2, y + 4.8);
  doc.text(`Pedido: ${(tracking.orderCode || tracking.code).slice(0, 14)}`, m + 28, y + 4.8);
  doc.text(`Peso: ${meta.weightKg.toFixed(2)}kg`, m + 61, y + 4.8);
  doc.text('Vol: 1/1', m + 81, y + 4.8);

  y += 9;

  // Barcode Hero
  doc.rect(m + 2, y, cw - 4, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text('OBJETO RASTREADO', m + 4, y + 3.4);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${meta.originParsed.uf}-${meta.originParsed.city.slice(0, 3).toUpperCase()} -> ${meta.destParsed.uf}-${meta.destParsed.city.slice(0, 3).toUpperCase()}`,
    w - m - 4,
    y + 3.4,
    { align: 'right' }
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(tracking.code, w / 2, y + 7.8, { align: 'center' });
  const mainBars = buildCode128Bars(`${tracking.code}-${tracking.invoiceNumber}`, 64, cw - 10);
  doc.setFillColor(15, 23, 42);
  for (const bar of mainBars) {
    doc.rect(m + 5 + bar.x, y + 9.4, bar.w, 10.2, 'F');
  }
  doc.setFillColor(15, 23, 42);
  doc.rect(m + 2, y + 21, cw - 4, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  const routeText = pdfTextSafe(
    `ORIGEM ${meta.originText.toUpperCase()} -> DESTINO ${meta.destText.toUpperCase()}`
  ).slice(0, 56);
  doc.text(routeText, w / 2, y + 24.4, { align: 'center' });

  y += 27.5;

  // Destinatário card
  doc.setTextColor(15, 23, 42);
  doc.rect(m + 2, y, cw - 4, 34);
  doc.line(m + 2, y + 5.5, w - m - 2, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('DESTINATÁRIO', m + 4, y + 4);
  doc.text(`CEP ${meta.recipientCep}`, w - m - 4, y + 4, { align: 'right' });

  doc.setFontSize(9);
  doc.text(
    pdfTextSafe((tracking.customerLabel || 'Cliente Brasil Tech').toUpperCase()).slice(0, 34),
    m + 4,
    y + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const addrLines = doc.splitTextToSize(pdfTextSafe(meta.recipientAddress), cw - 10);
  doc.text(addrLines.slice(0, 2), m + 4, y + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    pdfTextSafe(`${meta.destParsed.city.toUpperCase()} - ${meta.destParsed.uf}`),
    m + 4,
    y + 21.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(pdfTextSafe(`CPF/CNPJ: ${meta.recipientCpf}   |   Fone: ${meta.recipientPhone}`), m + 4, y + 25.5);

  const cepBars = buildCode128Bars(
    tracking.customerCep || tracking.destinationCityState || '80000000',
    40,
    46
  );
  doc.setFillColor(15, 23, 42);
  for (const bar of cepBars) {
    doc.rect(m + 4 + bar.x, y + 27.5, bar.w, 5, 'F');
  }
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text(`CEP ${meta.recipientCep}`, w - m - 4, y + 31.2, { align: 'right' });

  y += 35.5;

  // Content summary
  doc.setFillColor(248, 250, 252);
  doc.rect(m + 2, y, cw - 4, 13, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('DECLARAÇÃO DE CONTEÚDO:', m + 4, y + 4);
  doc.setFont('helvetica', 'normal');
  const prodLines = doc.splitTextToSize(pdfTextSafe(tracking.productSummary || ''), cw - 10);
  doc.text(prodLines.slice(0, 2), m + 4, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `VALOR SEGURADO: ${meta.totalFormatted} - LACRE CONFERIDO`,
    m + 4,
    y + 11.5
  );

  y += 14.5;

  // Signature strip
  doc.rect(m + 2, y, cw - 4, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('RECEBEDOR:', m + 4, y + 4.3);
  doc.line(m + 18, y + 4.6, w - m - 4, y + 4.6);
  doc.text('DOC/RG: ___________________', m + 4, y + 8.8);
  doc.text('DATA/HORA: ____/____  ____:____', m + 46, y + 8.8);

  y += 12.2;

  // Remetente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.text('REMETENTE - DESPACHO OFICIAL:', m + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.text(
    pdfTextSafe(
      `${storeSettings.storeName.toUpperCase()} COMÉRCIO DE ELETRÔNICOS LTDA - CNPJ ${storeSettings.cnpj}`
    ).slice(0, 62),
    m + 2,
    y + 6.2
  );
  doc.text(
    pdfTextSafe(`${storeSettings.address} - ${meta.originText} - SAC: ${storeSettings.phone}`).slice(
      0,
      62
    ),
    m + 2,
    y + 9.2
  );

  return doc;
}

function triggerBrowserPdfDownload(doc: jsPDF, fileName: string): void {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  } catch {
    doc.save(safeName);
  }
}

export function downloadDanfePdf(
  tracking: PersistedTracking,
  storeSettings: StoreSettings
): string {
  const doc = createDanfePdfDocument(tracking, storeSettings);
  const fileName = `DANFE-NFe-${tracking.code}.pdf`;
  triggerBrowserPdfDownload(doc, fileName);
  return fileName;
}

export function downloadShippingLabelPdf(
  tracking: PersistedTracking,
  storeSettings: StoreSettings
): string {
  const doc = createShippingLabelPdfDocument(tracking, storeSettings);
  const fileName = `Etiqueta-Envio-${tracking.code}.pdf`;
  triggerBrowserPdfDownload(doc, fileName);
  return fileName;
}
