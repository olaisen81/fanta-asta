import * as XLSX from 'xlsx';
import { Season, Team, RosterPlayer, PlayerRole } from '../supabase/types';

export interface HistoryImportResult {
  seasons: Season[];
  teams: Team[];
  roster: RosterPlayer[];
  errors: string[];
  totalRowsParsed: number;
}

import { INITIAL_SERIE_A_PLAYERS } from './default-players';

export type ReferencePlayer = {
  name: string;
  team: string;
  role?: string;
};

export const SERIE_A_CLUBS_MAP: Record<string, string> = {
  'inter': 'Inter',
  'milan': 'Milan',
  'juventus': 'Juventus',
  'napoli': 'Napoli',
  'roma': 'Roma',
  'lazio': 'Lazio',
  'atalanta': 'Atalanta',
  'fiorentina': 'Fiorentina',
  'bologna': 'Bologna',
  'torino': 'Torino',
  'monza': 'Monza',
  'genoa': 'Genoa',
  'udinese': 'Udinese',
  'cagliari': 'Cagliari',
  'parma': 'Parma',
  'verona': 'Verona',
  'hellas verona': 'Verona',
  'como': 'Como',
  'empoli': 'Empoli',
  'lecce': 'Lecce',
  'venezia': 'Venezia',
  'salernitana': 'Salernitana',
  'sassuolo': 'Sassuolo',
  'frosinone': 'Frosinone',
  'spezia': 'Spezia',
  'sampdoria': 'Sampdoria',
  'cremonese': 'Cremonese',
  'benevento': 'Benevento',
  'crotone': 'Crotone',
  'brescia': 'Brescia',
  'spal': 'Spal',
  'pisa': 'Pisa',
  'palermo': 'Palermo',
};

export const SERIE_A_CLUBS = Object.values(SERIE_A_CLUBS_MAP);

export function normalizeMatchString(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’.\-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function isSerieAClub(name: string): boolean {
  if (!name) return false;
  const clean = normalizeMatchString(name).replace(/^portieri\s+/, '').trim();
  return Boolean(SERIE_A_CLUBS_MAP[clean]);
}

export function getCanonicalClubName(name: string): string {
  if (!name) return 'Serie A';
  const clean = normalizeMatchString(name).replace(/^portieri\s+/, '').trim();
  return SERIE_A_CLUBS_MAP[clean] || 'Serie A';
}

export function findSerieAClub(
  name: string,
  role?: PlayerRole,
  referencePlayers?: ReferencePlayer[]
): string {
  if (!name) return 'Serie A';
  const clean = normalizeMatchString(name);
  if (!clean) return 'Serie A';

  // 1. Controllo se è direttamente il nome di un club di Serie A o blocco portieri
  const cleanWithoutPortieri = clean.replace(/^portieri\s+/, '').trim();
  if (SERIE_A_CLUBS_MAP[cleanWithoutPortieri]) {
    return SERIE_A_CLUBS_MAP[cleanWithoutPortieri];
  }
  if (SERIE_A_CLUBS_MAP[clean]) {
    return SERIE_A_CLUBS_MAP[clean];
  }

  const listone = (referencePlayers && referencePlayers.length > 0)
    ? referencePlayers
    : (INITIAL_SERIE_A_PLAYERS as unknown as ReferencePlayer[]);

  const tokens = clean.split(' ').filter((t) => t.length > 0);
  const cleanCompact = clean.replace(/\s+/g, '');
  const significantTokens = tokens.filter(
    (t) => t.length >= 3 && !['del', 'dei', 'san', 'van', 'der', 'dos', 'da', 'di'].includes(t)
  );

  const roleMatches = role ? listone.filter((p) => p.role === role) : listone;
  const candidateLists = roleMatches.length > 0 ? [roleMatches, listone] : [listone];

  for (const candidates of candidateLists) {
    // 2. Corrispondenza esatta della stringa normalizzata
    for (const p of candidates) {
      if (normalizeMatchString(p.name) === clean) {
        return p.team;
      }
    }

    // 3. Corrispondenza compatta (senza spazi, es. delprato / del prato, ndicka / n dicka)
    for (const p of candidates) {
      const pCompact = normalizeMatchString(p.name).replace(/\s+/g, '');
      if (pCompact === cleanCompact || (cleanCompact.length >= 5 && pCompact.startsWith(cleanCompact))) {
        return p.team;
      }
    }

    // 4. Ordine invertito (es. "Lautaro Martinez" vs "Martinez Lautaro", "Paz Nico" vs "Nico Paz")
    if (tokens.length >= 2) {
      const reversed = [...tokens].reverse().join(' ');
      for (const p of candidates) {
        if (normalizeMatchString(p.name) === reversed) {
          return p.team;
        }
      }
    }

    // 5. Contenimento token (es. "Lautaro", "Vlahovic", "Dybala", "Tavares")
    for (const p of candidates) {
      const pClean = normalizeMatchString(p.name);
      const pTokens = pClean.split(' ');

      if (tokens.length === 1 && tokens[0].length >= 3) {
        if (pTokens.includes(tokens[0])) {
          return p.team;
        }
      } else if (significantTokens.length >= 2) {
        if (significantTokens.every((t) => pClean.includes(t))) {
          return p.team;
        }
      }
    }

    // 6. Matching multi-token parziale (es. "Nico Gonnzalez" vs "Gonzalez Nicolas")
    if (tokens.length >= 2) {
      for (const p of candidates) {
        const pClean = normalizeMatchString(p.name);
        const pTokens = pClean.split(' ');
        let matchesCount = 0;
        for (const t of tokens) {
          if (pTokens.some((pt) => pt === t || damerauLevenshtein(pt, t) <= (t.length >= 6 ? 2 : 1))) {
            matchesCount++;
          }
        }
        if (matchesCount >= 2 && matchesCount >= tokens.length - 1) {
          return p.team;
        }
      }
    }

    // 7. Distanza fuzzy Damerau-Levenshtein per refusi fonetici
    let bestTeam: string | null = null;
    let minDistance = 999;
    const tokensToTest = tokens.length === 1 ? tokens : significantTokens;
    for (const p of candidates) {
      const pClean = normalizeMatchString(p.name);
      const pTokens = pClean
        .split(' ')
        .filter((t) => t.length >= 3 && !['del', 'dei', 'san', 'van', 'der', 'dos', 'da', 'di'].includes(t));

      for (const epToken of tokensToTest) {
        if (epToken.length < 4) continue;
        for (const lpToken of pTokens) {
          if (lpToken.length < 4) continue;
          const dist = damerauLevenshtein(epToken, lpToken);
          const maxDist = Math.min(epToken.length, lpToken.length) >= 6 ? 2 : 1;
          if (dist <= maxDist && dist < minDistance) {
            minDistance = dist;
            bestTeam = p.team;
          }
        }
      }
    }

    if (bestTeam) {
      return bestTeam;
    }
  }

  return 'Serie A';
}

function normalizeRole(raw: any): PlayerRole {
  if (!raw) return 'C';
  const str = String(raw).trim().toUpperCase();
  if (str.startsWith('P') || str === 'POR' || str === 'PT') return 'P';
  if (str.startsWith('D') || str === 'DIF' || str === 'DF') return 'D';
  if (str.startsWith('C') || str === 'CEN' || str === 'CC') return 'C';
  if (str.startsWith('A') || str === 'ATT' || str === 'AT') return 'A';
  return 'C';
}

function normalizeSeasonName(raw: string): { id: string; name: string } {
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

  return {
    id: clean.toLowerCase(),
    name: clean,
  };
}

export function normalizeTeamDisplayName(rawName: string): string {
  const trimmed = String(rawName || '').trim();
  // Standardizza "A.C Circolo Vizioso" o "A.C. Circolo Vizioso"
  if (/^A\.?C\.?\s+Circolo\s+Vizioso$/i.test(trimmed)) {
    return 'A.C. Circolo Vizioso';
  }
  // Standardizza "Pol. Porca Puttena" o "Pol Porca Puttena"
  if (/^Pol\.?\s+Porca\s+Puttena$/i.test(trimmed)) {
    return 'Pol. Porca Puttena';
  }
  return trimmed;
}

export function generateTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.\s_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Controlla se il file Excel utilizza la struttura a colonne per squadra (come "Asta Smadonnante.xlsx")
 * con sezioni verticali PT, DF, CC, AT.
 */
export function isSmadonnanteFormat(workbook: XLSX.WorkBook): boolean {
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    if (rows.length > 5) {
      const col0Values = rows.slice(0, 15).map((r) => String(r[0] || '').trim().toUpperCase());
      if (
        col0Values.includes('PT') ||
        col0Values.includes('DF') ||
        col0Values.includes('CC') ||
        col0Values.includes('AT') ||
        String(rows[0]?.[0] || '').toUpperCase().includes('SMADONNANTE')
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Parser specializzato per fogli multi-colonna tipo "Asta Smadonnante.xlsx"
 * Gestisce stagioni ordinarie (es. "2020-2021") e di riparazione (es. "Riparazione 2020-2021")
 */
export function parseSmadonnanteWorkbook(
  workbook: XLSX.WorkBook,
  referencePlayers?: ReferencePlayer[]
): HistoryImportResult {
  const seasonsMap = new Map<string, Season>();
  const teamsMap = new Map<string, Team>();
  const rosterItems: RosterPlayer[] = [];
  const errors: string[] = [];
  let totalRows = 0;

  // Raggruppa fogli per ID stagione (es. '2020-2021' -> { initialSheet, repairSheet })
  const seasonGroups = new Map<
    string,
    { seasonId: string; seasonName: string; initialSheet: string | null; repairSheet: string | null }
  >();

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
      seasonGroups.get(seasonInfo.id)!.repairSheet = sheetName;
    } else {
      seasonGroups.get(seasonInfo.id)!.initialSheet = sheetName;
    }
  }

  // Helper per estrarre squadre da riga 1 e 2
  function extractTeams(rows: any[][]) {
    const r1 = rows[1] || [];
    const r2 = rows[2] || [];
    const teams: { colIndex: number; manager: string; teamName: string; budget: number; bonus: number }[] = [];

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
    return teams;
  }

  const sortedSeasonIds = Array.from(seasonGroups.keys()).sort((a, b) => b.localeCompare(a));
  if (sortedSeasonIds.length === 0) {
    return {
      seasons: [],
      teams: [],
      roster: [],
      errors: ['Nessuna stagione valida rilevata nel file Excel.'],
      totalRowsParsed: 0,
    };
  }

  const latestSeasonId = sortedSeasonIds[0];

  // Elabora TUTTE le stagioni presenti nel file
  for (const seasonId of sortedSeasonIds) {
    const group = seasonGroups.get(seasonId)!;
    const seasonRoster: RosterPlayer[] = [];
    const initialPlayersByName = new Map<string, RosterPlayer>();

    // 1. Processa il foglio dell'Asta Iniziale (Estiva)
    if (group.initialSheet && workbook.Sheets[group.initialSheet]) {
      const ws = workbook.Sheets[group.initialSheet];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
      totalRows += rows.length;
      const detectedTeams = extractTeams(rows);

      for (let i = 0; i < detectedTeams.length; i++) {
        const t = detectedTeams[i];
        const teamKey = `${seasonId}_${generateTeamSlug(t.teamName)}`;

        if (!teamsMap.has(teamKey)) {
          teamsMap.set(teamKey, {
            id: `team-${teamKey}`,
            league_id: '00000000-0000-0000-0000-000000000001',
            season_id: seasonId,
            name: t.teamName,
            manager_name: t.manager,
            initial_budget: t.budget || 500,
            bonus_credits: t.bonus || 0,
            order_index: i + 1,
            created_at: new Date().toISOString(),
          });
        }

        let currentRole: PlayerRole = 'P';
        for (let r = 3; r < Math.min(85, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;

          const firstCell = String(row[0] || '').trim().toUpperCase();
          if (firstCell === 'PT' || firstCell === 'POR') currentRole = 'P';
          else if (firstCell === 'DF' || firstCell === 'DIF') currentRole = 'D';
          else if (firstCell === 'CC' || firstCell === 'CEN') currentRole = 'C';
          else if (firstCell === 'AT' || firstCell === 'ATT') currentRole = 'A';

          const name = String(row[t.colIndex] || '').trim();
          if (
            !name ||
            ['pt', 'df', 'cc', 'at', 'crediti', 'spesa', 'totale', 'residuo'].includes(
              name.toLowerCase()
            )
          ) {
            continue;
          }

          const rawPrice = row[t.colIndex + 1];
          const price = parseInt(String(rawPrice), 10);
          const safePrice = isNaN(price) || price < 1 ? 1 : price;

          // Riconosci se è un blocco portieri di una squadra di Serie A o trova club tramite listone
          const isClub = isSerieAClub(name);
          const matchedClub = isClub
            ? getCanonicalClubName(name)
            : findSerieAClub(name, currentRole, referencePlayers);

          const item: RosterPlayer = {
            id: `roster-${seasonId}-${teamKey}-${name.toLowerCase().replace(/[.\s_]+/g, '_')}`,
            league_id: '00000000-0000-0000-0000-000000000001',
            season_id: seasonId,
            team_id: `team-${teamKey}`,
            player_name: isClub && currentRole === 'P' ? `Portieri ${matchedClub}` : name,
            role: currentRole,
            serie_a_team: matchedClub,
            price: safePrice,
            session: 'initial',
            is_released: false,
            refund_amount: 0,
            purchased_at: new Date(`${seasonId.split('-')[0]}-09-01`).toISOString(),
          };

          seasonRoster.push(item);
          initialPlayersByName.set(`${teamKey}_${name.toLowerCase()}`, item);
        }
      }
    }

    // 2. Processa il foglio dell'Asta di Riparazione (se presente)
    if (group.repairSheet && workbook.Sheets[group.repairSheet]) {
      const ws = workbook.Sheets[group.repairSheet];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
      totalRows += rows.length;
      const detectedTeams = extractTeams(rows);

      for (const t of detectedTeams) {
        const teamKey = `${seasonId}_${generateTeamSlug(t.teamName)}`;

        // Aggiorna bonus crediti gennaio per la squadra se indicato
        if (t.bonus > 0 && teamsMap.has(teamKey)) {
          teamsMap.get(teamKey)!.bonus_credits = t.bonus;
        }

        let currentRole: PlayerRole = 'P';
        for (let r = 3; r < Math.min(85, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;

          const firstCell = String(row[0] || '').trim().toUpperCase();
          if (firstCell === 'PT' || firstCell === 'POR') currentRole = 'P';
          else if (firstCell === 'DF' || firstCell === 'DIF') currentRole = 'D';
          else if (firstCell === 'CC' || firstCell === 'CEN') currentRole = 'C';
          else if (firstCell === 'AT' || firstCell === 'ATT') currentRole = 'A';

          const name = String(row[t.colIndex] || '').trim();
          if (
            !name ||
            ['pt', 'df', 'cc', 'at', 'crediti', 'spesa', 'totale', 'residuo'].includes(
              name.toLowerCase()
            )
          ) {
            continue;
          }

          const c1 = row[t.colIndex + 1];
          const c2 = row[t.colIndex + 2];
          const val1 = Number(c1);
          const val2 = Number(c2);

          const lookupKey = `${teamKey}_${name.toLowerCase()}`;
          const existing = initialPlayersByName.get(lookupKey);

          // Svincolato con rimborso in colonna 2 (valore negativo, es. -39, -4)
          if (!isNaN(val2) && val2 < 0) {
            const refund = Math.abs(val2);
            if (existing) {
              existing.is_released = true;
              existing.refund_amount = refund;
            } else {
              seasonRoster.push({
                id: `roster-${seasonId}-${teamKey}-${name.toLowerCase().replace(/\s+/g, '_')}`,
                league_id: '00000000-0000-0000-0000-000000000001',
                season_id: seasonId,
                team_id: `team-${teamKey}`,
                player_name: name,
                role: currentRole,
                serie_a_team: findSerieAClub(name, currentRole, referencePlayers),
                price: !isNaN(val1) && val1 > 0 ? val1 : refund * 2,
                session: 'initial',
                is_released: true,
                refund_amount: refund,
                purchased_at: new Date(`${seasonId.split('-')[0]}-09-01`).toISOString(),
              });
            }
          }
          // Svincolato con valore negativo direttamente in colonna 1 (es. -5, -80)
          else if (!isNaN(val1) && val1 < 0) {
            const refund = Math.abs(val1);
            if (existing) {
              existing.is_released = true;
              existing.refund_amount = refund;
            } else {
              seasonRoster.push({
                id: `roster-${seasonId}-${teamKey}-${name.toLowerCase().replace(/\s+/g, '_')}`,
                league_id: '00000000-0000-0000-0000-000000000001',
                season_id: seasonId,
                team_id: `team-${teamKey}`,
                player_name: name,
                role: currentRole,
                serie_a_team: findSerieAClub(name, currentRole, referencePlayers),
                price: refund * 2,
                session: 'initial',
                is_released: true,
                refund_amount: refund,
                purchased_at: new Date(`${seasonId.split('-')[0]}-09-01`).toISOString(),
              });
            }
          }
          // Nuovo acquisto riparazione con prezzo in colonna 2
          else if ((c1 === '' || val1 === 0) && !isNaN(val2) && val2 > 0) {
            seasonRoster.push({
              id: `roster-rep-${seasonId}-${teamKey}-${name.toLowerCase().replace(/\s+/g, '_')}`,
              league_id: '00000000-0000-0000-0000-000000000001',
              season_id: seasonId,
              team_id: `team-${teamKey}`,
              player_name: name,
              role: currentRole,
              serie_a_team: findSerieAClub(name, currentRole, referencePlayers),
              price: val2,
              session: 'repair',
              is_released: false,
              refund_amount: 0,
              purchased_at: new Date(`${Number(seasonId.split('-')[0]) + 1}-02-01`).toISOString(),
            });
          }
          // Calciatore presente nel foglio riparazione con prezzo positivo non presente all'asta estiva
          else if (!existing && !isNaN(val1) && val1 > 0) {
            seasonRoster.push({
              id: `roster-rep-${seasonId}-${teamKey}-${name.toLowerCase().replace(/\s+/g, '_')}`,
              league_id: '00000000-0000-0000-0000-000000000001',
              season_id: seasonId,
              team_id: `team-${teamKey}`,
              player_name: name,
              role: currentRole,
              serie_a_team: findSerieAClub(name, currentRole, referencePlayers),
              price: val1,
              session: 'repair',
              is_released: false,
              refund_amount: 0,
              purchased_at: new Date(`${Number(seasonId.split('-')[0]) + 1}-02-01`).toISOString(),
            });
          }
        }
      }
    }

    rosterItems.push(...seasonRoster);

    seasonsMap.set(seasonId, {
      id: seasonId,
      name: group.seasonName,
      is_current: seasonId === latestSeasonId,
      budget: 500,
      created_at: new Date().toISOString(),
    });
  }

  // Ordina cronologicamente decrescente
  const sortedSeasons = Array.from(seasonsMap.values()).sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return {
    seasons: sortedSeasons,
    teams: Array.from(teamsMap.values()),
    roster: rosterItems,
    errors,
    totalRowsParsed: totalRows,
  };
}

/**
 * Parser standard per file tabellari con colonne
 * (Stagione, Squadra, Calciatore, Ruolo, Prezzo, Sessione, Svincolato)
 */
export function parseStandardTableWorkbook(
  workbook: XLSX.WorkBook,
  referencePlayers?: ReferencePlayer[]
): HistoryImportResult {
  const seasonsMap = new Map<string, Season>();
  const teamsMap = new Map<string, Team>();
  const rosterItems: RosterPlayer[] = [];
  const errors: string[] = [];
  let totalRows = 0;

  // Prima passata: scansiona i fogli per determinare l'ultima stagione presente
  const allParsedRows: { row: Record<string, any>; defaultSeasonInfo: { id: string; name: string } }[] = [];
  const detectedSeasonIds = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      raw: false,
      defval: '',
    });

    if (rows.length === 0) continue;
    const defaultSeasonInfo = normalizeSeasonName(sheetName);

    for (const row of rows) {
      const seasonRaw =
        row['Stagione'] ||
        row['Anno'] ||
        row['Season'] ||
        row['Year'] ||
        row['stagione'] ||
        defaultSeasonInfo.name;
      const seasonInfo = normalizeSeasonName(String(seasonRaw));
      detectedSeasonIds.add(seasonInfo.id);
      allParsedRows.push({ row, defaultSeasonInfo });
    }
  }

  const sortedSeasonIds = Array.from(detectedSeasonIds).sort((a, b) => b.localeCompare(a));
  if (sortedSeasonIds.length === 0) {
    return {
      seasons: [],
      teams: [],
      roster: [],
      errors: ['Nessun dato valido rilevato nel foglio Excel.'],
      totalRowsParsed: 0,
    };
  }

  // Seleziona SEMPRE e SOLO l'ultima stagione
  const latestSeasonId = sortedSeasonIds[0];

  for (let i = 0; i < allParsedRows.length; i++) {
    const { row, defaultSeasonInfo } = allParsedRows[i];
    totalRows++;

    const seasonRaw =
      row['Stagione'] ||
      row['Anno'] ||
      row['Season'] ||
      row['Year'] ||
      row['stagione'] ||
      defaultSeasonInfo.name;

    const seasonInfo = normalizeSeasonName(String(seasonRaw));

    if (!seasonsMap.has(seasonInfo.id)) {
      seasonsMap.set(seasonInfo.id, {
        id: seasonInfo.id,
        name: seasonInfo.name,
        is_current: seasonInfo.id === latestSeasonId,
        budget: 500,
        created_at: new Date().toISOString(),
      });
    }

      const teamName =
        row['Squadra'] ||
        row['Team'] ||
        row['squadra'] ||
        row['Nome Squadra'] ||
        row['Società'] ||
        'Squadra';

      const managerName =
        row['Fantallenatore'] ||
        row['Manager'] ||
        row['Proprietario'] ||
        row['Allenatore'] ||
        teamName;

      const normTeamName = normalizeTeamDisplayName(String(teamName).trim());
      const teamKey = `${seasonInfo.id}_${generateTeamSlug(normTeamName)}`;
      if (!teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, {
          id: `team-${teamKey}`,
          league_id: '00000000-0000-0000-0000-000000000001',
          season_id: seasonInfo.id,
          name: normTeamName,
          manager_name: String(managerName).trim(),
          initial_budget: 500,
          order_index: teamsMap.size + 1,
          created_at: new Date().toISOString(),
        });
      }

      const playerName =
        row['Calciatore'] ||
        row['Nome'] ||
        row['Giocatore'] ||
        row['Player'] ||
        row['calciatore'] ||
        '';

      if (!String(playerName).trim() || String(playerName).toLowerCase() === 'calciatore') {
        continue;
      }

      const roleRaw = row['Ruolo'] || row['R'] || row['Role'] || row['r'] || 'C';
      const role = normalizeRole(roleRaw);

      const rawClub =
        row['Club'] || row['Squadra Serie A'] || row['Serie A'] || row['club'];
      const serieATeam = (rawClub && String(rawClub).trim() !== 'Serie A')
        ? String(rawClub).trim()
        : findSerieAClub(String(playerName).trim(), role, referencePlayers);

      const priceRaw =
        row['Prezzo'] || row['Costo'] || row['FM'] || row['Spesa'] || row['Prezzo FM'] || 1;
      const price = parseInt(String(priceRaw), 10);
      const safePrice = isNaN(price) || price < 1 ? 1 : price;

      const sessionRaw = String(
        row['Sessione'] || row['Tipo'] || row['Mercato'] || row['Session'] || 'initial'
      ).toLowerCase();

      const isRepair =
        sessionRaw.includes('rip') ||
        sessionRaw.includes('gen') ||
        sessionRaw.includes('inv') ||
        sessionRaw.includes('repair');

      const isReleased =
        String(row['Svincolato'] || '').toLowerCase().includes('s') ||
        String(row['Stato'] || '').toLowerCase().includes('svinc');

      const refundRaw = parseInt(String(row['Rimborso'] || '0'), 10);
      const refundAmount = isNaN(refundRaw) ? 0 : refundRaw;

      rosterItems.push({
        id: `roster-hist-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        league_id: '00000000-0000-0000-0000-000000000001',
        season_id: seasonInfo.id,
        team_id: `team-${teamKey}`,
        player_name: String(playerName).trim(),
        role,
        serie_a_team: String(serieATeam).trim(),
        price: safePrice,
        session: isRepair ? 'repair' : 'initial',
        is_released: isReleased,
        refund_amount: refundAmount,
        purchased_at: new Date().toISOString(),
      });
    }

  const sortedSeasons = Array.from(seasonsMap.values()).sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return {
    seasons: sortedSeasons,
    teams: Array.from(teamsMap.values()),
    roster: rosterItems,
    errors,
    totalRowsParsed: totalRows,
  };
}

/**
 * Funzione principale di parsing: rileva automaticamente il formato (Smadonnante vs Tabellare standard)
 */
export async function parseHistoricalExcelFile(
  file: File,
  referencePlayers?: ReferencePlayer[]
): Promise<HistoryImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  if (isSmadonnanteFormat(workbook)) {
    return parseSmadonnanteWorkbook(workbook, referencePlayers);
  }

  return parseStandardTableWorkbook(workbook, referencePlayers);
}

/**
 * Genera e scarica un file Excel di esempio per lo storico
 */
export function generateHistorySampleExcel() {
  const wb = XLSX.utils.book_new();

  const sampleSeasons = [
    {
      name: '2025-2026',
      rows: [
        { Stagione: '2025/2026', Squadra: 'Birrareal', Fantallenatore: 'Fabio', Ruolo: 'A', Calciatore: 'Lautaro Martinez', Club: 'Inter', Prezzo: 185, Sessione: 'Estiva' },
        { Stagione: '2025/2026', Squadra: 'Birrareal', Fantallenatore: 'Fabio', Ruolo: 'C', Calciatore: 'Barella Nicolo', Club: 'Inter', Prezzo: 34, Sessione: 'Estiva' },
        { Stagione: '2025/2026', Squadra: 'Atletico Bulgao', Fantallenatore: 'Bulga', Ruolo: 'A', Calciatore: 'Vlahovic Dusan', Club: 'Juventus', Prezzo: 165, Sessione: 'Estiva' },
        { Stagione: '2025/2026', Squadra: 'Atletico Bulgao', Fantallenatore: 'Bulga', Ruolo: 'C', Calciatore: 'Pulisic Christian', Club: 'Milan', Prezzo: 45, Sessione: 'Estiva' },
        { Stagione: '2025/2026', Squadra: 'Birrareal', Fantallenatore: 'Fabio', Ruolo: 'A', Calciatore: 'Castro Santiago', Club: 'Bologna', Prezzo: 25, Sessione: 'Riparazione' },
      ],
    },
    {
      name: '2024-2025',
      rows: [
        { Stagione: '2024/2025', Squadra: 'Lo Spiazel One', Fantallenatore: 'Fabio', Ruolo: 'A', Calciatore: 'Osimhen Victor', Club: 'Napoli', Prezzo: 195, Sessione: 'Estiva' },
        { Stagione: '2024/2025', Squadra: 'Babalu', Fantallenatore: 'Cocco', Ruolo: 'A', Calciatore: 'Dybala Paulo', Club: 'Roma', Prezzo: 90, Sessione: 'Estiva' },
        { Stagione: '2024/2025', Squadra: 'Babalu', Fantallenatore: 'Cocco', Ruolo: 'C', Calciatore: 'Calhanoglu Hakan', Club: 'Inter', Prezzo: 44, Sessione: 'Estiva' },
      ],
    },
  ];

  for (const s of sampleSeasons) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }

  XLSX.writeFile(wb, 'Modello_Storico_Rose_Fantacalcio.xlsx');
}
