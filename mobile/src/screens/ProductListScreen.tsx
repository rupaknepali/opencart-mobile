import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductResults } from '../components/ProductResults';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

export default function ProductListScreen({ route }: Props) {
  return <ProductResults query={route.params.query} />;
}
