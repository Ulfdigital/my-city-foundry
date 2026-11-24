// My City Foundry – Spieldaten. Stadtaufbau ab etwa 10 Jahren.
export const VERSION=1;
export const SAVE_KEY='my-city-foundry-v1';   // nie ändern – sonst ist der Spielstand weg
export const BUILD='0.3.0';                    // muss zu package.json und version.json passen (Update-Prüfung in der App)
export const MAP_W=64,MAP_H=64;
export const OLD_MAP=40;                       // Städte aus Version 0.1/0.2 (40×40) werden in die Mitte der großen Karte gesetzt
export const START_MONEY=6000;
export const OFFLINE_MAX_H=8;                  // so lange läuft die Stadtkasse weiter, wenn man nicht spielt

// ---------- Stadt-Level: 50 Stufen nach Einwohnern ----------
export const MAX_CITY_LEVEL=50;
export const levelPop=l=>l<=1?0:Math.round(15*Math.pow(l-1,2.3)/5)*5;
export const LEVEL_BONUS=l=>200+l*150;           // Belohnung beim Aufstieg

// ---------- Gebäude ----------
// lvl = ab welchem Stadt-Level · cost = Baukosten · upkeep = Kosten/Min. · size = Größe (1, 2 oder 3 Felder)
// provides + radius = versorgt Häuser im Umkreis · jobs = Arbeitsplätze · attr = Attraktivität · tour = Touristen-Geld/Min.
// once = nur einmal pro Stadt · nearWater = muss am Wasser stehen
export const GROUPS=[
 {id:'hand',name:'Info',icon:'✋'},
 {id:'road',name:'Straße',icon:'🛣️'},
 {id:'zones',name:'Zonen',icon:'🏘️'},
 {id:'supply',name:'Versorgung',short:'Energie',icon:'⚡'},
 {id:'service',name:'Dienste',icon:'🚒'},
 {id:'fun',name:'Freizeit',icon:'🎡'},
 {id:'special',name:'Sondergebäude',short:'Special',icon:'🏛️'},
 {id:'bulldoze',name:'Abriss',icon:'🚜'}];
export const TOOLS=[
 {id:'hand',group:'hand',name:'Ansehen',icon:'✋',lvl:1},
 {id:'road',group:'road',name:'Straße',icon:'🛣️',cost:10,lvl:1},
 {id:'bulldoze',group:'bulldoze',name:'Abreißen',icon:'🚜',cost:5,lvl:1},
 {id:'zone',group:'zones',name:'Wohnen',icon:'🏡',cost:25,lvl:1,text:'Hier ziehen Leute ein.'},
 {id:'zonec',group:'zones',name:'Läden',icon:'🛒',cost:30,lvl:2,text:'Läden und Büros mit Arbeitsplätzen.'},
 {id:'zonei',group:'zones',name:'Fabriken',icon:'🏭',cost:40,lvl:3,text:'Fabriken mit vielen Arbeitsplätzen. Brauchen Strom.'},
 {id:'power',group:'supply',name:'Kraftwerk',icon:'🏭',cost:1500,upkeep:6,radius:12,provides:'power',lvl:2,jobs:20,attr:-3},
 {id:'tower',group:'supply',name:'Wasserturm',icon:'💧',cost:800,upkeep:4,radius:9,provides:'water',lvl:3,jobs:4},
 {id:'wind',group:'supply',name:'Windpark',icon:'🌬️',cost:4000,upkeep:3,radius:14,provides:'power',size:2,lvl:12,jobs:10,attr:2},
 {id:'pump',group:'supply',name:'Wasserwerk',icon:'🚰',cost:5000,upkeep:6,radius:16,provides:'water',size:2,lvl:15,jobs:30},
 {id:'solar',group:'supply',name:'Solarpark',icon:'☀️',cost:9000,upkeep:2,radius:18,provides:'power',size:2,lvl:22,jobs:15,attr:3},
 {id:'school',group:'service',name:'Schule',icon:'🏫',cost:1200,upkeep:5,radius:8,provides:'school',lvl:4,jobs:25,attr:2},
 {id:'fire',group:'service',name:'Feuerwehr',icon:'🚒',cost:1500,upkeep:6,radius:10,provides:'fire',lvl:5,jobs:20,attr:1},
 {id:'police',group:'service',name:'Polizei',icon:'🚓',cost:1500,upkeep:6,radius:10,provides:'police',lvl:6,jobs:20,attr:1},
 {id:'bus',group:'service',name:'Busbahnhof',icon:'🚌',cost:2500,upkeep:5,radius:10,provides:'bus',lvl:8,jobs:15,attr:4},
 {id:'hospital',group:'service',name:'Krankenhaus',icon:'🏥',cost:5000,upkeep:12,radius:12,provides:'hospital',size:2,lvl:9,jobs:120,attr:3},
 {id:'train',group:'service',name:'Bahnhof',icon:'🚉',cost:12000,upkeep:10,size:2,lvl:16,jobs:80,attr:12,tour:30},
 {id:'uni',group:'service',name:'Universität',icon:'🎓',cost:25000,upkeep:20,radius:20,provides:'school',size:2,lvl:24,jobs:300,attr:15,tour:20},
 {id:'park',group:'fun',name:'Park',icon:'🌳',cost:150,upkeep:1,radius:4,provides:'park',lvl:1,attr:1},
 {id:'sport',group:'fun',name:'Sportplatz',icon:'⚽',cost:2000,upkeep:4,radius:6,provides:'park',size:2,lvl:10,jobs:5,attr:5},
 {id:'pool',group:'fun',name:'Schwimmbad',icon:'🏊',cost:4500,upkeep:6,radius:6,provides:'park',size:2,lvl:14,jobs:15,attr:7,tour:10},
 {id:'ferris',group:'fun',name:'Riesenrad',icon:'🎡',cost:9000,upkeep:5,size:2,lvl:26,jobs:10,attr:14,tour:45},
 {id:'zoo',group:'fun',name:'Zoo',icon:'🦒',cost:18000,upkeep:12,radius:6,provides:'park',size:3,lvl:28,jobs:60,attr:20,tour:80},
 {id:'themepark',group:'fun',name:'Freizeitpark',icon:'🎢',cost:40000,upkeep:20,size:3,lvl:34,jobs:200,attr:30,tour:180,once:true},
 {id:'cityhall',group:'special',name:'Rathaus',icon:'🏛️',cost:5000,upkeep:5,size:2,lvl:7,jobs:40,attr:10,once:true},
 {id:'museum',group:'special',name:'Museum',icon:'🖼️',cost:12000,upkeep:6,size:2,lvl:18,jobs:30,attr:12,tour:50},
 {id:'stadium',group:'special',name:'Stadion',icon:'🏟️',cost:30000,upkeep:15,size:3,lvl:20,jobs:120,attr:25,tour:120,once:true},
 {id:'harbor',group:'special',name:'Hafen',icon:'⚓',cost:35000,upkeep:15,size:2,lvl:30,jobs:600,attr:8,tour:60,once:true,nearWater:true},
 {id:'hotel',group:'special',name:'Hotel',icon:'🏨',cost:15000,upkeep:6,size:2,lvl:32,jobs:150,attr:6,tour:90},
 {id:'expo',group:'special',name:'Messe',icon:'🎪',cost:45000,upkeep:15,size:3,lvl:36,jobs:400,attr:15,tour:200,once:true},
 {id:'tvtower',group:'special',name:'Fernsehturm',icon:'🗼',cost:50000,upkeep:8,lvl:38,jobs:40,attr:30,tour:150,once:true},
 {id:'airport',group:'special',name:'Flughafen',icon:'✈️',cost:120000,upkeep:40,size:3,lvl:40,jobs:2000,attr:35,tour:600,once:true},
 {id:'concert',group:'special',name:'Konzerthaus',icon:'🎼',cost:60000,upkeep:12,size:2,lvl:44,jobs:120,attr:25,tour:250,once:true},
 {id:'research',group:'special',name:'Forschungszentrum',icon:'🔬',cost:90000,upkeep:25,size:2,lvl:47,jobs:1200,attr:20,tour:100,once:true},
 {id:'space',group:'special',name:'Raumfahrtzentrum',icon:'🚀',cost:250000,upkeep:50,size:3,lvl:50,jobs:3000,attr:60,tour:1500,once:true}];
export const tool=id=>TOOLS.find(t=>t.id===id);
export const ZONES={zone:'house',zonec:'shop',zonei:'factory'};
export const TREE_CLEAR=10;   // Baum fällen kostet extra

// ---------- Häuser: 6 Stufen ----------
// need = was das Haus für diese Stufe braucht; city = nötiges Stadt-Level
export const LEVELS=[null,
 {name:'Häuschen',people:4,cost:0,need:['road']},
 {name:'Einfamilienhaus',people:8,cost:250,need:['road']},
 {name:'Mehrfamilienhaus',people:20,cost:700,need:['road','power','jobs']},
 {name:'Wohnblock',people:50,cost:1800,need:['road','power','water','jobs','shop','school']},
 {name:'Hochhaus',people:120,cost:4500,need:['road','power','water','jobs','shop','school','park','fire','police','city'],city:11},
 {name:'Wolkenkratzer',people:300,cost:12000,need:['road','power','water','jobs','shop','school','park','fire','police','hospital','city'],city:20}];
export const MAX_LEVEL=6;
// ---------- Läden/Büros und Fabriken ----------
export const BIZ={
 shop:{name:'Laden',names:[null,'Kiosk','Supermarkt','Einkaufszentrum','Bürohaus','Büroturm'],jobs:[0,6,16,40,120,350],tax:[0,3,8,20,50,140],cost:[0,0,500,2000,6000,18000],
  need:[null,['road'],['road','power'],['road','power','water','city'],['road','power','water','fire','police','city'],['road','power','water','fire','police','bus','city']],city:[0,0,0,4,13,22],radius:6},
 factory:{name:'Fabrik',names:[null,'Werkstatt','Fabrik','Großfabrik','Industriepark'],jobs:[0,12,30,80,220],tax:[0,5,12,30,80],cost:[0,0,800,3000,9000],
  need:[null,['road','power'],['road','power','water'],['road','power','water','city'],['road','power','water','fire','city']],city:[0,0,0,5,17]}};
export const bizMax=t=>BIZ[t].names.length-1;
export const NEEDS={road:{icon:'🛣️',text:'Straße direkt am Grundstück'},power:{icon:'⚡',text:'Strom (Kraftwerk, Wind- oder Solarpark in der Nähe)'},water:{icon:'💧',text:'Wasser (Wasserturm oder Wasserwerk in der Nähe)'},
 park:{icon:'🌳',text:'Park oder Freizeit in der Nähe'},jobs:{icon:'💼',text:'genug Arbeitsplätze in der Stadt'},shop:{icon:'🛒',text:'Laden in der Nähe'},school:{icon:'🏫',text:'Schule in der Nähe'},
 fire:{icon:'🚒',text:'Feuerwehr in der Nähe'},police:{icon:'🚓',text:'Polizei in der Nähe'},hospital:{icon:'🏥',text:'Krankenhaus in der Nähe'},bus:{icon:'🚌',text:'Busbahnhof in der Nähe'},city:{icon:'🏙️',text:'höheres Stadt-Level'}};

// ---------- Wirtschaft ----------
export const TAX_PER_PERSON=1;              // Taler pro Einwohner und Minute
export const MOVE_IN_SEC=[8,25];            // so schnell entsteht etwas auf einem Grundstück mit Straße
export const WORKER_SHARE=0.45;             // so viele Einwohner suchen Arbeit
export const FREE_WORKERS=30;               // so viele Arbeitslose verträgt die Stadt, bevor keiner mehr zuzieht
export const SHOP_SHARE=0.18;               // Läden-Arbeitsplätze pro Einwohner, die gebraucht werden
export const FACTORY_SHARE=0.3;             // Fabrik-Arbeitsplätze pro Einwohner, die gebraucht werden
export const ATTR_MOVE=2;                   // je Attraktivitäts-Punkt ziehen so viele Leute zusätzlich gern her

export const CITY_SIZES=[{min:0,name:'Dorf'},{min:100,name:'Kleinstadt'},{min:1000,name:'Stadt'},{min:5000,name:'Großstadt'},{min:20000,name:'Metropole'},{min:80000,name:'Weltstadt'}];
export const citySize=p=>[...CITY_SIZES].reverse().find(c=>p>=c.min);
