// Original material and musical layers. Theme intervals recur in reveal, income,
// the round transition, and the two-part ceremony over the same tonal centre.
const pitch = key => 440 * 2 ** ((key - 69) / 12);
const sine = (frequency, duration, level, delay = 0, options = {}) =>
  ({ frequency, duration, level, delay, type: 'sine', ...options });
const swell = (frequency, duration, level, delay, options = {}) =>
  sine(frequency, duration, level, delay, { attack: 0.032, ...options });
const knock = (frequency, to, duration, level, delay = 0, pan = 0) =>
  sine(frequency, duration, level, delay, { to, attack: 0.002, pan });
const band = (frequency, to, duration, level, delay = 0, options = {}) =>
  ({ frequency, to, duration, level, delay, type: 'texture', ...options });

function bar(key, level, delay, duration, pan = 0) {
  const frequency = pitch(key);
  return [
    sine(frequency, duration, level, delay, { pan }),
    sine(frequency * 2.007, duration * 0.64, level * 0.19, delay, { pan: pan * 0.85 }),
    sine(frequency * 4.044, duration * 0.26, level * 0.10, delay, { pan }),
  ];
}

function diceImpact(delay, level, pan, hard = false) {
  return [
    knock(hard ? 188 : 250, hard ? 101 : 148, hard ? 0.14 : 0.076, level, delay, pan),
    knock(829, 635, 0.052, level * 0.38, delay + 0.003, pan),
    band(2830, 1340, hard ? 0.091 : 0.059, level * 0.82, delay + 0.001, { pan, q: 1.2 }),
  ];
}

const buttonSound = (parts, interval = 0.075) => ({ lane: 'controls', priority: 1, interval, parts });
const physicalSound = (parts, interval = 0.11, priority = 1) => ({ lane: 'board', priority, interval, parts });
const presentation = (parts, priority = 2, interval = 0.12) => ({ lane: 'events', priority, interval, parts });

export const GAME_CUES = {
  ui: buttonSound([knock(675, 470, 0.044, 0.045), band(2510, 1300, 0.043, 0.055)]),
  select: buttonSound([knock(977, 790, 0.063, 0.066), band(3200, 1720, 0.053, 0.058)]),
  confirm: buttonSound([
    band(2950, 1250, 0.074, 0.072),
    ...bar(62, 0.092, 0, 0.13, -0.1), ...bar(69, 0.105, 0.058, 0.2, 0.15),
  ], 0.12),
  cancel: buttonSound([
    ...bar(59, 0.086, 0, 0.14, 0.08), ...bar(55, 0.075, 0.065, 0.15, -0.08),
    band(1700, 740, 0.090, 0.041),
  ], 0.12),
  buy: buttonSound([
    band(3100, 1550, 0.085, 0.082, 0, { pan: -0.14, q: 1.9 }),
    ...bar(66, 0.115, 0.015, 0.18, -0.14), ...bar(73, 0.128, 0.082, 0.28, 0.16),
  ], 0.14),
  sell: buttonSound([
    band(3600, 1800, 0.11, 0.085, 0, { pan: -0.1, q: 2.1 }),
    ...bar(69, 0.11, 0.01, 0.19, -0.18), ...bar(74, 0.118, 0.085, 0.24, 0.04),
    ...bar(78, 0.132, 0.165, 0.36, 0.2),
  ], 0.15),
  loan: buttonSound([
    knock(165, 92, 0.14, 0.15, 0, -0.06),
    ...bar(57, 0.11, 0.025, 0.22, -0.12), ...bar(62, 0.105, 0.11, 0.28, 0.12),
    band(1350, 620, 0.13, 0.062, 0.02, { q: 1.1 }),
  ], 0.16),
  lucky: presentation([
    band(3900, 2100, 0.16, 0.078, 0, { pan: -0.2, q: 1.8 }),
    ...bar(74, 0.115, 0.0, 0.22, -0.22), ...bar(78, 0.118, 0.075, 0.24, -0.06),
    ...bar(81, 0.125, 0.15, 0.28, 0.1), ...bar(86, 0.138, 0.23, 0.48, 0.24),
  ], 2, 0.14),
  diceStart: physicalSound([
    ...diceImpact(0.004, 0.18, -0.11), ...diceImpact(0.077, 0.225, 0.21),
    ...diceImpact(0.177, 0.14, -0.33), ...diceImpact(0.291, 0.11, 0.11),
    band(930, 1910, 0.34, 0.075, 0, { q: 0.51, attack: 0.017 }),
  ], 0.22),
  diceLand: physicalSound([
    ...diceImpact(0.003, 0.32, 0.14, true), ...diceImpact(0.069, 0.099, -0.20),
    ...bar(74, 0.088, 0.12, 0.18, 0.08),
  ], 0.17),
  step: physicalSound([
    knock(225, 130, 0.065, 0.10, 0, -0.04), band(970, 590, 0.074, 0.092, 0.008, { q: 1.8 }),
  ], 0.105),
  arrival: physicalSound([
    knock(222, 114, 0.15, 0.197),
    ...bar(62, 0.085, 0.026, 0.28, -0.1), ...bar(69, 0.08, 0.088, 0.230, 0.12),
  ], 0.13, 2),
  warning: presentation([
    ...bar(73, 0.135, 0, 0.14), ...bar(73, 0.115, 0.19, 0.21),
  ], 1, 0.3),
  draw: presentation([
    band(850, 2450, 0.205, 0.23, 0.012, { pan: -0.22, attack: 0.023 }),
    band(2750, 1050, 0.25, 0.19, 0.112, { pan: 0.23, attack: 0.035, q: 0.42 }),
    knock(155, 83, 0.149, 0.13, 0.275),
  ]),
  reveal: presentation([
    band(1900, 1700, 0.16, 0.15, 0.0, { pan: -0.09, attack: 0.012 }),
    ...bar(69, 0.132, 0.06, 0.26, -0.2), ...bar(73, 0.122, 0.13, 0.28, 0.10),
    ...bar(76, 0.14, 0.25, 0.42, 0.22),
  ]),
  income: presentation([
    band(3250, 1250, 0.13, 0.105, 0.02, { pan: -0.18, q: 2.3 }),
    knock(147, 82, 0.15, 0.14, 0.028),
    ...bar(62, 0.125, 0.04, 0.28, -0.20), ...bar(69, 0.128, 0.13, 0.26, 0.08),
    ...bar(73, 0.073, 0.25, 0.49, -0.30), ...bar(78, 0.137, 0.25, 0.58, 0.23),
  ]),
  positive: presentation([
    ...bar(66, 0.121, 0, 0.24, -0.12), ...bar(69, 0.12, 0.107, 0.29, 0.14),
    ...bar(74, 0.14, 0.224, 0.55, 0.19),
  ]),
  negative: presentation([
    knock(170, 81, 0.26, 0.17, 0.013),
    ...bar(66, 0.102, 0.032, 0.41, 0.08), ...bar(60, 0.11, 0.19, 0.48, -0.11),
    band(910, 340, 0.31, 0.074, 0.061, { q: 0.68, attack: 0.022 }),
  ]),
  mixed: presentation([
    ...bar(66, 0.112, 0.0, 0.21, -0.15), ...bar(62, 0.105, 0.126, 0.25, 0.15),
    ...bar(69, 0.108, 0.256, 0.42, 0.04),
  ]),
  market: presentation([
    band(480, 2860, 0.58, 0.27, 0.0, { q: 0.52, attack: 0.045, pan: -0.23 }),
    band(2370, 590, 0.51, 0.24, 0.18, { q: 0.50, attack: 0.065, pan: 0.21 }),
    knock(148, 61, 0.39, 0.22, 0.226),
    ...bar(54, 0.118, 0.26, 0.54, -0.13), ...bar(61, 0.097, 0.39, 0.55, 0.16),
    ...bar(67, 0.099, 0.48, 0.42, 0.1),
  ], 3),
  round: presentation([
    ...bar(57, 0.16, 0, 0.34, -0.1), ...bar(62, 0.126, 0.18, 0.43, -0.12),
    ...bar(66, 0.124, 0.32, 0.52, 0.14), ...bar(69, 0.12, 0.44, 0.59, 0.22),
  ], 3),
  award: presentation([
    swell(73.42, 0.96, 0.22, 0, { attack: 0.11 }),
    ...bar(69, 0.176, 0.11, 0.82, -0.24), ...bar(73, 0.158, 0.44, 0.92, 0.04),
    ...bar(76, 0.172, 0.77, 1.2, 0.23),
    swell(146.83, 1.22, 0.14, 0.76, { attack: 0.18, pan: -0.2 }),
    band(618, 2230, 1.13, 0.16, 0.0, { attack: 0.18, q: 0.42, pan: 0.2 }),
  ], 4),
  awardCrown: presentation([
    knock(169, 69, 0.43, 0.34),
    band(3610, 1410, 0.58, 0.29, 0.0, { attack: 0.013, pan: -0.32, q: 0.6 }),
    band(3976, 810, 0.56, 0.24, 0.11, { attack: 0.023, pan: 0.32, q: 0.65 }),
    ...bar(62, 0.137, 0.058, 1.46, -0.15), ...bar(66, 0.116, 0.086, 1.63, 0.13),
    ...bar(74, 0.212, 0.143, 1.48, 0.23), ...bar(78, 0.124, 0.334, 1.37, -0.2),
    swell(440, 1.63, 0.097, 0.42, { attack: 0.22, pan: -0.24 }),
  ], 4),
};
