'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  History,
  Sparkles,
  Calendar,
  Users,
  ShieldCheck,
  RefreshCw,
  Eye,
  Loader2,
} from 'lucide-react';
import { useAuction } from '../../../context/auction-context';
import {
  parseHistoricalExcelFile,
  generateHistorySampleExcel,
  HistoryImportResult,
} from '../../../lib/fantacalcio/history-importer';
import { getRoleBadgeStyles } from '../../../lib/fantacalcio/calculator';
import { PlayerRole, Team } from '../../../lib/supabase/types';
import { Skeleton } from '../../../components/auction/skeletons';

export default function ImportaStoricoPage() {
  const router = useRouter();
  const { currentUser, importHistoricalData, seasons, players, isLoadingData, isLoggedIn } = useAuction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoadingData) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (!currentUser.isAdmin) {
        router.replace('/rose');
      }
    }
  }, [isLoadingData, isLoggedIn, currentUser.isAdmin, router]);

  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<HistoryImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{
    seasonsCount: number;
    rosterCount: number;
  } | null>(null);
  const [selectedPreviewSeason, setSelectedPreviewSeason] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setImportSuccess(null);

      const result = await parseHistoricalExcelFile(file, players);
      if (result.seasons.length === 0 || result.roster.length === 0) {
        setErrorMessage(
          'Nessun dato di rose valido rilevato nel file Excel. Verifica che i fogli o le colonne contengano i campi richiesti (Stagione, Squadra, Calciatore, Ruolo, Prezzo).'
        );
        setParsedData(null);
      } else {
        setParsedData(result);
        setSelectedPreviewSeason(result.seasons[0]?.id || '');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Errore nella lettura del file Excel.');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    try {
      setIsLoading(true);
      const res = await importHistoricalData(
        parsedData.seasons,
        parsedData.teams,
        parsedData.roster
      );
      setImportSuccess(res);
      setParsedData(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante il salvataggio dei dati storici.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    // Genera un blob dal sample excel e parsalo per caricamento demo
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Crea dati demo direttamente
      const demoSeasons = [
        { id: '2025-2026', name: '2025/2026', is_current: false, budget: 500 },
        { id: '2024-2025', name: '2024/2025', is_current: false, budget: 500 },
        { id: '2023-2024', name: '2023/2024', is_current: false, budget: 500 },
      ];

      const demoTeams = [
        { id: 'team-2025-2026_madrink', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', name: 'Real Madrink', manager_name: 'Fabio', initial_budget: 500, order_index: 1 },
        { id: 'team-2025-2026_vangoof', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', name: 'Atletico Van Goof', manager_name: 'Marco', initial_budget: 500, order_index: 2 },
        { id: 'team-2024-2025_madrink', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', name: 'Real Madrink', manager_name: 'Fabio', initial_budget: 500, order_index: 1 },
        { id: 'team-2024-2025_kiev', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', name: 'Dinamo Kiev', manager_name: 'Matteo', initial_budget: 500, order_index: 2 },
      ];

      const demoRoster = [
        // 2025/2026
        { id: 'demo-1', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_madrink', player_name: 'Lautaro Martinez', role: 'A' as PlayerRole, serie_a_team: 'Inter', price: 185, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-2', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_madrink', player_name: 'Barella Nicolo', role: 'C' as PlayerRole, serie_a_team: 'Inter', price: 34, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-3', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_madrink', player_name: 'Dimarco Federico', role: 'D' as PlayerRole, serie_a_team: 'Inter', price: 28, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-4', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_madrink', player_name: 'Sommer Yann', role: 'P' as PlayerRole, serie_a_team: 'Inter', price: 42, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-5', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_madrink', player_name: 'Castro Santiago', role: 'A' as PlayerRole, serie_a_team: 'Bologna', price: 25, session: 'repair' as const, purchased_at: new Date('2026-02-03').toISOString() },
        { id: 'demo-6', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_vangoof', player_name: 'Vlahovic Dusan', role: 'A' as PlayerRole, serie_a_team: 'Juventus', price: 165, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-7', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_vangoof', player_name: 'Pulisic Christian', role: 'C' as PlayerRole, serie_a_team: 'Milan', price: 50, session: 'initial' as const, purchased_at: new Date('2025-09-02').toISOString() },
        { id: 'demo-8', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2025-2026', team_id: 'team-2025-2026_vangoof', player_name: 'Bremer Gleison', role: 'D' as PlayerRole, serie_a_team: 'Juventus', price: 32, session: 'initial' as const, is_released: true, refund_amount: 16, purchased_at: new Date('2025-09-02').toISOString() },
        // 2024/2025
        { id: 'demo-9', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', team_id: 'team-2024-2025_madrink', player_name: 'Osimhen Victor', role: 'A' as PlayerRole, serie_a_team: 'Napoli', price: 195, session: 'initial' as const, purchased_at: new Date('2024-09-03').toISOString() },
        { id: 'demo-10', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', team_id: 'team-2024-2025_madrink', player_name: 'Calhanoglu Hakan', role: 'C' as PlayerRole, serie_a_team: 'Inter', price: 44, session: 'initial' as const, purchased_at: new Date('2024-09-03').toISOString() },
        { id: 'demo-11', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', team_id: 'team-2024-2025_kiev', player_name: 'Dybala Paulo', role: 'A' as PlayerRole, serie_a_team: 'Roma', price: 90, session: 'initial' as const, purchased_at: new Date('2024-09-03').toISOString() },
        { id: 'demo-12', league_id: '00000000-0000-0000-0000-000000000001', season_id: '2024-2025', team_id: 'team-2024-2025_kiev', player_name: 'Koopmeiners Teun', role: 'C' as PlayerRole, serie_a_team: 'Atalanta', price: 48, session: 'initial' as const, purchased_at: new Date('2024-09-03').toISOString() },
      ];

      const res = await importHistoricalData(demoSeasons, demoTeams, demoRoster);
      setImportSuccess(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore nel caricamento demo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLocalExcelFile = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setImportSuccess(null);

      const res = await fetch('/api/import-local-history');
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Impossibile leggere il file locale.');
      }

      setParsedData(json.data);
      setSelectedPreviewSeason(json.data.seasons[0]?.id || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la lettura del file locale.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPreviewRoster = parsedData
    ? parsedData.roster.filter((r) => r.season_id === selectedPreviewSeason)
    : [];

  const hasMore = visibleCount < filteredPreviewRoster.length;

  const previewTeamsMap = useMemo(() => {
    const map = new Map<string, Team>();
    if (parsedData?.teams) {
      for (const t of parsedData.teams) {
        map.set(t.id, t);
      }
    }
    return map;
  }, [parsedData]);

  // Reset scroll and visible count when season or parsed data changes
  useEffect(() => {
    setVisibleCount(50);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [selectedPreviewSeason, parsedData]);

  // IntersectionObserver for lazy loading next batches when scrolling down
  useEffect(() => {
    if (!hasMore) return;

    const currentSentinel = loadMoreRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, filteredPreviewRoster.length));
        }
      },
      {
        root: tableContainerRef.current,
        threshold: 0.1,
        rootMargin: '150px',
      }
    );

    observer.observe(currentSentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, filteredPreviewRoster.length]);

  // Direct scroll handler as a fallback for high-speed scrolling or specific containers
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120 && hasMore) {
      setVisibleCount((prev) => Math.min(prev + 50, filteredPreviewRoster.length));
    }
  };

  if (isLoadingData || !isLoggedIn || !currentUser.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Accesso Riservato al Banditore</h1>
        <p className="mt-2 text-sm text-slate-400">
          Solo l'amministratore della lega può importare file Excel e modificare lo storico delle rose.
        </p>
        <Link
          href="/rose"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Vai alle Rose della Lega
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Importa Rose da Excel
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Importa sempre e solo l'ultima stagione del file Excel per aggiornare in-place i nomi delle 10 squadre della lega e le rispettive rose (senza duplicare le squadre).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateHistorySampleExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            title="Scarica foglio Excel di esempio con colonne e formati corretti"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Scarica Modello Excel</span>
          </button>

          <Link
            href="/storico"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            <History className="h-4 w-4" />
            <span>Vedi Archivio</span>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {importSuccess && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-white text-base">
                Importazione Storico e Aggiornamento 10 Squadre Completati!
              </div>
              <div className="text-xs text-emerald-300/80">
                Aggiornati in-place i nomi delle 10 squadre della lega e importate {importSuccess.seasonsCount} stagioni per complessivi {importSuccess.rosterCount} calciatori nello Storico.
              </div>
            </div>
          </div>
          <Link
            href="/storico"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-colors"
          >
            <span>Vai allo Storico Completo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Local File Detected Card */}
      <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-teal-950/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-emerald-950/20">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base">File Excel Rilevato: "Asta Smadonnante.xlsx"</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Archivio Completo Multistagione
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-0.5">
              Verranno estratte tutte le stagioni passate per l'archivio Storico e aggiornati in-place i nomi delle 10 squadre della lega con l'ultima stagione.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleLoadLocalExcelFile}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 shrink-0 transition-all active:scale-95"
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>Carica ed Ispeziona Tutte le Stagioni</span>
        </button>
      </div>

      {/* Dropzone & Quick Demo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 rounded-3xl border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/70 p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all group">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-4 shadow-lg shadow-indigo-500/10">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="font-black text-lg text-white">Trascina o Seleziona il tuo File Excel</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Supporta file Excel multi-foglio (1 foglio per stagione, es. "2024-2025") o foglio unico
            con colonna "Stagione", "Squadra", "Fantallenatore", "Calciatore", "Ruolo", "Prezzo",
            "Sessione" (Estiva/Riparazione).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Analisi in corso...' : 'Sfoglia file dal Computer'}</span>
            </button>
          </div>
        </div>

        {/* Demo Data & Guide Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-2 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Test Rapido</span>
            </div>
            <h4 className="text-base font-extrabold text-white">Non hai il file pronto?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Puoi caricare con 1 click un set di dati storici dimostrativi (3 stagioni: 2023/24,
              2024/25, 2025/26) per esplorare l'archivio, le statistiche storiche dei calciatori e i
              prezzi passati.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleLoadDemoData}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Carica Dati Storici Demo (3 Anni)</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton during file reading / parsing */}
      {isLoading && !parsedData && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 space-y-5 animate-in fade-in-50">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-80" />
            </div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>

          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Preview Section */}
      {parsedData && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 space-y-5 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-400" />
                <h3 className="font-black text-lg text-white">
                  Anteprima Dati Rilevati dal File
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Verifica l'ultima stagione rilevata, i nomi delle 10 squadre e i calciatori associati prima di confermare l'aggiornamento in-place.
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Conferma e Aggiorna 10 Squadre & Rosa</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Ultima Stagione</div>
              <div className="text-2xl font-black text-indigo-400">
                {parsedData.seasons[0]?.name || '2026/2027'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Squadre Lega</div>
              <div className="text-2xl font-black text-sky-400">10 Squadre</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Calciatori in Rosa</div>
              <div className="text-2xl font-black text-emerald-400">{parsedData.roster.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Righe Totali Lette</div>
              <div className="text-2xl font-black text-amber-400">
                {parsedData.totalRowsParsed}
              </div>
            </div>
          </div>

          {/* Season Selector Filter for Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>Seleziona la stagione da ispezionare:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {parsedData.seasons.map((s) => {
                const count = parsedData.roster.filter((r) => r.season_id === s.id).length;
                const isSelected = selectedPreviewSeason === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedPreviewSeason(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="ml-1.5 text-[10px] opacity-75 font-normal">
                      ({count} giocatori)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Preview */}
          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[30rem] scroll-smooth"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-900/95 backdrop-blur-sm text-slate-400 sticky top-0 uppercase tracking-wider text-[10px] z-10 shadow-sm border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ruolo</th>
                  <th className="py-2.5 px-3">Calciatore</th>
                  <th className="py-2.5 px-3">Club Serie A</th>
                  <th className="py-2.5 px-3">Squadra Fantacalcio</th>
                  <th className="py-2.5 px-3 text-right">Prezzo</th>
                  <th className="py-2.5 px-3 text-center">Sessione</th>
                  <th className="py-2.5 px-3 text-center">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPreviewRoster.slice(0, visibleCount).map((r, idx) => {
                  const badge = getRoleBadgeStyles(r.role);
                  return (
                    <tr key={`${r.id || ''}_${idx}`} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg font-bold text-[10px] border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {r.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{r.player_name}</td>
                      <td className="py-2 px-3 text-slate-400">{r.serie_a_team}</td>
                      <td className="py-2 px-3">
                        {(() => {
                          const team = previewTeamsMap.get(r.team_id);
                          const teamName =
                            team?.name ||
                            r.team_id.replace(/^team-[^_]+_/, '').replace(/_/g, ' ');
                          return (
                            <div>
                              <div className="font-bold text-sky-300">{teamName}</div>
                              {team?.manager_name && (
                                <div className="text-[10px] text-slate-400">
                                  {team.manager_name}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-400">
                        {r.price} FM
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.session === 'repair'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {r.session === 'repair' ? '❄️ Gennaio' : '☀️ Estiva'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.is_released ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Svincolato (+{r.refund_amount || 0} FM)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">In rosa</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Infinite Scroll Sentinel / Load Status */}
            {hasMore ? (
              <div
                ref={loadMoreRef}
                className="p-3 text-center text-xs text-slate-400 bg-slate-900/70 border-t border-slate-800 flex items-center justify-center gap-2"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span>
                  Scorri per caricare altri calciatori... ({Math.min(visibleCount, filteredPreviewRoster.length)} di{' '}
                  {filteredPreviewRoster.length})
                </span>
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredPreviewRoster.length)}
                  className="ml-2 text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  Mostra tutti
                </button>
              </div>
            ) : filteredPreviewRoster.length > 0 ? (
              <div className="p-2.5 text-center text-[11px] text-slate-500 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Tutti i {filteredPreviewRoster.length} calciatori caricati per questa stagione.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
