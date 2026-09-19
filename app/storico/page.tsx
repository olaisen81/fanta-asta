'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  Users,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Coins,
  Shield,
} from 'lucide-react';
import { useAuction } from '../../context/auction-context';
import { getRoleBadgeStyles, formatCredits } from '../../lib/fantacalcio/calculator';
import { PlayerRole, RosterPlayer } from '../../lib/supabase/types';
import { StoricoSkeleton } from '../../components/auction/skeletons';

export default function StoricoPage() {
  const router = useRouter();
  const { seasons, teams, roster, currentUser, isLoadingData, isLoggedIn } = useAuction();

  useEffect(() => {
    if (!isLoadingData && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoadingData, isLoggedIn, router]);

  // Calcola stagioni presenti (ordinate decrescenti)
  const availableSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => b.id.localeCompare(a.id));
  }, [seasons]);

  const currentActiveSeason = useMemo(() => {
    return seasons.find((s) => s.is_current) || availableSeasons[0];
  }, [seasons, availableSeasons]);

  // Seleziona di default la stagione corrente se presente, altrimenti la prima disponibile
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => {
    return seasons.find((s) => s.is_current)?.id || seasons[0]?.id || '2026-2027';
  });

  // Assicura che la stagione selezionata esista tra le stagioni disponibili
  useEffect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.some((s) => s.id === selectedSeasonId)) {
      setSelectedSeasonId(currentActiveSeason?.id || availableSeasons[0].id);
    }
  }, [availableSeasons, selectedSeasonId, currentActiveSeason]);

  const [viewMode, setViewMode] = useState<'rosters' | 'playerSearch'>('rosters');
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');

  // Giocatori della stagione selezionata
  const seasonRoster = useMemo(() => {
    const isCurrentActive = currentActiveSeason?.id === selectedSeasonId;
    return roster.filter(
      (r) =>
        r.season_id === selectedSeasonId ||
        (!r.season_id && (isCurrentActive || selectedSeasonId === '2026-2027'))
    );
  }, [roster, selectedSeasonId, currentActiveSeason]);

  // Squadre della stagione selezionata
  const seasonTeams = useMemo(() => {
    const directTeams = teams.filter((t) => t.season_id === selectedSeasonId);
    if (directTeams.length > 0) return directTeams;

    // Se la stagione è quella corrente, usa le squadre della lega
    if (currentActiveSeason?.id === selectedSeasonId || selectedSeasonId === '2026-2027') {
      return teams;
    }

    // Altrimenti ricava le squadre uniche dai record della rosa
    const uniqueTeamIds = Array.from(new Set(seasonRoster.map((r) => r.team_id)));
    if (uniqueTeamIds.length > 0) {
      return uniqueTeamIds.map((tid, idx) => {
        const match = teams.find((t) => t.id === tid);
        if (match) return match;
        const cleanName =
          tid.replace(/^team-[^_]+_?/, '').replace(/_/g, ' ') || `Squadra ${idx + 1}`;
        return {
          id: tid,
          league_id: '00000000-0000-0000-0000-000000000001',
          season_id: selectedSeasonId,
          name: cleanName,
          manager_name: cleanName,
          initial_budget: 500,
          order_index: idx + 1,
        };
      });
    }

    return teams;
  }, [teams, seasonRoster, selectedSeasonId, currentActiveSeason]);

  // Statistiche per la stagione selezionata
  const seasonStats = useMemo(() => {
    const active = seasonRoster.filter((r) => !r.is_released);
    const totalSpent = active.reduce((acc, curr) => acc + curr.price, 0);
    const repairSignings = seasonRoster.filter((r) => r.session === 'repair');
    const releasedCount = seasonRoster.filter((r) => r.is_released).length;

    // Giocatore più pagato della stagione
    let topPlayer: RosterPlayer | null = null;
    for (const p of seasonRoster) {
      if (!topPlayer || p.price > topPlayer.price) {
        topPlayer = p;
      }
    }

    return {
      totalPlayers: active.length,
      totalSpent,
      repairSigningsCount: repairSignings.length,
      releasedCount,
      topPlayer,
    };
  }, [seasonRoster]);

  // Ricerca globale carriera calciatore in tutte le stagioni
  const playerCareerResults = useMemo(() => {
    if (!searchPlayerQuery.trim() || searchPlayerQuery.trim().length < 2) return [];

    const query = searchPlayerQuery.toLowerCase().trim();
    const matches = roster.filter((r) => r.player_name.toLowerCase().includes(query));

    // Raggruppa per nome normalizzato
    const grouped = new Map<
      string,
      {
        playerName: string;
        role: PlayerRole;
        appearances: {
          seasonId: string;
          seasonName: string;
          teamName: string;
          price: number;
          session?: string;
          isReleased?: boolean;
        }[];
      }
    >();

    for (const m of matches) {
      const normName = m.player_name.trim();
      const seasonObj = seasons.find((s) => s.id === (m.season_id || '2026-2027'));
      const teamObj = teams.find((t) => t.id === m.team_id);
      const teamName =
        teamObj?.name ||
        m.team_id.replace(/^team-[^_]+_?/, '').replace(/_/g, ' ') ||
        'Squadra';

      if (!grouped.has(normName)) {
        grouped.set(normName, {
          playerName: normName,
          role: m.role,
          appearances: [],
        });
      }

      grouped.get(normName)!.appearances.push({
        seasonId: m.season_id || '2026-2027',
        seasonName: seasonObj?.name || m.season_id || '2026/2027',
        teamName,
        price: m.price,
        session: m.session,
        isReleased: m.is_released,
      });
    }

    return Array.from(grouped.values()).map((p) => {
      p.appearances.sort((a, b) => b.seasonId.localeCompare(a.seasonId));
      const prices = p.appearances.map((a) => a.price);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      return {
        ...p,
        avgPrice,
        maxPrice,
        minPrice,
      };
    });
  }, [roster, searchPlayerQuery, seasons, teams]);

  // Export CSV della stagione
  const exportSeasonCSV = () => {
    const rows = [
      ['Stagione', 'Squadra', 'Calciatore', 'Ruolo', 'Club Serie A', 'Prezzo FM', 'Sessione', 'Stato'],
    ];

    for (const r of seasonRoster) {
      const teamObj = teams.find((t) => t.id === r.team_id);
      rows.push([
        selectedSeasonId,
        `"${teamObj?.name || r.team_id}"`,
        `"${r.player_name}"`,
        r.role,
        `"${r.serie_a_team}"`,
        r.price.toString(),
        r.session === 'repair' ? 'Riparazione (Gennaio)' : 'Estiva',
        r.is_released ? `Svincolato (Rimborso: ${r.refund_amount || 0})` : 'In rosa',
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Storico_Rose_${selectedSeasonId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingData || !isLoggedIn) {
    return <StoricoSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Season Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Archivio Storico Rose & Aste
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Consulta le rose degli anni passati, le valutazioni dei calciatori e i colpi di
                gennaio
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons & Import CTA */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.isAdmin && (
            <Link
              href="/admin/importa-storico"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Importa Excel (10 Anni)</span>
            </Link>
          )}

          <button
            type="button"
            onClick={exportSeasonCSV}
            disabled={seasonRoster.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Esporta CSV</span>
          </button>
        </div>
      </div>

      {/* Season Picker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            Stagione:
          </span>
          {availableSeasons.map((s) => {
            const isSelected = selectedSeasonId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSeasonId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-850'
                }`}
              >
                <span>{s.name}</span>
                {s.is_current ? (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    In corso
                  </span>
                ) : (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                    Archiviata
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('rosters')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'rosters'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Rose Complete</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('playerSearch')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'playerSearch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cerca Giocatore</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for the selected season */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            Squadre & Calciatori
          </div>
          <div className="text-xl font-black text-white mt-1">
            {seasonTeams.length} <span className="text-xs font-normal text-slate-400">squadre</span>{' '}
            · {seasonStats.totalPlayers}{' '}
            <span className="text-xs font-normal text-slate-400">in rosa</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            Crediti Spesi Totali
          </div>
          <div className="text-xl font-black text-amber-400 mt-1">
            {seasonStats.totalSpent} FM
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Asta di Riparazione
          </div>
          <div className="text-xl font-black text-sky-400 mt-1">
            {seasonStats.repairSigningsCount}{' '}
            <span className="text-xs font-normal text-slate-400">acquisti gen.</span>
            {seasonStats.releasedCount > 0 && (
              <span className="text-xs font-normal text-rose-400 ml-1">
                ({seasonStats.releasedCount} svincoli)
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-rose-400" />
            Top Player Pagato
          </div>
          <div className="truncate text-base font-black text-white mt-1">
            {seasonStats.topPlayer ? (
              <>
                <span className="text-rose-400">{seasonStats.topPlayer.player_name}</span>{' '}
                <span className="text-xs font-bold text-amber-400">
                  ({seasonStats.topPlayer.price} FM)
                </span>
              </>
            ) : (
              <span className="text-slate-500 text-xs">Nessuno</span>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ROSTERS OF THE SELECTED SEASON */}
      {viewMode === 'rosters' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
            {/* Team filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Squadra:</span>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Tutte le squadre ({seasonTeams.length})</option>
                {seasonTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.manager_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Role filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Ruolo:</span>
              {(['ALL', 'P', 'D', 'C', 'A'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedRoleFilter === r
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'Tutti' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state if no players in this season */}
          {seasonRoster.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                <History className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                Nessuna rosa registrata per la stagione {selectedSeasonId}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Puoi caricare lo storico degli anni passati tramite il pulsante "Importa Excel (10
                Anni)" oppure caricare i dati dimostrativi con 1 click.
              </p>
              {currentUser.isAdmin && (
                <Link
                  href="/admin/importa-storico"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Vai all'Importatore Excel</span>
                </Link>
              )}
            </div>
          ) : (
            /* Teams Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {seasonTeams
                .filter((t) => selectedTeamFilter === 'ALL' || t.id === selectedTeamFilter)
                .map((team) => {
                  const teamPlayers = seasonRoster.filter(
                    (r) =>
                      r.team_id === team.id &&
                      (selectedRoleFilter === 'ALL' || r.role === selectedRoleFilter)
                  );

                  const activePlayers = teamPlayers.filter((r) => !r.is_released);
                  const spent = activePlayers.reduce((acc, curr) => acc + curr.price, 0);

                  return (
                    <div
                      key={team.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-lg hover:border-slate-700 transition-colors"
                    >
                      {/* Team Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-white">{team.name}</h3>
                          <p className="text-xs text-slate-400">{team.manager_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Spesa rosa:</div>
                          <div className="font-black text-amber-400 text-sm">{spent} FM</div>
                        </div>
                      </div>

                      {/* Players list */}
                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                        {teamPlayers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500">
                            Nessun calciatore presente con i filtri selezionati.
                          </div>
                        ) : (
                          teamPlayers.map((player) => {
                            const badge = getRoleBadgeStyles(player.role);
                            return (
                              <div
                                key={player.id}
                                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                                  player.is_released
                                    ? 'bg-rose-950/20 border border-rose-900/30 opacity-70'
                                    : 'bg-slate-950/60 hover:bg-slate-950 border border-slate-850'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-6 w-6 rounded-lg font-bold text-[10px] flex items-center justify-center border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                                  >
                                    {player.role}
                                  </span>
                                  <div>
                                    <div
                                      className={`font-bold ${
                                        player.is_released
                                          ? 'line-through text-slate-400'
                                          : 'text-white'
                                      }`}
                                    >
                                      {player.player_name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                      <span>{player.serie_a_team}</span>
                                      {player.session === 'repair' && (
                                        <span className="text-sky-400 font-medium">
                                          · ❄️ Riparazione
                                        </span>
                                      )}
                                      {player.is_released && (
                                        <span className="text-rose-400 font-semibold">
                                          · Svincolato (+{player.refund_amount || 0} FM)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="font-black text-amber-400 text-xs shrink-0">
                                  {player.price} FM
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: PLAYER HISTORICAL SEARCH ACROSS ALL SEASONS */}
      {viewMode === 'playerSearch' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Digita il nome di un calciatore per analizzare la sua carriera nella tua lega:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchPlayerQuery}
                onChange={(e) => setSearchPlayerQuery(e.target.value)}
                placeholder="Es. Lautaro, Vlahovic, Dybala, Barella, Osimhen..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Cerca tra tutte le stagioni caricate per confrontare prezzo medio, offerta record e
              squadre che lo hanno acquistato nel corso degli anni.
            </p>
          </div>

          {/* Results */}
          {searchPlayerQuery.trim().length >= 2 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400">
                Trovati {playerCareerResults.length} calciatori corrispondenti:
              </div>

              {playerCareerResults.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
                  Nessun calciatore trovato con il nome "{searchPlayerQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {playerCareerResults.map((player, idx) => {
                    const badge = getRoleBadgeStyles(player.role);
                    return (
                      <div
                        key={idx}
                        className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-md"
                      >
                        {/* Player Header with Kpis */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-8 w-8 rounded-xl font-bold text-xs flex items-center justify-center border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {player.role}
                            </span>
                            <div>
                              <h3 className="font-extrabold text-base text-white">
                                {player.playerName}
                              </h3>
                              <p className="text-[11px] text-slate-400">
                                Acquistato in {player.appearances.length}{' '}
                                {player.appearances.length === 1 ? 'asta' : 'aste'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Prezzo Medio
                            </div>
                            <div className="font-black text-amber-400 text-sm">
                              {player.avgPrice} FM
                            </div>
                          </div>
                        </div>

                        {/* Historical Appearances Timeline */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Storico Aste & Prezzi Pagati:
                          </div>

                          <div className="space-y-1.5">
                            {player.appearances.map((app, appIdx) => (
                              <div
                                key={appIdx}
                                className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-indigo-400 text-xs">
                                    {app.seasonName}
                                  </span>
                                  <span className="text-slate-500">·</span>
                                  <span className="text-slate-200 font-medium">
                                    {app.teamName}
                                  </span>
                                  {app.session === 'repair' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium">
                                      Gennaio
                                    </span>
                                  )}
                                  {app.isReleased && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                                      Svincolato
                                    </span>
                                  )}
                                </div>

                                <div className="font-black text-amber-400 text-xs">
                                  {app.price} FM
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
