import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, font, radius, spacing } from '../theme';
import { TypeSelector } from '../components/TypeSelector';
import { ColorBlindType, COLOR_BLIND_TYPES } from '../utils/colorCorrection';
import { saveType, isAtFreeLimit, savePhoto } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - spacing.md * 2;

/**
 * CSS filter values for each correction type.
 * These shift hue, boost saturation and contrast to make
 * the affected colour channels clearly distinguishable.
 *
 * Deuteranopia  — boost green-red contrast, slight warm hue shift
 * Protanopia    — shift reds toward orange/yellow, boost saturation
 * Tritanopia    — shift blues toward cyan, boost warm tones
 */
const CORRECTION_FILTERS: Record<ColorBlindType, object> = {
  deuteranopia: {
    filter: [
      { saturate: 2.2 },
      { hueRotate: '25deg' },
      { contrast: 1.15 },
      { brightness: 1.05 },
    ],
  },
  protanopia: {
    filter: [
      { saturate: 2.0 },
      { hueRotate: '-20deg' },
      { contrast: 1.2 },
      { brightness: 1.05 },
    ],
  },
  tritanopia: {
    filter: [
      { saturate: 1.8 },
      { hueRotate: '180deg' },
      { contrast: 1.1 },
      { brightness: 1.0 },
    ],
  },
};

interface Props {
  onBack: () => void;
  onShowPaywall: () => void;
}

export function PhotoAdjustScreen({ onBack, onShowPaywall }: Props) {
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ColorBlindType>('deuteranopia');
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setOriginalUri(result.assets[0].uri);
      setSaved(false);
      setShowOriginal(false);
    }
  }, []);

  const handleTypeChange = useCallback(async (type: ColorBlindType) => {
    setActiveType(type);
    await saveType(type);
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!originalUri) return;
    const atLimit = await isAtFreeLimit();
    if (atLimit) { onShowPaywall(); return; }
    setLoading(true);
    try {
      const id = Date.now().toString();
      await savePhoto({
        id,
        uri: originalUri,
        thumbnailUri: originalUri,
        capturedAt: new Date().toISOString(),
        type: activeType,
      });
      setSaved(true);
      Alert.alert('Saved!', 'Photo added to your memory bank.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [originalUri, activeType, onShowPaywall]);

  const typeLabel = COLOR_BLIND_TYPES.find(t => t.id === activeType)?.label ?? '';
  const typeDescription = COLOR_BLIND_TYPES.find(t => t.id === activeType)?.description ?? '';
  const filterStyle = CORRECTION_FILTERS[activeType];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adjust Photo</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!originalUri ? (
          <TouchableOpacity style={styles.pickArea} onPress={pickPhoto} activeOpacity={0.8}>
            <Text style={styles.pickIcon}>🖼</Text>
            <Text style={styles.pickTitle}>Choose a photo</Text>
            <Text style={styles.pickSub}>
              Select any photo from your library — switch correction types to see the colours shift in real time
            </Text>
            <View style={styles.pickBtn}>
              <Text style={styles.pickBtnText}>Open Photo Library</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            {/* Image with live colour filter */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: originalUri }}
                style={[
                  styles.image,
                  !showOriginal && filterStyle,
                ]}
                resizeMode="cover"
              />

              {/* Correction badge */}
              <View style={styles.imageBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {showOriginal ? 'Original' : typeLabel}
                </Text>
              </View>

              {/* Toggle original button */}
              <TouchableOpacity
                style={styles.toggleBtn}
                onPressIn={() => setShowOriginal(true)}
                onPressOut={() => setShowOriginal(false)}
              >
                <Text style={styles.toggleBtnText}>
                  {showOriginal ? 'Release to see corrected' : 'Hold to see original'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info box */}
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Correcting for</Text>
              <Text style={styles.descType}>{typeLabel}</Text>
              <Text style={styles.descText}>{typeDescription}</Text>
            </View>

            {/* Type selector */}
            <Text style={styles.sectionLabel}>SWITCH CORRECTION TYPE</Text>
            <TypeSelector selected={activeType} onChange={handleTypeChange} />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickPhoto} activeOpacity={0.8}>
                <Text style={styles.secondaryBtnText}>Choose Different Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, saved && styles.primaryBtnSaved]}
                onPress={handleSave}
                disabled={loading || saved}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {saved ? '✓ Saved to Memory Bank' : 'Save to Memory Bank'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 80 },
  backText: { color: colors.accent, fontSize: font.size.md },
  title: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  pickArea: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  pickIcon: { fontSize: 48 },
  pickTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  pickSub: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center', lineHeight: 20 },
  pickBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  pickBtnText: { color: colors.white, fontWeight: font.weight.semibold, fontSize: font.size.sm },
  imageWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imageBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  badgeText: { color: colors.white, fontSize: font.size.xs, fontWeight: font.weight.medium },
  toggleBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  toggleBtnText: { color: colors.white, fontSize: font.size.xs },
  descBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descLabel: { color: colors.textMuted, fontSize: font.size.xs, marginBottom: 2 },
  descType: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold, marginBottom: 4 },
  descText: { color: colors.textMuted, fontSize: font.size.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryBtnSaved: { backgroundColor: '#2D9E6B' },
  primaryBtnText: { color: colors.white, fontSize: font.size.md, fontWeight: font.weight.semibold },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.textMuted, fontSize: font.size.md },
});
