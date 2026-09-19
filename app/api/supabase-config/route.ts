import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project') &&
    !url.includes('placeholder') &&
    url.startsWith('http')
  );

  return NextResponse.json(
    {
      configured: isConfigured,
      url: isConfigured ? url : null,
      anonKey: isConfigured ? anonKey : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
