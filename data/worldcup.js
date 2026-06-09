'use strict';

// Grupos da Copa do Mundo 2026 (48 seleções, 12 grupos de 4)
// Fonte: sorteio oficial FIFA — nomes em Português do Brasil
const GROUPS = {
  A: ['México',        'África do Sul',  'Coreia do Sul',  'República Checa'],
  B: ['Canadá',        'Bósnia-Herz.',   'Catar',          'Suíça'],
  C: ['Brasil',        'Marrocos',       'Haiti',          'Escócia'],
  D: ['EUA',           'Paraguai',       'Austrália',      'Turquia'],
  E: ['Alemanha',      'Curaçao',        'Costa do Marfim','Equador'],
  F: ['Países Baixos', 'Japão',          'Suécia',         'Tunísia'],
  G: ['Bélgica',       'Egito',          'Irão',           'Nova Zelândia'],
  H: ['Espanha',       'Cabo Verde',     'Arábia Saudita', 'Uruguai'],
  I: ['França',        'Senegal',        'Iraque',         'Noruega'],
  J: ['Argentina',     'Argélia',        'Áustria',        'Jordânia'],
  K: ['Portugal',      'RD Congo',       'Uzbequistão',    'Colômbia'],
  L: ['Inglaterra',    'Croácia',        'Gana',           'Panamá'],
};

// Mapa inverso: nome PT → grupo
const TEAM_TO_GROUP = {};
for (const [group, teams] of Object.entries(GROUPS)) {
  for (const team of teams) TEAM_TO_GROUP[team] = group;
}

function getGroup(ptName) {
  return TEAM_TO_GROUP[ptName] || '?';
}

module.exports = { GROUPS, TEAM_TO_GROUP, getGroup };
