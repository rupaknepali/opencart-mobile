import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Card } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

export default function OrdersScreen({ navigation }: Props) {
  const list = useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: ({ pageParam }) => api.order.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />;

  const orders = list.data?.pages.flatMap((p) => p.orders) ?? [];

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => String(o.order_id)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      refreshing={list.isRefetching}
      onRefresh={list.refetch}
      onEndReached={() => list.hasNextPage && list.fetchNextPage()}
      ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : undefined}
      ListEmptyComponent={<EmptyState icon="receipt-outline" title="No orders yet" message="Orders you place will appear here." />}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('OrderDetail', { orderId: item.order_id })}>
          <Card style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.id}>Order #{item.order_id}</Text>
              <Text style={styles.muted}>
                {item.date_added} · {item.products} item{item.products === 1 ? '' : 's'}
              </Text>
              <View style={styles.status}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.total}>{item.total}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  id: { fontSize: font.medium, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  status: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  statusText: { color: colors.primaryDark, fontSize: font.small, fontWeight: '600' },
  total: { fontSize: font.medium, fontWeight: '700', color: colors.text },
});
