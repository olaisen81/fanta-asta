export type PlayerRole = 'P' | 'D' | 'C' | 'A';
export type AuctionSessionType = 'initial' | 'repair'; // Estiva vs Riparazione (Gennaio)

export interface Season {
  id: string; // es. '2026-2027', '2025-2026'
  name: string; // es. '2026/2027'
  is_current: boolean;
  budget: number; // default 500
  repair_budget_bonus?: number; // crediti extra gennaio
  created_at?: string;
}

export interface League {
  id: string;
  name: string;
  total_budget: number; // 500
  slots_p: number; // 3
  slots_d: number; // 8
  slots_c: number; // 8
  slots_a: number; // 6
  admin_email?: string;
  admin_user_id?: string;
  created_at?: string;
}

export interface Team {
  id: string;
  league_id: string;
  season_id?: string;
  name: string;
  manager_name: string;
  manager_email?: string | null;
  user_id?: string | null;
  is_admin?: boolean;
  initial_budget: number;
  bonus_credits?: number; // crediti extra gennaio/riparazione
  order_index: number;
  created_at?: string;
}

export interface Player {
  id: string;
  name: string;
  team: string; // Serie A club (es. "Inter", "Milan", "Napoli")
  role: PlayerRole;
  initial_price: number;
  is_custom?: boolean;
  created_at?: string;
}

export interface RosterPlayer {
  id: string;
  league_id: string;
  season_id?: string;
  team_id: string;
  player_id?: string | null;
  player_name: string;
  role: PlayerRole;
  serie_a_team: string;
  price: number;
  purchased_at: string;
  // Supporto Asta di Riparazione (Gennaio)
  session?: AuctionSessionType; // 'initial' (estiva) | 'repair' (gennaio)
  is_released?: boolean; // true se svincolato a gennaio
  refund_amount?: number; // crediti recuperati dallo svincolo
  released_at?: string | null;
}

export interface AuctionState {
  id: string;
  league_id: string;
  current_player_id?: string | null;
  current_player_name?: string | null;
  current_role?: PlayerRole | null;
  current_serie_a_team?: string | null;
  current_bid: number;
  leading_team_id?: string | null;
  status: 'idle' | 'bidding' | 'sold';
  updated_at: string;
}

export interface Invitation {
  id: string;
  league_id: string;
  team_id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface TeamBudgetStats {
  team: Team;
  spent: number; // somma prezzi calciatori ATTIVI
  refunds: number; // somma crediti recuperati da svincoli
  bonusCredits: number; // bonus gennaio
  totalAvailable: number; // initial_budget + bonus + refunds
  remaining: number; // totalAvailable - spent
  playersCount: number; // solo calciatori ATTIVI
  slotsRemaining: number;
  maxBid: number;
  releasedCount: number; // calciatori svincolati
  roleCounts: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  roleMax: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  roleSpent: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
}

export interface UserSession {
  email?: string;
  isAdmin: boolean;
  teamId?: string | null;
  managerName?: string;
  isImpersonating?: boolean;
  realAdminEmail?: string;
}

