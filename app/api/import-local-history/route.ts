import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseSmadonnanteWorkbook, parseStandardTableWorkbook, isSmadonnanteFormat } from '../../../lib/fantacalcio/history-importer';
import { INITIAL_SERIE_A_PLAYERS } from '../../../lib/fantacalcio/default-players';

export async function GET() {
  const possiblePaths = [
    '/Users/fabio.perfetti/Projects/Asta Smadonnante.xlsx',
    path.join(process.cwd(), 'Asta Smadonnante.xlsx'),
    path.join(process.cwd(), '..', 'Asta Smadonnante.xlsx'),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    return NextResponse.json(
      { success: false, error: 'File "Asta Smadonnante.xlsx" non trovato nella cartella del progetto.' },
      { status: 404 }
    );
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let result;
    if (isSmadonnanteFormat(workbook)) {
      result = parseSmadonnanteWorkbook(workbook, INITIAL_SERIE_A_PLAYERS);
    } else {
      result = parseStandardTableWorkbook(workbook, INITIAL_SERIE_A_PLAYERS);
    }

    return NextResponse.json({
      success: true,
      fileName: path.basename(filePath),
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Errore nella lettura del file Excel.' },
      { status: 500 }
    );
  }
}
