// My City Foundry – Oberfläche: Karte zum Verschieben/Zoomen, Werkzeugleiste, Infofenster. Speichert automatisch auf dem Gerät.
import {SAVE_KEY,TOOLS,tool,LEVELS,MAX_LEVEL,NEEDS,TREE_CLEAR,citySize,SKYSCRAPER_CITY,MAP_W,MAP_H} from './data.mjs';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,has,hasRoad,counts} from './engine.mjs';
import {draw,screenToCell,centerOn,cellTop,TW,TH} from './render.mjs';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n).toLocaleString('de-DE');
let game=null,cam={x:0,y:0,z:1},cur='hand',sel=null,preview=null,showNeeds=true,canvas,ctx,W=0,Hh=0,dpr=1;

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
 $('#app').innerHTML=`<canvas id="map"></canvas><header class="top" id="top"></header><div id="panel" class="panel hidden"></div><nav class="tools" id="tools"></nav>`;
 canvas=$('#map');ctx=canvas.getContext('2d');resize();cam.z=W<600?1.3:1.4;centerOn(cam,game.start.x,game.start.y+1,W,Hh);
 hud();toolbar();bindPointer();requestAnimationFrame(loop);}
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;Hh=window.innerHeight;if(!canvas)return;canvas.width=W*dpr;canvas.height=Hh*dpr;canvas.style.width=W+'px';canvas.style.height=Hh+'px';}
window.addEventListener('resize',()=>{resize();});

function hud(){const p=population(game),inc=incomePerMin(game);
 $('#top').innerHTML=`<div class="city"><b>${esc(game.city.name)}</b><small>${citySize(p).name} · 👥 ${fmt(p)} Einwohner</small></div>
  <div class="money"><b>🪙 ${fmt(game.money)}</b><small class="${inc<0?'neg':''}">${inc>=0?'+':''}${fmt(inc)} / Min.</small></div>
  <button class="icon" data-needs title="Wünsche anzeigen">${showNeeds?'💬':'🔕'}</button><button class="icon" data-settings aria-label="Einstellungen">⚙️</button>`;}
function toolbar(){$('#tools').innerHTML=TOOLS.map(t=>`<button class="${cur===t.id?'on':''}" data-tool="${t.id}"><span>${t.icon}</span>${t.name}${t.cost?`<small>${fmt(t.cost)}</small>`:''}</button>`).join('');}

function loop(t){if(!game||!canvas)return;draw(ctx,game,cam,{w:W,h:Hh,dpr,sel,preview,t,showNeeds,money:game.money});requestAnimationFrame(loop);}
setInterval(()=>{if(!game||!canvas)return;const before=population(game);game=update(game,Date.now());if(population(game)!==before)toast('Neue Einwohner sind eingezogen! 🏡');hud();if(sel)panel();},1000);
setInterval(()=>{if(game)save();},5000);
document.addEventListener('visibilitychange',()=>{if(game)save();});

// ---------- Bauen ----------
function apply(x,y,quiet){if(!game||x<0||y<0||x>=MAP_W||y>=MAP_H)return false;const r=act(game,{type:'build',tool:cur,x,y},Date.now());
 if(r.error){if(!quiet||/Geld/.test(r.error))toast(r.error,'err');return false;}game=r.game;hud();return true;}
function line(a,b,fn){let{x,y}=a;fn(x,y);while(x!==b.x||y!==b.y){if(x!==b.x)x+=Math.sign(b.x-x);else y+=Math.sign(b.y-y);fn(x,y);}}

// ---------- Infofenster ----------
function panel(){const p=$('#panel');if(!sel){p.classList.add('hidden');return;}const c=tile(game,sel.x,sel.y);if(!c){sel=null;return panel();}
 let html='';
 if(c.t==='house'){const L=LEVELS[c.lvl],next=c.lvl<MAX_LEVEL?LEVELS[c.lvl+1]:null;
  html=`<h3>🏠 ${L.name} <em>Stufe ${c.lvl} von ${MAX_LEVEL}</em></h3><p>👥 ${L.people} Einwohner · zahlen ${L.people} Taler pro Minute</p>`;
  if(next){const need=next.need.map(n=>{const ok=has(game,sel.x,sel.y,n);return`<li class="${ok?'ok':'no'}">${ok?'✅':'❌'} ${NEEDS[n].icon} ${NEEDS[n].text}</li>`;}).join('');
   const miss=missing(game,sel.x,sel.y,c.lvl+1);
   html+=`<p><b>Ausbauen zu: ${next.name}</b> (${next.people} Einwohner)</p><ul class="needs">${need}</ul><button class="big" data-upgrade ${miss.length||game.money<next.cost?'disabled':''}>⬆️ Ausbauen · ${fmt(next.cost)} Taler</button>`;}
  else html+='<p>🏆 Höher geht es nicht – ein echter Wolkenkratzer!</p>';}
 else if(c.t==='zone')html=`<h3>🏡 Wohngebiet</h3><p>${hasRoad(game,sel.x,sel.y)?(c.ready?'🚧 Hier wird gebaut – gleich ziehen Leute ein!':'Bald ziehen Leute ein.'):'❌ Es fehlt eine Straße direkt am Grundstück. Ohne Straße zieht niemand ein.'}</p>`;
 else if(['power','tower','park'].includes(c.t)){const t=tool(c.t);html=`<h3>${t.icon} ${t.name}</h3><p>Versorgt alle Häuser im Umkreis von ${t.radius} Feldern.</p><p class="muted">Kosten im Betrieb: ${t.upkeep} Taler pro Minute</p>`;}
 else if(c.t==='road')html='<h3>🛣️ Straße</h3><p>Häuser brauchen eine Straße direkt am Grundstück.</p>';
 else if(c.t==='tree')html=`<h3>🌲 Bäume</h3><p>Hier kannst du bauen – die Bäume werden dann gefällt (+${TREE_CLEAR} Taler).</p>`;
 else if(c.t==='water')html='<h3>🌊 Wasser</h3><p>Hier kann man nicht bauen.</p>';
 else html='<h3>🌱 Wiese</h3><p>Freie Fläche zum Bauen. Wähle unten ein Werkzeug.</p>';
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${html}`;p.classList.remove('hidden');}

// ---------- Finger und Maus ----------
function bindPointer(){const pts=new Map();let start=null,moved=false,painting=false,last=null,pinch=null;
 const pos=e=>({x:e.clientX,y:e.clientY});
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,pos(e));
  if(pts.size===2){painting=false;const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},z:cam.z,cx:cam.x,cy:cam.y};return;}
  start={...pos(e),cx:cam.x,cy:cam.y};moved=false;last=null;
  if(cur!=='hand'){painting=true;const c=screenToCell(cam,e.clientX,e.clientY);last=c;apply(c.x,c.y,false);}});
 canvas.addEventListener('pointermove',e=>{
  if(!pts.has(e.pointerId)){if(cur!=='hand'&&e.pointerType==='mouse'){const c=screenToCell(cam,e.clientX,e.clientY);const t=tile(game,c.x,c.y);preview=t?{...c,ok:t.t==='grass'||t.t==='tree'||(cur==='bulldoze'&&t.t!=='water')}:null;}return;}
  pts.set(e.pointerId,pos(e));
  if(pts.size===2&&pinch){const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const z=Math.max(0.35,Math.min(2.6,pinch.z*d/pinch.d));cam.z=z;cam.x=m.x-(pinch.m.x-pinch.cx)*z/pinch.z;cam.y=m.y-(pinch.m.y-pinch.cy)*z/pinch.z;return;}
  if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;
  if(painting){const c=screenToCell(cam,e.clientX,e.clientY);if(last&&(c.x!==last.x||c.y!==last.y)){line(last,c,(x,y)=>{if(x!==last.x||y!==last.y)apply(x,y,true);});last=c;}}
  else if(moved){cam.x=start.cx+dx;cam.y=start.cy+dy;}});
 const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;
  if(pts.size===0){if(cur==='hand'&&start&&!moved){const c=screenToCell(cam,e.clientX,e.clientY);sel=tile(game,c.x,c.y)?c:null;panel();}
   if(painting)save();painting=false;start=null;}};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('pointerleave',()=>{preview=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const z=Math.max(0.35,Math.min(2.6,cam.z*(e.deltaY<0?1.12:1/1.12)));cam.x=e.clientX-(e.clientX-cam.x)*z/cam.z;cam.y=e.clientY-(e.clientY-cam.y)*z/cam.z;cam.z=z;},{passive:false});}

// ---------- Einstellungen ----------
function settings(){const p=$('#panel');const n=counts(game);sel=null;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>⚙️ ${esc(game.city.name)}</h3>
  <label class="field"><span>Name der Stadt</span><span class="inline"><input id="cityname" maxlength="30" value="${esc(game.city.name)}"><button data-rename>Speichern</button></span></label>
  <p class="muted">🏠 ${Object.entries(n).filter(([k])=>k.startsWith('house')).reduce((a,[,v])=>a+v,0)} Häuser · 🛣️ ${n.road||0} Straßenfelder · ⚡ ${n.power||0} · 💧 ${n.tower||0} · 🌳 ${n.park||0}</p>
  <p class="links"><a href="datenschutz.html">Datenschutz</a> · <a href="https://mentaro-online.app/impressum" target="_blank" rel="noopener">Impressum</a></p>
  <button class="danger" data-reset>Neue Stadt gründen</button>`;p.classList.remove('hidden');}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!game)return;const d=b.dataset;
 if(d.tool){cur=d.tool;preview=null;toolbar();if(cur!=='hand'){sel=null;panel();const t=tool(cur);toast(cur==='bulldoze'?'Tippe auf etwas, das weg soll.':cur==='road'?'Tippe oder ziehe mit dem Finger, um Straßen zu bauen.':cur==='zone'?'Lege Wohngebiete direkt an eine Straße.':`${t.name}: versorgt alles im Umkreis von ${t.radius} Feldern.`);}return;}
 if('close'in d){sel=null;return panel();}
 if('upgrade'in d){const r=act(game,{type:'upgrade',x:sel.x,y:sel.y},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message,'gold');hud();return panel();}
 if('needs'in d){showNeeds=!showNeeds;return hud();}
 if('settings'in d)return settings();
 if('rename'in d){const r=act(game,{type:'renameCity',name:$('#cityname').value},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message);hud();return settings();}
 if('reset'in d){if(confirm(`Wirklich eine neue Stadt gründen? ${game.city.name} wird gelöscht.`)){localStorage.removeItem(SAVE_KEY);game=null;canvas=null;renderStart();}}});

game=load();if(game){game=update(game,Date.now());startCity();}else renderStart();
