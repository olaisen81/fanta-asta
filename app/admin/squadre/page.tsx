'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuction } from '../../../context/auction-context';
import { TOTAL_SLOTS, getRoleBadgeStyles } from '../../../lib/fantacalcio/calculator';
import {
  Settings,
  Mail,
  CheckCircle2,
  Copy,
  RotateCcw,
  Save,
  AlertTriangle,
  Sliders,
  Sparkles,
  ShieldCheck,
  Check,
  Trash2,
  Plus,
  PlusCircle,
  Users,
  Calendar,
} from 'lucide-react';
import { AdminSquadreSkeleton } from '../../../components/auction/skeletons';

export default function AdminSquadrePage() {
  const router = useRouter();
  const {
    teams,
    roster,
    league,
    currentUser,
    updateTeam,
    createTeam,
    deleteTeam,
    updateLeagueSettings,
    resetAuction,
    seasons,
    selectedSeasonId,
    archiveSeasonAndStartNew,
    setCurrentActiveSeason,
    isLoadingData,
  } = useAuction();

  useEffect(() => {
    if (!isLoadingData && !currentUser.isAdmin) {
      router.replace('/rose');
    }
  }, [isLoadingData, currentUser.isAdmin, router]);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', manager_name: '', manager_email: '', is_admin: false });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Stato per gestione e archiviazione stagioni
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveForm, setArchiveForm] = useState({ seasonName: '', budget: 500 });
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const currentSeasonObj = useMemo(() => {
    return seasons.find((s) => s.is_current) || seasons.find((s) => s.id === selectedSeasonId) || seasons[0];
  }, [seasons, selectedSeasonId]);

  const suggestedNextSeason = useMemo(() => {
    if (!currentSeasonObj) return '2027/2028';
    const match = currentSeasonObj.name.match(/(\d{4})[^\d]+(\d{4})/);
    if (match) {
      const y1 = parseInt(match[1], 10) + 1;
      const y2 = parseInt(match[2], 10) + 1;
      return `${y1}/${y2}`;
    }
    return '2027/2028';
  }, [currentSeasonObj]);

  // Stato per eliminazione squadra
  const [teamToDelete, setTeamToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stato per aggiunta nuova squadra
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', manager_name: '', manager_email: '', is_admin: false });
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [addTeamSuccess, setAddTeamSuccess] = useState<string | null>(null);

  // Stato per impostazioni lega e composizione rosa
  const [leagueConfig, setLeagueConfig] = useState({
    total_budget: league.total_budget || 500,
    slots_p: league.slots_p || 3,
    slots_d: league.slots_d || 8,
    slots_c: league.slots_c || 8,
    slots_a: league.slots_a || 6,
  });
  const [isSavingLeague, setIsSavingLeague] = useState(false);
  const [leagueSavedNotice, setLeagueSavedNotice] = useState(false);

  const totalSlotsCalculated =
    leagueConfig.slots_p +
    leagueConfig.slots_d +
    leagueConfig.slots_c +
    leagueConfig.slots_a;

  // Preset di composizione comuni
  const applyPreset = (p: number, d: number, c: number, a: number) => {
    setLeagueConfig((prev) => ({
      ...prev,
      slots_p: p,
      slots_d: d,
      slots_c: c,
      slots_a: a,
    }));
  };

  const handleSaveLeagueSettings = async () => {
    try {
      setIsSavingLeague(true);
      await updateLeagueSettings({
        total_budget: Number(leagueConfig.total_budget),
        slots_p: Number(leagueConfig.slots_p),
        slots_d: Number(leagueConfig.slots_d),
        slots_c: Number(leagueConfig.slots_c),
        slots_a: Number(leagueConfig.slots_a),
      });
      setLeagueSavedNotice(true);
      setTimeout(() => setLeagueSavedNotice(false), 4000);
    } finally {
      setIsSavingLeague(false);
    }
  };

  const handleStartEdit = (team: any) => {
    setEditingTeamId(team.id);
    setFormData({
      name: team.name,
      manager_name: team.manager_name,
      manager_email: team.manager_email || '',
      is_admin: Boolean(team.is_admin),
    });
  };

  const handleSaveTeam = async (teamId: string) => {
    await updateTeam(teamId, {
      name: formData.name.trim(),
      manager_name: formData.manager_name.trim(),
      manager_email: formData.manager_email.trim() || null,
      is_admin: formData.is_admin,
    });
    setEditingTeamId(null);
  };

  const handleGenerateInvite = (team: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}/invite?teamId=${team.id}&email=${encodeURIComponent(
      team.manager_email || 'partecipante@fantaasta.it'
    )}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(team.id);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleExecuteReset = async () => {
    await resetAuction();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 4000);
  };

  const handleStartDelete = (team: any) => {
    setTeamToDelete(team);
    setShowDeleteConfirm(true);
  };

  const handleExecuteDelete = async () => {
    if (!teamToDelete) return;
    try {
      setIsDeleting(true);
      const teamName = teamToDelete.name;
      await deleteTeam(teamToDelete.id);
      setShowDeleteConfirm(false);
      setTeamToDelete(null);
      setDeleteSuccessMessage(`Squadra "${teamName}" eliminata con successo.`);
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamData.name.trim() || !newTeamData.manager_name.trim()) return;

    try {
      setIsCreatingTeam(true);
      const created = await createTeam(
        newTeamData.name.trim(),
        newTeamData.manager_name.trim(),
        newTeamData.manager_email.trim() || undefined,
        undefined,
        newTeamData.is_admin
      );
      setShowAddModal(false);
      setNewTeamData({ name: '', manager_name: '', manager_email: '', is_admin: false });
      setAddTeamSuccess(`Squadra "${created.name}" aggiunta alla lega con successo.`);
      setTimeout(() => setAddTeamSuccess(null), 4000);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const teamRosterItems = teamToDelete
    ? roster.filter((r) => r.team_id === teamToDelete.id)
    : [];
  const teamRosterCount = teamRosterItems.length;
  const teamTotalSpent = teamRosterItems.reduce((acc, curr) => acc + curr.price, 0);

  if (isLoadingData || !currentUser.isAdmin) {
    return <AdminSquadreSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-400" />
            Pannello di Amministrazione Lega
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configura la composizione personalizzata delle rose, il budget e gestisci le 10 squadre con inviti email
          </p>
        </div>

        {/* Pulsante Reset Asta */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Azzera e Resetta Asta</span>
        </button>
      </div>

      {/* Avviso Notifica Reset */}
      {resetSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Asta azzerata con successo. Tutti i crediti sono stati ripristinati per le 10 squadre!</span>
        </div>
      )}

      {/* SEZIONE GESTIONE STAGIONI & ARCHIVIAZIONE */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-[#10192e] via-[#0e1628] to-[#1a1510] p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Gestione Stagioni & Archiviazione
                </h2>
                {currentSeasonObj && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Attiva: {currentSeasonObj.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Archivia l'annata in corso nello Storico e avvia una nuova stagione (es. {suggestedNextSeason}) con nuove rose vuote e crediti ripristinati
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setArchiveForm({ seasonName: suggestedNextSeason, budget: league.total_budget || 500 });
                setShowArchiveModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Archivia & Apri Nuova Stagione</span>
            </button>
          </div>
        </div>

        {archiveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{archiveSuccess}</span>
          </div>
        )}

        {archiveError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in-50">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{archiveError}</span>
          </div>
        )}

        {/* Elenco e Switch Stagioni */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 mr-1">Tutte le stagioni ({seasons.length}):</span>
          {seasons.map((s) => {
            const isActive = s.id === (currentSeasonObj?.id || selectedSeasonId);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentActiveSeason(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title={isActive ? 'Stagione attualmente attiva' : `Imposta ${s.name} come stagione attiva`}
              >
                <span>{s.name}</span>
                {s.is_current ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/25 text-slate-950 font-black">
                    Attiva
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                    Archiviata
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEZIONE 1: COMPOSIZIONE ROSA E REGOLAMENTO LEGA */}
      <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-[#10182c] to-[#0c1220] p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white">
                Composizione Rose & Budget Lega
              </h2>
              <p className="text-xs text-slate-400">
                Personalizza il numero di calciatori per ciascun ruolo (P, D, C, A) e il budget iniziale
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
            Totale: {totalSlotsCalculated} Calciatori per Rosa
          </div>
        </div>

        {leagueSavedNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Regolamento aggiornato! Nuova composizione di {totalSlotsCalculated} calciatori salvata e sincronizzata in tempo reale.
            </span>
          </div>
        )}

        {/* Input Slot Ruoli e Budget */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Budget Iniziale */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-900/90 border border-slate-800 p-3">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Budget (FM)
            </label>
            <input
              type="number"
              min="100"
              max="2000"
              step="50"
              value={leagueConfig.total_budget}
              onChange={(e) =>
                setLeagueConfig({ ...leagueConfig, total_budget: Number(e.target.value) || 500 })
              }
              className="w-full px-2.5 py-1.5 text-center font-black text-amber-400 text-base rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-400 block text-center mt-1">Massimale crediti</span>
          </div>

          {/* Slot Portieri (P) */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-400">Portieri (P)</span>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            </div>
            <input
              type="number"
              min="1"
              max="6"
              value={leagueConfig.slots_p}
              onChange={(e) =>
                setLeagueConfig({ ...leagueConfig, slots_p: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full px-2 py-1.5 text-center font-black text-white text-base rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-400 block text-center mt-1">Slot consigliati: 3</span>
          </div>

          {/* Slot Difensori (D) */}
          <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-400">Difensori (D)</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <input
              type="number"
              min="1"
              max="15"
              value={leagueConfig.slots_d}
              onChange={(e) =>
                setLeagueConfig({ ...leagueConfig, slots_d: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full px-2 py-1.5 text-center font-black text-white text-base rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400 block text-center mt-1">Slot consigliati: 8</span>
          </div>

          {/* Slot Centrocampisti (C) */}
          <div className="rounded-2xl bg-slate-900/90 border border-sky-500/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-sky-400">Centrocampisti (C)</span>
              <span className="h-2 w-2 rounded-full bg-sky-400" />
            </div>
            <input
              type="number"
              min="1"
              max="15"
              value={leagueConfig.slots_c}
              onChange={(e) =>
                setLeagueConfig({ ...leagueConfig, slots_c: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full px-2 py-1.5 text-center font-black text-white text-base rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-sky-500"
            />
            <span className="text-[10px] text-slate-400 block text-center mt-1">Slot consigliati: 8</span>
          </div>

          {/* Slot Attaccanti (A) */}
          <div className="rounded-2xl bg-slate-900/90 border border-rose-500/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-400">Attaccanti (A)</span>
              <span className="h-2 w-2 rounded-full bg-rose-400" />
            </div>
            <input
              type="number"
              min="1"
              max="12"
              value={leagueConfig.slots_a}
              onChange={(e) =>
                setLeagueConfig({ ...leagueConfig, slots_a: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full px-2 py-1.5 text-center font-black text-white text-base rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-400 block text-center mt-1">Slot consigliati: 6</span>
          </div>
        </div>

        {/* Preset Rapidi di Composizione */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-semibold mr-1">Preset rapidi:</span>
          <button
            type="button"
            onClick={() => applyPreset(3, 8, 8, 6)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Standard (25): 3P - 8D - 8C - 6A
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3, 7, 8, 5)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Ridotta (23): 3P - 7D - 8C - 5A
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3, 7, 7, 5)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Compatta (22): 3P - 7D - 7C - 5A
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3, 9, 9, 7)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Estesa (28): 3P - 9D - 9C - 7A
          </button>
        </div>

        {/* Tasto Salva Regolamento */}
        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={handleSaveLeagueSettings}
            disabled={isSavingLeague}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>{isSavingLeague ? 'Salvataggio...' : 'Salva Regolamento e Composizione'}</span>
          </button>
        </div>
      </div>

      {/* Spiegazione Inviti Email vs Google */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-slate-300 space-y-1.5">
        <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-sm">
          <Mail className="h-4 w-4" />
          Come funziona l'accesso dei 10 giocatori:
        </div>
        <p>
          1. <strong>Accesso con Google:</strong> I partecipanti con account Google possono accedere direttamente con 1 click dalla pagina di login.
        </p>
        <p>
          2. <strong>Invito Email (senza Google):</strong> Inserisci l'email del partecipante accanto alla sua squadra e clicca "Copia Link Invito" per inviargli il link personalizzato dove potrà impostare la propria password.
        </p>
      </div>

      {/* SEZIONE 2: ELENCO DELLE SQUADRE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Squadre della Lega ({teams.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gestisci i partecipanti, modifica i dati, invia i link d'accesso o elimina squadre
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Nuova Squadra</span>
          </button>
        </div>

        {/* Notifica Eliminazione Successo */}
        {deleteSuccessMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
        )}

        {/* Notifica Aggiunta Successo */}
        {addTeamSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{addTeamSuccess}</span>
          </div>
        )}

        {teams.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 text-xs space-y-3">
            <p>Nessuna squadra presente nella lega.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Aggiungi la prima squadra</span>
            </button>
          </div>
        ) : (
          teams.map((team, idx) => {
            const isEditing = editingTeamId === team.id;
            const currentRosterItems = roster.filter((r) => r.team_id === team.id);
            const teamRosterCount = currentRosterItems.length;
            const teamSpent = currentRosterItems.reduce((acc, curr) => acc + curr.price, 0);

            return (
              <div
                key={team.id}
                className="rounded-2xl border border-slate-800 bg-[#0e1628] p-4 shadow-lg transition-all"
              >
                {isEditing ? (
                  /* Form di Modifica */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-indigo-400">
                        Modifica Squadra #{idx + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Nome Squadra
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Nome Fantallenatore
                        </label>
                        <input
                          type="text"
                          value={formData.manager_name}
                          onChange={(e) =>
                            setFormData({ ...formData, manager_name: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Email Partecipante (per invito)
                        </label>
                        <input
                          type="email"
                          value={formData.manager_email}
                          placeholder="es. amico@gmail.com"
                          onChange={(e) =>
                            setFormData({ ...formData, manager_email: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 mt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.is_admin}
                          onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                        />
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-amber-400" />
                          Amministratore della Lega (Banditore Asta)
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1 ml-6.5">
                        Concede i privilegi per gestire le squadre, bandire l'asta, modificare le impostazioni e personificare gli utenti.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingTeamId(null)}
                        className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => handleSaveTeam(team.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Salva Modifiche</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visualizzazione Normale Squadra */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 font-bold text-xs text-slate-300">
                        {idx + 1}
                      </span>

                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2 flex-wrap">
                          <span>{team.name}</span>
                          {team.is_admin && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm">
                              <ShieldCheck className="h-3 w-3 text-amber-400" />
                              Admin
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {teamRosterCount} calciatori ({teamSpent} FM spesi)
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-slate-300">{team.manager_name}</span>
                          {team.manager_email && (
                            <>
                              <span>·</span>
                              <span className="text-indigo-400">{team.manager_email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Tasto Genera / Copia Invito */}
                      <button
                        onClick={() => handleGenerateInvite(team)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
                        title="Copia link per invitare questo giocatore a impostare la password"
                      >
                        {copiedToken === team.id ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Link Copiato!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copia Invito</span>
                          </>
                        )}
                      </button>

                      {/* Tasto Modifica */}
                      <button
                        onClick={() => handleStartEdit(team)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Modifica
                      </button>

                      {/* Tasto Elimina */}
                      <button
                        type="button"
                        onClick={() => handleStartDelete(team)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                        title="Elimina questa squadra dalla lega"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Elimina</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modale Conferma Eliminazione Squadra */}
      {showDeleteConfirm && teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#0f172a] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Elimina Squadra</h3>
                <p className="text-xs text-rose-300">Questa operazione rimuoverà la squadra dalla lega.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-sm font-bold text-white">{teamToDelete.name}</div>
              <div className="text-xs text-slate-400">
                Fantallenatore: <span className="text-slate-200">{teamToDelete.manager_name}</span>
                {teamToDelete.manager_email && (
                  <span className="text-indigo-400 ml-1.5">({teamToDelete.manager_email})</span>
                )}
              </div>
            </div>

            {teamRosterCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Attenzione: Rosa non vuota!</span>
                </div>
                <p>
                  Questa squadra ha attualmente <strong>{teamRosterCount} calciatori</strong> acquistati
                  per un totale di <strong>{teamTotalSpent} FM</strong>. Eliminando la squadra, anche i
                  calciatori verranno rimossi dalla rosa e torneranno disponibili all'asta.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Nessun calciatore presente nella rosa di questa squadra.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTeamToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Eliminazione...' : 'Sì, Elimina Squadra'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Aggiungi Squadra */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-[#0f172a] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Aggiungi Nuova Squadra</h3>
                <p className="text-xs text-slate-400">Inserisci i dati della squadra e del fantallenatore</p>
              </div>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome Squadra *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Real Madrid, I Bomber..."
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome Fantallenatore *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Marco, Giuseppe, Fabio..."
                  value={newTeamData.manager_name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, manager_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Partecipante (opzionale per invito)
                </label>
                <input
                  type="email"
                  placeholder="es. amico@gmail.com"
                  value={newTeamData.manager_email}
                  onChange={(e) => setNewTeamData({ ...newTeamData, manager_email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newTeamData.is_admin}
                    onChange={(e) => setNewTeamData({ ...newTeamData, is_admin: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Amministratore della Lega (Banditore)
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5 ml-6.5">
                  Concede a questo fanta-allenatore tutti i privilegi di gestione dell'asta.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewTeamData({ name: '', manager_name: '', manager_email: '', is_admin: false });
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam || !newTeamData.name.trim() || !newTeamData.manager_name.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isCreatingTeam ? 'Creazione...' : 'Crea Squadra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Conferma Reset Asta */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#0f172a] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Confermi il Reset dell'Asta?</h3>
                <p className="text-xs text-rose-300">Questa azione eliminerà tutti gli acquisti finora registrati.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Verranno cancellate tutte le assegnazioni della rosa e ogni squadra tornerà al massimale di{' '}
              <strong>{league.total_budget} crediti</strong> con 0 calciatori in rosa.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
              >
                Sì, Resetta Tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Archiviazione e Apertura Nuova Stagione */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-[#0f172a] p-6 shadow-2xl shadow-amber-500/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Archivia Stagione & Apri Nuova
                </h3>
                <p className="text-xs text-slate-400">
                  Stagione attuale: <span className="font-bold text-amber-400">{currentSeasonObj?.name}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-white flex items-center gap-1.5 text-[13px]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Cosa succederà confermando:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>
                  La stagione <strong className="text-slate-200">{currentSeasonObj?.name}</strong> verrà congelata e archiviata nello <strong className="text-indigo-300">Storico</strong> con tutte le sue rose.
                </li>
                <li>
                  Le <strong className="text-slate-200">10 squadre</strong> correnti rimarranno registrate nella lega con i loro nomi e partecipanti.
                </li>
                <li>
                  I crediti spesi verranno azzerati e il budget verrà ripristinato a <strong className="text-amber-400">{archiveForm.budget} crediti</strong> per squadra.
                </li>
                <li>
                  Le rose per la nuova stagione partiranno <strong className="text-emerald-400">vuote</strong>, pronte per la nuova asta estiva o assegnazione manuale!
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome Nuova Stagione
                </label>
                <input
                  type="text"
                  value={archiveForm.seasonName}
                  onChange={(e) => setArchiveForm({ ...archiveForm, seasonName: e.target.value })}
                  placeholder="es. 2027/2028"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Budget Iniziale Squadre (Crediti)
                </label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="50"
                  value={archiveForm.budget}
                  onChange={(e) => setArchiveForm({ ...archiveForm, budget: Number(e.target.value) || 500 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-black text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isArchiving || !archiveForm.seasonName.trim()}
                onClick={async () => {
                  try {
                    setIsArchiving(true);
                    setArchiveError(null);
                    const res = await archiveSeasonAndStartNew(archiveForm.seasonName, undefined, archiveForm.budget);
                    if (res.success) {
                      setArchiveSuccess(`Stagione ${res.newSeason.name} aperta con successo! Rose pronte per la nuova asta.`);
                      setShowArchiveModal(false);
                      setTimeout(() => setArchiveSuccess(null), 6000);
                    }
                  } catch (err: any) {
                    setArchiveError(err.message || 'Errore durante l\'archiviazione.');
                  } finally {
                    setIsArchiving(false);
                  }
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50"
              >
                {isArchiving ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>Archiviazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Conferma e Apri Nuova Stagione</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
