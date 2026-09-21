import { League, Team, RosterPlayer, PlayerRole, TeamBudgetStats } from '../supabase/types';

export const DEFAULT_LEAGUE_CONFIG: League = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Lega Fantacalcio 2026/2027',
  total_budget: 500,
  slots_p: 3,
  slots_d: 8,
  slots_c: 8,
  slots_a: 6,
};

export const TOTAL_SLOTS = (league: League = DEFAULT_LEAGUE_CONFIG) => {
  return league.slots_p + league.slots_d + league.slots_c + league.slots_a;
};

/**
 * Calcola tutte le statistiche di budget, slot e offerta massima per una squadra,
 * supportando anche l'Asta di Riparazione (calciatori svincolati con rimborso e bonus gennaio).
 */
export function calculateTeamStats(
  team: Team,
  roster: RosterPlayer[],
  league: League = DEFAULT_LEAGUE_CONFIG
): TeamBudgetStats {
  const teamRoster = roster.filter((r) => r.team_id === team.id);

  // Separa calciatori attivi da calciatori svincolati
  const activePlayers = teamRoster.filter((r) => !r.is_released);
  const releasedPlayers = teamRoster.filter((r) => r.is_released);

  let spent = 0;
  const roleCounts: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  const roleSpent: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };

  for (const player of activePlayers) {
    spent += player.price;
    if (roleCounts[player.role] !== undefined) {
      roleCounts[player.role] += 1;
      roleSpent[player.role] += player.price;
    }
  }

  // Calcola rimborsi ottenuti dagli svincoli
  let refunds = 0;
  for (const rel of releasedPlayers) {
    refunds += rel.refund_amount || 0;
  }

  const bonusCredits = team.bonus_credits || 0;
  const totalAvailable = team.initial_budget + bonusCredits + refunds;
  const remaining = totalAvailable - spent;

  const playersCount = activePlayers.length;
  const totalRosterSlots = TOTAL_SLOTS(league);
  const slotsRemaining = Math.max(0, totalRosterSlots - playersCount);

  // Formula Massima Offerta Consentita (Max Bid):
  // Bisogna riservare almeno 1 credito per ciascuno dei restanti slot da riempire
  let maxBid = 0;
  if (slotsRemaining === 1) {
    maxBid = Math.max(0, remaining);
  } else if (slotsRemaining > 1) {
    const reservedCredits = slotsRemaining - 1;
    maxBid = Math.max(0, remaining - reservedCredits);
  }

  return {
    team,
    spent,
    refunds,
    bonusCredits,
    totalAvailable,
    remaining,
    playersCount,
    slotsRemaining,
    maxBid,
    releasedCount: releasedPlayers.length,
    roleCounts,
    roleMax: {
      P: league.slots_p,
      D: league.slots_d,
      C: league.slots_c,
      A: league.slots_a,
    },
    roleSpent,
  };
}

/**
 * Verifica se una squadra può acquistare un calciatore a un determinato prezzo
 */
export function validatePurchase(
  stats: TeamBudgetStats,
  role: PlayerRole,
  price: number
): { valid: boolean; error?: string } {
  if (price <= 0) {
    return { valid: false, error: 'Il prezzo deve essere di almeno 1 credito.' };
  }

  if (stats.slotsRemaining <= 0) {
    const totalSlots = stats.roleMax.P + stats.roleMax.D + stats.roleMax.C + stats.roleMax.A;
    return { valid: false, error: `La rosa di ${stats.team.name} è già completa (${totalSlots}/${totalSlots} calciatori).` };
  }

  const currentRoleCount = stats.roleCounts[role];
  const maxRoleCount = stats.roleMax[role];
  if (currentRoleCount >= maxRoleCount) {
    const roleNames: Record<PlayerRole, string> = {
      P: 'Portieri',
      D: 'Difensori',
      C: 'Centrocampisti',
      A: 'Attaccanti',
    };
    return {
      valid: false,
      error: `Slot esauriti per il ruolo ${roleNames[role]} (${currentRoleCount}/${maxRoleCount}).`,
    };
  }

  if (price > stats.maxBid) {
    return {
      valid: false,
      error: `Prezzo (${price} FM) supera l'offerta massima consentita (${stats.maxBid} FM) per ${stats.team.name}.`,
    };
  }

  return { valid: true };
}

/**
 * Helper per formattare la valuta (es. "450 FM")
 */
export function formatCredits(amount: number): string {
  return `${amount} FM`;
}

/**
 * Colori standard dei ruoli del fantacalcio per Tailwind
 */
export function getRoleBadgeStyles(role: PlayerRole): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
} {
  switch (role) {
    case 'P':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400',
        label: 'Portiere',
      };
    case 'D':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
        label: 'Difensore',
      };
    case 'C':
      return {
        bg: 'bg-sky-500/15',
        text: 'text-sky-400',
        border: 'border-sky-500/40',
        dot: 'bg-sky-400',
        label: 'Centrocampista',
      };
    case 'A':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        dot: 'bg-rose-400',
        label: 'Attaccante',
      };
  }
}

/**
 * Normalizza il nome di un calciatore rimuovendo accenti, caratteri speciali, spazi e punteggiatura.
 */
export function normalizePlayerName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .replace(/[^a-z0-9]/g, '') // rimuove spazi, punti, apostrofi, trattini
    .trim();
}

export interface PlayerRosterStatus {
  isAlreadyBought: boolean;
  isCurrentEditing: boolean; // solo in Edit: è esattamente il calciatore che stiamo modificando
  inCurrentTeam: boolean; // è assegnato alla squadra attualmente selezionata
  teamId: string;
  teamName: string;
  price: number;
}

/**
 * Verifica se un calciatore suggerito è già presente in rosa e restituisce i dettagli di appartenenza.
 * Controlla esclusivamente i calciatori della stagione attuale/richiesta (ignorando le stagioni archiviate).
 */
export function checkPlayerRosterStatus(
  sug: { id: string; name: string; role: PlayerRole; team?: string },
  roster: RosterPlayer[],
  teams: Team[],
  currentTeamId: string,
  currentEditingRosterId?: string,
  targetSeasonId?: string
): PlayerRosterStatus | null {
  const sugNorm = normalizePlayerName(sug.name);
  if (!sugNorm) return null;

  // Cerca tra i calciatori attivi (non svincolati) della stagione attuale
  const matched = roster.find((r) => {
    if (r.is_released) return false;

    // Se è indicata una stagione target, ignora i record di altre stagioni archiviate
    if (targetSeasonId && r.season_id && r.season_id !== targetSeasonId) {
      return false;
    }

    // 1. Match per ID listone se presente
    if (r.player_id && (r.player_id === sug.id || r.player_id === `q-${sug.id}`)) {
      return true;
    }

    // 2. Match normalizzato per nome esatto
    const rNorm = normalizePlayerName(r.player_name);
    if (rNorm === sugNorm) {
      return true;
    }

    // 3. Match con stesso ruolo e squadra Serie A se i nomi contengono l'uno l'altro
    if (r.role === sug.role && sug.team) {
      const isSameSerieA =
        r.serie_a_team?.toLowerCase() === sug.team?.toLowerCase() ||
        r.serie_a_team === 'Serie A' ||
        sug.team === 'Serie A';

      if (isSameSerieA && (rNorm.includes(sugNorm) || sugNorm.includes(rNorm))) {
        return true;
      }
    }

    return false;
  });

  if (!matched) return null;

  const isCurrentEditing = Boolean(currentEditingRosterId && matched.id === currentEditingRosterId);
  const inCurrentTeam = matched.team_id === currentTeamId;
  const team = teams.find((t) => t.id === matched.team_id);

  return {
    isAlreadyBought: true,
    isCurrentEditing,
    inCurrentTeam,
    teamId: matched.team_id,
    teamName: team?.name || 'Altra squadra',
    price: matched.price,
  };
}
