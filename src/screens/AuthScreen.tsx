import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { signInWithEmail } from '../utils/supabase';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  onSkip: () => void;
}

export function AuthScreen({ onSkip }: Props) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.includes('@')) {
      Alert.alert('Please enter a valid email');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) {
      Alert.alert('Something went wrong', error);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.wordmark}>See Colour</Text>
          <Text style={styles.headline}>Save your moments{'\n'}to the cloud.</Text>
          <Text style={styles.sub}>
            Sign in to back up your memory bank and access it anywhere.
          </Text>

          {!sent ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Sending…' : 'Send Magic Link'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.sentBox}>
              <Text style={styles.sentIcon}>✉️</Text>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.sentSub}>
                We sent a link to {email}. Tap it to sign in.
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  wordmark: {
    color: colors.accent,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  headline: {
    color: colors.text,
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  sub: {
    color: colors.textMuted,
    fontSize: font.size.md,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.md,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.white,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  sentBox: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sentIcon: {
    fontSize: 40,
  },
  sentTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
  },
  sentSub: {
    color: colors.textMuted,
    fontSize: font.size.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  skipBtn: {
    alignItems: 'center',
    padding: spacing.md,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
});
