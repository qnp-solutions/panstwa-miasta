import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../../src/features/room/store/roomStore';
import { useRoundStore } from '../../../src/features/round/store/roundStore';
import { useAuthStore } from '../../../src/features/auth/store/authStore';
import { useRoundSubscription } from '../../../src/features/round/hooks/useRound';
import { useSubmitAnswers } from '../../../src/features/round/hooks/useSubmitAnswers';
import { callEndRound } from '../../../src/features/room/services/roomService';

export default function CountdownScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { t } = useTranslation('game');
  const { t: tc } = useTranslation('categories');

  const room = useRoomStore((s) => s.room);
  const round = useRoundStore((s) => s.round);
  const localAnswers = useRoundStore((s) => s.localAnswers);
  const activeCategoryIndex = useRoundStore((s) => s.activeCategoryIndex);
  const submitted = useRoundStore((s) => s.submitted);
  const setLocalAnswer = useRoundStore((s) => s.setLocalAnswer);
  const setActiveCategoryIndex = useRoundStore((s) => s.setActiveCategoryIndex);
  const uid = useAuthStore((s) => s.user?.uid);

  const { submit, loading: submitting, error: submitError } = useSubmitAnswers();
  const inputRef = useRef<TextInput>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Subscribe to the round document
  useRoundSubscription(roomCode ?? null, room?.currentRound ?? null);

  // Check if already submitted
  useEffect(() => {
    if (round && uid && round.playerAnswers[uid]?.submittedAt) {
      useRoundStore.getState().setSubmitted(true);
    }
  }, [round, uid]);

  const endRoundCalled = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (!round?.countdownEndsAt) return;

    const endMs = round.countdownEndsAt.toMillis();

    function tick() {
      const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setTimeLeft(remaining);

      // When countdown expires, call endRound CF (once)
      if (remaining === 0 && roomCode && !endRoundCalled.current) {
        endRoundCalled.current = true;
        callEndRound(roomCode).catch(() => {
          // Reset so another attempt can be made
          endRoundCalled.current = false;
        });
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [round?.countdownEndsAt, roomCode]);

  if (!room || !round || !roomCode) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4ecdc4" />
      </View>
    );
  }

  const categories = room.categories;
  const activeCategory = categories[activeCategoryIndex];
  const letter = round.letter;

  // Find who finished first
  const firstFinisher = Object.values(round.playerAnswers).find((p) => p.finishedFirst);
  const firstFinisherNickname = firstFinisher
    ? room.players[firstFinisher.uid]?.nickname
    : null;

  function handleCategoryPress(index: number) {
    setActiveCategoryIndex(index);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleNext() {
    if (activeCategoryIndex < categories.length - 1) {
      setActiveCategoryIndex(activeCategoryIndex + 1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Countdown banner */}
      <View style={styles.countdownBanner}>
        {firstFinisherNickname && (
          <Text style={styles.finisherText}>
            {t('round.finished_first', { nickname: firstFinisherNickname, suffix: '' })}
          </Text>
        )}
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>
            {timeLeft != null ? t('round.time_left', { seconds: timeLeft }) : '...'}
          </Text>
        </View>
      </View>

      {/* Header: Letter */}
      <View style={styles.header}>
        <View style={styles.letterCircle}>
          <Text style={styles.letterText}>{letter}</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat, i) => {
          const hasAnswer = (localAnswers[cat] ?? '').trim().length > 0;
          const isActive = i === activeCategoryIndex;
          return (
            <Pressable
              key={cat}
              style={[
                styles.tab,
                isActive && styles.tabActive,
                hasAnswer && !isActive && styles.tabFilled,
              ]}
              onPress={() => handleCategoryPress(i)}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                  hasAnswer && !isActive && styles.tabTextFilled,
                ]}
                numberOfLines={1}
              >
                {tc(cat)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputArea}>
        <Text style={styles.inputLabel}>{tc(activeCategory)}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={localAnswers[activeCategory] ?? ''}
          onChangeText={(text) => setLocalAnswer(activeCategory, text)}
          placeholder={`${tc(activeCategory)}...`}
          placeholderTextColor="#555"
          autoFocus
          editable={!submitted}
          returnKeyType={activeCategoryIndex < categories.length - 1 ? 'next' : 'done'}
          onSubmitEditing={
            activeCategoryIndex < categories.length - 1 ? handleNext : undefined
          }
        />
      </View>

      {/* Answers overview */}
      <ScrollView style={styles.overview} contentContainerStyle={styles.overviewContent}>
        {categories.map((cat, i) => {
          const answer = localAnswers[cat] ?? '';
          const isActive = i === activeCategoryIndex;
          return (
            <Pressable
              key={cat}
              style={[styles.overviewRow, isActive && styles.overviewRowActive]}
              onPress={() => handleCategoryPress(i)}
            >
              <Text style={styles.overviewCategory}>{tc(cat)}</Text>
              <Text
                style={[styles.overviewAnswer, !answer && styles.overviewEmpty]}
                numberOfLines={1}
              >
                {answer || '—'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Submit button */}
      {submitted ? (
        <View style={styles.submittedBanner}>
          <Text style={styles.submittedText}>{t('round.done')}</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.submitButton, submitting && styles.disabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.submitButtonText}>{t('round.done')}</Text>
          )}
        </Pressable>
      )}

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  countdownBanner: {
    backgroundColor: '#E63946',
    paddingTop: 52,
    paddingBottom: 12,
    alignItems: 'center',
  },
  finisherText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  letterCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    color: '#1a1a2e',
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexGrow: 0,
    maxHeight: 44,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  tabActive: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  tabFilled: {
    borderColor: '#4ecdc4',
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1a1a2e',
  },
  tabTextFilled: {
    color: '#4ecdc4',
  },
  inputArea: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  inputLabel: {
    color: '#4ecdc4',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#4ecdc4',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 18,
  },
  overview: {
    flex: 1,
    marginTop: 12,
  },
  overviewContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  overviewRowActive: {
    backgroundColor: '#16213e',
  },
  overviewCategory: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  overviewAnswer: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  overviewEmpty: {
    color: '#444',
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
    fontSize: 17,
    fontWeight: '700',
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
