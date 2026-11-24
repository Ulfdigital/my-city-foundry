import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,act,update,restore,tile,population,incomePerMin,missing,canUpgrade,hasRoad} from '../js/engine.mjs';
import {START_MONEY,SAVE_KEY,MAP_W,MAP_H,tool,LEVELS,MOVE_IN_SEC,SKYSCRAPER_CITY} from '../js/data.mjs';
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
 g.money=1;assert.match(bad(g,{type:'build',tool:'power',x:p.x,y:p.y}),/Geld/);});

test('Wohngebiet an der Straße: Leute ziehen ein, ohne Straße nicht',()=>{
 let g=newGame(T0);const a=free(g,true);g=ok(g,{type:'build',tool:'zone',x:a.x,y:a.y});assert.equal(tile(g,a.x,a.y).t,'zone');
 g=update(g,T0+MOVE_IN_SEC[1]*1000+1);assert.equal(tile(g,a.x,a.y).t,'house');
 let far=null;for(let y=0;y<MAP_H&&!far;y++)for(let x=0;x<MAP_W;x++){if(tile(g,x,y).t==='grass'&&!hasRoad(g,x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>tile(g,x+dx,y+dy)?.t!=='road')){far={x,y};break;}}
 g=ok(g,{type:'build',tool:'zone',x:far.x,y:far.y},T0+MOVE_IN_SEC[1]*1000+2);g=update(g,T0+10*MIN);assert.equal(tile(g,far.x,far.y).t,'zone');});

test('Ausbauen bis zum Wolkenkratzer: Strom, Wasser, Park, Einwohner',()=>{
 let g=newGame(T0);g.money=1e6;const s=g.start,h={x:s.x,y:s.y+1};
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,2);assert.match(bad(g,{type:'upgrade',...h}),/Strom/);assert.ok(!canUpgrade(g,h.x,h.y));
 g=ok(g,{type:'build',tool:'power',x:s.x+2,y:s.y+2});g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,3);
 assert.deepEqual(missing(g,h.x,h.y,4),['water']);g=ok(g,{type:'build',tool:'tower',x:s.x+3,y:s.y+2});g=ok(g,{type:'upgrade',...h});
 assert.match(bad(g,{type:'upgrade',...h}),/Park/);g=ok(g,{type:'build',tool:'park',x:s.x-1,y:s.y+1});g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,5);
 assert.match(bad(g,{type:'upgrade',...h}),new RegExp(String(SKYSCRAPER_CITY)));
 for(let i=0;i<g.tiles.length&&population(g)<SKYSCRAPER_CITY;i++)if(g.tiles[i].t==='grass')g.tiles[i]={t:'house',lvl:5};
 g=ok(g,{type:'upgrade',...h});assert.equal(tile(g,h.x,h.y).lvl,6);assert.match(bad(g,{type:'upgrade',...h}),/Höher/);});

test('Stadtkasse: Steuern pro Minute minus Unterhalt, offline höchstens 8 Stunden',()=>{
 let g=newGame(T0);const m=g.money,inc=incomePerMin(g);g=update(g,T0+10*MIN);assert.equal(Math.round(g.money-m),inc*10);
 g=update(g,T0+100*60*MIN);assert.ok(g.money-m<=inc*8*60+inc*10+1);});

test('Spielstand speichern und laden',()=>{const g=newGame(T0);assert.deepEqual(restore(JSON.stringify(g)),g);assert.equal(restore('x'),null);assert.equal(restore('{"version":9}'),null);});
