import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createRoom } from '../services/roomService';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../../auth/store/authStore';
import { getErrorKey } from '../../../services/firebase/errors';
import { DEFAULT_CATEGORIES_PL, DEFAULT_CATEGORIES_EN } from '../../../constants/categories';
import { DEFAULT_COUNTDOWN_SECONDS, DEFAULT_ROUNDS } from '../../../constants/game';
import type { Language } from '../../../types/game';

export function useCreateRoom() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const nickname = useAuthStore((s) => s.nickname);
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    setError('');
    setLoading(true);

    const language = (i18n.language === 'pl' ? 'pl' : 'en') as Language;
    const categories =
      language === 'pl'
        ? [...DEFAULT_CATEGORIES_PL]
        : [...DEFAULT_CATEGORIES_EN];

    try {
      const roomCode = await createRoom({
        nickname,
        language,
        categories,
        totalRounds: DEFAULT_ROUNDS,
        countdownDuration: DEFAULT_COUNTDOWN_SECONDS,
      });
      setRoomCode(roomCode);
      router.push(`/(game)/lobby/${roomCode}` as Href);
    } catch (err) {
      setError(t(getErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  return { create, loading, error };
}
