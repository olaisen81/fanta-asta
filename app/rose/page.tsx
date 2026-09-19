'use client';

import React, { useState } from 'react';
import { useAuction } from '../../context/auction-context';
import { PlayerRole, RosterPlayer } from '../../lib/supabase/types';
import { getRoleBadgeStyles, formatCredits } from '../../lib/fantacalcio/calculator';
import { Users, Download, Search, Shield, Filter, Plus, Edit3, Trash2 } from 'lucide-react';
import { EditRosterPlayerModal } from '../../components/auction/edit-roster-player-modal';
import { AddRosterPlayerModal } from '../../components/auction/add-roster-player-modal';
import { DeleteRosterPlayerModal } from '../../components/auction/delete-roster-player-modal';
import { RoseSkeleton } from '../../components/auction/skeletons';

export default function RosePage() {
  const { teams, roster, teamsStats, currentUser, selectedSeasonId, isLoadingData } = useAuction();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Modali di gestione calciatore
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<RosterPlayer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPlayerTeamId, setAddPlayerTeamId] = useState<string | null>(null);

  const roles: PlayerRole[] = ['P', 'D', 'C', 'A'];

  // Funzione esporta riassunto rose in CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Squadra,Fantallenatore,Ruolo,Calciatore,Squadra Serie A,Prezzo FM\n';

    for (const item of roster) {
      if (selectedSeasonId && item.season_id && item.season_id !== selectedSeasonId) continue;
      const team = teams.find((t) => t.id === item.team_id);
      const teamName = team?.name || 'Sconosciuta';
      const manager = team?.manager_name || '';
      csvContent += `"${teamName}","${manager}","${item.role}","${item.player_name}","${item.serie_a_team}",${item.price}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rose_Fantacalcio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedTeams =
    selectedTeamId === 'ALL'
      ? teams
      : teams.filter((t) => t.id === selectedTeamId);

  if (isLoadingData) {
    return <RoseSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Pagina */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            Rose delle 10 Squadre
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Monitoraggio, aggiunta manuale e modifica dei calciatori e dei prezzi pagati
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {currentUser.isAdmin && (
            <button
              type="button"
              onClick={() => {
                setAddPlayerTeamId(selectedTeamId !== 'ALL' ? selectedTeamId : teams[0]?.id || null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Aggiungi Calciatore</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={roster.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            <span>Esporta CSV</span>
          </button>
        </div>
      </div>

      {/* Filtri: Selettore Squadra e Ricerca Calciatore */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Barra di scorrimento orizzontale squadre */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          <button
            onClick={() => setSelectedTeamId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedTeamId === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tutte le Rose ({teams.length})
          </button>

          {teams.map((t) => {
            const isSelected = selectedTeamId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {/* Cerca nella rosa */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Cerca calciatore nella rosa..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Griglia Rose */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayedTeams.map((team) => {
          const stats = teamsStats.find((s) => s.team.id === team.id);
          if (!stats) return null;

          const teamRoster = roster.filter((r) => {
            const matchesTeam = r.team_id === team.id;
            const matchesSeason = !selectedSeasonId || !r.season_id || r.season_id === selectedSeasonId;
            const matchesSearch =
              !searchFilter ||
              r.player_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
              r.serie_a_team.toLowerCase().includes(searchFilter.toLowerCase());
            return matchesTeam && matchesSeason && matchesSearch;
          });

          return (
            <div
              key={team.id}
              className="rounded-3xl border border-slate-800 bg-[#0e1628] p-4 sm:p-5 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Header Squadra */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <span>{team.name}</span>
                      {currentUser.teamId === team.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          La tua squadra
                        </span>
                      )}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Fantallenatore: <span className="text-slate-200 font-medium">{team.manager_name}</span>
                    </div>
                  </div>

                  {/* Actions & Crediti: Totali, Spesi, Rimanenti */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {currentUser.isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddPlayerTeamId(team.id);
                          setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-colors shadow-sm"
                        title={`Aggiungi calciatore a ${team.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Aggiungi</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-inner">
                      <div className="text-center px-1">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Totali</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-200">
                          {stats.totalAvailable} <span className="text-[9px] text-slate-500 font-normal">FM</span>
                        </div>
                      </div>
                      <div className="h-6 w-[1px] bg-slate-800" />
                      <div className="text-center px-1">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Spesi</div>
                        <div className="text-xs sm:text-sm font-bold text-rose-300">
                          {stats.spent} <span className="text-[9px] text-rose-400/60 font-normal">FM</span>
                        </div>
                      </div>
                      <div className="h-6 w-[1px] bg-slate-800" />
                      <div className="text-center px-1">
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Rimanenti</div>
                        <div className="text-xs sm:text-sm font-black text-amber-400">
                          {stats.remaining} <span className="text-[9px] text-amber-500/70 font-normal">FM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistiche Ripartizione Ruoli */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {roles.map((r) => {
                    const badge = getRoleBadgeStyles(r);
                    const count = stats.roleCounts[r];
                    const max = stats.roleMax[r];
                    const spent = stats.roleSpent[r];

                    return (
                      <div
                        key={r}
                        className={`p-2 rounded-xl border text-center ${badge.bg} ${badge.border}`}
                      >
                        <div className={`text-xs font-black ${badge.text}`}>{r}</div>
                        <div className="text-xs font-bold text-white mt-0.5">
                          {count}/{max}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{spent} FM</div>
                      </div>
                    );
                  })}
                </div>

                {/* Elenco Calciatori per Ruolo */}
                <div className="space-y-4">
                  {roles.map((role) => {
                    const rolePlayers = teamRoster.filter((p) => p.role === role);
                    const badge = getRoleBadgeStyles(role);

                    if (rolePlayers.length === 0 && searchFilter) return null;

                    return (
                      <div key={role} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
                            <span>{badge.label} ({rolePlayers.length}/{stats.roleMax[role]})</span>
                          </span>
                        </div>

                        {rolePlayers.length === 0 ? (
                          <div className="px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-[11px] text-slate-500 italic">
                            Nessun {badge.label.toLowerCase()} in rosa
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {rolePlayers.map((p) => (
                              <div
                                key={p.id}
                                className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                              >
                                <div className="min-w-0 pr-1 flex-1">
                                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                    <span>{p.player_name}</span>
                                    {p.session === 'repair' && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-medium">
                                        Gennaio
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {p.serie_a_team}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="font-extrabold text-amber-400">
                                    {p.price} FM
                                  </div>

                                  {currentUser.isAdmin && (
                                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
                </div>
              </div>

              {/* Footer Rosa */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Slot completati: {stats.playersCount}/
                  {stats.roleMax.P + stats.roleMax.D + stats.roleMax.C + stats.roleMax.A}
                </span>
                <span>Totale speso: <strong className="text-white">{stats.spent} FM</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale Modifica Calciatore & Prezzo */}
      <EditRosterPlayerModal
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onDeleteRequest={(p) => setDeletingPlayer(p)}
      />

      {/* Modale Aggiungi Calciatore */}
      <AddRosterPlayerModal
        isOpen={isAddModalOpen}
        initialTeamId={addPlayerTeamId}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddPlayerTeamId(null);
        }}
      />

      {/* Modale Conferma Eliminazione Calciatore */}
      <DeleteRosterPlayerModal
        player={deletingPlayer}
        onClose={() => setDeletingPlayer(null)}
      />
    </div>
  );
}
