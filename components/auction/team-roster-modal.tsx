'use client';

import React, { useState } from 'react';
import { X, Shield, Users, Coins, UserMinus, Plus, Edit3, Trash2 } from 'lucide-react';
import { Team, RosterPlayer, PlayerRole } from '../../lib/supabase/types';
import { getRoleBadgeStyles, formatCredits } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';
import { SvincoloModal } from './repair-modal';
import { EditRosterPlayerModal } from './edit-roster-player-modal';
import { AddRosterPlayerModal } from './add-roster-player-modal';
import { DeleteRosterPlayerModal } from './delete-roster-player-modal';

interface TeamRosterModalProps {
  teamId: string | null;
  onClose: () => void;
}

export function TeamRosterModal({ teamId, onClose }: TeamRosterModalProps) {
  const { teams, roster, teamsStats, currentUser } = useAuction();
  const [svincoloTarget, setSvincoloTarget] = useState<RosterPlayer | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<RosterPlayer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!teamId) return null;

  const team = teams.find((t) => t.id === teamId);
  const stats = teamsStats.find((s) => s.team.id === teamId);
  if (!team || !stats) return null;

  const teamRoster = roster.filter((r) => r.team_id === teamId);
  const releasedPlayers = teamRoster.filter((r) => r.is_released);

  const roles: PlayerRole[] = ['P', 'D', 'C', 'A'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-700 bg-[#0f172a] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-900/80">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{team.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {team.manager_name}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400">
                <span className="text-amber-400 font-bold">{stats.remaining} FM residui</span>
                <span>·</span>
                <span className="text-slate-300">{stats.spent} FM spesi</span>
                {stats.refunds > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 font-semibold">+{stats.refunds} FM rimborsi</span>
                  </>
                )}
                {stats.bonusCredits > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-sky-400 font-semibold">+{stats.bonusCredits} FM bonus</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {stats.playersCount}/{stats.roleMax.P + stats.roleMax.D + stats.roleMax.C + stats.roleMax.A} slot (Max bid: {stats.maxBid} FM)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser.isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-colors"
                  title={`Aggiungi un calciatore a ${team.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Aggiungi</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content con ruoli */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {roles.map((role) => {
              const activeRolePlayers = teamRoster.filter((r) => r.role === role && !r.is_released);
              const badge = getRoleBadgeStyles(role);
              const maxSlot = stats.roleMax[role];
              const currentCount = activeRolePlayers.length;
              const spentInRole = stats.roleSpent[role];

              return (
                <div
                  key={role}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-6 rounded-lg font-black text-xs flex items-center justify-center border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {role}
                      </span>
                      <span className="font-bold text-sm text-white">{badge.label}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {currentCount} / {maxSlot}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      Spesa: <span className="text-amber-400 font-bold">{spentInRole} FM</span>
                    </span>
                  </div>

                  {activeRolePlayers.length === 0 ? (
                    <div className="py-2 text-center text-xs text-slate-500 italic">
                      Nessun {badge.label.toLowerCase()} in rosa
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRolePlayers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0 pr-2 flex-1">
                            <div className="font-bold text-white truncate flex items-center gap-1.5">
                              <span>{p.player_name}</span>
                              {p.session === 'repair' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-medium">
                                  Gennaio
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{p.serie_a_team}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-amber-400 text-sm">
                              {p.price} FM
                            </span>
                            {currentUser.isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingPlayer(p)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/15 transition-colors"
                                  title="Modifica calciatore o prezzo"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPlayer(p)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                                  title="Rimuovi dalla rosa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSvincoloTarget(p)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/15 transition-colors"
                                  title="Svincola calciatore a gennaio (recupero crediti e slot)"
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Svincolati (se presenti) */}
            {releasedPlayers.length > 0 && (
              <div className="rounded-2xl border border-rose-950/40 bg-rose-950/10 p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-rose-900/30 pb-2">
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4 text-rose-400" />
                    <span className="font-bold text-xs text-rose-300">
                      Calciatori Svincolati a Gennaio ({releasedPlayers.length})
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Totale Rimborsato: +{stats.refunds} FM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {releasedPlayers.map((p) => {
                    const badge = getRoleBadgeStyles(p.role);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-rose-950/40 text-xs opacity-75"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-5 w-5 rounded font-bold text-[10px] flex items-center justify-center border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {p.role}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-300 line-through truncate">
                              {p.player_name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Pagato: {p.price} FM · Rimborsato: +{p.refund_amount || 0} FM
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 p-3 bg-slate-900/90 text-right">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {/* Svincolo Modal */}
      {svincoloTarget && (
        <SvincoloModal
          player={svincoloTarget}
          onClose={() => setSvincoloTarget(null)}
        />
      )}

      {/* Modale Modifica Calciatore & Prezzo */}
      <EditRosterPlayerModal
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onDeleteRequest={(p) => setDeletingPlayer(p)}
      />

      {/* Modale Aggiungi Calciatore */}
      <AddRosterPlayerModal
        isOpen={isAddModalOpen}
        initialTeamId={teamId}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Modale Conferma Eliminazione Calciatore */}
      <DeleteRosterPlayerModal
        player={deletingPlayer}
        onClose={() => setDeletingPlayer(null)}
      />
    </>
  );
}

