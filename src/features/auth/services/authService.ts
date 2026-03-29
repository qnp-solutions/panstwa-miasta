import {
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  linkWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '../../../services/firebase/config';

export async function signInAsGuest(nickname: string): Promise<void> {
  const { user } = await signInAnonymously(auth);
  await updateProfile(user, { displayName: nickname });
}

/**
 * Upgrade anonymous account to Google.
 * On web: uses popup flow.
 * On native: throws — caller must use expo-auth-session to obtain an idToken
 * and call linkWithCredential(auth.currentUser, GoogleAuthProvider.credential(idToken)).
 */
export async function upgradeToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user to upgrade');
  if (Platform.OS !== 'web') {
    throw new Error(
      'upgradeToGoogle: on native, obtain an idToken via expo-auth-session and call linkWithCredential instead.',
    );
  }
  const provider = new GoogleAuthProvider();
  await linkWithPopup(auth.currentUser, provider);
}

/**
 * Upgrade anonymous account to Apple.
 * On web: uses popup flow.
 * On native: throws — caller must use expo-auth-session to obtain an identityToken
 * and call linkWithCredential(auth.currentUser, OAuthProvider.credential({idToken})).
 */
export async function upgradeToApple(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user to upgrade');
  if (Platform.OS !== 'web') {
    throw new Error(
      'upgradeToApple: on native, obtain an identityToken via expo-auth-session and call linkWithCredential instead.',
    );
  }
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  await linkWithPopup(auth.currentUser, provider);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
