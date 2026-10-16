/* A little persistent moon garden. Everything illustrated here is original canvas art. */
(() => {
  'use strict';
  // Keep the storage key stable so the installed v0.1 garden migrates in place.
  const W = 700, H = 440, STORAGE_KEY = 'mooncat.moon-garden.v1', SCHEMA = 2;
  const MINUTE = 60000, OFFLINE_LIMIT = 24 * 60 * MINUTE, ECONOMY_VERSION = 2;
  // Keep schema 2 readable by older releases. The first upgraded opening fixes
  // a pricing boundary so its pending offline interval still uses old rates.
  const OLD_YIELDS = { moon: 3, dream: 4, peach: 5, dew: 6, sun: 7, lull: 9 };
  const WEATHER = { moon: '月夜', breeze: '轻风', rain: '细雨', sun: '晴光' };
  const WEATHER_ORDER = ['moon', 'breeze', 'rain', 'sun'];
  const weatherAt = time => WEATHER_ORDER[Math.floor(time / (30 * MINUTE)) % 4];
  const timeText = ms => ms >= 60 * MINUTE ? `${Math.ceil(ms / MINUTE)} 分钟` : `${Math.max(1, Math.ceil(ms / MINUTE))} 分钟`;
  const SEEDS = {
    moon: { name: '月光花', cost: 2, time: 8 * MINUTE, yield: 3, petals: 1, likes: 'moon', shape: 'daisy', height: 1, petal: '#f2e4c5', center: '#b8974c', leaf: '#6e8b68', detail: '一次浇水就够；月夜里早开一会儿。' },
    dream: { name: '晚梦铃', cost: 3, time: 15 * MINUTE, yield: 5, petals: 1, likes: 'rain', rainWater: true, mood: 4, shape: 'bell', height: .92, petal: '#c9a5a2', center: '#ddc794', leaf: '#6f8b78', detail: '细雨会帮它浇水；收获时Winesun心情 +4。' },
    peach: { name: '桃星花', cost: 4, time: 25 * MINUTE, yield: 8, petals: 1, likes: 'breeze', windPetal: true, shape: 'star', height: 1, petal: '#d6b977', center: '#efe0b7', leaf: '#819064', detail: '喜欢轻风；迎风种下，多留一片花瓣。' },
    dew: { name: '雨露盏', cost: 4, time: 45 * MINUTE, yield: 12, petals: 2, likes: 'rain', rainWater: true, extraWater: true, shape: 'cup', height: 1.08, petal: '#a7c2bd', center: '#e6d6ab', leaf: '#6f8f79', detail: '叶尖藏露珠；补浇一次水，提早 5% 开花。' },
    sun: { name: '小暖阳', cost: 5, time: 70 * MINUTE, yield: 18, petals: 2, likes: 'sun', shape: 'sun', height: 1.24, petal: '#d9b466', center: '#8b7450', leaf: '#789366', detail: '花盘向光轻轻转；晴光里早开一会儿。' },
    lull: { name: '月眠兰', cost: 6, time: 100 * MINUTE, yield: 26, petals: 3, likes: 'moon', extraWater: true, shape: 'orchid', height: 1.15, petal: '#ded8b9', center: '#bfa286', leaf: '#688e80', detail: '陪你度过长夜；可补水，开花有小夜蝶。' }
  };
  const DECOR = {
    bench: { name: '月光长椅', price: 18, petals: 4, varieties: 0, detail: '池塘边的蜂蜜色长椅，放着一只软软的小靠垫。' },
    lantern: { name: '暖星灯', price: 28, petals: 8, varieties: 0, detail: '高高的星灯点亮岛角；暖光随着灯火轻轻呼吸。' },
    mushroom: { name: '小蘑菇屋', price: 40, petals: 12, varieties: 1, detail: '赤陶色的蘑菇小屋，圆窗亮着灯，烟囱飘起细烟。' },
    windchime: { name: '叶子风铃', price: 36, petals: 10, varieties: 2, detail: '见过 2 种花；高木架上的青瓷叶片随风轻摆。' },
    birdbath: { name: '小鸟饮水台', price: 48, petals: 14, varieties: 3, detail: '见过 3 种花；蓝绿色水台迎来一只会低头喝水的小鸟。' },
    mailbox: { name: '花园信箱', price: 64, petals: 18, varieties: 4, detail: '见过 4 种花；砖红信箱挂着一封信，小旗在风里摆动。' },
    trellis: { name: '藤叶小拱门', price: 90, petals: 24, varieties: 5, detail: '见过 5 种花；岛后立起开满小花的藤拱，花瓣缓缓飘下。' }
  };
  const PLOTS = [{ x: 253, y: 222 }, { x: 357, y: 222 }, { x: 461, y: 222 }, { x: 253, y: 294 }, { x: 357, y: 294 }, { x: 461, y: 294 }];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const finite = n => Number.isFinite(Number(n)) ? Number(n) : 0;
  const flowerIcon = seed => {
    const shapes = {
      bell: '<path d="M14 14c-2-13 14-13 12 0l6 9q-12 8-24 0l6-9Z"/>',
      star: '<path d="m20 3 4 10 11 1-8 8 2 11-9-6-9 6 2-11-8-8 11-1 4-10Z"/>',
      cup: '<path d="M7 12q7 2 8 9L20 5l5 16q1-7 8-9 1 21-13 22Q6 33 7 12Z"/>',
      sun: Array.from({ length: 10 }, (_, i) => `<ellipse cx="20" cy="8" rx="3" ry="8" transform="rotate(${i * 36} 20 18)"/>`).join(''),
      orchid: '<path d="M20 19Q1 4 6 1q13-1 14 15Q24-1 35 4q1 14-13 16 13 6 8 15-11-1-10-13-10 14-15 6 0-12 15-9Z"/>',
      daisy: Array.from({ length: 5 }, (_, i) => `<ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(${i * 72} 20 17)"/>`).join('')
    };
    return `<svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 40V19M20 31c-8 1-10-4-9-6 6-1 9 3 9 6Zm0-4c6 0 10-4 9-7-6 0-9 4-9 7Z" stroke="${seed.leaf}" stroke-width="2" fill="${seed.leaf}"/><g fill="${seed.petal}">${shapes[seed.shape]}</g><circle cx="20" cy="18" r="${seed.shape === 'sun' ? 7 : 3}" fill="${seed.center}"/></svg>`;
  };
  const starIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 2.8 6.8 7.2.8-5.4 4.8 1.6 7-6.2-3.6-6.2 3.6 1.6-7L2 9.6l7.2-.8L12 2Z" fill="#edcfa2"/></svg>`;
  const shopIcons = {
    bench: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 9h18v8H5z" fill="#a18b68"/><path d="M4 19h20M7 20v4m14-4v4M5 13h18" stroke="#dbcba5" stroke-width="2" stroke-linecap="round"/></svg>',
    lantern: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 3v4m-5 1h10l2 14H7L9 8Z" stroke="#887854" stroke-width="1.5"/><path d="M10 11h8l1 9H9l1-9Z" fill="#dac38d"/><path d="M6 24h16" stroke="#887854" stroke-width="1.5"/></svg>',
    mushroom: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M9 16h10v9H9z" fill="#e0d1ad"/><path d="M3 17c0-17 22-17 22 0H3Z" fill="#a88379"/><circle cx="10" cy="11" r="2" fill="#e8d9ba"/><circle cx="19" cy="13" r="2" fill="#e8d9ba"/></svg>',
    windchime: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M6 5h16M10 5v10m8-10v15" stroke="#887854" stroke-width="1.5" fill="none"/><path d="m7 14 3-3 3 3v7H7zm8 5 3-3 3 3v6h-6Z" fill="#9aab83"/></svg>',
    birdbath: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 13v10M9 24h10" stroke="#89775c" stroke-width="2"/><path d="M3 9h22q-2 8-11 8T3 9Z" fill="#a6b9aa"/><ellipse cx="20" cy="6" rx="4" ry="3" fill="#cfb781"/></svg>',
    mailbox: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 15v11" stroke="#89775c" stroke-width="3"/><path d="M4 15V7q0-5 6-5h8q6 0 6 5v8H4Z" fill="#b48475"/><path d="M7 8h9M19 4v6h5" stroke="#eadbb8" stroke-width="1.5"/></svg>',
    trellis: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 26V11q0-9 9-9t9 9v15M5 15h18M9 5v21m10-21v21" stroke="#a69268" stroke-width="1.5" fill="none"/><path d="M4 12q-5-7 2-5 6 1 5 4-3 3-7 1Zm17 7q7-8 7-2-1 7-7 6Z" fill="#8fa27b"/></svg>',
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
      this.selectedSeed = this.data.selectedSeed;
      if (this.migrated) this.save();
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
      const data = { version: SCHEMA, economy: { version: ECONOMY_VERSION, changedAt: 0 }, wallet: 12, happiness: 65, plots: Array(6).fill(null), decorations: Object.fromEntries(Object.keys(DECOR).map(k => [k, false])), giftAt: 0, feedAt: 0, autoCare: this.defaultAutocare, autoAt: now, selectedSeed: 'moon', petals: 0, harvested: 0, varieties: Object.fromEntries(Object.keys(SEEDS).map(k => [k, 0])), blessings: { count: 0, progress: 0, starsGiven: 0 }, ledger: { revision: 0, through: now, harvests: 0, grossStarlight: 0, blessingNet: 0 } };
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!parsed || typeof parsed !== 'object' || (parsed.version !== 1 && parsed.version !== SCHEMA)) return data;
        const legacy = parsed.version === 1;
        const oldEconomy = parsed.economy?.version !== ECONOMY_VERSION;
        this.migrated = legacy || oldEconomy;
        data.economy.changedAt = oldEconomy ? now : clamp(finite(parsed.economy.changedAt), 0, now);
        data.wallet = Math.floor(clamp(finite(parsed.wallet), 0, Number.MAX_SAFE_INTEGER));
        data.happiness = Math.round(clamp(finite(parsed.happiness), 0, 100));
        data.giftAt = clamp(finite(parsed.giftAt), 0, now);
        data.feedAt = clamp(finite(parsed.feedAt), 0, now);
        data.autoCare = typeof parsed.autoCare === 'boolean' ? parsed.autoCare : this.defaultAutocare;
        data.autoAt = legacy ? now : clamp(Math.max(finite(parsed.autoAt), finite(parsed.ledger?.through)) || now, 1, now);
        data.selectedSeed = Object.hasOwn(SEEDS, parsed.selectedSeed) ? parsed.selectedSeed : 'moon';
        data.petals = Math.floor(clamp(finite(parsed.petals), 0, 1000000));
        if (!legacy) data.blessings = { count: Math.floor(clamp(finite(parsed.blessings?.count), 0, 1000000)), progress: Math.floor(clamp(finite(parsed.blessings?.progress), 0, 99)), starsGiven: Math.floor(clamp(finite(parsed.blessings?.starsGiven), 0, 1000000000)) };
        for (const key of Object.keys(SEEDS)) data.varieties[key] = Math.floor(clamp(finite(parsed.varieties?.[key]), 0, 1000000));
        data.harvested = Math.max(Math.floor(clamp(finite(parsed.harvested), 0, 1000000)), Object.values(data.varieties).reduce((sum, n) => sum + n, 0));
        data.ledger = { revision: Math.floor(clamp(finite(parsed.ledger?.revision), 0, 1000000000)), through: data.autoAt, harvests: data.harvested, grossStarlight: Math.floor(clamp(finite(parsed.ledger?.grossStarlight), 0, 1000000000)), blessingNet: legacy ? 0 : Math.floor(clamp(finite(parsed.ledger?.blessingNet) || data.blessings.count * 100 + data.blessings.progress, 0, 1000000000)) };
        if (!legacy && finite(parsed.ledger?.lastHarvestAt) > 0) data.ledger.lastHarvestAt = clamp(finite(parsed.ledger.lastHarvestAt), 1, now);
        for (const key of Object.keys(DECOR)) data.decorations[key] = parsed.decorations && parsed.decorations[key] === true;
        if (Array.isArray(parsed.plots)) data.plots = Array.from({ length: 6 }, (_, i) => {
          const p = parsed.plots[i];
          if (!p || !Object.hasOwn(SEEDS, p.type)) return null;
          const seed = SEEDS[p.type];
          let plantedAt = clamp(finite(p.plantedAt), 1, now), wateredAt = p.wateredAt ? clamp(finite(p.wateredAt), 1, now) : 0;
          let readyAt = wateredAt ? wateredAt + seed.time : 0;
          if (legacy && wateredAt) {
            const oldDuration = { moon: 15000, dream: 30000, peach: 45000 }[p.type] || seed.time;
            const progress = clamp((now - wateredAt) / oldDuration, 0, 1);
            wateredAt = now - Math.round(seed.time * progress);
            readyAt = wateredAt + seed.time;
            plantedAt = Math.min(plantedAt, wateredAt);
          } else if (wateredAt) readyAt = clamp(finite(p.readyAt) || readyAt, wateredAt, wateredAt + seed.time);
          const quote = oldEconomy ? { seedCost: seed.cost, rewardStars: OLD_YIELDS[p.type] } : this.quotePlot(p.type, plantedAt, data.economy.changedAt);
          return { type: p.type, plantedAt, wateredAt, readyAt, weather: Object.hasOwn(WEATHER, p.weather) ? p.weather : weatherAt(wateredAt || plantedAt), extraWaterAt: !legacy && p.extraWaterAt ? clamp(finite(p.extraWaterAt), wateredAt || plantedAt, now) : 0, blessingEligible: !legacy && p.blessingEligible !== false, seedCost: !oldEconomy && Number.isInteger(p.seedCost) && p.seedCost >= 0 && p.seedCost <= 1000000 ? p.seedCost : quote.seedCost, rewardStars: !oldEconomy && Number.isInteger(p.rewardStars) && p.rewardStars >= 0 && p.rewardStars <= 1000000 ? p.rewardStars : quote.rewardStars };
        });
      } catch (_) { /* A new garden is always available, even without browser storage. */ }
      return data;
    }

    save() {
      this.data.ledger.revision += 1;
      this.data.ledger.through = this.data.autoAt;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (_) {}
    }

    syncFromStorage() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (stored?.version === SCHEMA && finite(stored.ledger?.revision) > this.data.ledger.revision) {
          this.data = this.load(); this.selectedSeed = this.data.selectedSeed;
        }
      } catch (_) {}
    }

    duration(type, at) { return Math.round(SEEDS[type].time * (weatherAt(at) === SEEDS[type].likes ? .9 : 1)); }
    quotePlot(type, at, changedAt = this.data.economy.changedAt) { return { seedCost: SEEDS[type].cost, rewardStars: changedAt && at < changedAt ? OLD_YIELDS[type] : SEEDS[type].yield }; }
    newPlot(type, at, watered = false) { return { type, plantedAt: at, wateredAt: watered ? at : 0, readyAt: watered ? at + this.duration(type, at) : 0, weather: weatherAt(at), extraWaterAt: 0, blessingEligible: true, ...this.quotePlot(type, at) }; }
    water(plot, at) { plot.wateredAt = at; plot.readyAt = at + this.duration(plot.type, at); plot.weather = weatherAt(at); }
    plotProgress(plot, now = Date.now()) { return !plot?.wateredAt ? .07 : clamp((now - plot.wateredAt) / Math.max(1, plot.readyAt - plot.wateredAt), .1, 1); }
    varietyCount() { return Object.values(this.data.varieties).filter(n => n > 0).length; }
    harvestReward(plot) { const seed = SEEDS[plot.type]; return { stars: plot.rewardStars ?? this.quotePlot(plot.type, plot.plantedAt).rewardStars, petals: seed.petals + (seed.windPetal && plot.weather === 'breeze' ? 1 : 0), mood: seed.mood || 2 }; }
    recordHarvest(plot, at) {
      const reward = this.harvestReward(plot);
      this.data.petals = Math.min(1000000, this.data.petals + reward.petals);
      this.data.harvested += 1; this.data.varieties[plot.type] += 1;
      this.data.happiness = Math.min(100, this.data.happiness + reward.mood);
      this.data.ledger.harvests = this.data.harvested;
      this.data.ledger.grossStarlight += reward.stars;
      this.data.ledger.lastHarvestAt = at;
      return reward;
    }

    creditBlessings(plot, reward) {
      const result = { type: 'blessing', count: 0, totalCount: this.data.blessings.count, starlight: 0 };
      // Migrated v1 flowers pay their ordinary harvest once; neither that
      // migration credit, old balances nor cat gifts advance new blessings.
      if (plot.blessingEligible === false) return result;
      const profit = Math.max(0, reward.stars - (plot.seedCost ?? this.quotePlot(plot.type, plot.plantedAt).seedCost));
      const blessings = this.data.blessings;
      const total = blessings.progress + profit;
      const milestones = Math.floor(total / 100);
      blessings.progress = total % 100;
      this.data.ledger.blessingNet += profit;
      // At current seed yields each harvest crosses at most one milestone.
      for (let i = 0; i < milestones; i++) {
        const given = Math.floor(this.data.wallet / 5);
        this.data.wallet -= given;
        blessings.count += 1; blessings.starsGiven += given;
        result.count += 1; result.starlight += given;
      }
      result.totalCount = blessings.count;
      return result;
    }

    emitComplete(event) { if (this.onComplete) { try { this.onComplete(event); } catch (_) {} } }

    mount() {
      this.el = document.createElement('section');
      this.el.className = 'moon-game';
      this.el.setAttribute('aria-label', '月球小花园');
      this.el.innerHTML = `<div class="mg-heading"><div><span class="mg-eyebrow">YOUR LITTLE GARDEN ON THE MOON</span><h2 class="mg-title">月球小花园</h2></div><div class="mg-heading-actions"><button type="button" class="mg-autocare" data-garden-action="autocare" data-mg="autocare" aria-pressed="false" aria-label="Winesun托管，自动播种、浇水和收获">Winesun托管</button><div class="mg-wallet">${starIcon}<div><span>星光零钱</span><strong data-mg="wallet">12</strong></div></div></div></div>
        <div class="mg-scene"><canvas class="mg-canvas" role="img" aria-label="星空里漂浮的小花园，六块花田和陪伴你的奶油色小猫Winesun。"></canvas><div class="mg-scene-tag" data-mg="weather">月夜 · 不慌不忙，慢慢长大</div><div class="mg-cat-status">Winesun的好心情 <span data-mg="happy">65</span>%<small data-mg="cat-copy">在花园里陪着你</small><i data-mg="happy-bar"></i></div>${PLOTS.map((p, i) => `<button type="button" class="mg-plot-button" data-garden-action="plot" data-index="${i}" style="left:${p.x / W * 100}%;top:${p.y / H * 100}%" aria-label="花田 ${i + 1}：空地，点击播种"><span>播种</span></button>`).join('')}</div>
        <p class="mg-guide">选花种，播种后轻轻浇水。花朵需要几分钟到一段午后，不会枯萎。</p>
        <div class="mg-seeds" role="group" aria-label="选择花种">${Object.entries(SEEDS).map(([key, seed]) => `<button type="button" class="mg-seed" data-garden-action="seed" data-seed="${key}" aria-pressed="${key === this.selectedSeed}" title="${seed.detail}喜欢${WEATHER[seed.likes]}，适合的天气会提早 10% 开花。" aria-label="选择${seed.name}种子，花费 ${seed.cost} 星光，约 ${timeText(seed.time)}开花，收获 ${seed.yield} 星光和 ${seed.petals} 花瓣。${seed.detail}">${flowerIcon(seed)}<span><b>${seed.name}</b><small><em>${seed.cost} ✦</em> · ${timeText(seed.time)}</small><small>收获 ${seed.yield} ✦ · ${seed.petals} 花瓣</small><small class="mg-seed-detail">${seed.detail}</small></span></button>`).join('')}</div>
        <div class="mg-shop-title">花园小物 <span class="mg-collection" data-mg="collection">0 花瓣 · 0/6 种花</span></div><div class="mg-shop">${Object.entries(DECOR).map(([key, item]) => `<button type="button" class="mg-shop-button" data-garden-action="decorate" data-decor="${key}" title="${item.detail}" aria-label="${item.name}，${item.price} 星光和 ${item.petals} 花瓣。${item.detail}">${shopIcons[key]}<span><b>${item.name}</b><small data-mg-price="${key}">${item.price} ✦ · ${item.petals} 花瓣</small><small class="mg-shop-description">${item.varieties > 1 ? `见过 ${item.varieties} 种花后可安放` : '永久留在花园里'}</small></span></button>`).join('')}<button type="button" class="mg-shop-button" data-garden-action="feed">${shopIcons.feed}<span><b>喂Winesun小鱼干</b><small data-mg="feed-label">1 ✦ · 心情 +10</small></span></button></div>
        <div class="mg-status-row"><p class="mg-live" data-mg="live" role="status" aria-live="polite">先种一朵喜欢的花。收获时留下的花瓣，可以换一点花园小物。</p><button type="button" class="mg-gift" data-garden-action="gift" data-mg="gift" hidden>Winesun的小礼物 +2 ✦</button></div><p class="mg-note">自动保存，离开后也会生长。每新增净赚 100 星光，会把现有零钱的 20% 留成一份永久祝福。</p>`;
      this.root.appendChild(this.el);
      this.canvas = this.el.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      const q = n => this.el.querySelector(`[data-mg="${n}"]`);
      this.ui = { wallet: q('wallet'), happy: q('happy'), happyBar: q('happy-bar'), catCopy: q('cat-copy'), live: q('live'), gift: q('gift'), feedLabel: q('feed-label'), autoCare: q('autocare'), collection: q('collection'), weather: q('weather') };
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
      // The desktop shell moves seed/shop controls into its sheet. Keep those
      // actual button references usable after they leave the original section.
      this.listen(document, 'click', e => {
        const button = e.target.closest?.('[data-garden-action]');
        const owned = button && (this.el.contains(button) || this.seedButtons.includes(button) || this.decorButtons.includes(button) || button === this.feedButton || button === this.ui.gift);
        if (!owned || this.destroyed || button.disabled) return;
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
        if (!document.hidden) { this.syncFromStorage(); this.environmentTick(); this.runAutocare(); this.refresh(); this.render(); }
      });
      this.listen(window, 'storage', e => { if (e.key === STORAGE_KEY) { this.syncFromStorage(); this.refresh(); if (!document.hidden) this.render(); } });
      if (typeof ResizeObserver !== 'function') this.listen(window, 'resize', () => this.resize());
    }

    selectSeed(key) {
      if (!Object.hasOwn(SEEDS, key)) return;
      this.settleBeforeAction(); this.selectedSeed = key; this.data.selectedSeed = key;
      this.seedButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seed === key)));
      this.say(this.autocare ? `选好了${SEEDS[key].name}。Winesun会在下一次收获后换种它，不用挖掉现有的花。` : `选好了${SEEDS[key].name}。${SEEDS[key].detail}`);
      this.save(); this.refresh();
    }

    settleBeforeAction(now = Date.now()) {
      this.syncFromStorage();
      // A delayed background timer must not apply today's seed choice or
      // purchase to yesterday's harvests. Close the old interval first.
      if (this.data.autoCare) this.runAutocare(now, false);
    }

    environmentTick(now = Date.now()) {
      if (this.destroyed || this.data.autoCare || weatherAt(now) !== 'rain') return;
      let watered = 0;
      for (const plot of this.data.plots) if (plot && !plot.wateredAt && SEEDS[plot.type].rainWater) { this.water(plot, now); watered += 1; }
      if (watered) { this.save(); this.say(`细雨替 ${watered} 朵喜欢雨水的小花浇了水。你不必赶回来。`); }
    }

    phase(plot, now = Date.now()) {
      if (!plot) return 'empty';
      if (!plot.wateredAt) return 'dry';
      return now >= (plot.readyAt || plot.wateredAt + SEEDS[plot.type].time) ? 'ready' : 'growing';
    }

    tend(index) {
      if (!Number.isInteger(index) || index < 0 || index >= 6 || this.destroyed) return;
      const now = Date.now(); this.settleBeforeAction(now);
      const plot = this.data.plots[index], phase = this.phase(plot, now), pos = PLOTS[index];
      let harvestEvent = null, blessingEvent = null;
      if (phase === 'empty') {
        const seed = SEEDS[this.selectedSeed];
        if (this.data.wallet < seed.cost) { this.say(`这包种子需要 ${seed.cost} 星光。可以先收获花朵，或收下Winesun的小礼物。`); this.refresh(); return; }
        this.data.wallet -= seed.cost;
        this.data.plots[index] = this.newPlot(this.selectedSeed, now);
        this.say(`${seed.name}种下啦。再点这块花田，给它一点水。`);
        this.burst(pos.x, pos.y - 15, '#c3b18f', 7);
        this.sound('chime');
      } else if (phase === 'dry') {
        this.water(plot, now);
        this.say(`水浇好啦。${SEEDS[plot.type].name}会用大约 ${timeText(plot.readyAt - now)}慢慢开花。${plot.weather === SEEDS[plot.type].likes ? '今天的天气正合它心意。' : '去忙自己的事也没关系。'}`);
        this.burst(pos.x, pos.y - 18, '#b4c8df', 11);
        this.sound('chime');
      } else if (phase === 'growing') {
        const seed = SEEDS[plot.type];
        if (seed.extraWater && !plot.extraWaterAt && now - plot.wateredAt >= MINUTE) {
          plot.extraWaterAt = now; plot.readyAt = Math.max(now, plot.readyAt - Math.round(seed.time * .05));
          this.say(`${seed.name}喝到了第二口水，花期提早了一点。叶尖亮起一颗小露珠。`);
          this.burst(pos.x, pos.y - 28, '#b7d1ca', 10); this.sound('chime');
        } else {
          this.say(`${seed.name}还在慢慢长大，大约再等 ${timeText(plot.readyAt - now)}。${seed.detail}`);
          if (seed.shape === 'bell') this.sound('chime');
          this.burst(pos.x, pos.y - 28, seed.petal, 4); this.render();
          return;
        }
      } else {
        const seed = SEEDS[plot.type];
        const reward = this.recordHarvest(plot, now);
        this.data.wallet = Math.min(Number.MAX_SAFE_INTEGER, this.data.wallet + reward.stars);
        blessingEvent = this.creditBlessings(plot, reward);
        this.data.plots[index] = null;
        this.say(`收获了${seed.name}：${reward.stars} 星光、${reward.petals} 片花瓣。${plot.type === 'dream' ? '小铃轻响，Winesun心情 +4。' : '花园手记又留下了一小页。'}`);
        if (blessingEvent.count) this.say(`把 ${blessingEvent.starlight} 星光留成了一份祝福。已经有 ${blessingEvent.totalCount} 份温暖陪着花园。`);
        this.burst(pos.x, pos.y - 31, '#efd6a5', 18);
        this.sound('collect');
        harvestEvent = { type: 'harvest', seed: plot.type, flower: seed.name, starlight: reward.stars, petals: reward.petals, wallet: this.data.wallet };
      }
      this.save(); this.refresh(); this.render();
      // Notify only after the harvest, deduction and ledger are atomically saved.
      if (harvestEvent) this.emitComplete(harvestEvent);
      if (blessingEvent?.count) this.emitComplete(blessingEvent);
    }

    decorate(key) {
      this.settleBeforeAction();
      if (!Object.hasOwn(DECOR, key) || this.data.decorations[key]) return;
      const item = DECOR[key];
      if (this.varietyCount() < item.varieties) { this.say(`${item.name}想认识 ${item.varieties} 种花。慢慢种一点不同的花，开过花就会记住。`); return; }
      if (this.data.petals < item.petals) { this.say(`${item.name}需要 ${item.petals} 片收获留下的花瓣。已经有 ${this.data.petals} 片，不用急着攒。`); return; }
      if (this.data.wallet < item.price) { this.say(`${item.name}需要 ${item.price} 星光，花朵会帮你慢慢攒够。`); return; }
      this.data.wallet -= item.price;
      this.data.petals -= item.petals;
      this.data.decorations[key] = true;
      this.say(`${item.name}安放好了。从此，月岛又多了一处温暖。`);
      const where = { bench: [161, 284], lantern: [513, 156], mushroom: [566, 226], windchime: [210, 177], birdbath: [139, 286], mailbox: [120, 211], trellis: [347, 152] }[key];
      this.burst(where[0], where[1], '#efcaa2', 15);
      this.sound('chime'); this.save(); this.refresh(); this.render();
    }

    feed() {
      const now = Date.now(); this.settleBeforeAction(now);
      if (this.data.happiness >= 100) { this.say('Winesun已经很满足啦，正幸福地晒着月光。'); return; }
      if (now - this.data.feedAt < 5 * MINUTE) { this.say('Winesun正在慢慢嚼小鱼干，过一会儿再喂吧。'); return; }
      if (this.data.wallet < 1) { this.say('先收获一点星光，再请Winesun吃小鱼干吧。'); return; }
      this.data.wallet -= 1;
      this.data.happiness = Math.min(100, this.data.happiness + 10);
      this.data.feedAt = now;
      this.say('Winesun吃到了小鱼干，轻轻蹭了蹭你的手。好心情 +10。');
      this.burst(551, 259, '#e5b0bd', 12);
      this.sound('chime'); this.save(); this.refresh(); this.render();
    }

    gift() {
      const now = Date.now(); this.settleBeforeAction(now);
      if (this.data.wallet >= 2 || this.data.plots.some(p => this.phase(p, now) === 'ready') || now - this.data.giftAt < 60000) return;
      this.data.wallet += 2;
      this.data.giftAt = now;
      this.say('Winesun从口袋里找出了两颗星光。种一朵月光花，重新慢慢攒起来吧。');
      this.sound('chime'); this.save(); this.refresh();
    }

    get autocare() { return this.data.autoCare; }

    setAutocare(enabled) {
      if (this.destroyed) return false;
      this.syncFromStorage();
      const value = Boolean(enabled), now = Date.now();
      if (value === this.data.autoCare) return value;
      if (this.data.autoCare) this.runAutocare(now);
      this.data.autoCare = value;
      this.data.autoAt = now;
      if (value) {
        const summary = this.runAutocare(now);
        if (!summary || !summary.flowers) this.say('Winesun托管开启啦。它会自动播种、浇水和收获，你可以安心忙自己的事。');
      } else {
        this.save();
        this.say('Winesun托管暂停了。花朵依然会长大，等你亲手收获。');
      }
      this.refresh(); this.render();
      return value;
    }

    backgroundTick() {
      if (this.destroyed) return null;
      this.syncFromStorage();
      if (this.data.autoCare) return this.runAutocare(Date.now(), false);
      this.environmentTick();
      this.refresh();
      return null;
    }

    runAutocare(now = Date.now(), paint = true) {
      this.syncFromStorage();
      if (this.destroyed || !this.data.autoCare) return null;
      // Weather is sampled when each new flower is watered. The shortest cycle
      // is 7.2 minutes: the 24-hour cap means fewer than 1,210 bounded iterations.
      // Plot deadlines + ledger through/revision are committed in one JSON write.
      const previous = Math.min(Math.max(this.data.autoAt || now, this.data.ledger.through || 0), now);
      const intervalStart = Math.max(previous, now - OFFLINE_LIMIT);
      const walletBefore = this.data.wallet, petalsBefore = this.data.petals;
      const blessingBatch = { type: 'blessing', count: 0, totalCount: this.data.blessings.count, starlight: 0, offline: now - previous > 5000 };
      let flowers = 0, planted = 0, watered = 0;
      for (let i = 0; i < 6; i++) {
        const plot = this.data.plots[i];
        if (!plot) continue;
        if (!plot.wateredAt) {
          this.water(plot, Math.max(intervalStart, Math.min(plot.plantedAt, now)));
          watered += 1;
        }
      }
      // Settle harvests, empty-plot planting and gift cooldowns in time order.
      // Waiting until the end to fill empty plots would underpay a partly
      // planted offline garden compared with the same garden left running.
      let eventAt = intervalStart;
      for (let cycle = 0; cycle < 1536; cycle++) {
        for (let i = 0; i < 6; i++) {
          const plot = this.data.plots[i];
          if (!plot) continue;
          const seed = SEEDS[plot.type];
          if (seed.extraWater && !plot.extraWaterAt && now - plot.wateredAt >= MINUTE && plot.wateredAt + MINUTE < plot.readyAt) {
            plot.extraWaterAt = plot.wateredAt + MINUTE;
            plot.readyAt -= Math.round(seed.time * .05);
          }
          const due = Math.max(plot.readyAt, intervalStart);
          if (due > eventAt) continue;
          const reward = this.recordHarvest(plot, eventAt);
          this.data.wallet = Math.min(Number.MAX_SAFE_INTEGER, this.data.wallet + reward.stars);
          const blessing = this.creditBlessings(plot, reward);
          blessingBatch.count += blessing.count; blessingBatch.starlight += blessing.starlight;
          const type = this.data.wallet >= SEEDS[this.selectedSeed].cost ? this.selectedSeed : 'moon';
          this.data.wallet -= SEEDS[type].cost;
          this.data.plots[i] = this.newPlot(type, eventAt, true);
          flowers += 1;
        }
        // A modest recovery gift only funds an empty plot, and its timestamp
        // is committed with the harvest ledger so reopening cannot repeat it.
        if (this.data.wallet < 2 && this.data.plots.some(p => !p) && eventAt - this.data.giftAt >= MINUTE) {
          this.data.wallet += 2; this.data.giftAt = eventAt;
        }
        for (let i = 0; i < 6; i++) {
          if (this.data.plots[i]) continue;
          const type = this.data.wallet >= SEEDS[this.selectedSeed].cost ? this.selectedSeed : 'moon';
          if (this.data.wallet < SEEDS[type].cost) break;
          this.data.wallet -= SEEDS[type].cost;
          this.data.plots[i] = this.newPlot(type, eventAt, true);
          planted += 1;
        }
        let nextAt = Infinity;
        for (const plot of this.data.plots) if (plot) {
          const seed = SEEDS[plot.type];
          // Compute the one permitted extra watering before selecting the
          // next deadline, including flowers planted earlier in this batch.
          if (seed.extraWater && !plot.extraWaterAt && now - plot.wateredAt >= MINUTE && plot.wateredAt + MINUTE < plot.readyAt) {
            plot.extraWaterAt = plot.wateredAt + MINUTE;
            plot.readyAt -= Math.round(seed.time * .05);
          }
          nextAt = Math.min(nextAt, Math.max(plot.readyAt, intervalStart));
        }
        if (this.data.wallet < 2 && this.data.plots.some(p => !p)) nextAt = Math.min(nextAt, Math.max(eventAt, this.data.giftAt + MINUTE));
        if (nextAt > now) break;
        eventAt = nextAt;
      }
      this.data.autoAt = now;
      this.save();
      blessingBatch.totalCount = this.data.blessings.count;
      const summary = { type: 'autocare', flowers, starlight: this.data.wallet - walletBefore, petals: this.data.petals - petalsBefore, wallet: this.data.wallet, planted, watered, offline: now - previous > 5000 };
      this.lastAutocareSummary = summary;
      if (flowers) this.say(`Winesun照料了 ${flowers} 朵花，留下 ${summary.petals} 片花瓣。花田里又种下了新的小花。`);
      else if (planted || watered) this.say('Winesun浇好了水。花朵会用一段安静的时光慢慢长大。');
      if (blessingBatch.count) this.say(`花园多了 ${blessingBatch.count} 份祝福，将 ${blessingBatch.starlight} 星光留成了温暖。`);
      // Auto-care is quiet by default; integrations may request one summary per batch.
      if (flowers && this.notifyAutocare && this.onComplete) { try { this.onComplete(summary); } catch (_) {} }
      if (blessingBatch.count) this.emitComplete(blessingBatch);
      this.refresh();
      if (paint && !document.hidden) this.render();
      return summary;
    }

    refresh() {
      if (this.destroyed) return;
      const now = Date.now();
      this.ui.wallet.textContent = String(this.data.wallet);
      this.ui.collection.textContent = `${this.data.petals} 花瓣 · ${this.varietyCount()}/6 种花`;
      this.ui.weather.textContent = `${WEATHER[weatherAt(now)]} · 不慌不忙，慢慢长大`;
      this.seedButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seed === this.selectedSeed)));
      this.ui.autoCare.setAttribute('aria-pressed', String(this.data.autoCare));
      this.ui.autoCare.textContent = this.data.autoCare ? 'Winesun托管 · 开' : 'Winesun托管';
      this.ui.happy.textContent = String(this.data.happiness);
      this.ui.happyBar.style.width = `${this.data.happiness * .74}px`;
      this.ui.catCopy.textContent = this.data.happiness >= 90 ? '幸福地眯起了眼睛' : this.data.happiness >= 70 ? '尾巴晃呀晃，心情很好' : '在花园里陪着你';
      for (let i = 0; i < 6; i++) {
        const plot = this.data.plots[i], stage = this.phase(plot, now), button = this.plotButtons[i];
        button.dataset.stage = stage;
        const progress = plot ? this.plotProgress(plot, now) : 0;
        const canWater = stage === 'growing' && SEEDS[plot.type].extraWater && !plot.extraWaterAt && now - plot.wateredAt >= MINUTE;
        const label = stage === 'empty' ? '播种' : stage === 'dry' ? '浇水' : stage === 'ready' ? '收获 ✦' : canWater ? '补水' : progress < .3 ? '幼芽' : progress < .75 ? '长叶' : '含苞';
        button.querySelector('span').textContent = label;
        button.setAttribute('aria-label', `花田 ${i + 1}：${stage === 'empty' ? `空地，点击种下${SEEDS[this.selectedSeed].name}` : stage === 'dry' ? `${SEEDS[plot.type].name}需要浇水，点击浇水` : stage === 'ready' ? `${SEEDS[plot.type].name}开花了，点击收获 ${this.harvestReward(plot).stars} 星光和花瓣` : `${SEEDS[plot.type].name}生长中，约 ${timeText(plot.readyAt - now)}后开花${canWater ? '，可以点击补水，提早一点开花' : ''}`}`);
      }
      for (const button of this.decorButtons) {
        const key = button.dataset.decor, owned = this.data.decorations[key];
        button.dataset.owned = String(owned); button.disabled = owned;
        button.dataset.locked = String(!owned && this.varietyCount() < DECOR[key].varieties);
        button.querySelector('small').textContent = owned ? '已经在花园里啦' : `${DECOR[key].price} ✦ · ${DECOR[key].petals} 花瓣`;
      }
      const eating = now - this.data.feedAt < 5 * MINUTE;
      this.feedButton.disabled = this.data.happiness >= 100 || eating;
      this.ui.feedLabel.textContent = this.data.happiness >= 100 ? 'Winesun已经很满足啦' : eating ? '正慢慢吃小鱼干' : '1 ✦ · 心情 +10';
      const needsGift = this.data.wallet < 2 && !this.data.plots.some(p => this.phase(p, now) === 'ready');
      this.ui.gift.hidden = !needsGift;
      this.ui.gift.disabled = now - this.data.giftAt < 60000;
      this.ui.gift.textContent = this.ui.gift.disabled ? `小礼物 ${Math.ceil((60000 - now + this.data.giftAt) / 1000)}s 后回来` : 'Winesun的小礼物 +2 ✦';
    }

    say(message) { this.ui.live.textContent = message; }
    sound(name) {
      try { if (this.audio && typeof this.audio[name] === 'function') { const result = this.audio[name](); if (result && result.catch) result.catch(() => {}); } } catch (_) {}
    }

    start() {
      if (this.destroyed) return;
      this.state = 'running'; this.lastFrame = null; this.lastDraw = null; this.syncFromStorage(); this.environmentTick(); this.runAutocare(); this.refresh(); this.resize();
      if (!this.timer) this.timer = setInterval(() => {
        this.syncFromStorage();
        if (this.data.autoCare && Date.now() - this.data.autoAt >= 2000) this.runAutocare();
        else if (!this.data.autoCare) this.environmentTick();
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
      const scale = Math.min(rect.width / W, rect.height / H);
      this.viewport = { width: rect.width, height: rect.height, dpr, scale, offsetX: (rect.width - W * scale) / 2, offsetY: (rect.height - H * scale) / 2 };
      for (let i = 0; i < this.plotButtons.length; i++) {
        const button = this.plotButtons[i], plot = PLOTS[i];
        button.style.left = `${this.viewport.offsetX + plot.x * scale}px`;
        button.style.top = `${this.viewport.offsetY + plot.y * scale}px`;
        button.style.width = `${W * .125 * scale}px`;
        button.style.height = `${H * .16 * scale}px`;
      }
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
      const seed = SEEDS[plot.type], stage = this.phase(plot, now), progress = this.plotProgress(plot, now);
      if (stage !== 'dry') this.ellipse(ctx, p.x, p.y, 30, 13, 'rgba(61,68,46,.12)');
      const positions = progress > .45 ? [{ x: 0, y: -4, size: 1 }, { x: -13, y: 0, size: .7 }, { x: 14, y: 2, size: .77 }] : [{ x: 0, y: -4, size: 1 }];
      for (const f of positions) {
        const h = (11 + 32 * progress) * f.size * seed.height, x = p.x + f.x, y = p.y + f.y;
        const sway = this.reducedMotion ? 0 : Math.sin(this.sceneTime * 1.2 + index + f.x * .018) * 4.2 * progress;
        ctx.strokeStyle = seed.leaf; ctx.lineWidth = 2 * f.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y - h * .5, x + sway, y - h); ctx.stroke();
        ctx.fillStyle = seed.leaf; ctx.beginPath(); ctx.moveTo(x, y - h * .35); ctx.quadraticCurveTo(x - 13 * f.size, y - h * .58, x - 12 * f.size, y - h * .3); ctx.quadraticCurveTo(x - 5, y - h * .2, x, y - h * .35); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - h * .62); ctx.quadraticCurveTo(x + 12 * f.size, y - h * .89, x + 11 * f.size, y - h * .58); ctx.quadraticCurveTo(x + 5, y - h * .5, x, y - h * .62); ctx.fill();
        const bloom = clamp((progress - .55) / .45, 0, 1), radius = (3 + bloom * 7) * f.size;
        ctx.save(); ctx.translate(x + sway, y - h);
        if (seed.shape === 'bell') {
          ctx.fillStyle = seed.petal; ctx.beginPath(); ctx.moveTo(-radius * .6, -radius * .5); ctx.bezierCurveTo(-radius * 1.1, -radius * 1.6, radius * 1.1, -radius * 1.6, radius * .6, -radius * .5); ctx.lineTo(radius, radius * .7); ctx.quadraticCurveTo(0, radius * 1.15, -radius, radius * .7); ctx.closePath(); ctx.fill(); this.ellipse(ctx, 0, radius * .8, radius * .6, 1.6, seed.center);
        } else if (seed.shape === 'star') {
          this.star(ctx, 0, 0, radius * 1.15, seed.petal); this.ellipse(ctx, 0, 0, radius * .3, radius * .3, seed.center);
        } else if (seed.shape === 'cup') {
          ctx.fillStyle = seed.petal; ctx.beginPath(); ctx.moveTo(-radius, -radius * .7); ctx.quadraticCurveTo(-radius * .4, -radius * .2, -radius * .4, radius * .2); ctx.lineTo(0, -radius * 1.2); ctx.lineTo(radius * .4, radius * .2); ctx.quadraticCurveTo(radius * .4, -radius * .2, radius, -radius * .7); ctx.quadraticCurveTo(radius * 1.1, radius * 1.1, 0, radius); ctx.quadraticCurveTo(-radius * 1.1, radius * 1.1, -radius, -radius * .7); ctx.fill(); this.ellipse(ctx, 0, radius * .15, radius * .23, radius * .38, seed.center);
        } else if (seed.shape === 'sun') {
          if (!this.reducedMotion) ctx.rotate(Math.sin(this.sceneTime * .25) * .13);
          for (let j = 0; j < 12; j++) { ctx.save(); ctx.rotate(j * Math.PI / 6); this.ellipse(ctx, 0, -radius * .75, radius * .23, radius * .65, seed.petal); ctx.restore(); }
          this.ellipse(ctx, 0, 0, radius * .58, radius * .58, seed.center);
          for (let j = 0; j < 4; j++) this.ellipse(ctx, (j % 2 ? 1 : -1) * radius * .2, (j < 2 ? -1 : 1) * radius * .2, .7, .7, '#d4bf8d');
        } else if (seed.shape === 'orchid') {
          ctx.fillStyle = seed.petal;
          for (let j = 0; j < 4; j++) { ctx.save(); ctx.rotate(j * Math.PI / 2 + .35); ctx.beginPath(); ctx.moveTo(0, 1); ctx.bezierCurveTo(-radius, -radius * .9, -radius * .2, -radius * 1.4, 0, -radius * 1.2); ctx.bezierCurveTo(radius * .6, -radius, radius * .7, -radius * .2, 0, 1); ctx.fill(); ctx.restore(); }
          this.ellipse(ctx, 0, 1, radius * .27, radius * .34, seed.center);
        } else {
          for (let j = 0; j < 5; j++) { ctx.save(); ctx.rotate(j * Math.PI * 2 / 5); this.ellipse(ctx, 0, -radius * .52, radius * .45, radius * .7, seed.petal); ctx.restore(); } this.ellipse(ctx, 0, 0, radius * .36, radius * .36, seed.center);
        }
        ctx.restore();
        if (plot.type === 'dew' && plot.wateredAt) { this.ellipse(ctx, x + 9 * f.size, y - h * .62, 1.7 * f.size, 2.8 * f.size, '#d1e0d1'); this.ellipse(ctx, x + 8.7 * f.size, y - h * .65, .65, .65, '#f5eed8'); }
      }
      if (stage === 'ready') { this.glow(ctx, p.x, p.y - 31, 34, 'rgba(244,215,169,.14)'); for (let j = 0; j < 3; j++) { const a = this.reducedMotion ? j * 2.1 : this.sceneTime * .5 + j * 2.1; this.star(ctx, p.x + Math.cos(a) * 24, p.y - 27 + Math.sin(a) * 15, 2.2, '#ecdab8'); } }
      if (stage === 'dry') { ctx.fillStyle = '#bdd4ce'; ctx.beginPath(); ctx.moveTo(p.x + 22, p.y - 33); ctx.bezierCurveTo(p.x + 16, p.y - 24, p.x + 27, p.y - 21, p.x + 27, p.y - 27); ctx.quadraticCurveTo(p.x + 27, p.y - 29, p.x + 22, p.y - 33); ctx.fill(); }
      if (plot.type === 'lull' && progress > .8) {
        const flutter = this.reducedMotion ? 1 : 1 + Math.sin(this.sceneTime * 4) * .35;
        const mx = p.x + 19 + (this.reducedMotion ? 0 : Math.sin(this.sceneTime * .75 + index) * 8), my = p.y - 52 + (this.reducedMotion ? 0 : Math.cos(this.sceneTime * .9 + index) * 5);
        this.ellipse(ctx, mx - 2.5, my, 3 * flutter, 1.8, '#e7e5c9'); this.ellipse(ctx, mx + 2.5, my, 3 * flutter, 1.8, '#e7e5c9'); this.ellipse(ctx, mx, my, .8, 2, '#91876a');
      }
    }

    decorations(ctx) {
      // Furniture lives around the rim; every purchase changes the silhouette.
      // The center stays clear for six flower plots, with no unowned stand-ins.
      const outline = '#515340', time = this.reducedMotion ? 0 : this.sceneTime;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (this.data.decorations.trellis) {
        ctx.save(); ctx.translate(350, 178);
        this.ellipse(ctx, -69, 3, 13, 4, 'rgba(65,78,50,.2)'); this.ellipse(ctx, 69, 3, 13, 4, 'rgba(65,78,50,.2)');
        const arch = () => { ctx.beginPath(); ctx.moveTo(-69, 1); ctx.lineTo(-69, -43); ctx.bezierCurveTo(-69, -120, 69, -120, 69, -43); ctx.lineTo(69, 1); };
        ctx.strokeStyle = outline; ctx.lineWidth = 10; arch(); ctx.stroke(); ctx.strokeStyle = '#d1b57d'; ctx.lineWidth = 6; arch(); ctx.stroke();
        ctx.strokeStyle = '#9b855c'; ctx.lineWidth = 2; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 59, -4); ctx.lineTo(side * 59, -51); ctx.stroke(); for (let y = -13; y >= -49; y -= 17) { ctx.beginPath(); ctx.moveTo(side * 59, y); ctx.lineTo(side * 74, y - 9); ctx.stroke(); } }
        ctx.strokeStyle = '#597b58'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-75, -2); ctx.bezierCurveTo(-52, -32, -88, -58, -48, -86); ctx.bezierCurveTo(-9, -111, 50, -95, 65, -64); ctx.bezierCurveTo(83, -35, 55, -19, 73, -3); ctx.stroke();
        for (let j = 0; j < 19; j++) { const a = Math.PI + j * Math.PI / 18, sway = Math.sin(time * .8 + j) * 1.2; const x = Math.cos(a) * 71 + sway, y = -39 + Math.sin(a) * 60; ctx.save(); ctx.translate(x, y); ctx.rotate(a + (j % 2 ? .65 : -.65)); this.ellipse(ctx, 0, 0, 10, 5.5, j % 2 ? '#78965b' : '#a8b879'); ctx.restore(); if (j % 3 === 1) { this.ellipse(ctx, x + 3, y + 4, 5.5, 5.5, '#e3b5a3'); this.ellipse(ctx, x + 3, y + 4, 1.8, 1.8, '#f4dfae'); } }
        for (const side of [-1, 1]) { this.ellipse(ctx, side * 72, -20, 10, 5, '#78965b'); this.ellipse(ctx, side * 66, -7, 9, 5, '#a8b879'); }
        if (!this.reducedMotion) for (let j = 0; j < 2; j++) { const fall = (time * .065 + j * .5) % 1; this.ellipse(ctx, -43 + j * 77 + Math.sin(fall * 6 + j) * 12, -67 + fall * 47, 2.2, 1.2, `rgba(232,188,173,${Math.sin(fall * Math.PI) * .8})`); }
        ctx.restore();
      }
      if (this.data.decorations.bench) {
        ctx.save(); ctx.translate(179, 292); ctx.rotate(.07); this.ellipse(ctx, 0, 15, 42, 7, 'rgba(71,68,43,.22)');
        ctx.strokeStyle = outline; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-29, -21); ctx.lineTo(-31, 14); ctx.moveTo(29, -21); ctx.lineTo(31, 14); ctx.stroke();
        ctx.fillStyle = '#c59b62'; ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-36, -28, 72, 23, 3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#e5c78b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-32, -20); ctx.lineTo(32, -20); ctx.moveTo(-32, -13); ctx.lineTo(32, -13); ctx.stroke();
        ctx.fillStyle = '#d4af73'; ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-39, -6, 78, 10, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#bc8f83'; ctx.beginPath(); ctx.roundRect(8, -21, 18, 16, 5); ctx.fill(); ctx.strokeStyle = '#e5c2ae'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(11, -18); ctx.lineTo(23, -8); ctx.moveTo(23, -18); ctx.lineTo(11, -8); ctx.stroke();
        ctx.strokeStyle = outline; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-39, -12); ctx.lineTo(-39, -1); ctx.moveTo(39, -12); ctx.lineTo(39, -1); ctx.stroke(); ctx.restore();
      }
      if (this.data.decorations.lantern) {
        const warmth = .27 + Math.sin(time * 1.8) * .035 + Math.sin(time * 5.1) * .01;
        ctx.save(); ctx.translate(507, 184); this.ellipse(ctx, 3, 1, 12, 4, '#8b815c'); this.ellipse(ctx, 20, -2, 34, 8, 'rgba(244,201,122,.15)');
        ctx.strokeStyle = outline; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -79); ctx.quadraticCurveTo(1, -92, 20, -88); ctx.stroke(); ctx.strokeStyle = '#ba9c64'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -78); ctx.stroke();
        ctx.save(); ctx.translate(20, -86); ctx.rotate(Math.sin(time * .8) * .035); this.glow(ctx, 0, 20, 66, `rgba(255,210,132,${warmth})`);
        ctx.strokeStyle = outline; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 7); ctx.stroke(); ctx.fillStyle = '#d2aa66'; ctx.beginPath(); ctx.moveTo(-15, 12); ctx.lineTo(0, 5); ctx.lineTo(15, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f0ce8a'; ctx.beginPath(); ctx.roundRect(-12, 12, 24, 26, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffebad'; ctx.fillRect(-7, 15, 14, 18); this.star(ctx, 0, 23, 6.5, '#fff3cd'); ctx.strokeStyle = '#a77f45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, 37); ctx.lineTo(13, 37); ctx.stroke(); ctx.restore(); ctx.restore();
      }
      if (this.data.decorations.mushroom) {
        ctx.save(); ctx.translate(574, 230); this.ellipse(ctx, 0, 21, 36, 8, 'rgba(74,60,48,.2)');
        ctx.fillStyle = '#ead7ad'; ctx.strokeStyle = outline; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.roundRect(-23, -25, 46, 46, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a36655'; ctx.beginPath(); ctx.roundRect(16, -57, 10, 23, 2); ctx.fill(); ctx.stroke();
        if (!this.reducedMotion) for (let j = 0; j < 3; j++) { const rise = (time * .19 + j / 3) % 1; this.ellipse(ctx, 21 + Math.sin(rise * 4 + j) * 6, -62 - rise * 23, 2.5 + rise * 3, 2 + rise * 2, `rgba(231,219,199,${(1 - rise) * .35})`); }
        ctx.fillStyle = '#b96f5b'; ctx.beginPath(); ctx.moveTo(-37, -21); ctx.bezierCurveTo(-37, -76, 35, -76, 38, -21); ctx.quadraticCurveTo(0, -8, -37, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.ellipse(ctx, -16, -42, 7.5, 5.5, '#f1dfb9'); this.ellipse(ctx, 13, -36, 8.5, 6, '#f1dfb9'); this.ellipse(ctx, 0, -55, 5.5, 4, '#f1dfb9');
        ctx.fillStyle = '#775743'; ctx.beginPath(); ctx.roundRect(-7, 1, 15, 20, [7, 7, 0, 0]); ctx.fill(); this.ellipse(ctx, 3, 12, 1.2, 1.2, '#d7bc79');
        this.glow(ctx, 15, -6, 18, 'rgba(247,198,115,.17)'); this.ellipse(ctx, 15, -6, 6.5, 6.5, '#f1c779'); ctx.strokeStyle = '#815e44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(15, -6, 6.5, 0, Math.PI * 2); ctx.moveTo(9, -6); ctx.lineTo(21, -6); ctx.moveTo(15, -12); ctx.lineTo(15, 0); ctx.stroke();
        this.ellipse(ctx, -18, 22, 8, 2.5, '#d5c6a0'); this.ellipse(ctx, -10, 24, 7, 2, '#d5c6a0'); ctx.restore();
      }
      if (this.data.decorations.windchime) {
        ctx.save(); ctx.translate(202, 185); this.ellipse(ctx, -12, 0, 10, 3, 'rgba(68,77,47,.2)'); ctx.strokeStyle = outline; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-13, -76); ctx.quadraticCurveTo(-12, -82, -5, -82); ctx.lineTo(24, -82); ctx.stroke(); ctx.strokeStyle = '#c2a979'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.lineTo(-13, -76); ctx.lineTo(23, -76); ctx.stroke();
        for (let j = 0; j < 3; j++) { const sway = Math.sin(time * 1.1 + j * .45) * .13; ctx.save(); ctx.translate(-1 + j * 11, -77); ctx.rotate(sway); const length = [27, 43, 32][j]; ctx.strokeStyle = '#e1d2b2'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, length); ctx.stroke(); ctx.fillStyle = ['#e2c782', '#98b9a6', '#b7cab9'][j]; ctx.strokeStyle = '#5d7c68'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, length - 2); ctx.quadraticCurveTo(-15, length + 6, -2, length + 19); ctx.quadraticCurveTo(12, length + 9, 0, length - 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, length + 3); ctx.lineTo(-1, length + 14); ctx.stroke(); ctx.restore(); }
        ctx.restore();
      }
      if (this.data.decorations.birdbath) {
        ctx.save(); ctx.translate(115, 279); this.ellipse(ctx, 0, 1, 19, 5, 'rgba(68,77,47,.2)'); ctx.fillStyle = '#91aaa0'; ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -31); ctx.lineTo(-5, -7); ctx.lineTo(-14, -2); ctx.quadraticCurveTo(0, 4, 14, -2); ctx.lineTo(5, -7); ctx.lineTo(7, -31); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a7c1b4'; ctx.beginPath(); ctx.moveTo(-24, -36); ctx.quadraticCurveTo(-21, -20, 0, -20); ctx.quadraticCurveTo(21, -20, 24, -36); ctx.fill(); ctx.stroke(); this.ellipse(ctx, 0, -36, 24, 7, '#c2d0b9'); this.ellipse(ctx, 0, -37, 19, 4.5, '#6f9e9a');
        ctx.strokeStyle = '#d7e5d0'; ctx.lineWidth = 1; const ripple = (time * .6) % 1; ctx.globalAlpha = .7 - ripple * .5; ctx.beginPath(); ctx.ellipse(-4, -37, 4 + ripple * 9, 1.5 + ripple * 1.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        const drink = this.reducedMotion ? 0 : Math.pow(Math.max(0, Math.sin(time * .8)), 8); ctx.save(); ctx.translate(12, -43); ctx.rotate(-drink * .5); this.ellipse(ctx, 0, -5, 10, 7, '#d6af69'); ctx.fillStyle = '#a17d56'; ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(19, -13); ctx.lineTo(14, -3); ctx.closePath(); ctx.fill(); this.ellipse(ctx, 1, -5, 5, 4, '#af875b'); this.ellipse(ctx, -6, -11, 5.5, 5.5, '#ecd4a0'); this.ellipse(ctx, -7, -12, 1.1, 1.1, '#454a39'); ctx.fillStyle = '#aa7644'; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-17, -7); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.restore();
      }
      if (this.data.decorations.mailbox) {
        ctx.save(); ctx.translate(124, 212); this.ellipse(ctx, 0, 0, 13, 4, 'rgba(68,77,47,.2)'); ctx.strokeStyle = outline; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -29); ctx.stroke(); ctx.strokeStyle = '#b29262'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -27); ctx.stroke();
        ctx.fillStyle = '#bd7c67'; ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-23, -51, 46, 30, [13, 13, 3, 3]); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e5b296'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18, -29); ctx.lineTo(17, -29); ctx.stroke();
        ctx.save(); ctx.translate(-10, -42); ctx.rotate(-.12); ctx.fillStyle = '#f3e4bf'; ctx.strokeStyle = '#8b775c'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.roundRect(0, 0, 22, 15, 1.5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, 8); ctx.lineTo(22, 0); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = '#77583f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(17, -42); ctx.lineTo(17, -62); ctx.stroke(); const wave = Math.sin(time * 1.2) * 1.5; ctx.fillStyle = '#e2ba68'; ctx.beginPath(); ctx.moveTo(17, -62); ctx.quadraticCurveTo(24, -65 + wave, 31, -61); ctx.lineTo(30, -51); ctx.quadraticCurveTo(23, -55 + wave, 17, -52); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.restore();
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
      if (this.destroyed || !this.ctx || !this.canvas.width || !this.viewport) return;
      const ctx = this.ctx, now = Date.now(), v = this.viewport;
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.clearRect(0, 0, v.width, v.height);
      ctx.fillStyle = '#263c3d'; ctx.fillRect(0, 0, v.width, v.height);
      ctx.setTransform(v.scale * v.dpr, 0, 0, v.scale * v.dpr, v.offsetX * v.dpr, v.offsetY * v.dpr);
      const viewW = v.width / v.scale, viewH = v.height / v.scale, skyX = -v.offsetX / v.scale, skyY = -v.offsetY / v.scale;
      this.glow(ctx, 93, 118, 145, 'rgba(173,191,163,.035)'); this.glow(ctx, 594, 86, 155, 'rgba(220,196,153,.035)');
      for (let i = 0; i < 73; i++) { const x = skyX + (i * 113.4 + 26) % viewW, y = skyY + (i * 61.8 + 13) % viewH, alpha = this.reducedMotion ? .45 : .38 + Math.sin(this.sceneTime * .6 + i) * .14; ctx.globalAlpha = alpha; if (i % 15 === 0) this.star(ctx, x, y, 3, '#d8c698'); else this.ellipse(ctx, x, y, i % 4 === 0 ? 1.2 : .6, i % 4 === 0 ? 1.2 : .6, '#e1dfca'); } ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(572, 90); ctx.rotate(-.3); this.glow(ctx, 0, 0, 42, 'rgba(240,220,181,.04)'); ctx.fillStyle = '#e5d8b9'; ctx.beginPath(); ctx.arc(0, 0, 15, .45, Math.PI * 1.76); ctx.bezierCurveTo(-6, -15, -10, 9, 13, 6); ctx.fill(); ctx.restore();
      this.terrain(ctx); this.decorations(ctx);
      for (let i = 0; i < 6; i++) this.plotArt(ctx, this.data.plots[i], i, now);
      this.cat(ctx, now);
      if (!this.reducedMotion && weatherAt(now) === 'rain') {
        ctx.strokeStyle = 'rgba(195,217,207,.24)'; ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) { const x = 127 + i * 61, y = 161 + (this.sceneTime * 18 + i * 23) % 143; ctx.beginPath(); ctx.moveTo(x + 1, y - 4); ctx.lineTo(x, y); ctx.stroke(); }
      }
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
