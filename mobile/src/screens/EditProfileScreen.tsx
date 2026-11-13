import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { FieldErrors } from '../api/types';
import { Button, TextField } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { customer, setCustomer, init } = useStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstname: customer?.firstname ?? '',
    lastname: customer?.lastname ?? '',
    email: customer?.email ?? '',
    telephone: customer?.telephone ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const { customer: updated } = await api.account.edit({ ...form, email: form.email.trim() });
      setCustomer(updated);
      queryClient.setQueryData(['profile'], { customer: updated });
      Alert.alert('Saved', 'Your details have been updated.');
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
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField containerStyle={{ flex: 1 }} label="First name" value={form.firstname} onChangeText={set('firstname')} error={errors.firstname} />
        <TextField containerStyle={{ flex: 1 }} label="Last name" value={form.lastname} onChangeText={set('lastname')} error={errors.lastname} />
      </View>
      <TextField label="Email" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
      <TextField
        label={init?.settings.telephone_required ? 'Telephone' : 'Telephone (optional)'}
        value={form.telephone}
        onChangeText={set('telephone')}
        error={errors.telephone}
        keyboardType="phone-pad"
      />
      <Button title="Save changes" onPress={save} loading={busy} />
    </ScrollView>
  );
}
