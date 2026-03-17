import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { joinRoom } from '../services/roomService';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../../auth/store/authStore';
import { getErrorKey } from '../../../services/firebase/errors';
import { ROOM_CODE_LENGTH } from '../../../constants/game';

export function useJoinRoom() {
  const { t } = useTranslation();
  const router = useRouter();
  const nickname = useAuthStore((s) => s.nickname);
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function join(code: string) {
    const trimmed = code.trim().toUpperCase();

    if (trimmed.length !== ROOM_CODE_LENGTH) {
      setError(t('error_invalid_input'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const roomCode = await joinRoom({ roomCode: trimmed, nickname });
      setRoomCode(roomCode);
      router.push(`/(game)/lobby/${roomCode}` as Href);
    } catch (err) {
      setError(t(getErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  return { join, loading, error };
}
