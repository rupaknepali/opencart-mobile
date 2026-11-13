// Shapes returned by the OpenCart "Mobile App API" extension (opencart-extension/mobile_api).

export type FieldErrors = Record<string, string>;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errors?: FieldErrors;
}

export interface Store {
  name: string;
  logo: string;
  url: string;
  email: string;
  telephone: string;
  address: string;
  open: string;
}

export interface InfoRef {
  information_id: number;
  title: string;
}

export interface Settings {
  language: string;
  currency: string;
  customer_price: boolean;
  guest_checkout: boolean;
  checkout_payment_address: boolean;
  review_status: boolean;
  review_guest: boolean;
  telephone_required: boolean;
  password_length: number;
  stock_checkout: boolean;
  account_terms: InfoRef | null;
  checkout_terms: InfoRef | null;
  country_id: number;
  zone_id: number;
}

export interface Currency {
  code: string;
  title: string;
  symbol_left: string;
  symbol_right: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Customer {
  customer_id: number;
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
  newsletter?: boolean;
  balance?: string;
  reward?: number;
}

/** Hex colours from the extension settings; '' means "use the app default". */
export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  text?: string;
  button?: string;
  button_text?: string;
}

export interface InitData {
  session_token: string;
  theme?: ThemeColors;
  store: Store;
  settings: Settings;
  currencies: Currency[];
  languages: Language[];
  customer: Customer | null;
  cart_count: number;
}

export interface ProductCard {
  product_id: number;
  name: string;
  model: string;
  thumb: string;
  price: string;
  special: string;
  price_value: number | null;
  discount_pct: number;
  rating: number;
  reviews: number;
  minimum: number;
  in_stock: boolean;
}

export interface OptionValue {
  product_option_value_id: number;
  option_value_id: number;
  name: string;
  image: string;
  price: string;
  price_prefix: string;
}

export type OptionType = 'select' | 'radio' | 'checkbox' | 'text' | 'textarea' | 'file' | 'date' | 'time' | 'datetime';

export interface ProductOption {
  product_option_id: number;
  option_id: number;
  name: string;
  type: OptionType;
  value: string;
  required: boolean;
  validation: string;
  values: OptionValue[];
}

export interface ProductDetail extends ProductCard {
  description: string;
  manufacturer: string;
  manufacturer_id: number;
  stock: string;
  quantity: number;
  reward: number;
  points: number;
  tax: string;
  images: string[];
  discounts: { quantity: number; price: string }[];
  options: ProductOption[];
  subscriptions: { subscription_plan_id: number; name: string }[];
  attribute_groups: { name: string; attributes: { name: string; text: string }[] }[];
  related: ProductCard[];
  in_wishlist: boolean;
  review_status: boolean;
  can_review: boolean;
  share_url: string;
}

export interface ProductList {
  products: ProductCard[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  sorts: string[];
}

export interface Review {
  review_id: number;
  author: string;
  rating: number;
  text: string;
  date_added: string;
}

export interface ReviewList {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
}

export interface CategorySummary {
  category_id: number;
  name: string;
  image: string;
  total?: number | null;
  children?: CategorySummary[];
}

export interface CategoryDetail {
  category: { category_id: number; name: string; description: string; image: string };
  children: CategorySummary[];
  filter_groups: { filter_group_id: number; name: string; filters: { filter_id: number; name: string }[] }[];
}

export interface Banner {
  title: string;
  link: string;
  image: string;
}

export interface HomeData {
  banners: Banner[];
  categories: CategorySummary[];
  featured: ProductCard[];
  latest: ProductCard[];
  specials: ProductCard[];
  bestsellers: ProductCard[];
}

export interface Manufacturer {
  manufacturer_id: number;
  name: string;
  image: string;
}

export interface Information {
  information_id: number;
  title: string;
  description: string;
}

export interface CartItem {
  key: number;
  product_id: number;
  name: string;
  model: string;
  thumb: string;
  options: { name: string; value: string }[];
  subscription: string;
  quantity: number;
  minimum: number;
  in_stock: boolean;
  minimum_ok: boolean;
  reward: number;
  price: string;
  total: string;
}

export interface Total {
  code: string;
  title: string;
  value: number;
  text: string;
}

export interface Cart {
  products: CartItem[];
  totals: Total[];
  count: number;
  coupon: string;
  has_shipping: boolean;
  can_checkout: boolean;
  warnings: string[];
  weight: string;
}

export interface Address {
  address_id: number;
  firstname: string;
  lastname: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  country_id: number;
  country: string;
  zone_id: number;
  zone: string;
  default: boolean;
}

export type AddressInput = Omit<Address, 'address_id' | 'country' | 'zone' | 'default'> & {
  address_id?: number;
  default?: boolean;
  save?: boolean;
};

export interface Country {
  country_id: number;
  name: string;
  iso_code_2: string;
  postcode_required: boolean;
}

export interface Zone {
  zone_id: number;
  name: string;
  code: string;
}

export interface OrderSummary {
  order_id: number;
  name: string;
  status: string;
  date_added: string;
  products: number;
  total: string;
}

export interface OrderList {
  orders: OrderSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface OrderDetail {
  order_id: number;
  invoice: string;
  date_added: string;
  status: string;
  payment_method: string;
  shipping_method: string;
  payment_address: string;
  shipping_address: string;
  comment: string;
  products: {
    order_product_id: number;
    product_id: number;
    name: string;
    model: string;
    thumb: string;
    options: { name: string; value: string }[];
    quantity: number;
    price: string;
    total: string;
    reorder: boolean;
  }[];
  totals: { title: string; text: string }[];
  histories: { date_added: string; status: string; comment: string }[];
}

export interface ShippingQuote {
  code: string;
  name: string;
  cost: number;
  text: string;
}

export interface ShippingMethod {
  code: string;
  name: string;
  error: string;
  quotes: ShippingQuote[];
}

export interface PaymentMethod {
  code: string;
  name: string;
  native: boolean;
  options: { code: string; name: string }[];
}

export interface CheckoutState {
  logged: boolean;
  guest_allowed: boolean;
  customer: { firstname: string; lastname: string; email: string; telephone: string } | null;
  addresses: Address[];
  shipping_required: boolean;
  payment_address_required: boolean;
  shipping_address: Address | null;
  payment_address: Address | null;
  shipping_method: { code: string; name: string; text: string } | null;
  payment_method: { code: string; name: string } | null;
  comment: string;
  terms: InfoRef | null;
  totals: Total[];
  cart_count: number;
}

export interface ConfirmResult {
  order_id: number;
  status: 'complete' | 'payment_required';
  payment_url?: string;
  success_url?: string;
  failure_url?: string;
}
