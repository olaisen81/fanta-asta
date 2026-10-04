// Test Suite Standalone per Multi-Fantallenatori (eseguibile con node standard)

function getTeamManagers(team) {
  if (!team) return [];

  if (Array.isArray(team.managers) && team.managers.length > 0) {
    const valid = team.managers
      .map((m) => ({ name: (m.name || '').trim(), email: (m.email || '').trim() || null }))
      .filter((m) => m.name.length > 0);
    if (valid.length > 0) return valid;
  }

  const rawName = (team.manager_name || '').trim();
  const rawEmail = (team.manager_email || '').trim();

  if (!rawName) {
    if (rawEmail) return [{ name: rawEmail.split('@')[0], email: rawEmail }];
    return [];
  }

  const nameParts = rawName
    .split(/[/&+]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const emailParts = rawEmail
    ? rawEmail.split(/[,;/+]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  if (nameParts.length > 1) {
    return nameParts.map((name, idx) => ({
      name,
      email: emailParts[idx] || (idx === 0 && emailParts.length === 1 ? emailParts[0] : null),
    }));
  }

  return [
    {
      name: rawName,
      email: rawEmail || null,
    },
  ];
}

function formatManagerNames(teamOrManagers, separator = ' & ') {
  if (!teamOrManagers) return '';
  if (Array.isArray(teamOrManagers)) {
    return teamOrManagers
      .map((m) => m.name?.trim())
      .filter(Boolean)
      .join(separator);
  }
  const managers = getTeamManagers(teamOrManagers);
  if (managers.length > 0) {
    return managers.map((m) => m.name).filter(Boolean).join(separator);
  }
  return (teamOrManagers.manager_name || '').trim();
}

function formatManagerEmails(teamOrManagers, separator = ', ') {
  if (!teamOrManagers) return '';
  const managers = Array.isArray(teamOrManagers) ? teamOrManagers : getTeamManagers(teamOrManagers);
  const emails = managers.map((m) => m.email?.trim()).filter(Boolean);
  if (emails.length > 0) return emails.join(separator);
  if (!Array.isArray(teamOrManagers) && teamOrManagers.manager_email) {
    return teamOrManagers.manager_email.trim();
  }
  return '';
}

function teamMatchesEmail(team, email) {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (team.manager_email && team.manager_email.trim().toLowerCase() === clean) return true;
  if (team.manager_email && team.manager_email.toLowerCase().includes(clean)) {
    const parts = team.manager_email.toLowerCase().split(/[,;/+\s]+/).map((s) => s.trim());
    if (parts.includes(clean)) return true;
  }
  const managers = getTeamManagers(team);
  return managers.some((m) => m.email && m.email.trim().toLowerCase() === clean);
}

function getManagerForEmail(team, email) {
  if (!email) return undefined;
  const clean = email.trim().toLowerCase();
  const managers = getTeamManagers(team);
  return managers.find((m) => m.email && m.email.trim().toLowerCase() === clean);
}

function resolveUserSession(userEmail, teams, league, metadata) {
  if (!userEmail) {
    return {
      email: '',
      isAdmin: false,
      teamId: null,
      managerName: 'Ospite',
    };
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const matchedTeam = teams.find((t) => teamMatchesEmail(t, cleanEmail));
  const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
  const leagueAdmin = (league?.admin_email || '').trim().toLowerCase();
  const hasDbAdminFlag = Boolean(matchedTeam?.is_admin);

  const isAdmin = Boolean(
    hasDbAdminFlag ||
    cleanEmail === 'fabio.perfetti81@gmail.com' ||
    (adminEnv && cleanEmail === adminEnv) ||
    (leagueAdmin && cleanEmail === leagueAdmin) ||
    metadata?.role === 'admin' ||
    metadata?.is_admin === true ||
    (matchedTeam && formatManagerNames(matchedTeam).toLowerCase().includes('admin')) ||
    cleanEmail.startsWith('admin')
  );

  let teamId = null;
  let managerName = '';

  if (matchedTeam) {
    teamId = matchedTeam.id;
    const matchedManager = getManagerForEmail(matchedTeam, cleanEmail);
    managerName = matchedManager?.name || formatManagerNames(matchedTeam) || matchedTeam.manager_name;
  } else if (isAdmin) {
    const adminTeam = teams.find((t) => t.is_admin || formatManagerNames(t).toLowerCase().includes('admin')) || teams[0];
    teamId = adminTeam?.id || null;
    managerName = metadata?.full_name || metadata?.name || (adminTeam ? formatManagerNames(adminTeam) : 'Banditore (Admin)');
  } else {
    return {
      email: '',
      isAdmin: false,
      teamId: null,
      managerName: 'Non Autorizzato',
      isUnauthorized: true,
      unauthorizedEmail: userEmail,
    };
  }

  return {
    email: userEmail,
    isAdmin,
    teamId,
    managerName,
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ TEST FALLITO: ${msg}`);
    process.exit(1);
  }
}

console.log('--- AVVIO TEST FUNZIONALITÀ MULTI-FANTALLENATORI ---');

// 1. Test singolo allenatore (retrocompatibilità)
const teamSingle = {
  id: 'team-1',
  name: 'Birrareal',
  manager_name: 'Fabio',
  manager_email: 'fabio.perfetti81@gmail.com',
};
const mgrsSingle = getTeamManagers(teamSingle);
assert(mgrsSingle.length === 1, 'Singolo allenatore estratto');
assert(mgrsSingle[0].name === 'Fabio', 'Nome corretto');
assert(mgrsSingle[0].email === 'fabio.perfetti81@gmail.com', 'Email corretta');
console.log('✓ Test 1 OK: Singolo allenatore retrocompatibile gestito correttamente');

// 2. Test getTeamManagers con separatori ("/", "&", "+")
const teamCoManaged = {
  id: 'team-2',
  name: 'Herta Vernello',
  manager_name: 'Bulga / Mario',
  manager_email: 'bulga@gmail.com, mario@gmail.com',
};
const mgrsCoManaged = getTeamManagers(teamCoManaged);
assert(mgrsCoManaged.length === 2, `Previsti 2 allenatori, ottenuti ${mgrsCoManaged.length}`);
assert(mgrsCoManaged[0].name === 'Bulga' && mgrsCoManaged[0].email === 'bulga@gmail.com', 'Allenatore 1 corretto');
assert(mgrsCoManaged[1].name === 'Mario' && mgrsCoManaged[1].email === 'mario@gmail.com', 'Allenatore 2 corretto');
console.log('✓ Test 2 OK: Parsing automatico di stringhe con più allenatori (/ e ,)');

// 3. Test formato strutturato team.managers
const teamStructured = {
  id: 'team-3',
  name: 'Via Canale',
  manager_name: 'Cocco / Gianni / Teo',
  manager_email: 'cocco@gmail.com, gianni@gmail.com',
  managers: [
    { name: 'Cocco', email: 'cocco@gmail.com' },
    { name: 'Gianni', email: 'gianni@gmail.com' },
    { name: 'Teo', email: null },
  ],
};
const mgrsStructured = getTeamManagers(teamStructured);
assert(mgrsStructured.length === 3, '3 allenatori strutturati');
assert(mgrsStructured[2].name === 'Teo' && !mgrsStructured[2].email, 'Allenatore senza email');
console.log('✓ Test 3 OK: Supporto lista strutturata managers con 3 o più allenatori');

// 4. Test formatManagerNames e formatManagerEmails
const formattedNames = formatManagerNames(teamStructured);
assert(formattedNames === 'Cocco & Gianni & Teo', `Nomi formattati: ${formattedNames}`);
const formattedEmails = formatManagerEmails(teamStructured);
assert(formattedEmails === 'cocco@gmail.com, gianni@gmail.com', `Email formattate: ${formattedEmails}`);
console.log('✓ Test 4 OK: Formattazione display nomi ed email');

// 5. Test teamMatchesEmail
assert(teamMatchesEmail(teamStructured, 'cocco@gmail.com') === true, 'Match email 1');
assert(teamMatchesEmail(teamStructured, 'GIANNI@GMAIL.COM') === true, 'Match email 2 case-insensitive');
assert(teamMatchesEmail(teamStructured, 'sconosciuto@gmail.com') === false, 'Nessun match per estraneo');
console.log('✓ Test 5 OK: Matching email per qualsiasi dei co-allenatori');

// 6. Test getManagerForEmail
const foundMgr = getManagerForEmail(teamStructured, 'gianni@gmail.com');
assert(foundMgr && foundMgr.name === 'Gianni', 'Manager specifico trovato');
console.log('✓ Test 6 OK: Identificazione del singolo fanta-allenatore tramite email');

// 7. Test resolveUserSession per co-allenatore
const mockLeague = { id: '00000000-0000-0000-0000-000000000001', name: 'Lega Test', total_budget: 500, slots_p: 3, slots_d: 8, slots_c: 8, slots_a: 6 };
const sessionGianni = resolveUserSession('gianni@gmail.com', [teamStructured], mockLeague);
assert(sessionGianni.teamId === 'team-3', 'Team ID corretto per co-allenatore');
assert(sessionGianni.managerName === 'Gianni', `Nome manager loggato personalizzato: ${sessionGianni.managerName}`);
assert(sessionGianni.isAdmin === false, 'Non-admin corretto');
console.log('✓ Test 7 OK: Risoluzione sessione utente per co-allenatore personalizzata con nome e squadra');

console.log('--- TUTTI I 7 TEST MULTI-FANTALLENATORI SUPERATI CON SUCCESSO! ---');
