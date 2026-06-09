'use strict';

// Mapa nome PT-BR → código ISO 3166-1 alpha-2 (para flagcdn.com)
const COUNTRY_CODES = {
  // WC 2026 — Grupo A
  'México':'mx','África do Sul':'za','Coreia do Sul':'kr','República Checa':'cz',
  // WC 2026 — Grupo B
  'Canadá':'ca','Bósnia-Herz.':'ba','Catar':'qa','Suíça':'ch',
  // WC 2026 — Grupo C
  'Brasil':'br','Marrocos':'ma','Haiti':'ht','Escócia':'gb-sct',
  // WC 2026 — Grupo D
  'EUA':'us','Paraguai':'py','Austrália':'au','Turquia':'tr',
  // WC 2026 — Grupo E
  'Alemanha':'de','Curaçao':'cw','Costa do Marfim':'ci','Equador':'ec',
  // WC 2026 — Grupo F
  'Países Baixos':'nl','Japão':'jp','Suécia':'se','Tunísia':'tn',
  // WC 2026 — Grupo G
  'Bélgica':'be','Egito':'eg','Irão':'ir','Nova Zelândia':'nz',
  // WC 2026 — Grupo H
  'Espanha':'es','Cabo Verde':'cv','Arábia Saudita':'sa','Uruguai':'uy',
  // WC 2026 — Grupo I
  'França':'fr','Senegal':'sn','Iraque':'iq','Noruega':'no',
  // WC 2026 — Grupo J
  'Argentina':'ar','Argélia':'dz','Áustria':'at','Jordânia':'jo',
  // WC 2026 — Grupo K
  'Portugal':'pt','RD Congo':'cd','Uzbequistão':'uz','Colômbia':'co',
  // WC 2026 — Grupo L
  'Inglaterra':'gb-eng','Croácia':'hr','Gana':'gh','Panamá':'pa',
  // Outros
  'Estados Unidos':'us','Chile':'cl','Sérvia':'rs','Camarões':'cm',
  'Dinamarca':'dk','Polônia':'pl','Peru':'pe','Nigéria':'ng',
  'Itália':'it','Eslováquia':'sk','Bolívia':'bo','Ucrânia':'ua',
  'Jamaica':'jm','Costa Rica':'cr','País de Gales':'gb-wls',
  'China':'cn','Tailândia':'th','Filipinas':'ph','Mianmar':'mm',
  'Camboja':'kh','Hong Kong':'hk','Omã':'om','Kuwait':'kw',
  'Indonésia':'id','Moçambique':'mz','Quirguistão':'kg','Palestina':'ps',
  'Armênia':'am','Moldávia':'md','Etiópia':'et','Malauí':'mw',
  'Guiné Equatorial':'gq','Comores':'km','Bielorrússia':'by',
  'Angola':'ao','Rep. Centro-Africana':'cf','Hungria':'hu',
  'Cazaquistão':'kz','Rússia':'ru','Trinidad e Tobago':'tt',
  'Azerbaijão':'az','San Marino':'sm','Islândia':'is','Venezuela':'ve',
  'Grécia':'gr','Romênia':'ro','Burkina Faso':'bf','Irã':'ir',
};

function flagImg(team) {
  const code = COUNTRY_CODES[team];
  if (!code) {
    return `<span class="team-flag-txt">${team.substring(0,3).toUpperCase()}</span>`;
  }
  return `<img class="team-flag" src="https://flagcdn.com/w80/${code}.png" alt="${team}" decoding="async">`;
}

// Fecha de inicio del torneo (primer partido)
const WC_START = new Date('2026-06-11T17:00:00-05:00'); // Ciudad de México, hora local

let matches = [];
let mode    = 'live';
let modTimer = null; // mantido para compatibilidade com clearTimeout

// ── Relógio ───────────────────────────────────────────────────────────────────
function tick() {
  const now = new Date();
  const p   = n => String(n).padStart(2,'0');
  document.getElementById('clock').textContent =
    `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

  const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  document.getElementById('date').textContent =
    `${DIAS[now.getDay()]} ${now.getDate()} ${MESES[now.getMonth()]} ${now.getFullYear()}`;
}
setInterval(tick, 1000);
tick();

// ── Fetch ─────────────────────────────────────────────────────────────────────
let dataSource = '';

// ?test=N → layout de teste com dados simulados
// ?todos  → mostrar todos os jogos do dia (ao vivo + agendados + encerrados)
const TEST_PARAM = new URLSearchParams(window.location.search).get('test');
const SHOWALL    = new URLSearchParams(window.location.search).has('todos');

async function load() {
  try {
    const url = TEST_PARAM ? `/api/matches?test=${TEST_PARAM}` : '/api/matches';
    const r = await fetch(url);
    const d = await r.json();
    if (d.matches) matches = d.matches;
    if (d.source)  dataSource = d.source;
  } catch { /* rede fora — manter último estado */ }
  render();
}

// ── Auto-modo ─────────────────────────────────────────────────────────────────
// Prioridade: ao vivo → resultados do dia → countdown
function autoMode() {
  if (SHOWALL) return;

  clearTimeout(modTimer);
  const live     = matches.filter(m => m.status === 'LIVE');
  const finished = matches.filter(m => m.status === 'FINISHED');

  if (live.length)      { mode = 'live';    return; }
  if (finished.length)  { mode = 'results'; return; }
  mode = 'live'; // lista vazia → render() mostra countdown automaticamente
}

// ── Helpers Brasil ────────────────────────────────────────────────────────────
const isBrasil = m => m.homeTeam === 'Brasil' || m.awayTeam === 'Brasil';

function brasilFirst(list) {
  return [...list].sort((a, b) => {
    if (isBrasil(a) && !isBrasil(b)) return -1;
    if (!isBrasil(a) && isBrasil(b)) return 1;
    return 0;
  });
}

// Chave do último render — evita re-escrever o DOM sem necessidade
let lastStageKey = '';

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  autoMode();

  const live     = matches.filter(m => m.status === 'LIVE');
  const finished = matches.filter(m => m.status === 'FINISHED');
  const sched    = matches.filter(m => m.status === 'SCHEDULED');

  const brasilVivo = live.some(isBrasil);

  // Badge do header (leve, não causa refluxo visual)
  const center = document.getElementById('headerCenter');
  let badgeHTML;
  if (SHOWALL) {
    const liveCount = live.length;
    badgeHTML = liveCount
      ? `<div class="live-badge"><span class="dot"></span>${liveCount} AO VIVO · ${matches.filter(m=>m.status!=='CANCELED').length} jogos hoje</div>`
      : `<div class="mode-badge">📋 ${matches.filter(m=>m.status!=='CANCELED').length} JOGOS HOJE</div>`;
  } else if (live.length) {
    badgeHTML = brasilVivo
      ? `<div class="live-badge brasil-live-badge"><span class="dot brasil-dot"></span>🇧🇷 BRASIL AO VIVO</div>`
      : `<div class="live-badge"><span class="dot"></span>${live.length} AO VIVO</div>`;
  } else {
    const labels = { live:'Sem jogos ao vivo', results:'Resultados de hoje', upcoming:'Próximos jogos' };
    badgeHTML = `<div class="mode-badge">${labels[mode]}</div>`;
  }
  if (center.innerHTML !== badgeHTML) center.innerHTML = badgeHTML;

  let raw;
  if (SHOWALL) {
    // Modo "todos": ao vivo primeiro, depois por horário
    raw = [
      ...live,
      ...finished.sort((a, b) => a.time.localeCompare(b.time)),
      ...sched.sort((a, b) => a.time.localeCompare(b.time)),
    ];
  } else {
    raw = mode === 'live' ? live : mode === 'results' ? finished : sched;
  }
  const list = brasilFirst(raw);
  const stage = document.getElementById('stage');

  // Sem partidas → mostrar countdown (atualizado pelo tickCountdown separado)
  if (!list.length) {
    const key = 'countdown';
    if (lastStageKey !== key) {
      lastStageKey = key;
      renderCountdown(stage);
      renderTicker();
    }
    return;
  }

  // Gerar chave baseada no estado atual dos jogos
  // Só re-escreve o DOM se algo mudou (placar, status, minuto)
  const n        = Math.min(list.length, 6);
  const priority = isBrasil(list[0]) && n > 1;
  const stageKey = list.slice(0, n).map(m =>
    `${m.id}:${m.status}:${m.homeScore}:${m.awayScore}:${m.minute}`
  ).join('|') + `|cols-${n}|${priority}`;

  if (stageKey === lastStageKey) return; // nada mudou — não tocar no DOM
  lastStageKey = stageKey;

  stage.className = `stage cols-${n}${priority ? ' brasil-priority' : ''}`;
  stage.innerHTML = list.slice(0, n).map(cardHTML).join('');
  renderTicker();
}

// ── Countdown — atualiza APENAS os números, sem tocar nos cards ───────────────
function tickCountdown() {
  const nums = document.querySelectorAll('.countdown-num');
  if (!nums.length) return; // não está na tela de countdown

  const diff = WC_START - new Date();
  if (diff <= 0) return;

  const vals = [
    Math.floor(diff / 86_400_000),
    Math.floor((diff % 86_400_000) / 3_600_000),
    Math.floor((diff % 3_600_000)  / 60_000),
    Math.floor((diff % 60_000)     / 1_000),
  ];
  nums.forEach((el, i) => {
    const txt = String(vals[i]).padStart(2, '0');
    if (el.textContent !== txt) el.textContent = txt; // só atualiza se mudou
  });
}

// ── Contagem regressiva para o início do torneio ──────────────────────────────
function renderCountdown(stage) {
  stage.className = 'stage cols-1';

  const now  = new Date();
  const diff = WC_START - now;

  if (diff <= 0) {
    stage.innerHTML = `
      <div class="splash">
        <div class="countdown-label">Aguardando dados da partida...</div>
        <div class="countdown-date">⚽ Copa do Mundo 2026 em andamento</div>
      </div>`;
    return;
  }

  const dias  = Math.floor(diff / 86_400_000);
  const horas = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  const segs  = Math.floor((diff % 60_000) / 1_000);

  stage.innerHTML = `
    <div class="splash">
      <div class="countdown-label">O torneio começa em</div>
      <div class="countdown-digits">
        ${unit(dias,  'Dias')}
        <span class="countdown-sep">:</span>
        ${unit(horas, 'Horas')}
        <span class="countdown-sep">:</span>
        ${unit(mins,  'Min')}
        <span class="countdown-sep">:</span>
        ${unit(segs,  'Seg')}
      </div>
      <div class="countdown-date">🏆 11 de Junho de 2026 — Cidade do México</div>
    </div>`;
}

function unit(n, label) {
  return `
    <div class="countdown-unit">
      <span class="countdown-num">${String(n).padStart(2,'0')}</span>
      <span class="countdown-unit-label">${label}</span>
    </div>`;
}

// ── Card de partido ───────────────────────────────────────────────────────────
function cardHTML(m) {
  const isLive   = m.status === 'LIVE';
  const isDone   = m.status === 'FINISHED';
  const isSched  = m.status === 'SCHEDULED';
  const brasilJoga = isBrasil(m);

  const cardClass = `match-card ${m.status.toLowerCase()}${brasilJoga ? ' brasil-match' : ''}`;

  const statusHTML = isLive
    ? `<div class="card-status live"><span class="dot"></span>AO VIVO &nbsp;${m.minute}'</div>`
    : isDone
    ? `<div class="card-status finished">ENCERRADO</div>`
    : `<div class="card-status scheduled">EM BREVE</div>`;

  const scoreHTML = isSched
    ? `<span class="scheduled-time">${m.time}</span>`
    : `<div class="score-digits">
        <span class="score">${m.homeScore}</span>
        <span class="score-sep">-</span>
        <span class="score">${m.awayScore}</span>
       </div>`;

  // Nome do time com destaque se for o Brasil
  const homeName = `<span class="team-name${m.homeTeam === 'Brasil' ? ' brasil-team' : ''}">${m.homeTeam}</span>`;
  const awayName = `<span class="team-name${m.awayTeam === 'Brasil' ? ' brasil-team' : ''}">${m.awayTeam}</span>`;

  let scorersHTML = '';
  const sc = m.goalScorers || [];
  if (!isSched && sc.length) {
    const homeSc = sc.filter(s => s.team === m.homeTeam);
    const awaySc = sc.filter(s => s.team === m.awayTeam);

    const lines = arr => arr.map(s => {
      const min = s.minute ? `<span class="min">${s.minute}'</span>` : '';
      const pen = s.penalty ? `<span class="scorer-tag pen">P</span>` : '';
      const og  = s.ownGoal ? `<span class="scorer-tag og">PP</span>` : '';
      return `<div class="scorer-line">⚽ ${s.name} ${min}${pen}${og}</div>`;
    }).join('');

    scorersHTML = `
      <div class="card-scorers">
        <div class="scorers-col left">${lines(homeSc)}</div>
        <div class="scorers-col right">${lines(awaySc)}</div>
      </div>`;
  }

  // Badge exclusivo nos jogos do Brasil
  const brasilBadge = brasilJoga
    ? `<div class="brasil-badge">🇧🇷 SELEÇÃO BRASILEIRA</div>`
    : '';

  return `
    <div class="${cardClass}">
      ${brasilBadge}
      <div class="card-group">GRUPO ${m.group}</div>
      ${statusHTML}
      <div class="card-match">
        <div class="team-block">
          ${flagImg(m.homeTeam)}
          ${homeName}
        </div>
        <div class="score-center">${scoreHTML}</div>
        <div class="team-block">
          ${flagImg(m.awayTeam)}
          ${awayName}
        </div>
      </div>
      ${scorersHTML}
    </div>`;
}

// ── Ticker ────────────────────────────────────────────────────────────────────
function renderTicker() {
  // Atualizar label com a fonte de dados
  const lbl = document.getElementById('tickerLabel');
  if (lbl) {
    const isAmistoso = dataSource.toLowerCase().includes('amistoso');
    lbl.textContent = isAmistoso ? '⚽ AMISTOSOS' : '⚽ PLACAR';
  }
  const el  = document.getElementById('ticker');
  const sep = `<span class="t-sep">|</span>`;
  const withScore = matches.filter(m => m.status !== 'SCHEDULED');

  if (!withScore.length) {
    el.innerHTML = 'Copa do Mundo 2026 🏆 &nbsp; EUA · Canadá · México &nbsp;·&nbsp; 11 de Junho de 2026';
    return;
  }

  const parts = withScore.map(m => {
    const live  = m.status === 'LIVE' ? `<span class="t-live">AO VIVO ${m.minute}'</span> ` : '';
    const score = `<span class="t-score">${m.homeScore}-${m.awayScore}</span>`;
    const names = (m.goalScorers || [])
      .map(s => `${s.name}${s.minute ? ` ${s.minute}'` : ''}${s.penalty?' (P)':''}${s.ownGoal?' (PP)':''}`)
      .join(', ');
    const scorerPart = names ? ` <span class="t-scorer">— ${names}</span>` : '';
    return `${live}${m.homeTeam} ${score} ${m.awayTeam}${scorerPart}`;
  });

  el.innerHTML = parts.join(` ${sep} `) + ` ${sep} 🏆 Copa do Mundo 2026`;
}

// ── Arranque ──────────────────────────────────────────────────────────────────
load();
setInterval(load,          30_000); // buscar dados novos a cada 30s
setInterval(tickCountdown,  1_000); // atualiza só os números do countdown, sem tocar nos cards
