import React, { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartItem } from '../api/types';
import { QuantityStepper } from '../components/QuantityStepper';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Button, Card, Row } from '../components/ui';
import { useStore } from '../context/StoreContext';
import { useApplyCoupon, useCart, useRemoveCartItem, useUpdateCartItem } from '../hooks/useCart';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage, showError } from '../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { isLoggedIn, init } = useStore();
  const cart = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const coupon = useApplyCoupon();
  // null = not edited: show the coupon currently applied to the cart
  const [draft, setDraft] = useState<string | null>(null);
  const code = draft ?? cart.data?.coupon ?? '';

  if (cart.isLoading) return <Loading />;
  if (cart.error || !cart.data) return <ErrorState message={errorMessage(cart.error)} onRetry={cart.refetch} />;

  const data = cart.data;

  if (!data.products.length) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Your cart is empty"
        message="Browse the store and add something you like."
        action="Start shopping"
        onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
      />
    );
  }

  const confirmRemove = (item: CartItem) =>
    Alert.alert('Remove item', `Remove ${item.name} from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(item.key, { onError: (e) => showError(e) }) },
    ]);

  const goCheckout = () => {
    if (!isLoggedIn && !init?.settings.guest_checkout) {
      navigation.navigate('Login', { redirect: 'Checkout' });
    } else {
      navigation.navigate('Checkout');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data.products}
        keyExtractor={(item) => String(item.key)}
        refreshing={cart.isRefetching}
        onRefresh={cart.refetch}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          data.warnings.length ? (
            <View style={styles.warning}>
              {data.warnings.map((w) => (
                <Text key={w} style={styles.warningText}>
                  {w}
                </Text>
              ))}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <Pressable onPress={() => navigation.navigate('Product', { productId: item.product_id, name: item.name })}>
              <Image source={{ uri: item.thumb }} style={styles.thumb} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                  {!item.in_stock ? <Text style={{ color: colors.accent }}> ***</Text> : null}
                </Text>
                <Pressable onPress={() => confirmRemove(item)} hitSlop={10} accessibilityLabel="Remove">
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              {item.options.map((o) => (
                <Text key={o.name} style={styles.option}>
                  {o.name}: {o.value}
                </Text>
              ))}
              {item.subscription ? <Text style={styles.option}>{item.subscription}</Text> : null}
              {!item.minimum_ok ? <Text style={[styles.option, { color: colors.accent }]}>Minimum quantity: {item.minimum}</Text> : null}
              <View style={styles.itemFooter}>
                <QuantityStepper
                  compact
                  value={item.quantity}
                  min={1}
                  onChange={(q) => update.mutate({ key: item.key, quantity: q }, { onError: (e) => showError(e) })}
                />
                <Text style={styles.total}>{item.total}</Text>
              </View>
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View>
            <Card>
              <Text style={styles.label}>Coupon code</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  value={code}
                  onChangeText={setDraft}
                  placeholder="Enter coupon"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={styles.coupon}
                />
                <Button
                  small
                  title={data.coupon ? 'Remove' : 'Apply'}
                  variant={data.coupon ? 'outline' : 'secondary'}
                  loading={coupon.isPending}
                  onPress={() => coupon.mutate(data.coupon ? '' : code.trim(), { onSuccess: () => setDraft(null), onError: (e) => showError(e) })}
                  style={{ minHeight: 44 }}
                />
              </View>
            </Card>
            <Card>
              {data.totals.map((t, i) => (
                <Row key={t.code + i} label={t.title} value={t.text} bold={i === data.totals.length - 1} />
              ))}
              {data.weight ? <Text style={styles.option}>Weight: {data.weight}</Text> : null}
            </Card>
          </View>
        }
      />
      <View style={styles.bar}>
        <Button title="Checkout" icon="lock-closed-outline" onPress={goCheckout} disabled={!data.can_checkout} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', padding: spacing.md },
  thumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: '#fff' },
  name: { flex: 1, fontSize: font.body, fontWeight: '600', color: colors.text, marginRight: spacing.sm },
  option: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  total: { fontSize: font.medium, fontWeight: '700', color: colors.text },
  label: { fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  coupon: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: font.medium,
    color: colors.text,
    minHeight: 44,
  },
  warning: { backgroundColor: '#fff4e5', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  warningText: { color: colors.warning, fontSize: font.body },
  bar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
