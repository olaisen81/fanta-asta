'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuction } from '../../context/auction-context';
import { createClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

function InviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { teams, loginAsUser } = useAuction();

  const teamId = searchParams.get('teamId') || teams[1]?.id;
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const team = teams.find((t) => t.id === teamId) || teams[1];

  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le due password non coincidono.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Associa l'utente alla squadra
        if (data.user) {
          await supabase
            .from('teams')
            .update({ user_id: data.user.id, manager_email: email })
            .eq('id', team.id);
        }
      }

      // Login locale nel contesto
      loginAsUser(email, 'player', team.id);
      setSuccess(true);
      setTimeout(() => {
        router.push('/rose');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0e1628] p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Invito per {team?.name || 'la tua squadra'}
          </h1>
          <p className="text-xs text-slate-400">
            Sei stato invitato come fantallenatore di{' '}
            <strong className="text-indigo-300">{team?.name}</strong>. Imposta la tua password per accedere all'asta in tempo reale.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Account configurato con successo! Reindirizzamento all'asta...</span>
          </div>
        )}

        <form onSubmit={handleRegisterPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              La tua Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Crea Password (min. 6 caratteri)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Conferma Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <span>{loading ? 'Salvataggio...' : 'Attiva Account e Entra nell\'Asta'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Caricamento invito...</div>}>
      <InviteForm />
    </Suspense>
  );
}
