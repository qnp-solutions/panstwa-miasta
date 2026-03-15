import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { RoomDocument } from '../shared/types';

const db = getFirestore();

const LeaveRoomSchema = z.object({ roomCode: z.string().length(6) });

export const leaveRoom = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const parsed = LeaveRoomSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

  const { roomCode } = parsed.data;
  const { uid } = request.auth;

  const roomRef = db.collection('rooms').doc(roomCode);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) return { success: true }; // already gone

  const room = roomSnap.data() as RoomDocument;
  const updatedPlayers = { ...room.players };
  delete updatedPlayers[uid];

  if (Object.keys(updatedPlayers).length === 0) {
    // Last player leaving — delete the room
    await roomRef.delete();
    return { success: true };
  }

  const updates: Record<string, unknown> = {
    [`players.${uid}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Reassign host if the host is leaving
  if (room.hostUid === uid) {
    const newHostUid = Object.keys(updatedPlayers)[0];
    updates['hostUid'] = newHostUid;
    updates[`players.${newHostUid}.isHost`] = true;
  }

  await roomRef.update(updates);
  return { success: true };
});
