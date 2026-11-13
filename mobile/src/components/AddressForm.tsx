import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import type { AddressInput, FieldErrors } from '../api/types';
import { useStore } from '../context/StoreContext';
import { SelectField } from './SelectModal';
import { TextField } from './ui';

export const emptyAddress = (country_id = 0, zone_id = 0): AddressInput => ({
  firstname: '',
  lastname: '',
  company: '',
  address_1: '',
  address_2: '',
  city: '',
  postcode: '',
  country_id,
  zone_id,
});

type Props = {
  value: AddressInput;
  onChange: (value: AddressInput) => void;
  errors?: FieldErrors;
};

export function AddressForm({ value, onChange, errors = {} }: Props) {
  const { init } = useStore();

  const countries = useQuery({ queryKey: ['countries'], queryFn: api.localisation.countries, staleTime: Infinity });
  const zones = useQuery({
    queryKey: ['zones', value.country_id],
    queryFn: () => api.localisation.zones(value.country_id),
    enabled: value.country_id > 0,
    staleTime: Infinity,
  });

  // Default to the store's country on a blank form
  useEffect(() => {
    if (!value.country_id && init?.settings.country_id) {
      onChange({ ...value, country_id: init.settings.country_id, zone_id: init.settings.zone_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init?.settings.country_id]);

  const set = (key: keyof AddressInput) => (text: string) => onChange({ ...value, [key]: text });

  const country = countries.data?.countries.find((c) => c.country_id === value.country_id);
  const zoneList = zones.data?.zones ?? [];

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField
          containerStyle={{ flex: 1 }}
          label="First name"
          value={value.firstname}
          onChangeText={set('firstname')}
          error={errors.firstname}
          autoComplete="given-name"
          textContentType="givenName"
        />
        <TextField
          containerStyle={{ flex: 1 }}
          label="Last name"
          value={value.lastname}
          onChangeText={set('lastname')}
          error={errors.lastname}
          autoComplete="family-name"
          textContentType="familyName"
        />
      </View>
      <TextField label="Company (optional)" value={value.company} onChangeText={set('company')} />
      <TextField
        label="Address"
        value={value.address_1}
        onChangeText={set('address_1')}
        error={errors.address_1}
        autoComplete="address-line1"
        textContentType="streetAddressLine1"
      />
      <TextField label="Address line 2 (optional)" value={value.address_2} onChangeText={set('address_2')} textContentType="streetAddressLine2" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField containerStyle={{ flex: 1 }} label="City" value={value.city} onChangeText={set('city')} error={errors.city} textContentType="addressCity" />
        <TextField
          containerStyle={{ flex: 1 }}
          label={country?.postcode_required ? 'Postcode' : 'Postcode (optional)'}
          value={value.postcode}
          onChangeText={set('postcode')}
          error={errors.postcode}
          autoCapitalize="characters"
          textContentType="postalCode"
        />
      </View>
      <SelectField
        label="Country"
        value={value.country_id || null}
        options={(countries.data?.countries ?? []).map((c) => ({ value: c.country_id, label: c.name }))}
        onChange={(v) => onChange({ ...value, country_id: Number(v), zone_id: 0 })}
        error={errors.country_id}
      />
      {zoneList.length > 0 ? (
        <SelectField
          label="Region / State"
          value={value.zone_id || null}
          options={zoneList.map((z) => ({ value: z.zone_id, label: z.name }))}
          onChange={(v) => onChange({ ...value, zone_id: Number(v) })}
          error={errors.zone_id}
        />
      ) : null}
    </View>
  );
}
