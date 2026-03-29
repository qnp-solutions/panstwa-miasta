import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCreateRoom } from '../../src/features/room/hooks/useCreateRoom';
import { useJoinRoom } from '../../src/features/room/hooks/useJoinRoom';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { ROOM_CODE_LENGTH } from '../../src/constants/game';

export default function HomeScreen() {
  const { t } = useTranslation('game');
  const { t: tc } = useTranslation();
  const nickname = useAuthStore((s) => s.nickname);
  const { create, loading: creating, error: createError } = useCreateRoom();
  const { join, loading: joining, error: joinError } = useJoinRoom();
  const [roomCode, setRoomCode] = useState('');

  const busy = creating || joining;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>{tc('app_name')}</Text>
        <Text style={styles.greeting}>
          {nickname ? `${nickname} 👋` : ''}
        </Text>

        {/* Create Game */}
        <Pressable
          style={[styles.button, styles.createButton, busy && styles.disabled]}
          onPress={create}
          disabled={busy}
        >
          {creating ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.createButtonText}>{t('create_game')}</Text>
          )}
        </Pressable>

        {createError ? <Text style={styles.error}>{createError}</Text> : null}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{tc('or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Join Game */}
        <TextInput
          style={styles.input}
          placeholder={t('enter_room_code')}
          placeholderTextColor="#666"
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => join(roomCode)}
          editable={!busy}
        />

        <Pressable
          style={[
            styles.button,
            styles.joinButton,
            (busy || roomCode.trim().length < ROOM_CODE_LENGTH) && styles.disabled,
          ]}
          onPress={() => join(roomCode)}
          disabled={busy || roomCode.trim().length < ROOM_CODE_LENGTH}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>{t('join')}</Text>
          )}
        </Pressable>

        {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 16,
    color: '#4ecdc4',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#4ecdc4',
  },
  createButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
  },
  joinButton: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#4ecdc4',
    marginTop: 12,
  },
  joinButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16213e',
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '600',
  },
  error: {
    color: '#E63946',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a4a',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 12,
    fontSize: 13,
  },
});
