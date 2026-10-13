/* Mooncat — original generative piano score and locally bundled CC0 cat recording.
   Cat recording: qubodup / Jofae, https://freesound.org/people/qubodup/sounds/813119/
   License: https://creativecommons.org/publicdomain/zero/1.0/ */
(() => {
  'use strict';
  const assetBase = document.currentScript?.src || window.location.href;
  const MEOW_URL = window.MOONCAT_MEOW_URL || new URL('assets/meow.mp3', assetBase).href;
  const CHORDS = [
    { bass: 50, notes: [57, 61, 64, 66] },
    { bass: 47, notes: [54, 57, 61, 62] },
    { bass: 43, notes: [54, 57, 59, 62] },
    { bass: 45, notes: [52, 57, 59, 61] },
    { bass: 42, notes: [50, 57, 61, 64] },
    { bass: 40, notes: [50, 54, 55, 59] },
    { bass: 43, notes: [50, 54, 59, 62] },
    { bass: 45, notes: [52, 57, 62, 64] },
    { bass: 50, notes: [57, 61, 64, 66] },
    { bass: 47, notes: [54, 57, 61, 62] },
    { bass: 43, notes: [54, 57, 59, 62] },
    { bass: 45, notes: [52, 57, 59, 61] },
    { bass: 42, notes: [50, 57, 61, 64] },
    { bass: 40, notes: [50, 54, 55, 59] },
    { bass: 43, notes: [50, 54, 59, 62] },
    { bass: 45, notes: [52, 57, 61, 64] }
  ];
  // [beat, MIDI pitch, length in beats, velocity]. A complete, breathing 16-bar phrase.
  const MELODY = [
    [[.16,74,1.7,.75],[2.12,78,1.6,.60]],
    [[.18,76,1.3,.65],[1.82,74,1.7,.58]],
    [[.22,71,1.4,.63],[2.05,74,1.6,.69]],
    [[.12,73,2.6,.62]],
    [[.20,69,1.7,.60],[2.14,73,1.6,.65]],
    [[.12,71,1.0,.65],[1.42,74,1.0,.66],[2.70,76,1.1,.52]],
    [[.23,78,2.0,.66],[2.72,76,.8,.53]],
    [[.18,74,1.9,.61],[2.43,73,1.0,.51]],
    [[.19,74,1.4,.68],[1.85,78,1.6,.63]],
    [[.22,81,1.8,.62],[2.38,78,1.0,.55]],
    [[.13,79,1.3,.61],[1.78,78,1.5,.54]],
    [[.25,76,2.5,.59]],
    [[.18,78,1.3,.63],[1.80,76,1.3,.54]],
    [[.22,74,1.3,.60],[1.93,71,1.4,.54]],
    [[.17,69,1.2,.60],[1.62,71,.9,.56],[2.83,74,.8,.51]],
    [[.18,73,2.5,.57]]
  ];
  const SCORES = {
    violet: {
      title: '月球晚安曲', mood: '月光钢琴 · 柔软木琴', bpm: 66, meter: 4,
      chords: CHORDS, melody: MELODY, pattern: 'moon',
      dry: .84, wet: .27, delay: .13, delayBeat: 1 / 3, tone: 5200, pad: .0165
    },
    blue: {
      title: '蓝色潮汐', mood: '慢拍钢琴 · 水波泛音', bpm: 54, meter: 4,
      pattern: 'tide', dry: .77, wet: .34, delay: .15, delayBeat: .5, tone: 4200, pad: .018,
      chords: [
        {bass:38,notes:[45,48,52,53]}, {bass:34,notes:[45,48,50,53]},
        {bass:41,notes:[48,52,55,57]}, {bass:36,notes:[43,48,50,52]},
        {bass:43,notes:[50,53,57,58]}, {bass:38,notes:[45,48,52,53]},
        {bass:34,notes:[45,48,50,53]}, {bass:45,notes:[52,55,57,61]},
        {bass:38,notes:[45,48,52,53]}, {bass:34,notes:[45,48,50,53]},
        {bass:41,notes:[48,52,55,57]}, {bass:36,notes:[43,48,50,52]},
        {bass:43,notes:[50,53,57,58]}, {bass:34,notes:[45,48,50,53]},
        {bass:36,notes:[43,48,50,52]}, {bass:38,notes:[45,48,52,53]}
      ],
      melody: [
        [[.16,77,1.2,.65],[1.72,76,1.3,.56],[3.18,74,.7,.51]],
        [[.23,72,2.0,.60],[2.64,70,1.0,.52]],
        [[.12,69,1.2,.56],[1.67,72,1.5,.61],[3.27,77,.6,.49]],
        [[.20,76,2.5,.58]],
        [[.25,74,1.1,.59],[1.62,77,1.1,.61],[3.05,79,.8,.51]],
        [[.13,81,1.8,.60],[2.50,77,1.1,.54]],
        [[.18,74,1.3,.60],[1.89,72,1.6,.52]],
        [[.19,73,2.7,.54]],
        [[.23,74,1.2,.61],[1.69,76,1.1,.58],[3.06,77,.7,.53]],
        [[.12,81,1.9,.58],[2.42,77,1.2,.52]],
        [[.22,79,1.2,.59],[1.71,77,1.1,.56],[3.09,76,.7,.49]],
        [[.19,72,2.6,.56]],
        [[.13,70,1.2,.57],[1.70,74,1.5,.60]],
        [[.23,77,1.5,.57],[2.13,74,1.1,.50]],
        [[.18,76,1.2,.56],[1.77,72,1.5,.51]],
        [[.25,74,2.8,.54]]
      ]
    },
    rose: {
      title: '玫瑰小圆舞曲', mood: '三拍子钢琴 · 花园木琴', bpm: 72, meter: 3,
      pattern: 'waltz', dry: .90, wet: .23, delay: .075, delayBeat: .25, tone: 4700, pad: .012,
      chords: [
        {bass:43,notes:[50,54,59,62]}, {bass:40,notes:[47,50,55,59]},
        {bass:36,notes:[47,50,52,55]}, {bass:38,notes:[45,50,52,54]},
        {bass:43,notes:[50,54,59,62]}, {bass:47,notes:[54,57,62,66]},
        {bass:45,notes:[52,55,60,64]}, {bass:38,notes:[45,50,52,54]},
        {bass:43,notes:[50,54,59,62]}, {bass:40,notes:[47,50,55,59]},
        {bass:36,notes:[47,50,52,55]}, {bass:38,notes:[45,50,52,54]},
        {bass:45,notes:[52,55,60,64]}, {bass:36,notes:[47,50,52,55]},
        {bass:38,notes:[45,50,52,54]}, {bass:43,notes:[50,54,59,62]}
      ],
      melody: [
        [[.10,79,.8,.66],[1.13,83,.7,.60],[2.11,81,.7,.56]],
        [[.12,79,1.5,.61],[2.06,76,.7,.53]],
        [[.09,76,.8,.59],[1.16,79,.7,.62],[2.13,83,.7,.55]],
        [[.12,81,2.0,.59]],
        [[.13,79,.8,.63],[1.15,78,.7,.55],[2.10,74,.7,.52]],
        [[.10,78,1.5,.60],[2.17,81,.7,.53]],
        [[.13,84,.8,.61],[1.11,83,.7,.57],[2.16,81,.7,.52]],
        [[.12,78,2.1,.57]],
        [[.10,83,.8,.64],[1.17,86,.7,.59],[2.10,83,.7,.55]],
        [[.14,79,1.5,.61],[2.17,76,.7,.52]],
        [[.10,79,.8,.60],[1.12,76,.7,.57],[2.15,72,.7,.53]],
        [[.11,74,2.0,.56]],
        [[.16,76,.8,.59],[1.18,79,.7,.56],[2.09,81,.7,.53]],
        [[.10,79,1.5,.59],[2.13,76,.7,.51]],
        [[.13,78,.8,.58],[1.15,76,.7,.54],[2.12,74,.7,.50]],
        [[.10,79,2.1,.58]]
      ]
    }
  };
  const TRACKS = Object.freeze(Object.fromEntries(Object.entries(SCORES).map(([id, score]) =>
    [id, Object.freeze({id, title:score.title, mood:score.mood, bpm:score.bpm,
      meter:score.meter === 3 ? '3/4' : '4/4', bars:score.chords.length,
      duration:score.chords.length * score.meter * 60 / score.bpm})])));
  const STATE_KEY = 'mooncat_audio_state_v2';
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  // Render a small original piano sample bank away from the animation thread.
  // Nearby pitches share a root sample, as they would in a sampled instrument.
  function renderPiano(midi) {
    const sampleRate = 24000;
    const samples = new Float32Array(Math.floor(sampleRate * 4.8));
    const base = 440 * Math.pow(2, (midi - 69) / 12);
    const amplitudes = [.72, .32, .185, .105, .066, .042, .027, .017, .010, .007];
    const register = Math.min(2.9, Math.max(1.25, 70 / base + 1.15));
    for (let h = 0; h < amplitudes.length; h++) {
      const n = h + 1;
      const partial = base * n * Math.sqrt(1 + .00009 * n * n);
      if (partial > sampleRate * .44) continue;
      const angular = 2 * Math.PI * partial / sampleRate;
      const rotation = Math.cos(angular), sine = Math.sin(angular);
      const damping = register * (n === 1 ? 1.8 : 1.1 / Math.pow(n, .65));
      const decay = Math.exp(-1 / (sampleRate * damping));
      let x = 0, y = 1, magnitude = amplitudes[h];
      for (let i = 0; i < samples.length; i++) {
        samples[i] += x * magnitude;
        const next = x * rotation + y * sine;
        y = y * rotation - x * sine;
        x = next;
        magnitude *= decay;
      }
    }
    let noise = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      noise = noise * .68 + (Math.random() * 2 - 1) * .32;
      const felt = noise * Math.exp(-t * 145) * .08;
      const attack = Math.min(1, i / (sampleRate * .0035));
      const tail = Math.min(1, (samples.length - i) / (sampleRate * .085));
      samples[i] = (samples[i] + felt) * attack * tail * .65;
    }
    return samples;
  }

  class MoonAudio {
    constructor() {
      this.ctx = null;
      this._playing = false;
      this._muted = false;
      this._volume = .62;
      this._theme = 'violet';
      this._positions = {violet:0,blue:0,rose:0};
      this._backgroundPlayback = Boolean(window.chrome?.webview || window.MOONCAT_DESKTOP === true || window.MOONCAT_NATIVE === true);
      try {
        const saved = Number(localStorage.getItem('mooncat_audio_volume'));
        if (localStorage.getItem('mooncat_audio_volume') !== null && Number.isFinite(saved)) {
          this._volume = clamp(saved, 0, 1);
        }
      } catch (_) { /* Storage can be disabled in private/offline previews. */ }
      try {
        const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
        if (saved && typeof saved === 'object') {
          if (SCORES[saved.theme]) this._theme = saved.theme;
          this._playing = saved.playing === true;
          this._muted = saved.muted === true;
          if (Number.isFinite(saved.volume)) this._volume = clamp(saved.volume,0,1);
          for (const theme of Object.keys(SCORES)) {
            const position = Number(saved.positions?.[theme]);
            if (Number.isFinite(position) && position >= 0) this._positions[theme] = position % TRACKS[theme].duration;
          }
        }
      } catch (_) {}
      this._timer = null;
      this._lanes = new Set();
      this._activeLane = null;
      this._switchEpoch = 0;
      this._lastSaveAt = 0;
      this._voiceNodes = new Set();
      this._effectNodes = new Set();
      this._pianoSamples = new Map();
      this._meowUntil = 0;
      this._meowPending = false;
      this._chimeUntil = 0;
      this._destroyed = false;
      this._visibility = () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this._saveState();
          if (this._backgroundPlayback) {
            this._schedule();
            return;
          }
          this._pauseTransport();
          // Let the short fade finish before suspending a previously unlocked context.
          this._hideTimer = setTimeout(() => {
            if (document.hidden && !this._backgroundPlayback && this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
          }, 350);
        } else {
          clearTimeout(this._hideTimer);
          if (this._playing) this.resumeSavedMusic();
        }
      };
      this._gesture = () => {
        if (this._playing && this.pendingResume && !this._resumeTask) this.resumeSavedMusic();
      };
      this._pagehide = () => this._saveState();
      document.addEventListener('visibilitychange', this._visibility);
      document.addEventListener('pointerdown', this._gesture, {capture:true,passive:true});
      document.addEventListener('keydown', this._gesture, {capture:true});
      window.addEventListener('pagehide', this._pagehide);
    }

    static get tracks() { return TRACKS; }
    get playing() { return this._playing; }
    get volume() { return this._volume; }
    get muted() { return this._muted; }
    get theme() { return this._theme; }
    get track() { return TRACKS[this._theme]; }
    get pendingResume() { return this._playing && (!this.ctx || this.ctx.state !== 'running' || !this._activeLane); }

    setBackgroundPlayback(value) {
      this._backgroundPlayback = Boolean(value);
      clearTimeout(this._hideTimer);
      if (document.hidden && this._backgroundPlayback && this._playing && this.ctx) this.resumeSavedMusic();
      else if (document.hidden && !this._backgroundPlayback) this._visibility();
      return this._backgroundPlayback;
    }

    _canRun() { return !document.hidden || this._backgroundPlayback; }

    _notify() {
      window.dispatchEvent(new CustomEvent('musicchange', {detail:{
        theme:this.theme,track:this.track,playing:this.playing,volume:this.volume,
        muted:this.muted,pendingResume:this.pendingResume
      }}));
    }

    _position(lane) {
      if (!lane || !this.ctx) return this._positions[this._theme] || 0;
      return (lane.position + Math.max(0,this.ctx.currentTime-lane.startedAt)) % TRACKS[lane.theme].duration;
    }

    exportState() {
      const positions = {...this._positions};
      if (this._activeLane) positions[this._activeLane.theme] = this._position(this._activeLane);
      return {version:2,theme:this.theme,playing:this.playing,volume:this.volume,muted:this.muted,
        position:positions[this.theme],positions,updatedAt:Date.now()};
    }

    _saveState() {
      const state = this.exportState();
      try {
        localStorage.setItem(STATE_KEY,JSON.stringify(state));
        localStorage.setItem('mooncat_audio_volume',String(this._volume));
      } catch (_) {}
      return state;
    }

    restoreState(state, {allowResume = false} = {}) {
      if (!state || typeof state !== 'object' || this._destroyed) return Promise.resolve(false);
      if (typeof state.playing === 'boolean') {
        this._playing = state.playing;
        if (!this._playing) this._pauseTransport();
      }
      if (Number.isFinite(state.volume)) this.setVolume(state.volume);
      if (typeof state.muted === 'boolean') this.setMuted(state.muted);
      for (const theme of Object.keys(SCORES)) {
        const position = Number(state.positions?.[theme]);
        if (Number.isFinite(position) && position >= 0) this._positions[theme] = position % TRACKS[theme].duration;
      }
      if (SCORES[state.theme]) {
        if (Number.isFinite(state.position)) this._positions[state.theme] = Math.max(0,state.position) % TRACKS[state.theme].duration;
        this.setTheme(state.theme);
      }
      this._saveState();
      this._notify();
      return allowResume ? this.resumeSavedMusic() : Promise.resolve(this.playing);
    }

    setTheme(theme) {
      if (!SCORES[theme] || this._destroyed) return this.track;
      if (theme === this._theme) return this.track;
      this._theme = theme;
      this._saveState();
      this._notify();
      if (this._playing && this.ctx?.state === 'running' && this._pianoReady && this._canRun()) {
        this._transitionTheme(theme,1.8).catch(() => {});
      }
      return this.track;
    }

    async playMusic({fadeIn = 1.8} = {}) {
      if (this._destroyed) return false;
      this._playing = true;
      this._saveState();
      try {
        await this.init();
        await this._pianoLoad;
        this._pianoReady = true;
        if (!this.ctx || this.ctx.state !== 'running' || !this._playing || this._destroyed) {
          this._notify(); return false;
        }
        if (this._canRun()) await this._startTransport({fadeIn});
        this._saveState(); this._notify();
        return this._playing;
      } catch (_) { this._notify(); return false; }
    }

    async resumeSavedMusic() {
      if (!this._playing || this._destroyed) return false;
      if (this._resumeTask) return this._resumeTask;
      this._resumeTask = this.playMusic({fadeIn:1.2});
      try { return await this._resumeTask; }
      finally { this._resumeTask = null; }
    }

    async init() {
      if (this._destroyed) return this;
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return this;
        // Context creation and resume are reached synchronously from the user's gesture.
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
        this._ctxStateHandler = () => {
          if (this._backgroundPlayback && this._playing && !this._destroyed && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        };
        this.ctx.addEventListener?.('statechange',this._ctxStateHandler);
        this._buildGraph();
        this._pianoLoad = this._preparePiano();
        this._meowLoad = fetch(MEOW_URL)
          .then(response => {
            if (!response.ok) throw new Error('Cat recording unavailable');
            return response.arrayBuffer();
          })
          .then(bytes => this.ctx.decodeAudioData(bytes))
          .then(buffer => { this.meowBuffer = buffer; return buffer; })
          .catch(() => null);
      }
      if (this.ctx.state === 'suspended') {
        // An ordinary browser may require another gesture; a trusted native WebView
        // can explicitly permit startup audio. Never leave a UI action waiting forever.
        let timer;
        await Promise.race([this.ctx.resume(),new Promise(resolve => {timer=setTimeout(resolve,1600);})]);
        clearTimeout(timer);
      }
      return this;
    }

    _buildGraph() {
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -17;
      compressor.knee.value = 18;
      compressor.ratio.value = 2.5;
      compressor.attack.value = .012;
      compressor.release.value = .38;
      this.master.connect(compressor).connect(ctx.destination);

      this._roomImpulse = this._impulse(3.2);
      this.effects = ctx.createGain();
      const effectTone = ctx.createBiquadFilter();
      effectTone.type = 'lowpass';
      effectTone.frequency.value = 7000;
      this.effects.connect(effectTone).connect(this.master);
      this._graphNodes = [this.master,compressor,this.effects,effectTone];
    }

    _makeLane(theme) {
      const ctx = this.ctx;
      const score = SCORES[theme];
      const input = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = score.tone;
      tone.Q.value = .45;
      input.connect(tone);
      const volume = ctx.createGain();
      volume.gain.value = 0;
      volume.connect(this.master);
      const dry = ctx.createGain();
      dry.gain.value = score.dry;
      tone.connect(dry).connect(volume);

      const verbHighpass = ctx.createBiquadFilter();
      verbHighpass.type = 'highpass';
      verbHighpass.frequency.value = 180;
      const reverb = ctx.createConvolver();
      reverb.buffer = this._roomImpulse;
      const wet = ctx.createGain();
      wet.gain.value = score.wet;
      tone.connect(verbHighpass).connect(reverb).connect(wet).connect(volume);

      const delay = ctx.createDelay(2);
      delay.delayTime.value = 60 / score.bpm * score.delayBeat;
      const delayTone = ctx.createBiquadFilter();
      delayTone.type = 'lowpass';
      delayTone.frequency.value = 1900;
      const feedback = ctx.createGain();
      feedback.gain.value = .17;
      const delayWet = ctx.createGain();
      delayWet.gain.value = score.delay;
      tone.connect(delay);
      delay.connect(delayTone).connect(feedback).connect(delay);
      delayTone.connect(delayWet).connect(volume);
      const lane = {theme,input,volume,voices:new Set(),retired:false,
        graphNodes:[input,tone,volume,dry,verbHighpass,reverb,wet,delay,delayTone,feedback,delayWet]};
      this._lanes.add(lane);
      return lane;
    }

    _impulse(seconds) {
      const ctx = this.ctx;
      const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = buffer.getChannelData(channel);
        let smoothed = 0;
        for (let i = 0; i < samples.length; i++) {
          const t = i / ctx.sampleRate;
          smoothed = smoothed * .50 + (Math.random() * 2 - 1) * .50;
          // A small predelay gives the piano room before the soft stereo tail.
          samples[i] = t < .023 + channel * .006 ? 0 : smoothed * Math.exp(-2.7 * t / seconds);
        }
      }
      return buffer;
    }

    async toggleMusic() {
      if (this._playing) {
        this._playing = false;
        this._pauseTransport();
        this._saveState(); this._notify();
        return false;
      }
      return this.playMusic();
    }

    setVolume(value) {
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      this._volume = clamp(next, 0, 1);
      try { localStorage.setItem('mooncat_audio_volume', String(this._volume)); } catch (_) {}
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, .055);
      }
      this._saveState(); this._notify();
    }

    setMuted(value) {
      this._muted = Boolean(value);
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, .045);
      }
      this._saveState(); this._notify();
    }

    _startTransport({fadeIn = 1.8} = {}) {
      return this._transitionTheme(this._theme,clamp(Number(fadeIn)||1.8,.12,8));
    }

    _rampLane(lane, target, seconds) {
      const gain = lane.volume.gain;
      const now = this.ctx.currentTime;
      if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
      else {
        const current = gain.value;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(current,now);
      }
      gain.linearRampToValueAtTime(target,now+seconds);
    }

    _disposeLane(lane) {
      if (!this._lanes.has(lane)) return;
      clearTimeout(lane.disposeTimer);
      for (const source of lane.voices) {
        try { source.stop(); } catch (_) {}
        this._voiceNodes.delete(source);
      }
      lane.voices.clear();
      for (const node of lane.graphNodes) {
        try { node.disconnect(); } catch (_) {}
      }
      this._lanes.delete(lane);
    }

    _retireLane(lane, seconds = 1.8) {
      if (!lane || !this._lanes.has(lane)) return;
      lane.retired = true;
      this._rampLane(lane,0,seconds);
      clearTimeout(lane.disposeTimer);
      // Scheduled old notes and their room tail fade together, then all sources stop.
      for (const source of lane.voices) {
        try { source.stop(this.ctx.currentTime+seconds+.025); } catch (_) {}
      }
      lane.disposeTimer = setTimeout(() => this._disposeLane(lane),seconds*1000+45);
    }

    async _transitionTheme(theme, fadeIn = 1.8) {
      if (!this.ctx || this.ctx.state !== 'running' || !this._playing || !this._canRun() || this._destroyed) return;
      if (this._activeLane?.theme === theme && !this._activeLane.retired) return;
      const epoch = ++this._switchEpoch;
      const retiring = [...this._lanes].filter(lane => lane !== this._activeLane);
      if (retiring.length) {
        // A third quick selection finishes the older fade before allocating a lane.
        // This bounds both voice count and gain even under repeated theme clicks.
        retiring.forEach(lane => this._retireLane(lane,.08));
        await new Promise(resolve => setTimeout(resolve,135));
        if (epoch !== this._switchEpoch || !this._playing || !this._canRun() || this._destroyed) return;
        retiring.forEach(lane => this._disposeLane(lane));
      }
      if (theme !== this._theme) return;
      const previous = this._activeLane;
      if (previous) {
        this._positions[previous.theme] = this._position(previous);
        this._retireLane(previous,1.8);
      }
      const lane = this._makeLane(theme);
      const score = SCORES[theme];
      const barLength = 60 / score.bpm * score.meter;
      lane.position = this._positions[theme] % TRACKS[theme].duration;
      lane.startedAt = this.ctx.currentTime+.08;
      lane.nextBar = Math.floor(lane.position/barLength);
      lane.nextBarAt = lane.startedAt-(lane.position%barLength);
      this._activeLane = lane;
      this._rampLane(lane,.90,previous ? 1.8 : fadeIn);
      this._schedule();
      if (this._timer === null) this._timer=setInterval(() => this._schedule(),160);
      this._saveState(); this._notify();
    }

    _pauseTransport() {
      ++this._switchEpoch;
      if (this._timer !== null) clearInterval(this._timer);
      this._timer = null;
      if (!this.ctx) return;
      if (this._activeLane) this._positions[this._activeLane.theme] = this._position(this._activeLane);
      this._activeLane = null;
      [...this._lanes].forEach(lane => this._retireLane(lane,.28));
    }

    _schedule() {
      const lane = this._activeLane;
      if (!this.ctx || !lane || lane.retired || !this._canRun() || !this._playing || this._destroyed) return;
      const now = this.ctx.currentTime;
      const score = SCORES[lane.theme];
      const barLength = score.meter * 60 / score.bpm;
      if (lane.nextBarAt+barLength < now-.3) {
        const position = this._position(lane);
        lane.nextBar=Math.floor(position/barLength);
        lane.nextBarAt=now-(position%barLength);
      }
      const lookahead = document.hidden && this._backgroundPlayback ? 2.0 : .85;
      while (lane.nextBarAt < now+lookahead) {
        this._scheduleBar(lane,lane.nextBar%score.chords.length,lane.nextBarAt);
        lane.nextBar++;
        lane.nextBarAt+=barLength;
      }
      if (performance.now()-this._lastSaveAt>2200) {
        this._lastSaveAt=performance.now(); this._saveState();
      }
    }

    _scheduleBar(lane, bar, at) {
      const score = SCORES[lane.theme];
      const beat = 60 / score.bpm;
      const barLength = score.meter * beat;
      const chord = score.chords[bar];
      const breathe = .92 + .07 * Math.sin(bar * .65);
      this._piano(chord.bass,at,barLength+.45,.45*breathe,-.16,lane);
      if (score.pattern === 'waltz') {
        [1.03,2.03].forEach((pulse,pulseIndex) => chord.notes.forEach((note,i) => {
          this._piano(note,at+pulse*beat+i*.019,1.65,(pulseIndex ? .19 : .235)*breathe,-.2+i*.12,lane);
        }));
      } else {
        const arp = score.pattern === 'tide' ? [.08,.76,1.48,2.18,2.91,3.62] : [.05,.79,1.52,2.56];
        arp.forEach((pulse,i) => {
          const note = chord.notes[score.pattern === 'tide' ? [0,2,3,1,2,3][i] : i];
          this._piano(note,at+pulse*beat+(Math.random()-.5)*.036,score.pattern==='tide'?3.0:2.7,
            (score.pattern === 'tide' ? .255 : .31)*breathe,-.23+(i%4)*.13,lane);
        });
      }
      score.melody[bar].forEach(([pulse,midi,duration,touch]) => {
        this._piano(midi,at+pulse*beat+(Math.random()-.5)*.030,duration*beat+.65,touch*breathe,.14,lane);
      });
      [chord.bass + 12, ...chord.notes].forEach((note, i) => {
        this._pad(note,at+i*.021,barLength+1.25,score.pad*breathe,i%2?-.35:.35,lane);
      });
      if (score.pattern==='moon') {
        if (bar===7) this._piano(61,at+2.85*beat,1.7,.24,-.12,lane);
        if (bar%4===2) this._wood(86,at+3.18*beat,.040,lane);
        if (bar%8===5) this._wood(81,at+3.35*beat,.045,lane);
      } else if (score.pattern==='tide') {
        if (bar%4===1) this._wood(89,at+3.30*beat,.031,lane);
      } else if (bar%2===0) {
        this._wood(bar%4===0?86:83,at+2.52*beat,.047,lane);
      }
    }

    _preparePiano() {
      const roots = [36, 48, 60, 72, 84];
      const store = (midi, samples) => {
        if (this._destroyed) return;
        const buffer = this.ctx.createBuffer(1, samples.length, 24000);
        buffer.getChannelData(0).set(samples);
        this._pianoSamples.set(midi, buffer);
      };
      const mainThread = async () => {
        for (const midi of roots) {
          await new Promise(resolve => setTimeout(resolve, 0));
          if (this._destroyed) return;
          store(midi, renderPiano(midi));
        }
      };
      if (typeof Worker === 'undefined') return mainThread();
      return new Promise(resolve => {
        this._pianoLoadResolve = resolve;
        let finished = false;
        const cleanup = () => {
          this._pianoWorker?.terminate();
          this._pianoWorker = null;
          if (this._pianoWorkerUrl) URL.revokeObjectURL(this._pianoWorkerUrl);
          this._pianoWorkerUrl = null;
        };
        try {
          const source = `const renderPiano = ${renderPiano.toString()}; onmessage = () => {
            const result = [36,48,60,72,84].map(midi => ({midi, samples: renderPiano(midi)}));
            postMessage(result, result.map(item => item.samples.buffer));
          };`;
          this._pianoWorkerUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
          this._pianoWorker = new Worker(this._pianoWorkerUrl);
          this._pianoWorker.onmessage = event => {
            if (finished) return;
            finished = true;
            event.data.forEach(({midi, samples}) => store(midi, samples));
            cleanup();
            resolve();
          };
          this._pianoWorker.onerror = () => {
            if (finished) return;
            finished = true;
            cleanup();
            mainThread().then(resolve);
          };
          this._pianoWorker.postMessage('render');
        } catch (_) {
          cleanup();
          mainThread().then(resolve);
        }
      });
    }

    _pianoSample(midi) {
      const root = clamp(Math.round(midi / 12) * 12, 36, 84);
      if (!this._pianoSamples.has(root)) {
        const samples = renderPiano(root);
        const buffer = this.ctx.createBuffer(1, samples.length, 24000);
        buffer.getChannelData(0).set(samples);
        this._pianoSamples.set(root, buffer);
      }
      return this._pianoSamples.get(root);
    }

    _registerVoice(source, nodes, isEffect = false, lane = this._activeLane) {
      const pool = isEffect ? this._effectNodes : this._voiceNodes;
      pool.add(source);
      if (!isEffect) lane?.voices.add(source);
      source.onended = () => {
        pool.delete(source);
        if (!isEffect) lane?.voices.delete(source);
        for (const node of [source, ...nodes]) {
          try { node.disconnect(); } catch (_) {}
        }
      };
    }

    _piano(midi, at, duration, velocity, pan, lane = this._activeLane) {
      if (!lane || lane.retired) return;
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      source.buffer = this._pianoSample(midi);
      source.playbackRate.value = Math.pow(2, (midi - clamp(Math.round(midi / 12) * 12, 36, 84)) / 12);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2200 + 4100 * velocity;
      tone.Q.value = .4;
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      const length = clamp(duration, .3, Math.min(5.0, source.buffer.duration / source.playbackRate.value));
      const actualAt = Math.max(at,ctx.currentTime+.006);
      const elapsed = actualAt-at;
      if (elapsed>=length-.035) return;
      const remaining = length-elapsed;
      gain.gain.setValueAtTime(velocity*.28,actualAt);
      gain.gain.setValueAtTime(velocity*.28,actualAt+Math.max(.01,remaining-.35));
      gain.gain.exponentialRampToValueAtTime(.0001,actualAt+remaining);
      source.connect(tone).connect(gain).connect(panner).connect(lane.input);
      this._registerVoice(source,[tone,gain,panner],false,lane);
      // Restoring a document starts at the saved point in a ringing piano note.
      source.start(actualAt,elapsed*source.playbackRate.value);
      source.stop(actualAt+remaining+.02);
    }

    _wood(midi, at, level, lane = this._activeLane) {
      if (!lane || lane.retired || at<this.ctx.currentTime-.04) return;
      at=Math.max(at,this.ctx.currentTime+.006);
      const ctx = this.ctx;
      [1, 2.76, 5.40].forEach((partial, i) => {
        const source = ctx.createOscillator();
        source.type = 'sine';
        source.frequency.value = frequency(midi) * partial;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(level * [1, .22, .035][i], at + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .80 - i * .22);
        source.connect(gain).connect(lane.input);
        this._registerVoice(source,[gain],false,lane);
        source.start(at);
        source.stop(at + .84);
      });
    }

    _pad(midi, at, duration, level, pan, lane = this._activeLane) {
      if (!lane || lane.retired) return;
      const ctx = this.ctx;
      const actualAt=Math.max(at,ctx.currentTime+.008);
      duration-=actualAt-at;
      at=actualAt;
      if (duration<.12) return;
      const attack=Math.min(.85,duration*.42);
      const release=Math.min(1.5,duration*.45);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(level,at+attack);
      gain.gain.setValueAtTime(level*.9,at+Math.max(attack,duration-release));
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 740;
      tone.Q.value = .3;
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(tone).connect(panner).connect(lane.input);
      const real = new Float32Array([0, 0, 0, 0, 0, 0]);
      const imaginary = new Float32Array([0, .83, .16, .052, .020, .009]);
      const wave = ctx.createPeriodicWave(real, imaginary);
      const oscillators = [-4.5, 4.5].map(detune => {
        const osc = ctx.createOscillator();
        osc.setPeriodicWave(wave);
        osc.frequency.value = frequency(midi);
        osc.detune.value = detune;
        osc.connect(gain);
        this._voiceNodes.add(osc);
        lane.voices.add(osc);
        osc.start(at);
        osc.stop(at + duration + .03);
        return osc;
      });
      let ended = 0;
      oscillators.forEach(osc => {
        osc.onended = () => {
          this._voiceNodes.delete(osc);
          lane.voices.delete(osc);
          osc.disconnect();
          if (++ended === oscillators.length) [gain, tone, panner].forEach(node => node.disconnect());
        };
      });
    }

    async meow() {
      if (this._muted || this._destroyed || this._meowPending || performance.now() < this._meowUntil) return false;
      this._meowPending = true;
      this._meowUntil = performance.now() + 700;
      try {
        await this.init();
        if (!this.ctx || this._muted || this._destroyed) return false;
        const buffer = this.meowBuffer || await this._meowLoad;
        if (this._muted || this._destroyed) return false;
        if (!buffer) { this._meowUntil = performance.now() + 820; this._synthMeow(); return true; }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const rate = .97 + Math.random() * .05;
        source.playbackRate.value = rate;
        const duration = buffer.duration / rate;
        const at = this.ctx.currentTime + .006;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(.62, at + .009);
        gain.gain.setValueAtTime(.62, at + Math.max(.02, duration - .05));
        gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
        source.connect(gain).connect(this.effects);
        this._registerVoice(source, [gain], true);
        this._meowUntil = performance.now() + duration * 1000 + 200;
        source.start(at);
        source.stop(at + duration + .02);
        return true;
      } catch (_) { return false; }
      finally { this._meowPending = false; }
    }

    _synthMeow() {
      // Graceful offline fallback; the deployed site normally uses the real recording.
      const ctx = this.ctx;
      const at = ctx.currentTime + .006;
      const source = ctx.createOscillator();
      source.type = 'sawtooth';
      source.frequency.setValueAtTime(530, at);
      source.frequency.exponentialRampToValueAtTime(710, at + .14);
      source.frequency.exponentialRampToValueAtTime(350, at + .56);
      const vowel = ctx.createBiquadFilter();
      vowel.type = 'bandpass';
      vowel.Q.value = 2.9;
      vowel.frequency.setValueAtTime(2100, at);
      vowel.frequency.exponentialRampToValueAtTime(830, at + .5);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(.13, at + .055);
      gain.gain.setValueAtTime(.10, at + .24);
      gain.gain.exponentialRampToValueAtTime(.0001, at + .60);
      source.connect(vowel).connect(gain).connect(this.effects);
      this._registerVoice(source, [vowel, gain], true);
      source.start(at);
      source.stop(at + .62);
    }

    async chime(step = 1) {
      if (this._muted || this._destroyed || performance.now() < this._chimeUntil) return;
      this._chimeUntil = performance.now() + 90;
      try {
        await this.init();
        if (!this.ctx || this._muted || this._destroyed) return;
        const scale = [74, 76, 78, 81, 83, 86];
        this._bell(scale[((Math.floor(Number(step) || 1) - 1) % scale.length + scale.length) % scale.length], this.ctx.currentTime + .005, .15);
      } catch (_) {}
    }

    async collect() {
      if (this._muted || this._destroyed) return;
      try {
        await this.init();
        if (!this.ctx || this._muted || this._destroyed) return;
        const at = this.ctx.currentTime + .005;
        [74, 78, 81, 86].forEach((note, i) => this._bell(note, at + i * .095, .13 - i * .012));
      } catch (_) {}
    }

    async gameOver() {
      if (this._muted || this._destroyed) return;
      try {
        await this.init();
        if (!this.ctx || this._muted || this._destroyed) return;
        const at = this.ctx.currentTime + .005;
        [67, 69, 74, 78].forEach((note, i) => this._bell(note, at + i * .18, .12));
      } catch (_) {}
    }

    _bell(midi, at, level) {
      const ctx = this.ctx;
      [1, 2.005, 3.01].forEach((partial, i) => {
        const source = ctx.createOscillator();
        source.type = 'sine';
        source.frequency.value = frequency(midi) * partial;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(level * [1, .26, .065][i], at + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, at + 1.25 - i * .19);
        source.connect(gain).connect(this.effects);
        this._registerVoice(source, [gain], true);
        source.start(at);
        source.stop(at + 1.3);
      });
    }

    destroy() {
      this._saveState();
      this._destroyed = true;
      this._playing = false;
      this._pauseTransport();
      clearTimeout(this._hideTimer);
      document.removeEventListener('visibilitychange', this._visibility);
      document.removeEventListener('pointerdown',this._gesture,{capture:true});
      document.removeEventListener('keydown',this._gesture,{capture:true});
      window.removeEventListener('pagehide',this._pagehide);
      [...this._lanes].forEach(lane => this._disposeLane(lane));
      for (const source of this._effectNodes) {
        try { source.stop(); } catch (_) {}
      }
      this._effectNodes.clear();
      this._pianoSamples.clear();
      this._pianoWorker?.terminate();
      this._pianoLoadResolve?.();
      if (this._pianoWorkerUrl) URL.revokeObjectURL(this._pianoWorkerUrl);
      this.ctx?.removeEventListener?.('statechange',this._ctxStateHandler);
      if (this.ctx) this.ctx.close().catch(() => {});
    }
  }
  window.MoonAudio = MoonAudio;
})();
