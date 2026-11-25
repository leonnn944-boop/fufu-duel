import { ASSET_CARDS, MARKET_EVENTS } from '../market-data.mjs';
import { BOARD } from '../board-data.mjs';
export { BOARD };

export function moveByDice(position, die, boardSize = BOARD.length) {
  if (!Number.isInteger(position) || position < 0 || position >= boardSize) throw new RangeError('invalid position');
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new RangeError('die must be 1–6');
  return (position + die) % boardSize;
}

export function traversedTiles(position, die, boardSize = BOARD.length) {
  moveByDice(position, die, boardSize);
  return Array.from({ length: die }, (_, step) => (position + step + 1) % boardSize);
}

export function currentAssets(player) {
  return player.cash + player.holdings.reduce((sum, holding) => sum + holding.price, 0);
}

// The historic text says "highest assets" without defining ties or gross/net.
// This demonstration uses current cash + market-valued holdings, then seat order.
export function marketDrawerIndex(players) {
  if (!players.length) throw new Error('no players');
  return players.reduce((best, player, index) =>
    currentAssets(player) > currentAssets(players[best]) ? index : best, 0);
}

export function availableAssets(round) {
  return ASSET_CARDS.filter(card => card.category !== 'crypto' || round >= 4);
}

export function unusedAssets(round, usedIds) {
  return availableAssets(round).filter(card => !usedIds.has(card.id));
}

export function applyMarketEvent(holdings, returns, event) {
  const categories = ['stock', 'property', 'venture', 'metal', 'crypto', 'forex'];
  const nextHoldings = holdings.map(holding => {
    const index = categories.indexOf(holding.category);
    if (index < 0) return { ...holding };
    return { ...holding, price: holding.price * (1 + event.assetEffect[index]) };
  });
  const nextReturns = Object.fromEntries(categories.map((category, i) => [
    category, Math.round(returns[category] * (1 + event.yieldEffect[i]) * 100) / 100,
  ]));
  return { holdings: nextHoldings, returns: nextReturns };
}

export function pendingPassiveIncome(holdings, returns, round) {
  return holdings.filter(h => h.bought <= round).reduce((sum, h) => {
    const rate = h.category === 'special' ? h.passiveRate : returns[h.category] || 0;
    return sum + h.price * rate;
  }, 0);
}

export function netWorth(cash, holdings, debt) {
  return cash + holdings.reduce((sum, h) => sum + h.price, 0) - debt;
}

export function drawMarketEvent(usedIds, random = Math.random) {
  const pool = MARKET_EVENTS.filter(event => !usedIds.has(event.id));
  if (!pool.length) throw new Error('no market events remain');
  return pool[Math.floor(random() * pool.length)];
}
