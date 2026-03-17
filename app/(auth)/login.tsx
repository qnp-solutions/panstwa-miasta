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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInAsGuest } from '../../src/features/auth/services/authService';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { getErrorKey } from '../../src/services/firebase/errors';

const MAX_NICKNAME = 20;

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setNickname = useAuthStore((s) => s.setNickname);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmedName = name.trim();

  async function handleGuestLogin() {
    if (!trimmedName) {
      setError(t('nickname_required'));
      return;
    }
    if (trimmedName.length > MAX_NICKNAME) {
      setError(t('nickname_max', { max: MAX_NICKNAME }));
      return;
    }

    setError('');
    setLoading(true);
    try {
      await signInAsGuest(trimmedName);
      setNickname(trimmedName);
      router.replace('/(tabs)');
    } catch (err) {
      setError(t(getErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>{t('app_name')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('nickname_placeholder')}
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
          maxLength={MAX_NICKNAME}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleGuestLogin}
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, styles.primaryButton, loading && styles.disabled]}
          onPress={handleGuestLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('continue_as_guest')}</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={[styles.button, styles.socialButton]} disabled>
          <Text style={styles.socialButtonText}>{t('sign_in_with_google')}</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.socialButton]} disabled>
          <Text style={styles.socialButtonText}>{t('sign_in_with_apple')}</Text>
        </Pressable>
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
    marginBottom: 48,
  },
  input: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16213e',
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 8,
  },
  error: {
    color: '#E63946',
    fontSize: 13,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: 340,
  },
  button: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#4ecdc4',
  },
  socialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    opacity: 0.4,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonText: {
    color: '#aaa',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    marginVertical: 20,
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
