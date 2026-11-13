import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, type ProductQuery } from '../api/endpoints';
import { config } from '../config';
import { colors, font, spacing } from '../theme';
import { errorMessage } from '../utils/errors';
import { ProductGrid } from './ProductGrid';
import { EmptyState, ErrorState, Loading } from './States';
import { Button, Chip, RadioRow } from './ui';

const SORT_LABELS: Record<string, string> = {
  default: 'Recommended',
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
  name_asc: 'Name: A–Z',
  name_desc: 'Name: Z–A',
};

/** Infinite product list with sort and (for categories) filter controls. */
export function ProductResults({ query, enabled = true }: { query: ProductQuery; enabled?: boolean }) {
  const [sort, setSort] = useState(query.sort ?? 'default');
  const [filters, setFilters] = useState<number[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const category = useQuery({
    queryKey: ['category', query.category_id],
    queryFn: () => api.catalog.category(query.category_id!),
    enabled: !!query.category_id,
  });
  const filterGroups = category.data?.filter_groups ?? [];

  const fullQuery: ProductQuery = { ...query, sort, filter: filters.join(',') || undefined, limit: config.pageSize };

  const list = useInfiniteQuery({
    queryKey: ['products', fullQuery],
    queryFn: ({ pageParam }) => api.product.list({ ...fullQuery, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled,
    placeholderData: keepPreviousData,
  });

  if (!enabled) return null;
  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />;

  const products = list.data?.pages.flatMap((p) => p.products) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;

  const toolbar = (
    <View style={styles.toolbar}>
      <Text style={styles.count}>{total} products</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {filterGroups.length ? (
          <Button
            small
            variant="outline"
            icon="options-outline"
            title={filters.length ? `Filter (${filters.length})` : 'Filter'}
            onPress={() => setFilterOpen(true)}
          />
        ) : null}
        <Button small variant="outline" icon="swap-vertical" title="Sort" onPress={() => setSortOpen(true)} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ProductGrid
        products={products}
        header={toolbar}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        loadingMore={list.isFetchingNextPage}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={list.refetch}
        empty={<EmptyState icon="search-outline" title="No products found" message="Try a different search or filter." />}
      />

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Sort by</Text>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <RadioRow
                key={key}
                title={label}
                selected={sort === key}
                onPress={() => {
                  setSort(key);
                  setSortOpen(false);
                }}
              />
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <View style={styles.filterHeader}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <Pressable onPress={() => setFilterOpen(false)} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            {filterGroups.map((group) => (
              <View key={group.filter_group_id} style={{ marginBottom: spacing.lg }}>
                <Text style={styles.groupTitle}>{group.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {group.filters.map((f) => (
                    <Chip
                      key={f.filter_id}
                      label={f.name}
                      selected={filters.includes(f.filter_id)}
                      onPress={() => setFilters((cur) => (cur.includes(f.filter_id) ? cur.filter((x) => x !== f.filter_id) : [...cur, f.filter_id]))}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.filterFooter}>
            <Button variant="outline" title="Clear" onPress={() => setFilters([])} style={{ flex: 1 }} />
            <Button title="Show results" onPress={() => setFilterOpen(false)} style={{ flex: 2 }} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  count: { color: colors.textMuted, fontSize: font.body },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xxl, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: font.large, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: 0 },
  groupTitle: { fontSize: font.medium, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  filterFooter: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
