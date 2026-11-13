import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { Button, TextField } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.account.forgotten(email.trim());
      Alert.alert('Check your email', 'If an account exists for that address, we have sent a link to reset your password.');
      navigation.goBack();
    } catch (e) {
      setError(fieldErrors(e).email ?? errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: font.body, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 20 }}>
        Enter the email address for your account and we will email you a link to reset your password.
      </Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={error} />
      <Button title="Send reset link" onPress={submit} loading={busy} disabled={!email} />
    </ScrollView>
  );
}
