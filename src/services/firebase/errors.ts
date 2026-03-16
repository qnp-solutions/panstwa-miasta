import type { FirebaseError } from 'firebase/app';

const ERROR_MAP: Record<string, string> = {
  'auth/network-request-failed': 'error_network',
  'auth/too-many-requests': 'error_too_many_requests',
  'auth/user-disabled': 'error_user_disabled',
  'auth/operation-not-allowed': 'error_operation_not_allowed',
  'functions/not-found': 'error_room_not_found',
  'functions/resource-exhausted': 'error_room_full',
  'functions/failed-precondition': 'error_game_already_started',
  'functions/permission-denied': 'error_not_host',
  'functions/unauthenticated': 'error_not_signed_in',
  'functions/invalid-argument': 'error_invalid_input',
};

/**
 * Maps a Firebase error to an i18n translation key.
 * Falls back to a generic error key if the code is unrecognised.
 */
export function getErrorKey(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as FirebaseError).code;
    return ERROR_MAP[code] ?? 'error';
  }
  return 'error';
}
