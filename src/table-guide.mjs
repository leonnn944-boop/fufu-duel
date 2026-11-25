const chapters = ['goal', 'career', 'dice', 'market'];

export function guideChapter(phase) {
  if (['setup', 'careerResult', 'income', 'incomeResult'].includes(phase)) return 'career';
  if (['roll', 'deck', 'generalChoice', 'reveal', 'revealGroup', 'receipt', 'coInvestTarget', 'coInvest'].includes(phase)) return 'dice';
  if (['loanDecision', 'investIdle', 'offer', 'marketReady', 'marketReveal'].includes(phase)) return 'market';
  return 'goal';
}

export function createTableGuide(game, openBoardIndex) {
  const get = id => document.getElementById(id);
  const dialog = get('guide-dialog');
  const reader = dialog.querySelector('.field-guide-reader');
  const tabs = Array.from(dialog.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => get(tab.getAttribute('aria-controls')));
  const previous = get('guide-previous');
  const next = get('guide-next');
  const loan = get('guide-example-loan');
  const board = get('guide-tool-board-index');
  const score = get('guide-tool-score');
  const home = get('guide-tool-home');
  const audio = get('guide-tool-audio');
  const sound = get('guide-tool-sound');
  const onboarding = get('guide-tool-onboarding');
  const crowd = get('guide-tool-crowd');
  const copy = get('guide-tool-copy');
  const message = dialog.querySelector('.guide-tool-message');
  let page = 0;
  let context;
  dialog.addEventListener('close', () => {
    get('guide-slip-cash')?.classList.remove('delta-good', 'delta-bad');
    get('guide-slip-debt')?.classList.remove('delta-good', 'delta-bad');
    if (!dialog.open) get('guide-button').focus({preventScroll: true});
  });

  function go(index, focusTab = false) {
    page = index;
    for (const [i, tab] of tabs.entries()) {
      const selected = i === page;
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute('aria-selected', String(selected));
      panels[i].hidden = !selected;
    }
    previous.disabled = page === 0;
    next.textContent = page === chapters.length - 1 ? '讀完，返回' : '下一頁';
    get('guide-position').textContent = (page + 1) + ' / ' + chapters.length;
    reader.scrollTop = 0;
    if (focusTab) tabs[page].focus({preventScroll: true});
  }

  tabs.forEach((tab, index) => {
    tab.onclick = () => go(index);
    tab.onkeydown = event => {
      let destination;
      switch (event.key) {
        case 'ArrowLeft': destination = (index - 1 + tabs.length) % tabs.length; break;
        case 'ArrowRight': destination = (index + 1) % tabs.length; break;
        case 'Home': destination = 0; break;
        case 'End': destination = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      go(destination, true);
    };
  });
  previous.onclick = () => go(page - 1, page === 1);
  next.onclick = () => page < tabs.length - 1 ? go(page + 1) : dialog.close();

  const flashSlip = (id, kind) => {
    const el = get(id);
    if (!el) return;
    el.classList.remove('delta-good', 'delta-bad');
    void el.offsetWidth;
    el.classList.add(kind === 'good' ? 'delta-good' : 'delta-bad');
  };

  loan.onclick = () => {
    const borrowed = loan.getAttribute('aria-pressed') !== 'true';
    loan.setAttribute('aria-pressed', String(borrowed));
    get('guide-cash').textContent = borrowed ? '25 萬' : '20 萬';
    get('guide-debt').textContent = borrowed ? '15 萬' : '10 萬';
    flashSlip('guide-slip-cash', borrowed ? 'good' : 'bad');
    flashSlip('guide-slip-debt', borrowed ? 'bad' : 'good');
    get('guide-example-result').textContent = borrowed
      ? '綠框現金增 5 萬、紅框負債增 5 萬，淨資產仍是 40 萬。'
      : '已還原：現金與負債回到試算初值。';
  };

  board.onclick = () => openBoardIndex(game, board);
  score.onclick = () => get('score-dialog').showModal();
  sound.onclick = () => game.setSoundEnabled(!game.scene.soundOn);
  audio.onclick = () => game.openAudioSettings();
  const refreshOnboardingTool = () => {
    if (!onboarding || !game.onboarding) return;
    const on = !game.onboarding.isDismissedAll();
    onboarding.textContent = on ? '新手提示：開' : '重開新手提示';
    onboarding.setAttribute('aria-pressed', String(on));
  };
  if (onboarding) {
    onboarding.onclick = () => {
      if (!game.onboarding) return;
      if (game.onboarding.isDismissedAll()) {
        game.onboarding.reset();
        message.textContent = '已重新開啟第 1 回合新手階段提示。';
      } else {
        game.onboarding.dismissAll();
        message.textContent = '已關閉新手階段提示，隨時可在此重開。';
      }
      refreshOnboardingTool();
      game.onboarding.sync(game);
    };
  }
  crowd.onclick = () => game.inspectCrowd();
  copy.onclick = async () => {
    await game.copyInvite();
    message.textContent = get('notice').textContent;
  };
  home.onclick = () => location.assign(location.pathname);

  return function showGuide() {
    if (dialog.open) return;
    const playing = Boolean(game.state && game.state.phase !== 'lobby');
    const session = get('guide-session');
    session.hidden = !playing;
    session.textContent = playing ? (game.solo ? '已暫停，關閉手冊後繼續' : '連線對局持續計時') : '';
    const phaseChapter = guideChapter(game.state?.phase);
    const nextContext = (game.code ?? '') + '/' + phaseChapter;
    if (nextContext !== context) {
      context = nextContext;
      page = chapters.indexOf(phaseChapter);
    }
    score.hidden = !playing;
    board.hidden = !playing;
    crowd.hidden = true;
    if (playing) {
      game.updateCrowdControl();
      crowd.hidden = get('crowd-button').hidden;
      crowd.textContent = get('crowd-button').textContent;
    }
    home.hidden = !game.code;
    copy.hidden = !game.code || Boolean(game.solo);
    message.textContent = '';
    sound.hidden = !game.scene;
    audio.disabled = !game.scene;
    sound.textContent = game.scene?.soundOn ? '音效：開' : '音效：關';
    sound.setAttribute('aria-pressed', String(Boolean(game.scene?.soundOn)));
    if (onboarding) {
      onboarding.hidden = !game.onboarding;
      refreshOnboardingTool();
    }
    go(page);
    dialog.showModal();
    tabs[page].focus({preventScroll: true});
  };
}
