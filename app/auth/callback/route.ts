import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

import { INITIAL_TEAMS } from '../../../lib/fantacalcio/default-players';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // In produzione su Vercel / proxy, request.url potrebbe contenere localhost:3000 interno;
  // leggiamo x-forwarded-host e x-forwarded-proto per usare il dominio pubblico effettivo.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocalEnv = process.env.NODE_ENV === 'development';

  let targetOrigin = origin;
  if (!isLocalEnv && forwardedHost) {
    targetOrigin = `${forwardedProto}://${forwardedHost}`;
  }

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
          let teamList: any[] = INITIAL_TEAMS;
          try {
            const { data: allTeams } = await supabase
              .from('teams')
              .select('id, manager_email, is_admin');
            if (allTeams && allTeams.length > 0) {
              teamList = allTeams;
            }
          } catch (e) {
            console.warn('Errore lettura tabella teams in callback:', e);
          }

          const matchedTeam = teamList.find(
            (t) => t.manager_email && t.manager_email.trim().toLowerCase() === userEmail
          );

          const isAuthorized = Boolean(matchedTeam);

          if (!isAuthorized) {
            // Utente non federato: invalida la sessione immediatamente
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${targetOrigin}/login?error=unauthorized&email=${encodeURIComponent(data.user.email)}`
            );
          }
        }

        return NextResponse.redirect(`${targetOrigin}${next}`);
      }
    } catch (err) {
      console.error('Errore durante scambio token OAuth:', err);
    }
  }

  // Fallback
  return NextResponse.redirect(`${targetOrigin}${next}`);
}
