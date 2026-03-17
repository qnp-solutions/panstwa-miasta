import {
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  linkWithPopup,
  linkWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../../../services/firebase/config';

export async function signInAsGuest(nickname: string): Promise<void> {
  const { user } = await signInAnonymously(auth);
  await updateProfile(user, { displayName: nickname });
}

export async function upgradeToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user to upgrade');
  const provider = new GoogleAuthProvider();
  await linkWithPopup(auth.currentUser, provider);
}

export async function upgradeToApple(): Promise<void> {
  if (!auth.currentUser) throw new Error('No user to upgrade');
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  await linkWithPopup(auth.currentUser, provider);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
