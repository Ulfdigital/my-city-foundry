// My City Foundry – Töne und Musik, direkt im Browser erzeugt (keine Dateien, kein Download).
// Startet erst nach dem ersten Tippen (so wollen es Browser und iPhone).
const KEY='my-city-foundry-settings';
export const settings=(()=>{try{return{sound:true,music:true,daynight:true,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return{sound:true,music:true,daynight:true};}})();
export function saveSettings(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}

let A=null,master=null,musicGain=null,timer=null,nextNote=0,step=0;
function ac(){if(A)return A;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;A=new C();master=A.createGain();master.gain.value=0.8;master.connect(A.destination);
 musicGain=A.createGain();musicGain.gain.value=0.0;musicGain.connect(master);return A;}
export function unlock(){const a=ac();if(!a)return;if(a.state==='suspended')a.resume();if(settings.music)startMusic();}

// Ein einzelner Ton mit sanftem Ein- und Ausklang
function tone(freq,dur,{type='sine',vol=0.15,at=0,dest=null,slide=0}={}){const a=ac();if(!a)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();
 o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(freq*slide,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur+0.05);}

const SFX={
 build:()=>{tone(523,0.09,{type:'triangle',vol:0.12});tone(784,0.12,{type:'sine',vol:0.08,at:0.05});},
 road:()=>tone(330,0.05,{type:'triangle',vol:0.06}),
 click:()=>tone(880,0.04,{type:'sine',vol:0.05}),
 coin:()=>{tone(988,0.08,{type:'square',vol:0.05});tone(1319,0.16,{type:'square',vol:0.05,at:0.07});},
 level:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,0.22,{type:'triangle',vol:0.12,at:i*0.11}));tone(1568,0.4,{type:'sine',vol:0.06,at:0.45});},
 upgrade:()=>{tone(392,0.1,{type:'triangle',vol:0.1});tone(587,0.18,{type:'triangle',vol:0.1,at:0.08});},
 error:()=>tone(160,0.16,{type:'square',vol:0.05,slide:0.8}),
 bulldoze:()=>{tone(120,0.18,{type:'sawtooth',vol:0.05,slide:0.6});tone(90,0.2,{type:'square',vol:0.03,at:0.05});},
 event:()=>{[784,988,1175].forEach((f,i)=>tone(f,0.18,{type:'sine',vol:0.08,at:i*0.09}));}};
export function sfx(name){if(!settings.sound)return;try{ac();SFX[name]?.();}catch{}}

// Ruhige Hintergrundmusik: Pentatonik-Melodie über weichen Akkorden, wird nie langweilig (zufällig erzeugt)
const SCALE=[0,2,4,7,9,12,14,16];const ROOTS=[60,57,62,55];   // C, A, D, G
const mtof=m=>440*Math.pow(2,(m-69)/12);
let night=false;export function setMusicMood(n){night=n;}
function schedule(){const a=A;if(!a)return;const beat=0.62;
 while(nextNote<a.currentTime+0.6){const bar=Math.floor(step/8),root=ROOTS[bar%4]-(night?12:0),at=nextNote-a.currentTime;
  if(step%8===0)for(const iv of[0,7,16])tone(mtof(root-12+iv),beat*7.5,{type:'sine',vol:0.035,at,dest:musicGain});
  if(Math.random()<(night?0.45:0.7)){const n=root+SCALE[Math.floor(Math.random()*SCALE.length)];tone(mtof(n),beat*(Math.random()<0.3?2:1)*0.95,{type:'triangle',vol:0.05,at,dest:musicGain});}
  nextNote+=beat;step++;}}
export function startMusic(){const a=ac();if(!a||timer)return;nextNote=a.currentTime+0.1;musicGain.gain.cancelScheduledValues(a.currentTime);musicGain.gain.setTargetAtTime(0.9,a.currentTime,1.2);
 timer=setInterval(schedule,200);}
export function stopMusic(){if(!A||!timer)return;clearInterval(timer);timer=null;musicGain.gain.setTargetAtTime(0.0,A.currentTime,0.3);}
document.addEventListener('visibilitychange',()=>{if(!A)return;if(document.visibilityState==='hidden'){stopMusic();A.suspend?.();}else{A.resume?.();if(settings.music)startMusic();}});
