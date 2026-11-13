import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { ErrorState, Loading } from '../components/States';
import { Button, Card, Row } from '../components/ui';
import { cartKey } from '../hooks/useCart';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order.info(orderId) });

  const reorder = useMutation({
    mutationFn: (orderProductId: number) => api.order.reorder(orderId, orderProductId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKey });
      Alert.alert('Added to cart', 'The product has been added to your cart.', [
        { text: 'OK', style: 'cancel' },
        { text: 'View cart', onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }) },
      ]);
    },
    onError: (e) => Alert.alert('Sorry', errorMessage(e)),
  });

  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;

  const order = query.data.order;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <Row label="Date" value={order.date_added} />
        <Row label="Status" value={order.status} />
        {order.invoice ? <Row label="Invoice" value={order.invoice} /> : null}
        <Row label="Payment" value={order.payment_method} />
        {order.shipping_method ? <Row label="Shipping" value={order.shipping_method} /> : null}
      </Card>

      {order.shipping_address || order.payment_address ? (
        <Card>
          {order.shipping_address ? (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.heading}>Shipping address</Text>
              <Text style={styles.body}>{order.shipping_address}</Text>
            </View>
          ) : null}
          {order.payment_address ? (
            <View>
              <Text style={styles.heading}>Payment address</Text>
              <Text style={styles.body}>{order.payment_address}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.heading}>Items</Text>
        {order.products.map((p) => (
          <View key={p.order_product_id} style={styles.product}>
            <Image source={{ uri: p.thumb }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              {p.options.map((o) => (
                <Text key={o.name} style={styles.muted}>
                  {o.name}: {o.value}
                </Text>
              ))}
              <Text style={styles.muted}>
                {p.quantity} × {p.price}
              </Text>
              {p.reorder ? (
                <Button
                  small
                  variant="ghost"
                  icon="refresh"
                  title="Buy again"
                  onPress={() => reorder.mutate(p.order_product_id)}
                  style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
                />
              ) : null}
            </View>
            <Text style={styles.name}>{p.total}</Text>
          </View>
        ))}
        <View style={{ marginTop: spacing.sm }}>
          {order.totals.map((t, i) => (
            <Row key={t.title + i} label={t.title} value={t.text} bold={i === order.totals.length - 1} />
          ))}
        </View>
      </Card>

      {order.comment ? (
        <Card>
          <Text style={styles.heading}>Comment</Text>
          <Text style={styles.body}>{order.comment}</Text>
        </Card>
      ) : null}

      {order.histories.length ? (
        <Card>
          <Text style={styles.heading}>History</Text>
          {order.histories.map((h, i) => (
            <View key={i} style={styles.history}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{h.status}</Text>
                <Text style={styles.muted}>{h.date_added}</Text>
                {h.comment ? <Text style={[styles.body, { marginTop: 4 }]}>{h.comment.replace(/<br\s*\/?>/g, '')}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: font.medium, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  muted: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  name: { fontSize: font.body, fontWeight: '600', color: colors.text },
  product: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: '#fff' },
  history: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 },
});
