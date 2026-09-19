'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2, CheckCircle2, AlertCircle, Coins, Shield, User } from 'lucide-react';
import { RosterPlayer, PlayerRole, AuctionSessionType } from '../../lib/supabase/types';
import { useAuction } from '../../context/auction-context';
import { getRoleBadgeStyles, calculateTeamStats } from '../../lib/fantacalcio/calculator';

interface EditRosterPlayerModalProps {
  player: RosterPlayer | null;
  onClose: () => void;
  onDeleteRequest?: (player: RosterPlayer) => void;
}

const SERIE_A_TEAMS = [
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Empoli', 'Fiorentina',
  'Genoa', 'Inter', 'Juventus', 'Lazio', 'Lecce', 'Milan',
  'Monza', 'Napoli', 'Parma', 'Roma', 'Torino', 'Udinese', 'Venezia', 'Verona'
];

export function EditRosterPlayerModal({
  player,
  onClose,
  onDeleteRequest,
}: EditRosterPlayerModalProps) {
  const { teams, roster, league, updateRosterPlayer, removePlayerFromRoster, currentUser } = useAuction();

  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('C');
  const [serieATeam, setSerieATeam] = useState('');
  const [teamId, setTeamId] = useState('');
  const [price, setPrice] = useState<number>(1);
  const [session, setSession] = useState<AuctionSessionType>('initial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setName(player.player_name);
      setRole(player.role);
      setSerieATeam(player.serie_a_team || 'Serie A');
      setTeamId(player.team_id);
      setPrice(player.price || 1);
      setSession(player.session || 'initial');
      setErrorMessage(null);
    }
  }, [player]);

  if (!player) return null;

  const targetTeam = teams.find((t) => t.id === teamId);
  const currentTeam = teams.find((t) => t.id === player.team_id);

  // Calcola stats per preview budget della squadra di destinazione escludendo questo calciatore
  const rosterWithoutItem = roster.filter((r) => r.id !== player.id);
  const targetStats = targetTeam
    ? calculateTeamStats(targetTeam, rosterWithoutItem, league)
    : null;

  const roles: PlayerRole[] = ['P', 'D', 'C', 'A'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Il nome del calciatore non può essere vuoto.');
      return;
    }
    if (price < 1) {
      setErrorMessage('Il prezzo deve essere di almeno 1 FM.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await updateRosterPlayer(player.id, {
        player_name: name.trim(),
        role,
        serie_a_team: serieATeam.trim() || 'Serie A',
        team_id: teamId,
        price,
        session,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Errore durante il salvataggio.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore imprevisto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (onDeleteRequest) {
      onDeleteRequest(player);
      onClose();
    } else {
      if (confirm(`Confermi di voler rimuovere ${player.player_name} dalla rosa? I ${player.price} FM spesi torneranno al budget della squadra.`)) {
        removePlayerFromRoster(player.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#0f172a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Modifica Calciatore in Rosa
              </h3>
              <p className="text-xs text-slate-400">
                Aggiorna importo pagato, ruolo o trasferisci ad altra squadra
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nome Calciatore */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nome Calciatore *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Lautaro Martinez"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Ruolo (P, D, C, A) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Ruolo *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {roles.map((r) => {
                const b = getRoleBadgeStyles(r);
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${b.bg} ${b.border} ${b.text} ring-2 ring-indigo-500 shadow-md`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{r}</span>
                    <span className="text-[10px] font-semibold opacity-70">({b.label})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Squadra Serie A */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Squadra Serie A
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serieATeam}
                onChange={(e) => setSerieATeam(e.target.value)}
                placeholder="es. Inter, Milan, Juventus..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={SERIE_A_TEAMS.includes(serieATeam) ? serieATeam : ''}
                onChange={(e) => {
                  if (e.target.value) setSerieATeam(e.target.value);
                }}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-300 focus:outline-none"
              >
                <option value="">Seleziona Club...</option>
                {SERIE_A_TEAMS.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prezzo Pagato (FM) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>Prezzo Pagato (FM) *</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrice((p) => Math.max(1, p - 5))}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setPrice((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                -1
              </button>

              <input
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 px-3.5 py-2 text-center text-lg font-black rounded-xl border border-indigo-500/50 bg-slate-950 text-amber-400 focus:outline-none focus:border-indigo-400"
              />

              <button
                type="button"
                onClick={() => setPrice((p) => p + 1)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setPrice((p) => p + 5)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                +5
              </button>
            </div>
          </div>

          {/* Squadra Assegnata (con possibilità di trasferimento) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Squadra della Lega
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.manager_name}) {t.id === player.team_id ? '— Attuale' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sessione Mercato */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Sessione di Mercato
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSession('initial')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  session === 'initial'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>☀️ Asta Iniziale (Estiva)</span>
              </button>
              <button
                type="button"
                onClick={() => setSession('repair')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  session === 'repair'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>❄️ Asta di Riparazione (Gennaio)</span>
              </button>
            </div>
          </div>

          {/* Pulsanti Azione */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {currentUser.isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Rimuovi dalla Rosa</span>
              </button>
            )}

            <div className="flex items-center gap-2 justify-end flex-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
