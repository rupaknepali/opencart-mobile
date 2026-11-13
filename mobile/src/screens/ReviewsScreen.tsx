import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { Rating } from '../components/Price';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Button, Card } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Reviews'>;

export default function ReviewsScreen({ route, navigation }: Props) {
  const { productId, name, canReview } = route.params;

  const list = useInfiniteQuery({
    queryKey: ['reviews', productId],
    queryFn: ({ pageParam }) => api.product.reviews(productId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />;

  const reviews = list.data?.pages.flatMap((p) => p.reviews) ?? [];

  return (
    <FlatList
      data={reviews}
      keyExtractor={(r) => String(r.review_id)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      ListHeaderComponent={
        canReview ? (
          <Button
            title="Write a review"
            icon="create-outline"
            variant="secondary"
            onPress={() => navigation.navigate('WriteReview', { productId, name })}
            style={{ marginBottom: spacing.lg }}
          />
        ) : undefined
      }
      ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No reviews yet" message="Be the first to review this product." />}
      onEndReached={() => list.hasNextPage && list.fetchNextPage()}
      ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : undefined}
      renderItem={({ item }) => (
        <Card>
          <View style={styles.head}>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.date}>{item.date_added}</Text>
          </View>
          <Rating value={item.rating} size={14} />
          <Text style={styles.text}>{item.text}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  author: { fontWeight: '700', color: colors.text, fontSize: font.body },
  date: { color: colors.textMuted, fontSize: font.small },
  text: { color: colors.text, fontSize: font.body, lineHeight: 20, marginTop: spacing.sm },
});
