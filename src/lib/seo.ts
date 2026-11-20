import { MarketplaceProduct, ProductQuestion, money } from '../data/marketplaceCatalog';
import { StoreSettings } from '../services/firestoreStore';

export interface SeoReviewItem {
  id: number;
  author: string;
  city: string;
  product: string;
  rating: number;
  date: string;
  comment: string;
}

const DEFAULT_LOGO_PATH = '/src/assets/images/brasil_tech_logo_1794944707057.jpg';

function resolveAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!origin) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function getBasePageUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string | null) {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  document.head.appendChild(el);
}

function setCanonicalLink(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setJsonLd(id: string, payload: Record<string, unknown> | null) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id);
  if (payload === null) {
    existing?.remove();
    return;
  }
  const json = JSON.stringify(payload);
  if (existing) {
    existing.textContent = json;
    return;
  }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = json;
  document.head.appendChild(script);
}

function inferBrandName(product: MarketplaceProduct, fallbackStoreName: string): string {
  const hay = `${product.name} ${product.cat}`.toLowerCase();
  if (hay.includes('playstation') || hay.includes('dualsense') || hay.includes('ps4') || hay.includes('ps5')) {
    return 'Sony';
  }
  if (hay.includes('xbox')) return 'Microsoft';
  if (hay.includes('nintendo') || hay.includes('switch')) return 'Nintendo';
  if (hay.includes('iphone') || hay.includes('apple') || hay.includes('airpods') || hay.includes('ipad')) {
    return 'Apple';
  }
  if (hay.includes('samsung') || hay.includes('galaxy')) return 'Samsung';
  if (hay.includes('motorola') || hay.includes('moto g')) return 'Motorola';
  if (hay.includes('xiaomi') || hay.includes('redmi') || hay.includes('poco')) return 'Xiaomi';
  if (hay.includes('jbl')) return 'JBL';
  if (hay.includes('logitech')) return 'Logitech';
  if (hay.includes('hyperx')) return 'HyperX';
  if (hay.includes('corsair')) return 'Corsair';
  if (hay.includes('razer')) return 'Razer';
  if (hay.includes('ryzen') || hay.includes('amd')) return 'AMD';
  if (hay.includes('rtx') || hay.includes('nvidia')) return 'NVIDIA';
  if (hay.includes('intel')) return 'Intel';
  return fallbackStoreName;
}

function inferSchemaCondition(condition: string): {
  schemaUrl: string;
  ogCondition: 'new' | 'refurbished' | 'used';
} {
  const norm = condition.toLowerCase();
  if (norm.includes('seminovo') || norm.includes('usado')) {
    return { schemaUrl: 'https://schema.org/UsedCondition', ogCondition: 'used' };
  }
  if (norm.includes('recondicionado') || norm.includes('revisado') || norm.includes('vitrine')) {
    return { schemaUrl: 'https://schema.org/RefurbishedCondition', ogCondition: 'refurbished' };
  }
  if (norm.includes('novo') || norm.includes('lacrado')) {
    return { schemaUrl: 'https://schema.org/NewCondition', ogCondition: 'new' };
  }
  return { schemaUrl: 'https://schema.org/UsedCondition', ogCondition: 'used' };
}

function clampLength(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

function getPriceValidUntilIso(): string {
  const dt = new Date();
  dt.setFullYear(dt.getFullYear() + 1);
  return dt.toISOString().split('T')[0];
}

export function applyStorefrontSeo(params: {
  storeSettings: StoreSettings;
  activeCat?: string;
  viewMode: 'home' | 'checkout' | 'orders' | 'admin' | 'security';
}) {
  const { storeSettings, activeCat, viewMode } = params;
  const baseUrl = getBasePageUrl();
  const logoUrl = resolveAbsoluteUrl(DEFAULT_LOGO_PATH);

  let title = `${storeSettings.storeName} – Consoles, iPhones e PC Gamer | Marketplace`;
  let description = `Compre PlayStation, Xbox, Nintendo, iPhones e PC Gamer na ${storeSettings.storeName} com garantia, reembolso 7 dias e entrega rápida.`;
  let canonicalUrl = baseUrl;

  if (viewMode === 'home' && activeCat && activeCat !== 'Todos') {
    title = `${activeCat} em Oferta | ${storeSettings.storeName} Marketplace`;
    description = `Confira ${activeCat} revisados e com garantia na ${storeSettings.storeName}. Pague no PIX com aprovação imediata.`;
  } else if (viewMode === 'checkout') {
    title = `Finalizar Compra Segura | ${storeSettings.storeName}`;
    description = `Checkout rápido da ${storeSettings.storeName}: pague no PIX com aprovação imediata e Compra Garantida.`;
    canonicalUrl = `${baseUrl}#/checkout`;
  } else if (viewMode === 'orders') {
    title = `Meus Pedidos e Rastreamento | ${storeSettings.storeName}`;
    description = `Acompanhe em tempo real no mapa o status e o código de rastreio dos seus pedidos na ${storeSettings.storeName}.`;
    canonicalUrl = `${baseUrl}#/pedidos`;
  } else if (viewMode === 'security') {
    title = `Garantia e Reembolso 7 Dias | ${storeSettings.storeName}`;
    description = `Política de reembolso integral em até 7 dias, garantia técnica e compra 100% segura na ${storeSettings.storeName}.`;
    canonicalUrl = `${baseUrl}#/garantia`;
  } else if (viewMode === 'admin') {
    title = `Painel Administrativo | ${storeSettings.storeName}`;
    description = `Gestão de produtos, estoque, pedidos, rastreio e financeiro da ${storeSettings.storeName}.`;
    canonicalUrl = `${baseUrl}#/admin`;
  }

  title = clampLength(title, 65);
  description = clampLength(description, 160);

  document.title = title;
  setCanonicalLink(canonicalUrl);
  setMetaTag('name', 'description', description);

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', storeSettings.storeName);
  setMetaTag('property', 'og:locale', 'pt_BR');
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', logoUrl);
  setMetaTag('property', 'og:image:alt', `${storeSettings.storeName} Marketplace`);

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', logoUrl);

  // Clear product-specific OpenGraph tags & PDP JSON-LD blocks
  setMetaTag('property', 'product:price:amount', null);
  setMetaTag('property', 'product:price:currency', null);
  setMetaTag('property', 'product:availability', null);
  setMetaTag('property', 'product:condition', null);
  setMetaTag('property', 'product:category', null);
  setMetaTag('property', 'product:retailer_item_id', null);
  setMetaTag('property', 'product:brand', null);

  setJsonLd('ld-product', null);
  setJsonLd('ld-breadcrumb', null);
  setJsonLd('ld-faq', null);

  // Store / Organization JSON-LD
  setJsonLd('ld-store', {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeSettings.storeName,
    url: baseUrl,
    logo: logoUrl,
    image: logoUrl,
    email: storeSettings.email,
    telephone: storeSettings.phone,
    taxID: storeSettings.cnpj,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: storeSettings.address,
      addressCountry: 'BR',
    },
  });
}

export function applyProductSeo(params: {
  product: MarketplaceProduct;
  storeSettings: StoreSettings;
  reviews: SeoReviewItem[];
  questions: ProductQuestion[];
}) {
  const { product, storeSettings, reviews, questions } = params;
  const baseUrl = getBasePageUrl();
  const productUrl = `${baseUrl}#/produto/${product.id}`;
  const sku = `BT-${String(product.id).padStart(4, '0')}`;
  const brandName = inferBrandName(product, storeSettings.storeName);
  const { schemaUrl: itemConditionUrl, ogCondition } = inferSchemaCondition(product.condition);
  const galleryRaw = product.images && product.images.length > 0 ? product.images : [product.image];
  const imageUrls = galleryRaw.filter(Boolean).map(resolveAbsoluteUrl);
  const primaryImage = imageUrls[0] || resolveAbsoluteUrl(DEFAULT_LOGO_PATH);

  const availabilityUrl =
    product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const ogAvailability = product.stock > 0 ? 'in stock' : 'out of stock';
  const ratingNumeric = Number(String(product.rating).replace(',', '.')) || 4.9;
  const reviewCount = Math.max(1, product.reviews + reviews.length);

  const title = clampLength(`${product.name} | ${storeSettings.storeName}`, 60);
  const description = clampLength(
    `Compre ${product.name} por ${money(product.price)} no PIX. ${product.warranty}. Reembolso em 7 dias e Compra Garantida na ${storeSettings.storeName}.`,
    160
  );

  document.title = title;
  setCanonicalLink(productUrl);
  setMetaTag('name', 'description', description);

  // OpenGraph Product & Google Shopping Social Meta Tags
  setMetaTag('property', 'og:type', 'product');
  setMetaTag('property', 'og:site_name', storeSettings.storeName);
  setMetaTag('property', 'og:locale', 'pt_BR');
  setMetaTag('property', 'og:url', productUrl);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', primaryImage);
  setMetaTag('property', 'og:image:alt', product.name);

  setMetaTag('property', 'product:price:amount', product.price.toFixed(2));
  setMetaTag('property', 'product:price:currency', 'BRL');
  setMetaTag('property', 'product:availability', ogAvailability);
  setMetaTag('property', 'product:condition', ogCondition);
  setMetaTag('property', 'product:category', product.cat);
  setMetaTag('property', 'product:retailer_item_id', sku);
  setMetaTag('property', 'product:brand', brandName);

  // Twitter / X Card
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', primaryImage);

  // 1. Google Shopping Product Schema.org JSON-LD
  setJsonLd('ld-product', {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.desc,
    sku,
    mpn: `BRASILTECH-${product.id}`,
    category: product.cat,
    url: productUrl,
    image: imageUrls.length > 0 ? imageUrls : [primaryImage],
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    itemCondition: itemConditionUrl,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Condição', value: product.condition },
      { '@type': 'PropertyValue', name: 'Garantia', value: product.warranty },
      ...product.specs.map((spec) => ({
        '@type': 'PropertyValue',
        name: spec.label,
        value: spec.value,
      })),
    ],
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      priceValidUntil: getPriceValidUntilIso(),
      availability: availabilityUrl,
      itemCondition: itemConditionUrl,
      seller: {
        '@type': 'Organization',
        name: storeSettings.storeName,
        taxID: storeSettings.cnpj,
        telephone: storeSettings.phone,
        email: storeSettings.email,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: [
        {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: storeSettings.expressShippingPrice.toFixed(2),
            currency: 'BRL',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'BR',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 0,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY',
            },
          },
        },
        {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: storeSettings.standardShippingPrice.toFixed(2),
            currency: 'BRL',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'BR',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 2,
              unitCode: 'DAY',
            },
          },
        },
      ],
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingNumeric,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 5).map((rev) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.author,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rev.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: rev.comment,
    })),
  });

  // 2. BreadcrumbList Schema.org JSON-LD
  setJsonLd('ld-breadcrumb', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.cat,
        item: `${baseUrl}#catalogo`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  });

  // 3. FAQPage Schema.org JSON-LD from product Q&A
  if (questions.length > 0) {
    setJsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.slice(0, 8).map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    });
  } else {
    setJsonLd('ld-faq', null);
  }
}
