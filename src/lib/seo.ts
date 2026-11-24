import { MarketplaceProduct, ProductQuestion, StoreReview } from '../data/marketplaceCatalog';
import { StoreSettings } from '../services/firestoreStore';

function upsertMetaTag(
  attr: 'name' | 'property',
  key: string,
  content: string
): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setJsonLd(id: string, data: unknown): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.remove();
}

function resolveBrand(product: MarketplaceProduct): string {
  if (product.brand) return product.brand;
  const n = product.name.toLowerCase();
  if (n.includes('iphone') || n.includes('apple')) return 'Apple';
  if (n.includes('samsung') || n.includes('galaxy')) return 'Samsung';
  if (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')) return 'Xiaomi';
  if (n.includes('motorola') || n.includes('moto ')) return 'Motorola';
  if (n.includes('playstation') || n.includes('ps2') || n.includes('ps3') || n.includes('ps4') || n.includes('ps5') || n.includes('dualsense') || n.includes('dualshock')) {
    return 'Sony PlayStation';
  }
  if (n.includes('xbox')) return 'Microsoft Xbox';
  if (n.includes('nintendo') || n.includes('wii')) return 'Nintendo';
  return 'Brasil Tech';
}

function toAbsoluteUrl(urlOrPath: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
  }
  return urlOrPath;
}

export function applyStorefrontSeo(storeSettings: StoreSettings, pageSubtitle?: string): void {
  if (typeof document === 'undefined') return;
  const title = pageSubtitle
    ? `${pageSubtitle} | ${storeSettings.storeName}`
    : `${storeSettings.storeName} | iPhones, Smartphones Android, PlayStation e Xbox`;
  const description = `${storeSettings.storeName} (CNPJ ${storeSettings.cnpj}): iPhones selecionados, Smartphones Android, PlayStation, Xbox, jogos e acessórios com garantia real, nota fiscal e devolução em 7 dias.`;

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  setJsonLd('bt-store-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: storeSettings.storeName,
    url: origin || undefined,
    telephone: storeSettings.phone,
    email: storeSettings.email,
    taxID: storeSettings.cnpj,
    address: {
      '@type': 'PostalAddress',
      streetAddress: storeSettings.address,
      addressCountry: 'BR',
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    },
  });
  removeJsonLd('bt-product-jsonld');
  removeJsonLd('bt-faq-jsonld');
}

export function applyProductSeo({
  product,
  storeSettings,
  reviews,
  questions,
}: {
  product: MarketplaceProduct;
  storeSettings: StoreSettings;
  reviews: StoreReview[];
  questions: ProductQuestion[];
}): void {
  if (typeof document === 'undefined') return;
  const numericRating = Number(product.rating.replace(',', '.')) || 4.9;
  const totalReviews = Math.max(product.reviews || 0, reviews.length, 1);
  const priceText = product.price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const title = `${product.name} por ${priceText} | ${storeSettings.storeName}`;
  const description = `${product.name} (${product.condition}) com garantia ${product.warranty} na ${storeSettings.storeName}. ${product.desc}`.slice(
    0,
    158
  );

  const imageList = (product.images && product.images.length > 0 ? product.images : [product.image])
    .filter(Boolean)
    .map(toAbsoluteUrl);

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:type', 'product');
  if (imageList[0]) {
    upsertMetaTag('property', 'og:image', imageList[0]);
    upsertMetaTag('name', 'twitter:image', imageList[0]);
  }
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);

  const isBrandNew = /lacrado|novo/i.test(product.condition) && !/seminovo/i.test(product.condition);
  const conditionSchema = isBrandNew
    ? 'https://schema.org/NewCondition'
    : 'https://schema.org/RefurbishedCondition';

  const reviewSamples = reviews.slice(0, 6).map((rev) => ({
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
  }));

  setJsonLd('bt-product-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: `BT-${product.id}`,
    name: product.name,
    image: imageList,
    description: product.desc,
    category: product.cat,
    brand: {
      '@type': 'Brand',
      name: resolveBrand(product),
    },
    itemCondition: conditionSchema,
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      priceCurrency: 'BRL',
      price: Number(product.price.toFixed(2)),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: conditionSchema,
      seller: {
        '@type': 'Organization',
        name: storeSettings.storeName,
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(numericRating.toFixed(1)),
      reviewCount: totalReviews,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviewSamples,
  });

  if (questions.length > 0) {
    setJsonLd('bt-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.slice(0, 6).map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    });
  }
}
