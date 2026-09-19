'use client';

import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, Coins, Check, UserMinus, Plus } from 'lucide-react';
import { RosterPlayer, PlayerRole } from '../../lib/supabase/types';
import { getRoleBadgeStyles, formatCredits } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

interface SvincoloModalProps {
  player: RosterPlayer | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SvincoloModal({ player, onClose, onSuccess }: SvincoloModalProps) {
  const { teams, teamsStats, releasePlayerFromRoster } = useAuction();

  const [refundMode, setRefundMode] = useState<'100' | '50' | '1' | 'custom'>('50');
  const [customRefund, setCustomRefund] = useState<number>(
    player ? Math.floor(player.price / 2) : 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;

  const team = teams.find((t) => t.id === player.team_id);
  const teamStat = teamsStats.find((s) => s.team.id === player.team_id);
  const badge = getRoleBadgeStyles(player.role as PlayerRole);

  const calculatedRefund =
    refundMode === '100'
      ? player.price
      : refundMode === '50'
      ? Math.floor(player.price / 2)
      : refundMode === '1'
      ? 1
      : Math.max(0, customRefund);

  const currentRemaining = teamStat?.remaining || 0;
  const newRemaining = currentRemaining + calculatedRefund;

  const handleConfirmSvincolo = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await releasePlayerFromRoster(player.id, calculatedRefund);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore durante lo svincolo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-3xl border border-sky-500/40 bg-[#0f172a] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <UserMinus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Svincolo Calciatore (Gennaio)
              </h3>
              <p className="text-xs text-slate-400">
                Asta di Riparazione · Recupero crediti e slot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Calciatore & Squadra */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {player.role}
            </span>
            <div>
              <div className="font-bold text-sm text-white">{player.player_name}</div>
              <div className="text-[11px] text-slate-400">
                {player.serie_a_team} · {team?.name || 'Squadra'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Pagato:</div>
            <div className="font-black text-amber-400 text-sm">{player.price} FM</div>
          </div>
        </div>

        {/* Scelta Modalità Rimborso */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Modalità Rimborso Crediti
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRefundMode('50')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                refundMode === '50'
                  ? 'border-sky-500 bg-sky-500/20 text-white font-bold ring-1 ring-sky-500'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div>50% Prezzo (Standard)</div>
              <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                +{Math.floor(player.price / 2)} FM
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRefundMode('100')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                refundMode === '100'
                  ? 'border-sky-500 bg-sky-500/20 text-white font-bold ring-1 ring-sky-500'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div>100% Prezzo Intero</div>
              <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                +{player.price} FM
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRefundMode('1')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                refundMode === '1'
                  ? 'border-sky-500 bg-sky-500/20 text-white font-bold ring-1 ring-sky-500'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div>1 Credito Simbolico</div>
              <div className="text-[10px] text-amber-300 font-semibold mt-0.5">+1 FM</div>
            </button>

            <button
              type="button"
              onClick={() => setRefundMode('custom')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                refundMode === 'custom'
                  ? 'border-sky-500 bg-sky-500/20 text-white font-bold ring-1 ring-sky-500'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div>Personalizzato</div>
              <div className="text-[10px] text-amber-300 font-semibold mt-0.5">Valore libero</div>
            </button>
          </div>

          {refundMode === 'custom' && (
            <div className="mt-2">
              <label className="block text-[11px] text-slate-400 mb-1">
                Crediti rimborsati:
              </label>
              <input
                type="number"
                min="0"
                value={customRefund}
                onChange={(e) => setCustomRefund(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* Anteprima Impatto sul Budget */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
          <div className="text-slate-400 flex justify-between">
            <span>Budget attuale {team?.name}:</span>
            <span className="font-bold text-white">{currentRemaining} FM</span>
          </div>
          <div className="text-emerald-400 flex justify-between font-semibold">
            <span>Rimborso svincolo:</span>
            <span>+{calculatedRefund} FM</span>
          </div>
          <div className="border-t border-slate-800 pt-1 flex justify-between font-extrabold text-amber-400">
            <span>Nuovo budget disponibile:</span>
            <span>{newRemaining} FM</span>
          </div>
          <div className="text-[10px] text-slate-400 pt-0.5">
            ✓ 1 slot {badge.label.toLowerCase()} verrà liberato per l'acquisto sostitutivo.
          </div>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirmSvincolo}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>{isSubmitting ? 'Svincolo in corso...' : `Conferma Svincolo (+${calculatedRefund} FM)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface RepairBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RepairBonusModal({ isOpen, onClose }: RepairBonusModalProps) {
  const { addRepairBonusToTeams, teams } = useAuction();
  const [bonusAmount, setBonusAmount] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyBonus = async () => {
    try {
      setIsSubmitting(true);
      await addRepairBonusToTeams(bonusAmount);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-3xl border border-sky-500/40 bg-[#0f172a] p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Bonus Crediti Riparazione (Gennaio)
              </h3>
              <p className="text-xs text-slate-400">
                Aggiungi un extra-budget per il mercato invernale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Bonus di +{bonusAmount} FM aggiunto a tutte le 10 squadre!</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <label className="block text-slate-300 font-semibold">
            Crediti Extra da Assegnare a Ciascuna Squadra:
          </label>
          <div className="flex items-center gap-2">
            {[10, 20, 30, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBonusAmount(amt)}
                className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                  bonusAmount === amt
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                +{amt} FM
              </button>
            ))}
          </div>

          <div className="mt-2">
            <label className="block text-slate-400 text-[11px] mb-1">
              Oppure digita importo personalizzato:
            </label>
            <input
              type="number"
              min="0"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <p className="text-slate-400 text-[11px] pt-1">
            Questo importo verrà sommato al budget disponibile di ciascuna delle 10 squadre per l'asta di riparazione.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleApplyBonus}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{isSubmitting ? 'Applicazione...' : `Aggiungi +${bonusAmount} FM a Tutte`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
