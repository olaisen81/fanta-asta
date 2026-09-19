'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Gavel,
  Users,
  BookOpen,
  Settings,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  User,
  UserPlus,
  Menu,
  X,
  LogOut,
  LogIn,
  History,
  FileSpreadsheet,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { useAuction } from '../context/auction-context';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    isLoggedIn,
    isRealtimeConnected,
    isSupabaseActive,
    isLoadingData,
    teams,
    loginAsUser,
    impersonateUser,
    stopImpersonating,
    logout,
  } = useAuction();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Link di navigazione: 'Assegna Rose' e 'Gestione Squadre' sono riservate all'Admin
  const navLinks = [
    { href: '/', label: 'Assegna Rose', icon: UserPlus, adminOnly: true },
    { href: '/rose', label: 'Rose (10)', icon: Users, adminOnly: false },
    { href: '/listone', label: 'Listone 2026/27', icon: BookOpen, adminOnly: false },
    { href: '/storico', label: 'Storico', icon: History, adminOnly: false },
    { href: '/admin/squadre', label: 'Gestione Squadre', icon: Settings, adminOnly: true },
  ];

  // Se l'utente è sloggato, nessun link di navigazione è visibile.
  // Se è loggato non-admin, visualizza solo Rose, Listone e Storico.
  // Se è admin, visualizza tutti i link.
  const visibleLinks = !isLoggedIn
    ? []
    : navLinks.filter((link) => !link.adminOnly || currentUser.isAdmin);

  const handleLogout = async () => {
    setShowRoleMenu(false);
    setShowMobileMenu(false);
    await logout();
    router.push('/login');
  };

  const handleStopImpersonating = () => {
    setShowRoleMenu(false);
    setShowMobileMenu(false);
    stopImpersonating();
  };

  const userTeam = teams.find((t) => t.id === currentUser.teamId);

  return (
    <>
      {/* BANNER STICKY DI AVVISO PERSONIFICAZIONE CON TASTO DI RITORNO AD ADMIN */}
      {currentUser.isImpersonating && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold px-3 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-black/15 flex items-center justify-center">
              <Eye className="h-4 w-4 text-slate-950" />
            </span>
            <span>
              Modalità Personificazione: stai visualizzando l'app come{' '}
              <strong>{currentUser.managerName}</strong>{' '}
              {userTeam ? `(${userTeam.name})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopImpersonating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-black shadow transition-transform active:scale-95 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Torna al tuo account Admin</span>
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0c1220]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Logo & Realtime Status */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href={isLoggedIn ? (currentUser.isAdmin ? '/' : '/rose') : '/login'}
              className="flex items-center gap-2 group"
            >
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
          {isLoggedIn && visibleLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {visibleLinks.map((link) => {
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
          )}

          {/* User Role Switcher & Profile & Logout */}
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 text-xs sm:text-sm font-semibold text-indigo-300 transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                <span>Accedi</span>
              </Link>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-colors shadow-sm ${
                    currentUser.isImpersonating
                      ? 'border-amber-500/80 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                      : 'border-slate-700/80 bg-slate-800/70 hover:bg-slate-700/80 text-slate-200'
                  }`}
                  title="Profilo e opzioni utente"
                >
                  {currentUser.isImpersonating ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Eye className="h-4 w-4 text-amber-400 animate-pulse" />
                      <span className="truncate max-w-[90px] sm:max-w-[120px]">
                        {currentUser.managerName}
                      </span>
                      <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                        Simula
                      </span>
                    </span>
                  ) : currentUser.isAdmin ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Banditore</span> (Admin)
                    </span>
                  ) : currentUser.teamId ? (
                    <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                      <UserCheck className="h-4 w-4" />
                      <span className="truncate max-w-[90px] sm:max-w-[120px]">
                        {currentUser.managerName}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <User className="h-4 w-4" />
                      <span className="truncate max-w-[90px] sm:max-w-[120px]">
                        {currentUser.managerName || 'Ospite'}
                      </span>
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu Utente */}
                {showRoleMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowRoleMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-700 bg-[#0f172a] p-3 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95">
                      {/* Box Personificazione Attiva con Tasto di Ritorno */}
                      {currentUser.isImpersonating && (
                        <div className="mb-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs space-y-2">
                          <div className="flex items-center justify-between text-amber-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Eye className="h-3.5 w-3.5" />
                              <span>Personificazione Attiva</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/80 leading-tight">
                            Stai vedendo l'app come {currentUser.managerName}. Puoi tornare al tuo account Admin in qualsiasi momento.
                          </p>
                          <button
                            type="button"
                            onClick={handleStopImpersonating}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors shadow"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Torna al tuo Admin</span>
                          </button>
                        </div>
                      )}

                      {/* Profilo Header */}
                      <div className="pb-2.5 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">
                            {currentUser.managerName || 'Utente'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              currentUser.isImpersonating
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : currentUser.isAdmin
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : currentUser.teamId
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {currentUser.isImpersonating
                              ? 'In Simulazione'
                              : currentUser.isAdmin
                              ? 'Admin'
                              : currentUser.teamId
                              ? 'Partecipante'
                              : 'Sola Lettura'}
                          </span>
                        </div>
                        {currentUser.email && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {currentUser.email}
                          </div>
                        )}
                      </div>

                      {/* Se ADMIN o IN PERSONIFICAZIONE: Mostra switch squadre e strumenti */}
                      {currentUser.isAdmin || currentUser.isImpersonating ? (
                        <>
                          <div className="pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>
                              {currentUser.isImpersonating
                                ? 'Cambia Squadra Simulata'
                                : 'Personifica Utente'}
                            </span>
                          </div>

                          {!currentUser.isImpersonating ? (
                            <button
                              onClick={() => {
                                loginAsUser(currentUser.email || 'admin@fantaasta.it', 'admin', teams[0]?.id);
                                setShowRoleMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
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
                          ) : (
                            <button
                              onClick={handleStopImpersonating}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors bg-amber-500/20 text-amber-300 font-bold mb-1 hover:bg-amber-500/30"
                            >
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-amber-400" />
                                <div>
                                  <div className="font-semibold">Ripristina Banditore (Admin)</div>
                                  <div className="text-[10px] text-amber-300/80">Ritorna alla modalità Admin</div>
                                </div>
                              </div>
                              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                            </button>
                          )}

                          <div className="my-1.5 border-t border-slate-800/80" />

                          <div className="px-1 py-1 text-[11px] text-slate-400">
                            Simula vista squadra:
                          </div>

                          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                            {teams.map((team) => {
                              const isSelected = currentUser.teamId === team.id;
                              return (
                                <button
                                  key={team.id}
                                  onClick={() => {
                                    impersonateUser(team.id);
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
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {team.manager_name} {team.manager_email ? `(${team.manager_email})` : ''}
                                    </div>
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
                                <span>Gestione Squadre & Regole</span>
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Se VERO NON-ADMIN: nessuna personificazione consentita */
                        <div className="py-2.5 space-y-2">
                          {userTeam ? (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                              <div className="text-[11px] text-slate-400">La tua Squadra:</div>
                              <div className="font-bold text-white text-sm mt-0.5">
                                {userTeam.name}
                              </div>
                              <div className="text-[11px] text-sky-400 mt-1 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span>Accesso in sola lettura (Rose, Listone, Storico)</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                              <div className="font-semibold">Nessuna squadra associata</div>
                              <div className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                                L'email ({currentUser.email || 'non impostata'}) non corrisponde a nessuna squadra registrata. Puoi consultare Rose, Listone e Storico in sola lettura.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tasto Logout visibile per tutti gli utenti */}
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Disconnetti (Logout)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            {isLoggedIn && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Menu di navigazione"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu (quando aperto dal tasto in alto) */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-slate-800 bg-[#0b0f19] px-4 py-3 space-y-1">
            {visibleLinks.map((link) => {
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

            <div className="pt-3 border-t border-slate-800 mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isSupabaseActive ? 'Supabase Live' : 'Sincronizzazione Locale'}
                </span>
                <span className="text-[11px] font-semibold text-slate-300">
                  {currentUser.managerName || 'Ospite'}
                </span>
              </div>

              {currentUser.isImpersonating && (
                <button
                  type="button"
                  onClick={handleStopImpersonating}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Torna al tuo Admin</span>
                </button>
              )}

              {currentUser.email || currentUser.isAdmin ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Disconnetti</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Accedi</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      {isLoggedIn && visibleLinks.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b101d]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5">
          <div
            className={`grid ${
              visibleLinks.length === 3
                ? 'grid-cols-3'
                : visibleLinks.length === 4
                ? 'grid-cols-4'
                : 'grid-cols-5'
            } items-center justify-around`}
          >
            {visibleLinks.map((link) => {
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
      )}
    </>
  );
}
