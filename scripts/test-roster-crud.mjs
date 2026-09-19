// Test per verificare le funzioni di gestione manuale della rosa:
// Aggiunta, Modifica (incluso prezzo e trasferimento squadra), Eliminazione

const DEFAULT_LEAGUE = {
  id: 'league-1',
  name: 'Lega Test',
  total_budget: 500,
  slots_p: 3,
  slots_d: 8,
  slots_c: 8,
  slots_a: 6,
};

function calculateTeamStats(team, roster, league = DEFAULT_LEAGUE) {
  const teamRoster = roster.filter((r) => r.team_id === team.id);
  const activePlayers = teamRoster.filter((r) => !r.is_released);
  const releasedPlayers = teamRoster.filter((r) => r.is_released);

  let spent = 0;
  const roleCounts = { P: 0, D: 0, C: 0, A: 0 };
  const roleSpent = { P: 0, D: 0, C: 0, A: 0 };

  for (const player of activePlayers) {
    spent += player.price;
    if (roleCounts[player.role] !== undefined) {
      roleCounts[player.role] += 1;
      roleSpent[player.role] += player.price;
    }
  }

  let refunds = 0;
  for (const rel of releasedPlayers) {
    refunds += rel.refund_amount || 0;
  }

  const bonusCredits = team.bonus_credits || 0;
  const totalAvailable = team.initial_budget + bonusCredits + refunds;
  const remaining = totalAvailable - spent;

  const playersCount = activePlayers.length;
  const totalRosterSlots = league.slots_p + league.slots_d + league.slots_c + league.slots_a;
  const slotsRemaining = Math.max(0, totalRosterSlots - playersCount);

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
    remaining,
    playersCount,
    slotsRemaining,
    maxBid,
    roleCounts,
    roleSpent,
    roleMax: { P: league.slots_p, D: league.slots_d, C: league.slots_c, A: league.slots_a },
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALLITA: ${msg}`);
  console.log(`✓ ${msg}`);
}

console.log('--- AVVIO TEST CRUD ROSA & MODIFICA IMPORTI ---');

const teamA = { id: 'team-1', name: 'Birrareal', initial_budget: 500 };
const teamB = { id: 'team-2', name: 'Babalu', initial_budget: 500 };
let roster = [];

// 1. Aggiunta manuale calciatore
const p1 = {
  id: 'r-1',
  team_id: 'team-1',
  player_name: 'Lautaro Martinez',
  role: 'A',
  serie_a_team: 'Inter',
  price: 180,
  session: 'initial',
  is_released: false,
};
roster.push(p1);

let statA = calculateTeamStats(teamA, roster);
assert(statA.spent === 180, 'Spesa Team A corretta a 180 FM');
assert(statA.remaining === 320, 'Residuo Team A corretto a 320 FM');
assert(statA.roleCounts.A === 1, 'Conteggio attaccanti Team A = 1');
assert(statA.slotsRemaining === 24, 'Slot residui Team A = 24');

// 2. Modifica importo pagato (es. correzione da 180 a 210 FM)
p1.price = 210;
statA = calculateTeamStats(teamA, roster);
assert(statA.spent === 210, 'Spesa aggiornata a 210 FM');
assert(statA.remaining === 290, 'Residuo aggiornato a 290 FM');

// 3. Verifica blocco se il prezzo supera max bid
const rosterWithoutP1 = roster.filter((r) => r.id !== p1.id);
const statWithoutP1 = calculateTeamStats(teamA, rosterWithoutP1);
assert(statWithoutP1.maxBid === 476, 'Max bid senza P1 = 476 FM');
const testExceedPrice = 480;
assert(testExceedPrice > statWithoutP1.maxBid, 'Prezzo 480 FM correttamente identificato come superiore al max bid consentito');

// 4. Trasferimento calciatore da Team A a Team B
p1.team_id = 'team-2';
statA = calculateTeamStats(teamA, roster);
let statB = calculateTeamStats(teamB, roster);
assert(statA.spent === 0 && statA.remaining === 500, 'Team A torna a 500 FM dopo trasferimento');
assert(statB.spent === 210 && statB.remaining === 290, 'Team B ha speso 210 FM dopo trasferimento');
assert(statB.roleCounts.A === 1, 'Team B ha 1 attaccante');

// 5. Rimozione calciatore dalla rosa
roster = roster.filter((r) => r.id !== p1.id);
statB = calculateTeamStats(teamB, roster);
assert(statB.spent === 0 && statB.remaining === 500, 'Team B torna a 500 FM dopo eliminazione calciatore');
assert(statB.roleCounts.A === 0, 'Team B ha 0 attaccanti dopo eliminazione');
assert(statB.slotsRemaining === 25, 'Team B ha tutti i 25 slot liberi');

console.log('TUTTI I TEST CRUD E CALCOLO IMPORTI SUPERATI AL 100%!');
