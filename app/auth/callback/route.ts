import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user?.email) {
        const userEmail = data.user.email.trim().toLowerCase();
        const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();

        const isMasterAdmin =
          userEmail === 'fabio.perfetti81@gmail.com' ||
          userEmail === 'admin@fantaasta.it' ||
          (adminEmail && userEmail === adminEmail);

        if (!isMasterAdmin) {
          // Verifica se l'email corrisponde a una delle squadre registrate
          const { data: allTeams } = await supabase
            .from('teams')
            .select('id, manager_email, is_admin');

          const matchedTeam = allTeams?.find(
            (t) => t.manager_email && t.manager_email.trim().toLowerCase() === userEmail
          );

          const isAuthorized = Boolean(matchedTeam);

          if (!isAuthorized) {
            // Utente non federato: invalida la sessione immediatamente
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/login?error=unauthorized&email=${encodeURIComponent(data.user.email)}`
            );
          }
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err) {
      console.error('Errore durante scambio token OAuth:', err);
    }
  }

  // Fallback alla home page
  return NextResponse.redirect(`${origin}${next}`);
}
