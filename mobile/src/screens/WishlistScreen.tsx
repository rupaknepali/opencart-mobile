import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductGrid } from '../components/ProductGrid';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useWishlist } from '../hooks/useWishlist';
import type { RootStackParamList } from '../navigation/types';
import { errorMessage } from '../utils/errors';

export default function WishlistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const wishlist = useWishlist();

  if (wishlist.isLoading) return <Loading />;
  if (wishlist.error || !wishlist.data) return <ErrorState message={errorMessage(wishlist.error)} onRetry={wishlist.refetch} />;

  return (
    <ProductGrid
      products={wishlist.data.products}
      refreshing={wishlist.isRefetching}
      onRefresh={wishlist.refetch}
      empty={
        <EmptyState
          icon="heart-outline"
          title="Your wishlist is empty"
          message="Tap the heart on any product to save it here."
          action="Browse products"
          onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
      }
    />
  );
}
