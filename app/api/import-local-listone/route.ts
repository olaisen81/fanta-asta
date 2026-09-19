import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parsePlayerListWorkbook } from '../../../lib/fantacalcio/excel-parser';

export async function GET() {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'Quotazioni_Fantacalcio_Stagione_2026_27.xlsx'),
    path.join(process.cwd(), 'Quotazioni_Fantacalcio_Stagione_2026_27.xlsx'),
    '/Users/fabio.perfetti/Projects/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx',
    path.join(process.cwd(), '..', 'Quotazioni_Fantacalcio_Stagione_2026_27.xlsx'),
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
      { success: false, error: 'File "Quotazioni_Fantacalcio_Stagione_2026_27.xlsx" non trovato nella cartella del progetto.' },
      { status: 404 }
    );
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const result = parsePlayerListWorkbook(workbook);

    return NextResponse.json({
      success: true,
      fileName: path.basename(filePath),
      totalParsed: result.totalParsed,
      players: result.players,
      errors: result.errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Errore nella lettura del file Quotazioni.' },
      { status: 500 }
    );
  }
}
