import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import type { ProductCard as Product } from '../api/types';
import { colors, spacing } from '../theme';
import { ProductCard } from './ProductCard';

type Props = {
  products: Product[];
  onEndReached?: () => void;
  loadingMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: React.ReactElement | null;
  empty?: React.ReactElement | null;
};

export function ProductGrid({ products, onEndReached, loadingMore, refreshing, onRefresh, header, empty }: Props) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item) => String(item.product_id)}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, !products.length && { flexGrow: 1 }]}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ProductCard product={item} />
        </View>
      )}
      ListHeaderComponent={header ?? undefined}
      ListEmptyComponent={empty ?? undefined}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} /> : undefined}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, backgroundColor: colors.background },
  row: { gap: spacing.md },
  cell: { flex: 1 / 2, marginBottom: spacing.md },
});
