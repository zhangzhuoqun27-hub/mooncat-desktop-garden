(() => {
  'use strict';

  const PALETTES = {
    violet: { stars: ['#eee9ff', '#cab7ff', '#ffd4de', '#b9d4ff'], mist: ['137,98,221', '104,99,187', '193,111,159'], burst: '#e4caff' },
    blue: { stars: ['#e8f5ff', '#bce4ff', '#e2d1ff', '#ffd8dc'], mist: ['70,121,204', '100,124,208', '112,167,180'], burst: '#bfe9ff' },
    rose: { stars: ['#fff0f0', '#ffccd9', '#e1caff', '#ffe0bf'], mist: ['172,91,149', '138,89,188', '209,124,121'], burst: '#ffd1df' }
  };
  const TAU = Math.PI * 2;
  const random = (a, b) => a + Math.random() * (b - a);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class NightSky {
    constructor(canvas) {
      if (!canvas || typeof canvas.getContext !== 'function') {
        throw new TypeError('NightSky requires a canvas element.');
      }
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) throw new Error('A 2D canvas context is unavailable.');
      this.palette = PALETTES.violet;
      this.theme = 'violet';
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.time = 0;
      this.lastFrame = 0;
      this.frame = 0;
      this.destroyed = false;
      this.paused = false;
      this.warp = false;
      this.warpAmount = 0;
      this.pointer = { x: 0, y: 0 };
      this.gaze = { x: 0, y: 0 };
      this.stars = [];
      this.particles = [];
      this.meteors = [];
      this.rings = [];
      this.staticTimers = new Set();
      this.nextMeteor = random(6, 11);
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionQuery.matches;

      this.onPointer = (event) => {
        if (event.pointerType === 'touch') return;
        this.pointer.x = event.clientX / Math.max(1, this.width) - 0.5;
        this.pointer.y = event.clientY / Math.max(1, this.height) - 0.5;
      };
      this.onPointerLeave = (event) => {
        if (event.relatedTarget) return;
        this.pointer.x = 0;
        this.pointer.y = 0;
      };
      this.onResize = () => this.resize();
      this.onVisibility = () => {
        this.stop();
        if (!document.hidden) { this.render(); this.start(); }
      };
      this.onMotion = (event) => {
        this.reducedMotion = event.matches;
        this.stop();
        this.render();
        this.start();
      };
      this.tick = (now) => {
        this.frame = 0;
        if (this.destroyed || this.paused || this.reducedMotion || document.hidden) return;
        const delta = this.lastFrame ? clamp((now - this.lastFrame) / 1000, 0, 0.05) : 0.016;
        this.lastFrame = now;
        this.update(delta);
        this.render();
        this.frame = requestAnimationFrame(this.tick);
      };

      window.addEventListener('pointermove', this.onPointer, { passive: true });
      window.addEventListener('pointerout', this.onPointerLeave, { passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);
      if (this.motionQuery.addEventListener) this.motionQuery.addEventListener('change', this.onMotion);
      else this.motionQuery.addListener(this.onMotion);
      this.resize();
      this.start();
    }

    resize() {
      if (this.destroyed) return;
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, rect.width || window.innerWidth);
      this.height = Math.max(1, rect.height || window.innerHeight);
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const count = Math.round(clamp(this.width * this.height / 2700, 180, 680));
      while (this.stars.length < count) this.stars.push(this.makeStar());
      if (this.stars.length > count) this.stars.length = count;
      this.render();
    }

    makeStar() {
      const depth = Math.random();
      return {
        x: Math.random(), y: Math.random(), depth,
        radius: random(0.35, 0.85) + Math.pow(depth, 5) * 0.85,
        brightness: random(0.22, 0.62), phase: random(0, TAU),
        frequency: random(0.24, 0.7), color: Math.floor(random(0, 4)),
        special: Math.random() > 0.97
      };
    }

    start() {
      if (this.frame || this.destroyed || this.paused || this.reducedMotion || document.hidden) return;
      this.lastFrame = 0;
      this.frame = requestAnimationFrame(this.tick);
    }

    stop() {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastFrame = 0;
    }

    update(delta) {
      this.time += delta;
      const ease = 1 - Math.exp(-delta * 2.2);
      this.gaze.x += (this.pointer.x - this.gaze.x) * ease;
      this.gaze.y += (this.pointer.y - this.gaze.y) * ease;
      this.warpAmount += ((this.warp ? 1 : 0) - this.warpAmount) * (1 - Math.exp(-delta * 2.4));
      if (this.warpAmount > 0.005) {
        for (const star of this.stars) {
          const velocity = delta * this.warpAmount * (0.33 + star.depth * 1.6);
          star.x += (star.x - 0.5) * velocity;
          star.y += (star.y - 0.45) * velocity;
          if (star.x < -0.02 || star.x > 1.02 || star.y < -0.02 || star.y > 1.02) {
            const angle = random(0, TAU);
            const radius = random(0.04, 0.28);
            star.x = 0.5 + Math.cos(angle) * radius;
            star.y = 0.45 + Math.sin(angle) * radius;
          }
        }
      }
      if (this.time > this.nextMeteor && !this.warp) {
        this.addMeteor();
        this.nextMeteor = this.time + random(7, 13);
      }
      for (const meteor of this.meteors) {
        meteor.age += delta;
        meteor.x += meteor.vx * delta;
        meteor.y += meteor.vy * delta;
      }
      this.meteors = this.meteors.filter((meteor) => meteor.age < meteor.life);
      for (const particle of this.particles) {
        particle.age += delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.exp(-delta * 1.8);
        particle.vy *= Math.exp(-delta * 1.8);
        particle.vy += delta * 12;
      }
      this.particles = this.particles.filter((particle) => particle.age < particle.life);
      for (const ring of this.rings) ring.age += delta;
      this.rings = this.rings.filter((ring) => ring.age < ring.life);
    }

    render() {
      if (this.destroyed || document.hidden) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const motion = this.reducedMotion ? 0 : this.time;
      const warp = this.reducedMotion ? (this.warp ? 0.55 : 0) : this.warpAmount;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;

      // Broad, barely visible pools of color sit behind the fine star layers.
      const mists = [
        [0.22 + Math.sin(motion * 0.026) * 0.018, 0.31, 0.45, 0.06],
        [0.76, 0.19 + Math.cos(motion * 0.019) * 0.024, 0.34, 0.04],
        [0.73 + Math.sin(motion * 0.014) * 0.015, 0.83, 0.32, 0.045]
      ];
      mists.forEach((mist, index) => {
        const x = mist[0] * w;
        const y = mist[1] * h;
        const radius = Math.max(w, h) * mist[2];
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${this.palette.mist[index]},${mist[3]})`);
        gradient.addColorStop(0.5, `rgba(${this.palette.mist[index]},${mist[3] * 0.35})`);
        gradient.addColorStop(1, `rgba(${this.palette.mist[index]},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });

      for (const star of this.stars) {
        const parallax = this.reducedMotion ? 0 : 8 + star.depth * 22;
        const x = ((star.x * w + this.gaze.x * parallax) % w + w) % w;
        const y = ((star.y * h + this.gaze.y * parallax) % h + h) % h;
        const twinkle = 0.7 + 0.3 * Math.sin(motion * star.frequency + star.phase);
        const alpha = clamp(star.brightness * twinkle + warp * 0.18, 0, 1);
        ctx.fillStyle = this.palette.stars[star.color];
        ctx.strokeStyle = this.palette.stars[star.color];
        ctx.globalAlpha = alpha;
        if (warp > 0.025) {
          const dx = x - w * 0.5;
          const dy = y - h * 0.45;
          const length = warp * (0.045 + star.depth * 0.09);
          ctx.lineWidth = Math.max(0.55, star.radius * 0.75);
          ctx.beginPath();
          ctx.moveTo(x - dx * length, y - dy * length);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, TAU);
        ctx.fill();
        if (star.special) {
          ctx.globalAlpha = alpha * 0.13;
          ctx.beginPath();
          ctx.arc(x, y, star.radius * 4, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = alpha * 0.44;
          ctx.lineWidth = 0.55;
          const ray = star.radius * 3.1;
          ctx.beginPath();
          ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
          ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
          ctx.stroke();
        }
      }

      for (const meteor of this.meteors) {
        const fade = Math.sin(Math.PI * clamp(meteor.age / meteor.life, 0, 1));
        const tailX = meteor.x - meteor.dx * meteor.length;
        const tailY = meteor.y - meteor.dy * meteor.length;
        const gradient = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        gradient.addColorStop(0, 'rgba(217,212,255,0)');
        gradient.addColorStop(0.75, 'rgba(217,212,255,0.4)');
        gradient.addColorStop(1, '#fff4ee');
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(meteor.x, meteor.y); ctx.stroke();
        ctx.fillStyle = '#fff7f3';
        ctx.beginPath(); ctx.arc(meteor.x, meteor.y, 1.25, 0, TAU); ctx.fill();
      }

      for (const ring of this.rings) {
        const progress = clamp(ring.age / ring.life, 0, 1);
        ctx.globalAlpha = (1 - progress) * 0.22;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(ring.x, ring.y, 8 + progress * 78, 0, TAU); ctx.stroke();
      }
      for (const particle of this.particles) {
        const progress = clamp(particle.age / particle.life, 0, 1);
        const radius = particle.radius * (1 - progress * 0.55);
        ctx.globalAlpha = Math.pow(1 - progress, 1.4) * 0.9;
        ctx.fillStyle = particle.color;
        if (particle.sparkle) {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.angle + progress * 0.9);
          ctx.beginPath();
          ctx.moveTo(0, -radius * 2.6); ctx.quadraticCurveTo(radius * 0.4, -radius * 0.4, radius * 2.6, 0);
          ctx.quadraticCurveTo(radius * 0.4, radius * 0.4, 0, radius * 2.6);
          ctx.quadraticCurveTo(-radius * 0.4, radius * 0.4, -radius * 2.6, 0);
          ctx.quadraticCurveTo(-radius * 0.4, -radius * 0.4, 0, -radius * 2.6);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(particle.x, particle.y, radius, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // x and y are viewport/client coordinates, convenient for pointer events.
    burst(x, y, color) {
      if (this.destroyed || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const bounds = this.canvas.getBoundingClientRect();
      x -= bounds.left;
      y -= bounds.top;
      const tint = typeof color === 'string' ? color : this.palette.burst;
      const isStatic = this.reducedMotion || this.paused;
      const added = [];
      for (let i = 0; i < 28; i += 1) {
        const angle = random(0, TAU);
        const speed = random(36, 145);
        const particle = {
          x: x + (isStatic ? Math.cos(angle) * random(8, 42) : 0),
          y: y + (isStatic ? Math.sin(angle) * random(8, 42) : 0),
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          age: 0, life: random(0.75, 1.7), radius: random(0.65, 1.8), angle,
          color: i % 4 === 0 ? '#fff0ca' : tint, sparkle: i % 4 === 0
        };
        this.particles.push(particle);
        added.push(particle);
      }
      const ring = { x, y, age: isStatic ? 0.25 : 0, life: 0.8, color: tint };
      this.rings.push(ring);
      // Keep repeated enthusiastic clicks comfortably bounded.
      if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
      if (this.rings.length > 16) this.rings.splice(0, this.rings.length - 16);
      this.render();
      if (isStatic) this.expireStatic(() => {
        const expired = new Set(added);
        this.particles = this.particles.filter((particle) => !expired.has(particle));
        this.rings = this.rings.filter((entry) => entry !== ring);
      }, 650);
    }

    addMeteor() {
      const angle = random(2.5, 2.7);
      const speed = random(430, 670);
      const meteor = {
        x: random(0.4, 0.96) * this.width, y: random(0.06, 0.35) * this.height,
        dx: Math.cos(angle), dy: Math.sin(angle),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        age: 0, life: random(0.7, 1.15), length: random(90, 170)
      };
      this.meteors.push(meteor);
      if (this.meteors.length > 8) this.meteors.shift();
      return meteor;
    }

    meteor() {
      if (this.destroyed) return;
      const meteor = this.addMeteor();
      if (this.reducedMotion || this.paused) {
        meteor.age = meteor.life * 0.5;
        this.render();
        this.expireStatic(() => { this.meteors = this.meteors.filter((entry) => entry !== meteor); }, 650);
      } else {
        this.render();
        this.start();
      }
    }

    expireStatic(callback, delay) {
      const timer = window.setTimeout(() => {
        this.staticTimers.delete(timer);
        if (this.destroyed) return;
        callback();
        this.render();
      }, delay);
      this.staticTimers.add(timer);
    }

    setTheme(name) {
      if (this.destroyed || !Object.prototype.hasOwnProperty.call(PALETTES, name)) return;
      this.theme = name;
      this.palette = PALETTES[name];
      this.render();
    }

    setPaused(paused) {
      if (this.destroyed) return;
      this.paused = Boolean(paused);
      this.stop();
      this.render();
      this.start();
    }

    setWarp(enabled) {
      if (this.destroyed) return;
      this.warp = Boolean(enabled);
      this.render();
      this.start();
    }

    destroy() {
      if (this.destroyed) return;
      this.stop();
      this.destroyed = true;
      window.removeEventListener('pointermove', this.onPointer);
      window.removeEventListener('pointerout', this.onPointerLeave);
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.motionQuery.removeEventListener) this.motionQuery.removeEventListener('change', this.onMotion);
      else this.motionQuery.removeListener(this.onMotion);
      for (const timer of this.staticTimers) window.clearTimeout(timer);
      this.staticTimers.clear();
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.particles.length = 0;
      this.stars.length = 0;
      this.meteors.length = 0;
      this.rings.length = 0;
    }
  }

  window.NightSky = NightSky;
})();
