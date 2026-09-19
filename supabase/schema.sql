-- ==============================================================================
-- SCHEMA SUPABASE: FANTA-ASTA LIVE (LEGA A 10 GIOCATORI)
-- ==============================================================================

-- 1. TABELLA LEGHE (LEAGUES)
CREATE TABLE IF NOT EXISTS public.leagues (
    id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    name TEXT NOT NULL DEFAULT 'Lega Fantacalcio 2026/2027',
    total_budget INTEGER NOT NULL DEFAULT 500,
    slots_p INTEGER NOT NULL DEFAULT 3,
    slots_d INTEGER NOT NULL DEFAULT 8,
    slots_c INTEGER NOT NULL DEFAULT 8,
    slots_a INTEGER NOT NULL DEFAULT 6,
    admin_email TEXT,
    admin_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELLA STAGIONI (SEASONS)
CREATE TABLE IF NOT EXISTS public.seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    budget INTEGER NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELLA SQUADRE (10 TEAMS)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    season_id TEXT,
    name TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    manager_email TEXT,
    user_id UUID,
    initial_budget INTEGER NOT NULL DEFAULT 500,
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELLA CALCIATORI SERIE A (PLAYERS LISTONE)
CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    team TEXT NOT NULL, -- es. "Inter", "Milan", "Juventus"
    role TEXT NOT NULL CHECK (role IN ('P', 'D', 'C', 'A')),
    initial_price INTEGER NOT NULL DEFAULT 1,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indici per ricerca rapida calciatori durante l'asta
CREATE INDEX IF NOT EXISTS idx_players_name_trgm ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_role ON public.players(role);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);

-- 5. TABELLA ROSE / ASSEGNAZIONI (ROSTER_PLAYERS)
CREATE TABLE IF NOT EXISTS public.roster_players (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    season_id TEXT,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id TEXT,
    player_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('P', 'D', 'C', 'A')),
    serie_a_team TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 1),
    session TEXT NOT NULL DEFAULT 'initial',
    is_released BOOLEAN NOT NULL DEFAULT false,
    refund_amount INTEGER NOT NULL DEFAULT 0,
    released_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roster_team_id ON public.roster_players(team_id);
CREATE INDEX IF NOT EXISTS idx_roster_league_id ON public.roster_players(league_id);
CREATE INDEX IF NOT EXISTS idx_roster_season_id ON public.roster_players(season_id);

-- 6. TABELLA STATO ASTA IN DIRETTA (AUCTION_STATE)
CREATE TABLE IF NOT EXISTS public.auction_state (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL UNIQUE REFERENCES public.leagues(id) ON DELETE CASCADE,
    current_player_id TEXT,
    current_player_name TEXT,
    "current_role" TEXT CHECK ("current_role" IN ('P', 'D', 'C', 'A')),
    current_serie_a_team TEXT,
    current_bid INTEGER DEFAULT 1,
    leading_team_id TEXT,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'bidding', 'sold')),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELLA INVITI EMAIL PER CHI NON USA GOOGLE (INVITATIONS)
CREATE TABLE IF NOT EXISTS public.invitations (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- REALTIME REPLICATION (WebSockets live updates)
-- ==============================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.roster_players;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.seasons;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Politiche di lettura
DROP POLICY IF EXISTS "Lettura leghe" ON public.leagues;
CREATE POLICY "Lettura leghe" ON public.leagues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura stagioni" ON public.seasons;
CREATE POLICY "Lettura stagioni" ON public.seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura squadre" ON public.teams;
CREATE POLICY "Lettura squadre" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura players" ON public.players;
CREATE POLICY "Lettura players" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura rose" ON public.roster_players;
CREATE POLICY "Lettura rose" ON public.roster_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura stato asta" ON public.auction_state;
CREATE POLICY "Lettura stato asta" ON public.auction_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lettura inviti" ON public.invitations;
CREATE POLICY "Lettura inviti" ON public.invitations FOR SELECT USING (true);

-- Politiche di gestione completa
DROP POLICY IF EXISTS "Gestione leghe" ON public.leagues;
CREATE POLICY "Gestione leghe" ON public.leagues FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione stagioni" ON public.seasons;
CREATE POLICY "Gestione stagioni" ON public.seasons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione squadre" ON public.teams;
CREATE POLICY "Gestione squadre" ON public.teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione players" ON public.players;
CREATE POLICY "Gestione players" ON public.players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione rose" ON public.roster_players;
CREATE POLICY "Gestione rose" ON public.roster_players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione stato asta" ON public.auction_state;
CREATE POLICY "Gestione stato asta" ON public.auction_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestione inviti" ON public.invitations;
CREATE POLICY "Gestione inviti" ON public.invitations FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED INIZIALE: LEGA, STAGIONE E 10 SQUADRE STANDARD
-- ==============================================================================
DO $$
DECLARE
    v_league_id TEXT := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Crea una lega predefinita se non esiste
    IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = v_league_id) THEN
        INSERT INTO public.leagues (id, name, total_budget, slots_p, slots_d, slots_c, slots_a)
        VALUES (v_league_id, 'Lega Fantacalcio 2026/2027', 500, 6, 10, 10, 7);
    END IF;

    -- Crea stagione corrente
    IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = '2026-2027') THEN
        INSERT INTO public.seasons (id, name, is_current, budget)
        VALUES ('2026-2027', '2026/2027', true, 500);
    END IF;

    -- Crea le 10 squadre predefinite se non esistono
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE league_id = v_league_id) THEN
        INSERT INTO public.teams (id, league_id, season_id, name, manager_name, initial_budget, bonus_credits, order_index) VALUES
            ('team-1', v_league_id, '2026-2027', 'Birrareal', 'Fabio (Admin)', 500, 0, 1),
            ('team-2', v_league_id, '2026-2027', 'Herta Vernello', 'Bulga', 500, 0, 2),
            ('team-3', v_league_id, '2026-2027', 'Via Canale facci sognare', 'Cocco', 500, 0, 3),
            ('team-4', v_league_id, '2026-2027', 'Vamosss ultimi pezzi', 'Marco', 500, 0, 4),
            ('team-5', v_league_id, '2026-2027', 'AC Panzerottina', 'Loppo', 500, 0, 5),
            ('team-6', v_league_id, '2026-2027', 'Op Op Op Via', 'Teo', 500, 0, 6),
            ('team-7', v_league_id, '2026-2027', 'Atletico Maria', 'Beppe', 500, 0, 7),
            ('team-8', v_league_id, '2026-2027', 'Quartieri Spagnoli', 'Tonio', 500, 0, 8),
            ('team-9', v_league_id, '2026-2027', 'Scacco Matto', 'Ale', 500, 0, 9),
            ('team-10', v_league_id, '2026-2027', 'Piangina Number One', 'Viro', 500, 0, 10);
    END IF;

    -- Inizializza stato asta
    IF NOT EXISTS (SELECT 1 FROM public.auction_state WHERE league_id = v_league_id) THEN
        INSERT INTO public.auction_state (id, league_id, status)
        VALUES ('auction-state-1', v_league_id, 'idle');
    END IF;
END $$;
