import { netWorth } from './rules.mjs';

const integer = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });
function dollars(value) {
  const whole = Math.round(value);
  return (whole < 0 ? '−$' : '$') + integer.format(Math.abs(whole));
}

export function roundStandings(state) {
  return state.players.map((player, index) => {
    const cash = player.cash ?? 0;
    const debt = player.debt ?? 0;
    const holdings = player.holdings ?? [];
    const amount = netWorth(cash, holdings, debt);
    const before = state.roundStartTotals?.[index];
    return { player, cash, debt, investments: netWorth(0, holdings, 0), amount,
      change: Number.isFinite(before) ? amount - before : null };
  }).sort((a, b) => b.amount - a.amount);
}

export function signedChange(amount) {
  if (!Number.isFinite(amount)) return '';
  const displayed = Math.round(amount);
  if (displayed === 0) return '持平';
  return (displayed > 0 ? '+' : '') + dollars(displayed);
}

export function historyByRound(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.round)) groups.set(entry.round, []);
    groups.get(entry.round).push(entry);
  }
  return groups;
}

function el(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

export function displayRoundResults({ state, seat, displayName, openHistory }) {
  const final = state.round === 5;
  const ordered = roundStandings(state);
  const personalIndex = ordered.findIndex(row => row.player.seat === seat);
  const personal = ordered[personalIndex];
  const receipt = el('section', 'round-receipt');
  const copy = el('div', 'receipt-copy');
  const title = final ? '五回合總成績' : '第 ' + state.round + ' 回合結算';
  copy.append(el('h3', 'receipt-title', title));
  if (personal) {
    const rank = el('p', 'receipt-personal');
    rank.append(el('span', '', '你排第 '), el('b', '', String(personalIndex + 1)),
      el('span', '', ' 名'), el('small', '', '／' + ordered.length + ' 人'));
    copy.append(rank);
    if (final) copy.append(el('p', 'receipt-worth', '淨資產 ' + dollars(personal.amount)));
  }
  receipt.append(copy);
  if (!final && personal && personal.change !== null) {
    const change = el('div', 'receipt-change');
    change.append(el('small', '', '本回合淨變動'), el('b', '', signedChange(personal.change)));
    receipt.append(change);
  }
  const review = el('button', 'receipt-review', final ? '本局回顧' : '回合紀錄');
  review.type = 'button';
  review.setAttribute('aria-haspopup', 'dialog');
  review.onclick = openHistory;
  receipt.append(review);
  const standings = el('div', 'summary-standings result-standings');
  standings.setAttribute('role', 'list');
  standings.setAttribute('aria-label', '全員淨資產排名');
  ordered.forEach(({ player, amount, change }, index) => {
    const row = el('div', 'summary-place');
    row.setAttribute('role', 'listitem');
    row.dataset.rank = String(index + 1);
    const rank = el('span', 'summary-rank', String(index + 1));
    rank.setAttribute('aria-label', '第 ' + (index + 1) + ' 名');
    const name = el('strong', 'result-player', displayName(player.seat));
    name.title = displayName(player.seat);
    if (player.seat === seat) {
      row.classList.add('result-mine');
      name.append(el('span', 'result-seat', '你'));
    }
    const value = el('b', 'result-value');
    value.append(el('span', 'result-value-label', '淨資產'), document.createTextNode(dollars(amount)));
    row.append(rank, name, value);
    if (!final && change !== null) row.append(el('small', 'result-delta', '本回合 ' + signedChange(change)));
    standings.append(row);
  });
  return { receipt, standings };
}
