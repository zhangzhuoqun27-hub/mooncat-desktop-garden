/* A little persistent moon garden. Everything illustrated here is original canvas art. */
(() => {
  'use strict';
  const W = 700, H = 440, STORAGE_KEY = 'mooncat.moon-garden.v1';
  const SEEDS = {
    moon: { name: '月白花', cost: 2, time: 15000, yield: 4, petal: '#f2e4c5', center: '#b8974c', leaf: '#6e8b68' },
    dream: { name: '晚梦铃', cost: 3, time: 30000, yield: 6, petal: '#c9a5a2', center: '#ddc794', leaf: '#6f8b78' },
    peach: { name: '桃星花', cost: 4, time: 45000, yield: 8, petal: '#d6b977', center: '#efe0b7', leaf: '#819064' }
  };
  const DECOR = { bench: { name: '月光长椅', price: 8 }, lantern: { name: '暖星灯', price: 10 }, mushroom: { name: '小蘑菇屋', price: 12 } };
  const PLOTS = [{ x: 253, y: 222 }, { x: 357, y: 222 }, { x: 461, y: 222 }, { x: 253, y: 294 }, { x: 357, y: 294 }, { x: 461, y: 294 }];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const finite = n => Number.isFinite(Number(n)) ? Number(n) : 0;
  const flowerIcon = seed => `<svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 37V18M20 29C12 30 10 25 11 23c6-1 9 3 9 6Zm0-4c6 0 10-4 9-7-6 0-9 4-9 7Z" stroke="${seed.leaf}" stroke-width="2" fill="${seed.leaf}"/><g fill="${seed.petal}"><ellipse cx="20" cy="10" rx="5" ry="8"/><ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(72 20 17)"/><ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(144 20 17)"/><ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(216 20 17)"/><ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(288 20 17)"/></g><circle cx="20" cy="17" r="4" fill="${seed.center}"/></svg>`;
  const starIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 2.8 6.8 7.2.8-5.4 4.8 1.6 7-6.2-3.6-6.2 3.6 1.6-7L2 9.6l7.2-.8L12 2Z" fill="#edcfa2"/></svg>`;
  const shopIcons = {
    bench: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 9h18v8H5z" fill="#a18b68"/><path d="M4 19h20M7 20v4m14-4v4M5 13h18" stroke="#dbcba5" stroke-width="2" stroke-linecap="round"/></svg>',
    lantern: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 3v4m-5 1h10l2 14H7L9 8Z" stroke="#887854" stroke-width="1.5"/><path d="M10 11h8l1 9H9l1-9Z" fill="#dac38d"/><path d="M6 24h16" stroke="#887854" stroke-width="1.5"/></svg>',
    mushroom: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M9 16h10v9H9z" fill="#e0d1ad"/><path d="M3 17c0-17 22-17 22 0H3Z" fill="#a88379"/><circle cx="10" cy="11" r="2" fill="#e8d9ba"/><circle cx="19" cy="13" r="2" fill="#e8d9ba"/></svg>',
    feed: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 10 5 3l8 5h3l7-5-1 8c7 11-18 15-16-1Z" fill="#efe0c3"/><circle cx="10" cy="14" r="1" fill="#443c32"/><circle cx="18" cy="14" r="1" fill="#443c32"/><path d="m13 18 1 1 1-1" stroke="#a47d71" stroke-width="1.5"/></svg>'
  };

  class MoonGame {
    constructor(rootElement, options = {}) {
      if (!rootElement || typeof rootElement.appendChild !== 'function') throw new TypeError('MoonGame requires a root element.');
      this.root = rootElement;
      this.audio = options.audio || null;
      this.onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
      this.defaultAutocare = options.autoCare === true;
      this.notifyAutocare = options.notifyAutocare === true;
      this.lowMotionFPS = clamp(finite(options.lowMotionFPS || (options.widget ? 12 : 60)), 6, 60);
      this.selectedSeed = 'moon';
      this.destroyed = false;
      this.state = 'ready';
      this.listeners = [];
      this.particles = [];
      this.sceneTime = 0;
      this.lastFrame = null;
      this.lastDraw = null;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.data = this.load();
      this.mount();
      this.bind();
      this.refresh();
      this.resize();
      this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
      if (this.observer) this.observer.observe(this.canvas);
      this.start();
    }

    load() {
      const now = Date.now();
      const data = { version: 1, wallet: 12, happiness: 65, plots: Array(6).fill(null), decorations: { bench: false, lantern: false, mushroom: false }, giftAt: 0, feedAt: 0, autoCare: this.defaultAutocare, autoAt: now };
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!parsed || parsed.version !== 1 || typeof parsed !== 'object') return data;
        data.wallet = Math.floor(clamp(finite(parsed.wallet), 0, 1000000));
        data.happiness = Math.round(clamp(finite(parsed.happiness), 0, 100));
        data.giftAt = clamp(finite(parsed.giftAt), 0, now);
        data.feedAt = clamp(finite(parsed.feedAt), 0, now);
        data.autoCare = typeof parsed.autoCare === 'boolean' ? parsed.autoCare : this.defaultAutocare;
        data.autoAt = parsed.autoAt ? clamp(finite(parsed.autoAt), 1, now) : now;
        for (const key of Object.keys(DECOR)) data.decorations[key] = parsed.decorations && parsed.decorations[key] === true;
        if (Array.isArray(parsed.plots)) data.plots = Array.from({ length: 6 }, (_, i) => {
          const p = parsed.plots[i];
          if (!p || !Object.hasOwn(SEEDS, p.type)) return null;
          return { type: p.type, plantedAt: clamp(finite(p.plantedAt), 1, now), wateredAt: p.wateredAt ? clamp(finite(p.wateredAt), 1, now) : 0 };
        });
      } catch (_) { /* A new garden is always available, even without browser storage. */ }
      return data;
    }

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (_) {}
    }

    mount() {
      this.el = document.createElement('section');
      this.el.className = 'moon-game';
      this.el.setAttribute('aria-label', '月球小花园');
      this.el.innerHTML = `<div class="mg-heading"><div><span class="mg-eyebrow">YOUR LITTLE GARDEN ON THE MOON</span><h2 class="mg-title">月球小花园</h2></div><div class="mg-heading-actions"><button type="button" class="mg-autocare" data-garden-action="autocare" data-mg="autocare" aria-pressed="false" aria-label="月白托管，自动播种、浇水和收获">月白托管</button><div class="mg-wallet">${starIcon}<div><span>星光零钱</span><strong data-mg="wallet">12</strong></div></div></div></div>
        <div class="mg-scene"><canvas class="mg-canvas" role="img" aria-label="星空里漂浮的小花园，六块花田和陪伴你的奶油色小猫月白。"></canvas><div class="mg-scene-tag">第 01 号月岛 · 不慌不忙，慢慢长大</div><div class="mg-cat-status">月白的好心情 <span data-mg="happy">65</span>%<small data-mg="cat-copy">在花园里陪着你</small><i data-mg="happy-bar"></i></div>${PLOTS.map((p, i) => `<button type="button" class="mg-plot-button" data-garden-action="plot" data-index="${i}" style="left:${p.x / W * 100}%;top:${p.y / H * 100}%" aria-label="花田 ${i + 1}：空地，点击播种"><span>播种</span></button>`).join('')}</div>
        <p class="mg-guide">选一包种子 → 点击花田播种 → 再点一次浇水 → 花开时收获星光</p>
        <div class="mg-seeds" role="group" aria-label="选择花种">${Object.entries(SEEDS).map(([key, seed]) => `<button type="button" class="mg-seed" data-garden-action="seed" data-seed="${key}" aria-pressed="${key === 'moon'}" aria-label="选择${seed.name}种子，花费 ${seed.cost} 星光，浇水后 ${seed.time / 1000} 秒开花，收获 ${seed.yield} 星光">${flowerIcon(seed)}<span><b>${seed.name}</b><small><em>${seed.cost} ✦</em> · ${seed.time / 1000} 秒开花</small><small>收获 ${seed.yield} ✦</small></span></button>`).join('')}</div>
        <div class="mg-shop-title">给月岛添一点喜欢的东西</div><div class="mg-shop">${Object.entries(DECOR).map(([key, item]) => `<button type="button" class="mg-shop-button" data-garden-action="decorate" data-decor="${key}">${shopIcons[key]}<span><b>${item.name}</b><small data-mg-price="${key}">${item.price} ✦ · 永久摆件</small></span></button>`).join('')}<button type="button" class="mg-shop-button" data-garden-action="feed">${shopIcons.feed}<span><b>喂月白小鱼干</b><small data-mg="feed-label">1 ✦ · 心情 +10</small></span></button></div>
        <div class="mg-status-row"><p class="mg-live" data-mg="live" role="status" aria-live="polite">先选月白花，在一块空地播种。月白会陪你等花开。</p><button type="button" class="mg-gift" data-garden-action="gift" data-mg="gift" hidden>月白的小礼物 +2 ✦</button></div><p class="mg-note">花园会自动保存。离开后，浇过水的花朵也会慢慢长大。</p>`;
      this.root.appendChild(this.el);
      this.canvas = this.el.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      const q = n => this.el.querySelector(`[data-mg="${n}"]`);
      this.ui = { wallet: q('wallet'), happy: q('happy'), happyBar: q('happy-bar'), catCopy: q('cat-copy'), live: q('live'), gift: q('gift'), feedLabel: q('feed-label'), autoCare: q('autocare') };
      this.plotButtons = Array.from(this.el.querySelectorAll('[data-garden-action="plot"]'));
      this.seedButtons = Array.from(this.el.querySelectorAll('[data-garden-action="seed"]'));
      this.decorButtons = Array.from(this.el.querySelectorAll('[data-garden-action="decorate"]'));
      this.feedButton = this.el.querySelector('[data-garden-action="feed"]');
    }

    listen(target, type, fn) {
      target.addEventListener(type, fn);
      this.listeners.push(() => target.removeEventListener(type, fn));
    }

    bind() {
      this.listen(this.el, 'click', e => {
        const button = e.target.closest('[data-garden-action]');
        if (!button || !this.el.contains(button) || this.destroyed || button.disabled) return;
        const action = button.dataset.gardenAction;
        if (action === 'seed') this.selectSeed(button.dataset.seed);
        else if (action === 'plot') this.tend(Number(button.dataset.index));
        else if (action === 'decorate') this.decorate(button.dataset.decor);
        else if (action === 'feed') this.feed();
        else if (action === 'gift') this.gift();
        else if (action === 'autocare') this.setAutocare(!this.autocare);
      });
      this.listen(document, 'visibilitychange', () => {
        this.lastFrame = null;
        if (!document.hidden) { this.runAutocare(); this.refresh(); this.render(); }
      });
      if (typeof ResizeObserver !== 'function') this.listen(window, 'resize', () => this.resize());
    }

    selectSeed(key) {
      if (!Object.hasOwn(SEEDS, key)) return;
      this.selectedSeed = key;
      this.seedButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seed === key)));
      this.say(`选好了${SEEDS[key].name}。找一块空地，把它种下来吧。`);
    }

    phase(plot, now = Date.now()) {
      if (!plot) return 'empty';
      if (!plot.wateredAt) return 'dry';
      return now - plot.wateredAt >= SEEDS[plot.type].time ? 'ready' : 'growing';
    }

    tend(index) {
      if (!Number.isInteger(index) || index < 0 || index >= 6 || this.destroyed) return;
      const now = Date.now(), plot = this.data.plots[index], phase = this.phase(plot, now), pos = PLOTS[index];
      if (phase === 'empty') {
        const seed = SEEDS[this.selectedSeed];
        if (this.data.wallet < seed.cost) { this.say(`这包种子需要 ${seed.cost} 星光。可以先收获花朵，或收下月白的小礼物。`); this.refresh(); return; }
        this.data.wallet -= seed.cost;
        this.data.plots[index] = { type: this.selectedSeed, plantedAt: now, wateredAt: 0 };
        this.say(`${seed.name}种下啦。再点这块花田，给它一点水。`);
        this.burst(pos.x, pos.y - 15, '#c3b18f', 7);
        this.sound('chime');
      } else if (phase === 'dry') {
        plot.wateredAt = now;
        this.say(`水浇好啦。${SEEDS[plot.type].name}会在 ${SEEDS[plot.type].time / 1000} 秒后开花，可以先照料别的花。`);
        this.burst(pos.x, pos.y - 18, '#b4c8df', 11);
        this.sound('chime');
      } else if (phase === 'growing') {
        const seconds = Math.max(1, Math.ceil((SEEDS[plot.type].time - (now - plot.wateredAt)) / 1000));
        this.say(`${SEEDS[plot.type].name}还在慢慢长大，大约再等 ${seconds} 秒。不着急。`);
        return;
      } else {
        const seed = SEEDS[plot.type];
        this.data.wallet += seed.yield;
        this.data.happiness = Math.min(100, this.data.happiness + 2);
        this.data.plots[index] = null;
        this.say(`收获了${seed.name}，得到 ${seed.yield} 星光。月白闻了闻花香，心情也变好了。`);
        this.burst(pos.x, pos.y - 31, '#efd6a5', 18);
        this.sound('collect');
        if (this.onComplete) { try { this.onComplete({ type: 'harvest', seed: plot.type, flower: seed.name, starlight: seed.yield, wallet: this.data.wallet }); } catch (_) {} }
      }
      this.save(); this.refresh(); this.render();
    }

    decorate(key) {
      if (!Object.hasOwn(DECOR, key) || this.data.decorations[key]) return;
      const item = DECOR[key];
      if (this.data.wallet < item.price) { this.say(`${item.name}需要 ${item.price} 星光，花朵会帮你慢慢攒够。`); return; }
      this.data.wallet -= item.price;
      this.data.decorations[key] = true;
      this.say(`${item.name}安放好了。从此，月岛又多了一处温暖。`);
      this.burst(key === 'bench' ? 161 : key === 'lantern' ? 503 : 551, key === 'lantern' ? 161 : 264, '#efcaa2', 15);
      this.sound('chime'); this.save(); this.refresh(); this.render();
    }

    feed() {
      const now = Date.now();
      if (this.data.happiness >= 100) { this.say('月白已经很满足啦，正幸福地晒着月光。'); return; }
      if (now - this.data.feedAt < 30000) { this.say('月白正在慢慢嚼小鱼干，等它吃完再喂吧。'); return; }
      if (this.data.wallet < 1) { this.say('先收获一点星光，再请月白吃小鱼干吧。'); return; }
      this.data.wallet -= 1;
      this.data.happiness = Math.min(100, this.data.happiness + 10);
      this.data.feedAt = now;
      this.say('月白吃到了小鱼干，轻轻蹭了蹭你的手。好心情 +10。');
      this.burst(551, 259, '#e5b0bd', 12);
      this.sound('chime'); this.save(); this.refresh(); this.render();
    }

    gift() {
      const now = Date.now();
      if (this.data.wallet >= 2 || this.data.plots.some(p => this.phase(p, now) === 'ready') || now - this.data.giftAt < 60000) return;
      this.data.wallet += 2;
      this.data.giftAt = now;
      this.say('月白从口袋里找出了两颗星光。种一朵月白花，重新慢慢攒起来吧。');
      this.sound('chime'); this.save(); this.refresh();
    }

    get autocare() { return this.data.autoCare; }

    setAutocare(enabled) {
      if (this.destroyed) return false;
      const value = Boolean(enabled), now = Date.now();
      if (value === this.data.autoCare) return value;
      if (this.data.autoCare) this.runAutocare(now);
      this.data.autoCare = value;
      this.data.autoAt = now;
      if (value) {
        const summary = this.runAutocare(now);
        if (!summary || !summary.flowers) this.say('月白托管开启啦。它会自动播种、浇水和收获，你可以安心忙自己的事。');
      } else {
        this.save();
        this.say('月白托管暂停了。花朵依然会长大，等你亲手收获。');
      }
      this.refresh(); this.render();
      return value;
    }

    backgroundTick() {
      if (this.destroyed) return null;
      if (this.data.autoCare) return this.runAutocare(Date.now(), false);
      this.refresh();
      return null;
    }

    runAutocare(now = Date.now(), paint = true) {
      if (this.destroyed || !this.data.autoCare) return null;
      // Only six arithmetic calculations are needed, even after a long absence.
      // autoAt and the replanted timestamps are saved together, preventing replayed income.
      const previous = Math.min(this.data.autoAt || now, now);
      const intervalStart = Math.max(previous, now - 24 * 60 * 60 * 1000);
      let flowers = 0, income = 0, planted = 0, watered = 0;
      for (let i = 0; i < 6; i++) {
        const plot = this.data.plots[i];
        if (!plot) continue;
        const seed = SEEDS[plot.type];
        if (!plot.wateredAt) {
          plot.wateredAt = Math.max(intervalStart, Math.min(plot.plantedAt, now));
          watered += 1;
        }
        const firstReady = Math.max(plot.wateredAt + seed.time, intervalStart);
        if (firstReady > now) continue;
        const count = 1 + Math.floor((now - firstReady) / seed.time);
        const before = this.data.wallet;
        this.data.wallet = Math.min(1000000, this.data.wallet + count * (seed.yield - seed.cost));
        income += this.data.wallet - before;
        this.data.happiness = Math.min(100, this.data.happiness + count * 2);
        const replantedAt = firstReady + (count - 1) * seed.time;
        this.data.plots[i] = { type: plot.type, plantedAt: replantedAt, wateredAt: replantedAt };
        flowers += count;
      }
      // An exhausted garden can restart itself with the same modest cat gift.
      if (this.data.wallet < 2 && this.data.plots.some(p => !p) && now - this.data.giftAt >= 60000) {
        this.data.wallet += 2; this.data.giftAt = now;
      }
      for (let i = 0; i < 6; i++) {
        if (this.data.plots[i]) continue;
        const type = this.data.wallet >= SEEDS[this.selectedSeed].cost ? this.selectedSeed : 'moon';
        if (this.data.wallet < SEEDS[type].cost) break;
        this.data.wallet -= SEEDS[type].cost;
        this.data.plots[i] = { type, plantedAt: now, wateredAt: now };
        planted += 1;
      }
      this.data.autoAt = now;
      this.save();
      const summary = { type: 'autocare', flowers, starlight: income, wallet: this.data.wallet, planted, watered, offline: now - previous > 5000 };
      this.lastAutocareSummary = summary;
      if (flowers) this.say(`月白帮你照料了 ${flowers} 朵花，星光零钱现在有 ${this.data.wallet} 颗。`);
      else if (planted || watered) this.say(`月白正在照料花田，会替你浇水、收获，再种下新的小花。`);
      // Auto-care is quiet by default; integrations may request one summary per batch.
      if (flowers && this.notifyAutocare && this.onComplete) { try { this.onComplete(summary); } catch (_) {} }
      this.refresh();
      if (paint && !document.hidden) this.render();
      return summary;
    }

    refresh() {
      if (this.destroyed) return;
      const now = Date.now();
      this.ui.wallet.textContent = String(this.data.wallet);
      this.ui.autoCare.setAttribute('aria-pressed', String(this.data.autoCare));
      this.ui.autoCare.textContent = this.data.autoCare ? '月白托管 · 开' : '月白托管';
      this.ui.happy.textContent = String(this.data.happiness);
      this.ui.happyBar.style.width = `${this.data.happiness * .74}px`;
      this.ui.catCopy.textContent = this.data.happiness >= 90 ? '幸福地眯起了眼睛' : this.data.happiness >= 70 ? '尾巴晃呀晃，心情很好' : '在花园里陪着你';
      for (let i = 0; i < 6; i++) {
        const plot = this.data.plots[i], stage = this.phase(plot, now), button = this.plotButtons[i];
        button.dataset.stage = stage;
        const remaining = stage === 'growing' ? Math.max(1, Math.ceil((SEEDS[plot.type].time - now + plot.wateredAt) / 1000)) : 0;
        const label = stage === 'empty' ? '播种' : stage === 'dry' ? '浇水' : stage === 'ready' ? '收获 ✦' : `${remaining}s`;
        button.querySelector('span').textContent = label;
        button.setAttribute('aria-label', `花田 ${i + 1}：${stage === 'empty' ? `空地，点击种下${SEEDS[this.selectedSeed].name}` : stage === 'dry' ? `${SEEDS[plot.type].name}需要浇水，点击浇水` : stage === 'ready' ? `${SEEDS[plot.type].name}开花了，点击收获 ${SEEDS[plot.type].yield} 星光` : `${SEEDS[plot.type].name}生长中，约 ${remaining} 秒后开花`}`);
      }
      for (const button of this.decorButtons) {
        const key = button.dataset.decor, owned = this.data.decorations[key];
        button.dataset.owned = String(owned); button.disabled = owned;
        button.querySelector('small').textContent = owned ? '已经在花园里啦' : `${DECOR[key].price} ✦ · 永久摆件`;
      }
      const eating = now - this.data.feedAt < 30000;
      this.feedButton.disabled = this.data.happiness >= 100 || eating;
      this.ui.feedLabel.textContent = this.data.happiness >= 100 ? '月白已经很满足啦' : eating ? '正慢慢吃小鱼干' : '1 ✦ · 心情 +10';
      const needsGift = this.data.wallet < 2 && !this.data.plots.some(p => this.phase(p, now) === 'ready');
      this.ui.gift.hidden = !needsGift;
      this.ui.gift.disabled = now - this.data.giftAt < 60000;
      this.ui.gift.textContent = this.ui.gift.disabled ? `小礼物 ${Math.ceil((60000 - now + this.data.giftAt) / 1000)}s 后回来` : '月白的小礼物 +2 ✦';
    }

    say(message) { this.ui.live.textContent = message; }
    sound(name) {
      try { if (this.audio && typeof this.audio[name] === 'function') { const result = this.audio[name](); if (result && result.catch) result.catch(() => {}); } } catch (_) {}
    }

    start() {
      if (this.destroyed) return;
      this.state = 'running'; this.lastFrame = null; this.lastDraw = null; this.runAutocare(); this.refresh(); this.resize();
      if (!this.timer) this.timer = setInterval(() => {
        if (this.data.autoCare && Date.now() - this.data.autoAt >= 2000) this.runAutocare();
        if (!document.hidden) { this.refresh(); if (this.reducedMotion) this.render(); }
      }, 500);
      if (!this.frameId && !this.reducedMotion) this.frameId = requestAnimationFrame(t => this.frame(t));
    }
    pause() {
      if (this.destroyed) return;
      this.state = 'paused';
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.frameId) { cancelAnimationFrame(this.frameId); this.frameId = null; }
      this.lastFrame = null;
    }
    resume() { if (!this.destroyed) this.start(); }
    resize() {
      if (this.destroyed || !this.ctx) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
      this.render();
    }
    frame(timestamp) {
      this.frameId = null;
      if (this.destroyed || this.state !== 'running') return;
      const dt = this.lastFrame === null ? 0 : Math.min(.05, Math.max(0, (timestamp - this.lastFrame) / 1000));
      this.lastFrame = timestamp;
      if (!document.hidden) {
        this.sceneTime += dt;
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 25 * dt; p.life -= dt;
          if (p.life <= 0) this.particles.splice(i, 1);
        }
        if (this.lastDraw === null || timestamp - this.lastDraw >= 1000 / this.lowMotionFPS - .5) {
          this.lastDraw = timestamp; this.render();
        }
      }
      if (!this.destroyed) this.frameId = requestAnimationFrame(t => this.frame(t));
    }
    burst(x, y, color, count) {
      if (this.reducedMotion) return;
      for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, speed = 13 + Math.random() * 36; this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 13, color, life: .6 + Math.random() * .45, r: 1 + Math.random() * 1.5 }); }
    }

    ellipse(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
    glow(ctx, x, y, r, color) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    star(ctx, x, y, r, color) {
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * .45 : r; if (!i) ctx.moveTo(Math.cos(a) * k, Math.sin(a) * k); else ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); } ctx.closePath(); ctx.fill(); ctx.restore();
    }
    terrain(ctx) {
      this.glow(ctx, 350, 330, 234, 'rgba(183,201,163,.07)');
      this.ellipse(ctx, 356, 364, 228, 27, 'rgba(156,178,143,.06)');
      this.ellipse(ctx, 269, 385, 62, 11, 'rgba(156,178,143,.08)');
      ctx.fillStyle = '#94866a'; ctx.beginPath(); ctx.moveTo(83, 261); ctx.bezierCurveTo(121, 331, 161, 311, 181, 347); ctx.lineTo(245, 350); ctx.lineTo(280, 381); ctx.lineTo(352, 363); ctx.lineTo(416, 377); ctx.lineTo(450, 339); ctx.lineTo(517, 341); ctx.bezierCurveTo(567, 311, 603, 307, 619, 256); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a7357'; ctx.beginPath(); ctx.moveTo(245, 319); ctx.lineTo(280, 381); ctx.lineTo(297, 329); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6e6c53'; ctx.beginPath(); ctx.moveTo(432, 324); ctx.lineTo(416, 377); ctx.lineTo(384, 342); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(231,217,181,.2)'; ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const x = 132 + i * 54; ctx.beginPath(); ctx.moveTo(x, 307); ctx.lineTo(x + 10, 325 + i % 3 * 6); ctx.stroke(); }
      ctx.fillStyle = '#b7c9a3'; ctx.beginPath(); ctx.moveTo(80, 256); ctx.bezierCurveTo(70, 206, 142, 157, 240, 153); ctx.bezierCurveTo(282, 134, 433, 139, 477, 164); ctx.bezierCurveTo(573, 163, 635, 220, 618, 265); ctx.bezierCurveTo(604, 315, 519, 338, 433, 337); ctx.bezierCurveTo(345, 355, 224, 332, 172, 311); ctx.bezierCurveTo(115, 303, 88, 280, 80, 256); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#58634b'; ctx.lineWidth = 1.4; ctx.stroke();
      // A small pond, moss, stones, and a winding footpath.
      this.ellipse(ctx, 147, 245, 36, 25, '#83917d'); this.ellipse(ctx, 147, 243, 30, 19, '#829f99'); this.ellipse(ctx, 142, 237, 23, 11, 'rgba(235,228,202,.12)');
      ctx.strokeStyle = '#c5c7c1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(147, 243, 22, 12, 0, .15, 1.7); ctx.stroke();
      if (!this.reducedMotion) {
        for (let i = 0; i < 2; i++) {
          const ripple = (this.sceneTime * .24 + i * .5) % 1;
          ctx.strokeStyle = `rgba(239,231,225,${(1 - ripple) * .34})`; ctx.lineWidth = .9;
          ctx.beginPath(); ctx.ellipse(146, 241, 4 + ripple * 22, 2 + ripple * 13, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      this.ellipse(ctx, 129, 249, 7, 3, '#a8b89e'); this.ellipse(ctx, 160, 235, 5, 2.5, '#a8b89e');
      for (let i = 0; i < 10; i++) { const x = 331 + Math.sin(i * .42) * 17, y = 325 - i * 15; this.ellipse(ctx, x, y, 10 + (i % 2) * 2, 4.5, i % 2 ? '#d7ceaf' : '#cbc0a0'); }
      for (let i = 0; i < 40; i++) { const x = 110 + (i * 113.3 % 480), y = 171 + (i * 57.4 % 150); if (x > 213 && x < 499 && y > 197 && y < 313) continue; ctx.strokeStyle = i % 2 ? '#74876a' : '#849272'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 4); ctx.stroke(); if (i % 5 === 0) this.ellipse(ctx, x + 2, y - 5, 1.6, 1.6, '#e5d7ae'); }
      // A tiny fence at the back of the island, with rounded timber posts.
      ctx.strokeStyle = '#a58e62'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(255, 165); ctx.lineTo(431, 170); ctx.moveTo(255, 173); ctx.lineTo(431, 178); ctx.stroke();
      for (let x = 257; x < 440; x += 29) { ctx.strokeStyle = '#ad976e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 159 + (x - 257) * .025); ctx.lineTo(x, 182 + (x - 257) * .025); ctx.stroke(); }
      // Hanging vines wrap the edge of this little floating world.
      for (const x of [117, 169, 510, 568]) { ctx.strokeStyle = '#74876a'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(x, 291); ctx.quadraticCurveTo(x - 8, 318, x + 2, 330); ctx.stroke(); for (let k = 0; k < 4; k++) this.ellipse(ctx, x - (k % 2 ? 7 : 0), 299 + k * 6, 4, 2, '#7f926f'); }
    }

    plotArt(ctx, plot, index, now) {
      const p = PLOTS[index];
      this.ellipse(ctx, p.x, p.y + 4, 40, 21, 'rgba(75,68,43,.2)');
      this.ellipse(ctx, p.x, p.y, 38, 18, '#89745c');
      ctx.strokeStyle = '#625943'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(p.x, p.y, 37, 17, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(213,181,168,.17)'; ctx.lineWidth = 1; for (const dy of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(p.x - 23, p.y + dy); ctx.quadraticCurveTo(p.x, p.y + dy + 3, p.x + 23, p.y + dy); ctx.stroke(); }
      if (!plot) { this.ellipse(ctx, p.x - 11, p.y - 4, 2, 1.2, '#b09b79'); this.ellipse(ctx, p.x + 14, p.y + 5, 2.5, 1.3, '#c2aa83'); return; }
      const seed = SEEDS[plot.type], stage = this.phase(plot, now), progress = !plot.wateredAt ? .07 : clamp((now - plot.wateredAt) / seed.time, .1, 1);
      if (stage !== 'dry') this.ellipse(ctx, p.x, p.y, 30, 13, 'rgba(61,68,46,.12)');
      const positions = progress > .45 ? [{ x: 0, y: -4, size: 1 }, { x: -13, y: 0, size: .7 }, { x: 14, y: 2, size: .77 }] : [{ x: 0, y: -4, size: 1 }];
      for (const f of positions) {
        const h = (11 + 32 * progress) * f.size, x = p.x + f.x, y = p.y + f.y;
        const sway = this.reducedMotion ? 0 : Math.sin(this.sceneTime * 1.2 + index + f.x * .018) * 4.2 * progress;
        ctx.strokeStyle = seed.leaf; ctx.lineWidth = 2 * f.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y - h * .5, x + sway, y - h); ctx.stroke();
        ctx.fillStyle = seed.leaf; ctx.beginPath(); ctx.moveTo(x, y - h * .35); ctx.quadraticCurveTo(x - 13 * f.size, y - h * .58, x - 12 * f.size, y - h * .3); ctx.quadraticCurveTo(x - 5, y - h * .2, x, y - h * .35); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - h * .62); ctx.quadraticCurveTo(x + 12 * f.size, y - h * .89, x + 11 * f.size, y - h * .58); ctx.quadraticCurveTo(x + 5, y - h * .5, x, y - h * .62); ctx.fill();
        const bloom = clamp((progress - .55) / .45, 0, 1), radius = (3 + bloom * 7) * f.size;
        ctx.save(); ctx.translate(x + sway, y - h);
        if (plot.type === 'dream') {
          ctx.fillStyle = seed.petal; ctx.beginPath(); ctx.moveTo(-radius * .6, -radius * .5); ctx.bezierCurveTo(-radius * 1.1, -radius * 1.6, radius * 1.1, -radius * 1.6, radius * .6, -radius * .5); ctx.lineTo(radius, radius * .7); ctx.quadraticCurveTo(0, radius * 1.15, -radius, radius * .7); ctx.closePath(); ctx.fill(); this.ellipse(ctx, 0, radius * .8, radius * .6, 1.6, seed.center);
        } else if (plot.type === 'peach') {
          this.star(ctx, 0, 0, radius * 1.15, seed.petal); this.ellipse(ctx, 0, 0, radius * .3, radius * .3, seed.center);
        } else {
          for (let j = 0; j < 5; j++) { ctx.save(); ctx.rotate(j * Math.PI * 2 / 5); this.ellipse(ctx, 0, -radius * .52, radius * .45, radius * .7, seed.petal); ctx.restore(); } this.ellipse(ctx, 0, 0, radius * .36, radius * .36, seed.center);
        }
        ctx.restore();
      }
      if (stage === 'ready') { this.glow(ctx, p.x, p.y - 31, 34, 'rgba(244,215,169,.14)'); for (let j = 0; j < 3; j++) { const a = this.reducedMotion ? j * 2.1 : this.sceneTime * .5 + j * 2.1; this.star(ctx, p.x + Math.cos(a) * 24, p.y - 27 + Math.sin(a) * 15, 2.2, '#ecdab8'); } }
      if (stage === 'dry') { ctx.fillStyle = '#bdd4ce'; ctx.beginPath(); ctx.moveTo(p.x + 22, p.y - 33); ctx.bezierCurveTo(p.x + 16, p.y - 24, p.x + 27, p.y - 21, p.x + 27, p.y - 27); ctx.quadraticCurveTo(p.x + 27, p.y - 29, p.x + 22, p.y - 33); ctx.fill(); }
    }

    decorations(ctx) {
      if (this.data.decorations.bench) {
        ctx.save(); ctx.translate(177, 287); ctx.rotate(.1); ctx.fillStyle = '#8c775a'; ctx.fillRect(-34, -14, 65, 12); ctx.fillStyle = '#bda67b'; ctx.fillRect(-37, -1, 71, 7); ctx.strokeStyle = '#dac9a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-31, -9); ctx.lineTo(29, -9); ctx.stroke(); ctx.strokeStyle = '#6f654b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-28, 5); ctx.lineTo(-29, 15); ctx.moveTo(26, 5); ctx.lineTo(25, 15); ctx.stroke(); ctx.restore();
      }
      if (this.data.decorations.lantern) {
        const warmth = this.reducedMotion ? .19 : .19 + Math.sin(this.sceneTime * 2.1) * .032 + Math.sin(this.sceneTime * 6.3) * .008;
        ctx.save(); ctx.translate(513, 186); this.glow(ctx, 12, -43, 60, `rgba(250,207,135,${warmth})`); ctx.strokeStyle = '#6d6449'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -53); ctx.quadraticCurveTo(1, -60, 12, -57); ctx.stroke(); ctx.fillStyle = '#d3b798'; ctx.fillRect(6, -52, 12, 17); ctx.strokeStyle = '#84704f'; ctx.lineWidth = 1.7; ctx.strokeRect(6, -52, 12, 17); this.ellipse(ctx, 12, -43, 3, 5, '#f6d69d'); this.ellipse(ctx, 0, 1, 7, 2.5, '#84704f'); ctx.restore();
      }
      if (this.data.decorations.mushroom) {
        ctx.save(); ctx.translate(566, 248); this.ellipse(ctx, 0, 16, 28, 8, 'rgba(89,63,91,.18)'); ctx.fillStyle = '#ddcfb0'; ctx.beginPath(); ctx.roundRect(-16, -9, 31, 28, 6); ctx.fill(); ctx.fillStyle = '#b08478'; ctx.beginPath(); ctx.moveTo(-28, -7); ctx.bezierCurveTo(-29, -46, 28, -46, 29, -7); ctx.quadraticCurveTo(0, 2, -28, -7); ctx.fill(); this.ellipse(ctx, -11, -23, 5, 3, '#eadbb8'); this.ellipse(ctx, 12, -18, 6, 3.5, '#eadbb8'); this.ellipse(ctx, 2, -31, 4, 2.5, '#eadbb8'); ctx.fillStyle = '#716047'; ctx.beginPath(); ctx.roundRect(-5, 3, 11, 16, [5, 5, 0, 0]); ctx.fill(); this.ellipse(ctx, 10, 4, 3, 3, '#e6c8a0'); ctx.restore();
      }
      // A permanent little camp lantern makes even a new garden feel lived in.
      const campWarmth = this.reducedMotion ? .12 : .13 + Math.sin(this.sceneTime * 1.8 + .7) * .025;
      this.glow(ctx, 184, 180, 27, `rgba(238,200,146,${campWarmth})`); ctx.fillStyle = '#887958'; ctx.fillRect(177, 170, 13, 17); ctx.fillStyle = '#d8bb7a'; ctx.fillRect(180, 173, 7, 11); ctx.strokeStyle = '#887958'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(184, 169, 4, Math.PI, 0); ctx.stroke();
    }

    cat(ctx, now) {
      const eating = now - this.data.feedAt < 6000, bounce = this.reducedMotion ? 0 : Math.sin(this.sceneTime * 1.3) * 1.2;
      ctx.save(); ctx.translate(555, 292 + bounce);
      this.ellipse(ctx, 0, 9, 24, 6, 'rgba(76,69,43,.18)');
      const tail = this.reducedMotion ? 0 : Math.sin(this.sceneTime * 1.05) * 5;
      ctx.strokeStyle = '#ddcaad'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(15, 3); ctx.bezierCurveTo(37, 5 + tail * .4, 33 + tail * .3, -9 + tail, 26 + tail * .35, -9 + tail); ctx.stroke();
      this.ellipse(ctx, 0, -3, 17, 18, '#eadbc0'); this.ellipse(ctx, -9, 9, 8, 4, '#efdfc5'); this.ellipse(ctx, 9, 9, 8, 4, '#efdfc5');
      ctx.fillStyle = '#efdfc5'; ctx.beginPath(); ctx.moveTo(-16, -17); ctx.lineTo(-18, -33); ctx.quadraticCurveTo(-16, -36, -7, -28); ctx.quadraticCurveTo(0, -32, 7, -28); ctx.quadraticCurveTo(18, -36, 18, -33); ctx.lineTo(17, -16); ctx.bezierCurveTo(21, -2, -20, -2, -16, -17); ctx.fill(); ctx.strokeStyle = '#5c5141'; ctx.lineWidth = 1; ctx.stroke();
      // A little ochre scarf belongs to the same hand-drawn cat as the desktop pet.
      ctx.strokeStyle = '#bc954d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(0, 1, 13, -4); ctx.stroke(); ctx.fillStyle = '#bc954d'; ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(11, -2); ctx.lineTo(12, 10); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c6a49a'; ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-13, -22); ctx.lineTo(-8, -26); ctx.fill(); ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(8, -26); ctx.lineTo(13, -22); ctx.fill();
      const sleepy = this.data.happiness >= 90 || (!this.reducedMotion && this.sceneTime % 5.7 > 5.4);
      ctx.strokeStyle = '#443c32'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      if (sleepy || eating) { ctx.beginPath(); ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-7, -15, -4, -18); ctx.moveTo(4, -18); ctx.quadraticCurveTo(7, -15, 10, -18); ctx.stroke(); }
      else { this.ellipse(ctx, -7, -18, 1.25, 1.6, '#443c32'); this.ellipse(ctx, 7, -18, 1.25, 1.6, '#443c32'); }
      this.ellipse(ctx, 0, -12, 2, 1.4, '#b78a7a'); ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -9); ctx.quadraticCurveTo(-2, -7, -4, -9); ctx.moveTo(0, -9); ctx.quadraticCurveTo(2, -7, 4, -9); ctx.stroke(); this.ellipse(ctx, -12, -13, 3.3, 1.5, 'rgba(192,143,126,.36)'); this.ellipse(ctx, 12, -13, 3.3, 1.5, 'rgba(192,143,126,.36)');
      ctx.strokeStyle = 'rgba(112,91,66,.4)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-13, -15); ctx.lineTo(-21, -16); ctx.moveTo(-13, -11); ctx.lineTo(-21, -9); ctx.moveTo(13, -15); ctx.lineTo(21, -16); ctx.moveTo(13, -11); ctx.lineTo(21, -9); ctx.stroke();
      if (eating) { this.ellipse(ctx, -27, 4, 10, 4, '#9a8b68'); this.ellipse(ctx, -27, 2, 7, 2, '#bea677'); ctx.fillStyle = '#d0a18e'; ctx.font = '16px sans-serif'; ctx.fillText('♥', -6, -42); }
      ctx.restore();
    }

    render() {
      if (this.destroyed || !this.ctx || !this.canvas.width) return;
      const ctx = this.ctx, now = Date.now();
      ctx.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#263c3d'; ctx.fillRect(0, 0, W, H);
      this.glow(ctx, 93, 118, 145, 'rgba(173,191,163,.035)'); this.glow(ctx, 594, 86, 155, 'rgba(220,196,153,.035)');
      for (let i = 0; i < 73; i++) { const x = (i * 113.4 + 26) % W, y = (i * 61.8 + 13) % H, alpha = this.reducedMotion ? .45 : .38 + Math.sin(this.sceneTime * .6 + i) * .14; ctx.globalAlpha = alpha; if (i % 15 === 0) this.star(ctx, x, y, 3, '#d8c698'); else this.ellipse(ctx, x, y, i % 4 === 0 ? 1.2 : .6, i % 4 === 0 ? 1.2 : .6, '#e1dfca'); } ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(572, 90); ctx.rotate(-.3); this.glow(ctx, 0, 0, 42, 'rgba(240,220,181,.04)'); ctx.fillStyle = '#e5d8b9'; ctx.beginPath(); ctx.arc(0, 0, 15, .45, Math.PI * 1.76); ctx.bezierCurveTo(-6, -15, -10, 9, 13, 6); ctx.fill(); ctx.restore();
      this.terrain(ctx); this.decorations(ctx);
      for (let i = 0; i < 6; i++) this.plotArt(ctx, this.data.plots[i], i, now);
      this.cat(ctx, now);
      for (const p of this.particles) { ctx.globalAlpha = Math.min(1, p.life * 2); this.star(ctx, p.x, p.y, p.r, p.color); } ctx.globalAlpha = 1;
      // Garden fireflies drift visibly even at the desktop widget's small scale.
      if (!this.reducedMotion) for (let i = 0; i < 6; i++) {
        const x = 231 + i % 3 * 106 + Math.sin(this.sceneTime * .7 + i * 1.3) * 18;
        const y = 179 + Math.floor(i / 3) * 79 + Math.cos(this.sceneTime * .9 + i * 1.7) * 13;
        const light = .16 + Math.sin(this.sceneTime * 1.8 + i) * .035;
        this.glow(ctx, x, y, 8, `rgba(248,216,168,${light})`); this.ellipse(ctx, x, y, 1.35, 1.35, '#f5dfba');
      }
    }

    destroy() {
      if (this.destroyed) return;
      this.pause(); this.destroyed = true; this.state = 'destroyed';
      if (this.observer) this.observer.disconnect();
      for (const remove of this.listeners) remove();
      this.listeners.length = 0; this.particles.length = 0; this.el.remove();
    }
  }
  window.MoonGame = MoonGame;
})();
