import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { colors, font, radius, spacing } from '../theme';
import { TypeSelector } from '../components/TypeSelector';
import { ColorBlindType, COLOR_BLIND_TYPES } from '../utils/colorCorrection';
import {
  getSavedType,
  saveType,
  isAtFreeLimit,
  savePhoto,
  getPhotoCount,
} from '../utils/storage';

// Photo library icon — clean stacked photo cards with a colour dot
function LibraryIcon() {
  return (
    <View style={iconStyles.wrap}>
      {/* Shadow card behind */}
      <View style={[iconStyles.card, iconStyles.cardBack]} />
      {/* Main photo card */}
      <View style={iconStyles.card}>
        {/* Colour band across the top */}
        <View style={iconStyles.cardBand} />
        {/* Three colour dots representing the colour spectrum */}
        <View style={iconStyles.dotsRow}>
          <View style={[iconStyles.dot, { backgroundColor: '#FF6B6B' }]} />
          <View style={[iconStyles.dot, { backgroundColor: '#51CF66' }]} />
          <View style={[iconStyles.dot, { backgroundColor: '#339AF0' }]} />
        </View>
      </View>
    </View>
  );
}

// Memories icon — four-pointed sparkle star
function MemoriesIcon() {
  return (
    <View style={iconStyles.wrap}>
      <View style={iconStyles.sparkleV} />
      <View style={iconStyles.sparkleH} />
      <View style={iconStyles.sparkleDiag1} />
      <View style={iconStyles.sparkleDiag2} />
      {/* Centre dot */}
      <View style={iconStyles.sparkleDot} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Library cards
  cardBack: {
    position: 'absolute',
    transform: [{ rotate: '-8deg' }, { translateX: -1 }, { translateY: 2 }],
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  card: {
    width: 24, height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.88)',
    overflow: 'hidden',
  },
  cardBand: {
    height: 7,
    backgroundColor: 'rgba(123,97,255,0.75)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  dot: {
    width: 4, height: 4, borderRadius: 2,
  },

  // Sparkle
  sparkleV: {
    position: 'absolute',
    width: 2.5, height: 24,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  sparkleH: {
    position: 'absolute',
    width: 24, height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  sparkleDiag1: {
    position: 'absolute',
    width: 2, height: 14,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '45deg' }],
  },
  sparkleDiag2: {
    position: 'absolute',
    width: 2, height: 14,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '-45deg' }],
  },
  sparkleDot: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#fff',
  },
});

interface Props {
  onOpenGallery: () => void;
  onShowPaywall: () => void;
  onOpenPhotoAdjust: () => void;
}

export function CameraScreen({ onOpenGallery, onShowPaywall, onOpenPhotoAdjust }: Props) {
  const cameraPermission = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();

  const [activeType, setActiveType] = useState<ColorBlindType>('deuteranopia');
  const [photoCount, setPhotoCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const [showZoom, setShowZoom] = useState(false);
  const zoomHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedZoom = useRef(1);

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 8, 8); // cap at 8x

  useEffect(() => {
    (async () => {
      if (!cameraPermission.hasPermission) await cameraPermission.requestPermission();
      const saved = await getSavedType();
      setActiveType(saved);
      setPhotoCount(await getPhotoCount());
    })();
  }, []);

  // Show zoom badge briefly then hide
  const flashZoomBadge = useCallback((value: number) => {
    setZoomDisplay(Math.round(value * 10) / 10);
    setShowZoom(true);
    if (zoomHideTimer.current) clearTimeout(zoomHideTimer.current);
    zoomHideTimer.current = setTimeout(() => setShowZoom(false), 1500);
  }, []);

  // Pinch gesture for zoom (plain state — avoids worklets dependency)
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      savedZoom.current = zoom;
    })
    .onUpdate((e) => {
      const newZoom = Math.min(
        Math.max(savedZoom.current * e.scale, minZoom),
        maxZoom
      );
      setZoom(newZoom);
      flashZoomBadge(newZoom);
    })
    .onEnd(() => {
      savedZoom.current = zoom;
    });

  const handleTypeChange = useCallback(async (type: ColorBlindType) => {
    setActiveType(type);
    await saveType(type);
  }, []);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    const atLimit = await isAtFreeLimit();
    if (atLimit) { onShowPaywall(); return; }
    try {
      setCapturing(true);
      const photo = await photoOutput.capturePhoto({}, {});
      const filePath = await photo.saveToTemporaryFileAsync();
      photo.dispose();
      const id = Date.now().toString();
      await savePhoto({
        id,
        uri: `file://${filePath}`,
        thumbnailUri: `file://${filePath}`,
        capturedAt: new Date().toISOString(),
        type: activeType,
      });
      setPhotoCount(c => c + 1);
    } catch {
      Alert.alert('Could not capture photo', 'Please try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, activeType, photoOutput, onShowPaywall]);

  const typeLabel = COLOR_BLIND_TYPES.find(t => t.id === activeType)?.label ?? '';

  if (!cameraPermission.hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera access needed</Text>
        <TouchableOpacity style={styles.permBtn} onPress={cameraPermission.requestPermission}>
          <Text style={styles.permBtnText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>No camera found</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" />

      <GestureDetector gesture={pinchGesture}>
        <View style={StyleSheet.absoluteFill}>
          {/* Live camera feed with zoom */}
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[photoOutput]}
            zoom={zoom}
          />
        </View>
      </GestureDetector>

      {/* Soft gradient overlays */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>See Colour</Text>
          <TouchableOpacity style={styles.galleryBtn} onPress={onOpenGallery}>
            <Text style={styles.galleryCount}>{photoCount}</Text>
            <Text style={styles.galleryLabel}> photos</Text>
          </TouchableOpacity>
        </View>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>

          {/* Zoom indicator */}
          {showZoom && (
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomText}>{zoomDisplay}×</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />

        {/* Zoom slider hint */}
        <View style={styles.zoomHint}>
          <Text style={styles.zoomHintText}>Pinch to zoom · {minZoom}× – {maxZoom}×</Text>
        </View>

        {/* Type selector */}
        <TypeSelector selected={activeType} onChange={handleTypeChange} />

        {/* Capture row */}
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.sideBtn} onPress={onOpenPhotoAdjust} activeOpacity={0.8}>
            <LibraryIcon />
            <Text style={styles.sideBtnLabel}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, capturing && styles.captureBtnActive]}
            onPress={handleCapture}
            activeOpacity={0.8}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={onOpenGallery} activeOpacity={0.8}>
            <MemoriesIcon />
            <Text style={styles.sideBtnLabel}>Memories</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tagline}>See colour like you're meant to.</Text>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  permText: { color: colors.text, fontSize: font.size.lg },
  permBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  permBtnText: { color: colors.white, fontWeight: font.weight.semibold },
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  wordmark: {
    color: colors.white, fontSize: font.size.lg,
    fontWeight: font.weight.bold, letterSpacing: 0.5,
  },
  galleryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  galleryCount: { color: colors.white, fontSize: font.size.sm, fontWeight: font.weight.bold },
  galleryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: font.size.sm },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginTop: spacing.sm, gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(123,97,255,0.25)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.4)',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  badgeText: { color: 'rgba(255,255,255,0.85)', fontSize: font.size.xs, fontWeight: font.weight.medium },
  zoomBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  zoomText: { color: colors.white, fontSize: font.size.xs, fontWeight: font.weight.bold },
  spacer: { flex: 1 },
  zoomHint: { alignItems: 'center', marginBottom: spacing.sm },
  zoomHintText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic' },
  captureRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md, marginBottom: spacing.md,
  },
  sideBtn: { alignItems: 'center', gap: 4, width: 64 },
  sideBtnIcon: { fontSize: 24 },
  sideBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: font.size.xs },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnActive: { borderColor: colors.accent },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
  tagline: {
    textAlign: 'center', color: 'rgba(255,255,255,0.45)',
    fontSize: font.size.xs, fontStyle: 'italic', marginBottom: spacing.sm,
  },
});
