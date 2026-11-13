import React, { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { CategorySummary } from '../api/types';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Divider } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

export default function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({ queryKey: ['categories', 0], queryFn: () => api.catalog.categories(0) });
  const [expanded, setExpanded] = useState<number | null>(null);

  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;

  const openCategory = (c: CategorySummary) => navigation.navigate('ProductList', { title: c.name, query: { category_id: c.category_id } });

  return (
    <FlatList
      data={query.data.categories}
      keyExtractor={(c) => String(c.category_id)}
      ItemSeparatorComponent={Divider}
      onRefresh={query.refetch}
      refreshing={query.isRefetching}
      ListEmptyComponent={<EmptyState icon="grid-outline" title="No categories yet" />}
      contentContainerStyle={{ backgroundColor: colors.surface, flexGrow: 1 }}
      renderItem={({ item }) => {
        const hasChildren = !!item.children?.length;
        const open = expanded === item.category_id;
        return (
          <View>
            <Pressable
              style={styles.row}
              onPress={() => (hasChildren ? setExpanded(open ? null : item.category_id) : openCategory(item))}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
                </View>
              )}
              <Text style={styles.name}>
                {item.name}
                {item.total != null ? <Text style={styles.count}> ({item.total})</Text> : null}
              </Text>
              <Ionicons name={hasChildren ? (open ? 'chevron-up' : 'chevron-down') : 'chevron-forward'} size={18} color={colors.textMuted} />
            </Pressable>
            {open ? (
              <View style={styles.children}>
                <Pressable style={styles.child} onPress={() => openCategory(item)}>
                  <Text style={[styles.childText, { color: colors.primary, fontWeight: '600' }]}>Shop all {item.name}</Text>
                </Pressable>
                {item.children!.map((child) => (
                  <Pressable key={child.category_id} style={styles.child} onPress={() => openCategory(child)}>
                    <Text style={styles.childText}>{child.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  image: { width: 44, height: 44, borderRadius: 8 },
  placeholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: font.medium, color: colors.text, fontWeight: '500' },
  count: { color: colors.textMuted, fontWeight: '400' },
  children: { backgroundColor: colors.background, paddingLeft: 72 },
  child: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingRight: spacing.lg },
  childText: { fontSize: font.body, color: colors.text },
});
