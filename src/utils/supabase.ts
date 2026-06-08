import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://doxfgwmczqangenvjufv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nPLjFyCvno9nG6TbCSEnUA_wISAoPuu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: 'chromasee://auth' },
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isPremium(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('chromasee_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  return data?.is_premium ?? false;
}

export async function setPremium(userId: string, value: boolean) {
  await supabase
    .from('chromasee_profiles')
    .update({ is_premium: value })
    .eq('id', userId);
}

export async function syncPhotoToCloud(
  localUri: string,
  correctionType: string,
  note?: string
): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  try {
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('chromasee-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (uploadError) return null;

    const { data } = await supabase
      .from('chromasee_photos')
      .insert({
        user_id: user.id,
        storage_path: fileName,
        correction_type: correctionType,
        note,
      })
      .select('id')
      .single();

    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function getCloudPhotos() {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('chromasee_photos')
    .select('*')
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false });
  return data ?? [];
}
