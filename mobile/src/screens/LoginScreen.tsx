import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, TextField } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { login, init } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirect = route.params?.redirect;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      if (redirect === 'Checkout') navigation.replace('Checkout');
      else navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to your {init?.store.name ?? ''} account</Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Log in" onPress={submit} loading={busy} disabled={!email || !password} />

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>Forgot your password?</Text>
        </Pressable>

        <Text style={[styles.subtitle, { marginTop: spacing.xxl, textAlign: 'center' }]}>New here?</Text>
        <Button title="Create an account" variant="outline" onPress={() => navigation.replace('Register', { redirect })} />

        {redirect === 'Checkout' && init?.settings.guest_checkout ? (
          <Button title="Continue as guest" variant="ghost" onPress={() => navigation.replace('Checkout')} style={{ marginTop: spacing.sm }} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl },
  title: { fontSize: font.hero, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  error: { color: colors.accent, marginBottom: spacing.md, fontSize: font.body },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '600' },
});
