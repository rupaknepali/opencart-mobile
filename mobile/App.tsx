import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider, useStore } from './src/context/StoreContext';
import { applyTheme, colors } from './src/theme';

// NOTE: don't import screens or components that call StyleSheet.create() here.
// Their styles capture colour values when the module first loads, so they are
// require()d below only after the store's colours have been applied.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

let RootNavigator: React.ComponentType | null = null;

/**
 * Apply the store's colours, then load the navigator (and with it every screen) for the
 * first time. Must be a lazy require: an import would create the screens' styles with the
 * default colours before the store's colours are known.
 */
function loadNavigator(theme: Parameters<typeof applyTheme>[0]): React.ComponentType {
  if (!RootNavigator) {
    applyTheme(theme);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RootNavigator = require('./src/navigation/RootNavigator').default as React.ComponentType;
  }
  return RootNavigator;
}

function BootScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f6f7f9' }}>
      {error ? (
        <>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1b1f24', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: '#667085', textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={onRetry} style={{ marginTop: 24, backgroundColor: '#1b1f24', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#667085" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#667085' }}>Connecting to the store…</Text>
        </>
      )}
    </View>
  );
}

/**
 * Last-resort crash screen. Without it, an error while rendering any screen would
 * leave a blank white app in release builds. "Try again" remounts the whole tree.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null; attempt: number }> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook a crash reporter (e.g. Sentry) in here. Kept as a dev-only log for now.
    if (__DEV__) console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <BootScreen
          error={__DEV__ ? this.state.error.message : 'The app hit an unexpected problem. Please try again.'}
          onRetry={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}
        />
      );
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}

function Bootstrap() {
  const { init, loading, error, reload } = useStore();
  const ready = !loading && !error && !!init;

  const Navigator = ready ? loadNavigator(init.theme) : null;

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.tertiary,
        text: colors.onTertiary,
        border: colors.border,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready],
  );

  if (loading) return <BootScreen />;
  if (!Navigator) return <BootScreen error={error ?? 'Could not load the store.'} onRetry={reload} />;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={colors.tertiaryIsDark ? 'light' : 'dark'} />
      {/* Navigator is always the same module export, so its identity is stable across renders. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Navigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <StoreProvider>
            <Bootstrap />
          </StoreProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
