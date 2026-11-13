import { request } from './client';
import type {
  Address,
  AddressInput,
  Cart,
  CategoryDetail,
  CategorySummary,
  CheckoutState,
  ConfirmResult,
  Country,
  Customer,
  HomeData,
  Information,
  InitData,
  Manufacturer,
  OrderDetail,
  OrderList,
  PaymentMethod,
  ProductCard,
  ProductDetail,
  ProductList,
  ReviewList,
  ShippingMethod,
  Zone,
} from './types';

export type ProductQuery = {
  category_id?: number;
  sub_category?: 0 | 1;
  manufacturer_id?: number;
  search?: string;
  tag?: string;
  description?: 0 | 1;
  filter?: string;
  special?: 0 | 1;
  sort?: string;
  page?: number;
  limit?: number;
};

export type CartOptionValue = string | string[];

export const api = {
  common: {
    init: () => request<InitData>('common.init'),
  },

  catalog: {
    home: () => request<HomeData>('catalog.home'),
    categories: (parent_id = 0) => request<{ categories: CategorySummary[] }>('catalog.categories', { query: { parent_id } }),
    category: (category_id: number) => request<CategoryDetail>('catalog.category', { query: { category_id } }),
    manufacturers: () => request<{ manufacturers: Manufacturer[] }>('catalog.manufacturers'),
    informations: () => request<{ informations: { information_id: number; title: string }[] }>('catalog.informations'),
    information: (information_id: number) => request<Information>('catalog.information', { query: { information_id } }),
  },

  product: {
    list: (query: ProductQuery) => request<ProductList>('product.index', { query }),
    info: (product_id: number) => request<{ product: ProductDetail }>('product.info', { query: { product_id } }),
    reviews: (product_id: number, page = 1) => request<ReviewList>('product.reviews', { query: { product_id, page } }),
    addReview: (product_id: number, body: { author: string; text: string; rating: number }) =>
      request<Record<string, never>>('product.review', { query: { product_id }, body }),
  },

  cart: {
    get: () => request<Cart>('cart.index'),
    add: (body: { product_id: number; quantity: number; option?: Record<string, CartOptionValue>; subscription_plan_id?: number }) =>
      request<Cart>('cart.add', { body }),
    edit: (key: number, quantity: number) => request<Cart>('cart.edit', { body: { key, quantity } }),
    remove: (key: number) => request<Cart>('cart.remove', { body: { key } }),
    clear: () => request<Cart>('cart.clear', { body: {} }),
    coupon: (coupon: string) => request<Cart>('cart.coupon', { body: { coupon } }),
  },

  account: {
    login: (email: string, password: string) => request<{ customer: Customer }>('account.login', { body: { email, password } }),
    logout: () => request<Record<string, never>>('account.logout', { body: {} }),
    register: (body: { firstname: string; lastname: string; email: string; telephone: string; password: string; newsletter: boolean; agree: boolean }) =>
      request<{ customer: Customer | null; approval: boolean }>('account.register', { body }),
    forgotten: (email: string) => request<Record<string, never>>('account.forgotten', { body: { email } }),
    profile: () => request<{ customer: Customer }>('account.profile'),
    edit: (body: { firstname: string; lastname: string; email: string; telephone: string }) => request<{ customer: Customer }>('account.edit', { body }),
    password: (body: { current: string; password: string; confirm: string }) => request<Record<string, never>>('account.password', { body }),
    newsletter: (newsletter: boolean) => request<{ newsletter: boolean }>('account.newsletter', { body: { newsletter: newsletter ? 1 : 0 } }),
  },

  address: {
    list: () => request<{ addresses: Address[] }>('address.index'),
    save: (body: AddressInput) => request<{ address: Address }>('address.save', { body }),
    remove: (address_id: number) => request<Record<string, never>>('address.delete', { body: { address_id } }),
  },

  wishlist: {
    get: () => request<{ products: ProductCard[]; product_ids: number[] }>('wishlist.index'),
    add: (product_id: number) => request<{ products: ProductCard[]; product_ids: number[] }>('wishlist.add', { body: { product_id } }),
    remove: (product_id: number) => request<{ products: ProductCard[]; product_ids: number[] }>('wishlist.remove', { body: { product_id } }),
  },

  order: {
    list: (page = 1) => request<OrderList>('order.index', { query: { page } }),
    info: (order_id: number) => request<{ order: OrderDetail }>('order.info', { query: { order_id } }),
    reorder: (order_id: number, order_product_id: number) => request<{ cart_count: number }>('order.reorder', { body: { order_id, order_product_id } }),
  },

  localisation: {
    countries: () => request<{ countries: Country[] }>('localisation.countries'),
    zones: (country_id: number) => request<{ zones: Zone[] }>('localisation.zones', { query: { country_id } }),
  },

  checkout: {
    state: () => request<CheckoutState>('checkout.index'),
    guest: (body: { firstname: string; lastname: string; email: string; telephone: string }) => request<CheckoutState>('checkout.guest', { body }),
    shippingAddress: (body: { address_id: number } | AddressInput) => request<CheckoutState>('checkout.shippingAddress', { body }),
    paymentAddress: (body: { address_id: number } | AddressInput) => request<CheckoutState>('checkout.paymentAddress', { body }),
    shippingMethods: () => request<{ shipping_methods: ShippingMethod[]; shipping_required: boolean; selected?: string }>('checkout.shippingMethods'),
    shippingMethod: (code: string) => request<CheckoutState>('checkout.shippingMethod', { body: { code } }),
    paymentMethods: () => request<{ payment_methods: PaymentMethod[]; selected: string }>('checkout.paymentMethods'),
    paymentMethod: (code: string) => request<CheckoutState>('checkout.paymentMethod', { body: { code } }),
    confirm: (body: { comment: string; agree: boolean }) => request<ConfirmResult>('checkout.confirm', { body }),
    complete: () => request<{ order_id: number; status: 'complete' | 'pending' | 'none' }>('checkout.complete', { body: {} }),
  },
};
