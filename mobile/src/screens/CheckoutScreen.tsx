import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import type { Address, AddressInput, CheckoutState, FieldErrors } from '../api/types';
import { AddressForm, emptyAddress } from '../components/AddressForm';
import { ErrorState, Loading } from '../components/States';
import { Button, Card, Checkbox, RadioRow, Row, TextField } from '../components/ui';
import { cartKey } from '../hooks/useCart';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { errorMessage, fieldErrors } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const checkoutKey = ['checkout', 'state'] as const;

const formatAddress = (a: Address) =>
  [`${a.firstname} ${a.lastname}`, a.company, a.address_1, a.address_2, `${a.city} ${a.postcode}`.trim(), a.zone, a.country].filter(Boolean).join(', ');

const toInput = (a: Address): AddressInput => ({
  firstname: a.firstname,
  lastname: a.lastname,
  company: a.company,
  address_1: a.address_1,
  address_2: a.address_2,
  city: a.city,
  postcode: a.postcode,
  country_id: a.country_id,
  zone_id: a.zone_id,
});

export default function CheckoutScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const state = useQuery({ queryKey: checkoutKey, queryFn: api.checkout.state, staleTime: 0 });
  const s = state.data;

  const setState = (next: CheckoutState): void => {
    queryClient.setQueryData(checkoutKey, next);
  };

  // Shipping quotes depend on the shipping address
  const shippingKey = s?.shipping_address ? JSON.stringify(toInput(s.shipping_address)) : '';
  const shipping = useQuery({
    queryKey: ['checkout', 'shipping', shippingKey],
    queryFn: api.checkout.shippingMethods,
    enabled: !!s?.customer && !!s?.shipping_required && !!s?.shipping_address,
    retry: false,
  });

  // Payment methods depend on the shipping method and payment address
  const paymentReady = !!s?.customer && (!s.shipping_required || !!s.shipping_method) && (!s.payment_address_required || !!s.payment_address);
  const payment = useQuery({
    queryKey: ['checkout', 'payment', s?.shipping_method?.code ?? '', s?.payment_address ? JSON.stringify(toInput(s.payment_address)) : ''],
    queryFn: api.checkout.paymentMethods,
    enabled: paymentReady,
    retry: false,
  });

  // null = not edited: show the comment saved in the checkout session
  const [commentDraft, setComment] = useState<string | null>(null);
  const comment = commentDraft ?? s?.comment ?? '';
  const [agree, setAgree] = useState(false);

  const selectShipping = useMutation({
    mutationFn: api.checkout.shippingMethod,
    onSuccess: setState,
    onError: (e) => Alert.alert('Shipping', errorMessage(e)),
  });
  const selectPayment = useMutation({ mutationFn: api.checkout.paymentMethod, onSuccess: setState, onError: (e) => Alert.alert('Payment', errorMessage(e)) });

  const confirm = useMutation({
    mutationFn: () => api.checkout.confirm({ comment, agree }),
    onSuccess: (result) => {
      if (result.status === 'complete') {
        queryClient.invalidateQueries({ queryKey: cartKey });
        queryClient.removeQueries({ queryKey: ['checkout'] });
        navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'OrderSuccess', params: { orderId: result.order_id } }] });
      } else if (result.payment_url) {
        navigation.navigate('Payment', { url: result.payment_url, orderId: result.order_id });
      }
    },
    onError: (e) => {
      Alert.alert('Could not place order', errorMessage(e));
      state.refetch();
    },
  });

  if (state.isLoading) return <Loading />;
  if (state.error || !s) return <ErrorState message={errorMessage(state.error)} onRetry={state.refetch} />;

  if (!s.cart_count) {
    return <ErrorState message="Your cart is empty." onRetry={() => navigation.goBack()} />;
  }

  const step2 = !!s.customer;
  const canPlace =
    step2 &&
    (!s.shipping_required || (!!s.shipping_address && !!s.shipping_method)) &&
    (!s.payment_address_required || !!s.payment_address) &&
    !!s.payment_method &&
    (!s.terms || agree);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {/* 1. Customer */}
        <Step number={1} title="Your details" done={step2}>
          {s.customer ? (
            <View>
              <Text style={styles.body}>
                {s.customer.firstname} {s.customer.lastname}
              </Text>
              <Text style={styles.muted}>{s.customer.email}</Text>
              {s.customer.telephone ? <Text style={styles.muted}>{s.customer.telephone}</Text> : null}
            </View>
          ) : (
            <CustomerStep
              state={s}
              onDone={setState}
              onLogin={() => navigation.navigate('Login', { redirect: 'Checkout' })}
              onRegister={() => navigation.navigate('Register', { redirect: 'Checkout' })}
            />
          )}
        </Step>

        {/* 2. Shipping address */}
        {step2 && s.shipping_required ? (
          <Step number={2} title="Shipping address" done={!!s.shipping_address}>
            <AddressStep
              logged={s.logged}
              addresses={s.addresses}
              current={s.shipping_address}
              onSubmit={(body) => api.checkout.shippingAddress(body).then(setState)}
            />
          </Step>
        ) : null}

        {/* 3. Payment address */}
        {step2 && s.payment_address_required ? (
          <Step number={s.shipping_required ? 3 : 2} title="Payment address" done={!!s.payment_address}>
            {s.shipping_address && !s.payment_address ? (
              <Button
                title="Same as shipping address"
                variant="secondary"
                style={{ marginBottom: spacing.md }}
                onPress={() =>
                  api.checkout
                    .paymentAddress(s.shipping_address!.address_id ? { address_id: s.shipping_address!.address_id } : toInput(s.shipping_address!))
                    .then(setState)
                    .catch((e) => Alert.alert('Payment address', errorMessage(e)))
                }
              />
            ) : null}
            <AddressStep
              logged={s.logged}
              addresses={s.addresses}
              current={s.payment_address}
              onSubmit={(body) => api.checkout.paymentAddress(body).then(setState)}
            />
          </Step>
        ) : null}

        {/* Shipping method */}
        {step2 && s.shipping_required && s.shipping_address ? (
          <Step title="Shipping method" done={!!s.shipping_method}>
            {shipping.isLoading ? (
              <Text style={styles.muted}>Getting shipping rates…</Text>
            ) : shipping.error ? (
              <Text style={styles.error}>{errorMessage(shipping.error)}</Text>
            ) : (
              shipping.data?.shipping_methods.map((method) => (
                <View key={method.code} style={{ marginBottom: spacing.sm }}>
                  <Text style={styles.groupTitle}>{method.name}</Text>
                  {method.error ? <Text style={styles.error}>{method.error}</Text> : null}
                  {method.quotes.map((q) => (
                    <RadioRow
                      key={q.code}
                      title={q.name}
                      right={q.text}
                      selected={s.shipping_method?.code === q.code}
                      onPress={() => selectShipping.mutate(q.code)}
                    />
                  ))}
                </View>
              ))
            )}
          </Step>
        ) : null}

        {/* Payment method */}
        {paymentReady ? (
          <Step title="Payment method" done={!!s.payment_method}>
            {payment.isLoading ? (
              <Text style={styles.muted}>Loading payment methods…</Text>
            ) : payment.error ? (
              <Text style={styles.error}>{errorMessage(payment.error)}</Text>
            ) : (
              payment.data?.payment_methods.flatMap((method) =>
                method.options.map((o) => (
                  <RadioRow
                    key={o.code}
                    title={o.name}
                    subtitle={method.native ? undefined : 'You will complete payment on the next screen'}
                    selected={s.payment_method?.code === o.code}
                    onPress={() => selectPayment.mutate(o.code)}
                  />
                )),
              )
            )}
          </Step>
        ) : null}

        {/* Review */}
        {step2 ? (
          <Card>
            <TextField
              label="Order comments (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder="Delivery instructions, gift message…"
            />
            {s.terms ? (
              <Checkbox
                checked={agree}
                onToggle={() => setAgree(!agree)}
                label={
                  <Text style={styles.body}>
                    I have read and agree to the{' '}
                    <Text
                      style={styles.link}
                      onPress={() => navigation.navigate('Information', { informationId: s.terms!.information_id, title: s.terms!.title })}
                    >
                      {s.terms.title}
                    </Text>
                  </Text>
                }
              />
            ) : null}
            {s.totals.map((t, i) => (
              <Row key={t.code + i} label={t.title} value={t.text} bold={i === s.totals.length - 1} />
            ))}
          </Card>
        ) : null}

        {step2 ? (
          <Button
            title={
              s.payment_method && payment.data?.payment_methods.find((m) => s.payment_method!.code.startsWith(m.code + '.'))?.native === false
                ? 'Continue to payment'
                : 'Place order'
            }
            icon="lock-closed-outline"
            onPress={() => confirm.mutate()}
            loading={confirm.isPending}
            disabled={!canPlace}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Step({ number, title, done, children }: { number?: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, done && { backgroundColor: colors.success }]}>
          <Text style={styles.stepBadgeText}>{done ? '✓' : (number ?? '•')}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function CustomerStep({
  state,
  onDone,
  onLogin,
  onRegister,
}: {
  state: CheckoutState;
  onDone: (s: CheckoutState) => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', telephone: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      onDone(await api.checkout.guest({ ...form, email: form.email.trim() }));
    } catch (e) {
      setErrors(fieldErrors(e));
      if (!Object.keys(fieldErrors(e)).length) Alert.alert('Sorry', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Button title="Log in" onPress={onLogin} style={{ flex: 1 }} small />
        <Button title="Register" variant="outline" onPress={onRegister} style={{ flex: 1 }} small />
      </View>
      {state.guest_allowed ? (
        <View>
          <Text style={[styles.groupTitle, { marginBottom: spacing.md }]}>Or check out as a guest</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextField containerStyle={{ flex: 1 }} label="First name" value={form.firstname} onChangeText={set('firstname')} error={errors.firstname} />
            <TextField containerStyle={{ flex: 1 }} label="Last name" value={form.lastname} onChangeText={set('lastname')} error={errors.lastname} />
          </View>
          <TextField label="Email" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Telephone" value={form.telephone} onChangeText={set('telephone')} error={errors.telephone} keyboardType="phone-pad" />
          <Button title="Continue as guest" variant="secondary" onPress={submit} loading={busy} />
        </View>
      ) : (
        <Text style={styles.muted}>Please log in or create an account to check out.</Text>
      )}
    </View>
  );
}

function AddressStep({
  logged,
  addresses,
  current,
  onSubmit,
}: {
  logged: boolean;
  addresses: Address[];
  current: Address | null;
  onSubmit: (body: { address_id: number } | AddressInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(!current);
  const [adding, setAdding] = useState(!logged || !addresses.length);
  const [form, setForm] = useState<AddressInput>(current && !current.address_id ? toInput(current) : emptyAddress());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  // No effect needed: without a current address the form is always shown (see the check below).

  const run = async (body: { address_id: number } | AddressInput) => {
    setBusy(true);
    setErrors({});
    try {
      await onSubmit(body);
      setEditing(false);
    } catch (e) {
      setErrors(fieldErrors(e));
      if (!Object.keys(fieldErrors(e)).length) Alert.alert('Address', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (current && !editing) {
    return (
      <View>
        <Text style={styles.body}>{formatAddress(current)}</Text>
        <Button title="Change" variant="ghost" small onPress={() => setEditing(true)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </View>
    );
  }

  if (logged && addresses.length && !adding) {
    return (
      <View>
        {addresses.map((a) => (
          <RadioRow
            key={a.address_id}
            title={`${a.firstname} ${a.lastname}`}
            subtitle={formatAddress(a)}
            selected={current?.address_id === a.address_id}
            onPress={() => run({ address_id: a.address_id })}
          />
        ))}
        <Button title="Add a new address" variant="ghost" icon="add" small onPress={() => setAdding(true)} />
      </View>
    );
  }

  return (
    <View>
      <AddressForm value={form} onChange={setForm} errors={errors} />
      <Button title="Use this address" onPress={() => run({ ...form, save: logged })} loading={busy} />
      {logged && addresses.length ? (
        <Button title="Choose a saved address" variant="ghost" small onPress={() => setAdding(false)} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  muted: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  error: { fontSize: font.body, color: colors.accent },
  link: { color: colors.primary, fontWeight: '600' },
  groupTitle: { fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepBadgeText: { color: colors.onPrimary, fontWeight: '700', fontSize: 13 },
  stepTitle: { fontSize: font.large, fontWeight: '700', color: colors.text },
});
