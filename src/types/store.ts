export type CategoryId = 'todos' | 'playstation' | 'xbox' | 'celular' | 'acessorios';

export type ActiveView =
  | 'home'
  | 'pdp'
  | 'checkout'
  | 'tracking'
  | 'about'
  | 'faq'
  | 'policies';

export interface ProductVariant {
  id: string;
  label: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  name: string;
  category: Exclude<CategoryId, 'todos'>;
  categoryLabel: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  sold: number;
  stock: number;
  freeShipping: boolean;
  installments: number;
  warrantyMonths: number;
  description: string;
  conditionNote: string;
  specs: string[];
  includedItems: string[];
  variants: ProductVariant[];
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

export type ShippingOptionId = 'same-day' | 'two-days';

export interface ShippingOption {
  id: ShippingOptionId;
  label: string;
  eta: string;
  price: number;
}

export interface OrderCustomer {
  name: string;
  cpf: string;
  email: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
}

export interface OrderStep {
  title: string;
  detail: string;
  timestamp: string;
  completed: boolean;
}

export interface Order {
  orderNumber: string;
  trackingCode: string;
  createdAt: string;
  customer: OrderCustomer;
  items: {
    productId: string;
    name: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  installmentsCount?: number;
  statusLabel: string;
  estimatedDelivery: string;
  steps: OrderStep[];
}

export interface CustomerReview {
  id: string;
  name: string;
  city: string;
  date: string;
  rating: number;
  product: string;
  text: string;
  initials: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
