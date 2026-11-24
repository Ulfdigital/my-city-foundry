// My City Foundry – Spiellogik. Reine Funktionen: act(game, action, now) → {game, error, message}.
import {VERSION,MAP_W,MAP_H,OLD_MAP,START_MONEY,OFFLINE_MAX_H,TOOLS,tool,ZONES,TREE_CLEAR,LEVELS,MAX_LEVEL,BIZ,bizMax,TAX_PER_PERSON,MOVE_IN_SEC,
 MAX_CITY_LEVEL,levelPop,LEVEL_BONUS,WORKER_SHARE,FREE_WORKERS,SHOP_SHARE,FACTORY_SHARE,ATTR_MOVE,
 TAX_DEFAULT,TAX_MIN,TAX_MAX,FACTORY_DIRT,HAPPY_MIN} from './data.mjs';

const MIN=6e4,H=36e5;
export function rand(g){let t=(g.seed=(g.seed+0x6D2B79F5)>>>0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
export const idx=(x,y)=>y*MAP_W+x;
export const inside=(x,y)=>x>=0&&y>=0&&x<MAP_W&&y<MAP_H;
export function tile(g,x,y){return inside(x,y)?g.tiles[idx(x,y)]:null;}
const N4=[[1,0],[-1,0],[0,1],[0,-1]];
const touch=g=>{g.rev=(g.rev||0)+1;};   // Karte hat sich geändert → Werte neu berechnen

// ---------- Karte ----------
function nature(g,t,W,H){
 const lake=(lx,ly,rx,ry)=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=((x-lx)/rx)**2+((y-ly)/ry)**2;if(d<1+rand(g)*0.3)t[y*W+x]={t:'water'};}};
 lake(6+Math.floor(rand(g)*8),H-16+Math.floor(rand(g)*8),3+rand(g)*3,2+rand(g)*3);lake(W-20+rand(g)*6,6+rand(g)*6,2+rand(g)*3,2+rand(g)*2);
 let rxp=W-6;for(let y=0;y<H;y++){rxp+=Math.round(rand(g)*2-1);rxp=Math.max(W-9,Math.min(W-2,rxp));t[y*W+rxp]={t:'water'};t[y*W+rxp+1]={t:'water'};}
 for(let k=0;k<Math.round(W*H/115);k++){const cx=Math.floor(rand(g)*W),cy=Math.floor(rand(g)*H),r=1+rand(g)*3;
  for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++)if(x>=0&&y>=0&&x<W&&y<H&&t[y*W+x].t==='grass'&&Math.hypot(x-cx,y-cy)<r+rand(g))t[y*W+x]={t:'tree'};}}
function makeMap(g){const t=Array.from({length:MAP_W*MAP_H},()=>({t:'grass'}));nature(g,t,MAP_W,MAP_H);
 const c=Math.floor(MAP_W/2)-3;for(let y=c-3;y<=c+4;y++)for(let x=c-4;x<=c+5;x++)t[idx(x,y)]={t:'grass'};
 for(let x=c-3;x<=c+4;x++)t[idx(x,c)]={t:'road'};
 t[idx(c,c+1)]={t:'house',lvl:1,since:0};g.tiles=t;g.start={x:c,y:c};}
// Alte Stadt (40×40) in die Mitte der großen Karte setzen – nichts geht verloren
function migrate(g){const off=Math.floor((MAP_W-OLD_MAP)/2),old=g.tiles,t=Array.from({length:MAP_W*MAP_H},()=>({t:'grass'}));nature(g,t,MAP_W,MAP_H);
 for(let y=0;y<OLD_MAP;y++)for(let x=0;x<OLD_MAP;x++)t[idx(x+off,y+off)]=old[y*OLD_MAP+x];
 g.tiles=t;g.start={x:g.start.x+off,y:g.start.y+off};touch(g);}

// ---------- Werte der Stadt (zwischengespeichert, bis sich die Karte ändert) ----------
const cache=new WeakMap();
const PROVIDES=['power','water','park','school','fire','police','hospital','bus','shop','dirt'];
export function info(g){const hit=cache.get(g);if(hit&&hit.rev===(g.rev||0))return hit.v;
 const v={pop:0,dirtyPop:0,jobs:0,jobsShop:0,jobsFactory:0,upkeep:0,biztax:0,attr:0,tour:0,count:{},cover:{}};
 for(const p of PROVIDES)v.cover[p]=new Uint8Array(MAP_W*MAP_H);
 const stamp=(type,x0,y0,size,r)=>{const cv=v.cover[type];for(let y=Math.max(0,y0-r);y<=Math.min(MAP_H-1,y0+size-1+r);y++)for(let x=Math.max(0,x0-r);x<=Math.min(MAP_W-1,x0+size-1+r);x++){
  const dx=x<x0?x0-x:x>x0+size-1?x-(x0+size-1):0,dy=y<y0?y0-y:y>y0+size-1?y-(y0+size-1):0;if(dx+dy<=r)cv[idx(x,y)]=1;}};
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i],x=i%MAP_W,y=Math.floor(i/MAP_W);
  if(c.t==='house'){v.pop+=LEVELS[c.lvl].people;continue;}
  if(BIZ[c.t]){const j=BIZ[c.t].jobs[c.lvl];v.jobs+=j;if(c.t==='shop'){v.jobsShop+=j;stamp('shop',x,y,1,BIZ.shop.radius);}else v.jobsFactory+=j;v.biztax+=BIZ[c.t].tax[c.lvl];if(c.t==='factory'){v.attr-=c.lvl;stamp('dirt',x,y,1,FACTORY_DIRT[c.lvl]);}continue;}
  const T=tool(c.t);if(!T||c.part)continue;                 // Teile großer Gebäude nur einmal (am Ursprung) zählen
  v.count[c.t]=(v.count[c.t]||0)+1;v.upkeep+=T.upkeep||0;v.jobs+=T.jobs||0;v.attr+=T.attr||0;v.tour+=T.tour||0;
  if(T.provides)stamp(T.provides,x,y,T.size||1,T.radius);if(T.dirt)stamp('dirt',x,y,T.size||1,T.dirt);}
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i];if(c.t==='house'&&v.cover.dirt[i])v.dirtyPop+=LEVELS[c.lvl].people;}
 v.attr=Math.max(0,v.attr);cache.set(g,{rev:g.rev||0,v});return v;}

export function hasRoad(g,x,y){const c=tile(g,x,y),s=c?.rx!==undefined?tool(c.t).size||1:1;const x0=c?.rx??x,y0=c?.ry??y;
 if(s===1)return N4.some(([dx,dy])=>tile(g,x+dx,y+dy)?.t==='road');
 for(let j=y0-1;j<=y0+s;j++)for(let i=x0-1;i<=x0+s;i++){const out=i<x0||i>=x0+s,outy=j<y0||j>=y0+s;if(out!==outy&&tile(g,i,j)?.t==='road')return true;}return false;}
export function covered(g,x,y,type){return info(g).cover[type]?.[idx(x,y)]===1;}
export function population(g){return info(g).pop;}
export function jobs(g,kind){const v=info(g);return kind==='shop'?v.jobsShop:kind==='factory'?v.jobsFactory:v.jobs;}
export function attractiveness(g){return info(g).attr;}
export function tourism(g){const v=info(g);return Math.round(v.tour*(1+Math.min(v.attr,150)/200));}
export function upkeep(g){return info(g).upkeep;}
export function taxRate(g){return g.tax??TAX_DEFAULT;}
export function finances(g){const v=info(g),f=taxRate(g)/TAX_DEFAULT;const people=Math.round(v.pop*TAX_PER_PERSON*f),biz=Math.round(v.biztax*f),tour=tourism(g);return{people,biz,tour,upkeep:v.upkeep,total:people+biz+tour-v.upkeep};}
export function incomePerMin(g){return finances(g).total;}
// Zufriedenheit 0–100: Steuern, Attraktivität, Dreck und Lärm, Arbeitslosigkeit
export function happiness(g){const v=info(g);if(!v.pop)return 60;const parts=mood(g);return Math.max(0,Math.min(100,Math.round(60+parts.reduce((a,p)=>a+p.v,0))));}
export function mood(g){const v=info(g),t=taxRate(g),out=[];
 out.push({k:'tax',v:(TAX_DEFAULT-t)*4,text:`Steuern ${t} %`});
 out.push({k:'attr',v:Math.min(20,Math.round(v.attr/5)),text:'Parks, Freizeit und Sehenswürdigkeiten'});
 const dirty=v.pop?v.dirtyPop/v.pop:0;out.push({k:'dirt',v:-Math.round(dirty*30),text:'Dreck und Lärm in Wohngebieten'});
 const idle=Math.max(0,v.pop*WORKER_SHARE-v.jobs-FREE_WORKERS);out.push({k:'jobs',v:-Math.min(20,Math.round(idle/Math.max(10,v.pop*0.02))),text:'Arbeitslose'});
 return out;}
// Nachfrage wie bei SimCity: > 0 heißt, es wird mehr davon gebraucht
export function demand(g){const v=info(g),w=v.pop*WORKER_SHARE;
 const hp=happiness(g);
 return{house:Math.round(v.jobs+FREE_WORKERS+Math.min(v.attr,150)*ATTR_MOVE-w+(hp-60)*Math.max(1,v.pop/400)),shop:Math.round(v.pop*SHOP_SHARE-v.jobsShop+3),factory:Math.round(v.pop*FACTORY_SHARE-v.jobsFactory+5)};}
export function cityLevel(g){return g.level||1;}
export function nextLevelPop(g){const l=cityLevel(g);return l<MAX_CITY_LEVEL?levelPop(l+1):null;}
export function unlocked(g,id){return cityLevel(g)>=(tool(id)?.lvl||1);}
export function built(g,id){return info(g).count[id]||0;}
function spec(g,x,y,level){const c=tile(g,x,y);if(c.t==='house')return{need:LEVELS[level].need,city:LEVELS[level].city||1};const B=BIZ[c.t];return{need:B.need[level],city:B.city[level]||1};}
export function has(g,x,y,need,city=1){if(need==='road')return hasRoad(g,x,y);if(need==='jobs')return demand(g).house>0;if(need==='city')return cityLevel(g)>=city;if(need==='clean')return !covered(g,x,y,'dirt');if(need==='happy')return happiness(g)>=HAPPY_MIN;return covered(g,x,y,need);}
export function missing(g,x,y,level){const s=spec(g,x,y,level);return s.need.filter(n=>!has(g,x,y,n,s.city));}
export function maxLevel(c){return c.t==='house'?MAX_LEVEL:bizMax(c.t);}
export function canUpgrade(g,x,y){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t])||c.lvl>=maxLevel(c))return false;return missing(g,x,y,c.lvl+1).length===0;}
export function upgradeCost(c){return c.t==='house'?LEVELS[c.lvl+1].cost:BIZ[c.t].cost[c.lvl+1];}
export function counts(g){const n={};for(const c of g.tiles){if(c.part)continue;const k=c.t==='house'?'house'+c.lvl:c.t;n[k]=(n[k]||0)+1;}return n;}
function levelUp(g){const p=population(g);let l=cityLevel(g);while(l<MAX_CITY_LEVEL&&p>=levelPop(l+1)){l++;const bonus=LEVEL_BONUS(l);g.money+=bonus;
 (g.levelUps=g.levelUps||[]).push({level:l,bonus,tools:TOOLS.filter(t=>t.lvl===l).map(t=>t.id)});}g.level=l;}

// ---------- Spielstand ----------
export function newGame(now=Date.now(),{cityName='Neustadt'}={},seed=Math.floor(now%2147483647)||1){
 const g={version:VERSION,tax:TAX_DEFAULT,level:1,levelUps:[],city:{name:String(cityName).trim().slice(0,30)||'Neustadt'},money:START_MONEY,seed:seed>>>0,tiles:null,start:null,stats:{},rev:0,createdAt:now,lastAt:now,earned:0};
 makeMap(g);return update(g,now);}
export function update(g,now){const dt=Math.max(0,Math.min(now-(g.lastAt||now),OFFLINE_MAX_H*H));
 if(dt>0){const inc=incomePerMin(g)*dt/MIN;g.money=Math.round((g.money+inc)*100)/100;if(inc>0)g.earned=(g.earned||0)+inc;if(g.money<0)g.money=0;}
 // Grundstücke werden bebaut (Straße + Nachfrage, Fabriken brauchen Strom)
 const dem=demand(g);let changed=false;
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i];const kind=ZONES[c.t];if(!kind)continue;const x=i%MAP_W,y=Math.floor(i/MAP_W);
  const okHere=hasRoad(g,x,y)&&(kind!=='factory'||covered(g,x,y,'power'))&&dem[kind]>0;
  if(c.ready&&c.ready<=now){if(okHere){g.tiles[i]={t:kind,lvl:1,since:c.ready};changed=true;stat(g,'built_'+kind);
    if(kind==='house')dem.house-=LEVELS[1].people*WORKER_SHARE;else{const j=BIZ[kind].jobs[1];dem[kind]-=j;dem.house+=j;}}else delete c.ready;}
  else if(!c.ready&&okHere)c.ready=now+moveIn(g);}
 if(changed)touch(g);levelUp(g);
 g.lastAt=Math.max(g.lastAt||0,now);return g;}
export function restore(raw){try{const g=typeof raw==='string'?JSON.parse(raw):raw;if(!g||g.version!==VERSION||!Array.isArray(g.tiles))return null;
 if(g.tiles.length===OLD_MAP*OLD_MAP)migrate(g);else if(g.tiles.length!==MAP_W*MAP_H)return null;
 g.stats=g.stats||{};g.level=g.level||1;g.levelUps=g.levelUps||[];g.rev=g.rev||0;if(g.tax===undefined)g.tax=TAX_DEFAULT;return g;}catch{return null;}}
const moveIn=g=>Math.round((MOVE_IN_SEC[0]+rand(g)*(MOVE_IN_SEC[1]-MOVE_IN_SEC[0]))*1000);
function stat(g,k,n=1){g.stats[k]=(g.stats[k]||0)+n;}
function pay(g,n,what){if(g.money<n)throw new Error(`Dafür fehlt Geld: ${what} kostet ${Math.ceil(n).toLocaleString('de-DE')} Taler.`);g.money=Math.round((g.money-n)*100)/100;}
function countHouses(g){let n=0;for(const c of g.tiles)if(c.t==='house')n++;return n;}
// Fläche für ein Gebäude prüfen (x,y = obere Ecke)
export function canPlace(g,id,x,y){const T=tool(id),s=T.size||1;let trees=0,water=false;
 for(let j=y;j<y+s;j++)for(let i=x;i<x+s;i++){const c=tile(g,i,j);if(!c)return{ok:false,why:'Das passt nicht mehr auf die Karte.'};
  if(c.t==='water')return{ok:false,why:'Auf Wasser kann man nicht bauen.'};if(c.t!=='grass'&&c.t!=='tree')return{ok:false,why:s>1?`Für ${T.name} brauchst du ${s}×${s} freie Felder.`:'Hier steht schon etwas. Erst abreißen.'};if(c.t==='tree')trees++;}
 if(T.nearWater){for(let j=y-1;j<=y+s;j++)for(let i=x-1;i<=x+s;i++)if(tile(g,i,j)?.t==='water')water=true;if(!water)return{ok:false,why:`${T.name} muss direkt am Wasser stehen.`};}
 return{ok:true,trees};}

const A={
 build(g,{tool:id,x,y},now){const T=tool(id);if(!T||id==='hand')throw new Error('Unbekanntes Werkzeug.');if(!unlocked(g,id))throw new Error(`${T.name} gibt es ab Stadt-Level ${T.lvl}.`);
  const c=tile(g,x,y);if(!c)throw new Error('Außerhalb der Karte.');
  if(id==='bulldoze'){if(c.t==='grass'||c.t==='water')throw new Error('Hier gibt es nichts abzureißen.');if(c.t==='house'&&countHouses(g)<=1)throw new Error('Das letzte Haus bleibt stehen.');
   pay(g,c.t==='tree'?TREE_CLEAR:T.cost,'Abreißen');
   if(c.rx!==undefined){const s=tool(c.t).size||1;for(let j=c.ry;j<c.ry+s;j++)for(let i=c.rx;i<c.rx+s;i++)g.tiles[idx(i,j)]={t:'grass'};}else g.tiles[idx(x,y)]={t:'grass'};
   touch(g);stat(g,'bulldoze');return null;}
  if(c.t===id&&!T.size)return null;                       // schon da – beim Ziehen einfach überspringen
  if(T.once&&built(g,id))throw new Error(`${T.name} gibt es nur einmal in der Stadt.`);
  const p=canPlace(g,id,x,y);if(!p.ok)throw new Error(p.why);
  pay(g,(T.cost||0)+p.trees*TREE_CLEAR,T.name);const s=T.size||1;
  for(let j=y;j<y+s;j++)for(let i=x;i<x+s;i++)g.tiles[idx(i,j)]=s>1?{t:id,rx:x,ry:y,root:i===x&&j===y,part:!(i===x&&j===y)}:{t:id};
  touch(g);stat(g,id);update(g,now);
  return T.size||T.attr>=10?`${T.icon} ${T.name} ist fertig!`:null;},
 upgrade(g,{x,y},now){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t]))throw new Error('Hier gibt es nichts auszubauen.');if(c.lvl>=maxLevel(c))throw new Error(c.t==='house'?'Höher geht es nicht – ein echter Wolkenkratzer!':'Das ist schon die größte Stufe.');
  const next=c.lvl+1,miss=missing(g,x,y,next),sp=spec(g,x,y,next);
  if(miss.length)throw new Error(`Zum Ausbauen fehlt noch: ${miss.map(m=>({road:'Straße',power:'Strom',water:'Wasser',park:'Park',jobs:'Arbeitsplätze',shop:'ein Laden in der Nähe',school:'Schule',fire:'Feuerwehr',police:'Polizei',hospital:'Krankenhaus',bus:'Busbahnhof',clean:'weniger Dreck und Lärm',happy:'zufriedene Bürger',city:`Stadt-Level ${sp.city}`}[m])).join(', ')}.`);
  const name=c.t==='house'?LEVELS[next].name:BIZ[c.t].names[next];pay(g,upgradeCost(c),name);c.lvl=next;c.since=now;touch(g);stat(g,'upgrade');levelUp(g);
  return c.t==='house'?`Ausgebaut: ${name}! Jetzt wohnen hier ${LEVELS[next].people} Leute. 🏗️`:`Ausgebaut: ${name}! ${BIZ[c.t].jobs[next]} Arbeitsplätze. 🏗️`;},
 setTax(g,{tax}){const t=Math.round(+tax);if(!(t>=TAX_MIN&&t<=TAX_MAX))throw new Error(`Der Steuersatz muss zwischen ${TAX_MIN} und ${TAX_MAX} % liegen.`);g.tax=t;touch(g);return null;},
 seenLevelUps(g){g.levelUps=[];return null;},
 renameCity(g,{name}){const n=String(name||'').trim().slice(0,30);if(n.length<2)throw new Error('Der Name ist zu kurz.');g.city.name=n;return`Deine Stadt heißt jetzt ${n}.`;}};

export function act(game,action,now=Date.now()){const g=update(structuredClone(game),now);
 const fn=A[action?.type];if(!fn)return{game,error:'Unbekannte Aktion.',message:null};
 try{const message=fn(g,action,now);return{game:g,error:null,message};}catch(e){return{game,error:e.message||String(e),message:null};}}
