import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,canUpgrade,hasRoad,demand,cityLevel,jobs,unlocked} from '../js/engine.mjs';
import {START_MONEY,SAVE_KEY,MAP_W,MAP_H,tool,LEVELS,MOVE_IN_SEC,CITY_LEVELS,LEVEL_BONUS,BUILD,BIZ} from '../js/data.mjs';
import {readFileSync} from 'node:fs';
const T0=new Date('2026-11-24T10:00:00').getTime(),MIN=6e4;
const ok=(g,a,t=T0)=>{const r=act(g,a,t);assert.equal(r.error,null,JSON.stringify(a)+' → '+r.error);return r.game;};
const bad=(g,a,t=T0)=>{const r=act(g,a,t);assert.ok(r.error,JSON.stringify(a)+' sollte scheitern');return r.error;};
const free=(g,near)=>{for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const c=tile(g,x,y);if(c.t==='grass'&&(!near||hasRoad(g,x,y)))return{x,y};}};

test('Neue Stadt: eigener Name, Startgeld, Straße und ein Haus',()=>{
 const g=newGame(T0,{cityName:'Hamsterrad'});assert.equal(g.city.name,'Hamsterrad');assert.equal(g.money,START_MONEY);assert.equal(SAVE_KEY,'my-city-foundry-v1');
 assert.equal(g.tiles.length,MAP_W*MAP_H);assert.equal(population(g),LEVELS[1].people);const s=g.start;assert.equal(tile(g,s.x,s.y).t,'road');assert.equal(tile(g,s.x,s.y+1).t,'house');
 assert.ok(g.tiles.some(c=>c.t==='water'));assert.ok(g.tiles.some(c=>c.t==='tree'));});

test('Bauen: Straße kostet Geld, nicht auf Wasser, nicht doppelt, Abreißen',()=>{
 let g=newGame(T0);const p=free(g);const m=g.money;g=ok(g,{type:'build',tool:'road',x:p.x,y:p.y});assert.equal(m-g.money,tool('road').cost);
 const w=g.tiles.findIndex(c=>c.t==='water');assert.match(bad(g,{type:'build',tool:'road',x:w%MAP_W,y:Math.floor(w/MAP_W)}),/Wasser/);
 assert.match(bad(g,{type:'build',tool:'park',x:p.x,y:p.y}),/abreißen/);g=ok(g,{type:'build',tool:'bulldoze',x:p.x,y:p.y});assert.equal(tile(g,p.x,p.y).t,'grass');
 g.money=1;assert.match(bad(g,{type:'build',tool:'park',x:p.x,y:p.y}),/Geld/);});

test('Wohngebiet an der Straße: Leute ziehen ein, ohne Straße nicht',()=>{
 let g=newGame(T0);const a=free(g,true);g=ok(g,{type:'build',tool:'zone',x:a.x,y:a.y});assert.equal(tile(g,a.x,a.y).t,'zone');
 g=update(g,T0+MOVE_IN_SEC[1]*1000+1);assert.equal(tile(g,a.x,a.y).t,'house');
 let far=null;for(let y=0;y<MAP_H&&!far;y++)for(let x=0;x<MAP_W;x++){if(tile(g,x,y).t==='grass'&&!hasRoad(g,x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>tile(g,x+dx,y+dy)?.t!=='road')){far={x,y};break;}}
 g=ok(g,{type:'build',tool:'zone',x:far.x,y:far.y},T0+MOVE_IN_SEC[1]*1000+2);g=update(g,T0+10*MIN);assert.equal(tile(g,far.x,far.y).t,'zone');});

const lvl=(g,l)=>{g.level=l;return g;};
test('Level: Gebäude erst nach und nach, Aufstieg mit Einwohnern und Belohnung',()=>{
 let g=newGame(T0);assert.equal(cityLevel(g),1);const p=free(g);
 assert.ok(unlocked(g,'road')&&unlocked(g,'zone')&&unlocked(g,'park'));assert.ok(!unlocked(g,'power')&&!unlocked(g,'zonei'));
 assert.match(bad(g,{type:'build',tool:'power',x:p.x,y:p.y}),/Stadt-Level 2/);
 const m=g.money;for(let i=0;i<g.tiles.length&&population(g)<CITY_LEVELS[3].pop;i++)if(g.tiles[i].t==='grass')g.tiles[i]={t:'house',lvl:2};
 g=update(g,T0+1000);assert.equal(cityLevel(g),3);assert.ok(g.money>=m+LEVEL_BONUS(2)+LEVEL_BONUS(3));assert.deepEqual(g.levelUps.map(l=>l.level),[2,3]);
 assert.ok(g.levelUps[1].tools.includes('zonei'));g=ok(g,{type:'seenLevelUps'});assert.equal(g.levelUps.length,0);});

test('Läden und Fabriken: entstehen bei Nachfrage, Fabriken brauchen Strom, bringen Arbeitsplätze und Steuern',()=>{
 let g=lvl(newGame(T0),3);g.money=1e5;const s=g.start;
 g=ok(g,{type:'build',tool:'zonec',x:s.x+2,y:s.y+1});g=ok(g,{type:'build',tool:'zonei',x:s.x+3,y:s.y+1});
 g=update(g,T0+MOVE_IN_SEC[1]*1000+1);assert.equal(tile(g,s.x+2,s.y+1).t,'shop');assert.equal(tile(g,s.x+3,s.y+1).t,'zonei');
 g=ok(g,{type:'build',tool:'power',x:s.x+3,y:s.y+3},T0+MOVE_IN_SEC[1]*1000+2);g=update(g,T0+2*MOVE_IN_SEC[1]*1000+10);g=update(g,T0+3*MOVE_IN_SEC[1]*1000+20);
 assert.equal(tile(g,s.x+3,s.y+1).t,'factory');assert.equal(jobs(g),BIZ.shop.jobs[1]+BIZ.factory.jobs[1]);
 assert.ok(incomePerMin(g)>population(g)-10);
 g=ok(g,{type:'upgrade',x:s.x+2,y:s.y+1},T0+4*MOVE_IN_SEC[1]*1000);assert.equal(tile(g,s.x+2,s.y+1).lvl,2);});

test('Nachfrage: ohne Arbeitsplätze ziehen irgendwann keine Leute mehr zu',()=>{
 let g=newGame(T0);for(let i=0;i<g.tiles.length&&population(g)<100;i++)if(g.tiles[i].t==='grass')g.tiles[i]={t:'house',lvl:2};
 assert.ok(demand(g).house<=0);assert.ok(demand(g).shop>0);assert.ok(demand(g).factory>0);});

test('Ausbauen bis zum Wolkenkratzer: Strom, Wasser, Arbeit, Laden, Park, Stadt-Level',()=>{
 let g=lvl(newGame(T0),3);g.money=1e6;const s=g.start,h={x:s.x,y:s.y+1};
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,2);assert.match(bad(g,{type:'upgrade',...h}),/Strom/);assert.ok(!canUpgrade(g,h.x,h.y));
 g=ok(g,{type:'build',tool:'power',x:s.x+2,y:s.y+2});g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,3);
 assert.deepEqual(missing(g,h.x,h.y,4),['water','shop']);g=ok(g,{type:'build',tool:'tower',x:s.x+3,y:s.y+2});
 g.tiles[(s.y+1)*MAP_W+s.x+1]={t:'shop',lvl:1};g=ok(g,{type:'upgrade',...h});
 assert.match(bad(g,{type:'upgrade',...h}),/Park/);g=ok(g,{type:'build',tool:'park',x:s.x-1,y:s.y+1});assert.match(bad(g,{type:'upgrade',...h}),/Stadt-Level 5/);
 g.level=5;g.tiles[(s.y+2)*MAP_W+s.x+5]={t:'factory',lvl:3};g.tiles[(s.y+2)*MAP_W+s.x+6]={t:'factory',lvl:3};
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,5);assert.match(bad(g,{type:'upgrade',...h}),/Stadt-Level 7/);
 g.level=7;g.tiles[(s.y+3)*MAP_W+s.x+5]={t:'factory',lvl:3};g.tiles[(s.y+3)*MAP_W+s.x+6]={t:'factory',lvl:3};g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,6);assert.match(bad(g,{type:'upgrade',...h}),/Höher/);});

test('Version ist überall gleich (für die Update-Prüfung in der App)',()=>{
 assert.equal(JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version,BUILD);
 assert.equal(JSON.parse(readFileSync(new URL('../version.json',import.meta.url))).build,BUILD);});

test('Stadtkasse: Steuern pro Minute minus Unterhalt, offline höchstens 8 Stunden',()=>{
 let g=newGame(T0);const m=g.money,inc=incomePerMin(g);g=update(g,T0+10*MIN);assert.equal(Math.round(g.money-m),inc*10);
 g=update(g,T0+100*60*MIN);assert.ok(g.money-m<=inc*8*60+inc*10+1);});

test('Spielstand speichern und laden',()=>{const g=newGame(T0);assert.deepEqual(restore(JSON.stringify(g)),g);assert.equal(restore('x'),null);assert.equal(restore('{"version":9}'),null);});
