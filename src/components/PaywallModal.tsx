import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'annual') => void;
}

export function PaywallModal({ visible, onClose, onSubscribe }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>COLOUR BLIND — SEE COLOUR</Text>
          <Text style={styles.headline}>See every colour,{'\n'}keep every moment.</Text>
          <Text style={styles.sub}>
            Free users can save 5 photos. Upgrade to unlock unlimited memory, high-res exports, and custom colour profiles.
          </Text>

          <View style={styles.features}>
            {[
              'Unlimited memory bank',
              'High-resolution photo saves',
              'Custom colour profiles',
              'Share & export moments',
            ].map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.check}>✦</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onSubscribe('annual')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start Free Trial — £14.99/yr</Text>
            <Text style={styles.primaryBtnSub}>7 days free, then £14.99 per year</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => onSubscribe('monthly')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>£2.99 / month</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Cancel anytime. Billed via Apple. Prices may vary by region.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  close: {
    alignSelf: 'flex-end',
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: font.size.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    color: colors.text,
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  sub: {
    fontSize: font.size.md,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  check: {
    color: colors.accent,
    fontSize: font.size.sm,
  },
  featureText: {
    color: colors.text,
    fontSize: font.size.md,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  primaryBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: font.size.xs,
    marginTop: 4,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: font.size.md,
  },
  legal: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
