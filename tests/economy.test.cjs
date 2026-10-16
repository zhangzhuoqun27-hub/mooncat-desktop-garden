'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const SOURCE = path.join(__dirname, '../app/game.js');
const KEY = 'mooncat.moon-garden.v1';
const MINUTE = 60000;
const BASE = 1770000000000 - (1770000000000 % (120 * MINUTE));
let checks = 0;
function context(initial, shared) {
  const storage = shared || new Map();
  if (initial) storage.set(KEY, JSON.stringify(initial));
  let now = BASE, timerId = 0;
  class AuditDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const sandbox = {
    window: { matchMedia: () => ({ matches: true }), __auditIterations: 0 },
    document: { hidden: false },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
    Date: AuditDate, ResizeObserver: undefined,
    setInterval: () => ++timerId, clearInterval: () => {},
    requestAnimationFrame: () => ++timerId, cancelAnimationFrame: () => {}
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(SOURCE, 'utf8');
  const loop = 'for (let cycle = 0; cycle < 1536; cycle++) {';
  assert.equal(source.split(loop).length, 2, 'Find exactly one bounded settlement loop for diagnostic counting.');
  vm.runInContext(source.replace(loop, loop + ' window.__auditIterations++;'), sandbox, { filename: SOURCE });
  // Stub presentation only. Every financial action, load/save, clock and
  // maturity calculation below executes the unmodified shipping methods.
  vm.runInContext(`Object.assign(window.MoonGame.prototype, {
    mount(){this.el={remove(){}};this.canvas={};this.ctx=null;this.ui={};this.plotButtons=[];this.seedButtons=[];this.decorButtons=[];},
    bind(){},refresh(){},resize(){},render(){},burst(){},say(message){this.lastMessage=message;}
  });`, sandbox);
  return { storage, sandbox, setNow(value) { now = value; }, now: () => now,
    game(options = {}) { return new sandbox.window.MoonGame({ appendChild() {} }, options); },
    persisted() { return JSON.parse(storage.get(KEY)); } };
}
function fixture(mutate = () => {}) {
  const env = context(), game = env.game();
  mutate(game.data);
  game.save(); game.destroy();
  return env.persisted();
}
function stored(game) { return JSON.parse(JSON.stringify(game.data)); }
function check(name, run) { run(); checks++; console.log(`PASS ${name}`); }
function readyPlot(type, at = BASE) { return { type, plantedAt: at - 10 * MINUTE, wateredAt: at - 10 * MINUTE, readyAt: at, weather: 'moon', extraWaterAt: 0, blessingEligible: true }; }
const seedCases = [ ['moon', 2, 3], ['dream', 3, 5], ['peach', 4, 8], ['dew', 4, 12], ['sun', 5, 18], ['lull', 6, 26] ];
const oldYields = { moon: 3, dream: 4, peach: 5, dew: 6, sun: 7, lull: 9 };
const seedMinutes = { moon: 8, dream: 15, peach: 25, dew: 45, sun: 70, lull: 100 };

check('fresh save has 12 stars, no decorations and no blessings', () => {
  const env = context(), g = env.game();
  assert.equal(g.data.wallet, 12); assert.equal(g.data.plots.filter(Boolean).length, 0);
  assert.ok(Object.values(g.data.decorations).every(value => value === false));
  assert.deepEqual(stored(g).blessings, { count: 0, progress: 0, starsGiven: 0 });
});
for (const [type, cost, reward] of seedCases) check(`${type}: purchase once, no early harvest, maturity pays once`, () => {
  const env = context(), g = env.game();
  g.selectSeed(type); g.tend(0); assert.equal(g.data.wallet, 12 - cost);
  for (let i = 0; i < 20; i++) g.tend(0);
  assert.equal(g.data.wallet, 12 - cost); assert.equal(g.data.harvested, 0);
  const readyAt = g.data.plots[0].readyAt;
  env.setNow(readyAt - 1); g.tend(0);
  // Extra-water species can intentionally finish a little early when watered.
  const finalReady = g.data.plots[0].readyAt;
  if (finalReady > env.now()) assert.equal(g.data.harvested, 0);
  env.setNow(finalReady); g.tend(0);
  assert.equal(g.data.wallet, 12 - cost + reward); assert.equal(g.data.harvested, 1);
  for (let i = 0; i < 30; i++) g.tend(0);
  assert.equal(g.data.harvested, 1); assert.equal(g.data.wallet, 12 - 2 * cost + reward);
  assert.equal(g.data.blessings.progress, reward - cost);
  assert.deepEqual(env.persisted(), stored(g));
});
check('six purchases exhaust 12 stars, unfunded purchase has no effect', () => {
  const env = context(), g = env.game();
  for (let i = 0; i < 6; i++) g.tend(i);
  assert.equal(g.data.wallet, 0);
  const env2 = context(fixture(d => { d.wallet = 0; })), g2 = env2.game();
  g2.tend(0); assert.equal(g2.data.wallet, 0); assert.equal(g2.data.plots[0], null);
});
check('gift is capped by balance, maturity and saved 60-second cooldown; no blessing credit', () => {
  const env = context(fixture(d => { d.wallet = 0; d.blessings.progress = 99; })), g = env.game();
  g.gift(); assert.equal(g.data.wallet, 2);
  for (let i = 0; i < 50; i++) g.gift();
  assert.equal(g.data.wallet, 2); assert.equal(g.data.blessings.progress, 99);
  g.tend(0); assert.equal(g.data.wallet, 0); g.destroy();
  const second = env.game(); second.gift(); assert.equal(second.data.wallet, 0);
  env.setNow(BASE + MINUTE); second.gift(); assert.equal(second.data.wallet, 2);
  second.data.wallet = 0; second.data.plots[1] = readyPlot('moon', env.now()); second.save();
  env.setNow(BASE + 2 * MINUTE); second.gift(); assert.equal(second.data.wallet, 0);
});
check('feeding has exact charge and saved cooldown, never overdraws or charges full happiness', () => {
  const env = context(), g = env.game(); g.feed(); assert.equal(g.data.wallet, 11); assert.equal(g.data.happiness, 75);
  for (let i = 0; i < 30; i++) g.feed(); assert.equal(g.data.wallet, 11);
  g.destroy(); const reopened = env.game(); reopened.feed(); assert.equal(reopened.data.wallet, 11);
  env.setNow(BASE + 5 * MINUTE); reopened.feed(); assert.equal(reopened.data.wallet, 10);
  reopened.data.wallet = 0; reopened.save(); env.setNow(BASE + 10 * MINUTE); reopened.feed(); assert.equal(reopened.data.wallet, 0);
  reopened.data.wallet = 10; reopened.data.happiness = 100; reopened.save(); reopened.feed(); assert.equal(reopened.data.wallet, 10);
});
check('decorations require both resources and varieties; duplicate purchase has no charge', () => {
  const env = context(fixture(d => { d.wallet = 18; d.petals = 4; })), g = env.game();
  g.decorate('bench'); assert.equal(g.data.wallet, 0); assert.equal(g.data.petals, 0); assert.equal(g.data.decorations.bench, true);
  for (let i = 0; i < 30; i++) g.decorate('bench'); assert.equal(g.data.wallet, 0); assert.equal(g.data.petals, 0);
  for (const mutate of [d => { d.wallet = 17; d.petals = 4; }, d => { d.wallet = 18; d.petals = 3; }]) {
    const no = context(fixture(mutate)), ng = no.game(), before = stored(ng); ng.decorate('bench'); assert.deepEqual(stored(ng), before);
  }
  const locked = context(fixture(d => { d.wallet = 100; d.petals = 30; })), lg = locked.game(), before = stored(lg);
  lg.decorate('trellis'); assert.deepEqual(stored(lg), before);
});
check('100 net-profit threshold deducts floor 20% after credit; callback sees committed result', () => {
  const env = context(fixture(d => { d.wallet = 10; d.blessings.progress = 99; d.ledger.blessingNet = 99; d.plots[0] = readyPlot('moon'); }));
  const events = [], g = env.game({ onComplete(event) { events.push({ event: JSON.parse(JSON.stringify(event)), persisted: env.persisted() }); } });
  g.tend(0);
  assert.equal(g.data.wallet, 11); assert.equal(g.data.blessings.count, 1); assert.equal(g.data.blessings.progress, 0); assert.equal(g.data.blessings.starsGiven, 2);
  assert.equal(g.data.ledger.blessingNet, 100); assert.equal(events.length, 2);
  assert.ok(events.every(({ persisted }) => persisted.wallet === 11 && persisted.plots[0] === null && persisted.blessings.count === 1));
  g.tend(0); assert.equal(g.data.blessings.count, 1); assert.equal(g.data.harvested, 1);
});
check('twenty-profit harvest preserves threshold remainder; gifts and migrated flowers do not progress blessings', () => {
  const env = context(fixture(d => { d.wallet = 10; d.blessings.progress = 98; d.ledger.blessingNet = 98; d.plots[0] = readyPlot('lull'); })), g = env.game();
  g.tend(0); assert.equal(g.data.wallet, 29); assert.equal(g.data.blessings.count, 1); assert.equal(g.data.blessings.progress, 18);
  const migrated = context(fixture(d => { d.wallet = 10; d.blessings.progress = 99; d.plots[0] = { ...readyPlot('moon'), blessingEligible: false }; })), mg = migrated.game();
  mg.tend(0); assert.equal(mg.data.wallet, 13); assert.equal(mg.data.blessings.progress, 99); assert.equal(mg.data.blessings.count, 0);
});
check('stale instances load the latest revision before every spending and credit action', () => {
  const env = context(fixture(d => { d.wallet = 20; d.petals = 10; d.plots[0] = readyPlot('moon'); }));
  const first = env.game(), second = env.game();
  first.tend(0); second.tend(0); assert.equal(second.data.harvested, 1); assert.equal(second.data.wallet, 21);
  first.decorate('bench'); assert.equal(first.data.wallet, 3);
  second.decorate('bench'); assert.equal(second.data.wallet, 3);
  second.feed(); first.feed(); assert.equal(first.data.wallet, 2);
  first.syncFromStorage(); assert.deepEqual(stored(first), stored(second));
});
function settlePair(initial, minutes = 24 * 60, tick = MINUTE) {
  const online = context(initial), offline = context(initial), a = online.game(), b = offline.game();
  for (let elapsed = tick; elapsed <= minutes * MINUTE; elapsed += tick) { online.setNow(BASE + elapsed); a.backgroundTick(); }
  if ((minutes * MINUTE) % tick) { online.setNow(BASE + minutes * MINUTE); a.backgroundTick(); }
  offline.sandbox.window.__auditIterations = 0;
  offline.setNow(BASE + minutes * MINUTE); b.backgroundTick();
  const normalize = d => { const copy = JSON.parse(JSON.stringify(d)); delete copy.ledger.revision; return copy; };
  return { online: normalize(stored(a)), offline: normalize(stored(b)), onlineEnv: online, offlineEnv: offline };
}
check('full mixed-flower garden has identical live and offline accounting', () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 20; d.blessings.progress = 98; d.ledger.blessingNet = 98; d.selectedSeed = 'lull';
    d.plots = seedCases.map(([type]) => ({ type, plantedAt: BASE, wateredAt: BASE, readyAt: BASE + ({ moon: 8, dream: 15, peach: 25, dew: 45, sun: 70, lull: 100 }[type]) * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true })); });
  const pair = settlePair(initial); assert.deepEqual(pair.offline, pair.online);
  const reopened = pair.offlineEnv.game(); reopened.backgroundTick(); assert.equal(reopened.data.wallet, pair.offline.wallet); assert.equal(reopened.data.harvested, pair.offline.harvested);
});
check('partially planted, low-balance garden recovers identically live and offline', () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 0; d.plots[0] = { type: 'moon', plantedAt: BASE, wateredAt: BASE, readyAt: BASE + 8 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true }; });
  const pair = settlePair(initial, 60);
  console.log(`  low-balance comparison: online ${pair.online.wallet} stars/${pair.online.harvested} harvests; offline ${pair.offline.wallet} stars/${pair.offline.harvested} harvests`);
  assert.deepEqual(pair.offline, pair.online);
});
for (const wallet of [0, 1, 5, 11, 35]) check(`empty ${wallet}-star garden: 24 hours online/offline identical including blessings`, () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = wallet; d.selectedSeed = wallet % 2 ? 'lull' : 'moon'; d.blessings.progress = 99; d.ledger.blessingNet = 99; d.giftAt = BASE - 30000; });
  const pair = settlePair(initial);
  assert.deepEqual(pair.offline, pair.online); assert.ok(pair.offline.wallet >= 0);
  assert.equal(pair.offline.plots.filter(Boolean).length, 6);
  assert.equal(pair.offline.ledger.blessingNet, pair.offline.blessings.count * 100 + pair.offline.blessings.progress);
  assert.ok(pair.offlineEnv.sandbox.window.__auditIterations < 1536);
  console.log(`  24h: ${pair.offline.harvested} harvests; ${pair.offlineEnv.sandbox.window.__auditIterations}/1536 iterations; ${pair.offline.blessings.count} blessings`);
});
check('dry/growing/empty mixed plots at 1 star match 2-second live ticks through 24 hours', () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 1; d.selectedSeed = 'dew'; d.blessings.progress = 99; d.ledger.blessingNet = 99; d.giftAt = BASE - 17000;
    d.plots[0] = { type: 'dream', plantedAt: BASE, wateredAt: 0, readyAt: 0, weather: 'moon', extraWaterAt: 0, blessingEligible: true };
    d.plots[1] = { type: 'lull', plantedAt: BASE, wateredAt: BASE, readyAt: BASE + 100 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true };
    d.plots[2] = { type: 'dew', plantedAt: BASE, wateredAt: 0, readyAt: 0, weather: 'moon', extraWaterAt: 0, blessingEligible: true }; });
  const pair = settlePair(initial, 24 * 60, 2000); assert.deepEqual(pair.offline, pair.online);
  assert.ok(pair.offline.wallet >= 0); assert.ok(pair.offlineEnv.sandbox.window.__auditIterations < 1536);
  console.log(`  mixed 24h: ${pair.offline.harvested} harvests; ${pair.offlineEnv.sandbox.window.__auditIterations}/1536 iterations`);
});
check('24-hour cap settles old mature plots at cap start and never accumulates preceding 48 hours', () => {
  const old = fixture(d => { d.autoCare = true; d.autoAt = BASE - 72 * 60 * MINUTE; d.ledger.through = d.autoAt; d.wallet = 0; d.blessings.progress = 99; d.ledger.blessingNet = 99; d.giftAt = d.autoAt;
    d.plots = seedCases.map(([type]) => ({ type, plantedAt: d.autoAt, wateredAt: d.autoAt, readyAt: d.autoAt + 100 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true })); });
  const capped = JSON.parse(JSON.stringify(old)); capped.autoAt = BASE - 24 * 60 * MINUTE; capped.ledger.through = capped.autoAt;
  const online = context(capped); online.setNow(BASE - 24 * 60 * MINUTE); const a = online.game();
  const offline = context(old); const b = offline.game();
  for (let elapsed = MINUTE; elapsed <= 24 * 60 * MINUTE; elapsed += MINUTE) { online.setNow(BASE - 24 * 60 * MINUTE + elapsed); a.backgroundTick(); }
  const normalized = game => { const copy = stored(game); delete copy.ledger.revision; return copy; };
  assert.deepEqual(normalized(b), normalized(a)); assert.equal(b.data.autoAt, BASE); assert.ok(b.data.wallet >= 0);
  assert.ok(offline.sandbox.window.__auditIterations < 1536);
  console.log(`  capped 72h absence: ${b.data.harvested} harvests; ${offline.sandbox.window.__auditIterations}/1536 iterations`);
});
check('reopening 100 times across separate contexts cannot repeat recovery gifts, harvests or blessings', () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 0; d.blessings.progress = 99; d.ledger.blessingNet = 99; });
  const env = context(initial), first = env.game(); env.setNow(BASE + 60 * MINUTE); first.backgroundTick(); first.destroy();
  const reference = env.persisted(), referenceNoRevision = JSON.parse(JSON.stringify(reference)); delete referenceNoRevision.ledger.revision;
  for (let i = 0; i < 100; i++) {
    const other = context(undefined, env.storage); other.setNow(BASE + 60 * MINUTE); const g = other.game(); g.backgroundTick(); g.destroy();
    const result = other.persisted(); delete result.ledger.revision;
    assert.deepEqual(result, referenceNoRevision);
  }
});
check('v1 migration pays an old flower once while old wealth and migration credit never advance blessings', () => {
  const old = fixture(d => { d.version = 1; d.wallet = 1000; d.petals = 0; d.blessings = { count: 10, progress: 99, starsGiven: 500 }; d.ledger.blessingNet = 1099;
    d.plots[0] = { type: 'moon', plantedAt: BASE - MINUTE, wateredAt: BASE - MINUTE, readyAt: BASE, weather: 'moon' }; });
  const env = context(old), g = env.game(); assert.equal(g.data.wallet, 1000); assert.equal(g.phase(g.data.plots[0]), 'ready');
  g.tend(0); assert.equal(g.data.wallet, 1003); assert.deepEqual(stored(g).blessings, { count: 0, progress: 0, starsGiven: 0 });
  g.destroy(); const second = env.game(); second.tend(0); assert.equal(second.data.harvested, 1); assert.equal(second.data.wallet, 1001);
});
check('zero-balance blessing rollover automatically replants without negative stars', () => {
  const env = context(fixture(d => { d.autoCare = true; d.wallet = 0; d.blessings.progress = 99; d.ledger.blessingNet = 99;
    d.plots = Array.from({ length: 6 }, () => readyPlot('moon')); })), g = env.game();
  assert.equal(g.data.blessings.count, 1); assert.equal(g.data.blessings.starsGiven, 0); assert.equal(g.data.wallet, 6);
  assert.equal(g.data.harvested, 6); assert.equal(g.data.plots.filter(Boolean).length, 6);
  for (let i = 0; i < 100; i++) g.backgroundTick(); assert.equal(g.data.wallet, 6); assert.equal(g.data.harvested, 6);
});
check('changing flowers after a delayed tick never retroactively changes the preceding harvest plan', () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 12; });
  const expected = context(initial), actual = context(initial), a = expected.game(), b = actual.game();
  expected.setNow(BASE + 60 * MINUTE); actual.setNow(BASE + 60 * MINUTE);
  a.backgroundTick(); a.selectSeed('lull'); b.selectSeed('lull'); b.backgroundTick();
  const normalize = game => { const copy = stored(game); delete copy.ledger.revision; return copy; };
  assert.deepEqual(normalize(b), normalize(a));
});
for (const action of ['decorate', 'feed', 'gift', 'tend']) check(`${action}: delayed earnings settle before the current user transaction`, () => {
  const initial = fixture(d => { d.autoCare = true; d.wallet = 12; d.petals = 20; d.happiness = 0; d.blessings.progress = 99; d.ledger.blessingNet = 99; });
  const expected = context(initial), actual = context(initial), a = expected.game(), b = actual.game();
  expected.setNow(BASE + 60 * MINUTE); actual.setNow(BASE + 60 * MINUTE);
  const perform = game => action === 'decorate' ? game.decorate('bench') : action === 'tend' ? game.tend(0) : game[action]();
  a.backgroundTick(); perform(a); perform(b); b.backgroundTick();
  const normalize = game => { const copy = stored(game); delete copy.ledger.revision; return copy; };
  assert.deepEqual(normalize(b), normalize(a)); assert.ok(b.data.wallet >= 0);
  if (action === 'decorate') assert.equal(b.data.decorations.bench, true);
  if (action === 'feed') assert.equal(b.data.feedAt, actual.now());
  if (action === 'tend') assert.equal(b.data.harvested, 48, 'A ready-looking stale button never pays the already auto-harvested flower twice.');
});
check('completed blessing callbacks can enter another action without recursive credit or duplicate harvest', () => {
  const env = context(fixture(d => { d.autoCare = true; d.wallet = 12; d.happiness = 0; d.blessings.progress = 99; d.ledger.blessingNet = 99; }));
  let g, events = 0;
  g = env.game({ onComplete(event) { if (event.type === 'blessing') { events++; g.feed(); } } });
  env.setNow(BASE + 8 * MINUTE); g.backgroundTick();
  assert.equal(events, 1); assert.equal(g.data.blessings.count, 1); assert.equal(g.data.harvested, 6);
  assert.equal(g.data.wallet, 5); assert.equal(g.data.feedAt, env.now());
  assert.deepEqual(env.persisted(), stored(g));
});
check('longer flowers increase gross return, net return and base hourly net efficiency gently', () => {
  const env = context(), g = env.game();
  let previousGross = 0, previousNet = 0, previousHourly = 0;
  for (const [type, cost, reward] of seedCases) {
    const plot = g.newPlot(type, BASE, true), gross = g.harvestReward(plot).stars;
    const net = gross - plot.seedCost, hourly = net * 60 / seedMinutes[type];
    assert.equal(gross, reward); assert.equal(plot.seedCost, cost);
    assert.ok(gross > previousGross && net > previousNet && hourly > previousHourly);
    previousGross = gross; previousNet = net; previousHourly = hourly;
  }
  assert.equal(previousHourly, 12, 'Longest flower grows to only 12 base net stars per hour per plot.');
});
for (const [type, cost, reward] of seedCases) check(`${type}: upgrade preserves planted old return, new planting receives new return`, () => {
  const initial = fixture(d => { delete d.economy; d.wallet = 50; d.selectedSeed = type; d.plots[0] = readyPlot(type); });
  const env = context(initial), g = env.game();
  assert.equal(g.data.version, 2, 'Save stays readable by the previous version.');
  assert.equal(g.data.wallet, 50); assert.equal(g.data.economy.changedAt, BASE);
  assert.equal(g.data.plots[0].rewardStars, oldYields[type]);
  assert.equal(g.data.plots[0].seedCost, cost);
  g.tend(0); assert.equal(g.data.wallet, 50 + oldYields[type]);
  assert.equal(g.data.blessings.progress, oldYields[type] - cost);
  g.tend(0); g.tend(0);
  assert.equal(g.data.plots[0].rewardStars, reward);
  const nextReady = g.data.plots[0].readyAt; env.setNow(nextReady); g.tend(0);
  assert.equal(g.data.wallet, 50 + oldYields[type] - cost + reward);
  assert.equal(g.data.blessings.progress, oldYields[type] - cost + reward - cost);
  g.destroy(); env.setNow(nextReady + MINUTE); const reopened = env.game();
  assert.equal(reopened.data.economy.changedAt, BASE, 'Upgrade boundary never slides forward on reopening.');
  assert.equal(reopened.data.wallet, 50 + oldYields[type] - cost + reward);
});
check('pending old offline cycles use old prices; only planting after first upgraded opening uses new prices', () => {
  const initial = fixture(d => { delete d.economy; d.autoCare = true; d.wallet = 0; d.selectedSeed = 'dream';
    d.plots = Array.from({ length: 6 }, () => ({ type: 'dream', plantedAt: BASE, wateredAt: BASE, readyAt: BASE + 15 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true })); });
  const env = context(initial); env.setNow(BASE + 50 * MINUTE); const g = env.game();
  assert.equal(g.data.harvested, 18); assert.equal(g.data.ledger.grossStarlight, 72);
  assert.equal(g.data.wallet, 18); assert.equal(g.data.blessings.progress, 18);
  assert.ok(g.data.plots.every(plot => plot.rewardStars === 4));
  env.setNow(BASE + 60 * MINUTE); g.backgroundTick();
  assert.equal(g.data.harvested, 24); assert.equal(g.data.wallet, 24);
  assert.ok(g.data.plots.every(plot => plot.rewardStars === 5));
  env.setNow(BASE + 74 * MINUTE); g.backgroundTick();
  assert.equal(g.data.harvested, 30); assert.equal(g.data.wallet, 36);
  assert.equal(g.data.ledger.grossStarlight, 126); assert.equal(g.data.blessings.progress, 36);
  const snapshot = stored(g); delete snapshot.ledger.revision;
  for (let i = 0; i < 20; i++) {
    g.destroy(); const reopened = env.game(); reopened.backgroundTick();
    const actual = stored(reopened); delete actual.ledger.revision;
    assert.deepEqual(actual, snapshot); reopened.destroy();
  }
});
check('old dry flowers retain their old quote after watering and after reload', () => {
  const initial = fixture(d => { delete d.economy; d.wallet = 40;
    d.plots[0] = { type: 'lull', plantedAt: BASE, wateredAt: 0, readyAt: 0, weather: 'moon', extraWaterAt: 0, blessingEligible: true }; });
  const env = context(initial), g = env.game();
  g.tend(0); assert.equal(g.data.plots[0].rewardStars, 9);
  g.destroy(); env.setNow(BASE + 2 * MINUTE); const reopened = env.game();
  assert.equal(reopened.data.plots[0].rewardStars, 9);
  env.setNow(reopened.data.plots[0].readyAt); reopened.tend(0);
  assert.equal(reopened.data.wallet, 49); assert.equal(reopened.data.blessings.progress, 3);
});
check('upgrade does not re-credit old harvest ledger, blessings, furniture or a large saved wallet', () => {
  const initial = fixture(d => { delete d.economy; d.wallet = 1234567; d.petals = 27; d.harvested = 41; d.varieties.lull = 41;
    d.decorations.bench = true; d.decorations.lantern = true;
    d.blessings = { count: 2, progress: 38, starsGiven: 43 };
    d.ledger.grossStarlight = 777; d.ledger.blessingNet = 238; d.ledger.lastHarvestAt = BASE - MINUTE; });
  const env = context(initial), g = env.game();
  assert.equal(g.data.wallet, 1234567); assert.equal(g.data.petals, 27); assert.equal(g.data.harvested, 41);
  assert.deepEqual(stored(g).blessings, initial.blessings);
  assert.deepEqual(stored(g).decorations, initial.decorations);
  assert.equal(g.data.ledger.grossStarlight, 777); assert.equal(g.data.ledger.blessingNet, 238);
  assert.equal(g.data.ledger.lastHarvestAt, BASE - MINUTE);
  g.data.plots[0] = { ...readyPlot('moon'), ...g.quotePlot('moon', BASE) }; g.save(); g.tend(0);
  assert.equal(g.data.wallet, 1234570, 'Harvest never lowers an existing wallet to the old one-million cap.');
});
check('persisted seed cost and return determine blessing profit independently of the current seed listing', () => {
  const env = context(fixture(d => { d.wallet = 50; d.plots[0] = { ...readyPlot('lull'), seedCost: 9, rewardStars: 25 }; })), g = env.game();
  assert.equal(g.harvestReward(g.data.plots[0]).stars, 25);
  g.tend(0); assert.equal(g.data.wallet, 75); assert.equal(g.data.blessings.progress, 16);
  assert.equal(g.data.ledger.grossStarlight, 25); assert.equal(g.data.ledger.blessingNet, 16);
});
check('six long flowers can cross two blessing milestones without duplicate or lost credit', () => {
  const env = context(fixture(d => { d.wallet = 0; d.blessings.progress = 95; d.ledger.blessingNet = 95;
    d.plots = Array.from({ length: 6 }, () => ({ ...readyPlot('lull'), seedCost: 6, rewardStars: 26 })); })), g = env.game();
  for (let i = 0; i < 6; i++) g.tend(i);
  assert.equal(g.data.harvested, 6); assert.equal(g.data.ledger.grossStarlight, 156);
  assert.equal(g.data.ledger.blessingNet, 215); assert.equal(g.data.blessings.count, 2);
  assert.equal(g.data.blessings.progress, 15); assert.equal(g.data.blessings.starsGiven, 35);
  assert.equal(g.data.wallet, 121);
  g.destroy(); const reopened = env.game();
  assert.equal(reopened.data.wallet, 121); assert.equal(reopened.data.blessings.count, 2);
});
check('a full day pending at upgrade pays only historical long-flower quotes and preserves ledger arithmetic', () => {
  const initial = fixture(d => { delete d.economy; d.autoCare = true; d.wallet = 20000; d.selectedSeed = 'lull';
    d.plots = Array.from({ length: 6 }, () => ({ type: 'lull', plantedAt: BASE, wateredAt: BASE, readyAt: BASE + 100 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true })); });
  const env = context(initial); env.setNow(BASE + 24 * 60 * MINUTE); const g = env.game();
  const harvested = g.data.harvested, given = g.data.blessings.starsGiven;
  assert.ok(harvested > 60); assert.equal(g.data.ledger.grossStarlight, harvested * 9);
  assert.equal(g.data.ledger.blessingNet, harvested * 3);
  assert.equal(g.data.blessings.count, Math.floor(harvested * 3 / 100));
  assert.equal(g.data.blessings.progress, harvested * 3 % 100);
  assert.equal(g.data.wallet, 20000 + harvested * 3 - given);
  assert.ok(g.data.plots.every(plot => plot.rewardStars === 9));
});
check('two upgraded instances and repeated migration reads share one boundary without replaying old earnings', () => {
  const initial = fixture(d => { delete d.economy; d.autoCare = true; d.wallet = 0; d.selectedSeed = 'dream';
    d.plots = Array.from({ length: 6 }, () => ({ type: 'dream', plantedAt: BASE, wateredAt: BASE, readyAt: BASE + 15 * MINUTE, weather: 'moon', extraWaterAt: 0, blessingEligible: true })); });
  const first = context(initial); first.setNow(BASE + 50 * MINUTE); const a = first.game();
  const second = context(undefined, first.storage); second.setNow(BASE + 50 * MINUTE); const b = second.game();
  a.backgroundTick(); b.backgroundTick(); a.syncFromStorage();
  assert.equal(a.data.wallet, 18); assert.equal(b.data.wallet, 18);
  assert.equal(a.data.harvested, 18); assert.equal(b.data.harvested, 18);
  assert.equal(a.data.economy.changedAt, BASE + 50 * MINUTE);
  assert.equal(b.data.economy.changedAt, BASE + 50 * MINUTE);
  first.setNow(BASE + 60 * MINUTE); a.backgroundTick();
  second.setNow(BASE + 60 * MINUTE); b.backgroundTick(); a.syncFromStorage();
  assert.equal(a.data.wallet, 24); assert.equal(b.data.wallet, 24);
  assert.equal(a.data.harvested, 24); assert.equal(b.data.harvested, 24);
  assert.deepEqual(stored(a), stored(b));
});
console.log(`ALL ${checks} economic checks passed.`);
