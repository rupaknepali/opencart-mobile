import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CartOptionValue } from '../api/endpoints';
import type { ProductOption } from '../api/types';
import { colors, font, radius, spacing } from '../theme';
import { Chip, TextField } from './ui';

export type OptionSelection = Record<string, CartOptionValue>;

type Props = {
  options: ProductOption[];
  value: OptionSelection;
  onChange: (value: OptionSelection) => void;
  errors?: Record<string, string>;
};

const placeholders: Record<string, string> = {
  date: 'YYYY-MM-DD',
  time: 'HH:MM',
  datetime: 'YYYY-MM-DD HH:MM',
};

/**
 * Renders OpenCart product options. The selection is keyed by product_option_id,
 * matching what api/cart.addProduct expects in "option".
 */
export function ProductOptions({ options, value, onChange, errors = {} }: Props) {
  const set = (id: number, v: CartOptionValue) => onChange({ ...value, [String(id)]: v });

  return (
    <View>
      {options.map((option) => {
        const key = String(option.product_option_id);
        // Server errors are keyed "option_<product_option_id>"
        const error = errors[`option_${option.product_option_id}`];
        const label = `${option.name}${option.required ? ' *' : ''}`;

        if (option.type === 'select' || option.type === 'radio' || option.type === 'checkbox') {
          const multi = option.type === 'checkbox';
          const current = value[key];
          const selected = (id: number) => (multi ? Array.isArray(current) && current.includes(String(id)) : current === String(id));

          return (
            <View key={key} style={styles.block}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.wrap}>
                {option.values.map((v) => {
                  const id = String(v.product_option_value_id);
                  const text = v.price ? `${v.name} (${v.price_prefix}${v.price})` : v.name;
                  const onPress = () => {
                    if (multi) {
                      const list = Array.isArray(current) ? current : [];
                      set(option.product_option_id, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
                    } else {
                      set(option.product_option_id, current === id && !option.required ? '' : id);
                    }
                  };

                  if (v.image) {
                    return (
                      <Pressable
                        key={id}
                        onPress={onPress}
                        style={[styles.swatch, selected(v.product_option_value_id) && styles.swatchSelected]}
                        accessibilityLabel={text}
                      >
                        <Image source={{ uri: v.image }} style={styles.swatchImage} />
                        <Text style={styles.swatchText} numberOfLines={1}>
                          {v.name}
                        </Text>
                      </Pressable>
                    );
                  }

                  return <Chip key={id} label={text} selected={selected(v.product_option_value_id)} onPress={onPress} />;
                })}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          );
        }

        if (option.type === 'file') {
          return (
            <View key={key} style={styles.block}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.note}>File uploads are not supported in the app. Please order this product on the website.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          );
        }

        // text, textarea, date, time, datetime
        const current = typeof value[key] === 'string' ? (value[key] as string) : option.value;
        return (
          <TextField
            key={key}
            label={label}
            value={current}
            onChangeText={(t) => set(option.product_option_id, t)}
            placeholder={placeholders[option.type]}
            multiline={option.type === 'textarea'}
            error={error}
          />
        );
      })}
    </View>
  );
}

/** Pre-fill text-type options with their default value. */
export function defaultOptionSelection(options: ProductOption[]): OptionSelection {
  const selection: OptionSelection = {};
  options.forEach((o) => {
    if (['text', 'textarea', 'date', 'time', 'datetime'].includes(o.type) && o.value) {
      selection[String(o.product_option_id)] = o.value;
    }
  });
  return selection;
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.md },
  label: { fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  error: { color: colors.accent, fontSize: font.small },
  note: { fontSize: font.small, color: colors.textMuted },
  swatch: {
    width: 72,
    alignItems: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  swatchSelected: { borderColor: colors.primary, borderWidth: 2 },
  swatchImage: { width: 56, height: 56, borderRadius: radius.sm },
  swatchText: { fontSize: 11, color: colors.text, marginTop: 2 },
});
