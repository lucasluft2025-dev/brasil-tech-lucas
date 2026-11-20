export interface MarketplaceProduct {
  id: number;
  name: string;
  cat: string;
  emoji: string;
  price: number;
  old: number;
  rating: string;
  reviews: number;
  featured: boolean;
  desc: string;
  image: string;
  images?: string[];
  stock: number;
  sold: number;
  warranty: string;
  condition: string;
  checkoutUrl?: string;
  specs: { label: string; value: string }[];
}

export const CHECKOUT_URL_SPEC_KEY = '__CHECKOUT_URL__';

export function extractCheckoutUrlAndCleanSpecs(
  specs: { label: string; value: string }[],
  fallbackUrl?: string
): { checkoutUrl: string; cleanSpecs: { label: string; value: string }[] } {
  let foundUrl = '';
  const cleanSpecs: { label: string; value: string }[] = [];
  for (const item of specs || []) {
    if (item && item.label === CHECKOUT_URL_SPEC_KEY) {
      foundUrl = String(item.value || '').trim();
    } else if (item && item.label) {
      cleanSpecs.push({ label: String(item.label), value: String(item.value || '') });
    }
  }
  return {
    checkoutUrl: foundUrl || (fallbackUrl ? fallbackUrl.trim() : ''),
    cleanSpecs,
  };
}

export function mergeCheckoutUrlIntoSpecs(
  specs: { label: string; value: string }[],
  checkoutUrl?: string
): { label: string; value: string }[] {
  const clean = (specs || []).filter((s) => s && s.label !== CHECKOUT_URL_SPEC_KEY).slice(0, 14);
  const trimmedUrl = (checkoutUrl || '').trim().slice(0, 500);
  if (trimmedUrl) {
    clean.push({ label: CHECKOUT_URL_SPEC_KEY, value: trimmedUrl });
  }
  return clean;
}

export interface CartEntry {
  id: number;
  qty: number;
}

export interface OrderItem {
  id: number;
  name: string;
  image: string;
  price: number;
  qty: number;
}

export interface MarketplaceOrder {
  code: string;
  createdAt: string;
  customerName: string;
  customerCpf: string;
  customerPhone: string;
  cep: string;
  address: string;
  cityState: string;
  shippingMethod: 'express' | 'standard';
  shippingLabel: string;
  shippingCost: number;
  paymentMethod: 'pix' | 'card' | 'boleto';
  subtotal: number;
  discount: number;
  total: number;
  statusStep: number; // 0: Confirmado, 1: Em separação, 2: Em transporte, 3: Saiu para entrega, 4: Entregue
  trackingCode: string;
}

export interface StoreReview {
  id: number;
  author: string;
  city: string;
  product: string;
  rating: number;
  date: string;
  comment: string;
}

export interface ProductQuestion {
  id: number;
  question: string;
  answer: string;
  date: string;
}

export const CATEGORIES = ['PlayStation', 'Xbox', 'Nintendo', 'PC Gamer', 'Celular', 'Acessórios'];

export const CATEGORY_CARDS = [
  { cat: 'PlayStation', emoji: '🎮', icon: '/src/assets/ref/cats/playstation.png' },
  { cat: 'Xbox', emoji: '🎮', icon: '/src/assets/ref/cats/xbox.png' },
  { cat: 'Nintendo', emoji: '🕹️', icon: '/src/assets/ref/cats/nintendo.png' },
  { cat: 'PC Gamer', emoji: '💻', icon: '/src/assets/ref/cats/pcgamer.png' },
  { cat: 'Celular', emoji: '📱', icon: '/src/assets/ref/cats/celular.png' },
  { cat: 'Acessórios', emoji: '🎧', icon: '/src/assets/ref/cats/acessorios.png' },
];

export const PRODUCTS: MarketplaceProduct[] = [
  // PlayStation
  {
    id: 1,
    name: 'PlayStation 5 Mídia Digital',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 1550,
    old: 2700,
    rating: '4,9',
    reviews: 87,
    featured: true,
    desc: 'Console PlayStation 5 Edição Digital com SSD ultrarrápido, áudio 3D Tempest e controle sem fio DualSense. Produto revisado em bancada técnica, higienizado, testado sob carga máxima e com garantia Brasil Tech.',
    image: '/src/assets/ref/products/ps5-digital.jpg',
    images: [
      '/src/assets/ref/products/ps5-digital.jpg',
      '/src/assets/ref/products/gallery/ps5-digital-2.jpg',
    ],
    stock: 9,
    sold: 342,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado (Grau A+)',
    specs: [
      { label: 'Armazenamento', value: '825 GB SSD NVMe' },
      { label: 'Resolução', value: 'Até 4K 120Hz HDR' },
      { label: 'Acompanha', value: 'Console + Controle DualSense + Cabos' },
    ],
  },
  {
    id: 2,
    name: 'PlayStation 4 Slim',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 700,
    old: 1390,
    rating: '4,9',
    reviews: 1245,
    featured: true,
    desc: 'Console PlayStation 4 Slim revisado, pasta térmica trocada e limpeza interna completa. Pronto para ligar e jogar com garantia e nota fiscal de compra.',
    image: '/src/assets/ref/products/ps4-slim.webp',
    images: [
      '/src/assets/ref/products/ps4-slim.webp',
      '/src/assets/ref/products/gallery/ps4-slim-2.webp',
      '/src/assets/ref/products/gallery/ps4-slim-3.webp',
    ],
    stock: 14,
    sold: 1890,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Armazenamento', value: '500 GB / 1 TB' },
      { label: 'Conectividade', value: 'Wi-Fi, Bluetooth, HDMI' },
      { label: 'Acompanha', value: 'Console + DualShock 4 + Cabos' },
    ],
  },
  {
    id: 3,
    name: 'PlayStation 3 Slim 500GB',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 380,
    old: 790,
    rating: '5,0',
    reviews: 312,
    featured: false,
    desc: 'PlayStation 3 Slim 500GB completo com ótimo custo-benefício. Higienizado, testado em HDMI e com controle sem fio incluso.',
    image: '/src/assets/ref/products/ps3-slim-live.webp',
    images: [
      '/src/assets/ref/products/ps3-slim-live.webp',
      '/src/assets/ref/products/gallery/ps3-slim-live-2.jpg',
      '/src/assets/ref/products/gallery/ps3-slim-live-3.jpg',
    ],
    stock: 11,
    sold: 518,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Armazenamento', value: '500 GB HD' },
      { label: 'Saída de vídeo', value: 'HDMI 1080p' },
      { label: 'Acompanha', value: 'Console + Controle + Cabo HDMI e Energia' },
    ],
  },
  {
    id: 4,
    name: 'PlayStation 2 Fat Original',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 297,
    old: 0,
    rating: '4,8',
    reviews: 145,
    featured: false,
    desc: 'Clássico PlayStation 2 Fat original de coleção, leitura conferida e revisado em bancada técnica.',
    image: '/src/assets/ref/products/ps2-fat.jpg',
    images: [
      '/src/assets/ref/products/ps2-fat.jpg',
      '/src/assets/ref/products/gallery/ps2-fat-2.jpg',
      '/src/assets/ref/products/gallery/ps2-fat-3.jpg',
    ],
    stock: 5,
    sold: 210,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Clássico revisado',
    specs: [
      { label: 'Modelo', value: 'PS2 Fat Original' },
      { label: 'Mídia', value: 'DVD / CD' },
      { label: 'Acompanha', value: 'Console + Controle + Cabos' },
    ],
  },
  {
    id: 5,
    name: 'PlayStation 2 Slim Completo',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 180,
    old: 590,
    rating: '5,0',
    reviews: 237,
    featured: false,
    desc: 'PlayStation 2 Slim completo pronto para reviver grandes clássicos, com controle, cabos e garantia.',
    image: '/src/assets/ref/products/ps2-slim.jpg',
    images: [
      '/src/assets/ref/products/ps2-slim.jpg',
      '/src/assets/ref/products/ps2-slim-2.jpg',
      '/src/assets/ref/products/ps2-slim-3.webp',
    ],
    stock: 18,
    sold: 760,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Revisado completo',
    specs: [
      { label: 'Modelo', value: 'PS2 Slim' },
      { label: 'Voltagem', value: 'Bivolt' },
      { label: 'Acompanha', value: 'Console + Controle + Fonte + Cabo AV' },
    ],
  },

  // Xbox
  {
    id: 6,
    name: 'Xbox Series X 1TB - Console 4K Ultra HD',
    cat: 'Xbox',
    emoji: '🎮',
    price: 2899,
    old: 3100,
    rating: '4,9',
    reviews: 842,
    featured: true,
    desc: 'O Xbox mais rápido e poderoso com 1TB de SSD NVMe, Ray Tracing e jogos em 4K a até 120 FPS. Revisado, silencioso e com garantia total.',
    image: '/src/assets/ref/products/xbox-series-x.jpg',
    images: [
      '/src/assets/ref/products/xbox-series-x.jpg',
      '/src/assets/ref/products/gallery/xbox-series-x-2.jpg',
    ],
    stock: 6,
    sold: 430,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo Premium',
    specs: [
      { label: 'Armazenamento', value: '1 TB SSD Custom' },
      { label: 'Resolução', value: '4K Nativo até 120 FPS' },
      { label: 'Acompanha', value: 'Console + Controle Wireless + Cabos' },
    ],
  },
  {
    id: 7,
    name: 'Xbox Series S',
    cat: 'Xbox',
    emoji: '🎮',
    price: 800,
    old: 0,
    rating: '4,9',
    reviews: 198,
    featured: false,
    desc: 'Console Xbox Series S compacto de nova geração totalmente digital, ideal para Xbox Game Pass com carregamento ultrarrápido.',
    image: '/src/assets/ref/products/xbox-series-s.png',
    images: ['/src/assets/ref/products/xbox-series-s.png'],
    stock: 10,
    sold: 389,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Armazenamento', value: '512 GB SSD NVMe' },
      { label: 'Desempenho', value: '1440p até 120 FPS' },
      { label: 'Acompanha', value: 'Console + Controle Original + Cabos' },
    ],
  },
  {
    id: 8,
    name: 'Xbox One 500GB',
    cat: 'Xbox',
    emoji: '🎮',
    price: 800,
    old: 0,
    rating: '4,8',
    reviews: 164,
    featured: false,
    desc: 'Console Xbox One 500GB revisado com controle original, fonte e cabo HDMI. Testado em bancada com garantia.',
    image: '/src/assets/ref/products/xbox-one.jpg',
    images: [
      '/src/assets/ref/products/xbox-one.jpg',
      '/src/assets/ref/products/xbox-one-2.jpg',
      '/src/assets/ref/products/xbox-one-3.jpg',
    ],
    stock: 8,
    sold: 315,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Armazenamento', value: '500 GB' },
      { label: 'Resolução', value: 'Full HD 1080p' },
      { label: 'Acompanha', value: 'Console + Controle + Fonte + HDMI' },
    ],
  },
  {
    id: 9,
    name: 'Xbox 360 500GB Completo',
    cat: 'Xbox',
    emoji: '🎮',
    price: 197,
    old: 590,
    rating: '4,9',
    reviews: 215,
    featured: false,
    desc: 'Xbox 360 500GB completo para diversão de toda a família. Acompanha controle sem fio, fonte e cabo HDMI.',
    image: '/src/assets/ref/products/xbox360.jpg',
    images: [
      '/src/assets/ref/products/xbox360.jpg',
      '/src/assets/ref/products/xbox360-2.jpg',
      '/src/assets/ref/products/xbox360-3.jpg',
    ],
    stock: 15,
    sold: 620,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Revisado completo',
    specs: [
      { label: 'Armazenamento', value: '500 GB' },
      { label: 'Conectividade', value: 'Wi-Fi Integrado / HDMI' },
      { label: 'Acompanha', value: 'Console + Controle + Cabos' },
    ],
  },

  // Nintendo
  {
    id: 10,
    name: 'Nintendo Wii',
    cat: 'Nintendo',
    emoji: '🕹️',
    price: 590,
    old: 677,
    rating: '5,0',
    reviews: 88,
    featured: false,
    desc: 'Console Nintendo Wii completo com barra sensora, Wii Remote, Nunchuk e cabos originais revisados.',
    image: '/src/assets/ref/products/nintendo-wii.jpg',
    images: [
      '/src/assets/ref/products/nintendo-wii.jpg',
      '/src/assets/ref/products/gallery/wii-2.jpg',
      '/src/assets/ref/products/gallery/wii-3.jpg',
    ],
    stock: 7,
    sold: 132,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Controles', value: 'Wii Remote + Nunchuk + Barra Sensora' },
      { label: 'Compatibilidade', value: 'Jogos Wii e GameCube' },
      { label: 'Garantia', value: '90 dias Brasil Tech' },
    ],
  },

  // PC Gamer
  {
    id: 11,
    name: 'PC Gamer Pichau, AMD Ryzen 5 5600GT, Radeon RX 5600 6GB, 16GB DDR4, SSD 480GB',
    cat: 'PC Gamer',
    emoji: '💻',
    price: 3999.01,
    old: 7055.57,
    rating: '4,8',
    reviews: 120,
    featured: false,
    desc: 'PC Gamer montado e testado com AMD Ryzen 5 5600GT, placa de vídeo Radeon RX 5600 6GB, 16GB DDR4 e SSD 480GB. Ideal para jogos em Full HD com alto FPS.',
    image: '/src/assets/ref/products/pc-gamer-1.jpg',
    images: ['/src/assets/ref/products/pc-gamer-1.jpg'],
    stock: 5,
    sold: 148,
    warranty: '12 meses de garantia',
    condition: 'Novo montado e testado',
    specs: [
      { label: 'Processador', value: 'AMD Ryzen 5 5600GT' },
      { label: 'Placa de Vídeo', value: 'Radeon RX 5600 6GB' },
      { label: 'Memória e SSD', value: '16GB DDR4 + SSD 480GB' },
    ],
  },
  {
    id: 12,
    name: 'PC Gamer Completo Ganesha III, Intel i5-12400F, RX 580 8GB, 16GB DDR4 + Monitor',
    cat: 'PC Gamer',
    emoji: '💻',
    price: 3499.98,
    old: 6369.59,
    rating: '4,6',
    reviews: 210,
    featured: false,
    desc: 'Kit PC Gamer completo pronto para ligar: Intel i5-12400F, RX 580 8GB, 16GB DDR4, SSD 480GB, monitor gamer e kit teclado/mouse RGB.',
    image: '/src/assets/ref/products/pc-gamer-2.jpg',
    images: ['/src/assets/ref/products/pc-gamer-2.jpg'],
    stock: 4,
    sold: 265,
    warranty: '12 meses de garantia',
    condition: 'Kit Completo Novo',
    specs: [
      { label: 'Processador', value: 'Intel Core i5-12400F' },
      { label: 'Placa de Vídeo', value: 'Radeon RX 580 8GB' },
      { label: 'Kit Incluso', value: 'Monitor + Teclado + Mouse + Gabinete' },
    ],
  },
  {
    id: 13,
    name: 'PC Gamer Achlys, Intel i5-12400F, Radeon RX 580 8GB, 8GB DDR4, SSD 240GB',
    cat: 'PC Gamer',
    emoji: '💻',
    price: 2759.96,
    old: 4833.67,
    rating: '4,5',
    reviews: 180,
    featured: false,
    desc: 'PC Gamer Achlys com Intel Core i5-12400F e RX 580 8GB: ótimo ponto de entrada para rodar títulos populares em Full HD.',
    image: '/src/assets/ref/products/pc-gamer-achlys.jpg',
    images: ['/src/assets/ref/products/pc-gamer-achlys.jpg'],
    stock: 7,
    sold: 194,
    warranty: '12 meses de garantia',
    condition: 'Novo montado e testado',
    specs: [
      { label: 'Processador', value: 'Intel Core i5-12400F' },
      { label: 'Placa de Vídeo', value: 'Radeon RX 580 8GB' },
      { label: 'Armazenamento', value: 'SSD 240GB + 8GB DDR4' },
    ],
  },
  {
    id: 14,
    name: 'PC Gamer Belial, Intel i7-14700F, GeForce RTX 5060 8GB, 16GB DDR4, SSD M.2 1TB',
    cat: 'PC Gamer',
    emoji: '💻',
    price: 7359.97,
    old: 12911.1,
    rating: '4,9',
    reviews: 92,
    featured: false,
    desc: 'Máquina de alto desempenho equipada com Intel Core i7-14700F, GeForce RTX 5060 8GB, 16GB DDR4 e SSD NVMe M.2 de 1TB.',
    image: '/src/assets/ref/products/pc-gamer-belial.jpg',
    images: ['/src/assets/ref/products/pc-gamer-belial.jpg'],
    stock: 3,
    sold: 76,
    warranty: '12 meses de garantia',
    condition: 'Novo montado e testado',
    specs: [
      { label: 'Processador', value: 'Intel Core i7-14700F' },
      { label: 'Placa de Vídeo', value: 'GeForce RTX 5060 8GB' },
      { label: 'Memória e SSD', value: '16GB DDR4 + SSD M.2 1TB' },
    ],
  },
  {
    id: 15,
    name: 'PC Gamer Afrodite, AMD Ryzen 7 5700X, Radeon RX 9070 16GB, 16GB DDR4, SSD M.2 1TB',
    cat: 'PC Gamer',
    emoji: '💻',
    price: 7799.37,
    old: 12195.31,
    rating: '4,9',
    reviews: 85,
    featured: false,
    desc: 'Performance extrema para jogos em QHD/4K e criação de conteúdo com Ryzen 7 5700X, Radeon RX 9070 16GB e SSD M.2 1TB.',
    image: '/src/assets/ref/products/pc-gamer-afrodite.jpg',
    images: ['/src/assets/ref/products/pc-gamer-afrodite.jpg'],
    stock: 3,
    sold: 59,
    warranty: '12 meses de garantia',
    condition: 'Novo montado e testado',
    specs: [
      { label: 'Processador', value: 'AMD Ryzen 7 5700X' },
      { label: 'Placa de Vídeo', value: 'Radeon RX 9070 16GB' },
      { label: 'Memória e SSD', value: '16GB DDR4 + SSD M.2 1TB' },
    ],
  },

  // Celular
  {
    id: 16,
    name: 'iPhone 17 Pro',
    cat: 'Celular',
    emoji: '📱',
    price: 5799,
    old: 6390,
    rating: '5,0',
    reviews: 86,
    featured: false,
    desc: 'iPhone 17 Pro desbloqueado Anatel com acabamento premium, câmeras profissionais e garantia total Brasil Tech.',
    image: '/src/assets/ref/products/iphone17pro.webp',
    images: [
      '/src/assets/ref/products/iphone17pro.webp',
      '/src/assets/ref/products/gallery/iphone17pro-2.webp',
    ],
    stock: 4,
    sold: 63,
    warranty: '12 meses com a Brasil Tech',
    condition: 'Original lacrado / Vitrine',
    specs: [
      { label: 'Rede', value: '5G Desbloqueado Anatel' },
      { label: 'Bateria', value: '100% Saúde verificada' },
      { label: 'Garantia', value: '12 meses + NF' },
    ],
  },
  {
    id: 17,
    name: 'iPhone 16 Pro Max 256GB - Titânio 5G Desbloqueado',
    cat: 'Celular',
    emoji: '📱',
    price: 3690,
    old: 5290,
    rating: '5,0',
    reviews: 1284,
    featured: true,
    desc: 'iPhone 16 Pro Max 256GB Titânio 5G desbloqueado para todas as operadoras, câmera tripla 48MP e Face ID 100% testado.',
    image: '/src/assets/ref/products/iphone16promax.webp',
    images: [
      '/src/assets/ref/products/iphone16promax.webp',
      '/src/assets/ref/products/gallery/iphone16promax-2.webp',
    ],
    stock: 8,
    sold: 912,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo Vitrine (Grau A+)',
    specs: [
      { label: 'Capacidade', value: '256 GB' },
      { label: 'Material', value: 'Titânio Aeroespacial' },
      { label: 'Desbloqueio', value: 'Anatel / iCloud Limpo' },
    ],
  },
  {
    id: 18,
    name: 'iPhone 15 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 2590,
    old: 3690,
    rating: '5,0',
    reviews: 118,
    featured: false,
    desc: 'iPhone 15 128GB com Dynamic Island, câmera principal de 48MP, porta USB-C e bateria certificada.',
    image: '/src/assets/ref/products/iphone15.jpg',
    images: ['/src/assets/ref/products/iphone15.jpg'],
    stock: 9,
    sold: 280,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo certificado',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Conector', value: 'USB-C' },
      { label: 'Câmera', value: '48 MP + Ultra-angular' },
    ],
  },
  {
    id: 19,
    name: 'iPhone 14 Pro 128GB - Dynamic Island 48MP',
    cat: 'Celular',
    emoji: '📱',
    price: 2890,
    old: 4190,
    rating: '5,0',
    reviews: 482,
    featured: true,
    desc: 'O equilíbrio perfeito entre design Pro em aço inoxidável, Dynamic Island, tela ProMotion 120Hz e câmera Pro de 48MP. Saúde de bateria certificada acima de 90%, iCloud limpo, desbloqueado Anatel e 12 meses de garantia Brasil Tech.',
    image: '/src/assets/ref/products/iphone14pro.webp',
    images: [
      '/src/assets/ref/products/iphone14pro.webp',
      '/src/assets/ref/products/gallery/iphone14pro-2.jpg',
    ],
    stock: 9,
    sold: 640,
    warranty: '12 meses com a Brasil Tech',
    condition: 'Seminovo Vitrine (Grau A+)',
    specs: [
      { label: 'Tela', value: '6,1" Super Retina XDR 120Hz' },
      { label: 'Chip & Câmera', value: 'A16 Bionic • ProRAW 48MP' },
      { label: 'Bateria & Face ID', value: 'Saúde +90% • 100% Testado' },
    ],
  },
  {
    id: 20,
    name: 'iPhone 13 Pro 128GB - ProMotion 120Hz',
    cat: 'Celular',
    emoji: '📱',
    price: 2390,
    old: 3490,
    rating: '5,0',
    reviews: 538,
    featured: true,
    desc: 'Campeão em custo-benefício na linha Pro: tela Super Retina XDR 120Hz ultrarrápida, câmera tripla com modo Cinema 4K, chip A15 Bionic e bateria certificada acima de 90%. Acompanha laudo técnico, NF-e e 12 meses de garantia.',
    image: '/src/assets/ref/products/iphone13pro.webp',
    images: [
      '/src/assets/ref/products/iphone13pro.webp',
      '/src/assets/ref/products/gallery/iphone13pro-2.webp',
    ],
    stock: 12,
    sold: 790,
    warranty: '12 meses com a Brasil Tech',
    condition: 'Seminovo Vitrine (Grau A+)',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Tela', value: 'ProMotion 120Hz OLED' },
      { label: 'Câmeras & Bateria', value: 'Tripla 12MP ProRAW • +90%' },
    ],
  },
  {
    id: 21,
    name: 'iPhone 13 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 1790,
    old: 2690,
    rating: '5,0',
    reviews: 196,
    featured: false,
    desc: 'iPhone 13 128GB com tela Super Retina XDR, ótimo desempenho no dia a dia e excelente autonomia de bateria.',
    image: '/src/assets/ref/products/iphone13.webp',
    images: [
      '/src/assets/ref/products/iphone13.webp',
      '/src/assets/ref/products/gallery/iphone13-2.webp',
    ],
    stock: 10,
    sold: 345,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo Vitrine',
    specs: [
      { label: 'Chip', value: 'Apple A15 Bionic 5G' },
      { label: 'Tela', value: '6,1" OLED Super Retina XDR' },
      { label: 'Garantia', value: '6 meses Brasil Tech' },
    ],
  },
  {
    id: 22,
    name: 'iPhone 12 Pro 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 1390,
    old: 2190,
    rating: '5,0',
    reviews: 164,
    featured: false,
    desc: 'iPhone 12 Pro 128GB com acabamento em aço inoxidável, scanner LiDAR e câmera tripla 12MP.',
    image: '/src/assets/ref/products/iphone12pro.webp',
    images: [
      '/src/assets/ref/products/iphone12pro.webp',
      '/src/assets/ref/products/gallery/iphone12pro-2.webp',
    ],
    stock: 7,
    sold: 224,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo certificado',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Rede', value: '5G Desbloqueado' },
      { label: 'Acompanha', value: 'Aparelho + Cabo Lightning' },
    ],
  },
  {
    id: 23,
    name: 'iPhone 11 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 990,
    old: 1490,
    rating: '5,0',
    reviews: 234,
    featured: false,
    desc: 'iPhone 11 128GB desbloqueado para todas as operadoras, iCloud limpo e Face ID 100% testado em laboratório.',
    image: '/src/assets/ref/products/iphone11-live.webp',
    images: [
      '/src/assets/ref/products/iphone11-live.webp',
      '/src/assets/ref/products/iphone11-2.webp',
      '/src/assets/ref/products/iphone11-3.webp',
    ],
    stock: 13,
    sold: 670,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo certificado',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Câmera', value: 'Dupla 12MP (4K 60fps)' },
      { label: 'iCloud', value: '100% livre para sua conta' },
    ],
  },
  {
    id: 24,
    name: 'iPhone XR 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 790,
    old: 1190,
    rating: '5,0',
    reviews: 156,
    featured: false,
    desc: 'iPhone XR 128GB com Face ID e tela Liquid Retina de 6,1 polegadas. Revisado e pronto para uso.',
    image: '/src/assets/ref/products/iphonexr-live.jpg',
    images: [
      '/src/assets/ref/products/iphonexr-live.jpg',
      '/src/assets/ref/products/iphonexr-2.jpg',
      '/src/assets/ref/products/iphonexr-3.webp',
    ],
    stock: 9,
    sold: 320,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Tela', value: '6,1" Liquid Retina HD' },
      { label: 'Face ID', value: 'Ativo e verificado' },
    ],
  },
  {
    id: 25,
    name: 'iPhone 8 Plus 128GB',
    cat: 'Celular',
    emoji: '📱',
    price: 490,
    old: 790,
    rating: '5,0',
    reviews: 189,
    featured: false,
    desc: 'iPhone 8 Plus 128GB com Touch ID e câmera dupla com modo Retrato. Ótima opção econômica com garantia.',
    image: '/src/assets/ref/products/iphone8plus.webp',
    images: [
      '/src/assets/ref/products/iphone8plus.webp',
      '/src/assets/ref/products/gallery/iphone8plus-2.jpg',
    ],
    stock: 12,
    sold: 415,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Capacidade', value: '128 GB' },
      { label: 'Tela', value: '5,5" Retina HD' },
      { label: 'Biometria', value: 'Touch ID funcional' },
    ],
  },
  {
    id: 27,
    name: 'iPhone XR 64GB - Desbloqueado Anatel',
    cat: 'Celular',
    emoji: '📱',
    price: 649,
    old: 990,
    rating: '4,9',
    reviews: 214,
    featured: false,
    desc: 'Aparelho econômico ideal para o dia a dia: iPhone XR 64GB com Face ID funcionando, bateria revisada, iCloud limpo e garantia Brasil Tech.',
    image: '/src/assets/ref/products/iphonexr.webp',
    images: [
      '/src/assets/ref/products/iphonexr.webp',
      '/src/assets/ref/products/iphonexr-2.jpg',
    ],
    stock: 15,
    sold: 490,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Capacidade', value: '64 GB' },
      { label: 'Desbloqueio', value: 'Anatel / iCloud Limpo' },
      { label: 'Face ID', value: 'Testado 100%' },
    ],
  },
  {
    id: 28,
    name: 'iPhone 11 64GB - Seminovo Revisado',
    cat: 'Celular',
    emoji: '📱',
    price: 849,
    old: 1290,
    rating: '4,9',
    reviews: 276,
    featured: false,
    desc: 'iPhone 11 64GB com câmera dupla Ultra-Angular, gravação 4K e Face ID testado. Excelente preço de entrada na linha Apple.',
    image: '/src/assets/ref/products/iphone11.webp',
    images: [
      '/src/assets/ref/products/iphone11.webp',
      '/src/assets/ref/products/iphone11-2.webp',
    ],
    stock: 14,
    sold: 560,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo certificado',
    specs: [
      { label: 'Capacidade', value: '64 GB' },
      { label: 'Câmera', value: 'Dupla 12MP Modo Noite' },
      { label: 'Garantia', value: '6 meses Brasil Tech' },
    ],
  },
  {
    id: 29,
    name: 'PlayStation 3 Super Slim 250GB',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 349,
    old: 680,
    rating: '4,9',
    reviews: 248,
    featured: false,
    desc: 'PlayStation 3 Super Slim compacto de 250GB, revisado em bancada com controle sem fio, cabo HDMI e garantia.',
    image: '/src/assets/ref/products/ps3-super-slim.jpg',
    images: [
      '/src/assets/ref/products/ps3-super-slim.jpg',
      '/src/assets/ref/products/ps3-super-slim-2.jpg',
      '/src/assets/ref/products/ps3-super-slim-3.jpg',
    ],
    stock: 16,
    sold: 412,
    warranty: '6 meses com a Brasil Tech',
    condition: 'Seminovo revisado',
    specs: [
      { label: 'Armazenamento', value: '250 GB' },
      { label: 'Saída de vídeo', value: 'HDMI 1080p' },
      { label: 'Acompanha', value: 'Console + Controle + Cabos' },
    ],
  },
  {
    id: 30,
    name: 'Kit PlayStation 2 Slim + 2 Controles',
    cat: 'PlayStation',
    emoji: '🎮',
    price: 229,
    old: 490,
    rating: '5,0',
    reviews: 319,
    featured: false,
    desc: 'Kit PlayStation 2 Slim pronto para jogar em dupla com 2 controles DualShock 2, fonte bivolt e cabo AV.',
    image: '/src/assets/ref/products/ps2-slim-2.jpg',
    images: [
      '/src/assets/ref/products/ps2-slim-2.jpg',
      '/src/assets/ref/products/ps2-slim.jpg',
      '/src/assets/ref/products/ps2-slim-3.webp',
    ],
    stock: 20,
    sold: 825,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Revisado completo',
    specs: [
      { label: 'Modelo', value: 'PS2 Slim Bivolt' },
      { label: 'Controles', value: '2x DualShock 2 inclusos' },
      { label: 'Garantia', value: '90 dias Brasil Tech' },
    ],
  },

  // Acessórios
  {
    id: 26,
    name: 'Controle PS2 DualShock 2 Original',
    cat: 'Acessórios',
    emoji: '🕹️',
    price: 60,
    old: 95,
    rating: '4,9',
    reviews: 142,
    featured: false,
    desc: 'Controle DualShock 2 com resposta precisa, analógicos calibrados e cabo reforçado para PlayStation 2.',
    image: '/src/assets/ref/products/controle-ps2.webp',
    images: ['/src/assets/ref/products/controle-ps2.webp'],
    stock: 25,
    sold: 540,
    warranty: '90 dias com a Brasil Tech',
    condition: 'Novo / Testado',
    specs: [
      { label: 'Compatibilidade', value: 'PS2 Fat e PS2 Slim' },
      { label: 'Vibração', value: 'DualShock Dupla' },
      { label: 'Garantia', value: '90 dias Brasil Tech' },
    ],
  },
];

export const STORE_REVIEWS: StoreReview[] = [
  {
    id: 1,
    author: 'Lucas Henrique M.',
    city: 'São Paulo - SP',
    product: 'PlayStation 5 Mídia Digital',
    rating: 5,
    date: 'Há 2 dias',
    comment:
      'Chegou no mesmo dia pela entrega expressa! Console impecável, muito bem embalado, lacre de garantia e tudo funcionando perfeitamente.',
  },
  {
    id: 2,
    author: 'Mariana Costa',
    city: 'Belo Horizonte - MG',
    product: 'iPhone 16 Pro Max 256GB',
    rating: 5,
    date: 'Há 4 dias',
    comment:
      'Tive receio de comprar pela internet, mas o atendimento no WhatsApp me passou o número do pedido na hora. Chegou em 2 dias com tudo certinho.',
  },
  {
    id: 3,
    author: 'Rafael Oliveira',
    city: 'Curitiba - PR',
    product: 'Xbox Series X 1TB',
    rating: 5,
    date: 'Há 1 semana',
    comment:
      'Paguei no PIX com desconto e recebi o código de rastreio logo após a confirmação. Console silencioso, parece novo de loja.',
  },
  {
    id: 4,
    author: 'Camila Andrade',
    city: 'Rio de Janeiro - RJ',
    product: 'PC Gamer Completo Ganesha III',
    rating: 5,
    date: 'Há 1 semana',
    comment:
      'Comprei para o meu filho e veio tudo montado, só ligar na tomada. Experiência nível Mercado Livre e Amazon, muito seguro.',
  },
];

export const DEFAULT_QA: ProductQuestion[] = [
  {
    id: 1,
    question: 'O produto tem garantia e nota de compra?',
    answer:
      'Sim! Todos os produtos contam com garantia de 90 dias a 12 meses direto com a Brasil Tech e comprovante de pedido com Compra Garantida.',
    date: 'Respondida pela Brasil Tech',
  },
  {
    id: 2,
    question: 'Como funciona o pagamento via PIX?',
    answer:
      'Aceitamos pagamento via PIX com aprovação imediata, nota fiscal e total proteção da Compra Garantida Brasil Tech com reembolso em 7 dias.',
    date: 'Respondida pela Brasil Tech',
  },
  {
    id: 3,
    question: 'Qual o prazo de entrega e como acompanho o pedido?',
    answer:
      'Você pode escolher Entrega Expressa no mesmo dia (R$ 30,00) ou Padrão em até 2 dias úteis (R$ 15,00), com código de rastreamento em tempo real direto na aba Meus Pedidos.',
    date: 'Respondida pela Brasil Tech',
  },
];

export const COUPONS: Record<string, { type: 'percent' | 'fixed'; value: number; label: string }> = {
  NATAL50: { type: 'fixed', value: 50, label: 'R$ 50,00 OFF Especial Natal' },
  PRIMEIRACOMPRA: { type: 'fixed', value: 25, label: 'R$ 25,00 OFF Primeira Compra' },
};

export const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pixPrice = (price: number) => Number(price.toFixed(2));
