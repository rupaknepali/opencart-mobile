import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { Banner, ProductCard as Product } from '../api/types';
import { ProductCard } from '../components/ProductCard';
import { ErrorState, Loading } from '../components/States';
import { SectionHeader } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(170, (width - spacing.lg * 2 - spacing.md) / 2.2);

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { init } = useStore();
  const home = useQuery({ queryKey: ['home'], queryFn: api.catalog.home });

  if (home.isLoading) return <Loading />;
  if (home.error || !home.data) return <ErrorState message={errorMessage(home.error)} onRetry={home.refetch} />;

  const { banners, categories, featured, latest, specials, bestsellers } = home.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.tertiary }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={styles.topBand}>
          <View style={styles.header}>
            {init?.store.logo ? (
              <Image source={{ uri: init.store.logo }} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.storeName}>{init?.store.name}</Text>
            )}
          </View>

          <Pressable style={styles.search} onPress={() => navigation.navigate('Search')} accessibilityRole="search">
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchText}>Search products</Text>
          </Pressable>
        </View>

        {banners.length ? <BannerCarousel banners={banners} /> : null}

        {categories.length ? (
          <>
            <SectionHeader title="Shop by category" action="All" onAction={() => navigation.navigate('Tabs', { screen: 'Categories' })} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              {categories.map((c) => (
                <Pressable
                  key={c.category_id}
                  style={styles.category}
                  onPress={() => navigation.navigate('ProductList', { title: c.name, query: { category_id: c.category_id } })}
                >
                  <View style={styles.categoryIcon}>
                    {c.image ? (
                      <Image source={{ uri: c.image }} style={styles.categoryImage} />
                    ) : (
                      <Ionicons name="pricetags-outline" size={26} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <ProductRow title="Featured" products={featured} />
        <ProductRow
          title="Special offers"
          products={specials}
          onSeeAll={() => navigation.navigate('ProductList', { title: 'Special offers', query: { special: 1 } })}
        />
        <ProductRow
          title="New arrivals"
          products={latest}
          onSeeAll={() => navigation.navigate('ProductList', { title: 'New arrivals', query: { sort: 'newest' } })}
        />
        <ProductRow title="Best sellers" products={bestsellers} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProductRow({ title, products, onSeeAll }: { title: string; products: Product[]; onSeeAll?: () => void }) {
  if (!products.length) return null;
  return (
    <View>
      <SectionHeader title={title} action={onSeeAll ? 'See all' : undefined} onAction={onSeeAll} />
      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => String(p.product_id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => <ProductCard product={item} width={CARD_WIDTH} />}
      />
    </View>
  );
}

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);
  const slideWidth = width - spacing.lg * 2;
  const ref = useRef<FlatList<Banner>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
  };

  // Banner links that point at a product or category open in-app.
  const open = (link: string) => {
    if (!link) return;
    const product = link.match(/product_id=(\d+)/);
    const path = link.match(/path=([\d_]+)/);
    if (product) navigation.navigate('Product', { productId: Number(product[1]) });
    else if (path) navigation.navigate('ProductList', { title: 'Products', query: { category_id: Number(path[1].split('_').pop()) } });
    else Linking.openURL(link);
  };

  return (
    <View style={{ marginTop: spacing.md }}>
      <FlatList
        ref={ref}
        horizontal
        pagingEnabled
        data={banners}
        keyExtractor={(b, i) => `${b.image}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ marginHorizontal: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item.link)} accessibilityLabel={item.title}>
            <Image source={{ uri: item.image }} style={[styles.banner, { width: slideWidth }]} resizeMode="cover" />
          </Pressable>
        )}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBand: { backgroundColor: colors.tertiary, paddingBottom: spacing.md },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: 'center' },
  logo: { height: 40, width: 180 },
  storeName: { fontSize: font.title, fontWeight: '800', color: colors.onTertiary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: { marginLeft: spacing.sm, color: colors.textMuted, fontSize: font.medium },
  banner: { aspectRatio: 1140 / 480, borderRadius: radius.lg, backgroundColor: colors.border },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  category: { width: 76, alignItems: 'center' },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryImage: { width: 64, height: 64 },
  categoryName: { fontSize: font.small, color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
});
