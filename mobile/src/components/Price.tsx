import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

export function Price({ price, special, size = 'normal' }: { price: string; special?: string; size?: 'normal' | 'large' }) {
  if (!price) {
    return <Text style={styles.login}>Log in to see prices</Text>;
  }
  const big = size === 'large';
  return (
    <View style={styles.row}>
      <Text style={[styles.price, big && styles.priceLarge, special ? { color: colors.secondary } : null]}>{special || price}</Text>
      {special ? <Text style={[styles.old, big && { fontSize: font.body }]}>{price}</Text> : null}
    </View>
  );
}

export function Rating({ value, size = 12, count }: { value: number; size?: number; count?: number }) {
  const full = Math.round(value);
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: size, color: colors.star, letterSpacing: 1 }}>
        {'★'.repeat(full)}
        <Text style={{ color: colors.border }}>{'★'.repeat(5 - full)}</Text>
      </Text>
      {count !== undefined ? <Text style={{ fontSize: size, color: colors.textMuted, marginLeft: 4 }}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  price: { fontSize: font.medium, fontWeight: '700', color: colors.text },
  priceLarge: { fontSize: font.title },
  old: { fontSize: font.small, color: colors.textMuted, textDecorationLine: 'line-through', marginLeft: 6 },
  login: { fontSize: font.small, color: colors.textMuted, fontStyle: 'italic' },
});
