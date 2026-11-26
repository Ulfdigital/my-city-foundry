// My City Foundry – Oberfläche: Karte zum Verschieben/Zoomen, Werkzeugleiste, Infofenster. Speichert automatisch auf dem Gerät.
import {SAVE_KEY,TOOLS,GROUPS,tool,LEVELS,MAX_LEVEL,NEEDS,TREE_CLEAR,citySize,MAP_W,MAP_H,BIZ,bizMax,BUILD,levelPop,MAX_CITY_LEVEL,TAX_MIN,TAX_MAX,TAX_DEFAULT,happyText,happyIcon,HAPPY_MIN,SECTOR,ROAD_LANES,LAND_LEVEL,FEATURES,GOODS,NEIGHBORS,TRADE_PRICE,LOCAL_PRICE,WANTED_BONUS} from './data.mjs';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,has,hasRoad,counts,cityLevel,nextLevelPop,unlocked,demand,jobs,maxLevel,upgradeCost,attractiveness,tourism,built,canPlace,happiness,mood,finances,taxRate,covered,owns,canBuy,nextTo,sectorPrice,jam,taskProgress,taskDone,features,trade,wanted,nextWantedChange,ACHIEVEMENTS,shopNeededHere} from './engine.mjs';
import {draw,screenToCell,screenToPoint,pinTo,centerOn,cellTop,setRotation,getRotation,TW,TH,dayNight,season,weather,SEASONS,WEATHER} from './render.mjs';
import {sfx,unlock,settings as audio,saveSettings,startMusic,stopMusic,setMusicMood} from './sound.mjs';

const $=s=>document.querySelector(s);
// In der iPhone-App: Links nach außen (Impressum) über die App im Browser öffnen
const bridge=window.webkit?.messageHandlers?.cfApp;
document.addEventListener('click',e=>{const a=e.target.closest('a[target="_blank"]');if(a&&bridge){e.preventDefault();try{bridge.postMessage({action:'open',url:a.href});}catch{}}},true);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n).toLocaleString('de-DE');
const ROT_KEY='my-city-foundry-rotation';   // Drehung der Karte (nur dieses Gerät)
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
  game=newGame(Date.now(),{cityName:n});game.tut={step:0,base:{...game.stats}};save();startCity();toast(`Willkommen in ${game.city.name}! 🎉`);};}

// ---------- Stadt ----------
function startCity(){document.body.className='citymode';
 $('#app').innerHTML=`<canvas id="map"></canvas><header class="top" id="top"></header><div id="panel" class="panel hidden"></div><div class="fab" id="fab"></div><div class="sub hidden" id="sub"></div><nav class="tools" id="tools"></nav>`;
 canvas=$('#map');ctx=canvas.getContext('2d');resize();try{setRotation(+localStorage.getItem(ROT_KEY)||0);}catch{}cam.z=W<600?1.3:1.4;centerOn(cam,game.start.x,game.start.y+1,W,Hh);
 hud();toolbar();fab();bindPointer();requestAnimationFrame(loop);tutShow();}
// Größe immer frisch messen: In der App ist das Fenster beim Start manchmal noch klein (dann war die Karte nur ein Streifen).
function size(){const e=document.documentElement;return{w:Math.max(window.innerWidth||0,e.clientWidth||0),h:Math.max(window.innerHeight||0,e.clientHeight||0),d:Math.min(2,window.devicePixelRatio||1)};}
function resize(){const s=size();dpr=s.d;W=s.w;Hh=s.h;if(!canvas)return;canvas.width=Math.round(W*dpr);canvas.height=Math.round(Hh*dpr);canvas.style.width=W+'px';canvas.style.height=Hh+'px';}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,200));window.visualViewport?.addEventListener('resize',resize);

function hud(){const p=population(game),inc=incomePerMin(game),L=cityLevel(game),nx=nextLevelPop(game),from=levelPop(L),share=nx?Math.max(0,Math.min(1,(p-from)/(nx-from))):1,d=demand(game),h=happiness(game),done=(game.tasks||[]).filter(t=>taskDone(game,t)).length;
 const dm=(icon,v,on)=>on?`<span class="dm" title="Nachfrage"><i>${icon}</i><u><b style="width:${Math.max(0,Math.min(100,v*2))}%"></b></u></span>`:'';
 // Oben nur noch kleine Schilder in den Ecken – die Karte bekommt den ganzen Bildschirm
 $('#top').innerHTML=`<button class="chip money" data-finance><b>${game.crest?crestSvg(game.crest,22):''}🪙 ${fmt(game.money)}</b><small class="${inc<0?'neg':''}">${inc>=0?'+':''}${fmt(inc)} / Min.</small>
   <span class="lv">Lv ${L} · 👥 ${fmt(p)}<span class="lvbar"><i style="width:${share*100}%"></i></span></span><span class="dems">${dm('🏡',d.house,true)}${dm('🛒',d.shop,unlocked(game,'zonec'))}${dm('🏭',d.factory,unlocked(game,'zonei'))}</span></button>
  <span class="corner"><button class="chip round sky" data-sky title="Wetter">${envIcon()}</button><button class="chip round happy" data-finance title="Zufriedenheit">${happyIcon(h)}<small>${h}%</small></button><button class="chip round tasksb" data-tasks title="Aufträge">📋${done?`<em>${done}</em>`:''}</button><button class="chip round" data-settings aria-label="Einstellungen">⚙️</button></span>`;}
// Jede Stadt beginnt am Morgen; während der Einführung scheint immer die Sonne
const clock=now=>dayNight(now-(game?.createdAt||0)+0.03*20*60*1000);
const sky=now=>game?.tut&&!game.tut.done?'sun':weather(now);
// ---------- Stadtwappen ----------
const CREST_COLORS=['#c0392b','#2f6fb0','#27ae60','#f1c40f','#ffffff','#2d3436','#8e44ad','#e67e22'];
const CREST_SYMS=['🏰','🦁','🦅','🐻','🐎','🌳','⚓','⭐','🗝️','⚔️','🌾','🍀','🐟','🔥','🌙','👑'];
const CREST_SHAPES=['M4 4h56v26c0 16-12 26-28 30C16 56 4 46 4 30z','M4 4h56v30c0 14-14 22-28 26C18 56 4 48 4 34z','M32 2 60 12v18c0 16-12 26-28 32C16 56 4 46 4 30V12z'];
function crestSvg(c,size=28){c=c||{shape:0,c1:'#2f6fb0',c2:'#f1c40f',sym:'🏰',split:1};const id='cr'+Math.random().toString(36).slice(2,7),d=CREST_SHAPES[c.shape||0];
 const split=c.split===1?`<rect x="32" y="0" width="32" height="64" fill="${c.c2}"/>`:c.split===2?`<rect x="0" y="32" width="64" height="32" fill="${c.c2}"/>`:'';
 return`<svg class="crest" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="64" height="64" fill="${c.c1}"/>${split}</g><path d="${d}" fill="none" stroke="#2d2a22" stroke-width="3"/><text x="32" y="40" text-anchor="middle" font-size="24">${c.sym}</text></svg>`;}
let crestDraft=null;
function crestPanel(){const p=$('#panel');delete p.dataset.modal;sel=null;const c=crestDraft||(crestDraft={...(game.crest||{shape:0,c1:'#2f6fb0',c2:'#f1c40f',sym:'🏰',split:1})});
 const sw=(k)=>CREST_COLORS.map(col=>`<button class="sw ${c[k]===col?'on':''}" style="background:${col}" data-crcol="${k}:${col}"></button>`).join('');
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>🛡️ Wappen von ${esc(game.city.name)}</h3><div class="crestprev">${crestSvg(c,110)}</div>
  <p class="lab">Form</p><div class="opts">${CREST_SHAPES.map((_,i)=>`<button class="${c.shape===i?'on':''}" data-crshape="${i}">${crestSvg({...c,shape:i},34)}</button>`).join('')}</div>
  <p class="lab">Teilung</p><div class="opts">${['einfarbig','senkrecht','waagerecht'].map((t,i)=>`<button class="${c.split===i?'on':''}" data-crsplit="${i}">${t}</button>`).join('')}</div>
  <p class="lab">Farbe 1</p><div class="opts">${sw('c1')}</div><p class="lab">Farbe 2</p><div class="opts">${sw('c2')}</div>
  <p class="lab">Zeichen</p><div class="opts syms">${CREST_SYMS.map(y=>`<button class="${c.sym===y?'on':''}" data-crsym="${y}">${y}</button>`).join('')}</div>
  <button class="big" data-crsave>Wappen speichern</button>`;p.classList.remove('hidden');}

// ---------- Spielstand sichern und übertragen ----------
const b64=buf=>{const a=new Uint8Array(buf);let s='';for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s);};
const unb64=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
async function exportCode(){const json=JSON.stringify(game);if('CompressionStream'in window){const st=new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));return'MCF1:'+b64(await new Response(st).arrayBuffer());}
 return'MCF0:'+btoa(unescape(encodeURIComponent(json)));}
async function importCode(code){code=String(code||'').trim().replace(/\s+/g,'');let json;
 if(code.startsWith('MCF1:')){const st=new Blob([unb64(code.slice(5))]).stream().pipeThrough(new DecompressionStream('gzip'));json=await new Response(st).text();}
 else if(code.startsWith('MCF0:'))json=decodeURIComponent(escape(atob(code.slice(5))));else throw new Error('Das ist kein gültiger Spielstand-Code.');
 const g=restore(json);if(!g)throw new Error('Der Spielstand konnte nicht gelesen werden.');return g;}
let lastCode='';
function savePanel(){const p=$('#panel');delete p.dataset.modal;sel=null;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>💾 Spielstand sichern</h3>
  <p>Deine Stadt ist auf diesem Gerät gespeichert. Für ein neues iPhone oder als Sicherheit kannst du sie als <b>Code</b> sichern – zum Beispiel in den Notizen, per Nachricht oder per AirDrop.</p>
  <button class="big" data-exp>📋 Code kopieren</button>${navigator.share?'<button class="wideb" data-share>📤 Code teilen (Notizen, AirDrop …)</button>':''}
  <h3 style="margin-top:14px">📥 Spielstand laden</h3><p class="muted small">Code hier einfügen. Achtung: Die Stadt auf diesem Gerät wird dabei ersetzt.</p>
  <textarea id="impcode" rows="3" placeholder="MCF1:…"></textarea><button class="wideb" data-imp>Spielstand laden</button>`;p.classList.remove('hidden');}

// Karte drehen: um die Bildschirmmitte, in 90°-Schritten; die Drehung merkt sich das Gerät (nicht im Spielstand)
// Karte um eine Vierteldrehung drehen; die Stelle am Punkt (sx, sy) bleibt genau dort
function rotate(k,sx=W/2,sy=Hh/2){const p=screenToPoint(cam,sx,sy);setRotation(getRotation()+k);try{localStorage.setItem(ROT_KEY,String(getRotation()));}catch{}pinTo(cam,p,sx,sy);}
const TURN_STEP=40*Math.PI/180;   // so weit die Finger drehen → Karte dreht eine Vierteldrehung weiter
function fab(){const f=$('#fab');if(f)f.innerHTML=`<button data-mini title="Übersichtskarte" aria-label="Übersichtskarte">🧭</button>${undoStack.length?'<button data-undo title="Rückgängig" aria-label="Rückgängig">↩️</button>':''}`;}
function envIcon(){const now=Date.now(),dn=clock(now),w=sky(now);return`${audio.daynight&&dn.night>0.5?'🌙':WEATHER[w].icon}<small>${SEASONS[season(now)].icon}</small>`;}
function toolbar(){setTimeout(()=>{const S=TUT[game?.tut?.step];if(game?.tut&&!game.tut.done&&S?.group)document.querySelector(`[data-group="${S.group}"]`)?.classList.add('pulse');},0);const lv=cityLevel(game);
 $('#tools').innerHTML=GROUPS.map(G=>{const ts=TOOLS.filter(t=>t.group===G.id),open=ts.some(t=>unlocked(game,t.id)),fresh=ts.filter(t=>unlocked(game,t.id)&&!built(game,t.id)&&t.lvl>1&&t.lvl>=lv-1).length;
  return`<button class="${group===G.id?'on':''} ${open?'':'locked'}" data-group="${G.id}"><span>${open?G.icon:'🔒'}</span>${G.short||G.name}${fresh?'<em>neu</em>':''}</button>`;}).join('');
 const sub=$('#sub'),ts=TOOLS.filter(t=>t.group===group);
 if(ts.length>1){sub.innerHTML=ts.map(t=>{const o=unlocked(game,t.id),done=t.once&&built(game,t.id);return`<button class="${cur===t.id?'on':''} ${o&&!done?'':'locked'}" data-tool="${t.id}"><span>${o?t.icon:'🔒'}</span>${t.name}<small>${!o?'ab Level '+t.lvl:done?'gebaut':t.id==='lanes'?'mehr Spuren':t.id==='land'?fmt(sectorPrice(game)):fmt(t.cost)+(t.size>1?` · ${t.size}×${t.size}`:'')}</small></button>`;}).join('');sub.classList.remove('hidden');}
 else sub.classList.add('hidden');}

function loop(t){if(!game||!canvas)return;{const s=size();if(s.w!==W||s.h!==Hh||s.d!==dpr)resize();}const now=Date.now(),dn=audio.daynight?clock(now):{night:0,dusk:false};draw(ctx,game,cam,{env:{night:dn.night,dusk:dn.dusk,season:season(now),weather:sky(now)},w:W,h:Hh,dpr,sel,preview,t,showNeeds,money:game.money,dirt:showDirt||['zone','zonei','power','airport'].includes(cur),traffic:showTraffic||cur==='lanes',land:cur==='land',ghost:['road','lanes','rail'].includes(cur)});requestAnimationFrame(loop);}
setInterval(()=>{if(!game||!canvas)return;const before=population(game),bj=jobs(game);game=update(game,Date.now());const p=population(game);
 if(p>before)toast('Neue Einwohner sind eingezogen! 🏡');else if(jobs(game)>bj)toast('Neue Arbeitsplätze in der Stadt! 💼');hud();levelUps();eventsModal();achvToasts();tutCheck();setMusicMood(audio.daynight&&clock(Date.now()).night>0.5);if(sel&&!$('#panel').dataset.modal)panel();},1000);
setInterval(()=>{if(game)save();},5000);
document.addEventListener('visibilitychange',()=>{if(game)save();});

// ---------- Bauen ----------
function anchor(x,y){const n=tool(cur)?.size||1,o=Math.floor((n-1)/2);return{x:x-o,y:y-o,n};}
// ---------- Mini-Karte: ganze Welt auf einen Blick, Tippen springt dorthin ----------
const MINI_COL={grass:'#86c56a',tree:'#3f8a3a',water:'#4fa3d8',rock:'#9c9a94',road:'#55585e',rail:'#8e887d',zone:'#bfe3a8',zonec:'#bcd6f0',zonei:'#ecdf9c',shop:'#3d7fd1',factory:'#d4a017',park:'#5fb04a'};
function miniColor(c){if(c.t==='house')return['','#f2c4a8','#e9a27f','#d9805e','#c0604a','#a04a6a','#7a3a8a','#4a2a9a'][c.lvl];return MINI_COL[c.t]||(tool(c.t)?.onRock?'#6d6a62':'#d64545');}
function miniPanel(){const p=$('#panel');delete p.dataset.modal;sel=null;const S=2,Wm=MAP_W*S,Hm=MAP_H*S/2+2;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>🧭 Übersichtskarte</h3><p class="muted small">Tippe auf eine Stelle, um dorthin zu springen. Der gelbe Punkt zeigt, wo du gerade bist.</p><canvas id="mini" width="${Wm*2}" height="${Hm*2}"></canvas>`;p.classList.remove('hidden');
 const cv=$('#mini'),c2=cv.getContext('2d');c2.scale(2,2);
 for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const c=game.tiles[y*MAP_W+x];c2.fillStyle=miniColor(c);const px=(x-y)*S/2+Wm/2,py=(x+y)*S/4;c2.fillRect(px-S/2,py,S,S/2+0.5);
  if(!owns(game,x,y)){c2.fillStyle='rgba(20,30,20,.35)';c2.fillRect(px-S/2,py,S,S/2+0.5);}}
 const here=screenToCell(cam,W/2,Hh/2),hx=(here.x-here.y)*S/2+Wm/2,hy=(here.x+here.y)*S/4;c2.fillStyle='#ffd23f';c2.strokeStyle='#1f2a36';c2.lineWidth=1;c2.beginPath();c2.arc(hx,hy,4,0,7);c2.fill();c2.stroke();
 cv.onclick=e=>{const r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*Wm,my=(e.clientY-r.top)/r.height*Hm,u=(mx-Wm/2)/(S/2),v=my/(S/4),x=Math.round((v+u)/2),y=Math.round((v-u)/2);
  centerOn(cam,Math.max(0,Math.min(MAP_W-1,x)),Math.max(0,Math.min(MAP_H-1,y)),W,Hh);p.classList.add('hidden');sfx('click');};}

// ---------- Rückgängig ----------
let undoStack=[],stroke=null;
function remember(prev){undoStack.push(prev);if(undoStack.length>15)undoStack.shift();fab();}
function undo(){if(!undoStack.length)return toast('Es gibt nichts mehr rückgängig zu machen.');game=update(undoStack.pop(),Date.now());save();sel=null;panel();hud();toolbar();fab();sfx('click');toast('↩️ Rückgängig gemacht');}
function apply(x,y,quiet){if(!game)return false;const prev=game;if(cur==='land'){if(!quiet)landPanel(x,y);return false;}const a=anchor(x,y);if(a.n>1&&quiet)return false;const r=act(game,{type:'build',tool:cur,x:a.x,y:a.y},Date.now());
 if(r.error){if(!quiet||/Geld/.test(r.error)){toast(r.error,'err');sfx('error');}return false;}if(stroke){if(!stroke.pushed){remember(stroke.prev);stroke.pushed=true;}}else remember(prev);game=r.game;save();hud();sfx(cur==='bulldoze'?'bulldoze':cur==='road'||cur==='lanes'||cur==='rail'?'road':'build');if(r.message){toast(r.message,'gold');toolbar();}tutCheck();return true;}
function line(a,b,fn){let{x,y}=a;fn(x,y);while(x!==b.x||y!==b.y){if(x!==b.x)x+=Math.sign(b.x-x);else y+=Math.sign(b.y-y);fn(x,y);}}

// ---------- Infofenster ----------
function landPanel(x,y){const p=$('#panel');delete p.dataset.modal;const sx=Math.floor(x/SECTOR),sy=Math.floor(y/SECTOR);sel=null;const fs=features(game,sx,sy);
 const feat=fs.length?`<ul class="needs">${fs.map(k=>`<li>${FEATURES[k].icon} <b>${FEATURES[k].name}</b> – ${FEATURES[k].text}</li>`).join('')}</ul>`:'<p class="muted">Keine Besonderheiten – Platz für Stadt oder Dorf.</p>';
 const html=owns(game,x,y)?`<h3>🗺️ Dein Land</h3><p>Dieses Gebiet gehört dir schon.</p>${feat}`:!unlocked(game,'land')?`<h3>🗺️ Fremdes Land</h3><p>Land kaufen geht ab Stadt-Level ${LAND_LEVEL}.</p>`:
  `<h3>🗺️ Gebiet kaufen</h3><p>16 × 16 Felder für Dörfer, Bergbau oder mehr Stadt.${nextTo(game,sx,sy)?'':' Es liegt nicht direkt an deinem Land – darum kostet es etwas mehr. Bauen kannst du dort trotzdem, z. B. einen Ölbohrturm.'}</p>${feat}<button class="big" data-buyland="${sx},${sy}" ${game.money<sectorPrice(game,sx,sy)?'disabled':''}>Kaufen · ${fmt(sectorPrice(game,sx,sy))} Taler</button>`;
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
  html=`<h3>${shopz?'🛒 Gewerbegebiet':'🏭 Industriegebiet'}</h3><p>${!road?'❌ Es fehlt eine Straße direkt am Grundstück.':!pw?'❌ Fabriken brauchen Strom – bau ein Kraftwerk in der Nähe.':d<=0&&!(shopz&&shopNeededHere(game,sel.x,sel.y))?`⏳ Gerade werden keine weiteren ${shopz?'Läden':'Fabriken'} gebraucht. Mehr Einwohner bringen mehr Nachfrage.${shopz?' Stehen hier in der Nähe Häuser ohne Laden, entsteht trotzdem einer.':''}`:(c.ready?'🚧 Hier wird gebaut!':'Bald entsteht hier etwas.')}</p>`;}
 else if(c.t==='zone')html=`<h3>🏡 Wohngebiet</h3><p>${!hasRoad(game,sel.x,sel.y)?'❌ Es fehlt eine Straße direkt am Grundstück. Ohne Straße zieht niemand ein.':demand(game).house<=0?'⏳ Gerade zieht niemand zu – es fehlen Arbeitsplätze. Bau Läden und Fabriken!':c.ready?'🚧 Hier wird gebaut – gleich ziehen Leute ein!':'Bald ziehen Leute ein.'}</p>`;
 else if(c.t==='rail')html=(c.bridge?'<h3>🌉 Eisenbahnbrücke</h3>':c.rock?'<h3>⛰️ Eisenbahntunnel</h3>':'<h3>🚆 Schiene</h3>')+'<p>Verbinde damit Bahnhöfe. Ein Zug fährt dann von Bahnhof zu Bahnhof und wieder zurück. Gibt es nur einen Bahnhof, fährt er bis zum Ende der Strecke.</p><p class="muted small">Die Gleise kommen an den beiden schmalen Enden des Bahnhofs an. Über eine einspurige Straße entsteht ein Bahnübergang.</p>';
 else if(tool(c.t)?.cost&&!['road','bulldoze'].includes(c.t)){const t=tool(c.t);html=`<h3>${t.icon} ${t.name}</h3>${t.provides?`<p>Versorgt alles im Umkreis von ${t.radius} Feldern mit ${NEEDS[t.provides].icon} ${{power:'Strom',water:'Wasser',park:'Erholung',school:'Bildung',fire:'Brandschutz',police:'Sicherheit',hospital:'Gesundheit',bus:'Busverbindungen'}[t.provides]}.</p>`:''}
  <ul class="needs">${t.jobs?`<li>💼 ${fmt(t.jobs)} Arbeitsplätze</li>`:''}${t.attr?`<li>⭐ Attraktivität ${t.attr>0?'+':''}${t.attr}</li>`:''}${t.tour?`<li>🧳 Touristen bringen ${fmt(t.tour)} Taler pro Minute</li>`:''}${t.prod?`<li>⛏️ fördert ${fmt(t.prod)} ${GOODS[t.good]?.name||'Rohstoffe'} pro Minute</li>`:''}${t.cap?`<li>🚚 transportiert ${fmt(t.cap)} Waren pro Minute zu den Nachbarstädten</li>`:''}${t.dirt?`<li>🌫️ macht Dreck und Lärm im Umkreis von ${t.dirt} Feldern</li>`:''}<li>🔧 Kosten im Betrieb: ${t.upkeep||0} Taler pro Minute</li></ul>`;}
 else if(c.t==='road'){const j=jam(game,sel.x,sel.y),L=c.lanes||1,nx=ROAD_LANES[L+1];html=`<h3>🛣️ ${ROAD_LANES[L].name}</h3><p>Verkehr: <b>${j>1?'🔴 Stau':j>0.7?'🟠 viel los':'🟢 frei'}</b> (${Math.round(j*100)} % ausgelastet)</p>
  ${nx?`<p class="muted">Mit „Straße ausbauen“ wird sie zur ${nx.name}${cityLevel(game)<nx.lvl?` (ab Level ${nx.lvl})`:` (${fmt(nx.cost)} Taler pro Feld)`}.</p>`:''}${c.bridge?'<p>🌉 Brücke über das Wasser.</p>':''}${c.rock?'<p>⛰️ Tunnel durch den Berg.</p>':''}${c.rail?'<p>🚆 Hier kreuzt eine Bahnstrecke (Bahnübergang).</p>':''}<p class="muted small">Bus, U-Bahn und Bahnhof entlasten die Straßen in der Nähe.</p>`;}
 else if(c.t==='rock')html='<h3>⛰️ Fels</h3><p>Hier geht nur Bergbau (Steinbruch, Kohle-, Erz- und Goldmine) oder eine Straße.</p>';
 else if(c.t==='tree')html=`<h3>🌲 Bäume</h3><p>Hier kannst du bauen – die Bäume werden dann gefällt (+${TREE_CLEAR} Taler).</p>`;
 else if(c.t==='water')html='<h3>🌊 Wasser</h3><p>Hier kann man nicht bauen.</p>';
 else html='<h3>🌱 Wiese</h3><p>Freie Fläche zum Bauen. Wähle unten ein Werkzeug.</p>';
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${html}`;p.classList.remove('hidden');}

// ---------- Level-Aufstieg ----------
function levelUps(){const ups=game.levelUps||[];if(!ups.length||$('#panel').dataset.modal)return;sfx('level');const top=ups[ups.length-1],tools=ups.flatMap(u=>u.tools).map(tool),bonus=ups.reduce((a,u)=>a+u.bonus,0);
 const r=act(game,{type:'seenLevelUps'},Date.now());game=r.game;save();toolbar();sel=null;const p=$('#panel');p.dataset.modal='1';
 p.innerHTML=`<div class="lvup"><div class="big-emo">🎉</div><h3>${esc(game.city.name)} ist jetzt Level ${top.level}!</h3><p>Belohnung: <b>${fmt(bonus)} Taler</b></p>
  ${ups.some(u=>u.lanes>0)?`<p>🛤️ Neu: <b>${ups.filter(u=>u.lanes>0).map(u=>ROAD_LANES[u.lanes].name).join(', ')}</b></p>`:''}${tools.length?`<p><b>Neu freigeschaltet:</b></p><ul class="needs">${tools.map(t=>`<li>${t.icon} <b>${t.name}</b>${t.text?' – '+t.text:''}${t.size>1?` <small class="muted">(${t.size}×${t.size})</small>`:''}</li>`).join('')}</ul>`:''}
  ${top.level<MAX_CITY_LEVEL?`<p class="muted">Nächstes Level ab ${fmt(levelPop(top.level+1))} Einwohnern.</p>`:'<p><b>Höchstes Level erreicht – deine Stadt ist eine Weltstadt! 🌍</b></p>'}<button class="big" data-close>Weiter bauen</button></div>`;p.classList.remove('hidden');}

// ---------- Neue Version? (wichtig für die App: Updates kommen von der Website) ----------
async function checkUpdate(){try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const v=(await r.json()).build;
 if(v&&v!==BUILD){try{if(sessionStorage.getItem('reload-'+v))return;sessionStorage.setItem('reload-'+v,'1');}catch{}if(game)save();location.reload();}}catch{}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkUpdate();});
setInterval(checkUpdate,10*60*1000);

// ---------- Finger und Maus ----------
function bindPointer(){const pts=new Map();let start=null,moved=false,painting=false,last=null,pinch=null;
 const pos=e=>({x:e.clientX,y:e.clientY});
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,pos(e));
  if(pts.size===2){painting=false;const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},ang:Math.atan2(b.y-a.y,b.x-a.x),turn:0};moved=true;return;}
  start={...pos(e),cx:cam.x,cy:cam.y};moved=false;last=null;
  if(cur!=='hand'){painting=true;stroke={prev:game,pushed:false};const c=screenToCell(cam,e.clientX,e.clientY);last=c;apply(c.x,c.y,false);}});
 canvas.addEventListener('pointermove',e=>{
  if(!pts.has(e.pointerId)){if(cur!=='hand'&&e.pointerType==='mouse'){const c=screenToCell(cam,e.clientX,e.clientY),a=anchor(c.x,c.y);const t=tile(game,c.x,c.y);preview=t?{x:a.x,y:a.y,n:a.n,ok:cur==='bulldoze'?t.t!=='water'&&t.t!=='grass':cur==='rail'?(['grass','tree','rock','water'].includes(t.t)||(t.t==='road'&&(t.lanes||1)===1)):cur==='road'?['grass','tree','rock','water','rail'].includes(t.t):cur.startsWith('zone')?(t.t==='grass'||t.t==='tree'):canPlace(game,cur,a.x,a.y).ok}:null;}return;}
  pts.set(e.pointerId,pos(e));
  if(pts.size===2&&pinch){const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},ang=Math.atan2(b.y-a.y,b.x-a.x);
   // Verschieben und Zoomen: die Stelle zwischen den Fingern wandert mit den Fingern
   const p=screenToPoint(cam,pinch.m.x,pinch.m.y);cam.z=Math.max(0.18,Math.min(2.6,cam.z*d/pinch.d));pinTo(cam,p,m.x,m.y);
   // Drehen: Fingerdrehung aufsummieren; je 40° dreht die Karte eine Vierteldrehung weiter – um die Stelle zwischen den Fingern.
   // Die Karte kippt dabei nicht schief und springt beim Loslassen nicht zurück.
   let da=ang-pinch.ang;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;pinch.turn+=da;
   if(Math.abs(pinch.turn)>=TURN_STEP){rotate(pinch.turn>0?1:-1,m.x,m.y);pinch.turn=0;try{navigator.vibrate?.(15);}catch{}}
   pinch.d=d;pinch.m=m;pinch.ang=ang;return;}
  if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;
  if(painting){const c=screenToCell(cam,e.clientX,e.clientY);if(last&&(c.x!==last.x||c.y!==last.y)){line(last,c,(x,y)=>{if(x!==last.x||y!==last.y)apply(x,y,true);});last=c;}}
  else if(moved){cam.x=start.cx+dx;cam.y=start.cy+dy;}});
 const end=e=>{pts.delete(e.pointerId);if(pts.size<2&&pinch){pinch=null;if(pts.size===1){const q=[...pts.values()][0];start={...q,cx:cam.x,cy:cam.y};moved=true;}}
  if(pts.size===0){if(cur==='hand'&&start&&!moved){const c=screenToCell(cam,e.clientX,e.clientY);sel=tile(game,c.x,c.y)?c:null;panel();}
   if(painting)save();painting=false;stroke=null;start=null;}};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('pointerleave',()=>{preview=null;});
 addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea'))return;if(e.key==='q'||e.key==='Q')rotate(-1);if(e.key==='e'||e.key==='E')rotate(1);});   // Computer: Q/E drehen
 canvas.addEventListener('wheel',e=>{e.preventDefault();const z=Math.max(0.18,Math.min(2.6,cam.z*(e.deltaY<0?1.12:1/1.12)));cam.x=e.clientX-(e.clientX-cam.x)*z/cam.z;cam.y=e.clientY-(e.clientY-cam.y)*z/cam.z;cam.z=z;},{passive:false});}

// ---------- Erfolge ----------
function achvToasts(){const ids=game.newAchv||[];if(!ids.length)return;for(const id of ids){const a=ACHIEVEMENTS.find(x=>x.id===id);if(a)toast(`🏅 Erfolg: ${a.icon} ${a.name}${a.reward?` · +${fmt(a.reward)} Taler`:''}`,'gold');}
 sfx('level');const r=act(game,{type:'seenAchv'},Date.now());game=r.game;save();}
let taskTab='tasks';
function achvView(){const got=Object.keys(game.achv||{}).length;
 return`<p class="muted small">${got} von ${ACHIEVEMENTS.length} Erfolgen geschafft</p><div class="medals">${ACHIEVEMENTS.map(a=>{const ok=!!game.achv?.[a.id];
  return`<div class="medal ${ok?'ok':''}"><span>${ok?a.icon:'🔒'}</span><b>${a.name}</b><small>${a.text}${a.reward?`<br>${ok?'✓ ':''}${fmt(a.reward)} Taler`:''}</small></div>`;}).join('')}</div>`;}

// ---------- Einführung für neue Spieler ----------
const TUT=[
 {text:'👋 Willkommen, Bürgermeisterin oder Bürgermeister! Ich zeige dir in ein paar Schritten, wie du deine Stadt baust.',btn:'Los geht’s'},
 {text:'🛣️ Tippe unten auf <b>Straße</b> und zieh mit dem Finger eine Straße – mindestens 5 Felder.',group:'road',done:(g,b)=>(g.stats.road||0)-(b.road||0)>=5},
 {text:'🏡 Tippe auf <b>Zonen</b> → <b>Wohnen</b> und leg 3 Wohngebiete direkt an die Straße.',group:'zones',done:(g,b)=>(g.stats.zone||0)-(b.zone||0)>=3},
 {text:'🚧 Super! Gleich ziehen Leute ein. Warte einen kleinen Moment …',done:(g,b)=>(g.stats.built_house||0)-(b.built_house||0)>=2},
 {text:'⬆️ Tippe unten auf <b>Info</b> und dann auf ein Haus. Mit <b>Ausbauen</b> wird es größer und mehr Leute wohnen dort.',group:'hand',done:(g,b)=>(g.stats.upgrade||0)-(b.upgrade||0)>=1},
 {text:'⚡ Mit mehr Einwohnern steigst du im Level auf und bekommst neue Gebäude – zum Beispiel Läden, Kraftwerk und Fabriken. Sprechblasen über den Häusern zeigen, was fehlt.',btn:'Verstanden'},
 {text:'🪙 Oben links ist deine Stadtkasse (antippen für Steuern und Handel). Rechts siehst du 😊 Zufriedenheit und 📋 Aufträge mit Belohnungen. Viel Spaß – hier sind 1.000 Taler Startgeld obendrauf!',btn:'Fertig 🎉',last:true}];
function tutShow(){let b=$('#tut');const T=game?.tut;document.querySelectorAll('.pulse').forEach(e=>e.classList.remove('pulse'));
 document.body.classList.toggle('hastut',!!(T&&!T.done&&T.step<TUT.length));if(!T||T.done||T.step>=TUT.length){b?.remove();return;}const S=TUT[T.step];if(!b){b=document.createElement('div');b.id='tut';document.body.appendChild(b);}
 b.innerHTML=`<div class="tstep">Einführung ${T.step+1}/${TUT.length}</div><p>${S.text}</p><div class="tbtn">${S.btn?`<button data-tutnext>${S.btn}</button>`:''}<button class="link" data-tutskip>Überspringen</button></div>`;
 if(S.group)document.querySelector(`[data-group="${S.group}"]`)?.classList.add('pulse');}
function tutAdvance(){const T=game.tut;if(TUT[T.step]?.last){game.money+=1000;game.tut={done:true};save();sfx('coin');hud();toast('🎓 Einführung geschafft! +1.000 Taler','gold');return tutShow();}
 game.tut={step:T.step+1,base:{...game.stats}};save();sfx('click');tutShow();}
function tutCheck(){const T=game?.tut;if(!T||T.done)return;const S=TUT[T.step];if(S?.done&&S.done(game,T.base||{})){sfx('coin');tutAdvance();}}

// ---------- Aufträge und Ereignisse ----------
function tasks(){const p=$('#panel');delete p.dataset.modal;sel=null;
 const tabs=`<div class="tabs"><button class="${taskTab==='tasks'?'on':''}" data-ttab="tasks">📋 Aufträge</button><button class="${taskTab==='achv'?'on':''}" data-ttab="achv">🏅 Erfolge ${Object.keys(game.achv||{}).length}/${ACHIEVEMENTS.length}</button></div>`;
 if(taskTab==='achv'){p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${tabs}${achvView()}`;p.classList.remove('hidden');return;}
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button>${tabs}<h3>📋 Aufträge vom Bürgermeister-Büro</h3>
  <div class="tasks">${(game.tasks||[]).map(t=>{const pr=taskProgress(game,t),done=pr.have>=pr.need;return`<div class="task ${done?'done':''}"><span class="ti">${t.icon}</span><div class="tt"><b>${esc(t.text)}</b>
   <span class="lvbar wide"><i style="width:${Math.min(100,pr.have/pr.need*100)}%"></i></span><small>${fmt(Math.max(0,pr.have))} / ${fmt(pr.need)} · Belohnung ${fmt(t.reward)} Taler</small></div>
   ${done?`<button data-claim="${t.id}">Abholen</button>`:`<button class="link" data-skip="${t.id}" title="Anderen Auftrag">↻</button>`}</div>`;}).join('')}</div>
  <p class="muted small">Erledigte Aufträge bringen Taler. Mit ↻ tauschst du einen Auftrag gegen einen anderen.</p>`;p.classList.remove('hidden');}
function eventsModal(){const ev=game.events||[];if(!ev.length||$('#panel').dataset.modal||(game.levelUps||[]).length)return;sfx('event');const e=ev[ev.length-1];
 const r=act(game,{type:'seenEvents'},Date.now());game=r.game;save();const p=$('#panel');p.dataset.modal='1';sel=null;
 p.innerHTML=`<div class="lvup"><div class="big-emo">${e.icon}</div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><p><b>+${fmt(e.money)} Taler</b></p><button class="big" data-close>Super!</button></div>`;p.classList.remove('hidden');}

// ---------- Handel ----------
function tradePanel(){const p=$('#panel');delete p.dataset.modal;sel=null;const tr=trade(game,Date.now()),w=wanted(Date.now()),mins=Math.max(1,Math.ceil((nextWantedChange(Date.now())-Date.now())/6e4));
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>🚚 Handel mit Nachbarstädten</h3>
  <div class="nbs">${NEIGHBORS.map(n=>`<div class="nb">${n.icon}<b>${n.name}</b><small>sucht ${GOODS[w[n.id]].icon} ${GOODS[w[n.id]].name}</small></div>`).join('')}</div>
  <p class="muted small">Gesuchte Waren bringen +${Math.round((WANTED_BONUS-1)*100)} %. Die Wünsche wechseln in ${mins} Min.</p>
  ${tr.list.length?`<ul class="fin">${tr.list.map(l=>`<li><span>${GOODS[l.id].icon} ${GOODS[l.id].name}${l.wanted?' ⭐':''} <small class="muted">${fmt(l.units)}/Min.</small></span><b class="pos">+${fmt(l.revenue)}</b></li>`).join('')}</ul>`:'<p>Noch keine Waren. Fabriken stellen Waren her, Minen und Ölbohrtürme Rohstoffe.</p>'}
  <p><b>Transport:</b> ${fmt(tr.used)} von ${fmt(tr.units)} Einheiten pro Minute gehen an die Nachbarn.</p><span class="lvbar wide"><i style="width:${tr.units?Math.min(100,tr.cap/tr.units*100):0}%"></i></span>
  <p class="muted small">Was nicht transportiert wird, verkauft deine Stadt selbst – aber nur für ${Math.round(LOCAL_PRICE*100)} %. Über die Nachbarn bekommst du ${Math.round(TRADE_PRICE*100)} %.
  Mehr Transport: 🚚 Speditionshof, 🚂 Güterbahnhof, ⚓ Hafen, 🛫 Großflughafen (unter „Land“ und „Special“).</p>`;p.classList.remove('hidden');}

// ---------- Finanzen und Zufriedenheit ----------
function finance(){const p=$('#panel');delete p.dataset.modal;sel=null;const f=finances(game),h=happiness(game),t=taxRate(game);
 const row=(l,v,neg)=>`<li><span>${l}</span><b class="${neg||v<0?'neg':'pos'}">${neg||v<0?'−':'+'}${fmt(Math.abs(v))}</b></li>`;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>🪙 Stadtkasse</h3>
  <ul class="fin">${row('👥 Steuern der Einwohner',f.people)}${row('🛒🏭 Steuern von Läden und Fabriken',f.biz)}${row('🧳 Touristen',f.tour)}${f.mines?row('🚚 Handel und Bergbau',f.mines):''}${row('🔧 Unterhalt (Kraftwerke, Dienste …)',f.upkeep,true)}<li class="sum"><span>pro Minute</span><b class="${f.total<0?'neg':'pos'}">${f.total>=0?'+':''}${fmt(f.total)}</b></li></ul>
  <label class="field taxf"><span>Steuersatz: <b id="taxv">${t} %</b> <small class="muted">(normal ${TAX_DEFAULT} %)</small></span><input type="range" id="tax" min="${TAX_MIN}" max="${TAX_MAX}" step="1" value="${t}"></label>
  <p class="muted small">Höhere Steuern bringen mehr Geld, machen die Bürger aber unzufrieden – dann ziehen weniger Leute her. Niedrige Steuern machen glücklich.</p>
  <h3>${happyIcon(h)} Zufriedenheit: ${h} % <em>${happyText(h)}</em></h3><span class="lvbar wide"><i style="width:${h}%;background:${h>=60?'var(--green)':h>=HAPPY_MIN?'var(--gold)':'var(--red)'}"></i></span>
  <ul class="fin">${mood(game).filter(m=>m.v).map(m=>row(m.text,m.v)).join('')||'<li>Alles im grünen Bereich.</li>'}</ul>
  <p class="muted small">Unter ${HAPPY_MIN} % wachsen keine Wohnblocks und Hochhäuser mehr.</p>
  <button class="wideb tradeb" data-trade>🚚 Handel mit Nachbarstädten</button><button class="${showDirt?'on':''} wideb" data-dirt>🌫️ Dreck und Lärm auf der Karte ${showDirt?'ausblenden':'zeigen'}</button><button class="${showTraffic?'on':''} wideb traf" data-traffic>🚗 Verkehr und Stau ${showTraffic?'ausblenden':'zeigen'}</button>`;p.classList.remove('hidden');
 $('#tax').oninput=e=>{$('#taxv').textContent=e.target.value+' %';};
 $('#tax').onchange=e=>{const prev=game,r=act(game,{type:'setTax',tax:e.target.value},Date.now());if(r.error)return toast(r.error,'err');remember(prev);game=r.game;save();hud();finance();};}

// ---------- Einstellungen ----------
function settings(){const p=$('#panel');delete p.dataset.modal;const n=counts(game);sel=null;
 p.innerHTML=`<button class="close" data-close aria-label="Schließen">✕</button><h3>⚙️ ${esc(game.city.name)}</h3>
  <button class="wideb needsb" data-needs>${showNeeds?'💬 Sprechblasen über Häusern ausblenden':'💬 Sprechblasen über Häusern zeigen'}</button>
  <label class="field"><span>Name der Stadt</span><span class="inline"><input id="cityname" maxlength="30" value="${esc(game.city.name)}"><button data-rename>Speichern</button></span></label>
  <p>⭐ Attraktivität ${fmt(attractiveness(game))} · 🧳 Tourismus +${fmt(tourism(game))} Taler/Min. · 💼 ${fmt(jobs(game))} Arbeitsplätze</p><p class="muted">🏠 ${Object.entries(n).filter(([k])=>k.startsWith('house')).reduce((a,[,v])=>a+v,0)} Häuser · 🛣️ ${n.road||0} Straßenfelder · 🌳 ${n.park||0} Parks</p>
  <p class="links"><a href="datenschutz.html">Datenschutz</a> · <a href="https://mentaro-online.app/impressum" target="_blank" rel="noopener">Impressum</a></p>
  <div class="toggles"><button class="${audio.sound?'on':''}" data-aud="sound">🔊 Töne</button><button class="${audio.music?'on':''}" data-aud="music">🎵 Musik</button><button class="${audio.daynight?'on':''}" data-aud="daynight">🌙 Tag und Nacht</button></div>
  <div class="setbtns"><button class="wideb" data-crest>🛡️ Wappen gestalten</button><button class="wideb" data-savep>💾 Spielstand sichern</button></div>
  <button class="wideb" data-tutagain>🎓 Einführung noch einmal zeigen</button>
  <button class="danger" data-reset>Neue Stadt gründen</button><p class="muted small">Version ${BUILD}</p>`;p.classList.remove('hidden');}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!game)return;const d=b.dataset;
 if(d.group){group=d.group;const ts=TOOLS.filter(t=>t.group===group);if(ts.length===1){cur=ts[0].id;if(cur!=='hand'){sel=null;panel();toast(cur==='bulldoze'?'Tippe auf etwas, das weg soll.':cur==='land'?(unlocked(game,'land')?'Tippe auf ein Gebiet, um es zu kaufen – auch weit entfernte.':`Land kaufen geht ab Stadt-Level ${LAND_LEVEL}.`):'Tippe oder ziehe mit dem Finger, um Straßen zu bauen.');}}else if(!ts.some(t=>t.id===cur)){const first=ts.find(t=>unlocked(game,t.id)&&!(t.once&&built(game,t.id)));cur=first?first.id:'hand';if(first){sel=null;panel();}}preview=null;return toolbar();}
 if(d.tool){if(!unlocked(game,d.tool)){const t=tool(d.tool);return toast(`${t.icon} ${t.name} gibt es ab Stadt-Level ${t.lvl}. Lass deine Stadt weiter wachsen!`);}cur=d.tool;preview=null;toolbar();if(cur!=='hand'){sel=null;panel();const t=tool(cur);toast(t.feature?`${t.icon} ${t.name} geht nur in Gebieten mit ${FEATURES[t.feature].icon} ${FEATURES[t.feature].name}. Schau unter „Land“, wo es die gibt.`:cur==='land'?'Tippe auf ein Gebiet: Die Symbole zeigen Strand, Berge, Wald, Öl und Goldadern.':cur==='lanes'?'Tippe oder ziehe über Straßen. Rot = Stau.':t.onRock?`${t.icon} ${t.name} geht nur auf Fels (graue Berge in den Außengebieten).`:t.size>1?`${t.icon} ${t.name} braucht ${t.size}×${t.size} freie Felder. Tippe auf die Mitte.`:t.once&&built(game,t.id)?`${t.name} gibt es nur einmal.`:cur==='zone'?'Lege Wohngebiete direkt an eine Straße.':cur==='zonec'?'Lege Läden an eine Straße – sie bringen Arbeitsplätze.':cur==='zonei'?'Fabriken brauchen Straße und Strom – und bringen viele Arbeitsplätze.':t.radius?`${t.name}: versorgt alles im Umkreis von ${t.radius} Feldern.`:`${t.icon} ${t.name}: Tippe auf einen freien Platz.`);}return;}
 if('close'in d){sel=null;delete $('#panel').dataset.modal;return panel();}
 if('upgrade'in d){const prev=game,r=act(game,{type:'upgrade',x:sel.x,y:sel.y},Date.now());if(r.error){sfx('error');return toast(r.error,'err');}remember(prev);game=r.game;save();sfx('upgrade');toast(r.message,'gold');tutCheck();hud();panel();return levelUps();}
 if('needs'in d){showNeeds=!showNeeds;hud();return settings();}
 if('finance'in d)return finance();
 if('dirt'in d){showDirt=!showDirt;return finance();}
 if('settings'in d){sfx('click');return settings();}
 if('undo'in d)return undo();
 if('mini'in d){sfx('click');return miniPanel();}
 if(d.aud){audio[d.aud]=!audio[d.aud];saveSettings();if(d.aud==='music'){audio.music?startMusic():stopMusic();}hud();return settings();}
 if('sky'in d){const now=Date.now(),dn=clock(now);return toast(`${SEASONS[season(now)].icon} ${SEASONS[season(now)].name} · ${WEATHER[sky(now)].icon} ${WEATHER[sky(now)].name} · ${audio.daynight?(dn.night>0.5?'🌙 ':'☀️ ')+dn.label:'immer Tag'}`);}
 if(d.ttab){taskTab=d.ttab;return tasks();}
 if('crest'in d){crestDraft=null;return crestPanel();}
 if(d.crshape){crestDraft.shape=+d.crshape;return crestPanel();}if(d.crsplit){crestDraft.split=+d.crsplit;return crestPanel();}
 if(d.crcol){const[k,c]=d.crcol.split(':');crestDraft[k]=c;return crestPanel();}if(d.crsym){crestDraft.sym=d.crsym;return crestPanel();}
 if('crsave'in d){const r=act(game,{type:'setCrest',crest:crestDraft},Date.now());game=r.game;save();sfx('coin');toast(r.message,'gold');hud();return settings();}
 if('savep'in d)return savePanel();
 if('exp'in d){exportCode().then(c=>{lastCode=c;return navigator.clipboard.writeText(c);}).then(()=>toast(`✅ Code kopiert (${fmt(lastCode.length)} Zeichen). Füge ihn z. B. in den Notizen ein.`,'gold')).catch(()=>toast('Kopieren ging nicht – nutze „Code teilen“.','err'));return;}
 if('share'in d){exportCode().then(c=>navigator.share({title:`Spielstand ${game.city.name}`,text:c})).catch(()=>{});return;}
 if('imp'in d){const code=$('#impcode').value;if(!code.trim())return toast('Bitte zuerst einen Code einfügen.','err');
  if(!confirm('Die Stadt auf diesem Gerät wird durch den Spielstand aus dem Code ersetzt. Fortfahren?'))return;
  importCode(code).then(g=>{game=g;save();sel=null;$('#panel').classList.add('hidden');centerOn(cam,game.start.x,game.start.y+1,W,Hh);hud();toolbar();toast(`📥 ${game.city.name} wurde geladen!`,'gold');}).catch(e=>toast(e.message,'err'));return;}
 if('tutagain'in d){game.tut={step:0,base:{...game.stats}};save();$('#panel').classList.add('hidden');return tutShow();}
 if('tutnext'in d){tutAdvance();return;}
 if('tutskip'in d){game.tut={done:true};save();return tutShow();}
 if('tasks'in d)return tasks();
 if(d.claim){const r=act(game,{type:'claimTask',id:+d.claim},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();sfx('coin');toast(r.message,'gold');hud();return tasks();}
 if(d.skip){const r=act(game,{type:'skipTask',id:+d.skip},Date.now());game=r.game;save();return tasks();}
 if('trade'in d)return tradePanel();
 if('traffic'in d){showTraffic=!showTraffic;return finance();}
 if(d.buyland){const[sx,sy]=d.buyland.split(',').map(Number),prev=game;const r=act(game,{type:'buyLand',sx,sy},Date.now());if(r.error)return toast(r.error,'err');sfx('coin');remember(prev);game=r.game;save();toast(r.message,'gold');hud();toolbar();sel=null;return panel();}
 if('rename'in d){const r=act(game,{type:'renameCity',name:$('#cityname').value},Date.now());if(r.error)return toast(r.error,'err');game=r.game;save();toast(r.message);hud();return settings();}
 if('reset'in d){if(confirm(`Wirklich eine neue Stadt gründen? ${game.city.name} wird gelöscht.`)){localStorage.removeItem(SAVE_KEY);game=null;canvas=null;renderStart();}}});

document.addEventListener('pointerdown',()=>unlock(),{once:true});
// ---------- Willkommen zurück: was ist passiert, während du weg warst? ----------
const fmtAway=ms=>{const m=Math.round(ms/6e4);return m<60?`${m} Minuten`:m<120?'gut eine Stunde':m<1440?`${Math.round(m/60)} Stunden`:`${Math.round(m/1440)} Tage`;};
function catchUp(){if(!game)return;const now=Date.now(),away=now-(game.lastAt||now);const b={money:game.money,pop:population(game),level:cityLevel(game)};game=update(game,now);
 if(away<3*6e4)return;const dm=Math.round(game.money-b.money),dp=population(game)-b.pop,dl=cityLevel(game)-b.level;if(dm<=0&&dp<=0&&dl<=0)return;
 setTimeout(()=>{const p=$('#panel');if(!p||p.dataset.modal)return;p.dataset.modal='1';sel=null;
  p.innerHTML=`<div class="lvup"><div class="big-emo">👋</div><h3>Willkommen zurück in ${esc(game.city.name)}!</h3><p class="muted">Du warst ${fmtAway(away)} weg${away>8*3600e3?' – die Stadtkasse zählt höchstens 8 Stunden':''}. In der Zeit ist passiert:</p>
   <ul class="fin wb">${dm>0?`<li><span>🪙 Einnahmen</span><b class="pos">+${fmt(dm)} Taler</b></li>`:''}${dp>0?`<li><span>👥 Neue Einwohner</span><b class="pos">+${fmt(dp)}</b></li>`:''}${dl>0?`<li><span>⭐ Level</span><b class="pos">${b.level} → ${cityLevel(game)}</b></li>`:''}
   ${(game.tasks||[]).some(t=>taskDone(game,t))?'<li><span>📋 Aufträge</span><b class="pos">fertig zum Abholen</b></li>':''}</ul><button class="big" data-close>Weiter bauen</button></div>`;p.classList.remove('hidden');sfx('coin');},400);}
let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(!game||!canvas)return;if(document.visibilityState==='hidden')hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>3*6e4){catchUp();hud();}});
game=load();if(game){startCity();catchUp();}else renderStart();checkUpdate();
