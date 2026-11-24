// My City Foundry – Spieldaten. Stadtaufbau ab etwa 10 Jahren.
export const VERSION=1;
export const SAVE_KEY='my-city-foundry-v1';   // nie ändern – sonst ist der Spielstand weg
export const BUILD='0.6.0';                    // muss zu package.json und version.json passen (Update-Prüfung in der App)
export const MAP_W=128,MAP_H=128;             // ganze Welt
export const OLD_MAPS=[40,64];                 // ältere Städte (0.1/0.2: 40×40, 0.3/0.4: 64×64) ziehen in die Mitte der Welt
// ---------- Gebiete: Welt in 8×8 Gebiete zu je 16×16 Feldern; die Mitte (4×4 Gebiete = 64×64) gehört dir von Anfang an ----------
export const SECTOR=16,SECTORS=MAP_W/SECTOR;
export const START_SECTORS=[2,5];               // von Gebiet 2 bis 5 (in x und y) gehört dir alles
export const LAND_LEVEL=12;                     // ab diesem Stadt-Level kann man Land kaufen
export const landPrice=bought=>Math.round(15000*Math.pow(1.3,bought)/500)*500;
export const START_MONEY=6000;
export const OFFLINE_MAX_H=8;                  // so lange läuft die Stadtkasse weiter, wenn man nicht spielt

// ---------- Stadt-Level: 50 Stufen nach Einwohnern ----------
export const MAX_CITY_LEVEL=100;
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
 {id:'mine',name:'Land und Bergbau',short:'Land',icon:'⛰️'},
 {id:'bulldoze',name:'Abriss',icon:'🚜'}];
export const TOOLS=[
 {id:'hand',group:'hand',name:'Ansehen',icon:'✋',lvl:1},
 {id:'road',group:'road',name:'Straße',icon:'🛣️',cost:10,lvl:1,text:'Tippen oder ziehen. Auf Fels kostet sie das Dreifache.'},
 {id:'lanes',group:'road',name:'Straße ausbauen',icon:'🛤️',lvl:6,text:'Mehr Spuren für mehr Verkehr: tippe oder ziehe über eine Straße.'},
 {id:'land',group:'mine',name:'Land kaufen',icon:'🗺️',lvl:12,text:'Kaufe Gebiete neben deiner Stadt – für Dörfer, Bergbau und mehr Platz.'},
 {id:'bulldoze',group:'bulldoze',name:'Abreißen',icon:'🚜',cost:5,lvl:1},
 {id:'zone',group:'zones',name:'Wohnen',icon:'🏡',cost:25,lvl:1,text:'Hier ziehen Leute ein.'},
 {id:'zonec',group:'zones',name:'Läden',icon:'🛒',cost:30,lvl:2,text:'Läden und Büros mit Arbeitsplätzen.'},
 {id:'zonei',group:'zones',name:'Fabriken',icon:'🏭',cost:40,lvl:3,text:'Fabriken mit vielen Arbeitsplätzen. Brauchen Strom.'},
 {id:'power',group:'supply',name:'Kraftwerk',icon:'🏭',cost:1500,upkeep:6,radius:12,provides:'power',lvl:2,jobs:20,attr:-3,dirt:3},
 {id:'tower',group:'supply',name:'Wasserturm',icon:'💧',cost:800,upkeep:4,radius:9,provides:'water',lvl:3,jobs:4},
 {id:'wind',group:'supply',name:'Windpark',icon:'🌬️',cost:4000,upkeep:3,radius:14,provides:'power',size:2,lvl:12,jobs:10,attr:2},
 {id:'pump',group:'supply',name:'Wasserwerk',icon:'🚰',cost:5000,upkeep:6,radius:16,provides:'water',size:2,lvl:15,jobs:30},
 {id:'solar',group:'supply',name:'Solarpark',icon:'☀️',cost:9000,upkeep:2,radius:18,provides:'power',size:2,lvl:22,jobs:15,attr:3},
 {id:'metro',group:'service',name:'U-Bahn-Station',icon:'🚇',cost:15000,upkeep:12,radius:10,provides:'transit',lvl:45,jobs:30,attr:5},
 {id:'school',group:'service',name:'Schule',icon:'🏫',cost:1200,upkeep:5,radius:8,provides:'school',lvl:4,jobs:25,attr:2},
 {id:'fire',group:'service',name:'Feuerwehr',icon:'🚒',cost:1500,upkeep:6,radius:10,provides:'fire',lvl:5,jobs:20,attr:1},
 {id:'police',group:'service',name:'Polizei',icon:'🚓',cost:1500,upkeep:6,radius:10,provides:'police',lvl:6,jobs:20,attr:1},
 {id:'bus',group:'service',name:'Busbahnhof',icon:'🚌',cost:2500,upkeep:5,radius:10,provides:'bus',lvl:8,jobs:15,attr:4,transit:0.25},
 {id:'hospital',group:'service',name:'Krankenhaus',icon:'🏥',cost:5000,upkeep:12,radius:12,provides:'hospital',size:2,lvl:9,jobs:120,attr:3},
 {id:'train',group:'service',name:'Bahnhof',icon:'🚉',cost:12000,upkeep:10,radius:12,provides:'transit',size:2,lvl:16,jobs:80,attr:12,tour:30},
 {id:'uni',group:'service',name:'Universität',icon:'🎓',cost:25000,upkeep:20,radius:20,provides:'school',size:2,lvl:24,jobs:300,attr:15,tour:20},
 {id:'village',group:'fun',name:'Dorfplatz',icon:'⛲',cost:2500,upkeep:2,radius:7,provides:'shop',lvl:15,jobs:10,attr:4,text:'Herz eines neuen Dorfs: Dorfladen und Treffpunkt.'},
 {id:'park',group:'fun',name:'Park',icon:'🌳',cost:150,upkeep:1,radius:4,provides:'park',lvl:1,attr:1},
 {id:'sport',group:'fun',name:'Sportplatz',icon:'⚽',cost:2000,upkeep:4,radius:6,provides:'park',size:2,lvl:10,jobs:5,attr:5},
 {id:'pool',group:'fun',name:'Schwimmbad',icon:'🏊',cost:4500,upkeep:6,radius:6,provides:'park',size:2,lvl:14,jobs:15,attr:7,tour:10},
 {id:'ferris',group:'fun',name:'Riesenrad',icon:'🎡',cost:9000,upkeep:5,size:2,lvl:26,jobs:10,attr:14,tour:45},
 {id:'zoo',group:'fun',name:'Zoo',icon:'🦒',cost:18000,upkeep:12,radius:6,provides:'park',size:3,lvl:28,jobs:60,attr:20,tour:80},
 {id:'themepark',group:'fun',name:'Freizeitpark',icon:'🎢',cost:40000,upkeep:20,size:3,lvl:34,jobs:200,attr:30,tour:180,once:true},
 {id:'cityhall',group:'special',name:'Rathaus',icon:'🏛️',cost:5000,upkeep:5,size:2,lvl:7,jobs:40,attr:10,once:true},
 {id:'museum',group:'special',name:'Museum',icon:'🖼️',cost:12000,upkeep:6,size:2,lvl:18,jobs:30,attr:12,tour:50},
 {id:'stadium',group:'special',name:'Stadion',icon:'🏟️',cost:30000,upkeep:15,size:3,lvl:20,jobs:120,attr:25,tour:120,once:true,dirt:2},
 {id:'harbor',group:'special',name:'Hafen',icon:'⚓',cost:35000,upkeep:15,size:2,lvl:30,jobs:600,attr:8,tour:60,once:true,nearWater:true,dirt:2},
 {id:'hotel',group:'special',name:'Hotel',icon:'🏨',cost:15000,upkeep:6,size:2,lvl:32,jobs:150,attr:6,tour:90},
 {id:'expo',group:'special',name:'Messe',icon:'🎪',cost:45000,upkeep:15,size:3,lvl:36,jobs:400,attr:15,tour:200,once:true},
 {id:'tvtower',group:'special',name:'Fernsehturm',icon:'🗼',cost:50000,upkeep:8,lvl:38,jobs:40,attr:30,tour:150,once:true},
 {id:'airport',group:'special',name:'Flughafen',icon:'✈️',cost:120000,upkeep:40,size:3,lvl:40,jobs:2000,attr:35,tour:600,once:true,dirt:4},
 {id:'concert',group:'special',name:'Konzerthaus',icon:'🎼',cost:60000,upkeep:12,size:2,lvl:44,jobs:120,attr:25,tour:250,once:true},
 {id:'research',group:'special',name:'Forschungszentrum',icon:'🔬',cost:90000,upkeep:25,size:2,lvl:47,jobs:1200,attr:20,tour:100,once:true},
 {id:'space',group:'special',name:'Raumfahrtzentrum',icon:'🚀',cost:250000,upkeep:50,size:3,lvl:50,jobs:3000,attr:60,tour:1500,once:true},
 {id:'cathedral',group:'special',name:'Dom',icon:'⛪',cost:90000,upkeep:10,size:2,lvl:54,jobs:50,attr:35,tour:400,once:true},
 {id:'aquarium',group:'fun',name:'Aquarium',icon:'🐠',cost:120000,upkeep:20,size:2,lvl:66,jobs:200,attr:35,tour:700},
 {id:'botanic',group:'fun',name:'Botanischer Garten',icon:'🌺',cost:160000,upkeep:15,radius:8,provides:'park',size:3,lvl:74,jobs:150,attr:40,tour:800},
 {id:'studio',group:'special',name:'Filmstudio',icon:'🎬',cost:400000,upkeep:50,size:3,lvl:82,jobs:4000,attr:50,tour:3000,once:true},
 {id:'opera',group:'special',name:'Opernhaus',icon:'🎭',cost:900000,upkeep:60,size:2,lvl:92,jobs:600,attr:90,tour:6000,once:true},
 {id:'skytower',group:'special',name:'Aussichtsturm',icon:'🗼',cost:150000,upkeep:15,size:2,lvl:62,jobs:150,attr:40,tour:500,once:true},
 {id:'cruise',group:'special',name:'Kreuzfahrthafen',icon:'🛳️',cost:300000,upkeep:40,size:3,lvl:70,jobs:1500,attr:45,tour:1800,once:true,nearWater:true,dirt:2},
 {id:'bigairport',group:'special',name:'Großflughafen',icon:'🛫',cost:600000,upkeep:120,size:3,lvl:78,jobs:8000,attr:60,tour:4000,once:true,dirt:5},
 {id:'olympia',group:'special',name:'Olympiastadion',icon:'🏅',cost:800000,upkeep:80,size:3,lvl:86,jobs:1500,attr:80,tour:5000,once:true,dirt:2},
 {id:'spaceport',group:'special',name:'Weltraumbahnhof',icon:'🛸',cost:2000000,upkeep:200,size:3,lvl:100,jobs:20000,attr:150,tour:20000,once:true},
 // Bergbau – nur auf Fels (in den Bergen der Außengebiete)
 {id:'quarry',group:'mine',name:'Steinbruch',icon:'🪨',cost:3000,upkeep:3,lvl:14,jobs:40,prod:40,dirt:2,onRock:true},
 {id:'coal',group:'mine',name:'Kohlemine',icon:'⛏️',cost:12000,upkeep:8,size:2,lvl:24,jobs:200,prod:220,dirt:3,onRock:true},
 {id:'ore',group:'mine',name:'Erzmine',icon:'⚒️',cost:40000,upkeep:15,size:2,lvl:38,jobs:500,prod:700,dirt:3,onRock:true},
 {id:'gold',group:'mine',name:'Goldmine',icon:'💰',cost:150000,upkeep:30,size:2,lvl:58,jobs:900,prod:2600,dirt:2,onRock:true}];
export const ROAD_LANES=[null,{name:'Straße',cap:60,cost:10},{name:'Zweispurige Straße',cap:160,cost:60,lvl:6},{name:'Dreispurige Straße',cap:400,cost:200,lvl:18},{name:'Stadtautobahn',cap:1000,cost:600,lvl:32}];
export const ROCK_ROAD=3;                       // Straße auf Fels kostet das Dreifache
export const TRAFFIC_PER_PERSON=0.35,TRAFFIC_PER_JOB=0.25;   // Verkehr, den Einwohner und Arbeitsplätze erzeugen
export const tool=id=>TOOLS.find(t=>t.id===id);
export const ZONES={zone:'house',zonec:'shop',zonei:'factory'};
export const TREE_CLEAR=10;   // Baum fällen kostet extra

// ---------- Häuser: 6 Stufen ----------
// need = was das Haus für diese Stufe braucht; city = nötiges Stadt-Level
export const LEVELS=[null,
 {name:'Häuschen',people:4,cost:0,need:['road']},
 {name:'Einfamilienhaus',people:8,cost:250,need:['road']},
 {name:'Mehrfamilienhaus',people:20,cost:700,need:['road','power','jobs']},
 {name:'Wohnblock',people:50,cost:1800,need:['road','power','water','jobs','shop','school','clean','happy']},
 {name:'Hochhaus',people:120,cost:4500,need:['road','power','water','jobs','shop','school','park','fire','police','clean','happy','traffic','city'],city:11},
 {name:'Wolkenkratzer',people:300,cost:12000,need:['road','power','water','jobs','shop','school','park','fire','police','hospital','clean','happy','traffic','city'],city:20},
 {name:'Megaturm',people:800,cost:40000,need:['road','power','water','jobs','shop','school','park','fire','police','hospital','clean','happy','traffic','transit','city'],city:60}];
export const MAX_LEVEL=7;
// ---------- Läden/Büros und Fabriken ----------
export const BIZ={
 shop:{name:'Laden',names:[null,'Kiosk','Supermarkt','Einkaufszentrum','Bürohaus','Büroturm','Konzernzentrale'],jobs:[0,6,16,40,120,350,1200],tax:[0,3,8,20,50,140,500],cost:[0,0,500,2000,6000,18000,80000],
  need:[null,['road'],['road','power'],['road','power','water','city'],['road','power','water','fire','police','city'],['road','power','water','fire','police','bus','traffic','city'],['road','power','water','fire','police','bus','traffic','transit','city']],city:[0,0,0,4,13,22,68],radius:6},
 factory:{name:'Fabrik',names:[null,'Werkstatt','Fabrik','Großfabrik','Industriepark','Hightech-Park'],jobs:[0,12,30,80,220,700],tax:[0,5,12,30,80,260],cost:[0,0,800,3000,9000,45000],
  need:[null,['road','power'],['road','power','water'],['road','power','water','city'],['road','power','water','fire','city'],['road','power','water','fire','traffic','city']],city:[0,0,0,5,17,52]}};
export const bizMax=t=>BIZ[t].names.length-1;
export const NEEDS={road:{icon:'🛣️',text:'Straße direkt am Grundstück'},power:{icon:'⚡',text:'Strom (Kraftwerk, Wind- oder Solarpark in der Nähe)'},water:{icon:'💧',text:'Wasser (Wasserturm oder Wasserwerk in der Nähe)'},
 park:{icon:'🌳',text:'Park oder Freizeit in der Nähe'},jobs:{icon:'💼',text:'genug Arbeitsplätze in der Stadt'},shop:{icon:'🛒',text:'Laden in der Nähe'},school:{icon:'🏫',text:'Schule in der Nähe'},
 fire:{icon:'🚒',text:'Feuerwehr in der Nähe'},police:{icon:'🚓',text:'Polizei in der Nähe'},hospital:{icon:'🏥',text:'Krankenhaus in der Nähe'},bus:{icon:'🚌',text:'Busbahnhof in der Nähe'},clean:{icon:'🌫️',text:'kein Dreck und Lärm (Fabriken, Kraftwerk, Flughafen weiter weg)'},happy:{icon:'😊',text:'Bürger zufrieden (mindestens 40 %)'},traffic:{icon:'🚗',text:'kein Stau auf der Straße am Haus'},transit:{icon:'🚇',text:'U-Bahn oder Bahnhof in der Nähe'},city:{icon:'🏙️',text:'höheres Stadt-Level'}};

// ---------- Wirtschaft ----------
export const TAX_PER_PERSON=1;              // Taler pro Einwohner und Minute
export const MOVE_IN_SEC=[8,25];            // so schnell entsteht etwas auf einem Grundstück mit Straße
export const WORKER_SHARE=0.45;             // so viele Einwohner suchen Arbeit
export const FREE_WORKERS=30;               // so viele Arbeitslose verträgt die Stadt, bevor keiner mehr zuzieht
export const SHOP_SHARE=0.18;               // Läden-Arbeitsplätze pro Einwohner, die gebraucht werden
export const FACTORY_SHARE=0.3;             // Fabrik-Arbeitsplätze pro Einwohner, die gebraucht werden
export const ATTR_MOVE=2;                   // je Attraktivitäts-Punkt ziehen so viele Leute zusätzlich gern her

// ---------- Steuern, Zufriedenheit, Umwelt (0.4) ----------
export const TAX_DEFAULT=9,TAX_MIN=0,TAX_MAX=20;          // Steuersatz in Prozent; 9 % = normal
export const FACTORY_DIRT=[0,2,2,3,3];                     // Reichweite von Dreck und Lärm je Fabrik-Stufe
export const HAPPY_MIN=40;                                  // ab dieser Zufriedenheit wachsen große Häuser
export const happyText=h=>h>=80?'begeistert':h>=60?'zufrieden':h>=40?'geht so':h>=20?'unzufrieden':'wütend';
export const happyIcon=h=>h>=80?'😄':h>=60?'🙂':h>=40?'😐':h>=20?'🙁':'😠';

export const CITY_SIZES=[{min:0,name:'Dorf'},{min:100,name:'Kleinstadt'},{min:1000,name:'Stadt'},{min:5000,name:'Großstadt'},{min:20000,name:'Metropole'},{min:80000,name:'Weltstadt'},{min:250000,name:'Megacity'}];

// ---------- Bürgermeister-Aufträge und Ereignisse (0.5) ----------
export const TASKS_ACTIVE=3;
export const EVENT_MIN=[20,45];                 // alle 20–45 Minuten Spielzeit ein Ereignis
export const EVENTS=[
 {id:'fest',icon:'🎉',title:'Stadtfest!',text:'Die Bürger feiern auf dem Marktplatz. Die Stadtkasse freut sich über die Einnahmen.',money:m=>m*8},
 {id:'visit',icon:'🤝',title:'Besuch vom Ministerpräsidenten',text:'Er lobt deine Stadt und schenkt dir Fördergeld.',money:m=>m*12,minHappy:60},
 {id:'boom',icon:'🏗️',title:'Bauboom!',text:'Eine Baufirma spendet Geld für neue Projekte.',money:m=>m*6},
 {id:'tourists',icon:'🧳',title:'Reisebusse voller Touristen',text:'Heute ist deine Stadt besonders beliebt.',money:m=>m*5+500},
 {id:'prize',icon:'🏆',title:'Preis für die schönste Stadt',text:'Deine Stadt gewinnt einen Wettbewerb.',money:m=>m*10,minAttr:30},
 {id:'donor',icon:'💌',title:'Spende eines Bürgers',text:'Eine Bürgerin hat im Lotto gewonnen und spendet einen Teil der Stadt.',money:m=>m*4+300}];
export const citySize=p=>[...CITY_SIZES].reverse().find(c=>p>=c.min);
