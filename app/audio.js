/* Mooncat — original generative piano score and locally bundled CC0 cat recording.
   Cat recording: qubodup / Jofae, https://freesound.org/people/qubodup/sounds/813119/
   License: https://creativecommons.org/publicdomain/zero/1.0/ */
(() => {
  'use strict';
  const assetBase = document.currentScript?.src || window.location.href;
  const MEOW_URL = window.MOONCAT_MEOW_URL || new URL('assets/meow.mp3', assetBase).href;
  const BPM = 66;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
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
      try {
        const saved = Number(localStorage.getItem('mooncat_audio_volume'));
        if (localStorage.getItem('mooncat_audio_volume') !== null && Number.isFinite(saved)) {
          this._volume = clamp(saved, 0, 1);
        }
      } catch (_) { /* Storage can be disabled in private/offline previews. */ }
      this._timer = null;
      this._nextBar = 0;
      this._nextBarAt = 0;
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
          this._pauseTransport();
          // Let the short fade finish before suspending a previously unlocked context.
          this._hideTimer = setTimeout(() => {
            if (document.hidden && this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
          }, 350);
        } else {
          clearTimeout(this._hideTimer);
          if (this._playing) this.init().then(() => this._pianoLoad).then(() => this._startTransport()).catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', this._visibility);
    }

    get playing() { return this._playing; }
    get volume() { return this._volume; }
    get muted() { return this._muted; }

    async init() {
      if (this._destroyed) return this;
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return this;
        // Context creation and resume are reached synchronously from the user's gesture.
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
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
      if (this.ctx.state === 'suspended') await this.ctx.resume();
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

      this.musicInput = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5200;
      tone.Q.value = .45;
      this.musicInput.connect(tone);
      this.musicVolume = ctx.createGain();
      this.musicVolume.gain.value = 0;
      this.musicVolume.connect(this.master);
      const dry = ctx.createGain();
      dry.gain.value = .84;
      tone.connect(dry).connect(this.musicVolume);

      const verbHighpass = ctx.createBiquadFilter();
      verbHighpass.type = 'highpass';
      verbHighpass.frequency.value = 180;
      const reverb = ctx.createConvolver();
      reverb.buffer = this._impulse(3.2);
      const wet = ctx.createGain();
      wet.gain.value = .27;
      tone.connect(verbHighpass).connect(reverb).connect(wet).connect(this.musicVolume);

      const delay = ctx.createDelay(2);
      delay.delayTime.value = BEAT / 3;
      const delayTone = ctx.createBiquadFilter();
      delayTone.type = 'lowpass';
      delayTone.frequency.value = 1900;
      const feedback = ctx.createGain();
      feedback.gain.value = .17;
      const delayWet = ctx.createGain();
      delayWet.gain.value = .13;
      tone.connect(delay);
      delay.connect(delayTone).connect(feedback).connect(delay);
      delayTone.connect(delayWet).connect(this.musicVolume);

      this.effects = ctx.createGain();
      const effectTone = ctx.createBiquadFilter();
      effectTone.type = 'lowpass';
      effectTone.frequency.value = 7000;
      this.effects.connect(effectTone).connect(this.master);
      this._graphNodes = [this.master, compressor, this.musicInput, tone, this.musicVolume,
        dry, verbHighpass, reverb, wet, delay, delayTone, feedback, delayWet, this.effects, effectTone];
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
      this._playing = !this._playing;
      if (!this._playing) {
        this._pauseTransport();
        return false;
      }
      try {
        await this.init();
        await this._pianoLoad;
        if (!this.ctx || this._destroyed) { this._playing = false; return false; }
        if (this._playing && !document.hidden) this._startTransport();
      } catch (_) { this._playing = false; }
      return this._playing;
    }

    setVolume(value) {
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      this._volume = clamp(next, 0, 1);
      try { localStorage.setItem('mooncat_audio_volume', String(this._volume)); } catch (_) {}
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, .055);
      }
    }

    setMuted(value) {
      this._muted = Boolean(value);
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, .045);
      }
    }

    _startTransport() {
      if (!this.ctx || !this._playing || document.hidden || this._timer !== null || this._destroyed) return;
      const now = this.ctx.currentTime;
      this.musicVolume.gain.cancelScheduledValues(now);
      this.musicVolume.gain.setTargetAtTime(.90, now, .65);
      this._nextBarAt = now + .10;
      this._schedule();
      this._timer = setInterval(() => this._schedule(), 160);
    }

    _pauseTransport() {
      if (this._timer !== null) clearInterval(this._timer);
      this._timer = null;
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.musicVolume.gain.cancelScheduledValues(now);
      this.musicVolume.gain.setTargetAtTime(0, now, .065);
      for (const source of [...this._voiceNodes]) {
        try { source.stop(now + .28); } catch (_) {}
      }
      this._voiceNodes.clear();
    }

    _schedule() {
      if (!this.ctx || document.hidden || !this._playing || this._destroyed) return;
      const now = this.ctx.currentTime;
      // Recover from a browser's stalled timer without firing a backlog of notes.
      if (this._nextBarAt < now - .3) this._nextBarAt = now + .08;
      while (this._nextBarAt < now + .85) {
        this._scheduleBar(this._nextBar % CHORDS.length, this._nextBarAt);
        this._nextBar++;
        this._nextBarAt += BAR;
      }
    }

    _scheduleBar(bar, at) {
      const chord = CHORDS[bar];
      const breathe = .92 + .07 * Math.sin(bar * .65);
      this._piano(chord.bass, at, BAR + .45, .48 * breathe, -.16);
      // Unhurried left-hand arpeggios, with small variations in touch and timing.
      const arp = [0.05, .79, 1.52, 2.56];
      chord.notes.forEach((note, i) => {
        const human = (Math.random() - .5) * .036;
        this._piano(note, at + arp[i] * BEAT + human, 2.7,
          (.30 + (i === 0 ? .055 : 0) + Math.random() * .035) * breathe,
          -.23 + i * .13);
      });
      MELODY[bar].forEach(([beat, midi, duration, touch]) => {
        this._piano(midi, at + beat * BEAT + (Math.random() - .5) * .030,
          duration * BEAT + .65, touch * breathe, .14);
      });
      [chord.bass + 12, ...chord.notes].forEach((note, i) => {
        this._pad(note, at + i * .021, BAR + 1.25, .0165 * breathe, i % 2 ? -.35 : .35);
      });
      if (bar === 7) this._piano(61, at + 2.85 * BEAT, 1.7, .24, -.12);
      if (bar % 4 === 2) this._wood(86, at + 3.18 * BEAT, .040);
      if (bar % 8 === 5) this._wood(81, at + 3.35 * BEAT, .045);
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

    _registerVoice(source, nodes, isEffect = false) {
      const pool = isEffect ? this._effectNodes : this._voiceNodes;
      pool.add(source);
      source.onended = () => {
        pool.delete(source);
        for (const node of [source, ...nodes]) {
          try { node.disconnect(); } catch (_) {}
        }
      };
    }

    _piano(midi, at, duration, velocity, pan) {
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
      gain.gain.setValueAtTime(velocity * .28, at);
      gain.gain.setValueAtTime(velocity * .28, at + Math.max(.1, length - .35));
      gain.gain.exponentialRampToValueAtTime(.0001, at + length);
      source.connect(tone).connect(gain).connect(panner).connect(this.musicInput);
      this._registerVoice(source, [tone, gain, panner]);
      source.start(at);
      source.stop(at + length + .02);
    }

    _wood(midi, at, level) {
      const ctx = this.ctx;
      [1, 2.76, 5.40].forEach((partial, i) => {
        const source = ctx.createOscillator();
        source.type = 'sine';
        source.frequency.value = frequency(midi) * partial;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(level * [1, .22, .035][i], at + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .80 - i * .22);
        source.connect(gain).connect(this.musicInput);
        this._registerVoice(source, [gain]);
        source.start(at);
        source.stop(at + .84);
      });
    }

    _pad(midi, at, duration, level, pan) {
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + .85);
      gain.gain.setValueAtTime(level * .9, at + Math.max(1, duration - 1.5));
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 740;
      tone.Q.value = .3;
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(tone).connect(panner).connect(this.musicInput);
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
        osc.start(at);
        osc.stop(at + duration + .03);
        return osc;
      });
      let ended = 0;
      oscillators.forEach(osc => {
        osc.onended = () => {
          this._voiceNodes.delete(osc);
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
      this._destroyed = true;
      this._playing = false;
      this._pauseTransport();
      clearTimeout(this._hideTimer);
      document.removeEventListener('visibilitychange', this._visibility);
      for (const source of this._effectNodes) {
        try { source.stop(); } catch (_) {}
      }
      this._effectNodes.clear();
      this._pianoSamples.clear();
      this._pianoWorker?.terminate();
      this._pianoLoadResolve?.();
      if (this._pianoWorkerUrl) URL.revokeObjectURL(this._pianoWorkerUrl);
      if (this.ctx) this.ctx.close().catch(() => {});
    }
  }
  window.MoonAudio = MoonAudio;
})();
