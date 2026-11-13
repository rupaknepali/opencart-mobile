import { Alert } from 'react-native';
import { ApiError } from '../api/client';
import type { FieldErrors } from '../api/types';

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export function fieldErrors(error: unknown): FieldErrors {
  return error instanceof ApiError ? error.errors : {};
}

export function showError(error: unknown, title = 'Sorry') {
  Alert.alert(title, errorMessage(error));
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
