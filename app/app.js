(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const sky = new window.NightSky($('#sky'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'mooncat-observatory-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* A private night still works without storage. */ }
  const state = {
    theme: ['violet', 'blue', 'rose'].includes(saved.theme) ? saved.theme : 'violet',
    pets: Number.isSafeInteger(saved.pets) && saved.pets >= 0 ? saved.pets : 0,
    constellation: saved.constellation === true,
    wishes: Array.isArray(saved.wishes) ? saved.wishes.filter(w => w && typeof w.text === 'string' && typeof w.id === 'string' && Number.isFinite(w.time)).slice(0,12).map(w => ({...w, text:w.text.slice(0,80)})) : []
  };
  let memoryOnly = false, toastTimer, journeyTimer, petTimer, companyTimer;
  const audio = new window.MoonAudio(); let audioPlaying = false, journeyBusy = false, activeGame = null;
  const themes = {
    violet: { name: '晚安月球', coordinate: '01 / MOONLIGHT SANCTUARY', words: '你来啦，今晚的星星分你一半。', note: '戴上耳机，让旋律陪你慢下来。' },
    blue: { name: '蓝色梦境', coordinate: '02 / BLUE HOUR DREAMS', words: '听说，蓝色的梦里会有小鱼干。', note: '这一站，让心情像蓝色的海一样轻。' },
    rose: { name: '玫瑰星云', coordinate: '03 / ROSE NEBULA', words: '这朵星云，好像草莓味的棉花糖。', note: '宇宙偷偷藏了一点粉色的浪漫。' }
  };
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { memoryOnly = true; $$('.local-note').forEach(n => n.textContent = '浏览器暂时无法保存，心愿会陪你到本次页面关闭。'); }
  }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
  }
  function selectTheme(name, announce = false) {
    state.theme = name; document.body.dataset.theme = name; sky.setTheme(name);
    $$('.destination').forEach(b => { const active = b.dataset.theme === name; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', active); });
    $('#planetCoordinates').textContent = themes[name].coordinate; $('#catWords').textContent = themes[name].words; $('#voyageNote').textContent = themes[name].note;
    $('#heroArt').style.filter = name === 'blue' ? 'hue-rotate(-24deg)' : name === 'rose' ? 'hue-rotate(24deg)' : '';
    persist(); if (announce) toast('已抵达 · ' + themes[name].name + '。月白也一起到站了。');
  }
  $$('.destination').forEach(button => button.addEventListener('click', () => selectTheme(button.dataset.theme, true)));
  function voyage() {
    if(journeyBusy) return; journeyBusy = true; const button = $('#voyageButton'); button.disabled = true; button.setAttribute('aria-busy', 'true');
    if (!audio.playing) toggleAudio(); sky.setWarp(true); document.body.classList.add('traveling'); toast('穿过星光，去一个柔软的地方。');
    journeyTimer = setTimeout(() => {
      const choices = ['violet', 'blue', 'rose']; selectTheme(choices[(choices.indexOf(state.theme) + 1) % 3], true);
      sky.setWarp(false); document.body.classList.remove('traveling'); sky.meteor(); button.disabled = false; button.removeAttribute('aria-busy'); journeyBusy = false;openDialog('gameDialog');
    }, reducedMotion.matches ? 250 : 1900);
  }
  $('#voyageButton').addEventListener('click', voyage);
  $('#meteorButton').addEventListener('click', () => { sky.meteor(); setTimeout(() => sky.meteor(), 420); toast('流星来啦。现在，可以悄悄许个愿。'); });
  const petPhrases = ['呼噜呼噜……今天也辛苦你啦。','已收到摸摸！赠你一颗猫咪心心。','我偷偷把你的烦恼，推下月球了。','不赶路的时候，也可以看看星星。','你看起来需要一只小猫。刚好，我在。','喵。这里永远有你的位置。'];
  function pet(event) {
    state.pets++; persist(); updateCollection();
    $('#catWords').textContent = petPhrases[(state.pets - 1) % petPhrases.length];
    const cat = $('#catButton'); cat.classList.remove('petted'); void cat.offsetWidth; cat.classList.add('petted'); clearTimeout(petTimer); petTimer = setTimeout(() => cat.classList.remove('petted'), 650);
    const box = cat.getBoundingClientRect(); const x = event?.clientX || box.left + box.width*.5; const y = event?.clientY || box.top + box.height*.45;
    sky.burst(x, y, '#edc7df');
    for (let i = 0; i < 6; i++) {
      const heart = document.createElement('span'); heart.className = 'pet-heart'; heart.textContent = i%2 ? '♡' : '✧';
      heart.style.left = `${x + (Math.random()-.5)*75}px`; heart.style.top = `${y + (Math.random()-.5)*40}px`; heart.style.setProperty('--drift', `${(Math.random()-.5)*120}px`); heart.style.setProperty('--rotate', `${(Math.random()-.5)*45}deg`); heart.style.animationDelay = `${i*.065}s`;
      $('#heartLayer').append(heart); setTimeout(() => heart.remove(), 2100);
    }
    audio.meow().catch(() => toast('这个浏览器暂时无法播放猫叫。'));
  }
  $('#catButton').addEventListener('click', pet);
  function updateCollection() {
    $('#petHint').textContent = state.pets ? `已收到 ${state.pets} 次摸摸，每一次都记得` : '不做什么，也是一件很好的事';
    $('#wishHint').textContent = state.wishes.length ? `已有 ${state.wishes.length} 颗心愿，在你的夜空发光` : '那些小小的愿望，星星会记得';
    $('#constellationHint').textContent = state.constellation ? '猫咪座已点亮 · 再来感受一次星光' : '把散落的星光，连成你的形状';
    $('#navStar').textContent = state.constellation ? '✦' : '02';
    renderWishSky();
  }
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (id === 'wishDialog') renderWishes();
    dialog.showModal();
    if (id === 'gameDialog') { if (activeGame) activeGame.destroy(); activeGame = new window.MoonGame($('#gameRoot'), {audio, onComplete: result => {sky.meteor();}}); }
  }
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.open)));
  $$('.close-dialog').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach(d => d.addEventListener('click', event => { if (event.target === d) { const r = d.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) d.close(); } }));
  const points = [[165,235],[140,75],[240,135],[360,135],[460,75],[435,235],[370,270],[230,270]];
  let connected = state.constellation ? 8 : 0;
  const board = $('#constellationBoard');
  points.forEach((p,i) => {
    const b = document.createElement('button'); b.className = 'constellation-node'; b.dataset.number = String(i+1).padStart(2,'0'); b.style.left = p[0]/6+'%'; b.style.top=p[1]/3.2+'%';
    b.setAttribute('aria-label', `点亮第 ${i+1} 颗星星`); b.innerHTML='<svg><use href="#i-star"/></svg>';
    b.addEventListener('click', event => {
      if (connected === 8) return;
      if(i !== connected) { $('#constellationMessage').textContent = `下一颗是 ${String(connected+1).padStart(2,'0')}，跟着暖色的星光走。`; return; }
      connected++; updateConstellation(); playChime(connected);
      if(connected === 8) { state.constellation=true; persist(); updateCollection(); sky.meteor(); }
    }); board.append(b);
  });
  function updateConstellation() {
    $$('.constellation-node').forEach((b,i) => { b.classList.toggle('lit', i<connected); b.classList.toggle('next', i===connected); b.setAttribute('aria-pressed',i<connected); });
    const path = points.slice(0,connected).map((p,i) => `${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')+(connected===8?' Z':'');
    $('#drawnPath').setAttribute('d',path); $('#starProgress').textContent=connected; board.classList.toggle('complete',connected===8);
    $('#constellationMessage').textContent=connected===8?'猫咪座亮起来了！这片星空，从此有一只属于你的小猫。':connected ? `很好！继续点亮第 ${String(connected+1).padStart(2,'0')} 颗星。`:'从 01 开始，依次触碰星星，唤醒藏在夜空里的朋友。';
  }
  $('#resetConstellation').addEventListener('click', () => { connected=0; updateConstellation(); });
  function renderWishes() {
    const list = $('#wishList'); list.replaceChildren(); $('#wishCount').textContent=state.wishes.length;
    if(!state.wishes.length) { const p=document.createElement('div');p.className='wish-empty';p.textContent='这里还没有星星，送出第一个小小的愿望吧。';list.append(p); }
    [...state.wishes].reverse().forEach(w => {
      const entry=document.createElement('div');entry.className='wish-entry'; const star=document.createElement('span');star.className='wish-entry-star';star.textContent='✦';
      const content=document.createElement('div');const p=document.createElement('p');p.textContent=w.text;const time=document.createElement('time');time.dateTime=new Date(w.time).toISOString();time.textContent=new Date(w.time).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})+' · 被宇宙好好收藏';content.append(p,time);
      const del=document.createElement('button');del.type='button';del.className='delete-wish';del.textContent='删除';del.setAttribute('aria-label','删除心愿：'+w.text);del.addEventListener('click',()=>{state.wishes=state.wishes.filter(v=>v.id!==w.id);persist();renderWishes();updateCollection();$("#wishInput").setCustomValidity("");$("#wishInput").focus();});
      entry.append(star,content,del);list.append(entry);
    });
    if(memoryOnly) $('.local-note').textContent='浏览器暂时无法保存，心愿会陪你到本次页面关闭。';
  }
  $('#wishInput').addEventListener('input',()=>{$('#wishChars').textContent=$('#wishInput').value.length;$('#wishInput').setCustomValidity('');});
  $('#wishForm').addEventListener('submit',event=>{
    event.preventDefault(); const input=$('#wishInput');const text=input.value.trim(); if(!text){input.setCustomValidity('写下一点点心愿，再交给星空吧。');input.reportValidity();return;}
    if(state.wishes.length>=12){input.setCustomValidity('星光收藏已满 12 颗，先删除一颗旧心愿吧。');input.reportValidity();return;}
    state.wishes.push({id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),text:text.slice(0,80),time:Date.now()});persist();input.value='';$('#wishChars').textContent='0';renderWishes();updateCollection();
    $('#wishDialog').close();sky.meteor();sky.burst(innerWidth*.65,innerHeight*.35,'#efc6cb');toast(memoryOnly?'心愿已化作星光，将保留到本次页面关闭。':'心愿已送达。它会在你的星光收藏里，静静发亮。');playChime(4);
  });
  function updateAudioUI() {
    audioPlaying=audio.playing; $('#soundToggle').setAttribute('aria-pressed',audioPlaying);$('#soundToggle').setAttribute('aria-label',audioPlaying?'暂停舒缓音乐':'播放舒缓音乐');
    $('#musicStatus').textContent=audio.muted?'所有声音已静音':audioPlaying?'正在播放 · 钢琴与温柔星雾':'轻触唱片，听见星空';document.body.classList.toggle('music-playing',audioPlaying);$('#companySound').textContent=audioPlaying?'暂停舒缓音乐':'开启舒缓音乐';$('#gardenMusic').setAttribute('aria-pressed',audioPlaying);$('#gardenMusic span').textContent=audio.muted?'声音已静音':audioPlaying?'暂停音乐':'播放音乐';
  }
  async function toggleAudio(){try{await audio.toggleMusic();updateAudioUI();}catch{toast('这个浏览器暂时无法播放音乐。');}}
  function playChime(step=1){audio.chime(step);}
  $('#soundToggle').addEventListener('click',toggleAudio);$('#companySound').addEventListener('click',toggleAudio);$('#gardenMusic').addEventListener('click',toggleAudio);
  $('#volumeSlider').addEventListener('input',e=>{audio.setVolume(Number(e.target.value)/100);$('#volumeValue').textContent=e.target.value+'%';});
  $('#effectsMute').addEventListener('click',()=>{const b=$('#effectsMute'),muted=b.getAttribute('aria-pressed')!=='true';audio.setMuted(muted);b.setAttribute('aria-pressed',muted);b.textContent=muted?'恢复所有声音':'静音所有声音';updateAudioUI();});
  $('#soundSettings').addEventListener('click',()=>{const panel=$('#soundPanel'),open=panel.hidden;panel.hidden=!open;$('#soundSettings').setAttribute('aria-expanded',open);});
  document.addEventListener('click',e=>{if(!e.target.closest('#soundPanel')&&!e.target.closest('#soundSettings')){$('#soundPanel').hidden=true;$('#soundSettings').setAttribute('aria-expanded',false);}});
  $('#gameDialog').addEventListener('close',()=>{if(activeGame){activeGame.destroy();activeGame=null;}});
  function renderWishSky(){const root=$('#wishSky');root.replaceChildren();state.wishes.slice(-5).forEach((w,i)=>{const b=document.createElement('button');b.className='wish-light';b.style.left=(47+i*8)+'%';b.style.top=(12+(i%3)*11)+'%';b.style.animationDelay=(-i*1.7)+'s';b.textContent='✧';b.title=w.text;b.setAttribute('aria-label','查看心愿：'+w.text);b.addEventListener('click',()=>openDialog('wishDialog'));root.append(b);});}
  $('#companyButton').addEventListener('click',()=>{
    openDialog('companyDialog');const start=Date.now();clearInterval(companyTimer);$('#breathingText').textContent=reducedMotion.matches?'慢慢呼吸，跟着你自己的节奏。':'跟着光圈，慢慢吸气。';
    if(!reducedMotion.matches)companyTimer=setInterval(()=>{$('#breathingText').textContent=(Date.now()-start)%10000<5000?'跟着光圈，慢慢吸气。':'再慢慢地，把烦恼呼出去。';},300);
  });
  $('#companyDialog').addEventListener('close',()=>clearInterval(companyTimer));
  function immersive(value){document.body.classList.toggle('immersive',value);$('#immersiveToggle').setAttribute('aria-pressed',value);$('#immersiveToggle').setAttribute('aria-label',value?'退出沉浸模式':'进入沉浸模式');document.querySelector('.header').inert=value;document.querySelector('.hero-copy').inert=value;document.querySelector('.activity-dock').inert=value;document.querySelector('footer').inert=value;if(value){window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});$('#exitImmersive').focus();if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});}else{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('#immersiveToggle').focus();}}
  $('#immersiveToggle').addEventListener('click',()=>immersive(!document.body.classList.contains('immersive')));$('#exitImmersive').addEventListener('click',()=>immersive(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$$('dialog[open]').length&&document.body.classList.contains('immersive'))immersive(false);});
  $('#homeNav').addEventListener('click',()=>{if(document.body.classList.contains('immersive'))immersive(false);window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});sky.meteor();});
  $('.brand').addEventListener('click',e=>{e.preventDefault();$('#homeNav').click();});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('immersive'))immersive(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#soundPanel').hidden=true;$('#soundSettings').setAttribute('aria-expanded',false);}});
  let pointerFrame=0;
  window.addEventListener('pointermove',e=>{if(reducedMotion.matches||e.pointerType==='touch'||pointerFrame)return;pointerFrame=requestAnimationFrame(()=>{const x=(e.clientX/innerWidth-.5),y=(e.clientY/innerHeight-.5);document.documentElement.style.setProperty('--gaze-x',x*14+'px');document.documentElement.style.setProperty('--gaze-y',y*10+'px');pointerFrame=0;});},{passive:true});
  function updateClock(){$('#localClock').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}updateClock();setInterval(updateClock,30000);
  $('#volumeSlider').value=Math.round(audio.volume*100);$('#volumeValue').textContent=Math.round(audio.volume*100)+'%';
  if(window.chrome?.webview){const compact=document.createElement('button');compact.className='icon-button';compact.title='收成桌边小花园';compact.setAttribute('aria-label','收成桌边小花园');compact.textContent='↙';compact.addEventListener('click',()=>window.chrome.webview.postMessage({type:'compact'}));document.querySelector('.header-tools').append(compact);window.chrome.webview.postMessage({type:'ready'});}
  selectTheme(state.theme);updateConstellation();updateCollection();updateAudioUI();
})();
