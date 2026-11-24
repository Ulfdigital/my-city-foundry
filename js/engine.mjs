// My City Foundry – Spiellogik. Reine Funktionen: act(game, action, now) → {game, error, message}.
import {VERSION,MAP_W,MAP_H,START_MONEY,OFFLINE_MAX_H,TOOLS,tool,ZONES,TREE_CLEAR,LEVELS,MAX_LEVEL,BIZ,BIZ_MAX,TAX_PER_PERSON,MOVE_IN_SEC,
 CITY_LEVELS,MAX_CITY_LEVEL,LEVEL_BONUS,WORKER_SHARE,FREE_WORKERS,SHOP_SHARE,FACTORY_SHARE} from './data.mjs';

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
export function jobs(g,kind){let j=0;for(const c of g.tiles)if((c.t==='shop'||c.t==='factory')&&(!kind||c.t===kind))j+=BIZ[c.t].jobs[c.lvl];return j;}
export function upkeep(g){let u=0;for(const c of g.tiles){const t=tool(c.t);if(t?.upkeep)u+=t.upkeep;}return u;}
export function incomePerMin(g){let inc=population(g)*TAX_PER_PERSON;for(const c of g.tiles)if(BIZ[c.t])inc+=BIZ[c.t].tax[c.lvl];return inc-upkeep(g);}
// Nachfrage wie bei SimCity: > 0 heißt, es wird mehr davon gebraucht
export function demand(g){const p=population(g),w=p*WORKER_SHARE;
 return{house:Math.round(jobs(g)+FREE_WORKERS-w),shop:Math.round(p*SHOP_SHARE-jobs(g,'shop')+3),factory:Math.round(p*FACTORY_SHARE-jobs(g,'factory')+5)};}
export function cityLevel(g){return g.level||1;}
export function nextLevelPop(g){const l=cityLevel(g);return l<MAX_CITY_LEVEL?CITY_LEVELS[l+1].pop:null;}
export function unlocked(g,id){return cityLevel(g)>=(tool(id)?.lvl||1);}
function near(g,x,y,type,r){for(let j=Math.max(0,y-r);j<=Math.min(MAP_H-1,y+r);j++)for(let i=Math.max(0,x-r);i<=Math.min(MAP_W-1,x+r);i++)
 if(g.tiles[idx(i,j)].t===type&&Math.abs(i-x)+Math.abs(j-y)<=r)return true;return false;}
// Was braucht das Feld für die nächste Stufe? need-Liste + nötiges Stadt-Level
function spec(g,x,y,level){const c=tile(g,x,y);if(c.t==='house')return{need:LEVELS[level].need,city:LEVELS[level].city||1};const B=BIZ[c.t];return{need:B.need[level],city:B.city[level]||1};}
export function has(g,x,y,need,city=1){switch(need){case'road':return hasRoad(g,x,y);case'water':return covered(g,x,y,'tower');case'power':return covered(g,x,y,'power');case'park':return covered(g,x,y,'park');
 case'shop':return near(g,x,y,'shop',BIZ.shop.radius);case'jobs':return demand(g).house>0;case'city':return cityLevel(g)>=city;}return false;}
export function missing(g,x,y,level){const s=spec(g,x,y,level);return s.need.filter(n=>!has(g,x,y,n,s.city));}
export function maxLevel(c){return c.t==='house'?MAX_LEVEL:BIZ_MAX;}
export function canUpgrade(g,x,y){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t])||c.lvl>=maxLevel(c))return false;return missing(g,x,y,c.lvl+1).length===0;}
export function upgradeCost(c){return c.t==='house'?LEVELS[c.lvl+1].cost:BIZ[c.t].cost[c.lvl+1];}
export function counts(g){const n={};for(const c of g.tiles){const k=c.t==='house'?'house'+c.lvl:c.t;n[k]=(n[k]||0)+1;}return n;}
function levelUp(g){const p=population(g);let l=cityLevel(g);while(l<MAX_CITY_LEVEL&&p>=CITY_LEVELS[l+1].pop){l++;const bonus=LEVEL_BONUS(l);g.money+=bonus;
 (g.levelUps=g.levelUps||[]).push({level:l,bonus,tools:TOOLS.filter(t=>t.lvl===l).map(t=>t.id)});}g.level=l;}

// ---------- Spielstand ----------
export function newGame(now=Date.now(),{cityName='Neustadt'}={},seed=Math.floor(now%2147483647)||1){
 const g={version:VERSION,level:1,levelUps:[],city:{name:String(cityName).trim().slice(0,30)||'Neustadt'},money:START_MONEY,seed:seed>>>0,tiles:null,start:null,stats:{},createdAt:now,lastAt:now,earned:0};
 makeMap(g);return update(g,now);}
export function update(g,now){const dt=Math.max(0,Math.min(now-(g.lastAt||now),OFFLINE_MAX_H*H));
 if(dt>0){const inc=incomePerMin(g)*dt/MIN;g.money=Math.round((g.money+inc)*100)/100;if(inc>0)g.earned=(g.earned||0)+inc;if(g.money<0)g.money=0;}
 // Grundstücke werden bebaut: Wohnen → Häuschen, Läden → Kiosk, Fabriken → Werkstatt (wenn Straße, Nachfrage und bei Fabriken Strom da sind)
 const dem=demand(g);
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i];const kind=ZONES[c.t];if(!kind)continue;const x=i%MAP_W,y=Math.floor(i/MAP_W);
  const okHere=hasRoad(g,x,y)&&(kind!=='factory'||covered(g,x,y,'power'))&&dem[kind]>0;
  if(c.ready&&c.ready<=now){if(okHere){g.tiles[i]={t:kind,lvl:1,since:c.ready};stat(g,'built_'+kind);const d=kind==='house'?null:BIZ[kind].jobs[1];
    if(kind==='house')dem.house-=LEVELS[1].people*WORKER_SHARE;else dem[kind]-=d,dem.house+=d;}else delete c.ready;}
  else if(!c.ready&&okHere)c.ready=now+moveIn(g);}
 levelUp(g);
 g.lastAt=Math.max(g.lastAt||0,now);return g;}
export function restore(raw){try{const g=typeof raw==='string'?JSON.parse(raw):raw;if(!g||g.version!==VERSION||!Array.isArray(g.tiles)||g.tiles.length!==MAP_W*MAP_H)return null;g.stats=g.stats||{};g.level=g.level||1;g.levelUps=g.levelUps||[];return g;}catch{return null;}}
const moveIn=g=>Math.round((MOVE_IN_SEC[0]+rand(g)*(MOVE_IN_SEC[1]-MOVE_IN_SEC[0]))*1000);
function stat(g,k,n=1){g.stats[k]=(g.stats[k]||0)+n;}
function pay(g,n,what){if(g.money<n)throw new Error(`Dafür fehlt Geld: ${what} kostet ${Math.ceil(n).toLocaleString('de-DE')} Taler.`);g.money=Math.round((g.money-n)*100)/100;}

const A={
 build(g,{tool:id,x,y},now){const t=tool(id);if(!t||id==='hand')throw new Error('Unbekanntes Werkzeug.');if(!unlocked(g,id))throw new Error(`${t.name} gibt es ab Stadt-Level ${t.lvl}.`);const c=tile(g,x,y);if(!c)throw new Error('Außerhalb der Karte.');
  if(id==='bulldoze'){if(c.t==='grass'||c.t==='water')throw new Error('Hier gibt es nichts abzureißen.');if(g.start&&c.t==='house'&&countHouses(g)<=1)throw new Error('Das letzte Haus bleibt stehen.');
   pay(g,c.t==='tree'?TREE_CLEAR:t.cost,'Abreißen');g.tiles[idx(x,y)]={t:'grass'};stat(g,'bulldoze');return null;}
  if(c.t==='water')throw new Error('Auf Wasser kann man nicht bauen.');
  if(c.t===id)return null;                                    // schon da – beim Ziehen einfach überspringen
  if(c.t!=='grass'&&c.t!=='tree')throw new Error('Hier steht schon etwas. Erst abreißen.');
  pay(g,t.cost+(c.t==='tree'?TREE_CLEAR:0),t.name);
  g.tiles[idx(x,y)]={t:id};stat(g,id);update(g,now);return null;},
 upgrade(g,{x,y},now){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t]))throw new Error('Hier gibt es nichts auszubauen.');if(c.lvl>=maxLevel(c))throw new Error(c.t==='house'?'Höher geht es nicht – ein echter Wolkenkratzer!':'Das ist schon die größte Stufe.');
  const next=c.lvl+1,miss=missing(g,x,y,next),sp=spec(g,x,y,next);
  if(miss.length)throw new Error(`Zum Ausbauen fehlt noch: ${miss.map(m=>({road:'Straße',power:'Strom',water:'Wasser',park:'Park',jobs:'Arbeitsplätze',shop:'ein Laden in der Nähe',city:`Stadt-Level ${sp.city}`}[m])).join(', ')}.`);
  const name=c.t==='house'?LEVELS[next].name:BIZ[c.t].names[next];pay(g,upgradeCost(c),name);c.lvl=next;c.since=now;stat(g,'upgrade');levelUp(g);
  return c.t==='house'?`Ausgebaut: ${name}! Jetzt wohnen hier ${LEVELS[next].people} Leute. 🏗️`:`Ausgebaut: ${name}! ${BIZ[c.t].jobs[next]} Arbeitsplätze. 🏗️`;},
 seenLevelUps(g){g.levelUps=[];return null;},
 renameCity(g,{name}){const n=String(name||'').trim().slice(0,30);if(n.length<2)throw new Error('Der Name ist zu kurz.');g.city.name=n;return`Deine Stadt heißt jetzt ${n}.`;}};
function countHouses(g){let n=0;for(const c of g.tiles)if(c.t==='house')n++;return n;}

export function act(game,action,now=Date.now()){const g=update(structuredClone(game),now);
 const fn=A[action?.type];if(!fn)return{game,error:'Unbekannte Aktion.',message:null};
 try{const message=fn(g,action,now);return{game:g,error:null,message};}catch(e){return{game,error:e.message||String(e),message:null};}}
