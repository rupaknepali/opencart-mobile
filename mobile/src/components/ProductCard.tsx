import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProductCard as Product } from '../api/types';
import type { RootStackParamList } from '../navigation/types';
import { useToggleWishlist } from '../hooks/useWishlist';
import { colors, font, radius, spacing } from '../theme';
import { Price, Rating } from './Price';

type Props = {
  product: Product;
  width?: number;
};

export function ProductCard({ product, width }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const wishlist = useToggleWishlist();
  const liked = wishlist.isInWishlist(product.product_id);

  return (
    <Pressable
      onPress={() => navigation.push('Product', { productId: product.product_id, name: product.name })}
      style={({ pressed }) => [styles.card, width ? { width } : { flex: 1 }, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View>
        <Image source={{ uri: product.thumb }} style={styles.image} resizeMode="contain" />
        {product.discount_pct > 0 ? (
          <View style={styles.sale}>
            <Text style={styles.saleText}>-{product.discount_pct}%</Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => wishlist.toggle(product.product_id)}
          hitSlop={10}
          style={styles.heart}
          accessibilityLabel={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.secondary : colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        {product.rating > 0 ? <Rating value={product.rating} count={product.reviews} /> : null}
        <View style={{ marginTop: spacing.xs }}>
          <Price price={product.price} special={product.special} />
        </View>
        {!product.in_stock ? <Text style={styles.oos}>Out of stock</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#fff' },
  body: { padding: spacing.md, gap: 4 },
  name: { fontSize: font.body, color: colors.text, minHeight: 36, lineHeight: 18 },
  sale: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saleText: { color: colors.onSecondary, fontSize: 11, fontWeight: '700' },
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 5,
  },
  oos: { fontSize: font.small, color: colors.accent, marginTop: 2 },
});
