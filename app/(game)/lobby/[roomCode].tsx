import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useRoomStore } from '../../../src/features/room/store/roomStore';
import { useAuthStore } from '../../../src/features/auth/store/authStore';
import { leaveRoom } from '../../../src/features/room/services/roomService';
import { MIN_PLAYERS } from '../../../src/constants/game';
import type { PlayerSummary } from '../../../src/types/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../src/services/firebase/config';
import { useState } from 'react';

export default function LobbyScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { t } = useTranslation('game');
  const { t: tc } = useTranslation();
  const room = useRoomStore((s) => s.room);
  const reset = useRoomStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  if (!room || !roomCode) return null;

  const players = Object.values(room.players) as PlayerSummary[];
  const isHost = user?.uid === room.hostUid;
  const canStart = players.length >= MIN_PLAYERS;

  async function handleCopy() {
    await Clipboard.setStringAsync(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    try {
      await leaveRoom(roomCode);
    } catch {}
    reset();
    router.replace('/(tabs)');
  }

  async function handleStart() {
    setStarting(true);
    try {
      const fn = httpsCallable(functions, 'startRound');
      await fn({ roomCode });
    } catch (err) {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={handleLeave}>
        <Text style={styles.backText}>{tc('back')}</Text>
      </Pressable>

      <Text style={styles.heading}>{t('lobby.room_code')}</Text>
      <Pressable onPress={handleCopy}>
        <Text style={styles.code}>{roomCode}</Text>
        <Text style={styles.copyHint}>
          {copied ? tc('copied') : tc('copy')}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>
        {t('lobby.players')} ({players.length})
      </Text>

      <FlatList
        data={players}
        keyExtractor={(p) => p.uid}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.avatarText}>
                {item.nickname.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.playerName}>
              {item.nickname}
              {item.isHost ? ' ⭐' : ''}
            </Text>
          </View>
        )}
      />

      <View style={styles.info}>
        <Text style={styles.infoText}>
          {t('lobby.rounds')}: {room.totalRounds}
        </Text>
        <Text style={styles.infoText}>
          {t('lobby.countdown')}: {room.countdownDuration}s
        </Text>
        <Text style={styles.infoText}>
          {t('lobby.categories')}: {room.categories.length}
        </Text>
      </View>

      {isHost ? (
        <Pressable
          style={[styles.startButton, (!canStart || starting) && styles.disabled]}
          onPress={handleStart}
          disabled={!canStart || starting}
        >
          <Text style={styles.startButtonText}>
            {canStart
              ? t('lobby.start_game')
              : t('lobby.min_players', { count: MIN_PLAYERS })}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.waitingText}>{t('lobby.waiting_for_host')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },
  backText: {
    color: '#4ecdc4',
    fontSize: 16,
  },
  heading: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  code: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: 4,
  },
  copyHint: {
    color: '#4ecdc4',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
    maxHeight: 260,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
  },
  infoText: {
    color: '#888',
    fontSize: 13,
  },
  startButton: {
    backgroundColor: '#4ecdc4',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  startButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  waitingText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
});
