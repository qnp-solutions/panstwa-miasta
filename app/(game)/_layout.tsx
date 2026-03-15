import { Stack } from 'expo-router';

/**
 * Game layout — will host the single Firestore room listener
 * and auto-navigate players based on room.status.
 * Implemented in Step 4 (room creation + lobby task).
 */
export default function GameLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
