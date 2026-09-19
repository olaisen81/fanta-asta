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

// We can test the logic directly:
console.log('Fogli nel file:', workbook.SheetNames);

function normalizeSeasonName(raw) {
  const clean = raw.trim().replace(/\s+/g, '').replace(/_/g, '-');
  const matchFull = clean.match(/(20\d{2})[-/](20\d{2})/);
  if (matchFull) {
    return {
      id: `${matchFull[1]}-${matchFull[2]}`,
      name: `${matchFull[1]}/${matchFull[2]}`,
    };
  }
  const matchShort = clean.match(/(20\d{2})[-/](\d{2})/);
  if (matchShort) {
    const startYear = parseInt(matchShort[1], 10);
    const endYear = 2000 + parseInt(matchShort[2], 10);
    return {
      id: `${startYear}-${endYear}`,
      name: `${startYear}/${endYear}`,
    };
  }
  const matchSingle = clean.match(/(20\d{2})/);
  if (matchSingle) {
    const year = parseInt(matchSingle[1], 10);
    return {
      id: `${year}-${year + 1}`,
      name: `${year}/${year + 1}`,
    };
  }
  return { id: clean.toLowerCase(), name: clean };
}

function normalizeTeamDisplayName(rawName) {
  const trimmed = String(rawName || '').trim();
  if (/^A\.?C\.?\s+Circolo\s+Vizioso$/i.test(trimmed)) {
    return 'A.C. Circolo Vizioso';
  }
  if (/^Pol\.?\s+Porca\s+Puttena$/i.test(trimmed)) {
    return 'Pol. Porca Puttena';
  }
  return trimmed;
}

const seasonGroups = new Map();
for (const sheetName of workbook.SheetNames) {
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

const sortedSeasonIds = Array.from(seasonGroups.keys()).sort((a, b) => b.localeCompare(a));
console.log('Stagioni rilevate (ordinate decrescente):', sortedSeasonIds);
console.log('Ultima stagione selezionata:', sortedSeasonIds[0]);

if (sortedSeasonIds[0] !== '2026-2027') {
  throw new Error(`Atteso 2026-2027 ma trovato ${sortedSeasonIds[0]}`);
}

const latestGroup = seasonGroups.get(sortedSeasonIds[0]);
const ws = workbook.Sheets[latestGroup.initialSheet];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const r1 = rows[1] || [];
const r2 = rows[2] || [];
const teams = [];
for (let c = 0; c < r1.length; c++) {
  const val = String(r1[c] || '').trim();
  if (
    val &&
    isNaN(Number(val)) &&
    val.toLowerCase() !== 'crediti' &&
    val.toLowerCase() !== 'spesa' &&
    val.toLowerCase() !== 'pt' &&
    val.toLowerCase() !== 'df'
  ) {
    const budget = Number(r1[c + 1]) || 500;
    const bonus = Number(r1[c + 2]) || 0;
    const rawTeamName = String(r2[c] || '').trim() || val;
    const teamName = normalizeTeamDisplayName(rawTeamName);
    teams.push({ colIndex: c, manager: val, teamName, budget, bonus });
  }
}

console.log('Squadre estratte per ultima stagione:', teams);
if (teams.length !== 10) {
  throw new Error(`Attese 10 squadre, trovate ${teams.length}`);
}

console.log('TUTTI I TEST SCRIPT PASSATI CON SUCCESSO!');
