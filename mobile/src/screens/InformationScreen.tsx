import React from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/endpoints';
import { HtmlView } from '../components/HtmlView';
import { ErrorState, Loading } from '../components/States';
import { config } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { errorMessage } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Information'>;

export default function InformationScreen({ route }: Props) {
  const { informationId } = route.params;
  const query = useQuery({ queryKey: ['information', informationId], queryFn: () => api.catalog.information(informationId) });

  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg }}>
      <HtmlView html={query.data.description} baseUrl={config.baseUrl} />
    </ScrollView>
  );
}
