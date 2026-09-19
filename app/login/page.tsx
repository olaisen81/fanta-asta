'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuction } from '../../context/auction-context';
import { createClient, isSupabaseConfigured } from '../../lib/supabase/client';
import {
  Gavel,
  ShieldCheck,
  UserCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { teams, loginAsUser, isSupabaseActive } = useAuction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login con Provider Google
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!isSupabaseConfigured()) {
        // Modalità dimostrativa: simula login come Admin o primo utente
        loginAsUser('admin.google@fantaasta.it', 'admin', teams[0]?.id);
        router.push('/');
        return;
      }

      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
        setErrorMessage(
          'Il provider Google non è ancora abilitato su Supabase (Authentication > Providers > Google). Nel frattempo puoi usare il pulsante "Entra come Admin" o "Entra come Giocatore" qui sotto per accedere istantaneamente!'
        );
      } else {
        setErrorMessage(msg || 'Errore durante l\'accesso con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login con Email e Password (per partecipanti invitati)
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Inserisci sia email che password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      if (!isSupabaseConfigured()) {
        // Modalità demo locale
        const matchedTeam = teams.find(
          (t) => t.manager_email?.toLowerCase() === email.toLowerCase()
        );
        const isAdmin = email.toLowerCase().includes('admin');
        loginAsUser(email, isAdmin ? 'admin' : 'player', matchedTeam?.id || teams[1]?.id);
        router.push('/');
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Controlla se è admin o giocatore
      const userEmail = data.user.email || email;
      const isAdmin = userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const matchedTeam = teams.find(
        (t) => t.manager_email?.toLowerCase() === userEmail.toLowerCase()
      );

      loginAsUser(userEmail, isAdmin ? 'admin' : 'player', matchedTeam?.id);
      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 shadow-lg shadow-rose-500/25">
            <Gavel className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Accedi a FantaAsta Live
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lega a 10 giocatori · Asta in tempo reale
          </p>
        </div>

        {/* Card di Login */}
        <div className="rounded-3xl border border-slate-800 bg-[#0e1628] p-6 sm:p-8 shadow-2xl space-y-5">
          {errorMessage && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Accesso Rapido Google Provider */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-md flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            {/* SVG Logo Google */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
              />
            </svg>
            <span>Accedi con Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0e1628] px-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              oppure tramite invito email
            </span>
          </div>

          {/* Form Email / Password */}
          <form onSubmit={handleEmailPasswordLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua-email@esempio.it"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <span>{loading ? 'Accesso in corso...' : 'Entra con Email'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* SIMULAZIONE ACCESSO RAPIDO (Ideale per test e presentazione immediata) */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
              Test Rapido (Senza Credenziali)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  loginAsUser('admin@fantaasta.it', 'admin', teams[0]?.id);
                  router.push('/');
                }}
                className="py-2 px-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Entra come Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loginAsUser('giocatore@fantaasta.it', 'player', teams[1]?.id);
                  router.push('/');
                }}
                className="py-2 px-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserCheck className="h-4 w-4 text-sky-400" />
                <span>Entra come Giocatore</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
