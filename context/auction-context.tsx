'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  League,
  Team,
  Player,
  RosterPlayer,
  AuctionState,
  PlayerRole,
  TeamBudgetStats,
  UserSession,
  Season,
  AuctionSessionType,
} from '../lib/supabase/types';
import {
  DEFAULT_LEAGUE_CONFIG,
  calculateTeamStats,
  validatePurchase,
} from '../lib/fantacalcio/calculator';
import { INITIAL_SERIE_A_PLAYERS, INITIAL_TEAMS } from '../lib/fantacalcio/default-players';
import { findSerieAClub } from '../lib/fantacalcio/history-importer';
import { createClient, isSupabaseConfigured, setDynamicSupabaseConfig } from '../lib/supabase/client';

export const DEFAULT_SEASONS: Season[] = [
  { id: '2026-2027', name: '2026/2027', is_current: true, budget: 500 },
];

interface AuctionContextType {
  league: League;
  teams: Team[];
  players: Player[];
  roster: RosterPlayer[];
  seasons: Season[];
  selectedSeasonId: string;
  setSelectedSeasonId: (seasonId: string) => void;
  currentSession: AuctionSessionType;
  setCurrentSession: (session: AuctionSessionType) => void;
  auctionState: AuctionState;
  currentUser: UserSession;
  teamsStats: TeamBudgetStats[];
  isRealtimeConnected: boolean;
  isSupabaseActive: boolean;
  isHydrated: boolean;
  isLoadingData: boolean;
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => void;
  // Actions
  loginAsUser: (email: string, role: 'admin' | 'player', teamId?: string) => void;
  callPlayer: (player: Player, startingBid?: number) => Promise<void>;
  updateBid: (price: number, leadingTeamId?: string) => Promise<void>;
  assignPlayer: (teamId: string, price: number, player?: Player) => Promise<{ success: boolean; error?: string }>;
  assignPlayerToTeam: (teamId: string, player: Player, price: number) => Promise<{ success: boolean; error?: string }>;
  addCustomPlayerToRoster: (data: {
    playerName: string;
    role: PlayerRole;
    serieATeam: string;
    teamId: string;
    price: number;
    session?: AuctionSessionType;
  }) => Promise<{ success: boolean; error?: string }>;
  updateRosterPlayer: (
    rosterId: string,
    updates: {
      player_name?: string;
      role?: PlayerRole;
      serie_a_team?: string;
      team_id?: string;
      price?: number;
      session?: AuctionSessionType;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  removePlayerFromRoster: (rosterId: string) => Promise<boolean>;
  releasePlayerFromRoster: (rosterId: string, refundAmount: number) => Promise<boolean>;
  addRepairBonusToTeams: (amount: number) => Promise<void>;
  importHistoricalData: (newSeasons: Season[], newTeams: Team[], newRoster: RosterPlayer[]) => Promise<{ seasonsCount: number; rosterCount: number }>;
  updateRosterPrice: (rosterId: string, newPrice: number) => Promise<{ success: boolean; error?: string }>;
  undoLastAssignment: () => Promise<boolean>;
  addManualPlayer: (name: string, role: PlayerRole, team: string, initialPrice?: number) => Promise<Player>;
  importPlayers: (newPlayers: Omit<Player, 'id' | 'created_at'>[]) => Promise<number>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  createTeam: (name: string, manager_name: string, manager_email?: string, seasonId?: string) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  updateLeagueSettings: (settings: Partial<League>) => Promise<void>;
  resetAuction: () => Promise<void>;
  archiveSeasonAndStartNew: (newSeasonName: string, newSeasonId?: string, initialBudget?: number) => Promise<{ success: boolean; newSeason: Season }>;
  setCurrentActiveSeason: (seasonId: string) => Promise<void>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'fanta_asta_local_v2';

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [league, setLeague] = useState<League>(DEFAULT_LEAGUE_CONFIG);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [players, setPlayers] = useState<Player[]>(INITIAL_SERIE_A_PLAYERS as Player[]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [seasons, setSeasons] = useState<Season[]>(DEFAULT_SEASONS);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('2026-2027');
  const [currentSession, setCurrentSession] = useState<AuctionSessionType>('initial');
  const [auctionState, setAuctionState] = useState<AuctionState>({
    id: 'auction-state-1',
    league_id: DEFAULT_LEAGUE_CONFIG.id,
    current_bid: 1,
    status: 'idle',
    updated_at: new Date().toISOString(),
  });
  const [currentUser, setCurrentUser] = useState<UserSession>({
    email: 'admin@fantaasta.it',
    isAdmin: true,
    teamId: 'team-1',
    managerName: 'Fabio (Admin)',
  });
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [isFetchingSupabase, setIsFetchingSupabase] = useState<boolean>(() => isSupabaseConfigured());
  const isLoadingData = !isHydrated || isFetchingSupabase;

  // Se Supabase non era disponibile a build-time (es. variabili non prefissate con NEXT_PUBLIC_ su Vercel),
  // interroga l'endpoint server /api/supabase-config per attivarlo a runtime!
  useEffect(() => {
    if (supabaseConfigured) return;

    let isMounted = true;
    fetch('/api/supabase-config')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.configured && data.url && data.anonKey) {
          setDynamicSupabaseConfig(data.url, data.anonKey);
          setSupabaseConfigured(true);
          setIsFetchingSupabase(true);
        }
      })
      .catch((err) => {
        console.warn('Controllo runtime Supabase config non riuscito:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [supabaseConfigured]);

  // Helper per salvataggio immediato e atomico in localStorage
  const persistStateLocally = useCallback(
    (data: {
      league?: League;
      roster?: RosterPlayer[];
      teams?: Team[];
      players?: Player[];
      auctionState?: AuctionState;
      currentUser?: UserSession;
      seasons?: Season[];
      selectedSeasonId?: string;
      currentSession?: AuctionSessionType;
    }) => {
      if (typeof window === 'undefined') return;
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const existing = saved ? JSON.parse(saved) : {};
        const updated = {
          ...existing,
          ...data,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Errore nel salvataggio localStorage:', e);
      }
    },
    []
  );

  // Caricamento iniziale e persistenza locale per fallback istantaneo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.league) setLeague(parsed.league);
          if (parsed.roster && Array.isArray(parsed.roster)) setRoster(parsed.roster);
          if (parsed.teams && Array.isArray(parsed.teams) && parsed.teams.length > 0) setTeams(parsed.teams);
          if (parsed.players && Array.isArray(parsed.players) && parsed.players.length > 0) setPlayers(parsed.players);
          if (parsed.auctionState) setAuctionState(parsed.auctionState);
          if (parsed.currentUser) setCurrentUser(parsed.currentUser);
          if (parsed.seasons && Array.isArray(parsed.seasons) && parsed.seasons.length > 0) setSeasons(parsed.seasons);
          if (parsed.selectedSeasonId) setSelectedSeasonId(parsed.selectedSeasonId);
          if (parsed.currentSession) setCurrentSession(parsed.currentSession);
        }
      } catch (e) {
        console.error('Errore nel recupero dati locali:', e);
      } finally {
        setIsHydrated(true);
      }
    }
  }, []);

  // Sincronizzazione locale (BroadcastChannel tra tab e salvataggio se idratato)
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;

    // Salva sempre nello storage per mantenere lo stato
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        league,
        roster,
        teams,
        players,
        auctionState,
        currentUser,
        seasons,
        selectedSeasonId,
        currentSession,
      })
    );

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fanta_asta_sync_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_STATE') {
          const data = event.data.payload;
          if (data.league) setLeague(data.league);
          if (data.roster) setRoster(data.roster);
          if (data.teams) setTeams(data.teams);
          if (data.players) setPlayers(data.players);
          if (data.auctionState) setAuctionState(data.auctionState);
          if (data.seasons) setSeasons(data.seasons);
          if (data.selectedSeasonId) setSelectedSeasonId(data.selectedSeasonId);
          if (data.currentSession) setCurrentSession(data.currentSession);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel non supportato:', e);
    }

    return () => {
      channel?.close();
    };
  }, [isHydrated, league, roster, teams, players, auctionState, currentUser, seasons, selectedSeasonId, currentSession]);

  const broadcastLocalChange = useCallback((updated: {
    league?: League;
    roster?: RosterPlayer[];
    teams?: Team[];
    players?: Player[];
    auctionState?: AuctionState;
    seasons?: Season[];
    selectedSeasonId?: string;
    currentSession?: AuctionSessionType;
  }) => {
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('fanta_asta_sync_channel');
        channel.postMessage({ type: 'SYNC_STATE', payload: updated });
        channel.close();
      } catch {
        // Fallback silently
      }
    }
  }, []);

  // Supabase Realtime Listener (se configurato con chiavi reali)
  useEffect(() => {
    if (!supabaseConfigured) return;

    const supabase = createClient();

    // 1. Fetch iniziale dati da Supabase
    async function fetchSupabaseData() {
      try {
        setIsFetchingSupabase(true);
        const [teamsRes, rosterRes, playersRes, stateRes, seasonsRes, leagueRes] = await Promise.all([
          supabase.from('teams').select('*').order('order_index'),
          supabase.from('roster_players').select('*').order('purchased_at', { ascending: false }),
          supabase.from('players').select('*'),
          supabase.from('auction_state').select('*').limit(1).maybeSingle(),
          supabase.from('seasons').select('*'),
          supabase.from('leagues').select('*').limit(1).maybeSingle(),
        ]);

        if (teamsRes.data && teamsRes.data.length > 0) setTeams(teamsRes.data);
        if (playersRes.data && playersRes.data.length > 0) setPlayers(playersRes.data);
        if (rosterRes.data) {
          const listone = (playersRes.data && playersRes.data.length > 0)
            ? playersRes.data
            : (INITIAL_SERIE_A_PLAYERS as unknown as Player[]);
          const sanitizedRoster = rosterRes.data.map((r: RosterPlayer) => {
            if (!r.serie_a_team || r.serie_a_team === 'Serie A') {
              const matched = findSerieAClub(r.player_name, r.role, listone as any);
              return { ...r, serie_a_team: matched };
            }
            return r;
          });
          setRoster(sanitizedRoster);
        }
        if (stateRes.data) setAuctionState(stateRes.data);
        if (seasonsRes.data && seasonsRes.data.length > 0) {
          const sorted = [...seasonsRes.data].sort((a, b) => b.id.localeCompare(a.id));
          setSeasons(sorted);
        }
        if (leagueRes.data) setLeague(leagueRes.data);
      } catch (err) {
        console.error('Errore nel fetch Supabase:', err);
      } finally {
        setIsFetchingSupabase(false);
      }
    }

    fetchSupabaseData();

    // 2. Canale Realtime WebSocket
    const channel = supabase
      .channel('fanta_asta_live_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roster_players' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRoster((prev) => [payload.new as RosterPlayer, ...prev.filter((r) => r.id !== payload.new.id)]);
          } else if (payload.eventType === 'DELETE') {
            setRoster((prev) => prev.filter((r) => r.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setRoster((prev) =>
              prev.map((r) => (r.id === payload.new.id ? (payload.new as RosterPlayer) : r))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setAuctionState(payload.new as AuctionState);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTeams((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Team) : t))
            );
          } else if (payload.eventType === 'INSERT') {
            setTeams((prev) => [...prev.filter((t) => t.id !== payload.new.id), payload.new as Team]);
          } else if (payload.eventType === 'DELETE') {
            setTeams((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seasons' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSeasons((prev) => {
              const filtered = prev.filter((s) => s.id !== payload.new.id);
              return [payload.new as Season, ...filtered].sort((a, b) => b.id.localeCompare(a.id));
            });
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseConfigured]);

  // Squadre e rosa filtrate per la stagione attiva
  const currentSeasonTeams = useMemo(() => {
    const filtered = teams.filter((t) => !t.season_id || t.season_id === selectedSeasonId);
    return filtered.length > 0 ? filtered : teams;
  }, [teams, selectedSeasonId]);

  const currentSeasonRoster = useMemo(() => {
    return roster.filter(
      (r) => (!r.season_id && selectedSeasonId === '2026-2027') || r.season_id === selectedSeasonId
    );
  }, [roster, selectedSeasonId]);

  // Calcolo delle statistiche per tutte le squadre della stagione selezionata
  const teamsStats = useMemo(() => {
    return currentSeasonTeams.map((team) => calculateTeamStats(team, currentSeasonRoster, league));
  }, [currentSeasonTeams, currentSeasonRoster, league]);

  // Azione: Chiama un giocatore all'asta
  const callPlayer = useCallback(
    async (player: Player, startingBid: number = 1) => {
      const newState: AuctionState = {
        id: auctionState.id,
        league_id: league.id,
        current_player_id: player.id,
        current_player_name: player.name,
        current_role: player.role,
        current_serie_a_team: player.team,
        current_bid: startingBid,
        leading_team_id: null,
        status: 'bidding',
        updated_at: new Date().toISOString(),
      };

      setAuctionState(newState);
      broadcastLocalChange({ auctionState: newState });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase
          .from('auction_state')
          .upsert(newState);
      }
    },
    [auctionState.id, league.id, supabaseConfigured, broadcastLocalChange]
  );

  // Azione: Rilancio / Aggiornamento prezzo
  const updateBid = useCallback(
    async (price: number, leadingTeamId?: string) => {
      const newState: AuctionState = {
        ...auctionState,
        current_bid: price,
        leading_team_id: leadingTeamId !== undefined ? leadingTeamId : auctionState.leading_team_id,
        status: 'bidding',
        updated_at: new Date().toISOString(),
      };

      setAuctionState(newState);
      broadcastLocalChange({ auctionState: newState });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase
          .from('auction_state')
          .upsert(newState);
      }
    },
    [auctionState, supabaseConfigured, broadcastLocalChange]
  );

  // Azione: Assegna calciatore alla squadra
  const assignPlayer = useCallback(
    async (
      teamId: string,
      price: number,
      targetPlayer?: Player
    ): Promise<{ success: boolean; error?: string }> => {
      const targetTeam = teams.find((t) => t.id === teamId);
      if (!targetTeam) {
        return { success: false, error: 'Squadra non trovata.' };
      }

      // Ricava il giocatore selezionato
      const playerToAssign: Player | undefined =
        targetPlayer ||
        (auctionState.current_player_id
          ? players.find((p) => p.id === auctionState.current_player_id)
          : undefined) ||
        (auctionState.current_player_name
          ? {
              id: auctionState.current_player_id || `temp-${Date.now()}`,
              name: auctionState.current_player_name,
              role: auctionState.current_role || 'C',
              team: auctionState.current_serie_a_team || 'Serie A',
              initial_price: auctionState.current_bid,
            }
          : undefined);

      if (!playerToAssign) {
        return { success: false, error: 'Nessun calciatore selezionato per l\'assegnazione.' };
      }

      // Validazione finanziaria e di ruolo nella stagione attiva
      const teamStat = calculateTeamStats(targetTeam, currentSeasonRoster, league);
      const validation = validatePurchase(teamStat, playerToAssign.role, price);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Controlla che il calciatore non sia già acquistato attivo nella stagione corrente
      const alreadyBought = currentSeasonRoster.some(
        (r) =>
          !r.is_released &&
          ((r.player_id && r.player_id === playerToAssign.id) ||
            r.player_name.toLowerCase() === playerToAssign.name.toLowerCase())
      );
      if (alreadyBought) {
        return {
          success: false,
          error: `"${playerToAssign.name}" è già presente in una rosa attiva per questa stagione!`,
        };
      }

      const newRosterEntry: RosterPlayer = {
        id: `roster-${Date.now()}`,
        league_id: league.id,
        season_id: selectedSeasonId,
        team_id: teamId,
        player_id: playerToAssign.id,
        player_name: playerToAssign.name,
        role: playerToAssign.role,
        serie_a_team: playerToAssign.team,
        price,
        session: currentSession,
        is_released: false,
        purchased_at: new Date().toISOString(),
      };

      const updatedRoster = [newRosterEntry, ...roster];
      const resetState: AuctionState = {
        ...auctionState,
        current_player_id: null,
        current_player_name: null,
        current_role: null,
        current_serie_a_team: null,
        current_bid: 1,
        leading_team_id: null,
        status: 'idle',
        updated_at: new Date().toISOString(),
      };

      setRoster(updatedRoster);
      setAuctionState(resetState);
      broadcastLocalChange({ roster: updatedRoster, auctionState: resetState });
      persistStateLocally({ roster: updatedRoster, auctionState: resetState });

      // Effetto coriandoli per celebrare l'acquisto
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#38bdf8', '#34d399', '#f59e0b', '#f43f5e'],
        });
      } catch {
        // Nessun problema se confetti non è supportato
      }

      if (supabaseConfigured) {
        const supabase = createClient();
        await Promise.all([
          supabase.from('roster_players').insert([newRosterEntry]),
          supabase.from('auction_state').upsert(resetState),
        ]);
      }

      return { success: true };
    },
    [teams, auctionState, players, roster, currentSeasonRoster, league, selectedSeasonId, currentSession, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Assegnazione diretta di un calciatore a una squadra (senza asta/chiamata live)
  const assignPlayerToTeam = useCallback(
    async (
      teamId: string,
      player: Player,
      price: number
    ): Promise<{ success: boolean; error?: string }> => {
      const targetTeam = teams.find((t) => t.id === teamId);
      if (!targetTeam) return { success: false, error: 'Squadra non trovata.' };
      if (!player) return { success: false, error: 'Nessun calciatore selezionato.' };

      // Validazione finanziaria e vincoli di slot
      const teamStat = calculateTeamStats(targetTeam, currentSeasonRoster, league);
      const validation = validatePurchase(teamStat, player.role, price);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Verifica se già assegnato e attivo nella stagione
      const alreadyBought = currentSeasonRoster.some(
        (r) =>
          !r.is_released &&
          ((r.player_id && r.player_id === player.id) ||
            r.player_name.toLowerCase() === player.name.toLowerCase())
      );
      if (alreadyBought) {
        return {
          success: false,
          error: `"${player.name}" è già stato assegnato a un'altra rosa in questa stagione!`,
        };
      }

      const newEntry: RosterPlayer = {
        id: `roster-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        league_id: league.id,
        season_id: selectedSeasonId,
        team_id: teamId,
        player_id: player.id,
        player_name: player.name,
        role: player.role,
        serie_a_team: player.team,
        price,
        session: currentSession,
        is_released: false,
        purchased_at: new Date().toISOString(),
      };

      const updatedRoster = [newEntry, ...roster];
      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#38bdf8', '#34d399', '#f59e0b', '#f43f5e'],
        });
      } catch {}

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('roster_players').insert([newEntry]);
      }

      return { success: true };
    },
    [teams, roster, currentSeasonRoster, league, selectedSeasonId, currentSession, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Aggiunge direttamente un calciatore personalizzato/manuale a una squadra
  const addCustomPlayerToRoster = useCallback(
    async (data: {
      playerName: string;
      role: PlayerRole;
      serieATeam: string;
      teamId: string;
      price: number;
      session?: AuctionSessionType;
    }): Promise<{ success: boolean; error?: string }> => {
      const { playerName, role, serieATeam, teamId, price, session = currentSession } = data;
      if (!playerName || !playerName.trim()) {
        return { success: false, error: 'Inserisci il nome del calciatore.' };
      }
      if (price < 1) {
        return { success: false, error: 'Il prezzo deve essere di almeno 1 FM.' };
      }

      const targetTeam = teams.find((t) => t.id === teamId);
      if (!targetTeam) return { success: false, error: 'Squadra non trovata.' };

      // Validazione finanziaria e vincoli di slot
      const teamStat = calculateTeamStats(targetTeam, currentSeasonRoster, league);
      const validation = validatePurchase(teamStat, role, price);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Verifica se già assegnato attivo in questa stagione
      const alreadyBought = currentSeasonRoster.some(
        (r) =>
          !r.is_released &&
          r.player_name.toLowerCase().trim() === playerName.toLowerCase().trim()
      );
      if (alreadyBought) {
        return {
          success: false,
          error: `"${playerName.trim()}" è già presente in una rosa in questa stagione!`,
        };
      }

      const newEntry: RosterPlayer = {
        id: `roster-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        league_id: league.id,
        season_id: selectedSeasonId,
        team_id: teamId,
        player_name: playerName.trim(),
        role,
        serie_a_team: serieATeam.trim() || 'Serie A',
        price,
        session,
        is_released: false,
        purchased_at: new Date().toISOString(),
      };

      const updatedRoster = [newEntry, ...roster];
      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#38bdf8', '#34d399', '#f59e0b', '#f43f5e'],
        });
      } catch {}

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('roster_players').insert([newEntry]);
      }

      return { success: true };
    },
    [teams, roster, currentSeasonRoster, league, selectedSeasonId, currentSession, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Rimuove fisicamente un calciatore da una rosa (errore di battitura/annullamento)
  const removePlayerFromRoster = useCallback(
    async (rosterId: string): Promise<boolean> => {
      const updatedRoster = roster.filter((r) => r.id !== rosterId);
      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('roster_players').delete().eq('id', rosterId);
      }
      return true;
    },
    [roster, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Svincola un calciatore (Asta di Riparazione - recupero slot e rimborso crediti)
  const releasePlayerFromRoster = useCallback(
    async (rosterId: string, refundAmount: number): Promise<boolean> => {
      const updatedRoster = roster.map((r) =>
        r.id === rosterId
          ? {
              ...r,
              is_released: true,
              refund_amount: refundAmount,
              released_at: new Date().toISOString(),
            }
          : r
      );
      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase
          .from('roster_players')
          .update({
            is_released: true,
            refund_amount: refundAmount,
            released_at: new Date().toISOString(),
          })
          .eq('id', rosterId);
      }
      return true;
    },
    [roster, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Assegna un bonus di crediti per la sessione di riparazione a tutte le squadre attive
  const addRepairBonusToTeams = useCallback(
    async (amount: number): Promise<void> => {
      const updatedTeams = teams.map((t) => {
        if (!t.season_id || t.season_id === selectedSeasonId) {
          return {
            ...t,
            bonus_credits: (t.bonus_credits || 0) + amount,
          };
        }
        return t;
      });

      setTeams(updatedTeams);
      broadcastLocalChange({ teams: updatedTeams });
      persistStateLocally({ teams: updatedTeams });

      if (supabaseConfigured) {
        const supabase = createClient();
        for (const t of updatedTeams) {
          if (!t.season_id || t.season_id === selectedSeasonId) {
            await supabase
              .from('teams')
              .update({ bonus_credits: t.bonus_credits })
              .eq('id', t.id);
          }
        }
      }
    },
    [teams, selectedSeasonId, supabaseConfigured, broadcastLocalChange]
  );

  // Azione: Importa dati da file Excel (solo ultima stagione, aggiornamento in-place delle 10 squadre)
  const importHistoricalData = useCallback(
    async (
      newSeasons: Season[],
      newTeams: Team[],
      newRoster: RosterPlayer[]
    ): Promise<{ seasonsCount: number; rosterCount: number }> => {
      // 1. Assicura che le squadre di base siano sempre e solo 10 (senza alcun append)
      const base10Teams: Team[] = [];
      const seenIds = new Set<string>();

      // Prendi fino a 10 squadre esistenti nello stato
      for (const t of teams) {
        if (base10Teams.length >= 10) break;
        if (!seenIds.has(t.id)) {
          base10Teams.push({ ...t });
          seenIds.add(t.id);
        }
      }

      // Se ce ne sono meno di 10 (es. reset o stato iniziale vuoto), completa con INITIAL_TEAMS
      if (base10Teams.length < 10) {
        for (const initTeam of INITIAL_TEAMS) {
          if (base10Teams.length >= 10) break;
          if (!seenIds.has(initTeam.id)) {
            base10Teams.push({ ...initTeam });
            seenIds.add(initTeam.id);
          }
        }
      }

      const cleanStr = (s: string) =>
        String(s || '')
          .toLowerCase()
          .replace(/admin/gi, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      const latestSeasonId = newSeasons[0]?.id || selectedSeasonId;
      const latestSeasonTeams = newTeams.filter((t) => t.season_id === latestSeasonId);
      const teamsFor10 = latestSeasonTeams.length > 0 ? latestSeasonTeams : newTeams.slice(0, 10);

      const importedTeamIdToExistingId = new Map<string, string>();
      const assignedExistingIds = new Set<string>();

      // 1. Passata per le squadre dell'ultima stagione: Matching per Fantallenatore con base10Teams
      for (const newTeam of teamsFor10) {
        const cleanNewManager = cleanStr(newTeam.manager_name);
        if (!cleanNewManager) continue;

        const match = base10Teams.find(
          (et) => !assignedExistingIds.has(et.id) && cleanStr(et.manager_name) === cleanNewManager
        );
        if (match) {
          importedTeamIdToExistingId.set(newTeam.id, match.id);
          assignedExistingIds.add(match.id);
        }
      }

      // 2. Passata per le squadre dell'ultima stagione: Matching per nome Squadra
      for (const newTeam of teamsFor10) {
        if (importedTeamIdToExistingId.has(newTeam.id)) continue;
        const cleanNewName = cleanStr(newTeam.name);
        if (!cleanNewName) continue;

        const match = base10Teams.find(
          (et) => !assignedExistingIds.has(et.id) && cleanStr(et.name) === cleanNewName
        );
        if (match) {
          importedTeamIdToExistingId.set(newTeam.id, match.id);
          assignedExistingIds.add(match.id);
        }
      }

      // 3. Passata per le squadre dell'ultima stagione: Matching per indice posizionale per le squadre residue
      for (let i = 0; i < teamsFor10.length; i++) {
        const newTeam = teamsFor10[i];
        if (importedTeamIdToExistingId.has(newTeam.id)) continue;

        const unassigned = base10Teams.find((et) => !assignedExistingIds.has(et.id));
        if (unassigned) {
          importedTeamIdToExistingId.set(newTeam.id, unassigned.id);
          assignedExistingIds.add(unassigned.id);
        }
      }

      // 4. Mappa TUTTE le altre squadre storiche di ogni stagione precedente a una delle 10 squadre base
      for (const otherTeam of newTeams) {
        if (importedTeamIdToExistingId.has(otherTeam.id)) continue;
        const cleanManager = cleanStr(otherTeam.manager_name);
        const match = base10Teams.find((et) => cleanStr(et.manager_name) === cleanManager);
        if (match) {
          importedTeamIdToExistingId.set(otherTeam.id, match.id);
        } else {
          const matchName = base10Teams.find((et) => cleanStr(et.name) === cleanStr(otherTeam.name));
          if (matchName) {
            importedTeamIdToExistingId.set(otherTeam.id, matchName.id);
          } else {
            const idx = (otherTeam.order_index || 1) - 1;
            const fallbackTeam = base10Teams[idx % base10Teams.length];
            if (fallbackTeam) {
              importedTeamIdToExistingId.set(otherTeam.id, fallbackTeam.id);
            }
          }
        }
      }

      // Aggiorna in-place i nomi delle 10 squadre con quelli dell'ultima stagione del file Excel
      const updated10Teams = base10Teams.map((existingTeam) => {
        const matchedNewTeam = teamsFor10.find(
          (nt) => importedTeamIdToExistingId.get(nt.id) === existingTeam.id
        );

        if (!matchedNewTeam) {
          return existingTeam;
        }

        const isAdmin =
          existingTeam.manager_name.toLowerCase().includes('admin') ||
          matchedNewTeam.manager_name.toLowerCase().includes('admin');

        const finalManagerName =
          isAdmin && !matchedNewTeam.manager_name.toLowerCase().includes('admin')
            ? `${matchedNewTeam.manager_name} (Admin)`
            : matchedNewTeam.manager_name;

        return {
          ...existingTeam,
          name: matchedNewTeam.name,
          manager_name: finalManagerName,
          bonus_credits: matchedNewTeam.bonus_credits || 0,
          initial_budget: matchedNewTeam.initial_budget || existingTeam.initial_budget || 500,
        };
      });

      // Salva rigorosamente 10 squadre (senza alcun append)
      setTeams(updated10Teams);

      // Mappa i calciatori di tutte le rose importate agli ID delle 10 squadre della lega e assicura club Serie A corretto
      const mappedNewRoster = newRoster.map((r) => {
        const mappedTeamId = importedTeamIdToExistingId.get(r.team_id) || r.team_id;
        const resolvedClub =
          !r.serie_a_team || r.serie_a_team === 'Serie A'
            ? findSerieAClub(r.player_name, r.role, players as any)
            : r.serie_a_team;
        return {
          ...r,
          team_id: mappedTeamId,
          serie_a_team: resolvedClub,
        };
      });

      // Sostituisci la rosa per tutte le stagioni importate, preservando le altre
      const importedSeasonIds = new Set(newSeasons.map((s) => s.id));
      const filteredExistingRoster = roster.filter(
        (r) => !importedSeasonIds.has(r.season_id || '')
      );
      const combinedRoster = [...mappedNewRoster, ...filteredExistingRoster];
      setRoster(combinedRoster);

      // Aggiorna/unisci le stagioni
      const combinedSeasons = [...seasons];
      for (const s of newSeasons) {
        const existingIdx = combinedSeasons.findIndex((es) => es.id === s.id);
        if (existingIdx >= 0) {
          combinedSeasons[existingIdx] = { ...combinedSeasons[existingIdx], ...s };
        } else {
          combinedSeasons.push(s);
        }
      }
      combinedSeasons.sort((a, b) => b.id.localeCompare(a.id));
      setSeasons(combinedSeasons);
      if (latestSeasonId) {
        setSelectedSeasonId(latestSeasonId);
      }

      broadcastLocalChange({
        seasons: combinedSeasons,
        teams: updated10Teams,
        roster: combinedRoster,
        selectedSeasonId: latestSeasonId,
      });

      persistStateLocally({
        seasons: combinedSeasons,
        teams: updated10Teams,
        roster: combinedRoster,
        selectedSeasonId: latestSeasonId,
      });

      if (supabaseConfigured) {
        const supabase = createClient();
        for (const s of combinedSeasons) {
          await supabase.from('seasons').upsert(s);
        }
        for (const t of updated10Teams) {
          await supabase.from('teams').upsert(t);
        }
        for (const sId of importedSeasonIds) {
          await supabase.from('roster_players').delete().eq('season_id', sId);
        }
        // Batch insert in blocchi da 50
        for (let i = 0; i < mappedNewRoster.length; i += 50) {
          const batch = mappedNewRoster.slice(i, i + 50);
          await supabase.from('roster_players').insert(batch);
        }
      }

      return {
        seasonsCount: newSeasons.length,
        rosterCount: mappedNewRoster.length,
      };
    },
    [seasons, teams, roster, selectedSeasonId, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Modifica il prezzo pagato per un calciatore già in rosa
  const updateRosterPrice = useCallback(
    async (
      rosterId: string,
      newPrice: number
    ): Promise<{ success: boolean; error?: string }> => {
      const targetItem = roster.find((r) => r.id === rosterId);
      if (!targetItem) return { success: false, error: 'Calciatore non trovato nella rosa.' };
      if (newPrice < 1) return { success: false, error: 'Il prezzo deve essere almeno 1 FM.' };

      const targetTeam = teams.find((t) => t.id === targetItem.team_id);
      if (!targetTeam) return { success: false, error: 'Squadra non trovata.' };

      const updatedRoster = roster.map((r) =>
        r.id === rosterId ? { ...r, price: newPrice } : r
      );
      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('roster_players').update({ price: newPrice }).eq('id', rosterId);
      }

      return { success: true };
    },
    [roster, teams, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Modifica completa di un calciatore in rosa (prezzo, nome, ruolo, club Serie A, squadra)
  const updateRosterPlayer = useCallback(
    async (
      rosterId: string,
      updates: {
        player_name?: string;
        role?: PlayerRole;
        serie_a_team?: string;
        team_id?: string;
        price?: number;
        session?: AuctionSessionType;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      const targetItem = roster.find((r) => r.id === rosterId);
      if (!targetItem) return { success: false, error: 'Calciatore non trovato nella rosa.' };

      const finalPrice = updates.price !== undefined ? updates.price : targetItem.price;
      if (finalPrice < 1) return { success: false, error: 'Il prezzo deve essere almeno 1 FM.' };

      const finalTeamId = updates.team_id || targetItem.team_id;
      const targetTeam = teams.find((t) => t.id === finalTeamId);
      if (!targetTeam) return { success: false, error: 'Squadra di destinazione non trovata.' };

      const finalRole = updates.role || targetItem.role;
      const finalName = updates.player_name ? updates.player_name.trim() : targetItem.player_name;
      const finalClub =
        updates.serie_a_team !== undefined ? updates.serie_a_team.trim() : targetItem.serie_a_team;
      const finalSession = updates.session || targetItem.session;

      // Se cambia squadra o ruolo, verifica solo la capienza degli slot
      if (finalTeamId !== targetItem.team_id || finalRole !== targetItem.role) {
        const rosterWithoutItem = currentSeasonRoster.filter((r) => r.id !== rosterId);
        const teamStat = calculateTeamStats(targetTeam, rosterWithoutItem, league);

        if (teamStat.slotsRemaining <= 0) {
          return {
            success: false,
            error: `La rosa di ${targetTeam.name} è già al completo.`,
          };
        }
        if (teamStat.roleCounts[finalRole] >= teamStat.roleMax[finalRole]) {
          return {
            success: false,
            error: `Slot esauriti per il ruolo ${finalRole} nella squadra ${targetTeam.name}.`,
          };
        }
      }

      const updatedRoster = roster.map((r) =>
        r.id === rosterId
          ? {
              ...r,
              player_name: finalName,
              role: finalRole,
              serie_a_team: finalClub,
              team_id: finalTeamId,
              price: finalPrice,
              session: finalSession,
            }
          : r
      );

      setRoster(updatedRoster);
      broadcastLocalChange({ roster: updatedRoster });
      persistStateLocally({ roster: updatedRoster });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase
          .from('roster_players')
          .update({
            player_name: finalName,
            role: finalRole,
            serie_a_team: finalClub,
            team_id: finalTeamId,
            price: finalPrice,
            session: finalSession,
          })
          .eq('id', rosterId);
      }

      return { success: true };
    },
    [roster, currentSeasonRoster, teams, league, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Annulla l'ultima assegnazione effettuata (Undo)
  const undoLastAssignment = useCallback(async (): Promise<boolean> => {
    if (roster.length === 0) return false;

    const [lastItem, ...remainingRoster] = roster;
    setRoster(remainingRoster);
    broadcastLocalChange({ roster: remainingRoster });

    if (supabaseConfigured) {
      const supabase = createClient();
      await supabase.from('roster_players').delete().eq('id', lastItem.id);
    }

    return true;
  }, [roster, supabaseConfigured, broadcastLocalChange]);

  // Azione: Aggiungi calciatore manuale
  const addManualPlayer = useCallback(
    async (
      name: string,
      role: PlayerRole,
      team: string,
      initialPrice: number = 1
    ): Promise<Player> => {
      const newPlayer: Player = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        role,
        team: team.trim() || 'Serie A',
        initial_price: initialPrice || 1,
        is_custom: true,
        created_at: new Date().toISOString(),
      };

      const updatedPlayers = [newPlayer, ...players];
      setPlayers(updatedPlayers);
      broadcastLocalChange({ players: updatedPlayers });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('players').insert([newPlayer]);
      }

      return newPlayer;
    },
    [players, supabaseConfigured, broadcastLocalChange]
  );

  // Azione: Importa listone da file Excel / CSV
  const importPlayers = useCallback(
    async (newPlayers: Omit<Player, 'id' | 'created_at'>[]): Promise<number> => {
      const formatted: Player[] = newPlayers.map((p, idx) => ({
        ...p,
        id: `imported-${Date.now()}-${idx}`,
        created_at: new Date().toISOString(),
      }));

      // Preserva i giocatori custom creati manualmente
      const customPlayers = players.filter((p) => p.is_custom);

      // Crea mappa per nome normalizzato per aggiornare team, role e initial_price
      const newByName = new Map<string, Player>();
      for (const p of formatted) {
        newByName.set(p.name.toLowerCase().trim(), p);
      }

      // Combina i nuovi giocatori con i custom non sovrascritti
      const remainingCustom = customPlayers.filter(
        (cp) => !newByName.has(cp.name.toLowerCase().trim())
      );
      const finalPlayers = [...formatted, ...remainingCustom];

      setPlayers(finalPlayers);
      broadcastLocalChange({ players: finalPlayers });
      persistStateLocally({ players: finalPlayers });

      if (supabaseConfigured) {
        const supabase = createClient();
        try {
          // Rimuovi vecchi giocatori standard e inserisci in batch da 100
          await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          for (let i = 0; i < finalPlayers.length; i += 100) {
            const batch = finalPlayers.slice(i, i + 100);
            await supabase.from('players').insert(batch);
          }
        } catch (err) {
          console.warn('Errore salvataggio batch players su Supabase:', err);
        }
      }

      return formatted.length;
    },
    [players, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Modifica squadra
  const updateTeam = useCallback(
    async (teamId: string, updates: Partial<Team>) => {
      const updatedTeams = teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t));
      setTeams(updatedTeams);
      broadcastLocalChange({ teams: updatedTeams });
      persistStateLocally({ teams: updatedTeams });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('teams').update(updates).eq('id', teamId);
      }
    },
    [teams, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Crea nuova squadra
  const createTeam = useCallback(
    async (name: string, manager_name: string, manager_email?: string, seasonId?: string) => {
      const targetSeasonId = seasonId || selectedSeasonId || '2026-2027';
      const cleanSlug = name
        .toLowerCase()
        .replace(/[.\s_]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const newTeam: Team = {
        id: `team-${targetSeasonId}_${cleanSlug || 'squadra'}_${Date.now().toString(36).slice(-4)}`,
        league_id: league.id,
        season_id: targetSeasonId,
        name: name.trim(),
        manager_name: manager_name.trim(),
        manager_email: manager_email?.trim() || null,
        initial_budget: league.total_budget || 500,
        bonus_credits: 0,
        order_index: teams.length + 1,
        created_at: new Date().toISOString(),
      };

      const updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);
      broadcastLocalChange({ teams: updatedTeams });
      persistStateLocally({ teams: updatedTeams });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('teams').insert(newTeam);
      }

      return newTeam;
    },
    [teams, league, selectedSeasonId, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Elimina squadra
  const deleteTeam = useCallback(
    async (teamId: string) => {
      const updatedTeams = teams.filter((t) => t.id !== teamId);
      const updatedRoster = roster.filter((r) => r.team_id !== teamId);

      setTeams(updatedTeams);
      setRoster(updatedRoster);

      if (activeTeamId === teamId) {
        setActiveTeamId(null);
      }

      if (auctionState.leading_team_id === teamId) {
        const resetBidState = { ...auctionState, leading_team_id: null };
        setAuctionState(resetBidState);
        broadcastLocalChange({
          teams: updatedTeams,
          roster: updatedRoster,
          auctionState: resetBidState,
        });
        persistStateLocally({
          teams: updatedTeams,
          roster: updatedRoster,
          auctionState: resetBidState,
        });
      } else {
        broadcastLocalChange({ teams: updatedTeams, roster: updatedRoster });
        persistStateLocally({ teams: updatedTeams, roster: updatedRoster });
      }

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('roster_players').delete().eq('team_id', teamId);
        await supabase.from('teams').delete().eq('id', teamId);
      }

      return true;
    },
    [teams, roster, activeTeamId, auctionState, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Aggiorna regolamento e composizione rose
  const updateLeagueSettings = useCallback(
    async (settings: Partial<League>) => {
      const updatedLeague: League = {
        ...league,
        ...settings,
      };
      setLeague(updatedLeague);

      // Se il budget iniziale è cambiato, aggiorna l'initial_budget di tutte le squadre
      let updatedTeams = teams;
      if (settings.total_budget !== undefined && settings.total_budget !== league.total_budget) {
        updatedTeams = teams.map((t) => ({ ...t, initial_budget: settings.total_budget! }));
        setTeams(updatedTeams);
      }

      broadcastLocalChange({ league: updatedLeague, teams: updatedTeams });
      persistStateLocally({ league: updatedLeague, teams: updatedTeams });

      if (supabaseConfigured) {
        const supabase = createClient();
        await supabase.from('leagues').update(settings).eq('id', league.id);
        if (settings.total_budget !== undefined) {
          await supabase
            .from('teams')
            .update({ initial_budget: settings.total_budget })
            .eq('league_id', league.id);
        }
      }
    },
    [league, teams, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Azione: Reset completo dell'asta
  const resetAuction = useCallback(async () => {
    setRoster([]);
    const resetState: AuctionState = {
      id: auctionState.id,
      league_id: league.id,
      current_player_id: null,
      current_player_name: null,
      current_role: null,
      current_serie_a_team: null,
      current_bid: 1,
      leading_team_id: null,
      status: 'idle',
      updated_at: new Date().toISOString(),
    };
    setAuctionState(resetState);
    broadcastLocalChange({ roster: [], auctionState: resetState });
    persistStateLocally({ roster: [], auctionState: resetState });

    if (supabaseConfigured) {
      const supabase = createClient();
      await Promise.all([
        supabase.from('roster_players').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('auction_state').upsert(resetState),
      ]);
    }
  }, [auctionState.id, league.id, supabaseConfigured, broadcastLocalChange, persistStateLocally]);

  // Azione: Archivia la stagione in corso e ne apre una nuova (es. 2027/2028)
  const archiveSeasonAndStartNew = useCallback(
    async (
      newSeasonName: string,
      newSeasonId?: string,
      initialBudget?: number
    ): Promise<{ success: boolean; newSeason: Season }> => {
      const budget = initialBudget || league.total_budget || 500;
      const cleanName = newSeasonName.trim();
      const generatedId =
        newSeasonId?.trim() ||
        cleanName.replace(/\s+/g, '-').replace(/\//g, '-').replace(/[^\w-]/g, '').toLowerCase();

      const newSeasonObj: Season = {
        id: generatedId,
        name: cleanName,
        is_current: true,
        budget,
        created_at: new Date().toISOString(),
      };

      // 1. Archivia tutte le stagioni precedenti (is_current = false)
      const existingSeasonsArchived = seasons.map((s) => ({
        ...s,
        is_current: false,
      }));
      const filteredExisting = existingSeasonsArchived.filter((s) => s.id !== generatedId);
      const updatedSeasons = [newSeasonObj, ...filteredExisting].sort((a, b) =>
        b.id.localeCompare(a.id)
      );
      setSeasons(updatedSeasons);

      // 2. Le 10 squadre rimangono le stesse ma azzerano crediti residui a 500 e bonus a 0 per la nuova stagione
      const reset10Teams = teams.map((t) => ({
        ...t,
        initial_budget: budget,
        bonus_credits: 0,
        season_id: generatedId,
      }));
      setTeams(reset10Teams);

      // 3. Imposta la stagione attiva corrente sul nuovo ID
      setSelectedSeasonId(generatedId);

      // 4. Resetta lo stato dell'asta in idle per la nuova stagione
      const resetState: AuctionState = {
        id: auctionState.id || 'current',
        league_id: league.id,
        current_player_id: null,
        current_player_name: null,
        current_role: null,
        current_serie_a_team: null,
        current_bid: 1,
        leading_team_id: null,
        status: 'idle',
        updated_at: new Date().toISOString(),
      };
      setAuctionState(resetState);

      // 5. Salva e sincronizza localmente (le rose precedenti rimangono intatte nel roster per il loro season_id)
      broadcastLocalChange({
        seasons: updatedSeasons,
        teams: reset10Teams,
        roster,
        selectedSeasonId: generatedId,
        auctionState: resetState,
      });

      persistStateLocally({
        seasons: updatedSeasons,
        teams: reset10Teams,
        roster,
        selectedSeasonId: generatedId,
        auctionState: resetState,
      });

      // 6. Sincronizzazione Supabase
      if (supabaseConfigured) {
        const supabase = createClient();
        for (const s of updatedSeasons) {
          await supabase.from('seasons').upsert(s);
        }
        for (const t of reset10Teams) {
          await supabase.from('teams').upsert(t);
        }
        await supabase.from('auction_state').upsert(resetState);
      }

      return { success: true, newSeason: newSeasonObj };
    },
    [
      seasons,
      teams,
      roster,
      auctionState.id,
      league.id,
      league.total_budget,
      supabaseConfigured,
      broadcastLocalChange,
      persistStateLocally,
    ]
  );

  // Azione: Imposta quale stagione è attualmente attiva
  const setCurrentActiveSeason = useCallback(
    async (seasonId: string) => {
      const updatedSeasons = seasons.map((s) => ({
        ...s,
        is_current: s.id === seasonId,
      }));
      setSeasons(updatedSeasons);
      setSelectedSeasonId(seasonId);

      broadcastLocalChange({
        seasons: updatedSeasons,
        selectedSeasonId: seasonId,
      });

      persistStateLocally({
        seasons: updatedSeasons,
        selectedSeasonId: seasonId,
      });

      if (supabaseConfigured) {
        const supabase = createClient();
        for (const s of updatedSeasons) {
          await supabase.from('seasons').upsert(s);
        }
      }
    },
    [seasons, supabaseConfigured, broadcastLocalChange, persistStateLocally]
  );

  // Login / Switch rapido utente
  const loginAsUser = useCallback(
    (email: string, role: 'admin' | 'player', teamId?: string) => {
      const userTeam = teams.find((t) => t.id === teamId);
      const newSession: UserSession = {
        email,
        isAdmin: role === 'admin',
        teamId: teamId || (role === 'admin' ? teams[0]?.id : null),
        managerName: userTeam?.manager_name || (role === 'admin' ? 'Banditore (Admin)' : 'Giocatore'),
      };
      setCurrentUser(newSession);
    },
    [teams]
  );

  return (
    <AuctionContext.Provider
      value={{
        league,
        teams,
        players,
        roster,
        seasons,
        selectedSeasonId,
        setSelectedSeasonId,
        currentSession,
        setCurrentSession,
        auctionState,
        currentUser,
        teamsStats,
        isRealtimeConnected,
        isSupabaseActive: supabaseConfigured,
        isHydrated,
        isLoadingData,
        activeTeamId,
        setActiveTeamId,
        loginAsUser,
        callPlayer,
        updateBid,
        assignPlayer,
        assignPlayerToTeam,
        addCustomPlayerToRoster,
        updateRosterPlayer,
        removePlayerFromRoster,
        releasePlayerFromRoster,
        addRepairBonusToTeams,
        importHistoricalData,
        updateRosterPrice,
        undoLastAssignment,
        addManualPlayer,
        importPlayers,
        updateTeam,
        createTeam,
        deleteTeam,
        updateLeagueSettings,
        resetAuction,
        archiveSeasonAndStartNew,
        setCurrentActiveSeason,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction deve essere utilizzato all\'interno di un AuctionProvider');
  }
  return context;
}
