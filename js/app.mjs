// My City Foundry – Oberfläche: Karte zum Verschieben/Zoomen, Werkzeugleiste, Infofenster. Speichert automatisch auf dem Gerät.
import {SAVE_KEY,TOOLS,GROUPS,tool,LEVELS,MAX_LEVEL,NEEDS,TREE_CLEAR,citySize,MAP_W,MAP_H,BIZ,bizMax,BUILD,levelPop,MAX_CITY_LEVEL,TAX_MIN,TAX_MAX,TAX_DEFAULT,happyText,happyIcon,HAPPY_MIN,SECTOR,ROAD_LANES,LAND_LEVEL} from './data.mjs';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,has,hasRoad,counts,cityLevel,nextLevelPop,unlocked,demand,jobs,maxLevel,upgradeCost,attractiveness,tourism,built,canPlace,happiness,mood,finances,taxRate,covered,owns,canBuy,sectorPrice,jam,taskProgress,taskDone} from './engine.mjs';
import {draw,screenToCell,centerOn,cellTop,TW,TH} from './render.mjs';

const $=s=>document.querySelector(s);
// In der iPhone-App: Links nach außen (Impressum) über die App im Browser öffnen
const bridge=window.webkit?.messageHandlers?.cfApp;
document.addEventListener('click',e=>{const a=e.target.closest('a[target="_blank"]');if(a&&bridge){e.preventDefault();try{bridge.postMessage({action:'open',url:a.href});}catch{}}},true);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n).toLocaleString('de-DE');
let game=null,cam={x:0,y:0,z:1},cur='hand',group='hand',showDirt=false,showTraffic=false,sel=null,preview=null,showNeeds=true,canvas,ctx,W=0,Hh=0,dpr=1;

function load(){try{return restore(localStorage.getItem(SAVE_KEY));}catch{return null;}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));localStorage.setItem('my-city-foundry-at',String(Date.now()));}catch{}}
function toast(text,kind=''){const box=$('#toasts');while(box.children.length>=2)box.firstChild.remove();const t=document.createElement('div');t.className='toast '+kind;t.textContent=text;box.appendChild(t);setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3100);}

// ---------- Start ----------
function renderStart(){document.body.className='startmode';
 $('#app').innerHTML=`<main class="start"><div class="logo">🏙️</div><h1>My City Foundry</h1><p class="lead">Bau deine eigene Stadt – vom ersten Häuschen bis zum Wolkenkratzer.</p>
  <label class="field"><span>Wie soll deine Stadt heißen?</span><input id="city" maxlength="30" placeholder="z. B. Hamsterrad"></label>
  <button class="big" id="go">Stadt gründen 🏗️</button>
  <ul class="how"><li>🛣️ Straßen bauen</li><li>🏡 Wohngebiete an die Straße legen – dann ziehen Leute ein</li><li>⚡💧🌳 Strom, Wasser und Parks bringen</li><li>⬆️ Häuser ausbauen – bis zum Wolkenkratzer</li></ul>
  <p class="legal"><a href="datenschutz.html">Datenschutz</a> · <a href="https://mentaro-online.app/impressum" target="_blank" rel="noopener">Impressum</a></p></main>`;
 $('#go').onclick=()=>{const n=$('#city').value.trim();if(n.length<2){toast('Gib deiner Stadt einen Namen (mindestens 2 Buchstaben).','err');return;}
  game=newGame(Date.now(),{cityName:n});save();startCity();toast(`Willkommen in ${game.city.name}! 🎉`);};}

// ---------- Stadt ----------
function startCity(){document.body.className='citymode';
 $('#app').innerHTML=`<canvas id="map"></canvas><header class="top" id="top"></header><div id="panel" class="panel hidden"></div><div class="sub hidden" id="sub"></div><nav class="tools" id="tools"></nav>`;
 canvas=$('#map');ctx=canvas.getContext('2d');resize();cam.z=W<600?1.3:1.4;centerOn(cam,game.start.x,game.start.y+1,W,Hh);
 hud();toolbar();bindPointer();requestAnimationFrame(loop);}
// Größe immer frisch messen: In der App ist das Fenster beim Start manchmal noch klein (dann war die Karte nur ein Streifen).
function size(){const e=document.documentElement;return{w:Math.max(window.innerWidth||0,e.clientWidth||0),h:Math.max(window.innerHeight||0,e.clientHeight||0),d:Math.min(2,window.devicePixelRatio||1)};}
function resize(){const s=size();dpr=s.d;W=s.w;Hh=s.h;if(!canvas)return;canvas.width=Math.round(W*dpr);canvas.height=Math.round(Hh*dpr);canvas.style.width=W+'px';canvas.style.height=Hh+'px';}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,200));window.visualViewport?.addEventListener('resize',resize);

function hud(){const p=population(game),inc=incomePerMin(game),L=cityLevel(game),nx=nextLevelPop(game),from=levelPop(L),share=nx?Math.max(0,Math.min(1,(p-from)/(nx-from))):1,d=demand(game),h=happiness(game),done=(game.tasks||[]).filter(t=>taskDone(game,t)).length;
 const dm=(icon,v,on)=>on?`<span class="dm" title="Nachfrage"><i>${icon}</i><u><b style="width:${Math.max(0,Math.min(100,v*2))}%"></b></u></span>`:'';
 // Oben nur noch kleine Schilder in den Ecken – die Karte bekommt den ganzen Bildschirm
 $('#top').innerHTML=`<button class="chip money" data-finance><b>🪙 ${fmt(game.money)}</b><small class="${inc<0?'neg':''}">${inc>=0?'+':''}${fmt(inc)} / Min.</small>
   <span class="lv">Lv ${L} · 👥 ${fmt(p)}<span class="lvbar"><i style="width:${share*100}%"></i></span></span><span class="dems">${dm('🏡',d.house,true)}${dm('🛒',d.shop,unlocked(game,'zonec'))}${dm('🏭',d.factory,unlocked(game,'zonei'))}</span></button>
  <span class="corner"><button class="chip round happy" data-finance title="Zufriedenheit">${happyIcon(h)}<small>${h}%</small></button><button class="chip round tasksb" data-tasks title="Aufträge">📋${done?`<em>${done}</em>`:''}</button><button class="chip round" data-settings aria-label="Einstellungen">⚙️</button></span>`;}
function toolbar(){const lv=cityLevel(game);
 $('#tools').innerHTML=GROUPS.map(G=>{const ts=TOOLS.filter(t=>t.group===G.id),open=ts.some(t=>unlocked(game,t.id)),fresh=ts.filter(t=>unlocked(game,t.id)&&!built(game,t.id)&&t.lvl>1&&t.lvl>=lv-1).length;
  return`<button class="${group===G.id?'on':''} ${open?'':'locked'}" data-group="${G.id}"><span>${open?G.icon:'🔒'}</span>${G.short||G.name}${fresh?'<em>neu</em>':''}</button>`;}).join('');
 const sub=$('#sub'),ts=TOOLS.filter(t=>t.group===group);
 if(ts.length>1){sub.innerHTML=ts.map(t=>{const o=unlocked(game,t.id),done=t.once&&built(game,t.id);return`<button class="${cur===t.id?'on':''} ${o&&!done?'':'locked'}" data-tool="${t.id}"><span>${o?t.icon:'🔒'}</span>${t.name}<small>${!o?'ab Level '+t.lvl:done?'gebaut':t.id==='lanes'?'mehr Spuren':t.id==='land'?fmt(sectorPrice(game)):fmt(t.cost)+(t.size>1?` · ${t.size}×${t.size}`:'')}</small></button>`;}).join('');sub.classList.remove('hidden');}
 else sub.classList.add('hidden');}

function loop(t){if(!game||!canvas)return;{const s=size();if(s.w!==W||s.h!==Hh||s.d!==dpr)resize();}draw(ctx,game,cam,{w:W,h:Hh,dpr,sel,preview,t,showNeeds,money:game.money,dirt:showDirt||['zone','zonei','power','airport'].includes(cur),traffic:showTraffic||cur==='lanes',land:cur==='land'});requestAnimationFrame(loop);}
setInterval(()=>{if(!game||!canvas)return;const before=population(game),bj=jobs(game);game=update(game,Date.now());const p=population(game);
 if(p>before)toast('Neue Einwohner sind eingezogen! 🏡');else if(jobs(game)>bj)toast('Neue Arbeitsplätze in der Stadt! 💼');hud();levelUps();eventsModal();if(sel&&!$('#panel').dataset.modal)panel();},1000);
setInterval(()=>{if(game)save();},5000);
document.addEventListener('visibilitychange',()=>{if(game)save();});

// ---------- Bauen ----------
function anchor(x,y){const n=tool(cur)?.size||1,o=Math.floor((n-1)/2);return{x:x-o,y:y-o,n};}
function apply(x,y,quiet){if(!game)return false;if(cur==='land'){if(!quiet)landPanel(x,y);return false;}const a=anchor(x,y);if(a.n>1&&quiet)return false;const r=act(game,{type:'build',tool:cur,x:a.x,y:a.y},Date.now());
 if(r.error){if(!quiet||/Geld/.test(r.error))toast(r.error,'err');return false;}game=r.game;save();hud();if(r.message){toast(r.message,'gold');toolbar();}return true;}
function line(a,b,fn){let{x,y}=a;fn(x,y);while(x!==b.x||y!==b.y){if(x!==b.x)x+=Math.sign(b.x-x);else y+=Math.sign(b.y-y);fn(x,y);}}

// ---------- Infofenster ----------
function landPanel(x,y){const p=$('#panel');delete p.dataset.modal;const sx=Math.floor(x/SECTOR),sy=Math.floor(y/SECTOR);sel=null;
 const html=owns(game,x,y)?'<h3>🗺️ Dein Land</h3><p>Dieses Gebiet gehört dir schon.</p>':!unlocked(game,'land')?`<h3>🗺️ Fremdes Land</h3><p>Land kaufen geht ab Stadt-Level ${LAND_LEVEL}.</p>`:
  canBuy(game,sx,sy)?`<h3>🗺️ Gebiet kaufen</h3><p>16 × 16 Felder für Dörfer, Bergbau oder mehr Stadt.</p><button class="big" data-buyland="${sx},${sy}" ${game.money<sectorPrice(game)?'disabled':''}>Kaufen · ${fmt(sectorPrice(game))} Taler</button>`:
  '<h3>🗺️ Zu weit weg</h3><p>Du kannst nur Gebiete kaufen, die direkt an dein Land grenzen (gelb markiert).</p>';
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${html}`;p.classList.remove('hidden');}
function panel(){const p=$('#panel');if(!sel){p.classList.add('hidden');return;}const c=tile(game,sel.x,sel.y);if(!c){sel=null;return panel();}
 let html='';if(!owns(game,sel.x,sel.y)){landPanel(sel.x,sel.y);return;}
 if(c.t==='house'){const L=LEVELS[c.lvl],next=c.lvl<MAX_LEVEL?LEVELS[c.lvl+1]:null;
  html=`<h3>🏠 ${L.name} <em>Stufe ${c.lvl} von ${MAX_LEVEL}</em></h3><p>👥 ${L.people} Einwohner · zahlen ${L.people} Taler pro Minute</p>`;
  if(next){const need=next.need.map(n=>{const ok=has(game,sel.x,sel.y,n,next.city||1);return`<li class="${ok?'ok':'no'}">${ok?'✅':'❌'} ${NEEDS[n].icon} ${n==='city'?`Stadt-Level ${next.city}`:NEEDS[n].text}</li>`;}).join('');
   const miss=missing(game,sel.x,sel.y,c.lvl+1);
   html+=`<p><b>Ausbauen zu: ${next.name}</b> (${next.people} Einwohner)</p><ul class="needs">${need}</ul><button class="big" data-upgrade ${miss.length||game.money<next.cost?'disabled':''}>⬆️ Ausbauen · ${fmt(next.cost)} Taler</button>`;}
  else html+='<p>🏆 Höher geht es nicht – ein echter Wolkenkratzer!</p>';}

 else if(BIZ[c.t]){const B=BIZ[c.t],next=c.lvl<bizMax(c.t)?c.lvl+1:0;
  html=`<h3>${c.t==='shop'?'🛒':'🏭'} ${B.names[c.lvl]} <em>Stufe ${c.lvl} von ${bizMax(c.t)}</em></h3><p>💼 ${B.jobs[c.lvl]} Arbeitsplätze · zahlt ${B.tax[c.lvl]} Taler pro Minute</p>`;
  if(next){const need=B.need[next].map(n=>{const ok=has(game,sel.x,sel.y,n,B.city[next]||1);return`<li class="${ok?'ok':'no'}">${ok?'✅':'❌'} ${NEEDS[n].icon} ${n==='city'?`Stadt-Level ${B.city[next]}`:NEEDS[n].text}</li>`;}).join('');const miss=missing(game,sel.x,sel.y,next);
   html+=`<p><b>Ausbauen zu: ${B.names[next]}</b> (${B.jobs[next]} Arbeitsplätze)</p><ul class="needs">${need}</ul><button class="big" data-upgrade ${miss.length||game.money<B.cost[next]?'disabled':''}>⬆️ Ausbauen · ${fmt(B.cost[next])} Taler</button>`;}
  else html+='<p>🏆 Größer geht es nicht.</p>';}
 else if(c.t==='zonec'||c.t==='zonei'){const shopz=c.t==='zonec',d=demand(game)[shopz?'shop':'factory'],road=hasRoad(game,sel.x,sel.y),pw=shopz||has(game,sel.x,sel.y,'power');
  html=`<h3>${shopz?'🛒 Gewerbegebiet':'🏭 Industriegebiet'}</h3><p>${!road?'❌ Es fehlt eine Straße direkt am Grundstück.':!pw?'❌ Fabriken brauchen Strom – bau ein Kraftwerk in der Nähe.':d<=0?`⏳ Gerade werden keine weiteren ${shopz?'Läden':'Fabriken'} gebraucht. Mehr Einwohner bringen mehr Nachfrage.`:(c.ready?'🚧 Hier wird gebaut!':'Bald entsteht hier etwas.')}</p>`;}
 else if(c.t==='zone')html=`<h3>🏡 Wohngebiet</h3><p>${!hasRoad(game,sel.x,sel.y)?'❌ Es fehlt eine Straße direkt am Grundstück. Ohne Straße zieht niemand ein.':demand(game).house<=0?'⏳ Gerade zieht niemand zu – es fehlen Arbeitsplätze. Bau Läden und Fabriken!':c.ready?'🚧 Hier wird gebaut – gleich ziehen Leute ein!':'Bald ziehen Leute ein.'}</p>`;
 else if(tool(c.t)?.cost&&!['road','bulldoze'].includes(c.t)){const t=tool(c.t);html=`<h3>${t.icon} ${t.name}</h3>${t.provides?`<p>Versorgt alles im Umkreis von ${t.radius} Feldern mit ${NEEDS[t.provides].icon} ${{power:'Strom',water:'Wasser',park:'Erholung',school:'Bildung',fire:'Brandschutz',police:'Sicherheit',hospital:'Gesundheit',bus:'Busverbindungen'}[t.provides]}.</p>`:''}
  <ul class="needs">${t.jobs?`<li>💼 ${fmt(t.jobs)} Arbeitsplätze</li>`:''}${t.attr?`<li>⭐ Attraktivität ${t.attr>0?'+':''}${t.attr}</li>`:''}${t.tour?`<li>🧳 Touristen bringen ${fmt(t.tour)} Taler pro Minute</li>`:''}${t.prod?`<li>⛏️ Bergbau bringt ${fmt(t.prod)} Taler pro Minute</li>`:''}${t.dirt?`<li>🌫️ macht Dreck und Lärm im Umkreis von ${t.dirt} Feldern</li>`:''}<li>🔧 Kosten im Betrieb: ${t.upkeep||0} Taler pro Minute</li></ul>`;}
 else if(c.t==='road'){const j=jam(game,sel.x,sel.y),L=c.lanes||1,nx=ROAD_LANES[L+1];html=`<h3>🛣️ ${ROAD_LANES[L].name}</h3><p>Verkehr: <b>${j>1?'🔴 Stau':j>0.7?'🟠 viel los':'🟢 frei'}</b> (${Math.round(j*100)} % ausgelastet)</p>
  ${nx?`<p class="muted">Mit „Straße ausbauen“ wird sie zur ${nx.name}${cityLevel(game)<nx.lvl?` (ab Level ${nx.lvl})`:` (${fmt(nx.cost)} Taler pro Feld)`}.</p>`:''}<p class="muted small">Bus, U-Bahn und Bahnhof entlasten die Straßen in der Nähe.</p>`;}
 else if(c.t==='rock')html='<h3>⛰️ Fels</h3><p>Hier geht nur Bergbau (Steinbruch, Kohle-, Erz- und Goldmine) oder eine Straße.</p>';
 else if(c.t==='tree')html=`<h3>🌲 Bäume</h3><p>Hier kannst du bauen – die Bäume werden dann gefällt (+${TREE_CLEAR} Taler).</p>`;
 else if(c.t==='water')html='<h3>🌊 Wasser</h3><p>Hier kann man nicht bauen.</p>';
 else html='<h3>🌱 Wiese</h3><p>Freie Fläche zum Bauen. Wähle unten ein Werkzeug.</p>';
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${html}`;p.classList.remove('hidden');}

// ---------- Level-Aufstieg ----------
function levelUps(){const ups=game.levelUps||[];if(!ups.length||$('#panel').dataset.modal)return;const top=ups[ups.length-1],tools=ups.flatMap(u=>u.tools).map(tool),bonus=ups.reduce((a,u)=>a+u.bonus,0);
 const r=act(game,{type:'seenLevelUps'},Date.now());game=r.game;save();toolbar();sel=null;const p=$('#panel');p.dataset.modal='1';
 p.innerHTML=`<div class="lvup"><div class="big-emo">🎉</div><h3>${esc(game.city.name)} ist jetzt Level ${top.level}!</h3><p>Belohnung: <b>${fmt(bonus)} Taler</b></p>
  ${ups.some(u=>u.lanes>0)?`<p>🛤️ Neu: <b>${ups.filter(u=>u.lanes>0).map(u=>ROAD_LANES[u.lanes].name).join(', ')}</b></p>`:''}${tools.length?`<p><b>Neu freigeschaltet:</b></p><ul class="needs">${tools.map(t=>`<li>${t.icon} <b>${t.name}</b>${t.text?' – '+t.text:''}${t.size>1?` <small class="muted">(${t.size}×${t.size})</small>`:''}</li>`).join('')}</ul>`:''}
  ${top.level<MAX_CITY_LEVEL?`<p class="muted">Nächstes Level ab ${fmt(levelPop(top.level+1))} Einwohnern.</p>`:'<p><b>Höchstes Level erreicht – deine Stadt ist eine Weltstadt! 🌍</b></p>'}<button class="big" data-close>Weiter bauen</button></div>`;p.classList.remove('hidden');}

// ---------- Neue Version? (wichtig für die App: Updates kommen von der Website) ----------
async function checkUpdate(){try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const v=(await r.json()).build;
 if(v&&v!==BUILD){if(game)save();location.reload();}}catch{}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkUpdate();});
setInterval(checkUpdate,10*60*1000);

// ---------- Finger und Maus ----------
function bindPointer(){const pts=new Map();let start=null,moved=false,painting=false,last=null,pinch=null;
 const pos=e=>({x:e.clientX,y:e.clientY});
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,pos(e));
  if(pts.size===2){painting=false;const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},z:cam.z,cx:cam.x,cy:cam.y};return;}
  start={...pos(e),cx:cam.x,cy:cam.y};moved=false;last=null;
  if(cur!=='hand'){painting=true;const c=screenToCell(cam,e.clientX,e.clientY);last=c;apply(c.x,c.y,false);}});
 canvas.addEventListener('pointermove',e=>{
  if(!pts.has(e.pointerId)){if(cur!=='hand'&&e.pointerType==='mouse'){const c=screenToCell(cam,e.clientX,e.clientY),a=anchor(c.x,c.y);const t=tile(game,c.x,c.y);preview=t?{x:a.x,y:a.y,n:a.n,ok:cur==='bulldoze'?t.t!=='water'&&t.t!=='grass':cur==='road'||cur.startsWith('zone')?(t.t==='grass'||t.t==='tree'):canPlace(game,cur,a.x,a.y).ok}:null;}return;}
  pts.set(e.pointerId,pos(e));
  if(pts.size===2&&pinch){const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const z=Math.max(0.18,Math.min(2.6,pinch.z*d/pinch.d));cam.z=z;cam.x=m.x-(pinch.m.x-pinch.cx)*z/pinch.z;cam.y=m.y-(pinch.m.y-pinch.cy)*z/pinch.z;return;}
  if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;
  if(painting){const c=screenToCell(cam,e.clientX,e.clientY);if(last&&(c.x!==last.x||c.y!==last.y)){line(last,c,(x,y)=>{if(x!==last.x||y!==last.y)apply(x,y,true);});last=c;}}
  else if(moved){cam.x=start.cx+dx;cam.y=start.cy+dy;}});
 const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;
  if(pts.size===0){if(cur==='hand'&&start&&!moved){const c=screenToCell(cam,e.clientX,e.clientY);sel=tile(game,c.x,c.y)?c:null;panel();}
   if(painting)save();painting=false;start=null;}};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('pointerleave',()=>{preview=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const z=Math.max(0.18,Math.min(2.6,cam.z*(e.deltaY<0?1.12:1/1.12)));cam.x=e.clientX-(e.clientX-cam.x)*z/cam.z;cam.y=e.clientY-(e.clientY-cam.y)*z/cam.z;cam.z=z;},{passive:false});}

// ---------- Aufträge und Ereignisse ----------
function tasks(){const p=$('#panel');delete p.dataset.modal;sel=null;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>📋 Aufträge vom Bürgermeister-Büro</h3>
  <div class="tasks">${(game.tasks||[]).map(t=>{const pr=taskProgress(game,t),done=pr.have>=pr.need;return`<div class="task ${done?'done':''}"><span class="ti">${t.icon}</span><div class="tt"><b>${esc(t.text)}</b>
   <span class="lvbar wide"><i style="width:${Math.min(100,pr.have/pr.need*100)}%"></i></span><small>${fmt(Math.max(0,pr.have))} / ${fmt(pr.need)} · Belohnung ${fmt(t.reward)} Taler</small></div>
   ${done?`<button data-claim="${t.id}">Abholen</button>`:`<button class="link" data-skip="${t.id}" title="Anderen Auftrag">↻</button>`}</div>`;}).join('')}</div>
  <p class="muted small">Erledigte Aufträge bringen Taler. Mit ↻ tauschst du einen Auftrag gegen einen anderen.</p>`;p.classList.remove('hidden');}
function eventsModal(){const ev=game.events||[];if(!ev.length||$('#panel').dataset.modal||(game.levelUps||[]).length)return;const e=ev[ev.length-1];
 const r=act(game,{type:'seenEvents'},Date.now());game=r.game;save();const p=$('#panel');p.dataset.modal='1';sel=null;
 p.innerHTML=`<div class="lvup"><div class="big-emo">${e.icon}</div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><p><b>+${fmt(e.money)} Taler</b></p><button class="big" data-close>Super!</button></div>`;p.classList.remove('hidden');}

// ---------- Finanzen und Zufriedenheit ----------
function finance(){const p=$('#panel');delete p.dataset.modal;sel=null;const f=finances(game),h=happiness(game),t=taxRate(game);
 const row=(l,v,neg)=>`<li><span>${l}</span><b class="${neg||v<0?'neg':'pos'}">${neg||v<0?'−':'+'}${fmt(Math.abs(v))}</b></li>`;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>🪙 Stadtkasse</h3>
  <ul class="fin">${row('👥 Steuern der Einwohner',f.people)}${row('🛒🏭 Steuern von Läden und Fabriken',f.biz)}${row('🧳 Touristen',f.tour)}${f.mines?row('⛏️ Bergbau',f.mines):''}${row('🔧 Unterhalt (Kraftwerke, Dienste …)',f.upkeep,true)}<li class="sum"><span>pro Minute</span><b class="${f.total<0?'neg':'pos'}">${f.total>=0?'+':''}${fmt(f.total)}</b></li></ul>
  <label class="field taxf"><span>Steuersatz: <b id="taxv">${t} %</b> <small class="muted">(normal ${TAX_DEFAULT} %)</small></span><input type="range" id="tax" min="${TAX_MIN}" max="${TAX_MAX}" step="1" value="${t}"></label>
  <p class="muted small">Höhere Steuern bringen mehr Geld, machen die Bürger aber unzufrieden – dann ziehen weniger Leute her. Niedrige Steuern machen glücklich.</p>
  <h3>${happyIcon(h)} Zufriedenheit: ${h} % <em>${happyText(h)}</em></h3><span class="lvbar wide"><i style="width:${h}%;background:${h>=60?'var(--green)':h>=HAPPY_MIN?'var(--gold)':'var(--red)'}"></i></span>
  <ul class="fin">${mood(game).filter(m=>m.v).map(m=>row(m.text,m.v)).join('')||'<li>Alles im grünen Bereich.</li>'}</ul>
  <p class="muted small">Unter ${HAPPY_MIN} % wachsen keine Wohnblocks und Hochhäuser mehr.</p>
  <button class="${showDirt?'on':''} wideb" data-dirt>🌫️ Dreck und Lärm auf der Karte ${showDirt?'ausblenden':'zeigen'}</button><button class="${showTraffic?'on':''} wideb traf" data-traffic>🚗 Verkehr und Stau ${showTraffic?'ausblenden':'zeigen'}</button>`;p.classList.remove('hidden');
 $('#tax').oninput=e=>{$('#taxv').textContent=e.target.value+' %';};
 $('#tax').onchange=e=>{const r=act(game,{type:'setTax',tax:e.target.value},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();hud();finance();};}

// ---------- Einstellungen ----------
function settings(){const p=$('#panel');delete p.dataset.modal;const n=counts(game);sel=null;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>⚙️ ${esc(game.city.name)}</h3>
  <button class="wideb needsb" data-needs>${showNeeds?'💬 Sprechblasen über Häusern ausblenden':'💬 Sprechblasen über Häusern zeigen'}</button>
  <label class="field"><span>Name der Stadt</span><span class="inline"><input id="cityname" maxlength="30" value="${esc(game.city.name)}"><button data-rename>Speichern</button></span></label>
  <p>⭐ Attraktivität ${fmt(attractiveness(game))} · 🧳 Tourismus +${fmt(tourism(game))} Taler/Min. · 💼 ${fmt(jobs(game))} Arbeitsplätze</p><p class="muted">🏠 ${Object.entries(n).filter(([k])=>k.startsWith('house')).reduce((a,[,v])=>a+v,0)} Häuser · 🛣️ ${n.road||0} Straßenfelder · 🌳 ${n.park||0} Parks</p>
  <p class="links"><a href="datenschutz.html">Datenschutz</a> · <a href="https://mentaro-online.app/impressum" target="_blank" rel="noopener">Impressum</a></p>
  <button class="danger" data-reset>Neue Stadt gründen</button><p class="muted small">Version ${BUILD}</p>`;p.classList.remove('hidden');}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!game)return;const d=b.dataset;
 if(d.group){group=d.group;const ts=TOOLS.filter(t=>t.group===group);if(ts.length===1){cur=ts[0].id;if(cur!=='hand'){sel=null;panel();toast(cur==='bulldoze'?'Tippe auf etwas, das weg soll.':cur==='land'?(unlocked(game,'land')?'Tippe auf ein gelb markiertes Gebiet, um es zu kaufen.':`Land kaufen geht ab Stadt-Level ${LAND_LEVEL}.`):'Tippe oder ziehe mit dem Finger, um Straßen zu bauen.');}}else if(!ts.some(t=>t.id===cur))cur='hand';preview=null;return toolbar();}
 if(d.tool){if(!unlocked(game,d.tool)){const t=tool(d.tool);return toast(`${t.icon} ${t.name} gibt es ab Stadt-Level ${t.lvl}. Lass deine Stadt weiter wachsen!`);}cur=d.tool;preview=null;toolbar();if(cur!=='hand'){sel=null;panel();const t=tool(cur);toast(cur==='land'?'Tippe auf ein gelb markiertes Gebiet, um es zu kaufen.':cur==='lanes'?'Tippe oder ziehe über Straßen. Rot = Stau.':t.onRock?`${t.icon} ${t.name} geht nur auf Fels (graue Berge in den Außengebieten).`:t.size>1?`${t.icon} ${t.name} braucht ${t.size}×${t.size} freie Felder. Tippe auf die Mitte.`:t.once&&built(game,t.id)?`${t.name} gibt es nur einmal.`:cur==='zone'?'Lege Wohngebiete direkt an eine Straße.':cur==='zonec'?'Lege Läden an eine Straße – sie bringen Arbeitsplätze.':cur==='zonei'?'Fabriken brauchen Straße und Strom – und bringen viele Arbeitsplätze.':t.radius?`${t.name}: versorgt alles im Umkreis von ${t.radius} Feldern.`:`${t.icon} ${t.name}: Tippe auf einen freien Platz.`);}return;}
 if('close'in d){sel=null;delete $('#panel').dataset.modal;return panel();}
 if('upgrade'in d){const r=act(game,{type:'upgrade',x:sel.x,y:sel.y},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message,'gold');hud();panel();return levelUps();}
 if('needs'in d){showNeeds=!showNeeds;hud();return settings();}
 if('finance'in d)return finance();
 if('dirt'in d){showDirt=!showDirt;return finance();}
 if('settings'in d)return settings();
 if('tasks'in d)return tasks();
 if(d.claim){const r=act(game,{type:'claimTask',id:+d.claim},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message,'gold');hud();return tasks();}
 if(d.skip){const r=act(game,{type:'skipTask',id:+d.skip},Date.now());game=r.game;save();return tasks();}
 if('traffic'in d){showTraffic=!showTraffic;return finance();}
 if(d.buyland){const[sx,sy]=d.buyland.split(',').map(Number);const r=act(game,{type:'buyLand',sx,sy},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message,'gold');hud();toolbar();sel=null;return panel();}
 if('rename'in d){const r=act(game,{type:'renameCity',name:$('#cityname').value},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message);hud();return settings();}
 if('reset'in d){if(confirm(`Wirklich eine neue Stadt gründen? ${game.city.name} wird gelöscht.`)){localStorage.removeItem(SAVE_KEY);game=null;canvas=null;renderStart();}}});

game=load();if(game){game=update(game,Date.now());startCity();}else renderStart();checkUpdate();
