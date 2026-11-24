// My City Foundry – Spieldaten. Stadtaufbau ab etwa 10 Jahren.
export const VERSION=1;
export const SAVE_KEY='my-city-foundry-v1';   // nie ändern – sonst ist der Spielstand weg
export const MAP_W=40,MAP_H=40;
export const START_MONEY=6000;
export const OFFLINE_MAX_H=8;                  // so lange läuft die Stadtkasse weiter, wenn man nicht spielt

// Werkzeuge / Gebäude. cost = Baukosten, upkeep = Kosten pro Minute, radius = Reichweite in Feldern
export const TOOLS=[
 {id:'hand',name:'Ansehen',icon:'✋'},
 {id:'road',name:'Straße',icon:'🛣️',cost:10},
 {id:'zone',name:'Wohngebiet',icon:'🏡',cost:25},
 {id:'power',name:'Kraftwerk',icon:'⚡',cost:1500,upkeep:6,radius:12},
 {id:'tower',name:'Wasserturm',icon:'💧',cost:800,upkeep:4,radius:9},
 {id:'park',name:'Park',icon:'🌳',cost:150,upkeep:1,radius:4},
 {id:'bulldoze',name:'Abreißen',icon:'🚜',cost:5}];
export const tool=id=>TOOLS.find(t=>t.id===id);
export const TREE_CLEAR=10;   // Baum fällen kostet extra

// Häuser: 6 Stufen. need = was das Haus braucht, um diese Stufe zu erreichen
export const LEVELS=[null,
 {name:'Häuschen',people:4,cost:0,need:['road']},
 {name:'Einfamilienhaus',people:8,cost:250,need:['road']},
 {name:'Mehrfamilienhaus',people:20,cost:700,need:['road','power']},
 {name:'Wohnblock',people:50,cost:1800,need:['road','power','water']},
 {name:'Hochhaus',people:120,cost:4500,need:['road','power','water','park']},
 {name:'Wolkenkratzer',people:300,cost:12000,need:['road','power','water','park','city']}];
export const MAX_LEVEL=6;
export const SKYSCRAPER_CITY=1500;          // Wolkenkratzer erst ab so vielen Einwohnern
export const NEEDS={road:{icon:'🛣️',text:'Straße direkt am Haus'},power:{icon:'⚡',text:'Strom (Kraftwerk in der Nähe)'},water:{icon:'💧',text:'Wasser (Wasserturm in der Nähe)'},
 park:{icon:'🌳',text:'Park in der Nähe'},city:{icon:'🏙️',text:`Stadt mit mindestens ${SKYSCRAPER_CITY} Einwohnern`}};
export const TAX_PER_PERSON=1;              // Taler pro Einwohner und Minute
export const MOVE_IN_SEC=[8,25];            // so schnell ziehen Leute auf ein Wohngrundstück mit Straße

export const CITY_SIZES=[{min:0,name:'Dorf'},{min:100,name:'Kleinstadt'},{min:1000,name:'Stadt'},{min:5000,name:'Großstadt'},{min:20000,name:'Metropole'}];
export const citySize=p=>[...CITY_SIZES].reverse().find(c=>p>=c.min);
