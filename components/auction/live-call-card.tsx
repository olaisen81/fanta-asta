'use client';

import React, { useState, useEffect } from 'react';
import {
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Coins,
  ShieldAlert,
  Flame,
  UserCheck,
} from 'lucide-react';
import { PlayerRole, Player } from '../../lib/supabase/types';
import {
  getRoleBadgeStyles,
  formatCredits,
  validatePurchase,
  calculateTeamStats,
} from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

export function LiveCallCard() {
  const {
    auctionState,
    currentUser,
    teams,
    teamsStats,
    roster,
    league,
    updateBid,
    assignPlayer,
  } = useAuction();

  const [bidAmount, setBidAmount] = useState<number>(auctionState.current_bid || 1);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [isAssigning, setIsAssigning] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Sincronizza il prezzo locale quando cambia dallo stato globale
  useEffect(() => {
    setBidAmount(auctionState.current_bid || 1);
  }, [auctionState.current_bid]);

  const isBiddingActive = Boolean(auctionState.current_player_name);
  const badge = auctionState.current_role
    ? getRoleBadgeStyles(auctionState.current_role as PlayerRole)
    : null;

  // Statistiche della squadra attualmente selezionata
  const selectedTeamStat = teamsStats.find((s) => s.team.id === selectedTeamId);

  // Controllo validità dell'offerta in tempo reale
  const validationResult = selectedTeamStat && auctionState.current_role
    ? validatePurchase(selectedTeamStat, auctionState.current_role, bidAmount)
    : { valid: true };

  // Modifica prezzo con pulsanti rapidi
  const handlePriceStep = (delta: number) => {
    const newPrice = Math.max(1, bidAmount + delta);
    setBidAmount(newPrice);
    if (currentUser.isAdmin) {
      updateBid(newPrice, selectedTeamId);
    }
  };

  const handlePriceInputChange = (val: number) => {
    const safeVal = isNaN(val) ? 1 : Math.max(1, val);
    setBidAmount(safeVal);
    if (currentUser.isAdmin) {
      updateBid(safeVal, selectedTeamId);
    }
  };

  const handleAssign = async () => {
    if (!currentUser.isAdmin) return;
    if (!selectedTeamId) {
      setFeedbackError('Seleziona la squadra a cui assegnare il calciatore.');
      return;
    }

    try {
      setIsAssigning(true);
      setFeedbackError(null);
      const res = await assignPlayer(selectedTeamId, bidAmount);
      if (!res.success) {
        setFeedbackError(res.error || 'Errore durante l\'assegnazione.');
      }
    } catch (e: any) {
      setFeedbackError(e.message || 'Errore imprevisto.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Se nessun calciatore è attualmente chiamato
  if (!isBiddingActive) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-700/80 bg-gradient-to-b from-[#0e1628]/80 to-[#0b101c]/80 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 border border-slate-700">
          <Gavel className="h-8 w-8 animate-bounce text-indigo-400" />
        </div>
        <h2 className="mt-4 text-lg sm:text-xl font-extrabold text-white">
          Nessun Calciatore in Chiamata
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          {currentUser.isAdmin
            ? 'Cerca un calciatore nel listone qui sopra o usa il pulsante "+ Manuale" per avviare la chiamata all\'asta.'
            : 'Il banditore sta selezionando il prossimo calciatore da chiamare... Resta sintonizzato!'}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>In ascolto in tempo reale</span>
        </div>
      </div>
    );
  }

  // Se c'è un calciatore in chiamata all'asta
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-[#11192e] to-[#0d1424] p-4 sm:p-6 shadow-2xl shadow-indigo-950/50">
      {/* Glow Effect */}
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      {/* Header Chiamata */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Chiamata in Corso
          </span>
        </div>

        {badge && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {badge.label.toUpperCase()} ({auctionState.current_role})
          </span>
        )}
      </div>

      {/* Dettagli Calciatore */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {auctionState.current_player_name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-xs sm:text-sm text-slate-300">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-white">
              {auctionState.current_serie_a_team || 'Serie A'}
            </span>
            <span>·</span>
            <span>Quotazione: {auctionState.current_bid || 1} FM</span>
          </div>
        </div>

        {/* Prezzo Attuale In Evidenza */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between bg-slate-900/90 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-slate-800 sm:border-0">
          <span className="text-xs font-semibold text-slate-400 sm:text-right">
            Prezzo Attuale
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight flex items-baseline gap-1">
            <span>{bidAmount}</span>
            <span className="text-base sm:text-lg font-bold text-amber-500/80">FM</span>
          </div>
        </div>
      </div>

      {/* PANNELLO DI CONTROLLO: Se Admin */}
      {currentUser.isAdmin ? (
        <div className="space-y-4">
          {/* Controlli Prezzo Incrementale */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 sm:p-4">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Modifica Offerta / Rilancio</span>
              <span className="text-[11px] text-slate-400">Step rapidi</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
              <button
                type="button"
                onClick={() => handlePriceStep(-10)}
                disabled={bidAmount <= 10}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs sm:text-sm font-bold text-slate-200 transition-colors"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(-1)}
                disabled={bidAmount <= 1}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs sm:text-sm font-bold text-slate-200 transition-colors"
              >
                -1
              </button>

              {/* Input Prezzo Diretto */}
              <input
                type="number"
                min="1"
                value={bidAmount}
                onChange={(e) => handlePriceInputChange(parseInt(e.target.value, 10))}
                className="py-2 px-1 text-center font-black text-lg sm:text-xl rounded-xl border border-indigo-500/50 bg-slate-950 text-amber-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="button"
                onClick={() => handlePriceStep(1)}
                className="py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-xs sm:text-sm font-bold text-indigo-300 border border-indigo-500/30 transition-colors"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(5)}
                className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
              >
                +5
              </button>
            </div>
          </div>

          {/* Selezione Squadra Vincitrice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Squadra Aggiudicataria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {teamsStats.map((stat) => {
                const isSelected = selectedTeamId === stat.team.id;
                const canAfford =
                  auctionState.current_role
                    ? validatePurchase(stat, auctionState.current_role, bidAmount).valid
                    : true;

                return (
                  <button
                    key={stat.team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(stat.team.id)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40 shadow-md'
                        : canAfford
                        ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80'
                        : 'border-slate-800/50 bg-slate-900/30 opacity-40 hover:opacity-75'
                    }`}
                  >
                    <div className="font-bold text-xs text-white truncate">
                      {stat.team.name}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span className="text-amber-300 font-semibold">{stat.remaining} FM</span>
                      <span>Max {stat.maxBid}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messaggi di Validazione / Errori */}
          {!validationResult.valid && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300 animate-in fade-in-50">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{validationResult.error}</span>
            </div>
          )}

          {feedbackError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300 animate-in fade-in-50">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Tasto Assegna Definitivo */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleAssign}
              disabled={isAssigning || !validationResult.valid}
              className="flex-1 py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-950/60 transition-transform active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>
                {isAssigning
                  ? 'Assegnazione in corso...'
                  : `AGGIUDICA A ${selectedTeamStat?.team.name.toUpperCase() || 'SQUADRA'} (${bidAmount} FM)`}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* VISTA SPETTATORE (Per i 9 Giocatori in sola lettura) */
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-2">
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>Asta dal Vivo</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            L'amministratore sta battendo il calciatore. Le modifiche di prezzo e l'assegnazione finale appariranno qui automaticamente in tempo reale.
          </p>
        </div>
      )}
    </div>
  );
}
