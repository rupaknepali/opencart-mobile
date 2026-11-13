import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { FieldErrors } from '../api/types';
import { Button, Checkbox, TextField } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { init, setCustomer } = useStore();
  const queryClient = useQueryClient();
  const settings = init?.settings;

  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', telephone: '', password: '' });
  const [newsletter, setNewsletter] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const result = await api.account.register({ ...form, email: form.email.trim(), newsletter, agree });
      if (result.approval || !result.customer) {
        Alert.alert('Account created', 'Your account must be approved by the store before you can log in.');
        navigation.goBack();
        return;
      }
      setCustomer(result.customer);
      await queryClient.invalidateQueries();
      if (route.params?.redirect === 'Checkout') navigation.replace('Checkout');
      else navigation.goBack();
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      if (!Object.keys(fe).length) Alert.alert('Sorry', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TextField
            containerStyle={{ flex: 1 }}
            label="First name"
            value={form.firstname}
            onChangeText={set('firstname')}
            error={errors.firstname}
            textContentType="givenName"
          />
          <TextField
            containerStyle={{ flex: 1 }}
            label="Last name"
            value={form.lastname}
            onChangeText={set('lastname')}
            error={errors.lastname}
            textContentType="familyName"
          />
        </View>
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />
        <TextField
          label={settings?.telephone_required ? 'Telephone' : 'Telephone (optional)'}
          value={form.telephone}
          onChangeText={set('telephone')}
          error={errors.telephone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          secureTextEntry
          textContentType="newPassword"
          placeholder={`At least ${settings?.password_length ?? 4} characters`}
        />

        <Checkbox checked={newsletter} onToggle={() => setNewsletter(!newsletter)} label="Subscribe to our newsletter" />

        {settings?.account_terms ? (
          <Checkbox
            checked={agree}
            onToggle={() => setAgree(!agree)}
            error={errors.agree}
            label={
              <Text style={{ fontSize: font.body, color: colors.text }}>
                I have read and agree to the{' '}
                <Text
                  style={{ color: colors.primary, fontWeight: '600' }}
                  onPress={() =>
                    navigation.navigate('Information', { informationId: settings.account_terms!.information_id, title: settings.account_terms!.title })
                  }
                >
                  {settings.account_terms.title}
                </Text>
              </Text>
            }
          />
        ) : null}

        {errors.warning ? <Text style={{ color: colors.accent, marginBottom: spacing.md }}>{errors.warning}</Text> : null}

        <Button title="Create account" onPress={submit} loading={busy} />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => navigation.replace('Login', { redirect: route.params?.redirect })}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
