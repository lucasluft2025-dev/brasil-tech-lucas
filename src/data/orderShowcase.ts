import { MarketplaceOrder, MarketplaceProduct, PRODUCTS } from './marketplaceCatalog';

export type ShowcaseOrderStatus = 'feito' | 'pago' | 'entregue';

export interface ShowcaseOrder {
  code: string;
  status: ShowcaseOrderStatus;
  statusStep: number; // 0 = Pedido Feito, 2 = Pago / Em transporte, 4 = Entregue
  createdAt: string;
  customerName: string;
  cityState: string;
  originCityState: string;
  currentLocation: string;
  routeProgress: number;
  productId: number;
  productName: string;
  productImage: string;
  category: string;
  condition: string;
  warranty: string;
  qty: number;
  unitPixPrice: number;
  totalPixPrice: number;
  shippingLabel: string;
  trackingCode: string;
  hasAdminTracking: boolean;
  paymentLabel: string;
  note: string;
  invoiceNumber: string;
  weightKg: number;
}

const STORAGE_KEY = 'bt_showcase_orders_overrides_v1';

interface OrderSeed {
  code: string;
  status: ShowcaseOrderStatus;
  createdAt: string;
  customerName: string;
  cityState: string;
  originCityState: string;
  currentLocation: string;
  routeProgress: number;
  statusStep: number;
  productId: number;
  qty: number;
  customPixUnitPrice: number;
  shippingLabel: string;
  trackingCode: string;
  invoiceNumber: string;
  weightKg: number;
  note: string;
}

const CURATED_RECENT_SEEDS: OrderSeed[] = [
  {
    code: 'BT-96412',
    status: 'entregue',
    createdAt: 'Hoje, 16:40',
    customerName: 'Rafael Henrique Souza',
    cityState: 'São Paulo - SP',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Entregue em São Paulo - SP',
    routeProgress: 100,
    statusStep: 4,
    productId: 19,
    qty: 1,
    customPixUnitPrice: 2890,
    shippingLabel: 'Entrega Expressa (No mesmo dia)',
    trackingCode: 'Entrega concluída c/ NF-e',
    invoiceNumber: '009641',
    weightKg: 0.45,
    note: 'iPhone 14 Pro entregue em mãos com lacre Brasil Tech, saúde de bateria 94% e garantia de 12 meses.',
  },
  {
    code: 'BT-96398',
    status: 'pago',
    createdAt: 'Hoje, 15:52',
    customerName: 'Mariana Costa Lima',
    cityState: 'Belo Horizonte - MG',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Centro Logístico São Paulo - SP',
    routeProgress: 68,
    statusStep: 2,
    productId: 20,
    qty: 1,
    customPixUnitPrice: 2390,
    shippingLabel: 'Entrega Expressa (No mesmo dia)',
    trackingCode: 'PIX aprovado • Enviado ao cliente',
    invoiceNumber: '009639',
    weightKg: 0.46,
    note: 'PIX confirmado na hora! iPhone 13 Pro revisado em bancada e em trânsito para Belo Horizonte - MG.',
  },
  {
    code: 'BT-96374',
    status: 'entregue',
    createdAt: 'Hoje, 14:18',
    customerName: 'Lucas Eduardo Mendes',
    cityState: 'Curitiba - PR',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Entregue em Curitiba - PR',
    routeProgress: 100,
    statusStep: 4,
    productId: 20,
    qty: 1,
    customPixUnitPrice: 2390,
    shippingLabel: 'Entrega Expressa (No mesmo dia)',
    trackingCode: 'Entrega concluída c/ NF-e',
    invoiceNumber: '009637',
    weightKg: 0.46,
    note: 'Entregue no mesmo dia em Curitiba - PR. Cliente conferiu Face ID, câmeras ProRAW e termo de garantia.',
  },
  {
    code: 'BT-96351',
    status: 'pago',
    createdAt: 'Hoje, 13:35',
    customerName: 'Camila Andrade Pereira',
    cityState: 'Rio de Janeiro - RJ',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Saiu para entrega • Rio de Janeiro - RJ',
    routeProgress: 89,
    statusStep: 3,
    productId: 19,
    qty: 1,
    customPixUnitPrice: 2890,
    shippingLabel: 'Entrega Expressa (No mesmo dia)',
    trackingCode: 'PIX aprovado • Enviado ao cliente',
    invoiceNumber: '009635',
    weightKg: 0.45,
    note: 'Pagamento PIX aprovado! Portador saiu para entrega expressa de iPhone 14 Pro no Rio de Janeiro.',
  },
  {
    code: 'BT-96320',
    status: 'entregue',
    createdAt: 'Hoje, 11:45',
    customerName: 'Gabriel Martins Ferreira',
    cityState: 'Porto Alegre - RS',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Entregue em Porto Alegre - RS',
    routeProgress: 100,
    statusStep: 4,
    productId: 1,
    qty: 1,
    customPixUnitPrice: 1550,
    shippingLabel: 'Entrega Padrão (Até 2 dias úteis)',
    trackingCode: 'Entrega concluída c/ NF-e',
    invoiceNumber: '009632',
    weightKg: 3.9,
    note: 'PS5 Mídia Digital entregue e testado com DualSense original e garantia de 6 meses.',
  },
  {
    code: 'BT-96295',
    status: 'feito',
    createdAt: 'Hoje, 10:12',
    customerName: 'Bruno Almeida Costa',
    cityState: 'Salvador - BA',
    originCityState: 'Curitiba - PR',
    currentLocation: 'Aguardando confirmação PIX • Curitiba - PR',
    routeProgress: 12,
    statusStep: 0,
    productId: 27,
    qty: 1,
    customPixUnitPrice: 649,
    shippingLabel: 'Entrega Padrão (Até 2 dias úteis)',
    trackingCode: 'Aguardando confirmação PIX',
    invoiceNumber: '009629',
    weightKg: 0.41,
    note: 'Pedido registrado no Mini Checkout aguardando compensação do PIX.',
  },
];

const FIRST_NAMES = [
  'Lucas', 'Mariana', 'Rafael', 'Camila', 'Gabriel', 'Fernanda', 'Bruno', 'Juliana',
  'Thiago', 'Amanda', 'Matheus', 'Larissa', 'Felipe', 'Patrícia', 'Diego', 'Vanessa',
  'Henrique', 'Beatriz', 'Cauã', 'Carolina', 'Rodrigo', 'Letícia', 'Vinícius', 'Isabela',
  'Gustavo', 'Natália', 'Eduardo', 'Aline', 'Marcelo', 'Renata', 'André', 'Bianca',
  'Leonardo', 'Priscila', 'Danilo', 'Thaís', 'Murilo', 'Sabrina', 'Alexandre', 'Débora',
  'Caio', 'Jéssica', 'Fernando', 'Raquel', 'Igor', 'Tatiana', 'Pedro', 'Luana',
  'João', 'Paula', 'Samuel', 'Helena', 'Daniel', 'Yasmin', 'Guilherme', 'Bruna',
];

const MIDDLE_NAMES = [
  'Henrique', 'Costa', 'Andrade', 'Eduardo', 'Ribeiro', 'Almeida', 'Pereira', 'Nogueira',
  'Souza', 'Carvalho', 'Gomes', 'Rocha', 'Lima', 'Ferreira', 'Teixeira', 'Barbosa',
  'Cardoso', 'Oliveira', 'Martins', 'Mendes', 'Duarte', 'Correia', 'Araújo', 'Moreira',
  'Monteiro', 'Vieira', 'Batista', 'Dias', 'Nunes', 'Campos', 'Cavalcante', 'Freitas',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Araújo',
  'Melo', 'Cardoso', 'Mendes', 'Freitas', 'Campos', 'Duarte', 'Nogueira', 'Teixeira',
];

const BRAZIL_CITIES = [
  'São Paulo - SP', 'Curitiba - PR', 'Belo Horizonte - MG', 'Rio de Janeiro - RJ',
  'Porto Alegre - RS', 'Brasília - DF', 'Goiânia - GO', 'Salvador - BA',
  'Fortaleza - CE', 'Recife - PE', 'Florianópolis - SC', 'Campinas - SP',
  'Londrina - PR', 'Joinville - SC', 'Natal - RN', 'Vitória - ES',
  'Manaus - AM', 'Belém - PA', 'Ribeirão Preto - SP', 'Maringá - PR',
  'Uberlândia - MG', 'Caxias do Sul - RS', 'Sorocaba - SP', 'João Pessoa - PB',
  'Maceió - AL', 'Aracaju - SE', 'Campo Grande - MS', 'Cuiabá - MT',
  'São José dos Campos - SP', 'Blumenau - SC', 'Santos - SP', 'Niterói - RJ',
];

const TRANSIT_HUBS = [
  'Centro Logístico São Paulo - SP',
  'Unidade de Triagem Campinas - SP',
  'Rodovia Régis Bittencourt • Registro - SP',
  'Hub Aéreo Guarulhos - SP',
  'Unidade Rodoviária Joinville - SC',
  'Centro de Distribuição Contagem - MG',
  'Centro de Triagem Brasília - DF',
  'Saiu para entrega com portador regional',
];

const DELIVERED_NOTES = [
  'Entregue em mãos com lacre Brasil Tech conferido pelo cliente no ato.',
  'Recebido dentro do prazo! Aparelho testado, NF-e emitida e garantia ativa.',
  'Entrega concluída com sucesso. Cliente confirmou recebimento pelo WhatsApp.',
  'Aparelho conferido, bateria verificada e termo de garantia de 6 a 12 meses ativo.',
  'Entregue via portador expresso no mesmo dia com proteção contra extravio.',
  'Recebido em embalagem lacrada com nota fiscal eletrônica e suporte ativo.',
  'Cliente avaliou a entrega como rápida e conferiu todos os acessórios.',
];

const PAID_NOTES = [
  'PIX aprovado na hora! Aparelho revisado em bancada técnica e em rota de entrega.',
  'Pagamento confirmado via PIX. Nota Fiscal emitida e objeto em transferência.',
  'PIX compensado com aprovação imediata. Encaminhado ao centro de distribuição.',
  'Pedido pago e conferido! Em deslocamento para o endereço de destino.',
];

const MADE_NOTES = [
  'Pedido registrado via Mini Checkout aguardando compensação do PIX.',
  'Unidade separada e testada em estoque aguardando confirmação do PIX.',
];

// Weighted product IDs prioritizing delivered iPhones (13 Pro, 14 Pro, 16 Pro Max, 11, XR), consoles & lower-priced items
const PRODUCT_POOL_WEIGHTED = [
  19, 20, 19, 20, 17, 1, 2, 7, 27, 28, 29, 30,
  19, 20, 21, 23, 24, 25, 3, 5, 6, 9, 10, 11,
  18, 22, 16, 12, 13, 26, 4, 8, 19, 20, 27, 28,
];

function buildWeightByCategory(cat: string): number {
  if (cat === 'Celular') return 0.44;
  if (cat === 'Acessórios') return 0.55;
  if (cat === 'PC Gamer') return 8.4;
  if (cat === 'Nintendo') return 1.85;
  return 3.1;
}

function generateRealisticOrderSeeds(totalCount = 328): OrderSeed[] {
  const generated: OrderSeed[] = [...CURATED_RECENT_SEEDS];
  const remaining = Math.max(0, totalCount - generated.length);

  for (let i = 0; i < remaining; i += 1) {
    // Distribution across remaining 322 orders:
    // ~72% delivered (~232 delivered), ~21% paid (~68 paid), ~7% made (~22 made)
    const mod = (i * 7 + 3) % 100;
    const status: ShowcaseOrderStatus =
      mod < 72 ? 'entregue' : mod < 93 ? 'pago' : 'feito';

    const orderNum = 96270 - i * 13;
    const code = `BT-${orderNum}`;
    const invoiceNumber = String(96270 - i * 13).padStart(6, '0');

    const fn = FIRST_NAMES[(i * 11 + 5) % FIRST_NAMES.length];
    const mn = MIDDLE_NAMES[(i * 17 + 9) % MIDDLE_NAMES.length];
    const ln = LAST_NAMES[(i * 23 + 3) % LAST_NAMES.length];
    const customerName = `${fn} ${mn} ${ln}`;

    const cityState = BRAZIL_CITIES[(i * 13 + 7) % BRAZIL_CITIES.length];
    const productId = PRODUCT_POOL_WEIGHTED[(i * 5 + 2) % PRODUCT_POOL_WEIGHTED.length];
    const product = PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];

    const qty = product.price <= 250 && i % 5 === 0 ? 2 : 1;
    const isExpress = i % 3 !== 1;
    const shippingLabel = isExpress
      ? 'Entrega Expressa (No mesmo dia)'
      : 'Entrega Padrão (Até 2 dias úteis)';

    const daysAgo = Math.floor(i / 7);
    const hour = 8 + ((i * 3) % 13);
    const min = String((i * 19) % 60).padStart(2, '0');
    const createdAt =
      daysAgo === 0
        ? `Hoje, ${String(hour).padStart(2, '0')}:${min}`
        : daysAgo === 1
          ? `Ontem, ${String(hour).padStart(2, '0')}:${min}`
          : `Há ${daysAgo} dias`;

    const statusStep = status === 'entregue' ? 4 : status === 'pago' ? (i % 4 === 0 ? 3 : 2) : 0;
    const routeProgress =
      status === 'entregue' ? 100 : status === 'pago' ? 45 + ((i * 11) % 45) : 10 + (i % 6);

    const currentLocation =
      status === 'entregue'
        ? `Entregue em ${cityState}`
        : status === 'pago'
          ? TRANSIT_HUBS[i % TRANSIT_HUBS.length]
          : 'Aguardando confirmação PIX • Curitiba - PR';

    const trackingCode =
      status === 'entregue'
        ? 'Entrega concluída c/ NF-e'
        : status === 'pago'
          ? 'PIX aprovado • Envio em rota'
          : 'Aguardando confirmação PIX';

    const note =
      status === 'entregue'
        ? DELIVERED_NOTES[i % DELIVERED_NOTES.length]
        : status === 'pago'
          ? PAID_NOTES[i % PAID_NOTES.length]
          : MADE_NOTES[i % MADE_NOTES.length];

    generated.push({
      code,
      status,
      createdAt,
      customerName,
      cityState,
      originCityState: 'Curitiba - PR',
      currentLocation,
      routeProgress,
      statusStep,
      productId: product.id,
      qty,
      customPixUnitPrice: product.price,
      shippingLabel,
      trackingCode,
      invoiceNumber,
      weightKg: buildWeightByCategory(product.cat),
      note,
    });
  }

  return generated;
}

const SHOWCASE_SEEDS: OrderSeed[] = generateRealisticOrderSeeds(328);

export interface ShowcaseOverride {
  status?: ShowcaseOrderStatus;
  unitPixPrice?: number;
}

export function loadShowcaseOverrides(): Record<string, ShowcaseOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ShowcaseOverride>) : {};
  } catch {
    return {};
  }
}

export function saveShowcaseOverride(code: string, patch: ShowcaseOverride) {
  const current = loadShowcaseOverrides();
  const next = {
    ...current,
    [code]: {
      ...(current[code] || {}),
      ...patch,
    },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

function statusToStep(status: ShowcaseOrderStatus): number {
  if (status === 'entregue') return 4;
  if (status === 'pago') return 2;
  return 0;
}

function isRealAdminTrackingCode(code?: string): boolean {
  if (!code) return false;
  const clean = code.trim();
  const lower = clean.toLowerCase();
  if (
    !clean ||
    lower.includes('aguardando') ||
    lower.includes('entrega concluída') ||
    lower.includes('envio em rota') ||
    lower.includes('enviado ao cliente')
  ) {
    return false;
  }
  return /^[A-Z0-9_-]{3,60}$/i.test(clean);
}

export function buildShowcaseOrders(
  catalogProducts: MarketplaceProduct[],
  liveOrders: MarketplaceOrder[] = [],
  overrides: Record<string, ShowcaseOverride> = {}
): ShowcaseOrder[] {
  const sourceProducts = catalogProducts.length ? catalogProducts : PRODUCTS;

  const liveMapped: ShowcaseOrder[] = liveOrders.map((ord) => {
    const matchedProd = sourceProducts.find((p) => (ord.address ? true : Boolean(p)));
    const status: ShowcaseOrderStatus =
      ord.statusStep >= 4 ? 'entregue' : ord.statusStep >= 1 ? 'pago' : 'feito';
    const override = overrides[ord.code];
    const finalStatus = override?.status ?? status;
    const finalTotal = override?.unitPixPrice ?? ord.total;
    const trackingCode = ord.trackingCode || 'Aguardando postagem';

    return {
      code: ord.code,
      status: finalStatus,
      statusStep: statusToStep(finalStatus),
      createdAt: ord.createdAt,
      customerName: ord.customerName,
      cityState: ord.cityState || 'Brasil',
      originCityState: 'Curitiba - PR',
      currentLocation:
        finalStatus === 'entregue'
          ? `Entregue em ${ord.cityState || 'Destino'}`
          : 'Centro de Distribuição Brasil Tech',
      routeProgress: finalStatus === 'entregue' ? 100 : finalStatus === 'pago' ? 62 : 12,
      productId: matchedProd?.id || 1,
      productName: `Pedido ${ord.code} • ${ord.customerName}`,
      productImage: matchedProd?.image || '/src/assets/ref/products/ps5-digital.jpg',
      category: 'Pedido da Loja',
      condition: 'Compra Garantida',
      warranty: 'Garantia Brasil Tech',
      qty: 1,
      unitPixPrice: finalTotal,
      totalPixPrice: finalTotal,
      shippingLabel: ord.shippingLabel,
      trackingCode,
      hasAdminTracking: isRealAdminTrackingCode(trackingCode),
      paymentLabel: 'PIX Instantâneo',
      note: 'Pedido registrado na loja Brasil Tech.',
      invoiceNumber: `00${ord.code.replace(/\D/g, '').slice(0, 4) || '1400'}`,
      weightKg: 1.4,
    };
  });

  const seededMapped: ShowcaseOrder[] = SHOWCASE_SEEDS.map((seed) => {
    const prod = sourceProducts.find((p) => p.id === seed.productId) || PRODUCTS[0];
    const override = overrides[seed.code];
    const finalStatus = override?.status ?? seed.status;
    const unitPixPrice =
      override?.unitPixPrice !== undefined && override.unitPixPrice > 0
        ? override.unitPixPrice
        : prod.price || seed.customPixUnitPrice;

    return {
      code: seed.code,
      status: finalStatus,
      statusStep: override?.status ? statusToStep(finalStatus) : seed.statusStep,
      createdAt: seed.createdAt,
      customerName: seed.customerName,
      cityState: seed.cityState,
      originCityState: seed.originCityState,
      currentLocation:
        finalStatus === 'entregue' ? `Entregue em ${seed.cityState}` : seed.currentLocation,
      routeProgress: finalStatus === 'entregue' ? 100 : seed.routeProgress,
      productId: prod.id,
      productName: prod.name,
      productImage: prod.image,
      category: prod.cat,
      condition: prod.condition,
      warranty: prod.warranty,
      qty: seed.qty,
      unitPixPrice,
      totalPixPrice: Number((unitPixPrice * seed.qty).toFixed(2)),
      shippingLabel: seed.shippingLabel,
      trackingCode: seed.trackingCode,
      hasAdminTracking: false,
      paymentLabel: finalStatus === 'feito' ? 'PIX (Aguardando pagamento)' : 'PIX Aprovado',
      note: seed.note,
      invoiceNumber: seed.invoiceNumber,
      weightKg: seed.weightKg,
    };
  });

  return [...liveMapped, ...seededMapped];
}
