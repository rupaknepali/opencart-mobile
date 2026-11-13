import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { SelectField } from '../components/SelectModal';
import { Button, Divider, ListItem } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const { init, customer, isLoggedIn, logout, changeCurrency, setCustomer } = useStore();
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  const profile = useQuery({ queryKey: ['profile'], queryFn: api.account.profile, enabled: isLoggedIn });
  const pages = useQuery({ queryKey: ['informations'], queryFn: api.catalog.informations, staleTime: Infinity });

  const me = profile.data?.customer ?? customer;

  const toggleNewsletter = async (value: boolean) => {
    setNewsletterBusy(true);
    try {
      await api.account.newsletter(value);
      await profile.refetch();
    } catch (e) {
      Alert.alert('Sorry', errorMessage(e));
    } finally {
      setNewsletterBusy(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setCustomer(null);
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={styles.hero}>
        {isLoggedIn && me ? (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {me.firstname.charAt(0)}
                {me.lastname.charAt(0)}
              </Text>
            </View>
            <Text style={styles.name}>
              {me.firstname} {me.lastname}
            </Text>
            <Text style={styles.email}>{me.email}</Text>
            {me.balance || me.reward ? (
              <View style={styles.stats}>
                {me.balance ? <Text style={styles.stat}>Balance: {me.balance}</Text> : null}
                {me.reward ? <Text style={styles.stat}>Reward points: {me.reward}</Text> : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.name}>Welcome to {init?.store.name}</Text>
            <Text style={styles.email}>Log in to track orders, save addresses and check out faster.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' }}>
              <Button title="Log in" onPress={() => navigation.navigate('Login')} style={{ flex: 1 }} />
              <Button title="Register" variant="outline" onPress={() => navigation.navigate('Register')} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </View>

      {isLoggedIn ? (
        <View style={styles.group}>
          <ListItem icon="receipt-outline" title="My orders" onPress={() => navigation.navigate('Orders')} />
          <Divider />
          <ListItem icon="location-outline" title="Address book" onPress={() => navigation.navigate('Addresses')} />
          <Divider />
          <ListItem icon="heart-outline" title="Wishlist" onPress={() => navigation.navigate('Tabs', { screen: 'Wishlist' })} />
          <Divider />
          <ListItem icon="person-outline" title="My details" onPress={() => navigation.navigate('EditProfile')} />
          <Divider />
          <ListItem icon="key-outline" title="Change password" onPress={() => navigation.navigate('ChangePassword')} />
          <Divider />
          <ListItem
            icon="mail-outline"
            title="Newsletter"
            right={
              <Switch
                value={!!me?.newsletter}
                onValueChange={toggleNewsletter}
                disabled={newsletterBusy || profile.isLoading}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </View>
      ) : null}

      {init && init.currencies.length > 1 ? (
        <View style={[styles.group, { padding: spacing.lg, paddingBottom: 0 }]}>
          <SelectField
            label="Currency"
            searchable={false}
            value={init.settings.currency}
            options={init.currencies.map((c) => ({ value: c.code, label: `${c.title} (${c.symbol_left || c.symbol_right})` }))}
            onChange={(code) => changeCurrency(String(code))}
          />
        </View>
      ) : null}

      {pages.data?.informations.length ? (
        <View style={styles.group}>
          {pages.data.informations.map((p, i) => (
            <View key={p.information_id}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                icon="document-text-outline"
                title={p.title}
                onPress={() => navigation.navigate('Information', { informationId: p.information_id, title: p.title })}
              />
            </View>
          ))}
        </View>
      ) : null}

      {init ? (
        <View style={styles.group}>
          {init.store.telephone ? (
            <ListItem icon="call-outline" title="Call us" subtitle={init.store.telephone} onPress={() => Linking.openURL(`tel:${init.store.telephone}`)} />
          ) : null}
          <Divider />
          {init.store.email ? (
            <ListItem icon="mail-open-outline" title="Email us" subtitle={init.store.email} onPress={() => Linking.openURL(`mailto:${init.store.email}`)} />
          ) : null}
        </View>
      ) : null}

      {isLoggedIn ? (
        <View style={styles.group}>
          <ListItem icon="log-out-outline" title="Log out" danger onPress={confirmLogout} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.onPrimary, fontSize: font.title, fontWeight: '700' },
  name: { fontSize: font.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  email: { fontSize: font.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm },
  stat: { color: colors.primaryDark, fontSize: font.small, fontWeight: '600' },
  group: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
