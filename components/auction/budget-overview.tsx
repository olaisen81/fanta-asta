'use client';

import React from 'react';
import { Users, Eye, Coins, AlertCircle } from 'lucide-react';
import { TeamBudgetStats, PlayerRole } from '../../lib/supabase/types';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

interface BudgetOverviewProps {
  onSelectTeam: (teamId: string) => void;
  onPreSelectTeam?: (teamId: string) => void;
}

export function BudgetOverview({ onSelectTeam, onPreSelectTeam }: BudgetOverviewProps) {
  const { teamsStats, currentUser } = useAuction();

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0e1628] p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Le 10 Squadre · Budget & Slot
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Tocca una squadra per visualizzare la rosa completa
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {teamsStats.map((stat) => {
          const isUserTeam = currentUser.teamId === stat.team.id;
          const percentageRemaining = Math.max(
            0,
            Math.min(100, (stat.remaining / stat.team.initial_budget) * 100)
          );

          return (
            <div
              key={stat.team.id}
              onClick={() => onSelectTeam(stat.team.id)}
              className={`group cursor-pointer rounded-2xl border p-3 transition-all hover:scale-[1.02] active:scale-[0.99] ${
                isUserTeam
                  ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-slate-900/90 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                  : 'border-slate-800/90 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Header Squadra */}
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{stat.team.name}</span>
                    {isUserTeam && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-bold shrink-0">
                        TU
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {stat.team.manager_name}
                  </div>
                </div>

                <div className="shrink-0 p-1 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors">
                  <Eye className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Crediti Residui & Offerta Massima */}
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-black text-amber-400 tracking-tight">
                    {stat.remaining}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1 font-semibold">FM</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Max puntata:</span>
                  <span className="text-xs font-bold text-slate-200">{stat.maxBid} FM</span>
                </div>
              </div>

              {/* Barra Avanzamento Spesa */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${percentageRemaining}%` }}
                />
              </div>

              {/* Slot Ruolo (P D C A) */}
              <div className="mt-2.5 grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                {(['P', 'D', 'C', 'A'] as PlayerRole[]).map((r) => {
                  const badge = getRoleBadgeStyles(r);
                  const count = stat.roleCounts[r];
                  const max = stat.roleMax[r];
                  const isFull = count >= max;

                  return (
                    <div
                      key={r}
                      className={`py-0.5 rounded-md border ${
                        isFull
                          ? 'bg-slate-800/90 text-slate-400 border-slate-700/50'
                          : `${badge.bg} ${badge.text} ${badge.border}`
                      }`}
                    >
                      <span className="text-[9px] opacity-75">{r}: </span>
                      <span>
                        {count}/{max}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Giocatori: {stat.playersCount}/
                  {stat.roleMax.P + stat.roleMax.D + stat.roleMax.C + stat.roleMax.A}
                </span>
                <span>Spesi: {stat.spent} FM</span>
              </div>

              {currentUser.isAdmin && onPreSelectTeam && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreSelectTeam(stat.team.id);
                    }}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                  >
                    <span>+ Assegna a questa squadra</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
