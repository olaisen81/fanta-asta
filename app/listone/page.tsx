'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuction } from '../../context/auction-context';
import { PlayerRole, Player } from '../../lib/supabase/types';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';
import { parsePlayerListFile } from '../../lib/fantacalcio/excel-parser';
import { ManualPlayerModal } from '../../components/auction/manual-player-modal';
import {
  BookOpen,
  Search,
  Upload,
  PlusCircle,
  CheckCircle2,
  Filter,
  Gavel,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { ListoneSkeleton } from '../../components/auction/skeletons';

export default function ListonePage() {
  const router = useRouter();
  const { players, roster, teams, currentUser, callPlayer, importPlayers, isLoadingData, isLoggedIn } = useAuction();

  useEffect(() => {
    if (!isLoadingData && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoadingData, isLoggedIn, router]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'FREE' | 'BOUGHT'>('ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<{ count: number; error?: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [localListoneInfo, setLocalListoneInfo] = useState<{
    fileName: string;
    totalParsed: number;
    players: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlla la presenza del file Quotazioni locale nel progetto
  useEffect(() => {
    async function checkLocalListone() {
      try {
        const res = await fetch('/api/import-local-listone');
        const data = await res.json();
        if (data.success && data.players && data.players.length > 0) {
          setLocalListoneInfo(data);
        }
      } catch {
        // Ignora silenziosamente
      }
    }
    checkLocalListone();
  }, []);

  const handleImportLocalListone = async () => {
    if (!localListoneInfo) return;
    try {
      setIsImporting(true);
      setImportNotice(null);
      const importedCount = await importPlayers(localListoneInfo.players);
      setImportNotice({ count: importedCount });
    } catch (err: any) {
      setImportNotice({
        count: 0,
        error: err.message || 'Errore durante il caricamento del listone locale.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Mappa dei calciatori acquistati
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

  // Lista di tutti i club unici di Serie A presenti nel listone
  const allClubs = useMemo(() => {
    const clubs = new Set<string>();
    players.forEach((p) => {
      if (p.team) clubs.add(p.team);
    });
    return Array.from(clubs).sort();
  }, [players]);

  // Gestione caricamento file Excel / CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportNotice(null);
      const result = await parsePlayerListFile(file);

      if (result.players.length === 0) {
        setImportNotice({
          count: 0,
          error: 'Nessun calciatore valido trovato nel file. Verifica il formato delle colonne (Ruolo, Nome, Squadra, Quotazione).',
        });
        return;
      }

      const importedCount = await importPlayers(result.players);
      setImportNotice({ count: importedCount });
    } catch (err: any) {
      setImportNotice({ count: 0, error: err.message || 'Errore nel parsing del file.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtraggio lista calciatori
  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return players.filter((player) => {
      // Filtro ruolo
      if (selectedRole !== 'ALL' && player.role !== selectedRole) return false;

      // Filtro club
      if (selectedClub !== 'ALL' && player.team !== selectedClub) return false;

      // Filtro stato (libero o acquistato)
      const isBought =
        purchasedMap.has(player.id) || purchasedMap.has(player.name.toLowerCase());
      if (selectedStatus === 'FREE' && isBought) return false;
      if (selectedStatus === 'BOUGHT' && !isBought) return false;

      // Filtro testo
      if (term) {
        const matchesName = player.name.toLowerCase().includes(term);
        const matchesTeam = player.team.toLowerCase().includes(term);
        if (!matchesName && !matchesTeam) return false;
      }

      return true;
    });
  }, [players, searchTerm, selectedRole, selectedClub, selectedStatus, purchasedMap]);

  if (isLoadingData || !isLoggedIn) {
    return <ListoneSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-400" />
            Listone Calciatori Serie A
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {players.length} calciatori caricati · {roster.length} acquistati · {players.length - roster.length} disponibili
          </p>
        </div>

        {/* Azioni Admin: Caricamento File & Aggiunta Manuale */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {currentUser.isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-file-input"
              />

              {localListoneInfo && (
                <button
                  onClick={handleImportLocalListone}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-all"
                  title={`Importa il file locale ${localListoneInfo.fileName} (${localListoneInfo.totalParsed} calciatori)`}
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="hidden sm:inline">Importa Listone Ufficiale ({localListoneInfo.totalParsed})</span>
                  <span className="sm:hidden">Quotazioni ({localListoneInfo.totalParsed})</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Carica file Excel o CSV delle quotazioni ufficiali Fantacalcio.it"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                <span>{isImporting ? 'Caricamento...' : 'Carica File'}</span>
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Calciatore Manuale</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner File Locale Rilevato nel Progetto */}
      {currentUser.isAdmin && localListoneInfo && !importNotice && (
        <div className="p-3 sm:p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">
                Rilevato file listone ufficiale: <span className="text-indigo-300 font-mono">{localListoneInfo.fileName}</span>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Contiene {localListoneInfo.totalParsed} calciatori con ruoli, squadre e quotazioni aggiornate per la stagione 2026/2027.
              </p>
            </div>
          </div>
          <button
            onClick={handleImportLocalListone}
            disabled={isImporting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isImporting ? 'Importazione in corso...' : 'Importa come Listone'}</span>
          </button>
        </div>
      )}

      {/* Avviso Esito Importazione File */}
      {importNotice && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in-50 ${
            importNotice.error
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.error ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>
              {importNotice.error ||
                `Importazione completata con successo! Aggiunti ${importNotice.count} nuovi calciatori.`}
            </span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-xs opacity-75 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra Filtri e Ricerca */}
      <div className="rounded-2xl border border-slate-800 bg-[#0e1628] p-3 sm:p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Ricerca Testo */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per nome o club (es. Vlahovic, Inter)..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
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

          {/* Filtro Squadra Club Serie A */}
          <div className="sm:col-span-4">
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tutti i Club Serie A</option>
              {allClubs.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Stato */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="FREE">Solo Calciatori Liberi</option>
              <option value="BOUGHT">Solo Calciatori Acquistati</option>
            </select>
          </div>
        </div>

        {/* Filtri Ruolo (P, D, C, A) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          {(['ALL', 'P', 'D', 'C', 'A'] as const).map((r) => {
            const isAll = r === 'ALL';
            const isSelected = selectedRole === r;
            const badge = isAll ? null : getRoleBadgeStyles(r as PlayerRole);

            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? isAll
                      ? 'bg-indigo-600 text-white shadow-md'
                      : `${badge?.bg} ${badge?.text} border ${badge?.border}`
                    : 'bg-slate-850 border border-slate-750 text-slate-300 hover:text-white'
                }`}
              >
                {isAll ? 'Tutti i Ruoli' : `${r} - ${badge?.label}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabella Calciatori */}
      <div className="rounded-3xl border border-slate-800 bg-[#0e1628] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Ruolo</th>
                <th className="py-3.5 px-4">Calciatore</th>
                <th className="py-3.5 px-4">Club Serie A</th>
                <th className="py-3.5 px-4 text-center">Quotazione</th>
                <th className="py-3.5 px-4">Stato Asta</th>
                {currentUser.isAdmin && <th className="py-3.5 px-4 text-right">Azione</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.isAdmin ? 6 : 5} className="py-12 text-center text-slate-400">
                    Nessun calciatore corrisponde ai filtri selezionati.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const purchasedInfo =
                    purchasedMap.get(player.id) ||
                    purchasedMap.get(player.name.toLowerCase());
                  const isPurchased = Boolean(purchasedInfo);
                  const badge = getRoleBadgeStyles(player.role);

                  return (
                    <tr
                      key={player.id}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        isPurchased ? 'opacity-60 bg-slate-900/30' : ''
                      }`}
                    >
                      {/* Ruolo */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-black text-xs border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {player.role}
                        </span>
                      </td>

                      {/* Nome */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {player.is_custom && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Manuale
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Club */}
                      <td className="py-3 px-4 text-slate-300 font-medium">{player.team}</td>

                      {/* Quotazione Base */}
                      <td className="py-3 px-4 text-center font-bold text-amber-400">
                        {player.initial_price} FM
                      </td>

                      {/* Stato Asta */}
                      <td className="py-3 px-4">
                        {isPurchased ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {purchasedInfo?.teamName} ({purchasedInfo?.price} FM)
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs text-slate-400 bg-slate-800/60">
                            Libero
                          </span>
                        )}
                      </td>

                      {/* Azione Admin */}
                      {currentUser.isAdmin && (
                        <td className="py-3 px-4 text-right">
                          {!isPurchased && (
                            <Link
                              href={`/?player=${encodeURIComponent(player.name)}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>Assegna</span>
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale Inserimento Calciatore Manuale */}
      <ManualPlayerModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onPlayerCreated={(p) => {
          setSelectedRole(p.role);
          setSearchTerm(p.name);
        }}
      />
    </div>
  );
}
