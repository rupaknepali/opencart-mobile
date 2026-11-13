import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { AddressInput, FieldErrors } from '../api/types';
import { AddressForm, emptyAddress } from '../components/AddressForm';
import { Button, Checkbox } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressEdit'>;

export default function AddressEditScreen({ route, navigation }: Props) {
  const existing = route.params?.address;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AddressInput>(
    existing
      ? {
          address_id: existing.address_id,
          firstname: existing.firstname,
          lastname: existing.lastname,
          company: existing.company,
          address_1: existing.address_1,
          address_2: existing.address_2,
          city: existing.city,
          postcode: existing.postcode,
          country_id: existing.country_id,
          zone_id: existing.zone_id,
          default: existing.default,
        }
      : emptyAddress(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.address.save(form);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <AddressForm value={form} onChange={setForm} errors={errors} />
        <Checkbox checked={!!form.default} onToggle={() => setForm({ ...form, default: !form.default })} label="Use as my default address" />
        <Button title="Save address" onPress={save} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
