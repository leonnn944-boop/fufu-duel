import { AUDIO_DEFAULTS, normalizeAudioMix } from './game-audio.mjs';

const MIX_KEY = 'fufuduel:audio-mix';

export function readAudioMix() {
  try {
    return normalizeAudioMix(JSON.parse(localStorage.getItem(MIX_KEY)));
  } catch {
    return { ...AUDIO_DEFAULTS };
  }
}

function saveAudioMix(mix) {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    // A storage restriction does not prevent adjusting the current mix.
  }
}

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function createAudioSettings(audio, setSoundEnabled) {
  const dialog = element('dialog', 'audio-settings');
  dialog.id = 'audio-settings-dialog';
  dialog.setAttribute('aria-labelledby', 'audio-settings-title');
  const heading = element('div', 'audio-settings-header');
  const title = element('h2', '', '聲音設定');
  title.id = 'audio-settings-title';
  const done = element('button', 'secondary-button', '完成');
  done.type = 'button';
  done.addEventListener('click', () => dialog.close());
  heading.append(title, done);

  const master = document.createElement('input');
  master.type = 'checkbox';
  master.id = 'audio-master-enabled';
  const masterField = element('label', 'audio-master-setting');
  masterField.append(element('span', '', '開啟聲音'), master);
  master.addEventListener('change', () => setSoundEnabled(master.checked));

  const controls = element('div', 'audio-mix');
  const sliders = new Map();
  for (const [key, controlLabel] of [['effects', '遊戲音效'], ['music', '背景音樂']]) {
    const id = 'audio-mix-' + key;
    const field = element('div', 'audio-mix-field');
    const label = element('label', '', controlLabel);
    label.htmlFor = id;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.id = id;
    const value = element('output', 'audio-mix-value');
    value.htmlFor = id;
    sliders.set(key, { slider, value });
    slider.addEventListener('input', () => {
      applyMix({ ...audio.mix, [key]: slider.valueAsNumber / 100 });
    });
    slider.addEventListener('change', () => {
      saveAudioMix(audio.mix);
      if (key === 'effects') audio.cue('confirm');
    });
    field.append(label, value, slider);
    controls.append(field);
  }

  const status = element('p', 'audio-settings-status');
  status.id = 'audio-settings-status';
  status.setAttribute('aria-live', 'polite');

  const preview = element('button', 'secondary-button', '試聽音效');
  preview.type = 'button';
  preview.id = 'audio-test-cue';
  preview.addEventListener('click', async () => {
    if (!audio.enabled) {
      status.textContent = '目前為靜音，請先勾選「開啟聲音」。';
      return;
    }
    if (audio.mix.effects === 0) {
      status.textContent = '遊戲音效音量為 0%，請先調高音量。';
      return;
    }
    const played = await audio.previewCue('lucky');
    status.textContent = played ? '已播放試聽音效。' : '瀏覽器尚未解鎖音訊，再點一次即可播放。';
  });

  const reset = element('button', 'secondary-button', '重設音量');
  reset.type = 'button';
  reset.addEventListener('click', () => {
    applyMix(AUDIO_DEFAULTS);
    saveAudioMix(audio.mix);
    void audio.previewCue('confirm');
    status.textContent = '已重設為預設音量。';
  });
  const actions = element('div', 'audio-settings-footer');
  actions.append(preview, reset);
  dialog.append(heading, masterField, controls, actions, status);
  document.body.append(dialog);

  function refresh() {
    master.checked = audio.enabled;
    for (const [key, { slider, value }] of sliders) {
      const percent = Math.round(audio.mix[key] * 100);
      slider.value = String(percent);
      value.value = percent + '%';
    }
  }

  function applyMix(mix) {
    audio.setMix(mix);
    refresh();
  }

  return {
    open() {
      status.textContent = '';
      refresh();
      if (!dialog.open) dialog.showModal();
    },
    refresh,
  };
}
