// My City Foundry – Spiellogik. Reine Funktionen: act(game, action, now) → {game, error, message}.
import {VERSION,MAP_W,MAP_H,OLD_MAPS,SECTOR,SECTORS,START_SECTORS,LAND_LEVEL,landPrice,START_MONEY,OFFLINE_MAX_H,TOOLS,tool,ZONES,TREE_CLEAR,LEVELS,MAX_LEVEL,BIZ,bizMax,TAX_PER_PERSON,MOVE_IN_SEC,
 MAX_CITY_LEVEL,levelPop,LEVEL_BONUS,WORKER_SHARE,FREE_WORKERS,SHOP_SHARE,FACTORY_SHARE,ATTR_MOVE,TAX_DEFAULT,TAX_MIN,TAX_MAX,FACTORY_DIRT,HAPPY_MIN,
 ROAD_LANES,ROCK_ROAD,TRAFFIC_PER_PERSON,TRAFFIC_PER_JOB,TASKS_ACTIVE,EVENT_MIN,EVENTS,
 FEATURES,GOLDVEIN_BONUS,GOODS,FACTORY_GOODS,LOCAL_PRICE,TRADE_PRICE,WANTED_BONUS,WANTED_MIN,NEIGHBORS} from './data.mjs';

const MIN=6e4,H=36e5;
export function rand(g){let t=(g.seed=(g.seed+0x6D2B79F5)>>>0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
export const idx=(x,y)=>y*MAP_W+x;
export const inside=(x,y)=>x>=0&&y>=0&&x<MAP_W&&y<MAP_H;
export function tile(g,x,y){return inside(x,y)?g.tiles[idx(x,y)]:null;}
const N4=[[1,0],[-1,0],[0,1],[0,-1]];
const touch=g=>{g.rev=(g.rev||0)+1;};   // Karte hat sich geändert → Werte neu berechnen

// ---------- Welt ----------
function nature(g,t,W,H,keep){const set=(x,y,o)=>{if(x<0||y<0||x>=W||y>=H||(keep&&keep(x,y)))return;t[y*W+x]=o;};
 const lake=(lx,ly,rx,ry)=>{for(let y=Math.floor(ly-ry-2);y<=ly+ry+2;y++)for(let x=Math.floor(lx-rx-2);x<=lx+rx+2;x++){const d=((x-lx)/rx)**2+((y-ly)/ry)**2;if(d<1+rand(g)*0.3)set(x,y,{t:'water'});}};
 const lakes=Math.round(W*H/2000);for(let k=0;k<lakes;k++)lake(rand(g)*W,rand(g)*H,2+rand(g)*4,2+rand(g)*3);
 let rxp=W-6;for(let y=0;y<H;y++){rxp+=Math.round(rand(g)*2-1);rxp=Math.max(W-9,Math.min(W-2,rxp));set(rxp,y,{t:'water'});set(rxp+1,y,{t:'water'});}
 // Berge: Fels-Gebiete, vor allem außen
 for(let k=0;k<18;k++){let cx,cy;do{cx=rand(g)*W;cy=rand(g)*H;}while(Math.abs(cx-W/2)<34&&Math.abs(cy-H/2)<34);const r=3+rand(g)*5;
  for(let y=Math.floor(cy-r-2);y<=cy+r+2;y++)for(let x=Math.floor(cx-r-2);x<=cx+r+2;x++)if(Math.hypot(x-cx,y-cy)<r+rand(g)*1.5)set(x,y,{t:'rock'});}
 for(let k=0;k<Math.round(W*H/115);k++){const cx=Math.floor(rand(g)*W),cy=Math.floor(rand(g)*H),r=1+rand(g)*3;
  for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++)if(x>=0&&y>=0&&x<W&&y<H&&t[y*W+x].t==='grass'&&Math.hypot(x-cx,y-cy)<r+rand(g))set(x,y,{t:'tree'});}}
function makeMap(g){const t=Array.from({length:MAP_W*MAP_H},()=>({t:'grass'}));nature(g,t,MAP_W,MAP_H);
 const c=Math.floor(MAP_W/2)-3;for(let y=c-3;y<=c+4;y++)for(let x=c-4;x<=c+5;x++)t[idx(x,y)]={t:'grass'};
 for(let x=c-3;x<=c+4;x++)t[idx(x,c)]={t:'road',lanes:1};
 t[idx(c,c+1)]={t:'house',lvl:1,since:0};g.tiles=t;g.start={x:c,y:c};}
// Ältere, kleinere Stadt in die Mitte der Welt setzen – nichts geht verloren
function migrate(g,n){const off=Math.floor((MAP_W-n)/2),old=g.tiles,t=Array.from({length:MAP_W*MAP_H},()=>({t:'grass'}));
 nature(g,t,MAP_W,MAP_H,(x,y)=>x>=off&&y>=off&&x<off+n&&y<off+n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const c=old[y*n+x];if(c.rx!==undefined){c.rx+=off;c.ry+=off;}t[idx(x+off,y+off)]=c;}
 g.tiles=t;g.start={x:g.start.x+off,y:g.start.y+off};touch(g);}

// ---------- Land ----------
const startLand=()=>Array.from({length:SECTORS*SECTORS},(_,i)=>{const sx=i%SECTORS,sy=Math.floor(i/SECTORS);return sx>=START_SECTORS[0]&&sx<=START_SECTORS[1]&&sy>=START_SECTORS[0]&&sy<=START_SECTORS[1]?1:0;});
export function owns(g,x,y){return inside(x,y)&&g.land[Math.floor(y/SECTOR)*SECTORS+Math.floor(x/SECTOR)]===1;}
export function boughtLand(g){return g.land.reduce((a,v)=>a+v,0)-(START_SECTORS[1]-START_SECTORS[0]+1)**2;}
export function canBuy(g,sx,sy){if(sx<0||sy<0||sx>=SECTORS||sy>=SECTORS||g.land[sy*SECTORS+sx])return false;
 return N4.some(([dx,dy])=>{const x=sx+dx,y=sy+dy;return x>=0&&y>=0&&x<SECTORS&&y<SECTORS&&g.land[y*SECTORS+x]===1;});}
export function sectorPrice(g){return landPrice(boughtLand(g));}
// Versteckte Schätze je Gebiet (Öl, Goldader) – werden einmal ausgewürfelt, sind aber vor dem Kauf sichtbar
function makeSecrets(g){const st=startLand();return Array.from({length:SECTORS*SECTORS},(_,i)=>{const r=rand(g);if(st[i])return r<0.08?'oil':null;return r<0.14?'oil':r<0.24?'goldvein':null;});}
export function sectorOf(x,y){return Math.floor(y/SECTOR)*SECTORS+Math.floor(x/SECTOR);}
export function features(g,sx,sy){const i=sy*SECTORS+sx,f=info(g).feat[i]||[];return g.secrets?.[i]?[...f,g.secrets[i]]:f;}
export function hasFeature(g,x,y,f){return features(g,Math.floor(x/SECTOR),Math.floor(y/SECTOR)).includes(f);}

// ---------- Werte der Stadt (zwischengespeichert, bis sich die Karte ändert) ----------
const cache=new WeakMap();
const PROVIDES=['power','water','park','school','fire','police','hospital','bus','shop','dirt','transit'];
const lanes=c=>c.lanes||1;
export function info(g){const hit=cache.get(g);if(hit&&hit.rev===(g.rev||0))return hit.v;
 const N=MAP_W*MAP_H,S=SECTORS*SECTORS,cnt=Array.from({length:S},()=>({w:0,r:0,t:0})),v={feat:[],goods:{},cap:0,pop:0,dirtyPop:0,jamPop:0,jobs:0,jobsShop:0,jobsFactory:0,upkeep:0,biztax:0,prod:0,attr:0,tour:0,count:{},cover:{},load:new Float32Array(N),jam:new Float32Array(N)};
 for(const p of PROVIDES)v.cover[p]=new Uint8Array(N);
 const stamp=(type,x0,y0,size,r)=>{const cv=v.cover[type];for(let y=Math.max(0,y0-r);y<=Math.min(MAP_H-1,y0+size-1+r);y++)for(let x=Math.max(0,x0-r);x<=Math.min(MAP_W-1,x0+size-1+r);x++){
  const dx=x<x0?x0-x:x>x0+size-1?x-(x0+size-1):0,dy=y<y0?y0-y:y>y0+size-1?y-(y0+size-1):0;if(dx+dy<=r)cv[idx(x,y)]=1;}};
 const base=new Float32Array(N);
 const emit=(x,y,amount)=>{let roads=0;for(const[dx,dy]of N4)if(tile(g,x+dx,y+dy)?.t==='road')roads++;if(!roads)return;for(const[dx,dy]of N4)if(tile(g,x+dx,y+dy)?.t==='road')base[idx(x+dx,y+dy)]+=amount/roads;};
 const gv=g.secrets||[];
 for(let i=0;i<N;i++){const c=g.tiles[i],x=i%MAP_W,y=(i/MAP_W)|0,sc=cnt[sectorOf(x,y)];
  if(c.t==='water')sc.w++;else if(c.t==='rock'||c.rock||tool(c.t)?.onRock)sc.r++;else if(c.t==='tree'||tool(c.t)?.keepTrees)sc.t++;
  if(c.t==='house'){const p=LEVELS[c.lvl].people;v.pop+=p;emit(x,y,p*TRAFFIC_PER_PERSON);continue;}
  if(BIZ[c.t]){const j=BIZ[c.t].jobs[c.lvl];v.jobs+=j;if(c.t==='shop'){v.jobsShop+=j;stamp('shop',x,y,1,BIZ.shop.radius);}else{v.jobsFactory+=j;v.goods.goods=(v.goods.goods||0)+j*FACTORY_GOODS;v.attr-=c.lvl;stamp('dirt',x,y,1,FACTORY_DIRT[Math.min(c.lvl,FACTORY_DIRT.length-1)]);}
   v.biztax+=BIZ[c.t].tax[c.lvl];emit(x,y,j*TRAFFIC_PER_JOB);continue;}
  const T=tool(c.t);if(!T||c.part||c.t==='road')continue;            // Teile großer Gebäude nur einmal (am Ursprung) zählen
  v.count[c.t]=(v.count[c.t]||0)+1;v.upkeep+=T.upkeep||0;v.jobs+=T.jobs||0;v.attr+=T.attr||0;v.tour+=T.tour||0;v.cap+=T.cap||0;
  if(T.prod){const p=T.prod*(T.onRock&&gv[sectorOf(x,y)]==='goldvein'?GOLDVEIN_BONUS:1);v.prod+=p;v.goods[T.good]=(v.goods[T.good]||0)+p;}
  if(T.provides)stamp(T.provides,x,y,T.size||1,T.radius);if(T.dirt)stamp('dirt',x,y,T.size||1,T.dirt);if(T.transit)stamp('bus',x,y,1,T.radius);
  if(T.jobs)emit(x,y,T.jobs*TRAFFIC_PER_JOB*0.4);}
 // Verkehr verteilt sich über das Straßennetz; Bus und Bahn entlasten
 let load=base;for(let k=0;k<4;k++){const nx=new Float32Array(N);for(let i=0;i<N;i++){if(g.tiles[i].t!=='road')continue;const x=i%MAP_W,y=(i/MAP_W)|0;let s=0,n=0;
  for(const[dx,dy]of N4){const j=tile(g,x+dx,y+dy);if(j?.t==='road'){s+=load[idx(x+dx,y+dy)];n++;}}nx[i]=base[i]+(n?0.55*s/n:0);}load=nx;}
 for(let i=0;i<N;i++){if(g.tiles[i].t!=='road')continue;let l=load[i];if(v.cover.transit[i])l*=0.6;else if(v.cover.bus[i])l*=0.75;v.load[i]=l;v.jam[i]=l/ROAD_LANES[lanes(g.tiles[i])].cap;}
 for(let i=0;i<N;i++){const c=g.tiles[i];if(c.t!=='house')continue;const p=LEVELS[c.lvl].people;if(v.cover.dirt[i])v.dirtyPop+=p;if(jammedAt(g,v,i%MAP_W,(i/MAP_W)|0))v.jamPop+=p;}
 v.feat=cnt.map(c=>{const f=[];if(c.w>=10&&c.w<200)f.push('beach');if(c.r>=15)f.push('mountain');if(c.t>=75)f.push('forest');return f;});
 v.attr=Math.max(0,v.attr);cache.set(g,{rev:g.rev||0,v});return v;}
function jammedAt(g,v,x,y){let any=false;for(const[dx,dy]of N4){const c=tile(g,x+dx,y+dy);if(c?.t==='road'){any=true;if(v.jam[idx(x+dx,y+dy)]<=1)return false;}}return any;}
export function jam(g,x,y){return info(g).jam[idx(x,y)]||0;}
export function jammed(g,x,y){return jammedAt(g,info(g),x,y);}

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
// Handel: Nachbarstädte wünschen sich wechselnde Waren (alle 30 Minuten neu)
export function wanted(now){const keys=Object.keys(GOODS),k=Math.floor(now/(WANTED_MIN*MIN));return Object.fromEntries(NEIGHBORS.map((n,i)=>[n.id,keys[(k*3+i*2+i*i)%keys.length]]));}
export function nextWantedChange(now){const p=WANTED_MIN*MIN;return(Math.floor(now/p)+1)*p;}
export function trade(g,now=g.lastAt||Date.now()){const v=info(g),w=new Set(Object.values(wanted(now))),ids=Object.keys(v.goods).filter(k=>v.goods[k]>0);
 const units=ids.reduce((a,k)=>a+v.goods[k],0),share=units?Math.min(1,v.cap/units):0;let revenue=0;
 const list=ids.map(k=>{const u=v.goods[k],sold=u*share,bonus=w.has(k)?WANTED_BONUS:1,r=sold*GOODS[k].value*TRADE_PRICE*bonus+(u-sold)*GOODS[k].value*LOCAL_PRICE;revenue+=r;
  return{id:k,units:Math.round(u),sold:Math.round(sold),wanted:w.has(k),revenue:Math.round(r)};});
 return{list,units:Math.round(units),cap:v.cap,used:Math.round(Math.min(units,v.cap)),revenue:Math.round(revenue)};}
export function finances(g){const v=info(g),f=taxRate(g)/TAX_DEFAULT;const people=Math.round(v.pop*TAX_PER_PERSON*f),biz=Math.round(v.biztax*f),tour=tourism(g),mines=trade(g).revenue;
 return{people,biz,tour,mines,upkeep:v.upkeep,total:people+biz+tour+mines-v.upkeep};}
export function incomePerMin(g){return finances(g).total;}
// Zufriedenheit 0–100: Steuern, Attraktivität, Dreck und Lärm, Stau, Arbeitslose
export function happiness(g){const v=info(g);if(!v.pop)return 60;return Math.max(0,Math.min(100,Math.round(60+mood(g).reduce((a,p)=>a+p.v,0))));}
export function mood(g){const v=info(g),t=taxRate(g),out=[];
 out.push({k:'tax',v:(TAX_DEFAULT-t)*4,text:`Steuern ${t} %`});
 out.push({k:'attr',v:Math.min(20,Math.round(v.attr/5)),text:'Parks, Freizeit und Sehenswürdigkeiten'});
 out.push({k:'dirt',v:-Math.round((v.pop?v.dirtyPop/v.pop:0)*30),text:'Dreck und Lärm in Wohngebieten'});
 out.push({k:'jam',v:-Math.round((v.pop?v.jamPop/v.pop:0)*20),text:'Stau vor der Haustür'});
 const idle=Math.max(0,v.pop*WORKER_SHARE-v.jobs-FREE_WORKERS);out.push({k:'jobs',v:-Math.min(20,Math.round(idle/Math.max(10,v.pop*0.02))),text:'Arbeitslose'});
 return out;}
// Nachfrage wie bei SimCity: > 0 heißt, es wird mehr davon gebraucht
export function demand(g){const v=info(g),w=v.pop*WORKER_SHARE,hp=happiness(g);
 return{house:Math.round(v.jobs+FREE_WORKERS+Math.min(v.attr,150)*ATTR_MOVE-w+(hp-60)*Math.max(1,v.pop/400)),shop:Math.round(v.pop*SHOP_SHARE-v.jobsShop+3),factory:Math.round(v.pop*FACTORY_SHARE-v.jobsFactory+5)};}
export function cityLevel(g){return g.level||1;}
export function nextLevelPop(g){const l=cityLevel(g);return l<MAX_CITY_LEVEL?levelPop(l+1):null;}
export function unlocked(g,id){return cityLevel(g)>=(tool(id)?.lvl||1);}
export function built(g,id){return info(g).count[id]||0;}
function spec(g,x,y,level){const c=tile(g,x,y);if(c.t==='house')return{need:LEVELS[level].need,city:LEVELS[level].city||1};const B=BIZ[c.t];return{need:B.need[level],city:B.city[level]||1};}
export function has(g,x,y,need,city=1){switch(need){case'road':return hasRoad(g,x,y);case'jobs':return demand(g).house>0;case'city':return cityLevel(g)>=city;
 case'clean':return!covered(g,x,y,'dirt');case'happy':return happiness(g)>=HAPPY_MIN;case'traffic':return!jammed(g,x,y);}return covered(g,x,y,need);}
export function missing(g,x,y,level){const s=spec(g,x,y,level);return s.need.filter(n=>!has(g,x,y,n,s.city));}
export function maxLevel(c){return c.t==='house'?MAX_LEVEL:bizMax(c.t);}
export function canUpgrade(g,x,y){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t])||c.lvl>=maxLevel(c))return false;return missing(g,x,y,c.lvl+1).length===0;}
export function upgradeCost(c){const n=c.t==='house'?LEVELS[c.lvl+1]?.cost:BIZ[c.t]?.cost[c.lvl+1];return n??Infinity;}
export function counts(g){const n={};for(const c of g.tiles){if(c.part)continue;const k=c.t==='house'?'house'+c.lvl:c.t;n[k]=(n[k]||0)+1;}return n;}
function levelUp(g){const p=population(g);let l=cityLevel(g);while(l<MAX_CITY_LEVEL&&p>=levelPop(l+1)){l++;const bonus=LEVEL_BONUS(l);g.money+=bonus;
 (g.levelUps=g.levelUps||[]).push({level:l,bonus,tools:TOOLS.filter(t=>t.lvl===l).map(t=>t.id),lanes:ROAD_LANES.findIndex(r=>r?.lvl===l)});}g.level=l;}

// ---------- Bürgermeister-Aufträge ----------
const TASK_KINDS=[
 {k:'pop',w:3,make:(g)=>{const p=population(g);const n=Math.max(p+20,Math.round(p*1.25/10)*10);return{target:n,text:`Erreiche ${n.toLocaleString('de-DE')} Einwohner`,icon:'👥'};}},
 {k:'upgrade',w:3,make:(g)=>{const n=3+Math.floor(rand(g)*5);return{n,text:`Baue ${n} Gebäude aus`,icon:'⬆️'};}},
 {k:'park',w:2,make:(g)=>{const n=1+Math.floor(rand(g)*3);return{n,tool:'park',text:`Lege ${n} ${n>1?'Parks':'Park'} an`,icon:'🌳'};}},
 {k:'road',w:2,make:(g)=>{const n=10+Math.floor(rand(g)*20);return{n,tool:'road',text:`Baue ${n} Straßenfelder`,icon:'🛣️'};}},
 {k:'happy',w:1,make:(g)=>{const n=Math.min(90,Math.max(55,happiness(g)+5));return{target:n,text:`Mache deine Bürger zu ${n} % zufrieden`,icon:'😊'};}},
 {k:'tool',w:3,make:(g)=>{const opts=TOOLS.filter(t=>t.cost&&!t.once&&unlocked(g,t.id)&&!['road','bulldoze','zone','zonec','zonei','park','lanes','land'].includes(t.id));if(!opts.length)return null;const t=opts[Math.floor(rand(g)*opts.length)];return{n:1,tool:t.id,text:`Baue: ${t.name}`,icon:t.icon};}},
 {k:'lanes',w:1,need:g=>unlocked(g,'lanes'),make:(g)=>{const n=5+Math.floor(rand(g)*10);return{n,tool:'lanes',text:`Baue ${n} Straßenfelder aus (mehr Spuren)`,icon:'🛤️'};}},
 {k:'land',w:1,need:g=>unlocked(g,'land'),make:()=>({n:1,tool:'land',text:'Kaufe ein neues Gebiet',icon:'🗺️'})}];
const statKey=t=>t.k==='upgrade'?'upgrade':t.tool;
function newTask(g){const kinds=TASK_KINDS.filter(k=>!k.need||k.need(g));for(let tries=0;tries<20;tries++){const tot=kinds.reduce((a,k)=>a+k.w,0);let r=rand(g)*tot,K=kinds[0];for(const k of kinds){r-=k.w;if(r<0){K=k;break;}}
 const t=K.make(g);if(!t)continue;if((g.tasks||[]).some(o=>o.k===K.k&&o.tool===t.tool))continue;const reward=Math.round((300+cityLevel(g)*cityLevel(g)*40+Math.max(0,incomePerMin(g))*6)/50)*50;
 const task={id:(g.taskId=(g.taskId||0)+1),k:K.k,...t,reward};if(task.n)task.base=g.stats[statKey(task)]||0;return task;}return null;}
export function taskProgress(g,t){if(t.k==='pop')return{have:population(g),need:t.target};if(t.k==='happy')return{have:happiness(g),need:t.target};
 return{have:Math.min(t.n,(g.stats[statKey(t)]||0)-t.base),need:t.n};}
export function taskDone(g,t){const p=taskProgress(g,t);return p.have>=p.need;}
function refreshTasks(g){g.tasks=(g.tasks||[]).filter(Boolean);while(g.tasks.length<TASKS_ACTIVE){const t=newTask(g);if(!t)break;g.tasks.push(t);}}

// ---------- Ereignisse ----------
function events(g,now){if(!g.nextEvent){g.nextEvent=now+(EVENT_MIN[0]+rand(g)*(EVENT_MIN[1]-EVENT_MIN[0]))*MIN;return;}if(now<g.nextEvent||population(g)<20)return;
 const ok=EVENTS.filter(e=>(!e.minHappy||happiness(g)>=e.minHappy)&&(!e.minAttr||attractiveness(g)>=e.minAttr)),e=ok[Math.floor(rand(g)*ok.length)];
 const money=Math.round(e.money(Math.max(10,incomePerMin(g)))/10)*10;g.money+=money;(g.events=g.events||[]).push({id:e.id,icon:e.icon,title:e.title,text:e.text,money,at:now});g.events=g.events.slice(-3);
 g.nextEvent=now+(EVENT_MIN[0]+rand(g)*(EVENT_MIN[1]-EVENT_MIN[0]))*MIN;}

// ---------- Spielstand ----------
export function newGame(now=Date.now(),{cityName='Neustadt'}={},seed=Math.floor(now%2147483647)||1){
 const g={version:VERSION,tax:TAX_DEFAULT,level:1,levelUps:[],city:{name:String(cityName).trim().slice(0,30)||'Neustadt'},money:START_MONEY,seed:seed>>>0,tiles:null,start:null,land:startLand(),secrets:null,tasks:[],events:[],stats:{},rev:0,createdAt:now,lastAt:now,earned:0};
 makeMap(g);g.secrets=makeSecrets(g);refreshTasks(g);return update(g,now);}
export function update(g,now){const dt=Math.max(0,Math.min(now-(g.lastAt||now),OFFLINE_MAX_H*H));
 if(dt>0){const inc=incomePerMin(g)*dt/MIN;g.money=Math.round((g.money+inc)*100)/100;if(inc>0)g.earned=(g.earned||0)+inc;if(g.money<0)g.money=0;}
 // Grundstücke werden bebaut (Straße + Nachfrage, Fabriken brauchen Strom)
 const dem=demand(g);let changed=false;
 for(let i=0;i<g.tiles.length;i++){const c=g.tiles[i];const kind=ZONES[c.t];if(!kind)continue;const x=i%MAP_W,y=Math.floor(i/MAP_W);
  const okHere=hasRoad(g,x,y)&&(kind!=='factory'||covered(g,x,y,'power'))&&dem[kind]>0;
  if(c.ready&&c.ready<=now){if(okHere){g.tiles[i]={t:kind,lvl:1,since:c.ready};changed=true;stat(g,'built_'+kind);
    if(kind==='house')dem.house-=LEVELS[1].people*WORKER_SHARE;else{const j=BIZ[kind].jobs[1];dem[kind]-=j;dem.house+=j;}}else g.tiles[i]={t:c.t};}
  else if(!c.ready&&okHere)g.tiles[i]={...c,ready:now+moveIn(g)};}
 if(changed)touch(g);levelUp(g);events(g,now);
 g.lastAt=Math.max(g.lastAt||0,now);return g;}
export function restore(raw){try{const g=typeof raw==='string'?JSON.parse(raw):raw;if(!g||g.version!==VERSION||!Array.isArray(g.tiles))return null;
 const old=OLD_MAPS.find(n=>g.tiles.length===n*n);if(old)migrate(g,old);else if(g.tiles.length!==MAP_W*MAP_H)return null;
 for(const c of g.tiles)if(c.t==='road'&&!c.lanes)c.lanes=1;
 g.stats=g.stats||{};g.level=g.level||1;g.levelUps=g.levelUps||[];g.rev=g.rev||0;if(g.tax===undefined)g.tax=TAX_DEFAULT;
 if(!Array.isArray(g.land)||g.land.length!==SECTORS*SECTORS)g.land=startLand();if(!Array.isArray(g.secrets))g.secrets=makeSecrets(g);g.events=g.events||[];refreshTasks(g);return g;}catch{return null;}}
const moveIn=g=>Math.round((MOVE_IN_SEC[0]+rand(g)*(MOVE_IN_SEC[1]-MOVE_IN_SEC[0]))*1000);
function stat(g,k,n=1){g.stats[k]=(g.stats[k]||0)+n;}
function pay(g,n,what){if(g.money<n)throw new Error(`Dafür fehlt Geld: ${what} kostet ${Math.ceil(n).toLocaleString('de-DE')} Taler.`);g.money=Math.round((g.money-n)*100)/100;}
function countHouses(g){let n=0;for(const c of g.tiles)if(c.t==='house')n++;return n;}
// Fläche für ein Gebäude prüfen (x,y = obere Ecke)
export function canPlace(g,id,x,y){const T=tool(id),s=T.size||1;let trees=0,water=false;
 for(let j=y;j<y+s;j++)for(let i=x;i<x+s;i++){const c=tile(g,i,j);if(!c)return{ok:false,why:'Das passt nicht mehr auf die Karte.'};
  if(!owns(g,i,j))return{ok:false,why:'Dieses Gebiet gehört dir noch nicht. Kaufe es mit „Land“.'};
  if(c.t==='water')return{ok:false,why:'Auf Wasser kann man nicht bauen.'};
  if(T.anyGround){if(!['grass','tree','rock'].includes(c.t))return{ok:false,why:'Hier steht schon etwas. Erst abreißen.'};continue;}
  if(T.onRock){if(c.t!=='rock')return{ok:false,why:`${T.name} geht nur auf Fels (graue Berge).`};continue;}
  if(c.t==='rock')return{ok:false,why:'Auf Fels geht nur Bergbau oder eine Straße.'};
  if(c.t!=='grass'&&c.t!=='tree')return{ok:false,why:s>1?`Für ${T.name} brauchst du ${s}×${s} freie Felder.`:'Hier steht schon etwas. Erst abreißen.'};if(c.t==='tree'&&!T.keepTrees)trees++;}
 if(T.feature&&!hasFeature(g,x,y,T.feature)){const F=FEATURES[T.feature];return{ok:false,why:`${T.name} geht nur in einem Gebiet mit ${F.icon} ${F.name}.`};}
 if(T.nearWater){for(let j=y-1;j<=y+s;j++)for(let i=x-1;i<=x+s;i++)if(tile(g,i,j)?.t==='water')water=true;if(!water)return{ok:false,why:`${T.name} muss direkt am Wasser stehen.`};}
 return{ok:true,trees};}

const A={
 build(g,{tool:id,x,y},now){const T=tool(id);if(!T||id==='hand')throw new Error('Unbekanntes Werkzeug.');if(!unlocked(g,id))throw new Error(`${T.name} gibt es ab Stadt-Level ${T.lvl}.`);
  const c=tile(g,x,y);if(!c)throw new Error('Außerhalb der Karte.');
  if(id==='land')return A.buyLand(g,{sx:Math.floor(x/SECTOR),sy:Math.floor(y/SECTOR)},now);
  if(id==='bulldoze'){if(c.t==='grass'||c.t==='water'||c.t==='rock')throw new Error('Hier gibt es nichts abzureißen.');if(!owns(g,x,y))throw new Error('Dieses Gebiet gehört dir noch nicht.');
   if(c.t==='house'&&countHouses(g)<=1)throw new Error('Das letzte Haus bleibt stehen.');pay(g,c.t==='tree'?TREE_CLEAR:T.cost,'Abreißen');
   const back=o=>o.rock||tool(o.t)?.onRock?{t:'rock'}:{t:'grass'};
   if(c.rx!==undefined){const s=tool(c.t).size||1;for(let j=c.ry;j<c.ry+s;j++)for(let i=c.rx;i<c.rx+s;i++)g.tiles[idx(i,j)]=back(c);}else g.tiles[idx(x,y)]=back(c);
   touch(g);stat(g,'bulldoze');return null;}
  if(id==='lanes'){if(c.t!=='road')throw new Error('Tippe auf eine Straße, um sie auszubauen.');const n=lanes(c)+1;if(n>=ROAD_LANES.length)throw new Error('Mehr Spuren gehen nicht – das ist schon eine Stadtautobahn.');
   const L=ROAD_LANES[n];if(cityLevel(g)<L.lvl)throw new Error(`${L.name} gibt es ab Stadt-Level ${L.lvl}.`);pay(g,L.cost,L.name);own(g,x,y).lanes=n;touch(g);stat(g,'lanes');return null;}
  if(c.t===id&&!T.size)return null;                       // schon da – beim Ziehen einfach überspringen
  if(id==='road'){if(!owns(g,x,y))throw new Error('Dieses Gebiet gehört dir noch nicht. Kaufe es mit „Land“.');if(c.t==='water')throw new Error('Auf Wasser kann man nicht bauen.');
   if(!['grass','tree','rock'].includes(c.t))throw new Error('Hier steht schon etwas. Erst abreißen.');pay(g,T.cost*(c.t==='rock'?ROCK_ROAD:1)+(c.t==='tree'?TREE_CLEAR:0),T.name);
   g.tiles[idx(x,y)]=c.t==='rock'?{t:'road',lanes:1,rock:true}:{t:'road',lanes:1};touch(g);stat(g,'road');update(g,now);return null;}
  if(T.once&&built(g,id))throw new Error(`${T.name} gibt es nur einmal in der Stadt.`);
  const p=canPlace(g,id,x,y);if(!p.ok)throw new Error(p.why);
  pay(g,(T.cost||0)+p.trees*TREE_CLEAR,T.name);const s=T.size||1;
  for(let j=y;j<y+s;j++)for(let i=x;i<x+s;i++)g.tiles[idx(i,j)]=s>1?{t:id,rx:x,ry:y,root:i===x&&j===y,part:!(i===x&&j===y)}:{t:id};
  touch(g);stat(g,id);update(g,now);
  return T.size||T.attr>=10||T.prod?`${T.icon} ${T.name} ist fertig!`:null;},
 buyLand(g,{sx,sy}){if(!unlocked(g,'land'))throw new Error(`Land kaufen geht ab Stadt-Level ${LAND_LEVEL}.`);if(g.land[sy*SECTORS+sx])throw new Error('Dieses Gebiet gehört dir schon.');
  if(!canBuy(g,sx,sy))throw new Error('Du kannst nur Gebiete direkt neben deinem Land kaufen.');const price=sectorPrice(g);pay(g,price,'Das Gebiet');g.land[sy*SECTORS+sx]=1;touch(g);stat(g,'land');
  return`🗺️ Neues Land gekauft! Hier ist Platz für ein Dorf, Bergbau oder mehr Stadt.`;},
 upgrade(g,{x,y},now){const c=tile(g,x,y);if(!(c?.t==='house'||BIZ[c?.t]))throw new Error('Hier gibt es nichts auszubauen.');if(c.lvl>=maxLevel(c))throw new Error(c.t==='house'?'Höher geht es nicht – ein echter Megaturm!':'Das ist schon die größte Stufe.');
  const next=c.lvl+1,miss=missing(g,x,y,next),sp=spec(g,x,y,next);
  if(miss.length)throw new Error(`Zum Ausbauen fehlt noch: ${miss.map(m=>({road:'Straße',power:'Strom',water:'Wasser',park:'Park',jobs:'Arbeitsplätze',shop:'ein Laden in der Nähe',school:'Schule',fire:'Feuerwehr',police:'Polizei',hospital:'Krankenhaus',bus:'Busbahnhof',clean:'weniger Dreck und Lärm',happy:'zufriedene Bürger',traffic:'weniger Stau (Straße ausbauen)',transit:'U-Bahn oder Bahnhof',city:`Stadt-Level ${sp.city}`}[m])).join(', ')}.`);
  const name=c.t==='house'?LEVELS[next].name:BIZ[c.t].names[next];pay(g,upgradeCost(c),name);const o=own(g,x,y);o.lvl=next;o.since=now;touch(g);stat(g,'upgrade');levelUp(g);
  return c.t==='house'?`Ausgebaut: ${name}! Jetzt wohnen hier ${LEVELS[next].people} Leute. 🏗️`:`Ausgebaut: ${name}! ${BIZ[c.t].jobs[next]} Arbeitsplätze. 🏗️`;},
 claimTask(g,{id}){const t=(g.tasks||[]).find(x=>x.id===id);if(!t)throw new Error('Diesen Auftrag gibt es nicht mehr.');if(!taskDone(g,t))throw new Error('Der Auftrag ist noch nicht erledigt.');
  g.money+=t.reward;stat(g,'tasks');g.tasks=g.tasks.filter(x=>x.id!==id);refreshTasks(g);return`✅ Auftrag erledigt: +${t.reward.toLocaleString('de-DE')} Taler!`;},
 skipTask(g,{id}){g.tasks=(g.tasks||[]).filter(x=>x.id!==id);refreshTasks(g);return null;},
 seenEvents(g){g.events=[];return null;},
 setTax(g,{tax}){const t=Math.round(+tax);if(!(t>=TAX_MIN&&t<=TAX_MAX))throw new Error(`Der Steuersatz muss zwischen ${TAX_MIN} und ${TAX_MAX} % liegen.`);g.tax=t;touch(g);return null;},
 seenLevelUps(g){g.levelUps=[];return null;},
 renameCity(g,{name}){const n=String(name||'').trim().slice(0,30);if(n.length<2)throw new Error('Der Name ist zu kurz.');g.city.name=n;return`Deine Stadt heißt jetzt ${n}.`;}};

// Schnelle Kopie: Felder werden nur ersetzt, nie verändert (siehe own()) – so bleibt das Ziehen von Straßen flüssig
function copy(game){const g={...game,tiles:game.tiles.slice(),land:game.land.slice(),secrets:game.secrets?.slice(),stats:{...game.stats},city:{...game.city},start:{...game.start},
 tasks:(game.tasks||[]).map(t=>({...t})),events:[...(game.events||[])],levelUps:[...(game.levelUps||[])]};const c=cache.get(game);if(c)cache.set(g,c);return g;}
const own=(g,x,y)=>{const i=idx(x,y);return g.tiles[i]={...g.tiles[i]};};
export function act(game,action,now=Date.now()){const g=update(copy(game),now);
 const fn=A[action?.type];if(!fn)return{game,error:'Unbekannte Aktion.',message:null};
 try{const message=fn(g,action,now);return{game:g,error:null,message};}catch(e){return{game,error:e.message||String(e),message:null};}}
