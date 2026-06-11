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
  if (!code) return `<span class="team-flag team-flag-txt">${team.substring(0,3).toUpperCase()}</span>`;
  return `<span class="fi fi-${code} team-flag"></span>`;
}

// Fecha de inicio del torneo (primer partido)
const WC_START = new Date('2026-06-11T17:00:00-05:00'); // Ciudad de México, hora local

let matches  = [];
let rotPage  = 0;       // página atual da rotação
let rotTimer = null;    // setInterval handle

const PAGE_MS = 20_000; // 20 s por página ≈ 1 min para 18 partidas (3 páginas)

// Ordena: AO VIVO > ENCERRADO > AGENDADO; dentro de cada status por horário
function sortForDisplay(list) {
  const ord = { LIVE: 0, FINISHED: 1, SCHEDULED: 2 };
  return [...list].sort((a, b) => {
    const da = ord[a.status] ?? 9, db = ord[b.status] ?? 9;
    return da !== db ? da - db : a.time.localeCompare(b.time);
  });
}

// Liga/desliga o timer de rotação conforme necessidade
function manageRotation(isLive, total) {
  if (!isLive && total > 6) {
    if (!rotTimer) rotTimer = setInterval(() => { rotPage++; render(); }, PAGE_MS);
  } else {
    clearInterval(rotTimer); rotTimer = null;
    if (isLive) rotPage = 0;
  }
}

// Abreviações para o ticker
const TEAM_ABBREV = {
  'Brasil':'BRA','Argentina':'ARG','França':'FRA','Alemanha':'ALE','Espanha':'ESP',
  'Portugal':'POR','Inglaterra':'ING','Itália':'ITA','Países Baixos':'HOL','Bélgica':'BEL',
  'EUA':'EUA','México':'MEX','Canadá':'CAN','Uruguai':'URU','Colômbia':'COL',
  'Equador':'EQU','Chile':'CHI','Paraguai':'PAR','Peru':'PER','Bolívia':'BOL',
  'Venezuela':'VEN','Japão':'JPN','China':'CHN','Austrália':'AUS','Nova Zelândia':'NZL',
  'Coreia do Sul':'COR','Marrocos':'MAR','Senegal':'SEN','Gana':'GAN','Nigéria':'NIG',
  'Egito':'EGI','Camarões':'CMR','Tunísia':'TUN','Argélia':'ALG','Suíça':'SUI',
  'Áustria':'AUT','Dinamarca':'DIN','Suécia':'SUE','Noruega':'NOR','Polônia':'POL',
  'Ucrânia':'UCR','Croácia':'CRO','Sérvia':'SER','Hungria':'HUN','Rússia':'RUS',
  'República Checa':'RCH','Eslováquia':'ESL','Islândia':'ISL','Irão':'IRA','Iraque':'IRQ',
  'Arábia Saudita':'SAU','Catar':'QAT','Turquia':'TUR','RD Congo':'RDC','Bósnia-Herz.':'BOS',
  'Curaçao':'CUR','Costa do Marfim':'CDM','Cabo Verde':'CPV','África do Sul':'AFS',
  'Trinidad e Tobago':'TRI','Haiti':'HAI','Jamaica':'JAM','Panamá':'PAN','Costa Rica':'CRC',
  'Indonésia':'IDN','Tailândia':'THA','Filipinas':'PHI','Mianmar':'MYA','Camboja':'CMB',
  'Hong Kong':'HKG','Escócia':'ESC','País de Gales':'GAL','Jordânia':'JOR','Palestina':'PAL',
  'Uzbequistão':'UZB','Cazaquistão':'KAZ','Quirguistão':'KGZ','Azerbaijão':'AZE',
  'Armênia':'ARM','Moldávia':'MDA','Bielorrússia':'BLR','Moçambique':'MOZ','Angola':'ANG',
  'San Marino':'SMR','Burkina Faso':'BKF','Guiné Equatorial':'GEQ','Omã':'OMA','Kuwait':'KUW',
  'Grécia':'GRE','Romênia':'ROM','Eslováquia':'ESL',
};
function abbrev(t) {
  if (TEAM_ABBREV[t]) return TEAM_ABBREV[t];
  const w = t.split(/[\s\-]+/);
  return (w.length >= 2 ? w.map(x => x[0]).join('') : t.slice(0, 3)).toUpperCase().slice(0, 4);
}

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
// Um único interval de 1s para tudo — evita dois timers simultâneos
setInterval(() => { tick(); tickCountdown(); }, 1000);
tick();

// ── Fetch ─────────────────────────────────────────────────────────────────────
let dataSource = '';

// ?test=N → layout de teste com dados simulados
const TEST_PARAM = new URLSearchParams(window.location.search).get('test');

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
  const all        = matches.filter(m => m.status !== 'CANCELED');
  const live       = all.filter(m => m.status === 'LIVE');
  const isLive     = live.length > 0;
  const brasilVivo = live.some(isBrasil);

  manageRotation(isLive, all.length);

  // Selecionar quais 6 partidas mostrar neste ciclo
  let list;
  if (isLive) {
    list = brasilFirst(live).slice(0, 6);
  } else if (all.length) {
    const sorted     = sortForDisplay(all);
    const totalPages = Math.ceil(sorted.length / 6);
    const page       = rotPage % totalPages;
    list = brasilFirst(sorted.slice(page * 6, (page + 1) * 6));
  } else {
    list = [];
  }

  // Badge do header
  const center = document.getElementById('headerCenter');
  let badgeHTML;
  if (isLive) {
    badgeHTML = brasilVivo
      ? `<div class="live-badge brasil-live-badge"><span class="dot brasil-dot"></span><span class="fi fi-br badge-flag"></span> BRASIL AO VIVO</div>`
      : `<div class="live-badge"><span class="dot"></span>${live.length} AO VIVO</div>`;
  } else if (all.length > 6) {
    const totalPages = Math.ceil(all.length / 6);
    const page = (rotPage % totalPages) + 1;
    badgeHTML = `<div class="mode-badge">Pág. ${page}/${totalPages} · ${all.length} jogos hoje</div>`;
  } else if (all.length) {
    badgeHTML = `<div class="mode-badge">${all.length} jogos hoje</div>`;
  } else {
    badgeHTML = `<div class="mode-badge">Sem jogos</div>`;
  }
  if (center.innerHTML !== badgeHTML) center.innerHTML = badgeHTML;

  const stage = document.getElementById('stage');

  if (!list.length) {
    const key = 'countdown';
    if (lastStageKey !== key) {
      lastStageKey = key;
      renderCountdown(stage);
      renderTicker();
    }
    return;
  }

  const n        = list.length;
  const priority = isBrasil(list[0]) && n > 1;
  const stageKey = list.map(m =>
    `${m.id}:${m.status}:${m.homeScore}:${m.awayScore}:${m.minute}`
  ).join('|') + `|cols-${n}|${priority}`;

  if (stageKey === lastStageKey) return;
  lastStageKey = stageKey;

  stage.className = `stage cols-${n}${priority ? ' brasil-priority' : ''}`;
  stage.innerHTML = list.map(cardHTML).join('');
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
        <div class="countdown-date">Copa do Mundo 2026 em andamento</div>
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
      <div class="countdown-date">11 de Junho de 2026 &mdash; Cidade do M&eacute;xico</div>
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
  const sc  = m.goalScorers || [];
  const rc  = m.redCards    || [];
  if (!isSched && (sc.length || rc.length)) {
    const homeSc = sc.filter(s => s.team === m.homeTeam);
    const awaySc = sc.filter(s => s.team === m.awayTeam);
    const homeRc = rc.filter(s => s.team === m.homeTeam);
    const awayRc = rc.filter(s => s.team === m.awayTeam);

    const goalLines = arr => arr.map(s => {
      const min = s.minute ? `<span class="min"> ${s.minute}'</span>` : '';
      const tag = s.penalty ? `<span class="scorer-tag pen">P</span>` : s.ownGoal ? `<span class="scorer-tag og">PP</span>` : '';
      return `<div class="scorer-line"><span class="ic-goal"></span>${s.name}${min}${tag}</div>`;
    }).join('');

    const redLines = arr => arr.map(s => {
      const min = s.minute ? `<span class="min"> ${s.minute}'</span>` : '';
      return `<div class="scorer-line red-card-line"><span class="ic-rc"></span>${s.name}${min}</div>`;
    }).join('');

    const hasLeft  = homeSc.length || homeRc.length;
    const hasRight = awaySc.length || awayRc.length;

    scorersHTML = `
      <div class="card-scorers">
        <div class="scorers-col left">${goalLines(homeSc)}${redLines(homeRc)}</div>
        <div class="scorers-col right">${goalLines(awaySc)}${redLines(awayRc)}</div>
      </div>`;
    if (!hasLeft && !hasRight) scorersHTML = '';
  }

  // Badge exclusivo nos jogos do Brasil
  const brasilBadge = brasilJoga
    ? `<div class="brasil-badge"><span class="fi fi-br badge-flag"></span> SELEÇÃO BRASILEIRA</div>`
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

// ── Ticker — rotação estática (sem CSS scroll 60fps) ─────────────────────────
// Cada partida fica 7s em tela; transição de 0.25s via CSS opacity.
// Elimina o único animation loop contínuo que causava aquecimento constante.
let tickerItems = [];
let tickerIdx   = 0;
let tickerTimer = null;
const TICKER_MS = 7_000;

function buildTickerItems() {
  const withScore = matches.filter(m => m.status !== 'SCHEDULED');
  if (!withScore.length) return ['Copa do Mundo 2026 &nbsp;&middot;&nbsp; EUA &middot; Canad&aacute; &middot; M&eacute;xico'];

  const sep = `<span class="t-sep">|</span>`;
  return withScore.map((m, i) => {
    const liveTag = m.status === 'LIVE' ? `<span class="t-live">AO VIVO ${m.minute}'</span> ` : '';
    const score   = `<span class="t-score">${m.homeScore}-${m.awayScore}</span>`;
    const counter = withScore.length > 1
      ? `<span class="t-counter">${i + 1}/${withScore.length}</span>` : '';

    const fmtSc = arr => arr
      .map(s => `${s.name}${s.minute ? ` ${s.minute}'` : ''}${s.penalty?' (P)':''}${s.ownGoal?' (PP)':''}`)
      .join(', ');
    const fmtRc = arr => arr.map(s => `[RC] ${s.name}${s.minute ? ` ${s.minute}'` : ''}`).join(', ');

    const homeSc = (m.goalScorers||[]).filter(s => s.team === m.homeTeam);
    const awaySc = (m.goalScorers||[]).filter(s => s.team === m.awayTeam);
    const homeRc = (m.redCards||[]).filter(s => s.team === m.homeTeam);
    const awayRc = (m.redCards||[]).filter(s => s.team === m.awayTeam);

    const homeParts = [fmtSc(homeSc), fmtRc(homeRc)].filter(Boolean).join(', ');
    const awayParts = [fmtSc(awaySc), fmtRc(awayRc)].filter(Boolean).join(', ');
    const homeEvt   = homeParts ? `${abbrev(m.homeTeam)}: ${homeParts}` : '';
    const awayEvt   = awayParts ? `${abbrev(m.awayTeam)}: ${awayParts}` : '';
    const evtStr    = [homeEvt, awayEvt].filter(Boolean).join(` ${sep} `);
    const eventHTML = evtStr ? ` &nbsp;${sep}&nbsp; <span class="t-scorer">${evtStr}</span>` : '';

    return `${counter}${liveTag}${m.homeTeam} ${score} ${m.awayTeam}${eventHTML}`;
  });
}

function showTickerItem(html) {
  const el = document.getElementById('ticker');
  if (!el) return;
  el.classList.add('t-fade');
  setTimeout(() => { el.innerHTML = html; el.classList.remove('t-fade'); }, 260);
}

function renderTicker() {
  const lbl = document.getElementById('tickerLabel');
  if (lbl) lbl.textContent = dataSource.toLowerCase().includes('amistoso') ? 'AMISTOSOS' : 'PLACAR';

  tickerItems = buildTickerItems();
  if (tickerIdx >= tickerItems.length) tickerIdx = 0;

  // Mostrar item atual sem fade (chamado após re-render dos cards)
  const el = document.getElementById('ticker');
  if (el) el.innerHTML = tickerItems[tickerIdx] || '';

  // Gerir timer: iniciar se há múltiplos itens, parar se não
  if (tickerItems.length > 1 && !tickerTimer) {
    tickerTimer = setInterval(() => {
      tickerIdx = (tickerIdx + 1) % tickerItems.length;
      showTickerItem(tickerItems[tickerIdx]);
    }, TICKER_MS);
  } else if (tickerItems.length <= 1 && tickerTimer) {
    clearInterval(tickerTimer); tickerTimer = null;
  }
}

// ── Escala proporcional para telas menores que 1920×1080 ─────────────────────
function scaleDisplay() {
  const scaleX = window.innerWidth  / 1920;
  const scaleY = window.innerHeight / 1080;
  const scale  = Math.min(scaleX, scaleY, 1); // nunca escalar para cima
  if (scale < 0.97) {
    document.body.style.transform      = `scale(${scale.toFixed(4)})`;
    document.body.style.transformOrigin = '0 0';
    document.body.style.width           = `${(100 / scale).toFixed(2)}%`;
    document.body.style.height          = `${(100 / scale).toFixed(2)}%`;
    document.body.style.overflow        = 'hidden';
  } else {
    document.body.removeAttribute('style');
  }
}
window.addEventListener('resize', scaleDisplay);
scaleDisplay();

// ── Pausar animações CSS quando a aba não está visível ───────────────────────
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('animations-paused', document.hidden);
});

// ── Arranque ──────────────────────────────────────────────────────────────────
load();
setInterval(load, 30_000); // buscar dados novos a cada 30s
