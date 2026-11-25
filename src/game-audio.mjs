import { GAME_CUES } from './game-sound-design.mjs';

export const AUDIO_DEFAULTS = Object.freeze({ effects: 0.82, music: 0.46 });
const SCORE_URL = new URL('../assets/audio/dusk-exchange.mp3', import.meta.url);
const SCORE_SCENES = Object.freeze({ lobby: 0.55, board: 0.4, awards: 0.105 });
const MASTER_LEVEL = 0.86;
const VOICE_LIMIT = 24;
const KEY_HISTORY_LIMIT = 512;
const GESTURE_WINDOW = 250;

export function normalizeAudioMix(value) {
  const channel = key => Number.isFinite(value?.[key])
    ? Math.max(0, Math.min(1, value[key]))
    : AUDIO_DEFAULTS[key];
  return { effects: channel('effects'), music: channel('music') };
}

export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.master = null;
    this.effectsBus = null;
    this.musicBus = null;
    this.mix = { ...AUDIO_DEFAULTS };
    this.scoreScene = 'lobby';
    this.scoreBuffer = null;
    this.scoreDownload = null;
    this.scoreSource = null;
    this.scoreOffset = 0;
    this.scoreStartedAt = 0;
    this.scoreRetryAt = 0;
    this.voices = new Set();
    this.tails = new Set();
    this.seen = new Set();
    this.log = [];
    this.lastCueTime = new Map();
    this.gestureAt = -Infinity;
    this.pendingCue = null;
    this.noise = null;
    this.noiseTurns = 0;

    this.gesture = event => {
      if (!this.enabled || !event.isTrusted || event.repeat) return;
      if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
      this.gestureAt = performance.now();
      void this.unlock();
    };
    document.addEventListener('pointerdown', this.gesture, { capture: true, passive: true });
    document.addEventListener('touchend', this.gesture, { capture: true, passive: true });
    document.addEventListener('click', this.gesture, { capture: true, passive: true });
    document.addEventListener('keydown', this.gesture, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseOutput();
      else void this.startScore();
    });
    window.addEventListener('pagehide', () => this.pauseOutput());
    window.addEventListener('pageshow', () => { void this.startScore(); });
  }

  async unlock() {
    if (!this.enabled || document.hidden) return false;
    try {
      if (this.context?.state === 'closed') {
        this.context = null;
        this.master = null;
        this.effectsBus = null;
        this.musicBus = null;
        this.noise = null;
      }
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return false;
        this.connectOutput(new Context());
      }
      if (this.context.state !== 'running') await this.context.resume();
      const pending = this.pendingCue;
      this.pendingCue = null;
      if (pending && performance.now() - pending.time <= GESTURE_WINDOW) {
        this.playCue(pending.name, pending.key, pending.motif, pending.force);
      }
      void this.startScore();
      return this.context.state === 'running';
    } catch {
      // The game remains playable while browser autoplay or an output device is unavailable.
      return false;
    }
  }

  async previewCue(name = 'confirm') {
    if (!this.enabled || this.mix.effects === 0 || document.hidden) return false;
    this.gestureAt = performance.now();
    const ready = await this.unlock();
    if (!ready) return false;
    return this.cue(name, null, { force: true });
  }

  connectOutput(context) {
    this.context = context;
    this.master = context.createGain();
    this.effectsBus = context.createGain();
    this.musicBus = context.createGain();
    this.master.gain.value = this.enabled ? MASTER_LEVEL : 0;
    this.effectsBus.gain.value = this.mix.effects;
    this.musicBus.gain.value = 0;
    this.effectsBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(context.destination);
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.master) this.master.gain.value = this.enabled ? MASTER_LEVEL : 0;
    if (!this.enabled) {
      this.pauseOutput();
      return;
    }
    if (navigator.userActivation?.isActive) void this.unlock();
    else void this.startScore();
  }

  setMix(value) {
    this.mix = normalizeAudioMix(value);
    if (this.effectsBus) {
      const time = this.context.currentTime;
      this.effectsBus.gain.cancelScheduledValues(time);
      this.effectsBus.gain.setTargetAtTime(this.mix.effects, time, 0.018);
    }
    if (this.mix.effects === 0) this.pendingCue = null;
    this.updateScoreGain();
    if (this.mix.music > 0) void this.startScore();
  }

  setScoreScene(scene) {
    if (scene === this.scoreScene || !Object.hasOwn(SCORE_SCENES, scene)) return;
    this.scoreScene = scene;
    this.updateScoreGain();
  }

  updateScoreGain(fadeIn = false) {
    if (!this.musicBus) return;
    const time = this.context.currentTime;
    const gain = this.musicBus.gain;
    gain.cancelScheduledValues(time);
    if (fadeIn) gain.setValueAtTime(0, time);
    gain.setTargetAtTime(this.mix.music * SCORE_SCENES[this.scoreScene], time, 0.16);
  }

  canPlayScore() {
    return this.enabled && this.mix.music > 0 && !document.hidden && this.context?.state === 'running';
  }

  async startScore() {
    if (!this.canPlayScore() || this.scoreSource || performance.now() < this.scoreRetryAt) return;
    try {
      if (!this.scoreBuffer) {
        if (!this.scoreDownload) {
          this.scoreDownload = this.loadScore().finally(() => { this.scoreDownload = null; });
        }
        this.scoreBuffer = await this.scoreDownload;
      }
      if (!this.canPlayScore() || this.scoreSource) return;
      const source = this.context.createBufferSource();
      source.buffer = this.scoreBuffer;
      source.loop = true;
      source.connect(this.musicBus);
      this.updateScoreGain(true);
      this.scoreStartedAt = this.context.currentTime;
      source.start(this.scoreStartedAt, this.scoreOffset % this.scoreBuffer.duration);
      this.scoreSource = source;
    } catch {
      this.scoreRetryAt = performance.now() + 30000;
    }
  }

  async loadScore() {
    const response = await fetch(SCORE_URL);
    if (!response.ok) throw Error('Soundtrack unavailable');
    return this.context.decodeAudioData(await response.arrayBuffer());
  }

  pauseOutput() {
    this.cancel();
    if (!this.scoreSource) return;
    try {
      if (this.context && this.scoreBuffer?.duration > 0) {
        this.scoreOffset = (this.scoreOffset + Math.max(0, this.context.currentTime - this.scoreStartedAt)) % this.scoreBuffer.duration;
      }
      this.scoreSource.stop();
      this.scoreSource.disconnect();
    } catch {
      // Score source may already be stopped or disconnected on backgrounding.
    }
    this.scoreSource = null;
  }

  removeVoice(voice) {
    this.voices.delete(voice);
    this.tails.delete(voice);
    voice.source.disconnect();
    voice.filter?.disconnect();
    voice.panner?.disconnect();
    voice.gain.disconnect();
    voice.release.disconnect();
  }

  stopVoice(voice, fade = false) {
    const now = this.context.currentTime;
    try {
      if (fade && voice.start <= now && now < voice.end) {
        this.voices.delete(voice);
        this.tails.add(voice);
        const release = Math.min(0.027, voice.end - now);
        // Fade independently of the scheduled material envelope.
        voice.release.gain.setValueAtTime(1, now);
        voice.release.gain.linearRampToValueAtTime(0, now + release);
        voice.source.stop(now + release);
        return;
      }
      voice.source.stop(now);
    } catch {
      // The sound may have ended between scheduling and cleanup.
    }
    this.removeVoice(voice);
  }

  cancel(group) {
    for (const voice of [...this.voices, ...this.tails]) {
      if (!group || voice.group === group) this.stopVoice(voice);
    }
    if (!group || this.pendingCue?.name === group) this.pendingCue = null;
    if (!group) this.lastCueTime.clear();
  }

  noiseBuffer() {
    if (this.noise) return this.noise;
    const { sampleRate } = this.context;
    this.noise = this.context.createBuffer(1, Math.ceil(sampleRate * 2.4), sampleRate);
    const samples = this.noise.getChannelData(0);
    let state = 1262830;
    for (let i = 0; i < samples.length; i++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      samples[i] = state / 2147483648 - 1;
    }
    return this.noise;
  }

  playPart(part, group, motif) {
    const ctx = this.context;
    const { frequency, to, duration, level, delay, type, attack = 0.007, q = 0.8, pan = 0 } = part;
    const start = ctx.currentTime + delay;
    const end = start + duration;
    const gain = ctx.createGain();
    const release = ctx.createGain();
    const panner = pan && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const isTexture = type === 'texture';
    const source = isTexture ? ctx.createBufferSource() : ctx.createOscillator();
    let filter = null;
    if (isTexture) {
      source.buffer = this.noiseBuffer();
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = q;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.type = type;
      source.connect(gain);
    }
    const frequencyParam = isTexture ? filter.frequency : source.frequency;
    frequencyParam.setValueAtTime(frequency, start);
    if (to) frequencyParam.exponentialRampToValueAtTime(to, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(release);
    const destination = this.effectsBus ?? this.master;
    if (panner) {
      panner.pan.value = pan;
      release.connect(panner);
      panner.connect(destination);
    } else {
      release.connect(destination);
    }
    const voice = { source, gain, release, filter, panner, group, lane: motif.lane, priority: motif.priority, start, end };
    this.voices.add(voice);
    source.onended = () => this.removeVoice(voice);
    if (isTexture) source.start(start, (0.137 * ++this.noiseTurns) % (this.noise.duration - duration));
    else source.start(start);
    source.stop(end + 0.005);
  }

  cue(name, key, { force = false } = {}) {
    if (!force && key && this.seen.has(key)) return false;
    if (key) {
      this.seen.add(key);
      if (this.seen.size > KEY_HISTORY_LIMIT) this.seen.delete(this.seen.values().next().value);
    }
    if (!this.enabled || this.mix.effects === 0 || document.hidden) return false;
    const motif = Object.hasOwn(GAME_CUES, name) ? GAME_CUES[name] : GAME_CUES.reveal;
    if (this.context?.state === 'running') return this.playCue(name, key, motif, force);
    const time = performance.now();
    if (time - this.gestureAt > GESTURE_WINDOW || !this.context) return false;
    if (!this.pendingCue || this.pendingCue.motif.priority <= motif.priority) {
      this.pendingCue = { name, key, motif, force, time };
    }
    return false;
  }

  playCue(name, key, motif, force) {
    if (!this.enabled || this.mix.effects === 0 || document.hidden || this.context?.state !== 'running') return false;
    const now = this.context.currentTime;
    const previous = this.lastCueTime.get(name) ?? -Infinity;
    if (!force && now - previous < motif.interval) return false;
    const active = [...this.voices];
    const ownLane = active.filter(voice => voice.lane === motif.lane);
    if (ownLane.some(voice => voice.priority > motif.priority)) return false;
    // Leave the timer and small input ticks out of the award cadence.
    if (name === 'ui' && active.some(voice => voice.priority === 4)) return false;
    for (const voice of ownLane) this.stopVoice(voice, true);
    const displaced = [...this.voices]
      .filter(voice => voice.priority < motif.priority)
      .sort((left, right) => left.priority - right.priority);
    while (this.voices.size + motif.parts.length > VOICE_LIMIT && displaced.length) {
      this.stopVoice(displaced.shift(), true);
    }
    if (this.voices.size + motif.parts.length > VOICE_LIMIT) return false;
    for (const part of motif.parts) this.playPart(part, name, motif);
    this.lastCueTime.set(name, now);
    this.log.push({ name, key, time: performance.now(), voices: this.voices.size });
    if (this.log.length > 256) this.log.shift();
    return true;
  }
}
