// Test di verifica per la logica di calcolo del fantacalcio

function calculateTeamStats(team, roster, league) {
  const teamRoster = roster.filter((r) => r.team_id === team.id);

  let spent = 0;
  const roleCounts = { P: 0, D: 0, C: 0, A: 0 };
  const roleSpent = { P: 0, D: 0, C: 0, A: 0 };

  for (const player of teamRoster) {
    spent += player.price;
    if (roleCounts[player.role] !== undefined) {
      roleCounts[player.role] += 1;
      roleSpent[player.role] += player.price;
    }
  }

  const remaining = team.initial_budget - spent;
  const playersCount = teamRoster.length;
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
  };
}

function validatePurchase(stats, role, price, league) {
  if (price <= 0) return { valid: false, error: 'Il prezzo deve essere almeno 1' };
  if (stats.slotsRemaining <= 0) return { valid: false, error: 'Rosa già completa' };
  
  const roleMax = { P: league.slots_p, D: league.slots_d, C: league.slots_c, A: league.slots_a };
  if (stats.roleCounts[role] >= roleMax[role]) {
    return { valid: false, error: 'Slot ruolo esauriti' };
  }

  if (price > stats.maxBid) {
    return { valid: false, error: 'Prezzo supera max bid consentito' };
  }

  return { valid: true };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Test fallito: ${msg}`);
}

const mockLeague = { slots_p: 3, slots_d: 8, slots_c: 8, slots_a: 6, total_budget: 500 };
const mockTeam = { id: 'team-1', initial_budget: 500, name: 'FC Real' };

console.log('--- AVVIO TEST VERIFICA CALCOLI FANTACALCIO ---');

// 1. Inizio asta
const stats0 = calculateTeamStats(mockTeam, [], mockLeague);
assert(stats0.spent === 0, 'Spesa iniziale');
assert(stats0.remaining === 500, 'Crediti iniziali');
assert(stats0.maxBid === 476, `Max bid iniziale 476, ottenuto ${stats0.maxBid}`);
console.log('✓ Test 1 OK: Saldo iniziale 500 FM e Max Bid 476 FM (25 slot)');

// 2. Acquisto top player a 180 FM
const roster1 = [{ team_id: 'team-1', role: 'A', price: 180 }];
const stats1 = calculateTeamStats(mockTeam, roster1, mockLeague);
assert(stats1.spent === 180, 'Spesa 180');
assert(stats1.remaining === 320, 'Residui 320');
assert(stats1.maxBid === 297, `Max bid 297, ottenuto ${stats1.maxBid}`);
console.log('✓ Test 2 OK: Acquisto a 180 FM -> Residui 320 FM, Max Bid 297 FM');

// 3. Validazione sforamento Max Bid
const valOver = validatePurchase(stats1, 'A', 298, mockLeague);
assert(valOver.valid === false, 'Superamento max bid bloccato');
const valOk = validatePurchase(stats1, 'A', 297, mockLeague);
assert(valOk.valid === true, 'Offerta max consentita accettata');
console.log('✓ Test 3 OK: Validazione matematicamente rigorosa delle offerte');

// 4. Blocco slot ruolo esauriti
const roster3P = [
  { team_id: 'team-1', role: 'P', price: 10 },
  { team_id: 'team-1', role: 'P', price: 1 },
  { team_id: 'team-1', role: 'P', price: 1 },
];
const stats3P = calculateTeamStats(mockTeam, roster3P, mockLeague);
const val4thP = validatePurchase(stats3P, 'P', 1, mockLeague);
assert(val4thP.valid === false, 'Quarto portiere bloccato');
console.log('✓ Test 4 OK: Blocco automatico acquisti a slot ruolo esauriti');

// 5. Test composizione personalizzata (22 slot: 3P, 7D, 7C, 5A)
const customLeague = { slots_p: 3, slots_d: 7, slots_c: 7, slots_a: 5, total_budget: 500 };
const statsCustom = calculateTeamStats(mockTeam, [], customLeague);
assert(statsCustom.slotsRemaining === 22, `Slot rimanenti devono essere 22, ottenuto ${statsCustom.slotsRemaining}`);
// Max bid: 500 - (22 - 1) = 500 - 21 = 479 FM
assert(statsCustom.maxBid === 479, `Max bid personalizzato deve essere 479 FM, ottenuto ${statsCustom.maxBid}`);

// Verifica limite personalizzato 5 attaccanti
const fiveAttackers = [
  { team_id: 'team-1', role: 'A', price: 10 },
  { team_id: 'team-1', role: 'A', price: 10 },
  { team_id: 'team-1', role: 'A', price: 10 },
  { team_id: 'team-1', role: 'A', price: 10 },
  { team_id: 'team-1', role: 'A', price: 10 },
];
const stats5A = calculateTeamStats(mockTeam, fiveAttackers, customLeague);
const val6thA = validatePurchase(stats5A, 'A', 5, customLeague);
assert(val6thA.valid === false, 'Il sesto attaccante deve essere bloccato perché il limite impostato è 5');
console.log('✓ Test 5 OK: Composizione personalizzata (22 slot, max 5 attaccanti) perfettamente funzionante');

// 6. Test Asta di Riparazione (Svincolo calciatore + Rimborso crediti + Bonus Gennaio)
function calculateTeamStatsRepair(team, roster, league) {
  const teamRoster = roster.filter((r) => r.team_id === team.id);
  const activePlayers = teamRoster.filter((r) => !r.is_released);
  const releasedPlayers = teamRoster.filter((r) => r.is_released);

  let spent = 0;
  const roleCounts = { P: 0, D: 0, C: 0, A: 0 };
  for (const p of activePlayers) {
    spent += p.price;
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  }

  let refunds = 0;
  for (const rel of releasedPlayers) {
    refunds += rel.refund_amount || 0;
  }

  const bonus = team.bonus_credits || 0;
  const totalAvailable = team.initial_budget + bonus + refunds;
  const remaining = totalAvailable - spent;
  const totalSlots = league.slots_p + league.slots_d + league.slots_c + league.slots_a;
  const slotsRemaining = Math.max(0, totalSlots - activePlayers.length);

  let maxBid = 0;
  if (slotsRemaining === 1) maxBid = Math.max(0, remaining);
  else if (slotsRemaining > 1) maxBid = Math.max(0, remaining - (slotsRemaining - 1));

  return { spent, remaining, refunds, bonus, totalAvailable, slotsRemaining, maxBid, roleCounts };
}

const repairTeam = { id: 'team-1', initial_budget: 500, bonus_credits: 20 };
const rosterWithSvincolo = [
  { team_id: 'team-1', role: 'A', price: 100, is_released: true, refund_amount: 50 }, // svincolato al 50%
  { team_id: 'team-1', role: 'C', price: 30, is_released: false },
];
const statsRepair = calculateTeamStatsRepair(repairTeam, rosterWithSvincolo, mockLeague);
// Spesa attiva = 30
// Rimborsi = 50, Bonus = 20 -> Totale disponibile = 500 + 20 + 50 = 570
// Residui = 570 - 30 = 540
assert(statsRepair.spent === 30, `Spesa attiva deve essere 30, ottenuto ${statsRepair.spent}`);
assert(statsRepair.refunds === 50, `Rimborsi devono essere 50, ottenuto ${statsRepair.refunds}`);
assert(statsRepair.bonus === 20, `Bonus deve essere 20, ottenuto ${statsRepair.bonus}`);
assert(statsRepair.remaining === 540, `Residui devono essere 540, ottenuto ${statsRepair.remaining}`);
// Slot totali = 25, giocatori attivi = 1, slotsRemaining = 24.
// Max bid: remaining - (24 - 1) = 540 - 23 = 517 FM
assert(statsRepair.maxBid === 517, `Max bid deve essere 517, ottenuto ${statsRepair.maxBid}`);
assert(statsRepair.roleCounts.A === 0, 'Lo slot attaccante deve essere libero dopo lo svincolo');
console.log('✓ Test 6 OK: Asta di Riparazione (svincolo con rimborso al 50%, liberazione slot e bonus gennaio)');

console.log('--- TUTTI I 6 TEST SUPERATI CON SUCCESSO! ---');
