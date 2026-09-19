'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gavel,
  Users,
  BookOpen,
  Settings,
  Radio,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  UserPlus,
  Menu,
  X,
  LogOut,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuction } from '../context/auction-context';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, isRealtimeConnected, isSupabaseActive, isLoadingData, teams, loginAsUser } = useAuction();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navLinks = [
    { href: '/', label: 'Assegna Rose', icon: UserPlus },
    { href: '/rose', label: 'Rose (10)', icon: Users },
    { href: '/listone', label: 'Listone 2026/27', icon: BookOpen },
    { href: '/storico', label: 'Storico', icon: History },
    { href: '/admin/squadre', label: 'Gestione Squadre', icon: Settings, adminOnly: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0c1220]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Logo & Realtime Status */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none flex items-center gap-1.5">
                  FantaRose
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    26/27
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  Serie A 2026/2027 · Lega a 10
                </span>
              </div>
            </Link>

            {/* Realtime Pulsing Status */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isLoadingData
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : isRealtimeConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isLoadingData
                    ? 'bg-indigo-400 animate-ping'
                    : isRealtimeConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {isLoadingData
                  ? 'Caricamento dati...'
                  : isSupabaseActive
                  ? 'Supabase Realtime'
                  : 'Sync Locale Attivo'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Role Switcher & Profile */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 hover:bg-slate-700/80 text-xs sm:text-sm text-slate-200 transition-colors shadow-sm"
                title="Cambia visualizzazione utente (Admin / Partecipante)"
              >
                {currentUser.isAdmin ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Banditore</span> (Admin)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                    <UserCheck className="h-4 w-4" />
                    <span className="truncate max-w-[90px] sm:max-w-[120px]">
                      {currentUser.managerName}
                    </span>
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Dropdown switch rapido ruoli */}
              {showRoleMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowRoleMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-[#0f172a] p-2 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                      Simula Accesso Utente
                    </div>

                    {/* Admin Switch */}
                    <button
                      onClick={() => {
                        loginAsUser('admin@fantaasta.it', 'admin', teams[0]?.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                        currentUser.isAdmin
                          ? 'bg-amber-500/20 text-amber-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        <div>
                          <div className="font-semibold">Banditore (Admin)</div>
                          <div className="text-[10px] text-slate-400">Pieni permessi di scrittura</div>
                        </div>
                      </div>
                      {currentUser.isAdmin && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                    </button>

                    <div className="my-1.5 border-t border-slate-800/80" />

                    <div className="px-2 py-1 text-[11px] text-slate-400">
                      Visualizza come Partecipante (Sola Lettura):
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {teams.map((team) => {
                        const isSelected = !currentUser.isAdmin && currentUser.teamId === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => {
                              loginAsUser(`${team.id}@lega.it`, 'player', team.id);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-sky-500/20 text-sky-300 font-medium'
                                : 'text-slate-300 hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="truncate">
                              <div className="truncate font-medium">{team.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{team.manager_name}</div>
                            </div>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {currentUser.isAdmin && (
                      <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                        <Link
                            href="/admin/importa-storico"
                            onClick={() => setShowRoleMenu(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-emerald-400 hover:bg-slate-800 transition-colors"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            <span>Importa Excel (10 Anni)</span>
                          </Link>
                          <Link
                            href="/admin/squadre"
                            onClick={() => setShowRoleMenu(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            <span>Regolamento & Squadre</span>
                          </Link>
                        </div>
                      )}

                    <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center px-1">
                      <Link
                        href="/login"
                        onClick={() => setShowRoleMenu(false)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        Accedi con Google / Email
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Menu di navigazione"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (quando aperto dal tasto in alto) */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-slate-800 bg-[#0b0f19] px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800 mt-2 flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isSupabaseActive ? 'Supabase Live' : 'Sincronizzazione Locale'}
              </span>
              <Link href="/login" className="text-indigo-400 hover:underline">
                Accedi
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* MOBILE BOTTOM NAVIGATION (Cruciale per l'usabilità su smartphone durante l'asta!) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b101d]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5">
        <div className="grid grid-cols-5 items-center justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
                  isActive
                    ? 'text-indigo-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? 'bg-indigo-600/20 text-indigo-400' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-0.5 truncate max-w-[70px] text-center">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
