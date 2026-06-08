import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ColorBlindType } from './colorCorrection';

export interface MemoryPhoto {
  id: string;
  uri: string;
  thumbnailUri: string;
  capturedAt: string;
  note?: string;
  type: ColorBlindType;
}

const PHOTOS_KEY = 'chromasee_photos';
const TYPE_KEY = 'chromasee_active_type';
const INSTALL_DATE_KEY = 'chromasee_install_date';
const FREE_TRIAL_MS = 24 * 60 * 60 * 1000; // 1 day

/** Records first-launch timestamp if not already set. */
export async function recordInstallDate(): Promise<void> {
  const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!existing) {
    await AsyncStorage.setItem(INSTALL_DATE_KEY, Date.now().toString());
  }
}

/** Returns true when the 1-day free trial has expired. */
export async function isTrialExpired(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!raw) {
    // No date recorded yet — record now and grant trial
    await AsyncStorage.setItem(INSTALL_DATE_KEY, Date.now().toString());
    return false;
  }
  return Date.now() - parseInt(raw, 10) > FREE_TRIAL_MS;
}

// Permanent directory inside the app's document folder
const PHOTOS_DIR = `${FileSystem.documentDirectory}chromasee_photos/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Copies a photo from a temporary/arbitrary URI into the app's
 * permanent document directory so it survives app restarts.
 */
export async function copyToPermStorage(tempUri: string, id: string): Promise<string> {
  await ensureDir();
  const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const dest = `${PHOTOS_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function savePhoto(photo: MemoryPhoto): Promise<void> {
  // If the URI is not already in our permanent dir, copy it there
  let permanentUri = photo.uri;
  if (!photo.uri.startsWith(PHOTOS_DIR)) {
    try {
      permanentUri = await copyToPermStorage(photo.uri, photo.id);
    } catch (e) {
      // Fallback — save as-is (library photos have persistent URIs)
      permanentUri = photo.uri;
    }
  }

  const existing = await getPhotos();
  const updated = [{ ...photo, uri: permanentUri, thumbnailUri: permanentUri }, ...existing];
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updated));
}

export async function getPhotos(): Promise<MemoryPhoto[]> {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  if (!raw) return [];
  const photos: MemoryPhoto[] = JSON.parse(raw);

  // Filter out any photos whose files no longer exist
  const valid = await Promise.all(
    photos.map(async (p) => {
      if (p.uri.startsWith('http')) return p; // remote URL always valid
      const info = await FileSystem.getInfoAsync(p.uri);
      return info.exists ? p : null;
    })
  );

  return valid.filter(Boolean) as MemoryPhoto[];
}

export async function deletePhoto(id: string): Promise<void> {
  const existing = await getPhotos();
  const photo = existing.find(p => p.id === id);

  // Delete the actual file if it's in our storage dir
  if (photo && photo.uri.startsWith(PHOTOS_DIR)) {
    await FileSystem.deleteAsync(photo.uri, { idempotent: true });
  }

  await AsyncStorage.setItem(
    PHOTOS_KEY,
    JSON.stringify(existing.filter(p => p.id !== id))
  );
}

export async function getPhotoCount(): Promise<number> {
  return (await getPhotos()).length;
}

/** Returns true when the user should be shown the paywall (trial expired). */
export async function isAtFreeLimit(): Promise<boolean> {
  return isTrialExpired();
}

export async function getSavedType(): Promise<ColorBlindType> {
  const raw = await AsyncStorage.getItem(TYPE_KEY);
  return (raw as ColorBlindType) ?? 'deuteranopia';
}

export async function saveType(type: ColorBlindType): Promise<void> {
  await AsyncStorage.setItem(TYPE_KEY, type);
}
