'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Coins,
  ShieldCheck,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Player, PlayerRole, Team } from '../../lib/supabase/types';
import {
  getRoleBadgeStyles,
  validatePurchase,
  calculateTeamStats,
} from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';
import { RepairBonusModal } from './repair-modal';

interface QuickAssignCardProps {
  onOpenManualModal: () => void;
  preSelectedTeamId?: string | null;
  onClearPreSelectedTeam?: () => void;
}

export function QuickAssignCard({
  onOpenManualModal,
  preSelectedTeamId,
  onClearPreSelectedTeam,
}: QuickAssignCardProps) {
  const {
    players,
    roster,
    teams,
    teamsStats,
    currentUser,
    league,
    currentSession,
    setCurrentSession,
    assignPlayerToTeam,
  } = useAuction();

  const searchParams = useSearchParams();
  const playerParam = searchParams.get('player');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    preSelectedTeamId || teams[0]?.id || ''
  );
  const [price, setPrice] = useState<number>(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showBonusModal, setShowBonusModal] = useState(false);

  // Auto-seleziona calciatore da query param URL (es. da pagina listone)
  useEffect(() => {
    if (playerParam && players.length > 0) {
      const found = players.find(
        (p) => p.name.toLowerCase() === playerParam.toLowerCase()
      );
      if (found) {
        setSelectedPlayer(found);
        setPrice(found.initial_price || 1);
      }
    }
  }, [playerParam, players]);

  // Sincronizza squadra pre-selezionata se passata da props
  useEffect(() => {
    if (preSelectedTeamId) {
      setSelectedTeamId(preSelectedTeamId);
    }
  }, [preSelectedTeamId]);

  // Mappa dei calciatori già assegnati
  const purchasedMap = useMemo(() => {
    const map = new Map<string, { teamName: string; price: number }>();
    for (const r of roster) {
      const team = teams.find((t) => t.id === r.team_id);
      const teamName = team ? team.name : 'Squadra';
      if (r.player_id) map.set(r.player_id, { teamName, price: r.price });
      map.set(r.player_name.toLowerCase(), { teamName, price: r.price });
    }
    return map;
  }, [roster, teams]);

  // Filtraggio calciatori per autocompletamento
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim() && selectedRole === 'ALL') {
      return players
        .filter((p) => !purchasedMap.has(p.id) && !purchasedMap.has(p.name.toLowerCase()))
        .slice(0, 6);
    }

    const term = searchTerm.toLowerCase().trim();
    return players
      .filter((p) => {
        const matchesRole = selectedRole === 'ALL' || p.role === selectedRole;
        const matchesText =
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.team.toLowerCase().includes(term);
        return matchesRole && matchesText;
      })
      .slice(0, 10);
  }, [players, searchTerm, selectedRole, purchasedMap]);

  // Statistiche della squadra selezionata
  const selectedTeamStat = teamsStats.find((s) => s.team.id === selectedTeamId);

  // Validazione offerta in tempo reale
  const validationResult =
    selectedTeamStat && selectedPlayer
      ? validatePurchase(selectedTeamStat, selectedPlayer.role, price)
      : { valid: true };

  // Seleziona un giocatore dalla lista
  const handlePickPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setPrice(player.initial_price || 1);
    setSearchTerm('');
    setErrorMsg(null);
  };

  const handleStepPrice = (delta: number) => {
    setPrice((prev) => Math.max(1, prev + delta));
  };

  const handleExecuteAssign = async () => {
    if (!currentUser.isAdmin) return;
    if (!selectedPlayer) {
      setErrorMsg('Seleziona un calciatore da assegnare.');
      return;
    }
    if (!selectedTeamId) {
      setErrorMsg('Seleziona la squadra a cui assegnare il calciatore.');
      return;
    }

    try {
      setIsAssigning(true);
      setErrorMsg(null);
      const res = await assignPlayerToTeam(selectedTeamId, selectedPlayer, price);
      if (!res.success) {
        setErrorMsg(res.error || 'Errore durante l\'assegnazione.');
      } else {
        const targetTeam = teams.find((t) => t.id === selectedTeamId);
        setSuccessMsg(
          `"${selectedPlayer.name}" assegnato a ${targetTeam?.name || 'squadra'} per ${price} FM!`
        );
        setSelectedPlayer(null);
        setPrice(1);
        if (onClearPreSelectedTeam) onClearPreSelectedTeam();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Errore imprevisto.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Se l'utente non è admin (sola lettura per i 9 giocatori)
  if (!currentUser.isAdmin) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-[#0e1628] p-5 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs font-semibold">
          <UserCheck className="h-4 w-4" />
          <span>Modalità Visualizzazione Partecipante</span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-white">
          Monitoraggio Rose in Tempo Reale
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          L'amministratore inserisce e associa i calciatori acquistati alle rispettive squadre. Tutte le rose e i budget residui si aggiornano istantaneamente sul tuo dispositivo.
        </p>
      </div>
    );
  }

  const badge = selectedPlayer ? getRoleBadgeStyles(selectedPlayer.role) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-[#111a2e] to-[#0c1322] p-4 sm:p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Assegna Calciatore alla Rosa</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Serie A 2026/2027
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cerca il calciatore, seleziona la squadra e registra i crediti spesi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenManualModal}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>+ Manuale</span>
        </button>
      </div>

      {/* Selettore Sessione Mercato (Estiva vs Riparazione Gennaio) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mr-1">
            Sessione:
          </span>
          <button
            type="button"
            onClick={() => setCurrentSession('initial')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              currentSession === 'initial'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ☀️ Mercato Estivo
          </button>
          <button
            type="button"
            onClick={() => setCurrentSession('repair')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              currentSession === 'repair'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ❄️ Riparazione (Gennaio)
          </button>
        </div>

        {currentSession === 'repair' && (
          <button
            type="button"
            onClick={() => setShowBonusModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30 transition-colors"
            title="Aggiungi crediti extra a tutte le squadre per il mercato di gennaio"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>+ Bonus Crediti Gennaio</span>
          </button>
        )}
      </div>

      {/* Modal Bonus Crediti Riparazione */}
      <RepairBonusModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
      />

      {/* Notifica di successo */}
      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* SEZIONE 1: CALCIATORE SELEZIONATO O RICERCA */}
      {!selectedPlayer ? (
        <div className="space-y-2.5">
          {/* Input di Ricerca Calciatore */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca calciatore Serie A (es. Lautaro, Vlahovic, Leao, Dimarco)..."
              className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro Ruoli Rapidi */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['ALL', 'P', 'D', 'C', 'A'] as const).map((r) => {
              const isAll = r === 'ALL';
              const isSelected = selectedRole === r;
              const b = isAll ? null : getRoleBadgeStyles(r as PlayerRole);

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? isAll
                        ? 'bg-indigo-600 text-white'
                        : `${b?.bg} ${b?.text} border ${b?.border}`
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isAll ? 'Tutti' : `${r} - ${b?.label}`}
                </button>
              );
            })}
          </div>

          {/* Lista Risultati Calciatori */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredPlayers.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800/60 p-3">
                <p>Nessun calciatore trovato per "{searchTerm}".</p>
                <button
                  type="button"
                  onClick={onOpenManualModal}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
                >
                  <PlusCircle className="h-3 w-3" />
                  Aggiungi "{searchTerm || 'Calciatore'}" Manualmente
                </button>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const boughtInfo =
                  purchasedMap.get(player.id) || purchasedMap.get(player.name.toLowerCase());
                const isBought = Boolean(boughtInfo);
                const b = getRoleBadgeStyles(player.role);

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isBought
                        ? 'border-slate-800 bg-slate-900/20 opacity-50'
                        : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-6 w-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 border ${b.bg} ${b.text} ${b.border}`}
                      >
                        {player.role}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate">
                          {player.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {player.team} · Quotazione: {player.initial_price} FM
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isBought ? (
                        <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {boughtInfo?.teamName} ({boughtInfo?.price} FM)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePickPlayer(player)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                        >
                          Seleziona
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Scheda Calciatore Selezionato */
        <div className="rounded-2xl bg-slate-900/95 border border-indigo-500/40 p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {badge && (
              <span
                className={`h-10 w-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {selectedPlayer.role}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-2">
                <span>{selectedPlayer.name}</span>
                {selectedPlayer.is_custom && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Manuale
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="text-slate-200 font-semibold">{selectedPlayer.team}</span>
                <span>·</span>
                <span>Quotazione base: {selectedPlayer.initial_price} FM</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPlayer(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Cambia calciatore"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SEZIONE 2: SQUADRA ACQUIRENTE & PREZZO PAGATO */}
      <div className="space-y-3 pt-1">
        {/* Selettore Squadra */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Squadra Acquirente (delle 10 della lega)
            </label>
            {selectedTeamStat && (
              <span className="text-xs text-amber-400 font-bold">
                Residui: {selectedTeamStat.remaining} FM (Max: {selectedTeamStat.maxBid} FM)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {teamsStats.map((stat) => {
              const isSelected = selectedTeamId === stat.team.id;
              const canAfford = selectedPlayer
                ? validatePurchase(stat, selectedPlayer.role, price).valid
                : true;

              return (
                <button
                  key={stat.team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(stat.team.id)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-500/40 shadow-md'
                      : canAfford
                      ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800'
                      : 'border-slate-800/40 bg-slate-900/30 opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="font-bold text-xs text-white truncate">{stat.team.name}</div>
                  <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                    <span className="text-amber-300 font-semibold">{stat.remaining} FM</span>
                    <span>
                      {selectedPlayer ? `${stat.roleCounts[selectedPlayer.role]}/${stat.roleMax[selectedPlayer.role]}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Prezzo / Crediti Pagati */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>Crediti Pagati (Fanta-Milioni)</span>
            </label>
            <span className="text-[11px] text-slate-400">Step rapidi</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5 items-center">
            <button
              type="button"
              onClick={() => handleStepPrice(-5)}
              disabled={price <= 5}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-slate-200"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => handleStepPrice(-1)}
              disabled={price <= 1}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-slate-200"
            >
              -1
            </button>

            {/* Input Numerico Diretto */}
            <div className="col-span-2 relative">
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full py-2 px-2 text-center font-black text-lg sm:text-xl rounded-xl border border-indigo-500/50 bg-slate-950 text-amber-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">
                FM
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleStepPrice(1)}
              className="py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-xs font-bold text-indigo-300 border border-indigo-500/30"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleStepPrice(5)}
              className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30"
            >
              +5
            </button>
          </div>
        </div>

        {/* Avvisi ed errori di validazione */}
        {!validationResult.valid && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in-50">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{validationResult.error}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in-50">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tasto Assegnazione Definitiva */}
        <button
          type="button"
          onClick={handleExecuteAssign}
          disabled={isAssigning || !selectedPlayer || !validationResult.valid}
          className="w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-950/50 transition-transform active:scale-98 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>
            {isAssigning
              ? 'Registrazione in corso...'
              : selectedPlayer
              ? `REGISTRA ${selectedPlayer.name.toUpperCase()} A ${selectedTeamStat?.team.name.toUpperCase() || 'SQUADRA'} (${price} FM)`
              : 'SELEZIONA UN CALCIATORE'}
          </span>
        </button>
      </div>
    </div>
  );
}
