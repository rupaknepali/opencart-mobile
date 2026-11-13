import React, { useLayoutEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { HtmlView } from '../components/HtmlView';
import { Price, Rating } from '../components/Price';
import { ProductCard } from '../components/ProductCard';
import { defaultOptionSelection, OptionSelection, ProductOptions } from '../components/ProductOptions';
import { QuantityStepper } from '../components/QuantityStepper';
import { ErrorState, Loading } from '../components/States';
import { Button, Card, Chip, SectionHeader } from '../components/ui';
import { config } from '../config';
import { useAddToCart } from '../hooks/useCart';
import { useToggleWishlist } from '../hooks/useWishlist';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Product'>;

const { width } = Dimensions.get('window');

export default function ProductScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const query = useQuery({ queryKey: ['product', productId], queryFn: () => api.product.info(productId) });
  const product = query.data?.product;

  const addToCart = useAddToCart();
  const wishlist = useToggleWishlist();

  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<OptionSelection>({});
  const [subscription, setSubscription] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);

  // Reset the selections when a (different) product has loaded. Adjusting state during render
  // avoids the extra render and flicker of doing it in an effect.
  const [initialisedFor, setInitialisedFor] = useState<number | null>(null);
  if (product && initialisedFor !== product.product_id) {
    setInitialisedFor(product.product_id);
    setQuantity(product.minimum);
    setOptions(defaultOptionSelection(product.options));
    setSubscription(product.subscriptions[0]?.subscription_plan_id ?? 0);
  }

  const liked = wishlist.isInWishlist(productId);
  const toggleWishlist = wishlist.toggle;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 18 }}>
          {product ? (
            <Pressable
              onPress={() => Share.share({ message: `${product.name} ${product.share_url}`, url: product.share_url })}
              hitSlop={10}
              accessibilityLabel="Share"
            >
              <Ionicons name="share-outline" size={22} color={colors.onTertiary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => toggleWishlist(productId)} hitSlop={10} accessibilityLabel="Wishlist">
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.secondary : colors.onTertiary} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, product, liked, productId, toggleWishlist]);

  if (query.isLoading) return <Loading />;
  if (query.error || !product) return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;

  const onAdd = async () => {
    setErrors({});
    try {
      await addToCart.mutateAsync({
        product_id: product.product_id,
        quantity,
        option: options,
        subscription_plan_id: subscription || undefined,
      });
      Alert.alert('Added to cart', `${product.name} has been added to your cart.`, [
        { text: 'Keep shopping', style: 'cancel' },
        { text: 'View cart', onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }) },
      ]);
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      Alert.alert('Could not add to cart', errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Gallery */}
        <View style={{ backgroundColor: '#fff' }}>
          <FlatList
            horizontal
            pagingEnabled
            data={product.images}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Image source={{ uri: item }} style={{ width, height: width * 0.9 }} resizeMode="contain" />}
          />
          {product.images.length > 1 ? (
            <View style={styles.dots}>
              {product.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          {product.manufacturer ? <Text style={styles.brand}>{product.manufacturer}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>
          <Pressable
            style={styles.ratingRow}
            onPress={() => navigation.navigate('Reviews', { productId, name: product.name, canReview: product.can_review })}
            disabled={!product.review_status}
          >
            <Rating value={product.rating} size={14} />
            {product.review_status ? <Text style={styles.link}>{product.reviews} reviews</Text> : null}
          </Pressable>

          <View style={{ marginTop: spacing.md }}>
            <Price price={product.price} special={product.special} size="large" />
            {product.tax ? <Text style={styles.muted}>Ex Tax: {product.tax}</Text> : null}
            {product.points ? <Text style={styles.muted}>Price in reward points: {product.points}</Text> : null}
          </View>

          {product.discounts.length ? (
            <View style={styles.discounts}>
              {product.discounts.map((d) => (
                <Text key={d.quantity} style={styles.discount}>
                  {d.quantity} or more: {d.price}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.meta}>
            <Meta label="Availability" value={product.stock} highlight={!product.in_stock} />
            <Meta label="Model" value={product.model} />
            {product.reward ? <Meta label="Reward points" value={String(product.reward)} /> : null}
          </View>
        </View>

        {product.options.length || product.subscriptions.length ? (
          <View style={styles.section}>
            <ProductOptions options={product.options} value={options} onChange={setOptions} errors={errors} />
            {product.subscriptions.length ? (
              <View>
                <Text style={styles.label}>Subscription</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {product.subscriptions.map((s) => (
                    <Chip
                      key={s.subscription_plan_id}
                      label={s.name}
                      selected={subscription === s.subscription_plan_id}
                      onPress={() => setSubscription(s.subscription_plan_id)}
                    />
                  ))}
                </View>
                {errors.subscription ? <Text style={styles.error}>{errors.subscription}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {product.description ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Description</Text>
            <HtmlView html={product.description} baseUrl={config.baseUrl} />
          </View>
        ) : null}

        {product.attribute_groups.length ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Specifications</Text>
            {product.attribute_groups.map((group) => (
              <Card key={group.name} style={{ padding: 0, overflow: 'hidden' }}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.attributes.map((a) => (
                  <View key={a.name} style={styles.attrRow}>
                    <Text style={styles.attrName}>{a.name}</Text>
                    <Text style={styles.attrValue}>{a.text}</Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        ) : null}

        {product.related.length ? (
          <View>
            <SectionHeader title="You may also like" />
            <FlatList
              horizontal
              data={product.related}
              keyExtractor={(p) => String(p.product_id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
              renderItem={({ item }) => <ProductCard product={item} width={160} />}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <View style={styles.bar}>
        <QuantityStepper value={quantity} min={product.minimum} onChange={setQuantity} />
        <Button
          title={product.price ? 'Add to cart' : 'Log in to buy'}
          icon="cart-outline"
          onPress={product.price ? onAdd : () => navigation.navigate('Login')}
          loading={addToCart.isPending}
          style={{ flex: 1, marginLeft: spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

function Meta({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.sm },
  brand: { color: colors.primary, fontSize: font.small, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: font.title, fontWeight: '700', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  link: { color: colors.primary, fontSize: font.body },
  muted: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  discounts: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  discount: { color: colors.primaryDark, fontSize: font.body, lineHeight: 22 },
  meta: { marginTop: spacing.md },
  metaRow: { flexDirection: 'row', paddingVertical: 4 },
  metaLabel: { width: 120, color: colors.textMuted, fontSize: font.body },
  metaValue: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '500' },
  heading: { fontSize: font.large, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  error: { color: colors.accent, fontSize: font.small },
  groupName: { fontWeight: '700', padding: spacing.md, backgroundColor: colors.background, color: colors.text },
  attrRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  attrName: { flex: 1, color: colors.textMuted },
  attrValue: { flex: 1.4, color: colors.text },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingBottom: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
