import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { FieldErrors } from '../api/types';
import { Button, TextField } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'WriteReview'>;

export default function WriteReviewScreen({ route, navigation }: Props) {
  const { productId, name } = route.params;
  const { customer } = useStore();
  const queryClient = useQueryClient();

  const [author, setAuthor] = useState(customer ? `${customer.firstname} ${customer.lastname}` : '');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.product.addReview(productId, { author, text, rating });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      Alert.alert('Thank you!', 'Your review has been submitted for approval.');
      navigation.goBack();
    } catch (e) {
      setErrors(fieldErrors(e));
      if (!Object.keys(fieldErrors(e)).length) Alert.alert('Sorry', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: font.medium, fontWeight: '600', color: colors.text, marginBottom: spacing.lg }}>{name}</Text>

        <Text style={{ fontWeight: '500', color: colors.text, marginBottom: spacing.sm }}>Your rating</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xs }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color={colors.star} />
            </Pressable>
          ))}
        </View>
        {errors.rating ? <Text style={{ color: colors.accent, fontSize: font.small }}>{errors.rating}</Text> : null}

        <TextField label="Your name" value={author} onChangeText={setAuthor} error={errors.author} containerStyle={{ marginTop: spacing.lg }} />
        <TextField label="Your review" value={text} onChangeText={setText} multiline error={errors.text} placeholder="At least 25 characters" />
        <Button title="Submit review" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
