import { RoomEngine } from './room-engine.mjs';
import { MARKET_PRESENTATION_MS } from './presentation-timing.mjs';
import { unusedAssets } from './rules.mjs';

const saveKey = 'fufuduel:single-player:v1';
const seats = ['A', 'B'];
const reserve = player => Math.max(150_000, Math.round(player.career.fixedExpense * .35));

export class SoloMatch {
  static restore(storage) {
    try {
      const saved = JSON.parse(storage.getItem(saveKey));
      if (saved?.version !== 1 || !Number.isSafeInteger(saved.revision) ||
          saved.revision < 0 || !Array.isArray(saved.state?.players) ||
          saved.state.players.map(player => player.seat).join() !== seats.join()) return null;
      return new SoloMatch(storage, RoomEngine.fromSnapshot(saved.state), saved.nickname, saved.revision);
    } catch {
      return null;
    }
  }

  constructor(storage, engine = new RoomEngine(Math.random, 2), nickname = '你', revision = 0) {
    this.storage = storage;
    this.engine = engine;
    this.revision = revision;
    this.nickname = nickname || '你';
    this.players = [{ seat: 'A', nickname: this.nickname }, { seat: 'B', nickname: '電腦對手' }];
    this.readingPaused = false;
    this.setClock();
  }

  setClock() {
    const { phase, round } = this.engine.s;
    let delay = Infinity;
    if (phase === 'marketReveal') delay = MARKET_PRESENTATION_MS;
    if (phase === 'summary' && round < 5) delay = 12_000;
    this.remainingMs = delay;
    this.deadline = this.readingPaused ? Infinity : Date.now() + delay;
  }

  setReadingPaused(paused) {
    if (this.readingPaused === paused) return;
    this.readingPaused = paused;
    if (paused) {
      this.remainingMs = Math.max(0, this.deadline - Date.now());
      this.deadline = Infinity;
    } else {
      this.deadline = Date.now() + this.remainingMs;
    }
  }

  save() {
    try {
      this.storage.setItem(saveKey, JSON.stringify({
        version: 1, nickname: this.nickname, revision: this.revision, state: this.engine.snapshot(),
      }));
      return true;
    } catch {
      return false;
    }
  }

  result() {
    return {
      code: 'SOLO', seat: 'A', revision: this.revision, deadline: this.deadline,
      serverNow: Date.now(), targetCount: 2, players: this.players,
      actor: this.engine.s.players[this.engine.actor()]?.seat, state: this.engine.snapshot(),
    };
  }

  commit(mutation) {
    const previous = structuredClone(this.engine.s);
    try {
      mutation();
    } catch (error) {
      this.engine.s = previous;
      throw error;
    }
    this.revision++;
    this.setClock();
    this.saved = this.save();
    return this.result();
  }

  play(type, payload) {
    return this.commit(() => this.engine.action('A', type, payload));
  }

  advance(canRead, isAffordable) {
    if (this.readingPaused) return null;
    const s = this.engine.s;
    if (s.phase === 'marketReveal' && Date.now() >= this.deadline) {
      return this.commit(() => this.engine.settle());
    }
    if (s.phase === 'summary' && s.round < 5 && Date.now() >= this.deadline) {
      return this.commit(() => this.engine.nextRound());
    }
    if (this.engine.actor() !== 1 || !canRead) return null;
    const action = this.botAction(s, isAffordable);
    return action && this.commit(() => this.engine.action('B', ...action));
  }

  botAction(s, isAffordable) {
    const regular = {
      setup: 'drawCareer', careerResult: 'nextCareer', income: 'claimIncome',
      incomeResult: 'nextIncome', roll: 'roll', deck: 'drawAll', marketReady: 'drawMarket',
    }[s.phase];
    if (regular) return [regular];
    const player = s.players[1];
    switch (s.phase) {
      case 'revealGroup': {
        const cardIndex = s.cards.findIndex(card => card.status === 'pending');
        if (cardIndex < 0) return ['nextStep'];
        const options = s.cards[cardIndex].rows.filter(card => isAffordable(card, s));
        // Treat an option with no immediate commitment as the baseline when capital is tight.
        const option = options.find(card => /^不|^放棄|^拒絕/u.test(card.title)) || options[0];
        if (option) return ['chooseCard', {cardIndex, id: option.id}];
        return null;
      }
      case 'coInvestTarget':
        return ['chooseCoInvestor', {seat: 'A'}];
      case 'coInvest':
        return ['resolveCoInvest', {agreed: player.cash - s.coInvest.cost >= reserve(player)}];
      case 'loanDecision': {
        const amount = Math.floor(Math.min(player.debt, player.cash - reserve(player) * 2));
        return ['decideLoan', amount > 0 ? {kind: 'repay', amount} : {kind: 'skip'}];
      }
      case 'investIdle': {
        if (player.cash <= reserve(player)) return ['nextStep'];
        const purchased = new Set(player.holdings.map(holding => holding.category));
        const available = new Set(unusedAssets(s.round, s.usedAssets).map(card => card.category));
        const categories = ['stock', 'metal', 'property', 'venture', 'forex', 'crypto']
          .filter(category => !player.investCategories.has(category) && available.has(category))
          .sort((left, right) => Number(purchased.has(left)) - Number(purchased.has(right)));
        return categories.length ? ['drawAsset', {category: categories[0]}] : ['nextStep'];
      }
      case 'offer':
        return ['resolveOffer', {buy: player.cash - s.offer.price >= reserve(player)}];
      default:
        return null;
    }
  }
}
