const ONBOARDING_KEY = 'fufuduel:onboarding-dismissed';

const PHASE_TIPS = Object.freeze({
  setup: { badge: '開局', text: '先抽職業，決定起始現金與貸款。' },
  careerResult: { badge: '起家', text: '淨資產由現金加投資、扣除負債算出。' },
  income: { badge: '收入', text: '領收入時會同步扣支出與還款。' },
  incomeResult: { badge: '結算', text: '確認入帳後按「繼續」擲骰。' },
  roll: { badge: '走格', text: '擲骰前進，經過 ✦ 另得小確幸。' },
  deck: { badge: '抽牌', text: '點牌堆翻開本格命運卡。' },
  revealGroup: { badge: '命運', text: '上方切手牌，待決定牌請選方案。' },
  loanDecision: { badge: '借貸', text: '借款不改淨資產；第 5 回合不可新借。' },
  investIdle: { badge: '投資', text: '最多看 3 類投資，或賣出變現。' },
  offer: { badge: '機會', text: '比對買入後餘額，決定買或放棄。' },
  marketReady: { badge: '市場', text: '資產最高者翻開共同市場事件。' },
  marketReveal: { badge: '事件', text: '市場事件同步調整全體資產市值。' },
});

function readDismissed() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(dismissed) {
  try {
    if (dismissed) localStorage.setItem(ONBOARDING_KEY, '1');
    else localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Storage restriction does not block dismissing tips for this session.
  }
}

export class OnboardingTips {
  constructor(stage) {
    this.dismissedAll = readDismissed();
    this.dismissedPhases = new Set();
    this.currentPhase = null;
    this.el = document.createElement('aside');
    this.el.id = 'onboarding-tip';
    this.el.className = 'onboarding-tip';
    this.el.setAttribute('role', 'note');
    this.el.setAttribute('aria-label', '新手階段提示');
    this.el.hidden = true;

    this.badge = document.createElement('span');
    this.badge.className = 'onboarding-tip-badge';
    this.copy = document.createElement('p');
    this.copy.className = 'onboarding-tip-copy';

    const body = document.createElement('div');
    body.className = 'onboarding-tip-body';
    body.append(this.badge, this.copy);

    const actions = document.createElement('div');
    actions.className = 'onboarding-tip-actions';
    this.ack = document.createElement('button');
    this.ack.type = 'button';
    this.ack.className = 'onboarding-tip-btn';
    this.ack.textContent = '知道了';
    this.ack.onclick = () => {
      if (this.currentPhase) this.dismissedPhases.add(this.currentPhase);
      this.el.hidden = true;
    };

    this.mute = document.createElement('button');
    this.mute.type = 'button';
    this.mute.className = 'onboarding-tip-btn muted';
    this.mute.textContent = '不再提示';
    this.mute.onclick = () => {
      this.dismissAll();
    };

    actions.append(this.ack, this.mute);
    this.el.append(body, actions);
    stage.append(this.el);
  }

  dismissAll() {
    this.dismissedAll = true;
    writeDismissed(true);
    this.el.hidden = true;
  }

  reset() {
    this.dismissedAll = false;
    this.dismissedPhases.clear();
    writeDismissed(false);
  }

  isDismissedAll() {
    return this.dismissedAll;
  }

  sync(game) {
    const s = game.state;
    const phase = s?.phase;
    const tip = phase && PHASE_TIPS[phase];
    const moving = Boolean(game.scene?.motion || game.scene?.diceMotion || game.landingPending || game.cardDrawing || game.incomeCeremony || game.careerDrawing || game.assetDrawing);
    const readingPhase = ['careerResult', 'incomeResult', 'marketReveal'].includes(phase);
    const show = Boolean(
      !this.dismissedAll
      && tip
      && game.sceneReady
      && s.round === 1
      && !game.scene?.overview
      && !moving
      && !this.dismissedPhases.has(phase)
      && (game.canAct() || readingPhase)
    );
    this.el.hidden = !show;
    if (!show) return;
    this.currentPhase = phase;
    this.el.dataset.phase = phase;
    this.badge.textContent = `新手 · ${tip.badge}`;
    this.copy.textContent = tip.text;
  }
}
