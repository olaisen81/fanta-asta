'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuction } from '../context/auction-context';
import { QuickAssignCard } from '../components/auction/quick-assign-card';
import { AddRosterPlayerModal } from '../components/auction/add-roster-player-modal';
import { BudgetOverview } from '../components/auction/budget-overview';
import { RecentActivity } from '../components/auction/recent-activity';
import { TeamRosterModal } from '../components/auction/team-roster-modal';
import { Player } from '../lib/supabase/types';
import { TOTAL_SLOTS } from '../lib/fantacalcio/calculator';
import { ShieldCheck, UserCheck, PlusCircle, Users } from 'lucide-react';
import { DashboardSkeleton } from '../components/auction/skeletons';

export default function RosterManagementDashboard() {
  const router = useRouter();
  const { currentUser, league, teams, isLoadingData, isLoggedIn } = useAuction();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [inspectedTeamId, setInspectedTeamId] = useState<string | null>(null);
  const [preSelectedTeamId, setPreSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingData) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (!currentUser.isAdmin) {
        router.replace('/rose');
      }
    }
  }, [isLoadingData, isLoggedIn, currentUser.isAdmin, router]);

  if (isLoadingData || !isLoggedIn || !currentUser.isAdmin) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Banner di Benvenuto & Info Lega */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          {currentUser.isAdmin ? (
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <UserCheck className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="font-extrabold text-white flex items-center gap-2">
              <span>
                {currentUser.isAdmin
                  ? 'Gestore Rose (Admin)'
                  : `Partecipante: ${currentUser.managerName}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                {currentUser.isAdmin ? 'Pannello di Assegnazione' : 'Sola Lettura'}
              </span>
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Lega a 10 Squadre · Massimale {league.total_budget} FM · {TOTAL_SLOTS(league)} Calciatori per Rosa ({league.slots_p}P, {league.slots_d}D, {league.slots_c}C, {league.slots_a}A) · Serie A 2026/2027
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizzato Live</span>
          </span>
        </div>
      </div>

      {/* SEZIONE CENTRALE: Quick Assign & Roster Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonna Sinistra / Principale: Assegnazione Rapida e Schede 10 Squadre */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Widget Assegnazione Rapida Calciatori alle Rose */}
          <React.Suspense fallback={<div className="p-6 rounded-3xl bg-slate-900/60 text-center text-xs text-slate-400">Caricamento widget assegnazione...</div>}>
            <QuickAssignCard
              onOpenManualModal={() => setIsManualModalOpen(true)}
              preSelectedTeamId={preSelectedTeamId}
              onClearPreSelectedTeam={() => setPreSelectedTeamId(null)}
            />
          </React.Suspense>

          {/* Panoramica delle 10 squadre */}
          <BudgetOverview
            onSelectTeam={(teamId) => setInspectedTeamId(teamId)}
            onPreSelectTeam={(teamId) => {
              setPreSelectedTeamId(teamId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>

        {/* Colonna Destra: Feed Ultime Assegnazioni con modifica prezzo ed eliminazione */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          <RecentActivity />
        </div>
      </div>

      {/* Modale Aggiunta Calciatore Manuale alla Rosa */}
      <AddRosterPlayerModal
        isOpen={isManualModalOpen}
        initialTeamId={preSelectedTeamId}
        onClose={() => setIsManualModalOpen(false)}
      />

      {/* Modale Dettaglio Rosa Squadra con modifica/aggiunta/eliminazione */}
      <TeamRosterModal
        teamId={inspectedTeamId}
        onClose={() => setInspectedTeamId(null)}
      />
    </div>
  );
}
