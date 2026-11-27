import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChaveAcesso,
  buildCode128Bars,
  buildQrModules,
  computeTrackingDocumentMeta,
  createDanfePdfDocument,
  createShippingLabelPdfDocument,
} from './trackingPdfGenerator';
import type { PersistedTracking, StoreSettings } from '../services/firestoreStore';

const SAMPLE_SETTINGS: StoreSettings = {
  storeName: 'Brasil Tech',
  cnpj: '62.250.039/0001-14',
  address: 'Av. Getúlio Vargas, 22 – Loja 2',
  phone: '(41) 99662-6482',
  whatsappDigits: '5541996626482',
  email: 'brasiltech@gmail.com',
  expressShippingPrice: 30,
  standardShippingPrice: 15,
  pixDiscountPercent: 0,
};

const SAMPLE_TRACKING: PersistedTracking = {
  code: 'BT849201BR',
  orderCode: 'BT-48210',
  customerLabel: 'Marcos Silva',
  customerCpf: '123.456.789-00',
  maskedCpf: '123.***.***-00',
  customerPhone: '(11) 99999-8888',
  customerAddress: 'Av. Paulista, 1000 - Bela Vista',
  customerCep: '01310-100',
  productSummary: '1x iPhone 14 Pro 256GB Roxo Profundo',
  cityState: 'São Paulo - SP',
  originCityState: 'Curitiba - PR',
  destinationCityState: 'São Paulo - SP',
  currentLocation: 'Centro de Distribuição Registro - SP',
  routeProgress: 55,
  invoiceNumber: '001482',
  orderTotal: 4299,
  weightKg: 0.9,
  shippingLabel: 'Correios SEDEX • Entrega Expressa',
  statusStep: 2,
  statusNote: 'Objeto em trânsito para entrega expressa',
  active: true,
  createdAtLabel: '25/11/2026, 10:15',
  updatedAtLabel: '25/11/2026, 11:00',
};

test('buildChaveAcesso generates 44 numeric digits grouped in 11 blocks', () => {
  const chave = buildChaveAcesso(SAMPLE_TRACKING, '62250039000114');
  const rawDigits = chave.replace(/\s+/g, '');
  assert.equal(rawDigits.length, 44);
  assert.match(rawDigits, /^\d{44}$/);
});

test('buildCode128Bars and buildQrModules produce deterministic printable geometry', () => {
  const bars = buildCode128Bars('BT849201BR-001482', 64, 200);
  assert.equal(bars.length, 64);
  assert.ok(bars.every((b) => b.w > 0 && b.x >= 0));

  const qr = buildQrModules('BT849201BR|001482|BT-48210', 21);
  assert.equal(qr.length, 21);
  assert.equal(qr[0][0], true); // Top-left finder corner
  assert.equal(qr[0][20], true); // Top-right finder corner
  assert.equal(qr[20][0], true); // Bottom-left finder corner
});

test('computeTrackingDocumentMeta selects interstate CFOP 6.102 and NCM for phones', () => {
  const meta = computeTrackingDocumentMeta(SAMPLE_TRACKING, SAMPLE_SETTINGS);
  assert.equal(meta.cfopCode, '6.102');
  assert.equal(meta.ncmCode, '8517.13.00');
  assert.equal(meta.freightValue, 30);
  assert.equal(meta.productsSubtotal, 4269);
});

test('createDanfePdfDocument outputs valid %PDF bytes without throwing', () => {
  const doc = createDanfePdfDocument(SAMPLE_TRACKING, SAMPLE_SETTINGS);
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  assert.equal(header, '%PDF-');
  assert.ok(bytes.length > 2000);
});

test('createShippingLabelPdfDocument outputs valid %PDF bytes without throwing', () => {
  const doc = createShippingLabelPdfDocument(SAMPLE_TRACKING, SAMPLE_SETTINGS);
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  assert.equal(header, '%PDF-');
  assert.ok(bytes.length > 2000);
});
