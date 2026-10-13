(() => {
  'use strict';
  const $=s=>document.querySelector(s), native=Boolean(window.chrome?.webview);
  const audio=new window.MoonAudio();
  let saved={};try{saved=JSON.parse(localStorage.getItem('mooncat-observatory-v1')||'{}')||{};}catch(_){}
  const theme=['violet','blue','rose'].includes(saved.theme)?saved.theme:'violet';document.body.dataset.theme=theme;audio.setTheme?.(theme);
  const game=new window.MoonGame($('#widgetGarden'),{audio,widget:true,autoCare:true,onComplete:result=>{if(result.type==='harvest')toast('花开啦，收到了 '+result.starlight+' ✦');if(result.type==='blessing')toast('Winesun 为你送来'+(result.count>1?result.count+' 次':'一次')+'祝福。'+result.starlight+' 星光化成了小小的好运。');}});
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let toastTimer,petTimer,pinned=true,roaming=false,backgroundTimer=null;
  const heartTimers=new Set();
  function host(type){if(native){window.chrome.webview.postMessage({type});return;}if(type==='expand')location.href='index.html';else if(type==='hide')toast('花园最小化到任务栏，小猫继续陪着你。');else if(type==='pin'){pinned=!pinned;updatePin();}}
  function toast(text){clearTimeout(toastTimer);$('#widgetToast').textContent=text;$('#widgetToast').classList.add('visible');toastTimer=setTimeout(()=>$('#widgetToast').classList.remove('visible'),3000);}
  function updatePin(){$('#pinButton').setAttribute('aria-pressed',pinned);$('#pinButton').setAttribute('aria-label',pinned?'取消置顶':'置顶花园');}
  function audioUI(){$('#widgetMusic').setAttribute('aria-pressed',audio.playing);$('#widgetMusic').setAttribute('aria-label',audio.playing?'暂停音乐':'播放音乐');$('#widgetMusic').title=(audio.playing?'暂停':'播放')+' · '+(audio.track?.title||'音乐');}
  function refresh(){const wallet=Number(game.data?.wallet)||0;$('#widgetWallet').textContent=wallet.toLocaleString('zh-CN');const auto=Boolean(game.autocare);$('#autocareButton').setAttribute('aria-pressed',auto);$('#autocareText').textContent=auto?'托管中':'手动';$('#autocareButton').title=auto?'Winesun正在自动照料，点击接手':'手动照料中，点击交给Winesun';$('#widgetMood').textContent=auto?'你忙吧，Winesun在这里':'花开有自己的时间';$('#widgetWeather').textContent=(game.ui?.weather?.textContent||'月夜').split(' · ')[0];const blessings=Number(game.data?.blessings?.count)||0,progress=Number(game.data?.blessings?.progress)||0;const label='♡ 祝福 '+blessings.toLocaleString('zh-CN')+' 次';if($('#widgetBlessings').textContent!==label)$('#widgetBlessings').textContent=label;$('#widgetBlessings').title='Winesun 已为你送来 '+blessings+' 次祝福。每累计新赚到 100 星光，将余额的 20% 化成祝福；当前进度 '+progress+'/100。';$('#widgetStatus').textContent=game.ui?.live?.textContent||'Winesun会陪你等花开。';}
  function setRoaming(value){roaming=Boolean(value);clearInterval(backgroundTimer);backgroundTimer=null;if(roaming){game.pause();backgroundTimer=setInterval(()=>{game.backgroundTick();refresh();},2000);}else game.resume();}
  $('#autocareButton').addEventListener('click',()=>{game.setAutocare(!game.autocare);refresh();toast(game.autocare?'花田交给Winesun，你忙自己的就好。':'花田交给你。点击空地，种一点喜欢的花。');});
  const management=document.createElement('section');management.className='widget-management';management.hidden=true;management.setAttribute('aria-label','打理花园');
  management.innerHTML='<div class="management-top"><div><span>打理花园</span><small>选好花种，回花田播种</small></div><button type="button" aria-label="回到花田">×</button></div><div class="management-tabs" role="tablist" aria-label="花园物品"><button id="seedTab" type="button" role="tab" aria-selected="true" aria-controls="seedPanel">花种</button><button id="decorTab" type="button" role="tab" aria-selected="false" aria-controls="decorPanel">小物</button></div><div id="seedPanel" role="tabpanel" aria-labelledby="seedTab"></div><div id="decorPanel" role="tabpanel" aria-labelledby="decorTab" hidden></div>';
  const seedPanel=management.querySelector('#seedPanel'),decorPanel=management.querySelector('#decorPanel');
  for(const selector of ['.mg-seeds']){const node=game.el.querySelector(selector);if(node)seedPanel.append(node);}
  for(const selector of ['.mg-shop-title','.mg-shop']){const node=game.el.querySelector(selector);if(node)decorPanel.append(node);}
  const statusNode=game.el.querySelector('.mg-status-row');if(statusNode)management.append(statusNode);
  const note=document.createElement('p');note.className='management-note';note.textContent='选花种 → 点空地播种 → 再点一次浇水。';seedPanel.append(note);game.el.append(management);
  function manage(value){management.hidden=!value;$('.widget-shell').classList.toggle('management-open',value);$('#manageButton').setAttribute('aria-expanded',value);for(const node of [$('.widget-header'),$('.window-tools'),$('.widget-actions')])node.inert=value;for(const b of game.plotButtons)b.inert=value;if(value)management.querySelector('.management-top button').focus();else $('#manageButton').focus();}
  $('#manageButton').addEventListener('click',()=>manage(management.hidden));management.querySelector('.management-top button').addEventListener('click',()=>manage(false));
  function tab(name){const seed=name==='seed';seedPanel.hidden=!seed;decorPanel.hidden=seed;management.querySelector('#seedTab').setAttribute('aria-selected',seed);management.querySelector('#decorTab').setAttribute('aria-selected',!seed);}
  management.querySelector('#seedTab').addEventListener('click',()=>tab('seed'));management.querySelector('#decorTab').addEventListener('click',()=>tab('decor'));
  management.addEventListener('click',event=>{if(event.target.closest('[data-garden-action="seed"]')){queueMicrotask(()=>{if(game.autocare)game.setAutocare(false);manage(false);refresh();});}});
  management.querySelector('.management-tabs').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const seed=event.key==='ArrowLeft';tab(seed?'seed':'decor');management.querySelector(seed?'#seedTab':'#decorTab').focus();}});
  $('#widgetMusic').addEventListener('click',async()=>{await audio.toggleMusic();audioUI();});
  $('#widgetPet').addEventListener('click',event=>{audio.meow().catch(()=>{});const b=event.currentTarget;b.classList.remove('petted');void b.offsetWidth;b.classList.add('petted');clearTimeout(petTimer);petTimer=setTimeout(()=>b.classList.remove('petted'),600);
    if(!motion.matches){const r=b.getBoundingClientRect();for(let i=0;i<3;i++){const h=document.createElement('span');h.className='widget-heart';h.textContent=i%2?'♡':'✧';h.style.left=(r.left+r.width*.5+(Math.random()-.5)*30)+'px';h.style.top=(r.top+r.height*.5)+'px';h.style.animationDelay=i*.05+'s';$('#widgetHearts').append(h);const timer=setTimeout(()=>{heartTimers.delete(timer);h.remove();},1500);heartTimers.add(timer);}}
  });
  $('#pinButton').addEventListener('click',()=>host('pin'));$('#hideButton').addEventListener('click',()=>host('hide'));$('#expandButton').addEventListener('click',()=>host('expand'));
  $('#dragHandle').addEventListener('pointerdown',event=>{if(event.button===0&&!event.target.closest('button'))host('drag');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!management.hidden)manage(false);if(event.key==='Tab'&&!management.hidden){const buttons=[...management.querySelectorAll('button:not([disabled])')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  window.addEventListener('musicchange',audioUI);
  window.chrome?.webview?.addEventListener('message',async event=>{const d=event.data;if(d?.type==='window-state'){pinned=Boolean(d.pinned);updatePin();setRoaming(d.mode==='cat'||Boolean(d.minimized));if(d.musicResumeAllowed){try{await audio.resumeSavedMusic?.();}catch(_){}}audioUI();}if(d?.type==='pin-state'){pinned=Boolean(d.value);updatePin();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!roaming){game.resume();refresh();}});
  refresh();audioUI();const refreshTimer=setInterval(refresh,1000);
  if(native){window.chrome.webview.postMessage({type:'ready'});window.chrome.webview.postMessage({type:'motion-preference',reduced:motion.matches});}
  window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);clearInterval(backgroundTimer);clearTimeout(toastTimer);clearTimeout(petTimer);for(const id of heartTimers)clearTimeout(id);game.destroy();audio.destroy();});
})();
