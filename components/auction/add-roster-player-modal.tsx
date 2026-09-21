'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, UserPlus, Plus, CheckCircle2, AlertCircle, Coins, Search, Sparkles } from 'lucide-react';
import { PlayerRole, AuctionSessionType, Player, RosterPlayer } from '../../lib/supabase/types';
import { useAuction } from '../../context/auction-context';
import { getRoleBadgeStyles, calculateTeamStats, checkPlayerRosterStatus } from '../../lib/fantacalcio/calculator';

interface AddRosterPlayerModalProps {
  isOpen: boolean;
  initialTeamId?: string | null;
  initialRole?: PlayerRole;
  onClose: () => void;
}

const SERIE_A_TEAMS = [
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Empoli', 'Fiorentina',
  'Genoa', 'Inter', 'Juventus', 'Lazio', 'Lecce', 'Milan',
  'Monza', 'Napoli', 'Parma', 'Roma', 'Torino', 'Udinese', 'Venezia', 'Verona'
];

export function AddRosterPlayerModal({
  isOpen,
  initialTeamId,
  initialRole,
  onClose,
}: AddRosterPlayerModalProps) {
  const { teams, roster, players, league, seasons, selectedSeasonId, currentSession, addCustomPlayerToRoster } = useAuction();

  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('C');
  const [serieATeam, setSerieATeam] = useState('');
  const [price, setPrice] = useState<number>(1);
  const [session, setSession] = useState<AuctionSessionType>('initial');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Stagione attiva corrente (esclude le stagioni archiviate)
  const activeSeasonId = seasons.find((s) => s.is_current)?.id || selectedSeasonId || '2026-2027';

  // Rosa della sola stagione attuale
  const currentSeasonRoster = useMemo(() => {
    return roster.filter((r) => !r.season_id || r.season_id === activeSeasonId);
  }, [roster, activeSeasonId]);

  useEffect(() => {
    if (isOpen) {
      setTeamId(initialTeamId || teams[0]?.id || '');
      setRole(initialRole || 'C');
      setName('');
      setSearchQuery('');
      setSerieATeam('');
      setPrice(1);
      setSession(currentSession || 'initial');
      setErrorMessage(null);
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen, initialTeamId, initialRole, teams, currentSession]);

  // Gestione tasto Escape globale per chiudere modale o dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
          setHighlightedIndex(-1);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isDropdownOpen, onClose]);

  // Gestione click fuori dal dropdown suggerimenti
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll automatico per l'elemento evidenziato da tastiera
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  if (!isOpen) return null;

  const targetTeam = teams.find((t) => t.id === teamId);
  const targetStats = targetTeam ? calculateTeamStats(targetTeam, currentSeasonRoster, league) : null;
  const roles: PlayerRole[] = ['P', 'D', 'C', 'A'];

  // Già acquistati attivi nella stagione attuale
  const alreadyBoughtNames = new Set(
    currentSeasonRoster.filter((r) => !r.is_released).map((r) => r.player_name.toLowerCase().trim())
  );

  // Suggerimenti dal listone
  const filteredSuggestions = searchQuery.trim().length >= 2
    ? players
        .filter((p) => {
          const matchName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchTeam = p.team.toLowerCase().includes(searchQuery.toLowerCase());
          return matchName || matchTeam;
        })
        .slice(0, 8)
    : [];

  const handleSelectSuggestion = (p: Player) => {
    setName(p.name);
    setSearchQuery(p.name);
    setRole(p.role);
    setSerieATeam(p.team);
    setPrice(p.initial_price || 1);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = (name.trim() || searchQuery.trim());
    if (!finalName) {
      setErrorMessage('Inserisci o seleziona il nome del calciatore.');
      return;
    }
    if (price < 1) {
      setErrorMessage('Il prezzo deve essere di almeno 1 FM.');
      return;
    }
    if (!teamId) {
      setErrorMessage('Seleziona la squadra a cui assegnare il calciatore.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await addCustomPlayerToRoster({
        playerName: finalName,
        role,
        serieATeam: serieATeam.trim() || 'Serie A',
        teamId,
        price,
        session,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Errore durante l\'aggiunta del calciatore.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore imprevisto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsDropdownOpen(true);
        setHighlightedIndex(0);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredSuggestions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        const selected = filteredSuggestions[highlightedIndex];
        const status = checkPlayerRosterStatus(selected, currentSeasonRoster, teams, teamId, undefined, activeSeasonId);
        if (!status) {
          handleSelectSuggestion(selected);
        }
      } else {
        setIsDropdownOpen(false);
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#0f172a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Aggiungi Calciatore alla Rosa
              </h3>
              <p className="text-xs text-slate-400">
                Inserisci direttamente un calciatore con ruolo e prezzo pagato
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Squadra di Destinazione */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Squadra Destinataria *
            </label>
            <select
              required
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {teams.map((t) => {
                const s = calculateTeamStats(t, roster, league);
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.manager_name}) — {s.remaining} FM residui (Max bid: {s.maxBid} FM)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Ricerca / Nome Calciatore con Autocompletamento */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nome Calciatore *</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Cerca nel listone o digita liberamente
              </span>
            </label>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setName(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="es. Lautaro, Dimarco, Barella o nome libero..."
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dropdown suggerimenti listone */}
            {isDropdownOpen && filteredSuggestions.length > 0 && (
              <div
                ref={listRef}
                className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl border border-slate-700 bg-[#0f172a] shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1"
              >
                {filteredSuggestions.map((sug, idx) => {
                  const b = getRoleBadgeStyles(sug.role);
                  const status = checkPlayerRosterStatus(sug, currentSeasonRoster, teams, teamId, undefined, activeSeasonId);
                  const isAlreadyBought = Boolean(status);
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={sug.id}
                      type="button"
                      disabled={isAlreadyBought}
                      onClick={() => handleSelectSuggestion(sug)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isHighlighted
                          ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                          : 'hover:bg-slate-800/80 border border-transparent text-slate-200'
                      } ${isAlreadyBought ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-5 w-5 rounded font-black text-[10px] flex items-center justify-center shrink-0 border ${b.bg} ${b.text} ${b.border}`}
                        >
                          {sug.role}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-white truncate">{sug.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{sug.team}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {status ? (
                          status.inCurrentTeam ? (
                            <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              Già in questa rosa ({status.price} FM)
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-300 font-semibold bg-rose-500/15 px-2 py-0.5 rounded-lg border border-rose-500/30">
                              In rosa a {status.teamName} ({status.price} FM)
                            </span>
                          )
                        ) : (
                          <span className="font-bold text-amber-400 text-xs">
                            Base: {sug.initial_price} FM
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ruolo (P, D, C, A) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Ruolo *</span>
              {targetStats && (
                <span className="text-[10px] text-slate-400">
                  Slot occupati in {role}: {targetStats.roleCounts[role]}/{targetStats.roleMax[role]}
                </span>
              )}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {roles.map((r) => {
                const b = getRoleBadgeStyles(r);
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${b.bg} ${b.border} ${b.text} ring-2 ring-indigo-500 shadow-md`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{r}</span>
                    <span className="text-[10px] font-semibold opacity-70">({b.label})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Squadra Serie A */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Squadra Serie A
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serieATeam}
                onChange={(e) => setSerieATeam(e.target.value)}
                placeholder="es. Inter, Juventus, Milan..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={SERIE_A_TEAMS.includes(serieATeam) ? serieATeam : ''}
                onChange={(e) => {
                  if (e.target.value) setSerieATeam(e.target.value);
                }}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-300 focus:outline-none"
              >
                <option value="">Seleziona Club...</option>
                {SERIE_A_TEAMS.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prezzo Pagato (FM) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>Prezzo di Acquisto (FM) *</span>
              </label>
              {targetStats && (
                <span className="text-[11px] text-slate-400">
                  Offerta max: <strong className="text-white">{targetStats.maxBid} FM</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrice((p) => Math.max(1, p - 5))}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setPrice((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                -1
              </button>

              <input
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 px-3.5 py-2 text-center text-lg font-black rounded-xl border border-indigo-500/50 bg-slate-950 text-amber-400 focus:outline-none focus:border-indigo-400"
              />

              <button
                type="button"
                onClick={() => setPrice((p) => p + 1)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setPrice((p) => p + 5)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                +5
              </button>
            </div>
          </div>

          {/* Sessione */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Sessione di Mercato
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSession('initial')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  session === 'initial'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>☀️ Asta Iniziale (Estiva)</span>
              </button>
              <button
                type="button"
                onClick={() => setSession('repair')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  session === 'repair'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>❄️ Riparazione (Gennaio)</span>
              </button>
            </div>
          </div>

          {/* Pulsanti Azione */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Assegnazione...' : 'Aggiungi alla Rosa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
