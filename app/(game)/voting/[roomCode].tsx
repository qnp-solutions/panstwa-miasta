import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../../src/features/room/store/roomStore';
import { useRoundStore } from '../../../src/features/round/store/roundStore';
import { useAuthStore } from '../../../src/features/auth/store/authStore';
import { useRoundSubscription } from '../../../src/features/round/hooks/useRound';
import { submitVotes } from '../../../src/features/room/services/roomService';
import type { VoteValue } from '../../../src/types/firebase';

export default function VotingScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { t } = useTranslation('game');
  const { t: tc } = useTranslation('categories');

  const room = useRoomStore((s) => s.room);
  const round = useRoundStore((s) => s.round);
  const uid = useAuthStore((s) => s.user?.uid);

  const [votes, setVotes] = useState<Record<string, VoteValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRoundSubscription(roomCode ?? null, room?.currentRound ?? null);

  // Other players (everyone except current user)
  const otherPlayers = useMemo(() => {
    if (!room || !uid) return [];
    return Object.values(room.players).filter((p) => p.uid !== uid);
  }, [room, uid]);

  if (!room || !round || !roomCode || !uid) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4ecdc4" />
      </View>
    );
  }

  const categories = room.categories;

  function setVote(targetUid: string, categoryKey: string, value: VoteValue) {
    if (submitted) return;
    const key = `${targetUid}_${categoryKey}`;
    setVotes((prev) => ({ ...prev, [key]: value }));
  }

  function getVote(targetUid: string, categoryKey: string): VoteValue | undefined {
    return votes[`${targetUid}_${categoryKey}`];
  }

  async function handleSubmitVotes() {
    if (!roomCode || !uid || round === null) return;
    setSubmitting(true);
    setError(null);
    try {
      // Default unvoted answers to 'valid'
      const finalVotes: Record<string, VoteValue> = {};
      for (const player of otherPlayers) {
        for (const cat of categories) {
          const key = `${player.uid}_${cat}`;
          finalVotes[key] = votes[key] ?? 'valid';
        }
      }
      await submitVotes(roomCode, round.roundIndex, uid, finalVotes);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit votes');
    } finally {
      setSubmitting(false);
    }
  }

  // Count how many votes have been submitted (from round doc vote subcollection isn't visible,
  // but room status will change to 'scoring'/'results' when processVotes CF runs)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('voting.title')}</Text>
        <View style={styles.letterBadge}>
          <Text style={styles.letterText}>{round.letter}</Text>
        </View>
      </View>

      {/* Scrollable voting area */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {otherPlayers.map((player) => (
          <View key={player.uid} style={styles.playerSection}>
            {/* Player header */}
            <View style={styles.playerHeader}>
              <View style={[styles.avatar, { backgroundColor: player.avatarColor }]}>
                <Text style={styles.avatarText}>
                  {player.nickname.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.playerName}>{player.nickname}</Text>
            </View>

            {/* Player's answers per category */}
            {categories.map((cat) => {
              const answer = round.playerAnswers[player.uid]?.answers[cat] ?? '';
              const vote = getVote(player.uid, cat);
              const isEmpty = !answer.trim();

              return (
                <View key={cat} style={styles.answerRow}>
                  <View style={styles.answerInfo}>
                    <Text style={styles.categoryLabel}>{tc(cat)}</Text>
                    <Text style={[styles.answerText, isEmpty && styles.emptyAnswer]}>
                      {isEmpty ? '—' : answer}
                    </Text>
                  </View>

                  {!isEmpty && (
                    <View style={styles.voteButtons}>
                      <Pressable
                        style={[
                          styles.voteBtn,
                          (!vote || vote === 'valid') && styles.voteBtnValidDefault,
                          vote === 'valid' && styles.voteBtnValid,
                        ]}
                        onPress={() => setVote(player.uid, cat, 'valid')}
                        disabled={submitted}
                      >
                        <Text
                          style={[
                            styles.voteBtnText,
                            !vote && styles.voteBtnTextValidUnselected,
                            vote === 'valid' && styles.voteBtnTextValidSelected,
                          ]}
                        >
                          {t('voting.vote_valid')}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.voteBtn,
                          vote === 'invalid' && styles.voteBtnInvalid,
                        ]}
                        onPress={() => setVote(player.uid, cat, 'invalid')}
                        disabled={submitted}
                      >
                        <Text
                          style={[
                            styles.voteBtnText,
                            vote === 'invalid' && styles.voteBtnTextInvalidSelected,
                          ]}
                        >
                          {t('voting.vote_invalid')}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Submit votes button */}
      {submitted ? (
        <View style={styles.submittedBanner}>
          <Text style={styles.submittedText}>
            {t('voting.waiting_for_votes', {
              done: '?',
              total: Object.keys(room.players).length,
            })}
          </Text>
        </View>
      ) : (
        <Pressable
          style={[styles.submitButton, submitting && styles.disabled]}
          onPress={handleSubmitVotes}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.submitButtonText}>{t('voting.submit_votes')}</Text>
          )}
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  letterBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    color: '#1a1a2e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  playerSection: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  answerInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  answerText: {
    color: '#fff',
    fontSize: 15,
  },
  emptyAnswer: {
    color: '#444',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  voteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  voteBtnValidDefault: {
    borderColor: '#4ecdc4',
  },
  voteBtnValid: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  voteBtnInvalid: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  voteBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  voteBtnTextValidUnselected: {
    color: '#4ecdc4',
  },
  voteBtnTextValidSelected: {
    color: '#1a1a2e',
  },
  voteBtnTextInvalidSelected: {
    color: '#fff',
  },
  submitButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
  },
  submittedBanner: {
    marginHorizontal: 24,
    marginBottom: 32,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittedText: {
    color: '#4ecdc4',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: '#E63946',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
});
