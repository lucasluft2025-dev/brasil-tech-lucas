// Deduplicated Meta Pixel integration (client-side, optional ID from Admin or VITE_META_PIXEL_ID)

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
  }
}

let activePixelId = '';
const recentEvents = new Map<string, number>();

function isValidPixelId(raw?: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 20 ? digits : '';
}

export function initMetaPixel(configuredId?: string): string {
  if (typeof window === 'undefined') return '';
  const candidate =
    isValidPixelId(configuredId) ||
    isValidPixelId(import.meta.env.VITE_META_PIXEL_ID as string | undefined);
  if (!candidate) return '';
  if (activePixelId === candidate && window.fbq) return candidate;

  if (!window.fbq) {
    const fbqFn = function (...args: unknown[]) {
      if (fbqFn.callMethod) {
        fbqFn.callMethod(...args);
      } else {
        fbqFn.queue?.push(args);
      }
    } as NonNullable<Window['fbq']>;
    fbqFn.push = fbqFn;
    fbqFn.loaded = true;
    fbqFn.version = '2.0';
    fbqFn.queue = [];
    window.fbq = fbqFn;
    if (!window._fbq) window._fbq = fbqFn;

    const existingScript = document.querySelector('script[data-bt-meta-pixel="true"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.setAttribute('data-bt-meta-pixel', 'true');
      document.head.appendChild(script);
    }
  }

  if (activePixelId !== candidate) {
    activePixelId = candidate;
    try {
      window.fbq('init', candidate);
      window.fbq('track', 'PageView');
    } catch {
      // ignore adblocker/script errors
    }
  }
  return candidate;
}

function dispatchDeduplicated(
  eventName: string,
  dedupeKey: string,
  payload: Record<string, unknown>,
  ttlMs = 3000
): void {
  if (typeof window === 'undefined' || !activePixelId || !window.fbq) return;
  const now = Date.now();
  const key = `${eventName}:${dedupeKey}`;
  const prev = recentEvents.get(key) || 0;
  if (now - prev < ttlMs) return;
  recentEvents.set(key, now);

  try {
    window.fbq('track', eventName, payload);
  } catch {
    // ignore tracker blocking
  }
}

export function trackMetaViewContent(product: {
  id: number;
  name: string;
  cat: string;
  price: number;
}): void {
  dispatchDeduplicated(
    'ViewContent',
    `product-${product.id}`,
    {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_category: product.cat,
      content_type: 'product',
      value: Number(product.price.toFixed(2)),
      currency: 'BRL',
    },
    4000
  );
}

export function trackMetaAddToCart(product: {
  id: number;
  name: string;
  cat: string;
  price: number;
  qty: number;
}): void {
  dispatchDeduplicated(
    'AddToCart',
    `cart-${product.id}-${product.qty}`,
    {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_category: product.cat,
      content_type: 'product',
      value: Number((product.price * product.qty).toFixed(2)),
      currency: 'BRL',
      num_items: product.qty,
    },
    1200
  );
}

export function trackMetaInitiateCheckout(items: Array<{ id: number; qty: number }>, total: number): void {
  const ids = items.map((i) => String(i.id)).join(',');
  dispatchDeduplicated(
    'InitiateCheckout',
    `checkout-${ids}-${total.toFixed(2)}`,
    {
      content_ids: items.map((i) => String(i.id)),
      content_type: 'product',
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: Number(total.toFixed(2)),
      currency: 'BRL',
    },
    5000
  );
}

export function trackMetaPurchase(
  orderCode: string,
  items: Array<{ id: number; qty: number }>,
  total: number
): void {
  dispatchDeduplicated(
    'Purchase',
    `purchase-${orderCode}`,
    {
      content_ids: items.map((i) => String(i.id)),
      content_type: 'product',
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: Number(total.toFixed(2)),
      currency: 'BRL',
      order_id: orderCode,
    },
    60000
  );
}
