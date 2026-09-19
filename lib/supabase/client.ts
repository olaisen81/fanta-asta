import { createBrowserClient } from '@supabase/ssr';

let dynamicConfig: { url: string; anonKey: string } | null = null;

export function setDynamicSupabaseConfig(url: string, anonKey: string) {
  if (url && anonKey) {
    dynamicConfig = { url, anonKey };
  }
}

export function isSupabaseConfigured(): boolean {
  if (dynamicConfig?.url && dynamicConfig?.anonKey) return true;
  const url = dynamicConfig?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    dynamicConfig?.anonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && anonKey && !url.includes('your-project') && !url.includes('placeholder') && url.startsWith('http'));
}

export function createClient(customUrl?: string, customKey?: string) {
  const url =
    customUrl ||
    dynamicConfig?.url ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder.supabase.co';
  const anonKey =
    customKey ||
    dynamicConfig?.anonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    'placeholder-key';

  return createBrowserClient(url, anonKey);
}

