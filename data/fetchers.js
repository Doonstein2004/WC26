'use strict';

const fetch = require('node-fetch');
const { getGroup } = require('./worldcup');

// ESPN API pública (sem chave, sem cadastro)
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

// ESPN retorna nomes em inglês → traduzir para Português do Brasil
const TEAM_NAMES = {
  // WC 2026 — times qualificados
  'United States':                   'EUA',
  'United States of America':        'EUA',
  'USA':                             'EUA',
  'Mexico':                          'México',
  'South Africa':                    'África do Sul',
  'South Korea':                     'Coreia do Sul',
  'Korea Republic':                  'Coreia do Sul',
  'Czech Republic':                  'República Checa',
  'Czechia':                         'República Checa',
  'Canada':                          'Canadá',
  'Bosnia and Herzegovina':          'Bósnia-Herz.',
  'Bosnia-Herzegovina':              'Bósnia-Herz.',
  'Bosnia Herzegovina':              'Bósnia-Herz.',
  'Qatar':                           'Catar',
  'Switzerland':                     'Suíça',
  'Brazil':                          'Brasil',
  'Morocco':                         'Marrocos',
  'Haiti':                           'Haiti',
  'Scotland':                        'Escócia',
  'Paraguay':                        'Paraguai',
  'Australia':                       'Austrália',
  'Turkey':                          'Turquia',
  'Türkiye':                         'Turquia',
  'Germany':                         'Alemanha',
  'Curaçao':                         'Curaçao',
  'Curacao':                         'Curaçao',
  "Ivory Coast":                     'Costa do Marfim',
  "Côte d'Ivoire":                   'Costa do Marfim',
  "Cote d'Ivoire":                   'Costa do Marfim',
  'Ecuador':                         'Equador',
  'Netherlands':                     'Países Baixos',
  'Japan':                           'Japão',
  'Sweden':                          'Suécia',
  'Tunisia':                         'Tunísia',
  'Belgium':                         'Bélgica',
  'Egypt':                           'Egito',
  'Iran':                            'Irão',
  'New Zealand':                     'Nova Zelândia',
  'Spain':                           'Espanha',
  'Cape Verde':                      'Cabo Verde',
  'Saudi Arabia':                    'Arábia Saudita',
  'Uruguay':                         'Uruguai',
  'France':                          'França',
  'Senegal':                         'Senegal',
  'Iraq':                            'Iraque',
  'Norway':                          'Noruega',
  'Argentina':                       'Argentina',
  'Algeria':                         'Argélia',
  'Austria':                         'Áustria',
  'Jordan':                          'Jordânia',
  'Portugal':                        'Portugal',
  'DR Congo':                        'RD Congo',
  'Congo DR':                        'RD Congo',
  'Democratic Republic of Congo':    'RD Congo',
  'Congo, DR':                       'RD Congo',
  'Uzbekistan':                      'Uzbequistão',
  'Colombia':                        'Colômbia',
  'England':                         'Inglaterra',
  'Croatia':                         'Croácia',
  'Ghana':                           'Gana',
  'Panama':                          'Panamá',
  // Outros times de seleções que aparecem em amistosos
  'Denmark':                         'Dinamarca',
  'Poland':                          'Polônia',
  'Nigeria':                         'Nigéria',
  'Italy':                           'Itália',
  'Wales':                           'País de Gales',
  'Chile':                           'Chile',
  'Serbia':                          'Sérvia',
  'Cameroon':                        'Camarões',
  'Peru':                            'Peru',
  'Costa Rica':                      'Costa Rica',
  'Slovakia':                        'Eslováquia',
  'Bolivia':                         'Bolívia',
  'Ukraine':                         'Ucrânia',
  'Jamaica':                         'Jamaica',
  'China PR':                        'China',
  'China':                           'China',
  'Thailand':                        'Tailândia',
  'Philippines':                     'Filipinas',
  'Myanmar':                         'Mianmar',
  'Cambodia':                        'Camboja',
  'Hong Kong':                       'Hong Kong',
  'Oman':                            'Omã',
  'Kuwait':                          'Kuwait',
  'Indonesia':                       'Indonésia',
  'Mozambique':                      'Moçambique',
  'Kyrgyz Republic':                 'Quirguistão',
  'Kyrgyzstan':                      'Quirguistão',
  'Palestine':                       'Palestina',
  'Armenia':                         'Armênia',
  'Moldova':                         'Moldávia',
  'Ethiopia':                        'Etiópia',
  'Malawi':                          'Malauí',
  'Equatorial Guinea':               'Guiné Equatorial',
  'Comoros':                         'Comores',
  'Belarus':                         'Bielorrússia',
  'Burkina Faso':                    'Burkina Faso',
  'Angola':                          'Angola',
  'Central African Republic':        'Rep. Centro-Africana',
  'Hungary':                         'Hungria',
  'Kazakhstan':                      'Cazaquistão',
  'Russia':                          'Rússia',
  'Trinidad and Tobago':             'Trinidad e Tobago',
  'Azerbaijan':                      'Azerbaijão',
  'San Marino':                      'San Marino',
  'Iceland':                         'Islândia',
  'Venezuela':                       'Venezuela',
  'Greece':                          'Grécia',
  'Romania':                         'Romênia',
  'Serbia':                          'Sérvia',
};

function normalizeName(name) {
  return TEAM_NAMES[name] || name;
}

// Mapeamento explícito — cobre todos os status conhecidos do ESPN Soccer
const ESPN_LIVE_STATUSES = new Set([
  'STATUS_IN_PROGRESS',
  'STATUS_FIRST_HALF',
  'STATUS_SECOND_HALF',
  'STATUS_HALFTIME',
  'STATUS_EXTRA_TIME',
  'STATUS_ET',
  'STATUS_PENALTY',
  'STATUS_SHOOTOUT',
  'STATUS_LIVE',
]);

const ESPN_FINISHED_STATUSES = new Set([
  'STATUS_FINAL',
  'STATUS_FULL_TIME',
  'STATUS_FT',
  'STATUS_FINISHED',
  'STATUS_FINAL_AET',
  'STATUS_FINAL_PEN',
  'STATUS_AET',
]);

const ESPN_CANCELED_STATUSES = new Set([
  'STATUS_CANCELED',
  'STATUS_POSTPONED',
  'STATUS_SUSPENDED',
  'STATUS_ABANDONED',
]);

function mapESPNStatus(typeName) {
  if (!typeName) return 'SCHEDULED';
  const n = typeName.toUpperCase().trim();
  if (ESPN_CANCELED_STATUSES.has(n))  return 'CANCELED';
  if (ESPN_FINISHED_STATUSES.has(n))  return 'FINISHED';
  if (ESPN_LIVE_STATUSES.has(n))      return 'LIVE';
  // Fallback por substring para status desconhecidos
  if (n.includes('CANCEL') || n.includes('POSTPONE') || n.includes('SUSPEND') || n.includes('ABANDON')) return 'CANCELED';
  if (n.includes('FINAL')  || n.includes('FINISH')   || n.includes('FULL'))    return 'FINISHED';
  if (n.includes('PROGRESS') || n.includes('HALF')   || n.includes('EXTRA') || n.includes('PENALTY') || n.includes('LIVE')) return 'LIVE';
  return 'SCHEDULED';
}

function formatLocalTime(isoDate) {
  if (!isoDate) return '--:--';
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch { return '--:--'; }
}

function extractGroup(comp) {
  // ESPN mete el grupo en notes o en el nombre de la competencia
  const note = comp.notes?.[0]?.headline || comp.notes?.[0]?.text || '';
  let m = note.match(/[Gg]roup\s+([A-L])/);
  if (m) return m[1].toUpperCase();

  // También puede estar en el nombre del evento
  const series = comp.series?.summary || '';
  m = series.match(/[Gg]roup\s+([A-L])/);
  if (m) return m[1].toUpperCase();

  return '?';
}

// ── Gols de uma partida específica ──────────────────────────────────────────
async function fetchGoalScorers(espnEventId, competition = 'fifa.world') {
  try {
    const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${competition}`;
    const url  = `${base}/summary?event=${espnEventId}`;
    const res = await fetch(url, { timeout: 6000 });
    if (!res.ok) return [];
    const data = await res.json();

    const scorers = [];

    // ESPN guarda los goles en scoringPlays
    const plays = data.scoringPlays || [];
    for (const play of plays) {
      const typeText = (play.type?.text || play.type?.abbreviation || '').toLowerCase();
      if (!typeText.includes('goal') && !typeText.includes('gol') && typeText !== 'g') continue;

      const athleteName = play.participants?.[0]?.athlete?.displayName
        || play.athlete?.displayName
        || play.text?.split(' ')?.[0]
        || 'Desconocido';

      scorers.push({
        name: athleteName,
        team: normalizeName(play.team?.displayName || play.team?.name || ''),
        minute: play.clock?.displayValue || play.period?.displayValue || '',
        ownGoal: typeText.includes('own') || typeText.includes('propia'),
        penalty: typeText.includes('pen') || typeText.includes('pk'),
      });
    }

    return scorers;
  } catch {
    return [];
  }
}

// ── Marcador del día desde ESPN (aceita qualquer slug de competição) ──────────
async function fetchESPNMatches(dateStr, competition = 'fifa.world') {
  const base   = `https://site.api.espn.com/apis/site/v2/sports/soccer/${competition}`;
  const params = dateStr ? `?dates=${dateStr}` : '';
  const url    = `${base}/scoreboard${params}`;

  const res = await fetch(url, { timeout: 8000 });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  const data = await res.json();

  const events = data.events || [];
  const matches = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    if (!home || !away) continue;

    const statusName = comp.status?.type?.name || '';
    const status = mapESPNStatus(statusName);

    // displayClock pode vir como "23:00", "45+2", "90+4" etc.
    const clockRaw = comp.status?.displayClock || '';
    const minuteNum = status === 'LIVE'
      ? (parseInt(clockRaw) || 0)
      : (status === 'FINISHED' ? 90 : 0);
    // Manter o string original para exibir acréscimos ("45+2'")
    const minute = minuteNum;

    const homeScore = status !== 'SCHEDULED' ? parseInt(home.score ?? 0) : null;
    const awayScore = status !== 'SCHEDULED' ? parseInt(away.score ?? 0) : null;

    matches.push({
      id: event.id,
      espnId: event.id,
      group: (() => { const g = extractGroup(comp); return g !== '?' ? g : getGroup(normalizeName(home.team?.displayName || home.team?.name || '')); })(),
      status,
      minute,
      homeTeam: normalizeName(home.team?.displayName || home.team?.name || ''),
      awayTeam: normalizeName(away.team?.displayName || away.team?.name || ''),
      homeScore,
      awayScore,
      date: event.date?.split('T')[0] || dateStr,
      time: formatLocalTime(event.date),
      venue: comp.venue?.fullName || '',
      goalScorers: [],
    });
  }

  // Buscar goleadores solo de partidos con acción (no programados)
  // Limitamos a 5 llamadas en paralelo para no saturar
  const withAction = matches.filter(m => m.status !== 'SCHEDULED');
  const BATCH = 5;
  for (let i = 0; i < withAction.length; i += BATCH) {
    const batch = withAction.slice(i, i + BATCH);
    const scorersList = await Promise.all(batch.map(m => fetchGoalScorers(m.espnId, competition)));
    batch.forEach((m, idx) => { m.goalScorers = scorersList[idx]; });
  }

  return matches;
}

// ── football-data.org free tier (requiere key gratis) ───────────────────────
async function fetchFDOMatches(apiKey, dateStr) {
  const url = `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${dateStr}&dateTo=${dateStr}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    timeout: 8000,
  });
  if (!res.ok) throw new Error(`FDO HTTP ${res.status}`);
  const data = await res.json();

  return (data.matches || []).map(m => {
    const status = mapESPNStatus(m.status);
    return {
      id: `fdo-${m.id}`,
      espnId: null,
      group: m.group ? m.group.replace('GROUP_', '').replace('Group ', '') : '?',
      status,
      minute: m.minute || (status === 'FINISHED' ? 90 : 0),
      homeTeam: normalizeName(m.homeTeam.name),
      awayTeam: normalizeName(m.awayTeam.name),
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      date: dateStr,
      time: formatLocalTime(m.utcDate),
      venue: m.venue || '',
      goalScorers: (m.goals || []).map(g => ({
        name: g.scorer?.name || 'Desconocido',
        team: normalizeName(g.team?.name || ''),
        minute: g.minute ? `${g.minute}'` : '',
        ownGoal: g.type === 'OWN',
        penalty: g.type === 'PENALTY',
      })),
    };
  });
}

// ── Buscar los próximos días con partidos (pre-torneo / entre jornadas) ───────
async function fetchESPNUpcoming(daysAhead = 7) {
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
    try {
      const matches = await fetchESPNMatches(dateStr);
      if (matches && matches.length > 0) return matches;
    } catch { /* seguir buscando */ }
  }
  return [];
}

module.exports = { fetchESPNMatches, fetchFDOMatches, fetchESPNUpcoming };
