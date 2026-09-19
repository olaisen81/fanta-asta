import { NextResponse } from 'next/server';
import { INITIAL_SERIE_A_PLAYERS, SERIE_A_SEASON } from '../../../lib/fantacalcio/default-players';
import { PlayerRole } from '../../../lib/supabase/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.toLowerCase() || '';
  const role = searchParams.get('role')?.toUpperCase() as PlayerRole | undefined;
  const team = searchParams.get('team')?.toLowerCase() || '';
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  let results = INITIAL_SERIE_A_PLAYERS;

  if (role && ['P', 'D', 'C', 'A'].includes(role)) {
    results = results.filter((p) => p.role === role);
  }

  if (team) {
    results = results.filter((p) => p.team.toLowerCase().includes(team));
  }

  if (search) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.team.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    season: SERIE_A_SEASON,
    total: results.length,
    players: results.slice(0, limit),
  });
}
