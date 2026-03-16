import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import type { RoomDocument, RoundDocument, VoteDocument } from '../../types/firebase';

function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      return data as Record<string, unknown>;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return snapshot.data(options) as T;
    },
  };
}

export const roomConverter = createConverter<RoomDocument>();
export const roundConverter = createConverter<RoundDocument>();
export const voteConverter = createConverter<VoteDocument>();
