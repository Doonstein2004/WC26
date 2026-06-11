'use strict';

require('dotenv').config();
const express = require('express');
const path    = require('path');
const { fetchESPNMatches, fetchFDOMatches, fetchESPNUpcoming, fetchTheSportsDB } = require('./data/fetchers');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/flag-icons', express.static(path.join(__dirname, 'node_modules/flag-icons')));
app.use(express.json());

// ── Caché ────────────────────────────────────────────────────────────────────
const cache    = { matches: null, lastUpdate: null, source: '' };
const lastGood = { matches: [], source: '', savedAt: 0 };
const TTL           = 20_000;       // 20 s entre buscas
const LAST_GOOD_TTL = 5 * 60_000;  // manter dados de emergência por até 5 min

function stale() {
  return !cache.lastUpdate || (Date.now() - cache.lastUpdate) > TTL;
}

function todayDate()  { return new Date().toISOString().split('T')[0].replace(/-/g,''); }
function todayISO()   { return new Date().toISOString().split('T')[0]; }

// Copa do Mundo começa 11 de junho de 2026
const WC_START = new Date('2026-06-11T00:00:00-05:00');
const wcAtivo  = () => new Date() >= WC_START;

// ── Buscar partidas reais — cascata de fontes com fallback ───────────────────
async function fetchReal() {
  const date = todayDate();

  // 1. ESPN Copa do Mundo (prioridade máxima — melhor qualidade, tem goleadores)
  try {
    const m = await fetchESPNMatches(date, 'fifa.world');
    if (m && m.length) return { matches: m, source: 'ESPN' };
  } catch (e) { console.warn('[ESPN fifa.world]', e.message); }

  if (wcAtivo()) {
    // 2. TheSportsDB — gratuito, sem chave, independente do ESPN
    try {
      const m = await fetchTheSportsDB(date);
      if (m && m.length) return { matches: m, source: 'TheSportsDB' };
    } catch (e) { console.warn('[TheSportsDB]', e.message); }

    // 3. football-data.org (chave grátis opcional — tem goleadores)
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const m = await fetchFDOMatches(process.env.FOOTBALL_API_KEY, todayISO());
        if (m && m.length) return { matches: m, source: 'football-data.org' };
      } catch (e) { console.warn('[FDO]', e.message); }
    }

    // 4. ESPN próximos dias (entre jornadas — sem jogos hoje)
    try {
      const m = await fetchESPNUpcoming(7);
      if (m && m.length) return { matches: m, source: 'ESPN (próximos)' };
    } catch (e) { console.warn('[ESPN próximos]', e.message); }

    return { matches: [], source: 'sem-dados' };
  }

  // Antes da Copa: amistosos internacionais
  try {
    const m = await fetchESPNMatches(date, 'fifa.friendly');
    if (m && m.length) {
      const ativos = m.filter(p => p.status !== 'CANCELED');
      if (ativos.length) return { matches: ativos, source: 'ESPN (amistosos)' };
    }
  } catch (e) { console.warn('[ESPN fifa.friendly]', e.message); }

  try {
    const m = await fetchTheSportsDB(date);
    if (m && m.length) return { matches: m, source: 'TheSportsDB (amistosos)' };
  } catch (e) { console.warn('[TheSportsDB amistosos]', e.message); }

  if (process.env.FOOTBALL_API_KEY) {
    try {
      const m = await fetchFDOMatches(process.env.FOOTBALL_API_KEY, todayISO());
      if (m && m.length) return { matches: m, source: 'football-data.org' };
    } catch (e) { console.warn('[FDO]', e.message); }
  }

  return { matches: [], source: 'sem-dados' };
}

async function getMatches() {
  if (!stale() && cache.matches !== null) {
    return { matches: cache.matches, source: `cache (${cache.source})` };
  }

  const result = await fetchReal();

  // Guardar último estado bom — nunca perder dados por falha transitória
  if (result.matches.length > 0) {
    lastGood.matches = result.matches;
    lastGood.source  = result.source;
    lastGood.savedAt = Date.now();
  }

  // Se todas as fontes falharam mas temos dados recentes, usá-los como emergência
  if (result.matches.length === 0 && lastGood.matches.length > 0) {
    const age = Date.now() - lastGood.savedAt;
    if (age < LAST_GOOD_TTL) {
      const mins = Math.round(age / 60_000);
      console.warn(`[emergência] usando dados de ${mins}m atrás (${lastGood.source})`);
      const src = `${lastGood.source} +${mins}m`;
      cache.matches = lastGood.matches; cache.source = src; cache.lastUpdate = Date.now();
      return { matches: lastGood.matches, source: src };
    }
  }

  cache.matches = result.matches; cache.source = result.source; cache.lastUpdate = Date.now();
  console.log(`[datos] ${result.source} — ${result.matches.length} partidos`);
  return result;
}

// ── Jogos de teste (layout multi-partida sem depender do ESPN) ───────────────
// Uso: GET /api/matches?test=2   (1-6 jogos simultâneos ao vivo)
function makeTestMatches(n) {
  const pool = [
    { homeTeam:'Brasil',        awayTeam:'Argentina',    homeScore:2, awayScore:1, minute:67, group:'C',
      goalScorers:[
        { name:'Vinicius Jr.', team:'Brasil',    minute:"23'", penalty:false, ownGoal:false },
        { name:'Rodrygo',      team:'Brasil',    minute:"58'", penalty:false, ownGoal:false },
        { name:'Messi',        team:'Argentina', minute:"41'", penalty:true,  ownGoal:false },
      ]},
    { homeTeam:'França',        awayTeam:'Alemanha',     homeScore:1, awayScore:1, minute:34, group:'D',
      goalScorers:[
        { name:'Mbappé',   team:'França',   minute:"12'", penalty:false, ownGoal:false },
        { name:'Müller',   team:'Alemanha', minute:"29'", penalty:false, ownGoal:false },
      ]},
    { homeTeam:'Espanha',       awayTeam:'Portugal',     homeScore:0, awayScore:1, minute:51, group:'E',
      goalScorers:[
        { name:'Ronaldo', team:'Portugal', minute:"44'", penalty:false, ownGoal:false },
      ]},
    { homeTeam:'Inglaterra',    awayTeam:'Países Baixos', homeScore:3, awayScore:0, minute:78, group:'F',
      goalScorers:[
        { name:'Kane',       team:'Inglaterra', minute:"8'",  penalty:false, ownGoal:false },
        { name:'Bellingham', team:'Inglaterra', minute:"35'", penalty:false, ownGoal:false },
        { name:'Saka',       team:'Inglaterra', minute:"71'", penalty:false, ownGoal:false },
      ]},
    { homeTeam:'Itália',        awayTeam:'Croácia',      homeScore:1, awayScore:2, minute:88, group:'H',
      goalScorers:[
        { name:'Modrić',    team:'Croácia', minute:"22'", penalty:false, ownGoal:false },
        { name:'Vlašić',    team:'Croácia', minute:"55'", penalty:false, ownGoal:false },
        { name:'Immobile',  team:'Itália',  minute:"60'", penalty:true,  ownGoal:false },
      ]},
    { homeTeam:'Colômbia',      awayTeam:'Uruguai',      homeScore:2, awayScore:2, minute:45, group:'J',
      goalScorers:[
        { name:'Díaz',    team:'Colômbia', minute:"18'", penalty:false, ownGoal:false },
        { name:'Suárez',  team:'Uruguai',  minute:"27'", penalty:false, ownGoal:false },
        { name:'Falcao',  team:'Colômbia', minute:"39'", penalty:false, ownGoal:false },
        { name:'Núñez',   team:'Uruguai',  minute:"43'", penalty:false, ownGoal:false },
      ]},
  ];

  const count = Math.min(Math.max(parseInt(n) || 1, 1), 6);
  return pool.slice(0, count).map((m, i) => ({
    id:          `test-${i}`,
    espnId:      null,
    status:      'LIVE',
    date:        new Date().toISOString().split('T')[0],
    time:        '--:--',
    venue:       '',
    ...m,
  }));
}

// ── Rutas ────────────────────────────────────────────────────────────────────
app.get('/api/matches', async (req, res) => {
  try {
    // Modo de teste: ?test=N  (N jogos ao vivo, sem tocar no cache real)
    if (req.query.test) {
      const testMatches = makeTestMatches(req.query.test);
      return res.json({ matches: testMatches, source: `TESTE (${testMatches.length} jogos)`, updatedAt: Date.now() });
    }

    const { matches, source } = await getMatches();
    res.json({ matches, source, updatedAt: cache.lastUpdate });
  } catch (err) {
    console.error(err);
    res.json({ matches: [], source: 'error', updatedAt: Date.now() });
  }
});

app.get('/api/status', async (req, res) => {
  const { matches, source } = await getMatches();
  res.json({
    tournament:     'FIFA Copa del Mundo 2026',
    dataSource:     source,
    liveCount:      matches.filter(m => m.status === 'LIVE').length,
    finishedCount:  matches.filter(m => m.status === 'FINISHED').length,
    scheduledCount: matches.filter(m => m.status === 'SCHEDULED').length,
    cacheAge:       cache.lastUpdate ? Math.round((Date.now()-cache.lastUpdate)/1000)+'s' : 'N/A',
    serverTime:     new Date().toISOString(),
  });
});

app.post('/api/refresh', async (_req, res) => {
  cache.lastUpdate = null;
  const { matches, source } = await getMatches();
  res.json({ ok: true, source, count: matches.length });
});

// ── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Copa do Mundo 2026 — http://localhost:${PORT}`);
  console.log(`  Fontes: ESPN (sem chave) → football-data.org (com chave) → ESPN próximos dias`);
  console.log(`  Teste layout: http://localhost:${PORT}?todos\n`);
});
