// My City Foundry – Spiellogik. Reine Funktionen: act(game, action, now) → {game, error, message}.
import {VERSION,MAP_W,MAP_H,START_MONEY,OFFLINE_MAX_H,TOOLS,tool,TREE_CLEAR,LEVELS,MAX_LEVEL,SKYSCRAPER_CITY,TAX_PER_PERSON,MOVE_IN_SEC} from './data.mjs';

const MIN=6e4,H=36e5;
export function rand(g){let t=(g.seed=(g.seed+0x6D2B79F5)>>>0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
export const idx=(x,y)=>y*MAP_W+x;
export const inside=(x,y)=>x>=0&&y>=0&&x<MAP_W&&y<MAP_H;
export function tile(g,x,y){return inside(x,y)?g.tiles[idx(x,y)]:null;}
const N4=[[1,0],[-1,0],[0,1],[0,-1]];

// ---------- Karte ----------
function makeMap(g){const t=Array.from({length:MAP_W*MAP_H},()=>({t:'grass'}));
 // See
 const lx=6+Math.floor(rand(g)*8),ly=24+Math.floor(rand(g)*8),rx=3+rand(g)*3,ry=2+rand(g)*3;
 for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const d=((x-lx)/rx)**2+((y-ly)/ry)**2;if(d<1+rand(g)*0.3)t[idx(x,y)]={t:'water'};}
 // Fluss am Rand
 let rxp=MAP_W-6;for(let y=0;y<MAP_H;y++){rxp+=Math.round(rand(g)*2-1);rxp=Math.max(MAP_W-9,Math.min(MAP_W-2,rxp));t[idx(rxp,y)]={t:'water'};t[idx(rxp+1,y)]={t:'water'};}
 // Wäldchen
 for(let k=0;k<14;k++){const cx=Math.floor(rand(g)*MAP_W),cy=Math.floor(rand(g)*MAP_H),r=1+rand(g)*3;
  for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++)if(inside(x,y)&&t[idx(x,y)].t==='grass'&&Math.hypot(x-cx,y-cy)<r+rand(g))t[idx(x,y)]={t:'tree'};}
 // Startplatz frei machen: Straße und ein erstes Haus in der Mitte
 const c=Math.floor(MAP_W/2)-3;for(let y=c-3;y<=c+4;y++)for(let x=c-4;x<=c+5;x++)t[idx(x,y)]={t:'grass'};
 for(let x=c-3;x<=c+4;x++)t[idx(x,c)]={t:'road'};
 t[idx(c,c+1)]={t:'house',lvl:1,since:0};
 g.tiles=t;g.start={x:c,y:c};}

// ---------- Versorgung ----------
export function hasRoad(g,x,y){return N4.some(([dx,dy])=>tile(g,x+dx,y+dy)?.t==='road');}
export function covered(g,x,y,type){const r=tool(type).radius;
 for(let j=Math.max(0,y-r);j<=Math.min(MAP_H-1,y+r);j++)for(let i=Math.max(0,x-r);i<=Math.min(MAP_W-1,x+r);i++)
  if(g.tiles[idx(i,j)].t===type&&Math.abs(i-x)+Math.abs(j-y)<=r)return true;return false;}
export function population(g){let p=0;for(const c of g.tiles)if(c.t==='house')p+=LEVELS[c.lvl].people;return p;}
export function upkeep(g){let u=0;for(const c of g.tiles){const t=tool(c.t);if(t?.upkeep)u+=t.upkeep;}return u;}
export function incomePerMin(g){return population(g)*TAX_PER_PERSON-upkeep(g);}
export function has(g,x,y,need){return need==='road'?hasRoad(g,x,y):need==='city'?population(g)>=SKYSCRAPER_CITY:covered(g,x,y,need==='water'?'tower':need);}
export function missing(g,x,y,level){return LEVELS[level].need.filter(n=>!has(g,x,y,n));}
export function canUpgrade(g,x,y){const c=tile(g,x,y);if(c?.t!=='house'||c.lvl>=MAX_LEVEL)return false;return missing(g,x,y,c.lvl+1).length===0;}
export function counts(g){const n={};for(const c of g.tiles){const k=c.t==='house'?'house'+c.lvl:c.t;n[k]=(n[k]||0)+1;}return n;}

// ---------- Spielstand ----------
export function newGame(now=Date.now(),{cityName='Neustadt'}={},seed=Math.floor(now%2147483647)||1){
 const g={version:VERSION,city:{name:String(cityName).trim().slice(0,30)||'Neustadt'},money:START_MONEY,seed:seed>>>0,tiles:null,start:null,stats:{},createdAt:now,lastAt:now,earned:0};
 makeMap(g);return update(g,now);}
export function update(g,now){const dt=Math.max(0,Math.min(now-(g.lastAt||now),OFFLINE_MAX_H*H));
 if(dt>0){const inc=incomePerMin(g)*dt/MIN;g.money=Math.round((g.money+inc)*100)/100;if(inc>0)g.earned=(g.earned||0)+inc;if(g.money<0)g.money=0;}
 // Leute ziehen ein: Wohngrundstück mit Straße wird zum Häuschen
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i];if(c.t==='zone'&&c.ready&&c.ready<=now){const x=i%MAP_W,y=Math.floor(i/MAP_W);
  if(hasRoad(g,x,y)){g.tiles[i]={t:'house',lvl:1,since:c.ready};stat(g,'movedIn');}else delete c.ready;}
  else if(c.t==='zone'&&!c.ready){const x=i%MAP_W,y=Math.floor(i/MAP_W);if(hasRoad(g,x,y))c.ready=now+moveIn(g);}}
 g.lastAt=Math.max(g.lastAt||0,now);return g;}
export function restore(raw){try{const g=typeof raw==='string'?JSON.parse(raw):raw;if(!g||g.version!==VERSION||!Array.isArray(g.tiles)||g.tiles.length!==MAP_W*MAP_H)return null;g.stats=g.stats||{};return g;}catch{return null;}}
const moveIn=g=>Math.round((MOVE_IN_SEC[0]+rand(g)*(MOVE_IN_SEC[1]-MOVE_IN_SEC[0]))*1000);
function stat(g,k,n=1){g.stats[k]=(g.stats[k]||0)+n;}
function pay(g,n,what){if(g.money<n)throw new Error(`Dafür fehlt Geld: ${what} kostet ${Math.ceil(n).toLocaleString('de-DE')} Taler.`);g.money=Math.round((g.money-n)*100)/100;}

const A={
 build(g,{tool:id,x,y},now){const t=tool(id);if(!t||id==='hand')throw new Error('Unbekanntes Werkzeug.');const c=tile(g,x,y);if(!c)throw new Error('Außerhalb der Karte.');
  if(id==='bulldoze'){if(c.t==='grass'||c.t==='water')throw new Error('Hier gibt es nichts abzureißen.');if(g.start&&c.t==='house'&&countHouses(g)<=1)throw new Error('Das letzte Haus bleibt stehen.');
   pay(g,c.t==='tree'?TREE_CLEAR:t.cost,'Abreißen');g.tiles[idx(x,y)]={t:'grass'};stat(g,'bulldoze');return null;}
  if(c.t==='water')throw new Error('Auf Wasser kann man nicht bauen.');
  if(c.t===id)return null;                                    // schon da – beim Ziehen einfach überspringen
  if(c.t!=='grass'&&c.t!=='tree')throw new Error('Hier steht schon etwas. Erst abreißen.');
  pay(g,t.cost+(c.t==='tree'?TREE_CLEAR:0),t.name);
  g.tiles[idx(x,y)]=id==='zone'?{t:'zone'}:{t:id};stat(g,id);
  if(id==='zone'&&hasRoad(g,x,y))g.tiles[idx(x,y)].ready=now+moveIn(g);
  // neue Straße: Nachbar-Grundstücke werden bebaubar
  if(id==='road')for(const[dx,dy]of N4){const n=tile(g,x+dx,y+dy);if(n?.t==='zone'&&!n.ready)n.ready=now+moveIn(g);}
  return null;},
 upgrade(g,{x,y},now){const c=tile(g,x,y);if(c?.t!=='house')throw new Error('Hier steht kein Haus.');if(c.lvl>=MAX_LEVEL)throw new Error('Höher geht es nicht – ein echter Wolkenkratzer!');
  const next=c.lvl+1,miss=missing(g,x,y,next);if(miss.length)throw new Error(`Zum Ausbauen fehlt noch: ${miss.map(m=>({road:'Straße',power:'Strom',water:'Wasser',park:'Park',city:`${SKYSCRAPER_CITY} Einwohner`}[m])).join(', ')}.`);
  pay(g,LEVELS[next].cost,LEVELS[next].name);c.lvl=next;c.since=now;stat(g,'upgrade');
  return`Ausgebaut: ${LEVELS[next].name}! Jetzt wohnen hier ${LEVELS[next].people} Leute. 🏗️`;},
 renameCity(g,{name}){const n=String(name||'').trim().slice(0,30);if(n.length<2)throw new Error('Der Name ist zu kurz.');g.city.name=n;return`Deine Stadt heißt jetzt ${n}.`;}};
function countHouses(g){let n=0;for(const c of g.tiles)if(c.t==='house')n++;return n;}

export function act(game,action,now=Date.now()){const g=update(structuredClone(game),now);
 const fn=A[action?.type];if(!fn)return{game,error:'Unbekannte Aktion.',message:null};
 try{const message=fn(g,action,now);return{game:g,error:null,message};}catch(e){return{game,error:e.message||String(e),message:null};}}
