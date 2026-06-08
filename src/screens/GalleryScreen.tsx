import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { MemoryPhoto, getPhotos, deletePhoto } from '../utils/storage';
import { COLOR_BLIND_TYPES } from '../utils/colorCorrection';
import { colors, font, radius, spacing } from '../theme';

const COLS = 3;
const CELL = (Dimensions.get('window').width - spacing.md * 2 - spacing.xs * (COLS - 1)) / COLS;

interface Props {
  onBack: () => void;
  onShowAuth?: () => void;
}

export function GalleryScreen({ onBack, onShowAuth }: Props) {
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);

  const load = useCallback(async () => {
    setPhotos(await getPhotos());
  }, []);

  useEffect(() => { load(); }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Remove photo?', 'This will remove it from your memory bank.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(id);
          load();
        },
      },
    ]);
  }, [load]);

  const typeLabel = (photo: MemoryPhoto) =>
    COLOR_BLIND_TYPES.find(t => t.id === photo.type)?.label ?? photo.type;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Camera</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory Bank</Text>
        <View style={styles.backBtn} />
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✦</Text>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySub}>Capture a moment to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={p => p.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cell}
              onLongPress={() => handleDelete(item.id)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
              <View style={styles.cellMeta}>
                <Text style={styles.cellDate} numberOfLines={1}>{formatDate(item.capturedAt)}</Text>
                <Text style={styles.cellType} numberOfLines={1}>{typeLabel(item)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.hint}>Hold a photo to remove it.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 80,
  },
  backText: {
    color: colors.accent,
    fontSize: font.size.md,
  },
  title: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: font.size.md,
  },
  grid: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cell: {
    width: CELL,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumb: {
    width: CELL,
    height: CELL,
  },
  cellMeta: {
    padding: spacing.xs,
  },
  cellDate: {
    color: colors.text,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
  },
  cellType: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.size.xs,
    paddingBottom: spacing.md,
  },
});
