import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductResults } from '../components/ProductResults';
import { EmptyState } from '../components/States';
import { colors, font, radius, spacing } from '../theme';

export default function SearchScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  // Debounce typing so we do not query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.bar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search products"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => setTerm(text.trim())}
          autoCorrect={false}
        />
        {text ? (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {term.length >= 2 ? (
        <ProductResults key={term} query={{ search: term, description: 1 }} />
      ) : (
        <EmptyState icon="search-outline" title="What are you looking for?" message="Type at least two characters to search the catalog." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 12, marginHorizontal: spacing.sm, fontSize: font.medium, color: colors.text },
});
