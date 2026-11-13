import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ProductQuery } from '../api/endpoints';
import type { Address } from '../api/types';

export type TabParamList = {
  Home: undefined;
  Categories: undefined;
  Cart: undefined;
  Wishlist: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Product: { productId: number; name?: string };
  ProductList: { title: string; query: ProductQuery };
  Search: undefined;
  Reviews: { productId: number; name: string; canReview: boolean };
  WriteReview: { productId: number; name: string };
  Login: { redirect?: 'Checkout' } | undefined;
  Register: { redirect?: 'Checkout' } | undefined;
  ForgotPassword: undefined;
  Checkout: undefined;
  Payment: { url: string; orderId: number };
  OrderSuccess: { orderId: number };
  Orders: undefined;
  OrderDetail: { orderId: number };
  Addresses: undefined;
  AddressEdit: { address?: Address } | undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Information: { informationId: number; title: string };
};
