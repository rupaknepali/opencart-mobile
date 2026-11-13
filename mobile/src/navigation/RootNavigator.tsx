import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../components/ui';
import { useCartCount } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CartScreen from '../screens/CartScreen';
import WishlistScreen from '../screens/WishlistScreen';
import AccountScreen from '../screens/AccountScreen';
import ProductScreen from '../screens/ProductScreen';
import ProductListScreen from '../screens/ProductListScreen';
import SearchScreen from '../screens/SearchScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentScreen from '../screens/PaymentScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import AddressesScreen from '../screens/AddressesScreen';
import AddressEditScreen from '../screens/AddressEditScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import InformationScreen from '../screens/InformationScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabIcons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Categories: ['grid', 'grid-outline'],
  Cart: ['cart', 'cart-outline'],
  Wishlist: ['heart', 'heart-outline'],
  Account: ['person', 'person-outline'],
};

function Tabs() {
  const cartCount = useCartCount();
  const wishlist = useWishlist();
  const wishCount = wishlist.data?.product_ids.length ?? 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.tertiaryIsDark ? colors.onTertiary : colors.primary,
        tabBarInactiveTintColor: colors.tertiaryIsDark ? 'rgba(255,255,255,0.6)' : colors.textMuted,
        tabBarStyle: { backgroundColor: colors.tertiary },
        headerStyle: { backgroundColor: colors.tertiary },
        headerTintColor: colors.onTertiary,
        headerTitleStyle: { fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = tabIcons[route.name];
          const count = route.name === 'Cart' ? cartCount : route.name === 'Wishlist' ? wishCount : 0;
          return (
            <View>
              <Ionicons name={focused ? on : off} size={size} color={color} />
              <Badge count={count} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: 'Back',
        headerTintColor: colors.onTertiary,
        headerStyle: { backgroundColor: colors.tertiary },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Product" component={ProductScreen} options={({ route }) => ({ title: route.params.name ?? 'Product' })} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={({ route }) => ({ title: route.params.title })} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Write a review', presentation: 'modal' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in', presentation: 'modal' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account', presentation: 'modal' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot password' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment', gestureEnabled: false }} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ title: 'Order placed', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={({ route }) => ({ title: `Order #${route.params.orderId}` })} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Address book' }} />
      <Stack.Screen
        name="AddressEdit"
        component={AddressEditScreen}
        options={({ route }) => ({ title: route.params?.address ? 'Edit address' : 'New address' })}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'My details' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
      <Stack.Screen name="Information" component={InformationScreen} options={({ route }) => ({ title: route.params.title })} />
    </Stack.Navigator>
  );
}
