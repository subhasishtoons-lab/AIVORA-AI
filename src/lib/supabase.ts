import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isValidHttpUrl } from '../utils/directory';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabasePublishableKey =
  (
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  )?.trim() ?? '';

export const isSupabaseClientConfigured =
  Boolean(supabaseUrl && supabasePublishableKey) && isValidHttpUrl(supabaseUrl);

// Browser client strictly uses the Supabase publishable/anon key enforced by Row Level Security.
export const supabase: SupabaseClient | null = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

