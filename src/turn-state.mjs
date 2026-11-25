export const MAX_INVESTMENT_DRAWS = 3;
export const MAX_FATE_PER_TYPE = 3;
export const INVESTMENT_CATEGORIES = Object.freeze(['stock','property','venture','metal','crypto','forex']);

export function canDrawInvestment({ phase, player, category, round, unusedCards }) {
  if (phase !== 'investIdle') return '請先完成目前階段';
  if (!INVESTMENT_CATEGORIES.includes(category)) return '沒有此投資類別';
  if (category === 'crypto' && round < 4) return '加密貨幣第 4 回合才開放';
  if (player.investDraws >= MAX_INVESTMENT_DRAWS) return '本回合已抽滿 3 張';
  if (player.investCategories.has(category)) return '本回合已抽過此類別';
  if (!unusedCards.some(card => card.category === category)) return '此類別已無卡牌';
  return null;
}

export function drawInvestmentCard({ phase, player, category, round, unusedCards, random = Math.random }) {
  const issue = canDrawInvestment({phase, player, category, round, unusedCards});
  if (issue) return { issue, card: null };
  const pool = unusedCards.filter(card => card.category === category);
  const card = pool[Math.floor(random() * pool.length)];
  player.investDraws++;
  player.investCategories.add(category);
  return { issue: null, card };
}

export function landingFateQueue(tile, playerIndex, drawnCareer = 0, drawnGeneral = 0) {
  if (!tile || tile.type === 'logo') return [];
  const career = Math.max(0, Math.min(tile.career ?? 0, MAX_FATE_PER_TYPE - drawnCareer));
  const general = Math.max(0, Math.min(tile.general ?? 0, MAX_FATE_PER_TYPE - drawnGeneral));
  return [
    ...Array.from({length: career}, () => ({kind:'career',playerIndex})),
    ...Array.from({length: general}, () => ({kind:'general',playerIndex})),
  ];
}

export function legalPhaseAction(current, required) { return current === required; }
