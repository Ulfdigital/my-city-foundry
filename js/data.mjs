// My City Foundry – Spieldaten. Stadtaufbau ab etwa 10 Jahren.
export const VERSION=1;
export const SAVE_KEY='my-city-foundry-v1';   // nie ändern – sonst ist der Spielstand weg
export const MAP_W=40,MAP_H=40;
export const START_MONEY=6000;
export const OFFLINE_MAX_H=8;                  // so lange läuft die Stadtkasse weiter, wenn man nicht spielt

export const BUILD='0.2.0';                    // muss zu package.json und version.json passen (Update-Prüfung in der App)

// Stadt-Level: wachsen mit den Einwohnern und schalten nach und nach neue Gebäude frei
export const CITY_LEVELS=[null,{pop:0},{pop:30},{pop:80},{pop:200},{pop:500},{pop:1000},{pop:2000},{pop:4000},{pop:8000},{pop:15000}];
export const MAX_CITY_LEVEL=CITY_LEVELS.length-1;
export const LEVEL_BONUS=l=>l*400;               // Belohnung beim Aufstieg

// Werkzeuge / Gebäude. lvl = ab welchem Stadt-Level, cost = Baukosten, upkeep = Kosten pro Minute, radius = Reichweite in Feldern
export const TOOLS=[
 {id:'hand',name:'Ansehen',short:'Info',icon:'✋',lvl:1},
 {id:'road',name:'Straße',icon:'🛣️',cost:10,lvl:1},
 {id:'zone',name:'Wohnen',icon:'🏡',cost:25,lvl:1,text:'Wohngebiet – hier ziehen Leute ein.'},
 {id:'park',name:'Park',icon:'🌳',cost:150,upkeep:1,radius:4,lvl:1},
 {id:'zonec',name:'Läden',icon:'🛒',cost:30,lvl:2,text:'Gewerbegebiet – hier entstehen Läden mit Arbeitsplätzen.'},
 {id:'power',name:'Kraftwerk',short:'Strom',icon:'⚡',cost:1500,upkeep:6,radius:12,lvl:2},
 {id:'zonei',name:'Fabriken',icon:'🏭',cost:40,lvl:3,text:'Industriegebiet – hier entstehen Fabriken mit vielen Arbeitsplätzen. Braucht Strom.'},
 {id:'tower',name:'Wasserturm',short:'Wasser',icon:'💧',cost:800,upkeep:4,radius:9,lvl:3},
 {id:'bulldoze',name:'Abreißen',short:'Abriss',icon:'🚜',cost:5,lvl:1}];
export const tool=id=>TOOLS.find(t=>t.id===id);
export const ZONES={zone:'house',zonec:'shop',zonei:'factory'};
export const TREE_CLEAR=10;   // Baum fällen kostet extra

// Häuser: 6 Stufen. need = was das Haus für diese Stufe braucht; city = nötiges Stadt-Level
export const LEVELS=[null,
 {name:'Häuschen',people:4,cost:0,need:['road']},
 {name:'Einfamilienhaus',people:8,cost:250,need:['road']},
 {name:'Mehrfamilienhaus',people:20,cost:700,need:['road','power','jobs']},
 {name:'Wohnblock',people:50,cost:1800,need:['road','power','water','jobs','shop']},
 {name:'Hochhaus',people:120,cost:4500,need:['road','power','water','jobs','shop','park','city'],city:5},
 {name:'Wolkenkratzer',people:300,cost:12000,need:['road','power','water','jobs','shop','park','city'],city:7}];
export const MAX_LEVEL=6;
// Läden und Fabriken: 3 Stufen mit Arbeitsplätzen und Steuern pro Minute
export const BIZ={
 shop:{name:'Laden',names:[null,'Kiosk','Supermarkt','Einkaufszentrum'],jobs:[0,6,16,40],tax:[0,3,8,20],cost:[0,0,500,2000],need:[null,['road'],['road','power'],['road','power','water','city']],city:[0,0,0,4],radius:6},
 factory:{name:'Fabrik',names:[null,'Werkstatt','Fabrik','Großfabrik'],jobs:[0,12,30,80],tax:[0,5,12,30],cost:[0,0,800,3000],need:[null,['road','power'],['road','power','water'],['road','power','water','city']],city:[0,0,0,5]}};
export const BIZ_MAX=3;
export const NEEDS={road:{icon:'🛣️',text:'Straße direkt am Grundstück'},power:{icon:'⚡',text:'Strom (Kraftwerk in der Nähe)'},water:{icon:'💧',text:'Wasser (Wasserturm in der Nähe)'},
 park:{icon:'🌳',text:'Park in der Nähe'},jobs:{icon:'💼',text:'genug Arbeitsplätze in der Stadt (Läden, Fabriken)'},shop:{icon:'🛒',text:'Laden in der Nähe'},city:{icon:'🏙️',text:'höheres Stadt-Level'}};
export const TAX_PER_PERSON=1;              // Taler pro Einwohner und Minute
export const MOVE_IN_SEC=[8,25];            // so schnell entsteht etwas auf einem Grundstück mit Straße
export const WORKER_SHARE=0.5;              // so viele Einwohner suchen Arbeit
export const FREE_WORKERS=30;               // so viele Arbeitslose verträgt die Stadt, bevor keiner mehr zuzieht
export const SHOP_SHARE=0.2;                // Läden-Arbeitsplätze pro Einwohner, die gebraucht werden
export const FACTORY_SHARE=0.35;            // Fabrik-Arbeitsplätze pro Einwohner, die gebraucht werden

export const CITY_SIZES=[{min:0,name:'Dorf'},{min:100,name:'Kleinstadt'},{min:1000,name:'Stadt'},{min:5000,name:'Großstadt'},{min:20000,name:'Metropole'}];
export const citySize=p=>[...CITY_SIZES].reverse().find(c=>p>=c.min);
