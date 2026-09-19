'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RosterPlayer } from '../../lib/supabase/types';
import { useAuction } from '../../context/auction-context';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';

interface DeleteRosterPlayerModalProps {
  player: RosterPlayer | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteRosterPlayerModal({
  player,
  onClose,
  onDeleted,
}: DeleteRosterPlayerModalProps) {
  const { teams, removePlayerFromRoster } = useAuction();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!player) return null;

  const team = teams.find((t) => t.id === player.team_id);
  const badge = getRoleBadgeStyles(player.role);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await removePlayerFromRoster(player.id);
      if (onDeleted) onDeleted();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#0f172a] shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Rimuovi dalla Rosa</h3>
              <p className="text-xs text-slate-400">Annulla l'acquisto e riaccredita i crediti</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Player card summary */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-7 w-7 rounded-lg font-black text-xs flex items-center justify-center border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {player.role}
            </span>
            <div>
              <div className="font-black text-white text-sm">{player.player_name}</div>
              <div className="text-xs text-slate-400">
                {player.serie_a_team} · {team?.name || 'Squadra'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-amber-400 font-black text-base">{player.price} FM</div>
            <div className="text-[10px] text-slate-400">Prezzo pagato</div>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          Sei sicuro di voler rimuovere <strong className="text-white">{player.player_name}</strong> dalla rosa di <strong className="text-white">{team?.name}</strong>?
          <br />
          I <strong className="text-emerald-400">+{player.price} FM</strong> spesi torneranno immediatamente disponibili nel budget della squadra e lo slot per il ruolo <strong className="text-white">{badge.label}</strong> tornerà libero.
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Rimozione...' : 'Sì, Rimuovi dalla Rosa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
