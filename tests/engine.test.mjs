import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,canUpgrade,hasRoad,demand,cityLevel,jobs,unlocked,attractiveness,tourism,covered,built,owns,canBuy,sectorPrice,jam,jammed,taskProgress,taskDone,info} from '../js/engine.mjs';
import {START_MONEY,SAVE_KEY,MAP_W,MAP_H,tool,TOOLS,LEVELS,MOVE_IN_SEC,levelPop,LEVEL_BONUS,BUILD,BIZ,MAX_CITY_LEVEL,OLD_MAPS,SECTOR,SECTORS,ROAD_LANES,LAND_LEVEL} from '../js/data.mjs';
import {readFileSync} from 'node:fs';
const T0=new Date('2026-11-24T10:00:00').getTime(),MIN=6e4;
const ok=(g,a,t=T0)=>{const r=act(g,a,t);assert.equal(r.error,null,JSON.stringify(a)+' → '+r.error);return r.game;};
const bad=(g,a,t=T0)=>{const r=act(g,a,t);assert.ok(r.error,JSON.stringify(a)+' sollte scheitern');return r.error;};
const free=(g,near)=>{for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const c=tile(g,x,y);if(c.t==='grass'&&owns(g,x,y)&&(!near||hasRoad(g,x,y)))return{x,y};}};

test('Neue Stadt: eigener Name, Startgeld, Straße und ein Haus',()=>{
 const g=newGame(T0,{cityName:'Hamsterrad'});assert.equal(g.city.name,'Hamsterrad');assert.equal(g.money,START_MONEY);assert.equal(SAVE_KEY,'my-city-foundry-v1');
 assert.equal(g.tiles.length,MAP_W*MAP_H);assert.equal(population(g),LEVELS[1].people);const s=g.start;assert.equal(tile(g,s.x,s.y).t,'road');assert.equal(tile(g,s.x,s.y+1).t,'house');
 assert.ok(g.tiles.some(c=>c.t==='water'));assert.ok(g.tiles.some(c=>c.t==='tree'));});

test('Bauen: Straße kostet Geld, nicht auf Wasser, nicht doppelt, Abreißen',()=>{
 let g=newGame(T0);const p=free(g);const m=g.money;g=ok(g,{type:'build',tool:'road',x:p.x,y:p.y});assert.equal(m-g.money,tool('road').cost);
 const w=g.tiles.findIndex((c,i)=>c.t==='water'&&owns(g,i%MAP_W,Math.floor(i/MAP_W)));assert.match(bad(g,{type:'build',tool:'road',x:w%MAP_W,y:Math.floor(w/MAP_W)}),/Wasser/);
 assert.match(bad(g,{type:'build',tool:'park',x:p.x,y:p.y}),/abreißen/);g=ok(g,{type:'build',tool:'bulldoze',x:p.x,y:p.y});assert.equal(tile(g,p.x,p.y).t,'grass');
 g.money=1;assert.match(bad(g,{type:'build',tool:'park',x:p.x,y:p.y}),/Geld/);});

test('Wohngebiet an der Straße: Leute ziehen ein, ohne Straße nicht',()=>{
 let g=newGame(T0);const a=free(g,true);g=ok(g,{type:'build',tool:'zone',x:a.x,y:a.y});assert.equal(tile(g,a.x,a.y).t,'zone');
 g=update(g,T0+MOVE_IN_SEC[1]*1000+1);assert.equal(tile(g,a.x,a.y).t,'house');
 let far=null;for(let y=0;y<MAP_H&&!far;y++)for(let x=0;x<MAP_W;x++){if(tile(g,x,y).t==='grass'&&owns(g,x,y)&&!hasRoad(g,x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>tile(g,x+dx,y+dy)?.t!=='road')){far={x,y};break;}}
 g=ok(g,{type:'build',tool:'zone',x:far.x,y:far.y},T0+MOVE_IN_SEC[1]*1000+2);g=update(g,T0+10*MIN);assert.equal(tile(g,far.x,far.y).t,'zone');});

const lvl=(g,l)=>{g.level=l;return g;};
const fill=(g,n,o)=>{for(let i=0;i<g.tiles.length&&population(g)<n;i++)if(g.tiles[i].t==='grass'&&owns(g,i%MAP_W,Math.floor(i/MAP_W))){g.tiles[i]={...o};g.rev++;}};
test('100 Level: Gebäude nach und nach, Aufstieg mit Einwohnern und Belohnung',()=>{
 let g=newGame(T0);assert.equal(cityLevel(g),1);assert.equal(MAX_CITY_LEVEL,100);const p=free(g);
 for(let l=2;l<=100;l++)assert.ok(levelPop(l)>levelPop(l-1));assert.ok(levelPop(100)>500000);
 assert.ok(unlocked(g,'road')&&unlocked(g,'zone')&&unlocked(g,'park'));assert.ok(!unlocked(g,'power')&&!unlocked(g,'airport'));
 assert.match(bad(g,{type:'build',tool:'power',x:p.x,y:p.y}),/Stadt-Level 2/);
 const m=g.money;fill(g,levelPop(3),{t:'house',lvl:2});g=update(g,T0+1000);assert.equal(cityLevel(g),3);
 assert.ok(g.money>=m+LEVEL_BONUS(2)+LEVEL_BONUS(3));assert.deepEqual(g.levelUps.map(l=>l.level),[2,3]);
 assert.ok(g.levelUps[1].tools.includes('zonei'));g=ok(g,{type:'seenLevelUps'});assert.equal(g.levelUps.length,0);
 assert.equal(tool('airport').lvl,40);assert.equal(tool('space').lvl,50);
 const lv=new Set(TOOLS.map(t=>t.lvl));assert.ok(lv.size>=25,'viele Level schalten etwas frei');});

test('Große Gebäude: Flughafen 3×3, nur einmal, Abriss entfernt alles, Hafen nur am Wasser',()=>{
 let g=lvl(newGame(T0),50);g.money=1e7;let spot=null;
 for(let y=0;y<MAP_H-3&&!spot;y++)for(let x=0;x<MAP_W-3;x++){let ok2=true;for(let j=y;j<y+3;j++)for(let i=x;i<x+3;i++)if(tile(g,i,j).t!=='grass'||!owns(g,i,j))ok2=false;if(ok2){spot={x,y};break;}}
 g=ok(g,{type:'build',tool:'airport',...spot});for(let j=0;j<3;j++)for(let i=0;i<3;i++)assert.equal(tile(g,spot.x+i,spot.y+j).t,'airport');
 assert.equal(built(g,'airport'),1);assert.ok(jobs(g)>=2000);assert.ok(tourism(g)>=600);assert.ok(attractiveness(g)>=35);
 assert.match(bad(g,{type:'build',tool:'airport',x:spot.x,y:spot.y+5}),/nur einmal|frei|Wasser|Karte/);
 g=ok(g,{type:'build',tool:'bulldoze',x:spot.x+2,y:spot.y+1});for(let j=0;j<3;j++)for(let i=0;i<3;i++)assert.equal(tile(g,spot.x+i,spot.y+j).t,'grass');
 let dry=null;for(let y=1;y<MAP_H-3&&!dry;y++)for(let x=1;x<MAP_W-3;x++){let ok2=true;for(let j=y-1;j<y+3;j++)for(let i=x-1;i<x+3;i++)if(tile(g,i,j).t!=='grass'||!owns(g,i,j))ok2=false;if(ok2){dry={x,y};break;}}
 assert.match(bad(g,{type:'build',tool:'harbor',...dry}),/am Wasser/);});

test('Dienste versorgen den Umkreis; Attraktivität lockt Leute und Touristen',()=>{
 let g=lvl(newGame(T0),9);g.money=1e6;const s=g.start;assert.ok(!covered(g,s.x,s.y+1,'school'));
 g=ok(g,{type:'build',tool:'school',x:s.x+1,y:s.y+2});assert.ok(covered(g,s.x,s.y+1,'school'));
 const d0=demand(g).house;g=ok(g,{type:'build',tool:'cityhall',x:s.x-4,y:s.y+2});assert.ok(demand(g).house>d0);assert.match(bad(g,{type:'build',tool:'cityhall',x:s.x-4,y:s.y+5}),/nur einmal/);});

test('Alte Städte (40×40 und 64×64) ziehen in die Mitte der Welt – nichts geht verloren',()=>{
 for(const n of OLD_MAPS){const g=newGame(T0);const old={...g,tiles:Array.from({length:n*n},()=>({t:'grass'})),start:{x:17,y:17}};delete old.land;
  old.tiles[17*n+17]={t:'road'};old.tiles[18*n+17]={t:'house',lvl:4};old.tiles[20*n+20]={t:'hospital',rx:20,ry:20,root:true};old.tiles[20*n+21]={t:'hospital',rx:20,ry:20,part:true};
  const r=restore(JSON.stringify(old));assert.equal(r.tiles.length,MAP_W*MAP_H);const off=(MAP_W-n)/2;assert.deepEqual(r.start,{x:17+off,y:17+off});
  assert.equal(tile(r,17+off,18+off).lvl,4);assert.equal(tile(r,17+off,17+off).lanes,1);assert.equal(tile(r,21+off,20+off).rx,20+off);assert.ok(owns(r,17+off,17+off));}});

test('Land kaufen: nur angrenzende Gebiete, ab Level 12, Preis steigt; Bauen nur auf eigenem Land',()=>{
 let g=newGame(T0);g.money=1e7;let out=null;for(let y=0;y<MAP_H&&!out;y++)for(let x=0;x<MAP_W;x++)if(!owns(g,x,y)&&tile(g,x,y).t==='grass'){out={x,y};break;}
 assert.match(bad(g,{type:'build',tool:'road',...out}),/gehört dir noch nicht/);assert.match(bad(g,{type:'buyLand',sx:1,sy:3}),new RegExp('Level '+LAND_LEVEL));
 g.level=LAND_LEVEL;assert.ok(canBuy(g,1,3));assert.ok(!canBuy(g,0,3));const p1=sectorPrice(g);g=ok(g,{type:'buyLand',sx:1,sy:3});assert.ok(owns(g,SECTOR+2,3*SECTOR+2));
 assert.ok(sectorPrice(g)>p1);assert.ok(canBuy(g,0,3));assert.match(bad(g,{type:'buyLand',sx:7,sy:7}),/direkt neben/);});

test('Bergbau: Minen nur auf Fels, bringen Geld; Straße auf Fels kostet mehr',()=>{
 let g=newGame(T0);g.money=1e7;g.level=60;g.land=g.land.map(()=>1);g.rev++;const rock=g.tiles.findIndex(c=>c.t==='rock');assert.ok(rock>=0,'Berge vorhanden');
 const x=rock%MAP_W,y=Math.floor(rock/MAP_W);const grass=free(g);assert.match(bad(g,{type:'build',tool:'quarry',...grass}),/Fels/);assert.match(bad(g,{type:'build',tool:'park',x,y}),/Fels/);
 const before=finances(g).mines;g=ok(g,{type:'build',tool:'quarry',x,y});assert.ok(finances(g).mines>before);g=ok(g,{type:'build',tool:'bulldoze',x,y});assert.equal(tile(g,x,y).t,'rock');
 const m=g.money;g=ok(g,{type:'build',tool:'road',x,y});assert.equal(Math.round(m-g.money),tool('road').cost*3);assert.equal(tile(g,x,y).rock,true);});

test('Verkehr: viele Einwohner verstopfen die Straße; mehr Spuren und Bahn helfen',()=>{
 let g=newGame(T0);g.money=1e7;g.level=40;const s=g.start;
 for(let x=s.x-3;x<=s.x+4;x++){g.tiles[(s.y+1)*MAP_W+x]={t:'house',lvl:5};g.tiles[(s.y-1)*MAP_W+x]={t:'house',lvl:5};}g.rev++;
 assert.ok(jam(g,s.x,s.y)>1,'Stau');assert.ok(jammed(g,s.x,s.y+1));assert.ok(mood(g).find(m=>m.k==='jam').v<0);
 for(let x=s.x-3;x<=s.x+4;x++)for(let k=0;k<3;k++)g=ok(g,{type:'build',tool:'lanes',x,y:s.y});assert.equal(tile(g,s.x,s.y).lanes,4);
 assert.match(bad(g,{type:'build',tool:'lanes',x:s.x,y:s.y}),/Stadtautobahn/);assert.ok(jam(g,s.x,s.y)<1,'kein Stau mehr: '+jam(g,s.x,s.y));
 let h=newGame(T0);h.level=5;assert.match(bad(h,{type:'build',tool:'lanes',x:h.start.x,y:h.start.y}),/Level 6/);});

test('Aufträge: drei aktiv, Fortschritt, Belohnung beim Abholen',()=>{
 let g=newGame(T0);assert.equal(g.tasks.length,3);const t={id:99,k:'park',tool:'park',n:2,base:g.stats.park||0,reward:500,text:'x'};g.tasks[0]=t;
 assert.deepEqual(taskProgress(g,t),{have:0,need:2});assert.match(bad(g,{type:'claimTask',id:99}),/noch nicht/);
 const p=free(g);g=ok(g,{type:'build',tool:'park',...p});const q=free(g);g=ok(g,{type:'build',tool:'park',...q});assert.ok(taskDone(g,g.tasks[0]));
 const m=g.money;g=ok(g,{type:'claimTask',id:99});assert.ok(g.money>=m+500);assert.equal(g.tasks.length,3);assert.ok(!g.tasks.some(x=>x.id===99));});

test('Ereignisse: kommen nach einer Weile und bringen Geld',()=>{
 let g=newGame(T0);fill(g,100,{t:'house',lvl:2});g=update(g,T0+1000);const m=g.money;g=update(g,T0+50*MIN);assert.ok(g.events.length>=1);assert.ok(g.events[0].money>0);});

test('Läden und Fabriken: entstehen bei Nachfrage, Fabriken brauchen Strom, bringen Arbeitsplätze und Steuern',()=>{
 let g=lvl(newGame(T0),3);g.money=1e5;const s=g.start;
 g=ok(g,{type:'build',tool:'zonec',x:s.x+2,y:s.y+1});g=ok(g,{type:'build',tool:'zonei',x:s.x+3,y:s.y+1});
 g=update(g,T0+MOVE_IN_SEC[1]*1000+1);assert.equal(tile(g,s.x+2,s.y+1).t,'shop');assert.equal(tile(g,s.x+3,s.y+1).t,'zonei');
 g=ok(g,{type:'build',tool:'power',x:s.x+3,y:s.y+3},T0+MOVE_IN_SEC[1]*1000+2);g=update(g,T0+2*MOVE_IN_SEC[1]*1000+10);g=update(g,T0+3*MOVE_IN_SEC[1]*1000+20);
 assert.equal(tile(g,s.x+3,s.y+1).t,'factory');assert.equal(jobs(g,'shop')+jobs(g,'factory'),BIZ.shop.jobs[1]+BIZ.factory.jobs[1]);
 assert.ok(incomePerMin(g)>population(g)-10);
 g=ok(g,{type:'upgrade',x:s.x+2,y:s.y+1},T0+4*MOVE_IN_SEC[1]*1000);assert.equal(tile(g,s.x+2,s.y+1).lvl,2);});

test('Nachfrage: ohne Arbeitsplätze ziehen irgendwann keine Leute mehr zu',()=>{
 let g=newGame(T0);fill(g,120,{t:'house',lvl:2});
 assert.ok(demand(g).house<=0);assert.ok(demand(g).shop>0);assert.ok(demand(g).factory>0);});

test('Ausbauen bis zum Wolkenkratzer: Versorgung, Dienste, Stadt-Level',()=>{
 let g=lvl(newGame(T0),3);g.money=1e7;const s=g.start,h={x:s.x,y:s.y+1};
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,2);assert.match(bad(g,{type:'upgrade',...h}),/Strom/);assert.ok(!canUpgrade(g,h.x,h.y));
 g=ok(g,{type:'build',tool:'power',x:s.x+7,y:s.y+2});g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,3);
 g=ok(g,{type:'build',tool:'tower',x:s.x+3,y:s.y+2});g.tiles[(s.y+1)*MAP_W+s.x+1]={t:'shop',lvl:1};g.rev++;
 assert.deepEqual(missing(g,h.x,h.y,4),['school']);g.level=9;g=ok(g,{type:'build',tool:'school',x:s.x+4,y:s.y+2});g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,4);
 g=ok(g,{type:'build',tool:'park',x:s.x-1,y:s.y+1});g=ok(g,{type:'build',tool:'fire',x:s.x+5,y:s.y+2});g=ok(g,{type:'build',tool:'police',x:s.x+6,y:s.y+2});
 for(const[dx,dy]of[[5,3],[6,3],[5,4],[6,4]]){g.tiles[(s.y+dy)*MAP_W+s.x+dx]={t:'factory',lvl:4};}g.rev++;
 assert.match(bad(g,{type:'upgrade',...h}),/Stadt-Level 11/);g.level=11;g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,5);
 g.level=20;assert.match(bad(g,{type:'upgrade',...h}),/Krankenhaus/);g=ok(g,{type:'build',tool:'hospital',x:s.x+2,y:s.y+4});
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,6);assert.match(bad(g,{type:'upgrade',...h}),/Stadt-Level 60/);});

test('Version ist überall gleich (für die Update-Prüfung in der App)',()=>{
 assert.equal(JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version,BUILD);
 assert.equal(JSON.parse(readFileSync(new URL('../version.json',import.meta.url))).build,BUILD);});

test('Stadtkasse: Steuern pro Minute minus Unterhalt, offline höchstens 8 Stunden',()=>{
 let g=newGame(T0);const m=g.money,inc=incomePerMin(g);g=update(g,T0+10*MIN);assert.equal(Math.round(g.money-m),inc*10);
 g=update(g,T0+100*60*MIN);assert.ok(g.money-m<=inc*8*60+inc*10+1);});

test('Spielstand speichern und laden',()=>{const g=newGame(T0);assert.deepEqual(restore(JSON.stringify(g)),g);assert.equal(restore('x'),null);assert.equal(restore('{"version":9}'),null);});

import {taxRate,finances,happiness,mood} from '../js/engine.mjs';
import {TAX_DEFAULT,HAPPY_MIN} from '../js/data.mjs';
test('Steuern: höherer Satz bringt mehr Geld, macht aber unzufrieden; Grenzen 0–20 %',()=>{
 let g=newGame(T0);fill(g,300,{t:'house',lvl:2});assert.equal(taxRate(g),TAX_DEFAULT);const f0=finances(g).people,h0=happiness(g);
 g=ok(g,{type:'setTax',tax:15});assert.ok(finances(g).people>f0);assert.ok(happiness(g)<h0);
 g=ok(g,{type:'setTax',tax:4});assert.ok(finances(g).people<f0);assert.ok(happiness(g)>h0);
 assert.match(bad(g,{type:'setTax',tax:25}),/zwischen/);const h=happiness(g);assert.ok(h>=0&&h<=100);assert.ok(mood(g).length>=3);
 const old=newGame(T0);delete old.tax;assert.equal(restore(JSON.stringify(old)).tax,TAX_DEFAULT);});

test('Umwelt: neben Fabriken wachsen keine großen Häuser; Dreck macht unzufrieden',()=>{
 let g=lvl(newGame(T0),9);g.money=1e7;const s=g.start,h={x:s.x,y:s.y+1};
 g=ok(g,{type:'build',tool:'power',x:s.x+8,y:s.y+2});g=ok(g,{type:'build',tool:'tower',x:s.x+3,y:s.y+3});g=ok(g,{type:'build',tool:'school',x:s.x+4,y:s.y+3});
 g.tiles[(s.y+1)*MAP_W+s.x+1]={t:'shop',lvl:1};g.tiles[(s.y+1)*MAP_W+s.x-1]={t:'factory',lvl:3};g.tiles[h.y*MAP_W+h.x].lvl=3;g.rev++;
 assert.ok(missing(g,h.x,h.y,4).includes('clean'));const hp=happiness(g);
 g.tiles[(s.y+1)*MAP_W+s.x-1]={t:'grass'};g.rev++;assert.ok(!missing(g,h.x,h.y,4).includes('clean'));assert.ok(happiness(g)>=hp);
 g.tax=20;g.rev++;if(happiness(g)<HAPPY_MIN)assert.ok(missing(g,h.x,h.y,4).includes('happy'));});
