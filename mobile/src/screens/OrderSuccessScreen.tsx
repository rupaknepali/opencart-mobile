import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

export default function OrderSuccessScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { isLoggedIn } = useStore();

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={88} color={colors.success} />
      <Text style={styles.title}>Thank you for your order!</Text>
      <Text style={styles.text}>Your order #{orderId} has been placed. We have emailed you a confirmation.</Text>
      {isLoggedIn ? (
        <Button
          title="View order"
          variant="outline"
          onPress={() =>
            navigation.reset({
              index: 1,
              routes: [
                { name: 'Tabs', params: { screen: 'Account' } },
                { name: 'OrderDetail', params: { orderId } },
              ],
            })
          }
          style={styles.button}
        />
      ) : null}
      <Button
        title="Continue shopping"
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] })}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.surface },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  button: { alignSelf: 'stretch', marginTop: spacing.md },
});
