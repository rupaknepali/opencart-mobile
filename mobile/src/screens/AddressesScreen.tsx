import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Button, Card } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

export default function AddressesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['addresses'], queryFn: api.address.list });

  const remove = useMutation({
    mutationFn: api.address.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (e) => Alert.alert('Sorry', errorMessage(e)),
  });

  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={query.data.addresses}
        keyExtractor={(a) => String(a.address_id)}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        ListEmptyComponent={<EmptyState icon="location-outline" title="No saved addresses" message="Add an address to check out faster." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.head}>
              <Text style={styles.name}>
                {item.firstname} {item.lastname}
              </Text>
              {item.default ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Default</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.body}>
              {[item.company, item.address_1, item.address_2, `${item.city} ${item.postcode}`, item.zone, item.country].filter((x) => x && x.trim()).join('\n')}
            </Text>
            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate('AddressEdit', { address: item })} style={styles.action}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              {!item.default ? (
                <Pressable
                  style={styles.action}
                  onPress={() =>
                    Alert.alert('Delete address', 'Are you sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.address_id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color={colors.accent} />
                  <Text style={[styles.actionText, { color: colors.accent }]}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        )}
      />
      <View style={styles.bar}>
        <Button title="Add new address" icon="add" onPress={() => navigation.navigate('AddressEdit')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  name: { fontSize: font.medium, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.textMuted, lineHeight: 20 },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.primary, fontWeight: '600' },
  bar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
