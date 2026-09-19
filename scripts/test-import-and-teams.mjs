import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const possiblePaths = [
  '/Users/fabio.perfetti/Projects/Asta Smadonnante.xlsx',
  path.join(process.cwd(), 'Asta Smadonnante.xlsx'),
  path.join(process.cwd(), '..', 'Asta Smadonnante.xlsx'),
];

let filePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    filePath = p;
    break;
  }
}

if (!filePath) {
  console.error('File non trovato!');
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

function normalizeRole(raw) {
  if (!raw) return 'C';
  const str = String(raw).trim().toUpperCase();
  if (str.startsWith('P') || str === 'POR' || str === 'PT') return 'P';
  if (str.startsWith('D') || str === 'DIF' || str === 'DF') return 'D';
  if (str.startsWith('C') || str === 'CEN' || str === 'CC') return 'C';
  if (str.startsWith('A') || str === 'ATT' || str === 'AT') return 'A';
  return 'C';
}

function normalizeSeasonName(raw) {
  const clean = raw.trim().replace(/\s+/g, '').replace(/_/g, '-');
  const matchFull = clean.match(/(20\d{2})[-/](20\d{2})/);
  if (matchFull) {
    return { id: `${matchFull[1]}-${matchFull[2]}`, name: `${matchFull[1]}/${matchFull[2]}` };
  }
  const matchShort = clean.match(/(20\d{2})[-/](\d{2})/);
  if (matchShort) {
    const startYear = parseInt(matchShort[1], 10);
    const endYear = 2000 + parseInt(matchShort[2], 10);
    return { id: `${startYear}-${endYear}`, name: `${startYear}/${endYear}` };
  }
  const matchSingle = clean.match(/(20\d{2})/);
  if (matchSingle) {
    const year = parseInt(matchSingle[1], 10);
    return { id: `${year}-${year + 1}`, name: `${year}/${year + 1}` };
  }
  return { id: clean.toLowerCase(), name: clean };
}

function normalizeTeamDisplayName(rawName) {
  const trimmed = String(rawName || '').trim();
  if (/^A\.?C\.?\s+Circolo\s+Vizioso$/i.test(trimmed)) return 'A.C. Circolo Vizioso';
  if (/^Pol\.?\s+Porca\s+Puttena$/i.test(trimmed)) return 'Pol. Porca Puttena';
  return trimmed;
}

function generateTeamSlug(name) {
  return name.toLowerCase().replace(/[.\s_]+/g, '_').replace(/^_+|_+$/g, '');
}

// Simula la funzione parseSmadonnanteWorkbook
function parseSmadonnante(wb) {
  const seasonGroups = new Map();
  for (const sheetName of wb.SheetNames) {
    const isRepair = sheetName.toLowerCase().includes('riparazione');
    const clean = sheetName.replace(/riparazione/i, '').trim();
    const seasonInfo = normalizeSeasonName(clean);
    if (!seasonGroups.has(seasonInfo.id)) {
      seasonGroups.set(seasonInfo.id, {
        seasonId: seasonInfo.id,
        seasonName: seasonInfo.name,
        initialSheet: null,
        repairSheet: null,
      });
    }
    if (isRepair) {
      seasonGroups.get(seasonInfo.id).repairSheet = sheetName;
    } else {
      seasonGroups.get(seasonInfo.id).initialSheet = sheetName;
    }
  }

  function extractTeams(rows) {
    const r1 = rows[1] || [];
    const r2 = rows[2] || [];
    const teams = [];
    for (let c = 0; c < r1.length; c++) {
      const val = String(r1[c] || '').trim();
      if (val && isNaN(Number(val)) && !['crediti', 'spesa', 'pt', 'df'].includes(val.toLowerCase())) {
        const budget = Number(r1[c + 1]) || 500;
        const bonus = Number(r1[c + 2]) || 0;
        const rawTeamName = String(r2[c] || '').trim() || val;
        const teamName = normalizeTeamDisplayName(rawTeamName);
        teams.push({ colIndex: c, manager: val, teamName, budget, bonus });
      }
    }
    return teams;
  }

  const sortedSeasonIds = Array.from(seasonGroups.keys()).sort((a, b) => b.localeCompare(a));
  const latestSeasonId = sortedSeasonIds[0];
  const group = seasonGroups.get(latestSeasonId);
  const seasonId = latestSeasonId;

  const teamsMap = new Map();
  const seasonRoster = [];

  if (group.initialSheet && wb.Sheets[group.initialSheet]) {
    const ws = wb.Sheets[group.initialSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const detectedTeams = extractTeams(rows);

    for (let i = 0; i < detectedTeams.length; i++) {
      const t = detectedTeams[i];
      const teamKey = `${seasonId}_${generateTeamSlug(t.teamName)}`;
      if (!teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, {
          id: `team-${teamKey}`,
          name: t.teamName,
          manager_name: t.manager,
          initial_budget: t.budget || 500,
          bonus_credits: t.bonus || 0,
        });
      }

      let currentRole = 'P';
      for (let r = 3; r < Math.min(85, rows.length); r++) {
        const row = rows[r];
        if (!row) continue;
        const firstCell = String(row[0] || '').trim().toUpperCase();
        if (firstCell === 'PT' || firstCell === 'POR') currentRole = 'P';
        else if (firstCell === 'DF' || firstCell === 'DIF') currentRole = 'D';
        else if (firstCell === 'CC' || firstCell === 'CEN') currentRole = 'C';
        else if (firstCell === 'AT' || firstCell === 'ATT') currentRole = 'A';

        const name = String(row[t.colIndex] || '').trim();
        if (!name || ['pt', 'df', 'cc', 'at', 'crediti', 'spesa', 'totale', 'residuo'].includes(name.toLowerCase())) {
          continue;
        }
        const rawPrice = row[t.colIndex + 1];
        const price = parseInt(String(rawPrice), 10);
        seasonRoster.push({
          id: `roster-${seasonId}-${teamKey}-${name.toLowerCase().replace(/[.\s_]+/g, '_')}`,
          season_id: seasonId,
          team_id: `team-${teamKey}`,
          player_name: name,
          role: currentRole,
          price: isNaN(price) || price < 1 ? 1 : price,
        });
      }
    }
  }

  return {
    seasons: [{ id: seasonId, name: group.seasonName, is_current: true }],
    teams: Array.from(teamsMap.values()),
    roster: seasonRoster,
  };
}

const parsed = parseSmadonnante(workbook);
console.log('--- RISULTATO PARSING ---');
console.log('Stagioni restituite (deve essere 1):', parsed.seasons.length, parsed.seasons[0]);
console.log('Squadre restituite (devono essere 10):', parsed.teams.length);
console.log('Calciatori in rosa:', parsed.roster.length);

if (parsed.seasons.length !== 1 || parsed.seasons[0].id !== '2026-2027') {
  throw new Error('Test fallito: La stagione deve essere solo 2026-2027');
}
if (parsed.teams.length !== 10) {
  throw new Error(`Test fallito: Attese 10 squadre, ottenute ${parsed.teams.length}`);
}

// SIMULAZIONE DI importHistoricalData (in-place matching su 10 squadre)
const INITIAL_TEAMS = [
  { id: 'team-1', name: 'Birrareal', manager_name: 'Fabio (Admin)', initial_budget: 500 },
  { id: 'team-2', name: 'Atletico Bulgao', manager_name: 'Bulga', initial_budget: 500 },
  { id: 'team-3', name: 'Babalu', manager_name: 'Cocco', initial_budget: 500 },
  { id: 'team-4', name: 'A.C. Circolo Vizioso', manager_name: 'Marco', initial_budget: 500 },
  { id: 'team-5', name: 'Pol. Porca Puttena', manager_name: 'Loppo', initial_budget: 500 },
  { id: 'team-6', name: 'Op Op Op Via', manager_name: 'Teo', initial_budget: 500 },
  { id: 'team-7', name: 'Atletico Maria', manager_name: 'Beppe', initial_budget: 500 },
  { id: 'team-8', name: 'Quartieri Spagnoli', manager_name: 'Tonio', initial_budget: 500 },
  { id: 'team-9', name: 'Real Perfect Team', manager_name: 'Ale', initial_budget: 500 },
  { id: 'team-10', name: 'Piangina Number One', manager_name: 'Viro', initial_budget: 500 },
];

function simulateImportHistoricalData(existingTeams, newSeasons, newTeams, newRoster) {
  const base10Teams = existingTeams.slice(0, 10);
  const cleanStr = (s) => String(s || '').toLowerCase().replace(/admin/gi, '').replace(/[^a-z0-9]/g, '').trim();

  const importedTeamIdToExistingId = new Map();
  const assignedExistingIds = new Set();

  // 1. Passata Manager
  for (const nt of newTeams) {
    const cleanNewManager = cleanStr(nt.manager_name);
    if (!cleanNewManager) continue;
    const match = base10Teams.find((et) => !assignedExistingIds.has(et.id) && cleanStr(et.manager_name) === cleanNewManager);
    if (match) {
      importedTeamIdToExistingId.set(nt.id, match.id);
      assignedExistingIds.add(match.id);
    }
  }

  // 2. Passata Nome Squadra
  for (const nt of newTeams) {
    if (importedTeamIdToExistingId.has(nt.id)) continue;
    const cleanNewName = cleanStr(nt.name);
    if (!cleanNewName) continue;
    const match = base10Teams.find((et) => !assignedExistingIds.has(et.id) && cleanStr(et.name) === cleanNewName);
    if (match) {
      importedTeamIdToExistingId.set(nt.id, match.id);
      assignedExistingIds.add(match.id);
    }
  }

  // 3. Passata Posizionale
  for (let i = 0; i < newTeams.length; i++) {
    const nt = newTeams[i];
    if (importedTeamIdToExistingId.has(nt.id)) continue;
    const unassigned = base10Teams.find((et) => !assignedExistingIds.has(et.id));
    if (unassigned) {
      importedTeamIdToExistingId.set(nt.id, unassigned.id);
      assignedExistingIds.add(unassigned.id);
    }
  }

  // Aggiornamento in-place
  const updated10Teams = base10Teams.map((existingTeam) => {
    const matchedNewTeam = newTeams.find((nt) => importedTeamIdToExistingId.get(nt.id) === existingTeam.id);
    if (!matchedNewTeam) return existingTeam;

    const isAdmin = existingTeam.manager_name.toLowerCase().includes('admin') || matchedNewTeam.manager_name.toLowerCase().includes('admin');
    const finalManagerName = isAdmin && !matchedNewTeam.manager_name.toLowerCase().includes('admin')
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

  // Mappa roster
  const mappedNewRoster = newRoster.map((r) => ({
    ...r,
    team_id: importedTeamIdToExistingId.get(r.team_id) || r.team_id,
  }));

  return { updated10Teams, mappedNewRoster, mapping: importedTeamIdToExistingId };
}

const { updated10Teams, mappedNewRoster, mapping } = simulateImportHistoricalData(
  INITIAL_TEAMS,
  parsed.seasons,
  parsed.teams,
  parsed.roster
);

console.log('--- VERIFICA MAPPING & AGGIORNAMENTO IN-PLACE ---');
console.log('Squadre risultanti (deve essere 10):', updated10Teams.length);
if (updated10Teams.length !== 10) {
  throw new Error(`Test fallito: Squadre risultanti = ${updated10Teams.length}, atteso 10`);
}

for (const t of updated10Teams) {
  console.log(`[${t.id}] ${t.name} (Manager: ${t.manager_name})`);
}

// Verifica che tutti i calciatori siano associati a team-1 .. team-10
const validIds = new Set(INITIAL_TEAMS.map((t) => t.id));
let unmappedCount = 0;
for (const p of mappedNewRoster) {
  if (!validIds.has(p.team_id)) {
    unmappedCount++;
    console.error(`Calciatore con team_id non valido: ${p.player_name} -> ${p.team_id}`);
  }
}

if (unmappedCount > 0) {
  throw new Error(`Test fallito: ${unmappedCount} calciatori con team_id non mappato`);
}

console.log(`Tutti i ${mappedNewRoster.length} calciatori sono perfettamente associati alle 10 squadre della lega!`);
console.log('TEST COMPLETATO CON SUCCESSO SENZA ERRORI!');
