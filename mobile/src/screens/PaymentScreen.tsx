import React, { useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { Button } from '../components/ui';
import { config } from '../config';
import { cartKey } from '../hooks/useCart';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

// Matches both "route=checkout/success" and SEO URLs such as ".../checkout-success"
const SUCCESS = /checkout[/%2F-]+success/i;
const FAILURE = /checkout[/%2F-]+failure/i;

/**
 * Hosts the store's payment page (extension/mobile_api/api/checkout.pay) so any
 * OpenCart payment gateway works. The page shares the app session through a
 * cookie; when the gateway lands on checkout/success we finish in the app.
 */
export default function PaymentScreen({ route, navigation }: Props) {
  const { url, orderId } = route.params;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const finished = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() =>
            Alert.alert('Cancel payment?', 'Your order will not be completed.', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Cancel payment', style: 'destructive', onPress: () => navigation.goBack() },
            ])
          }
          hitSlop={10}
        >
          <Text style={{ color: colors.onTertiary, fontSize: 16 }}>Cancel</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    try {
      await api.checkout.complete();
    } catch {
      // the success page already cleared the cart on the server
    }
    queryClient.invalidateQueries({ queryKey: cartKey });
    queryClient.removeQueries({ queryKey: ['checkout'] });
    navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'OrderSuccess', params: { orderId } }] });
  };

  const onNavigation = (nav: WebViewNavigation) => {
    if (SUCCESS.test(nav.url)) {
      finish();
    } else if (FAILURE.test(nav.url) && !finished.current) {
      finished.current = true;
      Alert.alert('Payment failed', 'The payment was not completed. Please try again or choose another payment method.');
      navigation.goBack();
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }}>
        <Text style={{ marginBottom: spacing.lg, color: colors.text }}>Online payment opens in a new browser tab. Come back here when you are done.</Text>
        <Button title="Open payment page" onPress={() => Linking.openURL(url)} />
        <Button title="I have paid" variant="outline" onPress={finish} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <WebView
        source={{ uri: url, headers: { 'X-Api-Key': config.apiKey } }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        onNavigationStateChange={onNavigation}
        onShouldStartLoadWithRequest={(req) => {
          if (SUCCESS.test(req.url)) {
            finish();
          }
          return true;
        }}
        onLoadEnd={() => setLoading(false)}
        setSupportMultipleWindows={false}
      />
      {loading ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
