'use client';

import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, CheckCircle2, User, Sparkles } from 'lucide-react';
import { Player, PlayerRole } from '../../lib/supabase/types';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

interface PlayerAutocompleteProps {
  onSelectPlayer: (player: Player) => void;
  onOpenManualModal: () => void;
}

export function PlayerAutocomplete({ onSelectPlayer, onOpenManualModal }: PlayerAutocompleteProps) {
  const { players, roster, teams } = useAuction();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>('ALL');

  // Set di ID e Nomi dei calciatori già acquistati
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

  // Filtra calciatori per ricerca testuale e ruolo
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim() && selectedRole === 'ALL') {
      // Mostra i primi 8 giocatori liberi consigliati
      return players
        .filter((p) => !purchasedMap.has(p.id) && !purchasedMap.has(p.name.toLowerCase()))
        .slice(0, 8);
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
      .slice(0, 15);
  }, [players, searchTerm, selectedRole, purchasedMap]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0e1626] p-3 sm:p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <Search className="h-4 w-4 text-indigo-400" />
          Cerca Calciatore Serie A
        </label>
        <button
          onClick={onOpenManualModal}
          className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>+ Manuale</span>
        </button>
      </div>

      {/* Input di Ricerca */}
      <div className="relative mb-2.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per nome o squadra (es. Lautaro, Dimarco, Inter)..."
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtri Ruolo Rapidi */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
        {(['ALL', 'P', 'D', 'C', 'A'] as const).map((r) => {
          const isAll = r === 'ALL';
          const isSelected = selectedRole === r;
          const badge = isAll ? null : getRoleBadgeStyles(r as PlayerRole);

          return (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? isAll
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : `${badge?.bg} ${badge?.text} border ${badge?.border}`
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isAll ? 'Tutti' : `${r} - ${badge?.label}`}
            </button>
          );
        })}
      </div>

      {/* Risultati Calciatori */}
      <div className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
        {filteredPlayers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800/60 p-4">
            <p>Nessun calciatore trovato per "{searchTerm}".</p>
            <button
              onClick={onOpenManualModal}
              className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Aggiungi "{searchTerm || 'Calciatore'}" Manualmente
            </button>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const purchasedInfo =
              purchasedMap.get(player.id) || purchasedMap.get(player.name.toLowerCase());
            const isPurchased = Boolean(purchasedInfo);
            const badge = getRoleBadgeStyles(player.role);

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all ${
                  isPurchased
                    ? 'border-slate-800 bg-slate-900/30 opacity-60'
                    : 'border-slate-800/80 bg-slate-900/80 hover:bg-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Badge Ruolo */}
                  <span
                    className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {player.role}
                  </span>

                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{player.name}</span>
                      {player.is_custom && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Manuale
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="text-slate-300 font-medium">{player.team}</span>
                      <span>·</span>
                      <span>Quotazione: {player.initial_price} FM</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isPurchased ? (
                    <span className="text-[10px] sm:text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {purchasedInfo?.teamName} ({purchasedInfo?.price} FM)
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectPlayer(player)}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-transform active:scale-95"
                    >
                      Chiama
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
