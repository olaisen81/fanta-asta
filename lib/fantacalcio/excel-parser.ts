import * as XLSX from 'xlsx';
import { Player, PlayerRole } from '../supabase/types';

export interface ParseResult {
  players: Omit<Player, 'id' | 'created_at'>[];
  errors: string[];
  totalParsed: number;
}

/**
 * Pulisce e normalizza il ruolo in 'P' | 'D' | 'C' | 'A'
 */
function normalizeRole(rawRole: any): PlayerRole | null {
  if (!rawRole) return null;
  const str = String(rawRole).trim().toUpperCase();
  if (str.startsWith('P') || str === 'POR') return 'P';
  if (str.startsWith('D') || str === 'DIF') return 'D';
  if (str.startsWith('C') || str === 'CEN') return 'C';
  if (str.startsWith('A') || str === 'ATT') return 'A';
  return null;
}

/**
 * Legge e converte un workbook XLSX (formato Quotazioni Fantacalcio o simile)
 */
export function parsePlayerListWorkbook(workbook: XLSX.WorkBook): ParseResult {
  // Cerca foglio "Tutti" (standard Fantacalcio.it) oppure usa il primo foglio
  const targetSheetName =
    workbook.SheetNames.find((s) => s.toLowerCase() === 'tutti') || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  // Leggi come matrice 2D per rilevare la riga di intestazione corretta (es. se la prima riga è un banner)
  const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const rowStr = matrix[r].map((c) => String(c).toLowerCase().trim());
    if (rowStr.includes('nome') || rowStr.includes('calciatore')) {
      headerRowIndex = r;
      break;
    }
  }

  // Converte il foglio in array di oggetti partendo dalla riga di intestazione trovata
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    raw: false,
    defval: '',
    range: headerRowIndex,
  });

  const players: Omit<Player, 'id' | 'created_at'>[] = [];
  const errors: string[] = [];

  for (let index = 0; index < rawRows.length; index++) {
    const row = rawRows[index];

    // Cerca le colonne con varie denominazioni usate nei file di Fantacalcio
    let roleRaw = row['R'] || row['Ruolo'] || row['Role'] || row['r'] || '';
    let name = row['Nome'] || row['Calciatore'] || row['Player'] || row['nome'] || '';
    let team = row['Squadra'] || row['Club'] || row['Team'] || row['squadra'] || 'Serie A';
    let priceRaw =
      row['Qt.A'] ||
      row['Qt. A'] ||
      row['Qt. I'] ||
      row['Quotazione'] ||
      row['FVM'] ||
      row['Quotazione Attuale'] ||
      row['Prezzo'] ||
      1;

    name = String(name).trim();
    team = String(team).trim();

    // Salta righe vuote o header ripetuti o placeholder
    if (!name || name.toLowerCase() === 'nome' || name.toLowerCase() === 'calciatore' || name.toLowerCase() === 'id') {
      continue;
    }

    let role = normalizeRole(roleRaw);
    if (!role) {
      // Prova con RM (Mantra) se presente
      const rmRaw = row['RM'] || row['Mantra'];
      role = normalizeRole(rmRaw);
      if (!role) {
        errors.push(`Riga ${index + 2}: Ruolo non riconosciuto (${roleRaw || rmRaw}) per "${name}"`);
        continue;
      }
    }

    const price = parseInt(String(priceRaw), 10);
    const initialPrice = isNaN(price) || price < 1 ? 1 : price;

    players.push({
      name,
      team,
      role,
      initial_price: initialPrice,
      is_custom: false,
    });
  }

  return {
    players,
    errors,
    totalParsed: players.length,
  };
}

/**
 * Legge e converte un file Excel o CSV (Listone Fantacalcio.it o simile)
 */
export async function parsePlayerListFile(file: File): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  return parsePlayerListWorkbook(workbook);
}
