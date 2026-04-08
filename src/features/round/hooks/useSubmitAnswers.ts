import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitAnswers } from '../../room/services/roomService';
import { useRoundStore } from '../store/roundStore';
import { useRoomStore } from '../../room/store/roomStore';
import { useAuthStore } from '../../auth/store/authStore';
import { getErrorKey } from '../../../services/firebase/errors';

export function useSubmitAnswers() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const localAnswers = useRoundStore((s) => s.localAnswers);
  const setSubmitted = useRoundStore((s) => s.setSubmitted);
  const roomCode = useRoomStore((s) => s.roomCode);
  const room = useRoomStore((s) => s.room);
  const uid = useAuthStore((s) => s.user?.uid);

  async function submit() {
    if (!roomCode || !room || !uid) return;

    setError('');
    setLoading(true);

    try {
      await submitAnswers(roomCode, room.currentRound, uid, localAnswers);
      setSubmitted(true);
    } catch (err) {
      setError(t(getErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
