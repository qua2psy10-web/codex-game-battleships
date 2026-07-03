const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const cloudSyncConfigured = Boolean(supabaseUrl && publishableKey);

let cloudClientPromise = null;

export const getCloudClient = async () => {
  if (!cloudSyncConfigured) return null;
  cloudClientPromise ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }));
  return cloudClientPromise;
};

export const sendMagicLink = async email => {
  const cloudClient = await getCloudClient();
  if (!cloudClient) throw new Error('クラウド同期が設定されていません');
  const redirectPath = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { error } = await cloudClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectPath },
  });
  if (error) throw error;
};

export const signOutCloud = async () => {
  const cloudClient = await getCloudClient();
  if (!cloudClient) return;
  const { error } = await cloudClient.auth.signOut();
  if (error) throw error;
};

export const uploadCloudState = async (userId, saveData) => {
  const cloudClient = await getCloudClient();
  if (!cloudClient) throw new Error('クラウド同期が設定されていません');
  const { data, error } = await cloudClient
    .from('battle_saves')
    .upsert({ user_id: userId, save_data: saveData, client_updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('updated_at')
    .single();
  if (error) throw error;
  return data;
};

export const downloadCloudState = async userId => {
  const cloudClient = await getCloudClient();
  if (!cloudClient) throw new Error('クラウド同期が設定されていません');
  const { data, error } = await cloudClient
    .from('battle_saves')
    .select('save_data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};
