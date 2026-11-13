import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function QuantityStepper({ value, min = 1, max = 999, onChange, disabled, compact }: Props) {
  const size = compact ? 30 : 40;
  return (
    <View style={[styles.wrap, { height: size }]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        style={[styles.btn, { width: size }]}
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={compact ? 16 : 20} color={value <= min ? colors.border : colors.text} />
      </Pressable>
      <Text style={[styles.value, compact && { minWidth: 28, fontSize: 14 }]}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        style={[styles.btn, { width: size }]}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={compact ? 16 : 20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  btn: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  value: { minWidth: 36, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
});
