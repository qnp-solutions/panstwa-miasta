import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../../src/features/room/store/roomStore';
import { useRoundStore } from '../../../src/features/round/store/roundStore';
import { useAuthStore } from '../../../src/features/auth/store/authStore';
import { useRoundSubscription } from '../../../src/features/round/hooks/useRound';
import { leaveRoom, fetchAllRounds } from '../../../src/features/room/services/roomService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../src/services/firebase/config';
import type { PlayerSummary, RoundDocument, StoredCategoryBreakdown } from '../../../src/types/firebase';

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function ResultsScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { t } = useTranslation('game');
  const { t: tc } = useTranslation('categories');
  const router = useRouter();

  const room = useRoomStore((s) => s.room);
  const round = useRoundStore((s) => s.round);
  const uid = useAuthStore((s) => s.user?.uid);
  const [actionLoading, setActionLoading] = useState(false);
  const [allRounds, setAllRounds] = useState<RoundDocument[] | null>(null);

  const scoredRoundIndex = room
    ? room.status === 'game_over'
      ? room.currentRound
      : Math.max(0, room.currentRound - 1)
    : null;

  useRoundSubscription(roomCode ?? null, scoredRoundIndex);

  const isGameOver = room?.status === 'game_over';

  // Fetch all rounds when game is over for the full summary
  useEffect(() => {
    if (!isGameOver || !roomCode) return;
    fetchAllRounds(roomCode).then(setAllRounds).catch(() => {});
  }, [isGameOver, roomCode]);

  const leaderboard = useMemo(() => {
    if (!room) return [];
    return Object.values(room.players).sort((a, b) => b.totalScore - a.totalScore);
  }, [room]);

  const isHost = uid === room?.hostUid;

  if (!room || !roomCode) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4ecdc4" />
      </View>
    );
  }

  async function handleNextRound() {
    if (!roomCode) return;
    setActionLoading(true);
    try {
      const fn = httpsCallable(functions, 'startRound');
      await fn({ roomCode });
    } catch {
      setActionLoading(false);
    }
  }

  async function handleEndGame() {
    if (!roomCode) return;
    setActionLoading(true);
    try {
      await leaveRoom(roomCode);
      useRoomStore.getState().reset();
      useRoundStore.getState().reset();
      router.replace('/');
    } catch {
      setActionLoading(false);
    }
  }

  function getReasonLabel(item: StoredCategoryBreakdown): string {
    switch (item.reason) {
      case 'bonus': return t('results.bonus', { points: item.points });
      case 'unique': return t('results.unique', { points: item.points });
      case 'shared': return t('results.shared', { points: item.points });
      case 'vote_tie': return t('results.vote_tie', { points: item.points });
      case 'invalid': return t('results.invalid');
      case 'empty': return t('results.empty');
      default: return '';
    }
  }

  function getReasonColor(reason: StoredCategoryBreakdown['reason']): string {
    switch (reason) {
      case 'bonus': return '#FFD700';
      case 'unique': return '#4ecdc4';
      case 'shared': return '#888';
      case 'vote_tie': return '#f0ad4e';
      case 'invalid': return '#E63946';
      default: return '#444';
    }
  }

  // Use allRounds for game_over, or single round for mid-game results
  const roundsToShow: RoundDocument[] = isGameOver
    ? (allRounds ?? (round ? [round] : []))
    : (round ? [round] : []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isGameOver
            ? t('results.game_over')
            : t('results.round_results', { round: (scoredRoundIndex ?? 0) + 1 })}
        </Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Podium (game over only) */}
        {isGameOver && leaderboard.length >= 2 && (
          <View style={styles.podiumContainer}>
            {/* Render in visual order: 2nd, 1st, 3rd */}
            {[1, 0, 2].map((rankIndex) => {
              const player = leaderboard[rankIndex];
              if (!player) return null;
              const podiumHeight = rankIndex === 0 ? 100 : rankIndex === 1 ? 70 : 50;
              return (
                <View key={player.uid} style={styles.podiumSlot}>
                  <View style={[styles.podiumAvatar, { backgroundColor: player.avatarColor }]}>
                    <Text style={styles.podiumAvatarText}>
                      {player.nickname.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.podiumNickname} numberOfLines={1}>{player.nickname}</Text>
                  <Text style={styles.podiumScore}>
                    {t('results.points', { count: player.totalScore })}
                  </Text>
                  <View style={[styles.podiumBar, { height: podiumHeight, backgroundColor: PODIUM_COLORS[rankIndex] }]}>
                    <Text style={styles.podiumPlace}>{rankIndex + 1}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isGameOver ? t('results.final_ranking') : t('results.total_score')}
          </Text>
          {leaderboard.map((player, index) => (
            <LeaderboardRow
              key={player.uid}
              player={player}
              rank={index + 1}
              isCurrentUser={player.uid === uid}
              roundScore={round?.scores?.[player.uid] ?? 0}
              isGameOver={!!isGameOver}
              t={t}
            />
          ))}
        </View>

        {/* Per-round breakdown */}
        {roundsToShow.map((r) => (
          <RoundBreakdown
            key={r.roundIndex}
            roundDoc={r}
            room={room}
            categories={room.categories}
            t={t}
            tc={tc}
            getReasonLabel={getReasonLabel}
            getReasonColor={getReasonColor}
          />
        ))}
      </ScrollView>

      {/* Action buttons */}
      {isGameOver ? (
        <Pressable
          style={[styles.actionButton, actionLoading && styles.disabled]}
          onPress={handleEndGame}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.actionButtonText}>{t('results.end_game')}</Text>
          )}
        </Pressable>
      ) : isHost ? (
        <Pressable
          style={[styles.actionButton, actionLoading && styles.disabled]}
          onPress={handleNextRound}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.actionButtonText}>{t('results.next_round')}</Text>
          )}
        </Pressable>
      ) : null}

      {!isHost && !isGameOver && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>{t('lobby.waiting_for_host')}</Text>
        </View>
      )}
    </View>
  );
}

function RoundBreakdown({
  roundDoc,
  room,
  categories,
  t,
  tc,
  getReasonLabel,
  getReasonColor,
}: {
  roundDoc: RoundDocument;
  room: { players: Record<string, PlayerSummary> };
  categories: string[];
  t: (key: string, opts?: Record<string, unknown>) => string;
  tc: (key: string) => string;
  getReasonLabel: (item: StoredCategoryBreakdown) => string;
  getReasonColor: (reason: StoredCategoryBreakdown['reason']) => string;
}) {
  const hasBreakdown = !!roundDoc.scoreBreakdown;

  return (
    <View style={styles.section}>
      <View style={styles.roundHeader}>
        <Text style={styles.sectionTitle}>
          {t('results.round_label', { round: roundDoc.roundIndex + 1 })}
        </Text>
        <View style={styles.roundLetterBadge}>
          <Text style={styles.roundLetterText}>{roundDoc.letter}</Text>
        </View>
      </View>

      {Object.keys(room.players).map((playerUid) => {
        const player = room.players[playerUid];
        const breakdown = hasBreakdown ? (roundDoc.scoreBreakdown?.[playerUid] ?? []) : [];
        const answers = roundDoc.playerAnswers[playerUid]?.answers ?? {};

        return (
          <View key={playerUid} style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.avatar, { backgroundColor: player.avatarColor }]}>
                <Text style={styles.avatarText}>
                  {player.nickname.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.breakdownName}>{player.nickname}</Text>
              <Text style={styles.breakdownRoundScore}>
                +{roundDoc.scores?.[playerUid] ?? 0}
              </Text>
            </View>

            {categories.map((cat, catIndex) => {
              if (hasBreakdown) {
                const item = breakdown[catIndex];
                if (!item) return null;
                const isEmpty = item.reason === 'empty';
                return (
                  <View key={cat} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCategory}>{tc(cat)}</Text>
                    <View style={styles.breakdownAnswerCol}>
                      <Text
                        style={[styles.breakdownAnswer, isEmpty && styles.emptyAnswer]}
                        numberOfLines={1}
                      >
                        {isEmpty ? '—' : item.answer}
                      </Text>
                      {!isEmpty && (item.validVotes > 0 || item.invalidVotes > 0) && (
                        <Text style={styles.voteCount}>
                          {t('results.votes', { valid: item.validVotes, invalid: item.invalidVotes })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.breakdownPointsCol}>
                      {!isEmpty && (
                        <>
                          <Text style={[styles.pointsBadge, { color: getReasonColor(item.reason) }]}>
                            {item.points > 0 ? `+${item.points}` : '0'}
                          </Text>
                          <Text style={[styles.reasonLabel, { color: getReasonColor(item.reason) }]}>
                            {getReasonLabel(item)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              }

              // Fallback without breakdown
              const answer = answers[cat] ?? '';
              return (
                <View key={cat} style={styles.breakdownRow}>
                  <Text style={styles.breakdownCategory}>{tc(cat)}</Text>
                  <View style={styles.breakdownAnswerCol}>
                    <Text
                      style={[styles.breakdownAnswer, !answer.trim() && styles.emptyAnswer]}
                      numberOfLines={1}
                    >
                      {answer.trim() || '—'}
                    </Text>
                  </View>
                  <View style={styles.breakdownPointsCol} />
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function LeaderboardRow({
  player,
  rank,
  isCurrentUser,
  roundScore,
  isGameOver,
  t,
}: {
  player: PlayerSummary;
  rank: number;
  isCurrentUser: boolean;
  roundScore: number;
  isGameOver: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <View style={[styles.leaderRow, isCurrentUser && styles.leaderRowCurrent]}>
      <Text style={[styles.rank, rank <= 3 && { color: PODIUM_COLORS[rank - 1] }]}>{rank}</Text>
      <View style={[styles.avatar, { backgroundColor: player.avatarColor }]}>
        <Text style={styles.avatarText}>
          {player.nickname.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.leaderName, isCurrentUser && styles.leaderNameCurrent]}>
        {player.nickname}
      </Text>
      <View style={styles.scoreCol}>
        <Text style={styles.totalScore}>
          {t('results.points', { count: player.totalScore })}
        </Text>
        {!isGameOver && roundScore > 0 && (
          <Text style={styles.roundScoreDelta}>+{roundScore}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  podiumSlot: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  podiumAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  podiumNickname: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumScore: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumPlace: {
    color: '#1a1a2e',
    fontSize: 24,
    fontWeight: '900',
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roundLetterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  roundLetterText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '800',
  },
  // Leaderboard
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  leaderRowCurrent: {
    borderColor: '#4ecdc4',
  },
  rank: {
    color: '#888',
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  leaderNameCurrent: {
    color: '#4ecdc4',
  },
  scoreCol: {
    alignItems: 'flex-end',
  },
  totalScore: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  roundScoreDelta: {
    color: '#4ecdc4',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Breakdown
  breakdownCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  breakdownRoundScore: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  breakdownCategory: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    width: 70,
  },
  breakdownAnswerCol: {
    flex: 1,
    marginHorizontal: 8,
  },
  breakdownAnswer: {
    color: '#fff',
    fontSize: 14,
  },
  emptyAnswer: {
    color: '#444',
  },
  voteCount: {
    color: '#666',
    fontSize: 10,
    marginTop: 1,
  },
  breakdownPointsCol: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  pointsBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  // Actions
  actionButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
  },
  waitingBanner: {
    marginHorizontal: 24,
    marginBottom: 32,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
