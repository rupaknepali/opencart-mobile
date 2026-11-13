import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { FieldErrors } from '../api/types';
import { Button, TextField } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const { init } = useStore();
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.account.password(form);
      Alert.alert('Password changed', 'Your password has been updated.');
      navigation.goBack();
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      if (!Object.keys(fe).length) Alert.alert('Sorry', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <TextField
        label="Current password"
        value={form.current}
        onChangeText={set('current')}
        error={errors.current}
        secureTextEntry
        textContentType="password"
      />
      <TextField
        label="New password"
        value={form.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        textContentType="newPassword"
        placeholder={`At least ${init?.settings.password_length ?? 4} characters`}
      />
      <TextField
        label="Confirm new password"
        value={form.confirm}
        onChangeText={set('confirm')}
        error={errors.confirm}
        secureTextEntry
        textContentType="newPassword"
      />
      <Button title="Change password" onPress={save} loading={busy} disabled={!form.current || !form.password} />
    </ScrollView>
  );
}
