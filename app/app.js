(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const sky = new window.NightSky($('#sky'));
  const audio = new window.MoonAudio();
  const native = Boolean(window.chrome?.webview);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'mooncat-observatory-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) {}
  const themes = {
    violet: {coordinate:'01 / MOONLIGHT SANCTUARY', words:'你来啦，今晚的星星分你一半。'},
    blue: {coordinate:'02 / BLUE HOUR DREAMS', words:'在蓝色的梦里，慢慢漂一会儿。'},
    rose: {coordinate:'03 / ROSE NEBULA', words:'这朵星云，好像草莓味的棉花糖。'}
  };
  const state = {theme: Object.hasOwn(themes, saved.theme) ? saved.theme : 'violet', pets: Number.isSafeInteger(saved.pets) && saved.pets >= 0 ? saved.pets : 0,
    wishes: Array.isArray(saved.wishes) ? saved.wishes.filter(w => w && typeof w.text === 'string' && typeof w.id === 'string' && Number.isFinite(w.time)).slice(0,12).map(w => ({...w,text:w.text.slice(0,80)})) : []};
  let memoryOnly=false, toastTimer, petTimer, travelTimer, travelBusy=false, pointerFrame=0, startupHandled=false, activeGarden=null, gardenBackgroundTimer=null;
  const cleanupTimers = new Set();
  function later(fn,ms){const id=setTimeout(()=>{cleanupTimers.delete(id);fn();},ms);cleanupTimers.add(id);return id;}
  function persist(){try{localStorage.setItem(key,JSON.stringify(state));}catch(_){memoryOnly=true;$('.local-note').textContent='本次暂时无法保存，心愿会陪你到软件关闭。';}}
  function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
  function updateAudio(){const playing=audio.playing,track=audio.track;
    document.body.classList.toggle('music-playing',playing&&!audio.muted);
    $('#soundToggle').setAttribute('aria-pressed',playing);$('#soundToggle').setAttribute('aria-label',playing?'暂停音乐':'播放音乐');
    $('#trackTitle').textContent=track?.title||'月光来信';$('#trackDescription').textContent=track?.mood||'月光钢琴 · 慢慢入夜';
    $('#musicStatus').textContent=audio.muted?'所有声音已静音':playing?'让旋律陪你待一会':'音乐已暂停';
    $('#volumeSlider').value=Math.round(audio.volume*100);$('#volumeValue').textContent=Math.round(audio.volume*100)+'%';
    $('#effectsMute').setAttribute('aria-pressed',audio.muted);$('#effectsMute').textContent=audio.muted?'恢复所有声音':'静音所有声音';
    $('#modalMusic').setAttribute('aria-pressed',playing);$('#modalMusic span').textContent=playing?'暂停音乐':'播放音乐';
  }
  function selectTheme(name){if(!Object.hasOwn(themes,name))return;state.theme=name;document.body.dataset.theme=name;sky.setTheme(name);audio.setTheme?.(name);
    $$('.destination').forEach(b=>{const active=b.dataset.theme===name;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});
    $('#planetCoordinates').textContent=themes[name].coordinate;$('#catWords').textContent=themes[name].words;persist();updateAudio();
  }
  $$('.destination').forEach(button=>button.addEventListener('click',()=>selectTheme(button.dataset.theme)));
  function depart(){if(travelBusy)return;travelBusy=true;$('#voyageButton').disabled=true;document.body.classList.add('departing');sky.setWarp(true);audio.chime?.(2);
    travelTimer=setTimeout(()=>{if(native)window.chrome.webview.postMessage({type:'compact'});else location.href='widget.html';sky.setWarp(false);document.body.classList.remove('departing');$('#voyageButton').disabled=false;travelBusy=false;},motion.matches?0:520);
  }
  $('#voyageButton').addEventListener('click',depart);$$('[data-action="depart"]').forEach(b=>b.addEventListener('click',depart));
  $('#meteorButton').addEventListener('click',()=>{sky.meteor();later(()=>sky.meteor(),420);});
  const phrases=['呼噜呼噜……今天也辛苦你啦。','摸摸收到了。再陪你一会儿。','不赶路的时候，也可以看看星星。','喵。这里永远有你的位置。'];
  $('#catButton').addEventListener('click',event=>{state.pets++;persist();$('#catWords').textContent=phrases[(state.pets-1)%phrases.length];const cat=$('#catButton');cat.classList.remove('petted');void cat.offsetWidth;cat.classList.add('petted');clearTimeout(petTimer);petTimer=setTimeout(()=>cat.classList.remove('petted'),650);
    const r=cat.getBoundingClientRect(),x=event.clientX||r.left+r.width*.5,y=event.clientY||r.top+r.height*.45;sky.burst(x,y,'#e0c89f');
    if(!motion.matches)for(let i=0;i<4;i++){const h=document.createElement('span');h.className='pet-heart';h.textContent=i%2?'♡':'✧';h.style.left=(x+(Math.random()-.5)*55)+'px';h.style.top=y+'px';h.style.setProperty('--drift',(Math.random()-.5)*90+'px');h.style.animationDelay=i*.06+'s';$('#heartLayer').append(h);later(()=>h.remove(),1800);}
    audio.meow().catch(()=>{});
  });
  function renderWishSky(){const root=$('#wishSky');root.replaceChildren();state.wishes.slice(-5).forEach((w,i)=>{const b=document.createElement('button');b.className='wish-light';b.style.left=(48+i*7)+'%';b.style.top=(9+i%3*11)+'%';b.style.animationDelay=(-i*1.7)+'s';b.textContent='✧';b.title=w.text;b.setAttribute('aria-label','查看心愿：'+w.text);b.addEventListener('click',()=>openWishes());root.append(b);});}
  function renderWishes(){const root=$('#wishList');root.replaceChildren();$('#wishCount').textContent=state.wishes.length;
    if(!state.wishes.length){const p=document.createElement('p');p.className='wish-empty';p.textContent='这里还没有星星，寄来第一个小小的愿望吧。';root.append(p);}
    [...state.wishes].reverse().forEach(w=>{const entry=document.createElement('div');entry.className='wish-entry';const mark=document.createElement('span');mark.textContent='✦';const content=document.createElement('div'),p=document.createElement('p'),time=document.createElement('time');p.textContent=w.text;time.dateTime=new Date(w.time).toISOString();time.textContent=new Date(w.time).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});content.append(p,time);const del=document.createElement('button');del.className='delete-wish';del.textContent='删除';del.setAttribute('aria-label','删除心愿：'+w.text);del.addEventListener('click',()=>{state.wishes=state.wishes.filter(v=>v.id!==w.id);persist();renderWishes();renderWishSky();$('#wishInput').setCustomValidity('');});entry.append(mark,content,del);root.append(entry);});
  }
  function openWishes(){renderWishes();$('#wishDialog').showModal();}
  $$('[data-open="wishDialog"]').forEach(b=>b.addEventListener('click',openWishes));
  function closeDialog(dialog){if(dialog.id==='gameDialog')closeGarden();dialog.close();}
  $$('.close-dialog').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('dialog'))));
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}}));
  function gardenCounter(){const count=Number(activeGarden?.data?.blessings?.count)||0;$('#modalBlessings').textContent='Winesun 已为你送来 '+count.toLocaleString('zh-CN')+' 次祝福';}
  function closeGarden(){clearInterval(gardenBackgroundTimer);gardenBackgroundTimer=null;if(activeGarden){activeGarden.destroy();activeGarden=null;}$('#gameRoot').replaceChildren();}
  function openGarden(){const dialog=$('#gameDialog');if(dialog.open)return;dialog.showModal();closeGarden();activeGarden=new window.MoonGame($('#gameRoot'),{audio,autoCare:false,onComplete:()=>gardenCounter()});
    const panel=document.createElement('aside');panel.className='game-panel';panel.innerHTML='<div class="garden-tabs" role="tablist" aria-label="花园物品"><button type="button" role="tab" aria-selected="true" aria-controls="modalSeedPanel" id="modalSeedTab">花种</button><button type="button" role="tab" aria-selected="false" aria-controls="modalDecorPanel" id="modalDecorTab">小物</button></div><div id="modalSeedPanel" role="tabpanel" aria-labelledby="modalSeedTab"></div><div id="modalDecorPanel" role="tabpanel" aria-labelledby="modalDecorTab" hidden></div>';
    panel.querySelector('#modalSeedPanel').append(activeGarden.el.querySelector('.mg-seeds'));for(const selector of ['.mg-shop-title','.mg-shop'])panel.querySelector('#modalDecorPanel').append(activeGarden.el.querySelector(selector));activeGarden.el.append(panel);
    function category(seed){panel.querySelector('#modalSeedPanel').hidden=!seed;panel.querySelector('#modalDecorPanel').hidden=seed;panel.querySelector('#modalSeedTab').setAttribute('aria-selected',seed);panel.querySelector('#modalDecorTab').setAttribute('aria-selected',!seed);}
    panel.querySelector('#modalSeedTab').addEventListener('click',()=>category(true));panel.querySelector('#modalDecorTab').addEventListener('click',()=>category(false));panel.querySelector('.garden-tabs').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const seed=e.key==='ArrowLeft';category(seed);panel.querySelector(seed?'#modalSeedTab':'#modalDecorTab').focus();}});
    panel.addEventListener('click',e=>{if(e.target.closest('[data-garden-action="seed"]'))queueMicrotask(()=>{if(activeGarden?.autocare)activeGarden.setAutocare(false);});});gardenCounter();activeGarden.resize();
  }
  $$('[data-open="gameDialog"]').forEach(button=>button.addEventListener('click',openGarden));$('#gameDialog').addEventListener('close',()=>{if(!$('#gameDialog').open)closeGarden();});
  $('#wishInput').addEventListener('input',()=>{$('#wishChars').textContent=$('#wishInput').value.length;$('#wishInput').setCustomValidity('');});
  $('#wishForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#wishInput'),text=input.value.trim();if(!text){input.setCustomValidity('写下一点心愿，再交给星空吧。');input.reportValidity();return;}if(state.wishes.length>=12){input.setCustomValidity('先删除一颗旧心愿，给新的星星留一点位置。');input.reportValidity();return;}state.wishes.push({id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),text:text.slice(0,80),time:Date.now()});persist();input.value='';$('#wishChars').textContent='0';renderWishSky();$('#wishDialog').close();sky.meteor();audio.chime?.(4);toast(memoryOnly?'心愿已化成星光，暂时保存在这里。':'已寄给星空。愿它慢慢变成真的。');});
  $('#soundToggle').addEventListener('click',async()=>{try{await audio.toggleMusic();updateAudio();}catch(_){toast('声音暂时没能开启。');}});
  $('#modalMusic').addEventListener('click',async()=>{await audio.toggleMusic();updateAudio();});
  $('#volumeSlider').addEventListener('input',e=>{audio.setVolume(Number(e.target.value)/100);updateAudio();});
  $('#effectsMute').addEventListener('click',()=>{audio.setMuted(!audio.muted);updateAudio();});
  $('#soundSettings').addEventListener('click',()=>{const panel=$('#soundPanel');panel.hidden=!panel.hidden;$('#soundSettings').setAttribute('aria-expanded',!panel.hidden);});
  document.addEventListener('click',e=>{if(!e.target.closest('#soundSettings')&&!e.target.closest('#soundPanel')){$('#soundPanel').hidden=true;$('#soundSettings').setAttribute('aria-expanded',false);}});
  async function toggleFullscreen(){if(native){window.chrome.webview.postMessage({type:'toggle-fullscreen'});return;}try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){}}
  $('#fullscreenToggle').addEventListener('click',toggleFullscreen);
  $('#homeHide').addEventListener('click',()=>{if(native)window.chrome.webview.postMessage({type:'hide'});else toast('桌面程序会最小化到任务栏。');});
  $('.brand').addEventListener('click',e=>{e.preventDefault();sky.meteor();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#soundPanel').hidden=true;$('#soundSettings').setAttribute('aria-expanded',false);}});
  window.addEventListener('pointermove',e=>{if(motion.matches||e.pointerType==='touch'||pointerFrame)return;pointerFrame=requestAnimationFrame(()=>{document.documentElement.style.setProperty('--gaze-x',(e.clientX/innerWidth-.5)*10+'px');document.documentElement.style.setProperty('--gaze-y',(e.clientY/innerHeight-.5)*8+'px');pointerFrame=0;});},{passive:true});
  function clock(){$('#localClock').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}clock();const clockTimer=setInterval(clock,30000);
  window.addEventListener('musicchange',updateAudio);
  window.chrome?.webview?.addEventListener('message',async event=>{const d=event.data;if(d?.type==='window-state'){
    $('#fullscreenToggle').setAttribute('aria-label',d.fullscreen?'退出全屏':'进入全屏');$('#fullscreenToggle').title=d.fullscreen?'退出全屏 · Esc':'进入全屏';
    try{if(d.autoplay&&d.startup&&!startupHandled){startupHandled=true;await audio.playMusic?.({fadeIn:5});}else if(d.musicResumeAllowed)await audio.resumeSavedMusic?.();}catch(_){}updateAudio();
    if(activeGarden){clearInterval(gardenBackgroundTimer);gardenBackgroundTimer=null;if(d.minimized){activeGarden.pause();gardenBackgroundTimer=setInterval(()=>{activeGarden?.backgroundTick();gardenCounter();},2000);}else activeGarden.resume();}
  }});
  selectTheme(state.theme);renderWishSky();updateAudio();
  if(native){window.chrome.webview.postMessage({type:'ready'});window.chrome.webview.postMessage({type:'motion-preference',reduced:motion.matches});}
  window.addEventListener('pagehide',()=>{closeGarden();clearTimeout(travelTimer);clearTimeout(toastTimer);clearTimeout(petTimer);clearInterval(clockTimer);for(const id of cleanupTimers)clearTimeout(id);if(pointerFrame)cancelAnimationFrame(pointerFrame);sky.destroy();audio.destroy();});
})();
