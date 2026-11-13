import React, { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../theme';

/**
 * Renders store HTML (product descriptions, information pages) at its natural
 * height. Links open in the system browser.
 */
export function HtmlView({ html, baseUrl }: { html: string; baseUrl?: string }) {
  const [height, setHeight] = useState(40);

  if (Platform.OS === 'web') {
    // react-native-webview is native only; show plain text on web.
    return (
      <Text style={{ color: colors.text, lineHeight: 21 }}>
        {html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()}
      </Text>
    );
  }

  const htmlDoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.55; color: ${colors.text}; }
  img, iframe, video { max-width: 100% !important; height: auto !important; }
  table { width: 100% !important; border-collapse: collapse; }
  td, th { border: 1px solid ${colors.border}; padding: 6px; }
  a { color: ${colors.primary}; }
</style></head><body><div id="c">${html}</div>
<script>
  function post() { window.ReactNativeWebView.postMessage(String(document.getElementById('c').scrollHeight)); }
  window.addEventListener('load', post); setTimeout(post, 300); setTimeout(post, 1200);
</script></body></html>`;

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlDoc, baseUrl }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onMessage={(e: WebViewMessageEvent): void => {
          const h = Number(e.nativeEvent.data);
          if (h > 0) setHeight(h + 8);
        }}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('http') && req.navigationType === 'click') {
            Linking.openURL(req.url);
            return false;
          }
          return true;
        }}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
