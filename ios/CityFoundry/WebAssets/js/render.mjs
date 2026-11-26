// My City Foundry – Zeichnen der Stadt in schräger Draufsicht (isometrisch) auf einem Canvas.
import {MAP_W,MAP_H,LEVELS,NEEDS,BIZ,tool,SECTOR,SECTORS,FEATURES,NEIGHBORS,GOODS} from './data.mjs';
import {tile,idx,missing,maxLevel,upgradeCost,covered,owns,canBuy,sectorPrice,info,features,wanted} from './engine.mjs';

export const TW=64,TH=32;
// ---------- Tag und Nacht, Jahreszeiten, Wetter ----------
export const DAY_MS=20*60*1000;   // ein Spieltag dauert 20 Minuten
export function dayNight(now){const p=(now%DAY_MS)/DAY_MS;   // 0–0,55 Tag, dann Abend, Nacht, Morgen
 const night=p<0.55?0:p<0.65?(p-0.55)/0.1:p<0.9?1:1-(p-0.9)/0.1;return{p,night,dusk:p>=0.53&&p<0.67||p>=0.88&&p<0.97,label:p<0.55?'Tag':p<0.65?'Abend':p<0.9?'Nacht':'Morgen'};}
export function season(now){const m=new Date(now).getMonth();return m===11||m<=1?'winter':m<=4?'spring':m<=7?'summer':'autumn';}
export const SEASONS={winter:{icon:'❄️',name:'Winter'},spring:{icon:'🌸',name:'Frühling'},summer:{icon:'☀️',name:'Sommer'},autumn:{icon:'🍂',name:'Herbst'}};
export const WEATHER={sun:{icon:'☀️',name:'Sonnig'},cloud:{icon:'☁️',name:'Bewölkt'},rain:{icon:'🌧️',name:'Regen'},snow:{icon:'🌨️',name:'Schnee'}};
const hash1=n=>{n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return(n>>>0)/4294967296;};
export function weather(now){const s=season(now),r=hash1(Math.floor(now/(6*60*1000)));   // alle 6 Minuten neues Wetter
 const t={winter:[['snow',.35],['cloud',.3],['sun',.35]],spring:[['rain',.15],['cloud',.25],['sun',.6]],summer:[['rain',.1],['cloud',.2],['sun',.7]],autumn:[['rain',.25],['cloud',.35],['sun',.4]]}[s];
 let a=0;for(const[k,pr]of t){a+=pr;if(r<a)return k;}return'sun';}
let SEASON='summer',LIGHTS=false;
// Karte drehen (0–3 = 0°, 90°, 180°, 270°): alle Umrechnungen Feld ↔ Bildschirm laufen über die Ansicht (u, v)
let ROT=0;const NM=MAP_W;
export function setRotation(r){ROT=((Math.round(r)%4)+4)%4;}
export const getRotation=()=>ROT;
export const vpt=(x,y)=>ROT===0?[x,y]:ROT===1?[NM-y,x]:ROT===2?[NM-x,NM-y]:[y,NM-x];     // Welt → Ansicht
const wpt=(u,v)=>ROT===0?[u,v]:ROT===1?[v,NM-u]:ROT===2?[NM-u,NM-v]:[NM-v,u];            // Ansicht → Welt
const rvec=(dx,dy)=>ROT===0?[dx,dy]:ROT===1?[-dy,dx]:ROT===2?[-dx,-dy]:[dy,-dx];          // Richtung Welt → Ansicht
const wvec=(du,dv)=>ROT===0?[du,dv]:ROT===1?[dv,-du]:ROT===2?[-du,-dv]:[-dv,du];          // Richtung Ansicht → Welt
export const cellTop=(x,y)=>{const[u,v]=vpt(x,y);return{x:(u-v)*TW/2,y:(u+v)*TH/2};};
export function screenToCell(cam,sx,sy){const wx=(sx-cam.x)/cam.z,wy=(sy-cam.y)/cam.z,u=wx/(TW/2),v=wy/(TH/2),[x,y]=wpt((v+u)/2,(v-u)/2);return{x:Math.floor(x),y:Math.floor(y)};}
// Bildschirmpunkt → genaue Kartenstelle (mit Komma), für Drehen um die Finger
export function screenToPoint(cam,sx,sy){const wx=(sx-cam.x)/cam.z,wy=(sy-cam.y)/cam.z,u=wx/(TW/2),v=wy/(TH/2);return wpt((v+u)/2,(v-u)/2);}
// Kamera so setzen, dass die Kartenstelle p genau am Bildschirmpunkt (sx, sy) liegt
export function pinTo(cam,p,sx,sy){const q=cellTop(p[0],p[1]);cam.x=sx-q.x*cam.z;cam.y=sy-q.y*cam.z;}
export function centerOn(cam,x,y,w,h){const p=cellTop(x+0.5,y+0.5);cam.x=w/2-p.x*cam.z;cam.y=h/2-p.y*cam.z;}

const hash=(x,y)=>{let h=(x*73856093)^(y*19349663);h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967296;};
const WALLS=[['#f4e3c1','#e3cc9f'],['#f2d0c4','#dfb3a4'],['#dfe8f0','#c3d0dc'],['#f5f0e6','#ddd5c4'],['#e8ddf0','#cfc0dc'],['#d9ecd5','#bdd6b7']];
const ROOFS=['#c4543a','#a8452f','#6a5a52','#3f6e8c','#7a4a33'];
const GLASS=['#7fb3d9','#6aa0c8','#8cc0dc'];

function diamond(ctx,cx,cy,hw,hh){ctx.beginPath();ctx.moveTo(cx,cy-hh);ctx.lineTo(cx+hw,cy);ctx.lineTo(cx,cy+hh);ctx.lineTo(cx-hw,cy);ctx.closePath();}
function shade(hex,f){const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))));return`rgb(${c})`;}

// Quader auf der Grundfläche (Mitte cx,cy), halbe Breite hw, halbe Tiefe hh, Höhe z
function box(ctx,cx,cy,hw,hh,z,wall,top){
 ctx.fillStyle=shade(wall,0.78);ctx.beginPath();ctx.moveTo(cx-hw,cy);ctx.lineTo(cx,cy+hh);ctx.lineTo(cx,cy+hh-z);ctx.lineTo(cx-hw,cy-z);ctx.closePath();ctx.fill();
 ctx.fillStyle=wall;ctx.beginPath();ctx.moveTo(cx,cy+hh);ctx.lineTo(cx+hw,cy);ctx.lineTo(cx+hw,cy-z);ctx.lineTo(cx,cy+hh-z);ctx.closePath();ctx.fill();
 ctx.fillStyle=top||shade(wall,1.1);diamond(ctx,cx,cy-z,hw,hh);ctx.fill();}
// Fenster auf beiden sichtbaren Seiten: rows Reihen, cols Spalten zwischen z0 und z1
function windows(ctx,cx,cy,hw,hh,z0,z1,rows,cols,color,lit){const night=LIGHTS;if(night)ctx.globalAlpha=1;
 const fh=(z1-z0)/rows;
 for(const side of[0,1])for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const t0=(c+0.22)/cols,t1=(c+0.78)/cols,v0=z0+r*fh+fh*0.22,v1=z0+r*fh+fh*0.78;
  const P=(t,v)=>side?{x:cx+t*hw,y:cy+hh-t*hh-v}:{x:cx-hw+t*hw,y:cy+t*hh-v};
  const a=P(t0,v0),b=P(t1,v0),d=P(t1,v1),e=P(t0,v1);
  const on=(r*7+c*3+side+Math.round(cx))%3!==0;if(night){if(!on)continue;ctx.fillStyle='#ffd877';}else ctx.fillStyle=lit&&((r*7+c*3+side)%5===0)?'#ffe9a8':(side?color:shade(color,0.8));
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.closePath();ctx.fill();}if(night)ctx.globalAlpha=0;}
function pyramidRoof(ctx,cx,cy,hw,hh,z,rh,color){const ap={x:cx,y:cy-z-rh};
 ctx.fillStyle=shade(color,0.8);ctx.beginPath();ctx.moveTo(cx-hw-2,cy-z);ctx.lineTo(cx,cy+hh-z+1);ctx.lineTo(ap.x,ap.y);ctx.closePath();ctx.fill();
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(cx,cy+hh-z+1);ctx.lineTo(cx+hw+2,cy-z);ctx.lineTo(ap.x,ap.y);ctx.closePath();ctx.fill();}
function tree(ctx,x,y,s=1){const h=((x*7.3+y*3.1)%1+1)%1;ctx.fillStyle='#6b4a2e';ctx.fillRect(x-1.5*s,y-8*s,3*s,8*s);
 const[c1,c2]=SEASON==='winter'?['#e4ecf0','#ffffff']:SEASON==='autumn'?(h<0.33?['#d9822b','#f0a33c']:h<0.66?['#c0502a','#df6b3a']:['#c9a227','#e3c04a']):['#3f8a3a','#57a64a'];
 ctx.fillStyle=c1;ctx.beginPath();ctx.arc(x,y-12*s,7*s,0,7);ctx.fill();ctx.fillStyle=c2;ctx.beginPath();ctx.arc(x-2*s,y-14*s,4*s,0,7);ctx.fill();
 if(SEASON==='spring'&&h<0.5){ctx.fillStyle='#ffc0d8';for(const[a,b]of[[3,-14],[-4,-10],[1,-9]]){ctx.beginPath();ctx.arc(x+a*s,y+b*s,1.3*s,0,7);ctx.fill();}}}

// ---------- Brücken und Tunnel ----------
let GHOST=false,G=null;   // beim Straßenbau: Gebäude durchsichtig, Tunnel offen
const isTunnel=c=>!!c&&(c.t==='road'||c.t==='rail')&&!!c.rock;
const isWay=c=>!!c&&(c.t==='road'||c.t==='rail'||c.t==='train');
// Brücke: Fahrbahn über dem Wasser, Seitenkante und Pfeiler vorne, Geländer wo es nicht weitergeht
function bridgeDeck(ctx,c,x,y,cx,cy){const T=[cx,cy-TH/2],R=[cx+TW/2,cy],B=[cx,cy+TH/2],L=[cx-TW/2,cy];
 const nb=(du,dv)=>{const[dx,dy]=wvec(du,dv);return tile(G,x+dx,y+dy);};
 const deck=c.t==='road'?['','#8d9096','#7d8086','#6c6f75','#55585e'][c.lanes||1]:'#9a8f80';
 const front=[[L,B,nb(0,1)],[B,R,nb(1,0)]];
 for(const[a,b,n]of front)if(!n?.bridge){fillPoly(ctx,[a,b,[b[0],b[1]+4],[a[0],a[1]+4]],'#6b6257');}                       // Seitenkante
 if(!nb(0,1)?.bridge||!nb(1,0)?.bridge){ctx.fillStyle='#7a7166';ctx.fillRect(cx-2.5,cy+TH/2+3,5,6);}                       // Pfeiler im Wasser
 fillPoly(ctx,[T,R,B,L],deck);
 for(const[a,b,n]of[[T,R,nb(0,-1)],[R,B,nb(1,0)],[B,L,nb(0,1)],[L,T,nb(-1,0)]]){if(isWay(n))continue;                       // Geländer
  strokeLine(ctx,[[a[0],a[1]-4],[b[0],b[1]-4]],'#e8e4da',1.2);for(let s=0;s<=1.001;s+=0.25){const p=[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s];strokeLine(ctx,[p,[p[0],p[1]-4]],'#cfc9bd',0.8);}}}
// Tunnelportal an jeder Seite, an der die Straße oder Schiene aus dem Berg kommt
function portals(ctx,g,x,y,c){for(const[dx,dy]of DIRS){const n=tile(g,x+dx,y+dy);if(!n||isTunnel(n))continue;
  if(c.t==='road'?n.t!=='road':!linked(g,x,y,dx,dy))continue;
  const E=[x+0.5+dx*0.5,y+0.5+dy*0.5],e=[-dy,dx],arch=(w,h)=>{const ps=[];for(let i=0;i<=12;i++){const a=Math.PI*i/12;ps.push(W([E[0]+e[0]*w*Math.cos(a),E[1]+e[1]*w*Math.cos(a)],h*Math.sin(a)+(i===0||i===12?0:h*0.25)));}return ps;};
  fillPoly(ctx,arch(0.4,15),'#7b776e');fillPoly(ctx,arch(0.29,11),'#1d1c1a');}}
// Ölpfütze auf Gras in Gebieten mit Öl – so sieht man schon von Weitem, wo Öl im Boden ist
function oilSpot(ctx,x,y,cx,cy,t){const v=hash(x+311,y+977);if(v>0.16)return;const w=v*0.5+0.12,ox=(hash(x,y+5)-0.5)*10,oy=(hash(x+5,y)-0.5)*5;
 ctx.fillStyle='#1d1b1f';ctx.beginPath();ctx.ellipse(cx+ox,cy+oy,TW*w,TH*w,0,0,7);ctx.fill();
 ctx.fillStyle='rgba(120,90,200,.35)';ctx.beginPath();ctx.ellipse(cx+ox-TW*w*0.3,cy+oy-TH*w*0.25,TW*w*0.35,TH*w*0.25,0,0,7);ctx.fill();
 if(v<0.05){const s=(Math.sin(t/300+x)+1)/2;ctx.fillStyle=`rgba(255,255,255,${0.25+0.35*s})`;ctx.beginPath();ctx.arc(cx+ox+TW*w*0.2,cy+oy-TH*w*0.2,1.4,0,7);ctx.fill();}}
function ground(ctx,c,x,y,cx,cy,t){
 const v=hash(x,y),tun=isTunnel(c)&&!GHOST;let col;
 // Bodenfarbe: jede Art genau einmal festlegen (Straße grau, Wasser blau, Fels grau, Zonen farbig, sonst Gras je Jahreszeit)
 if(c.t==='water'||c.bridge)col='#4fa3d8';            // Brücke: erst Wasser, darüber die Fahrbahn
 else if(tun)col=v<0.5?'#9c9a94':'#a6a39c';            // Tunnel: man sieht den Berg
 else if(c.t==='road')col=['','#8d9096','#7d8086','#6c6f75','#55585e'][c.lanes||1];
 else if(c.t==='rock')col=depthAt(x,y)>=2?(v<0.5?'#e6edf3':'#dfe7ee'):(v<0.5?'#8d9a6c':'#869466');
 else if((tool(c.t)?.onRock)||(c.t==='rail'&&c.rock))col=depthAt(x,y)>=2||c.t==='ski'||c.t==='mountainhotel'?(v<0.5?'#e9eff4':'#e2e9ef'):(v<0.5?'#9c9a94':'#a6a39c');
 else if(c.t==='zone')col='#a9d98f';else if(c.t==='zonec')col='#a9cbe8';else if(c.t==='zonei')col='#e6d98f';
 else if(c.t==='park')col='#6fbf5a';else if(['sport','zoo','themepark','wind','ferris','naturepark'].includes(c.t))col='#74bf5c';
 else if(c.t==='ski')col='#eef5fb';else if(c.t==='airport')col='#b9bcb6';else if(tool(c.t)?.size)col='#cfcfc8';
 else col=SEASON==='winter'?(v<0.5?'#e9eff3':'#e1e9ee'):SEASON==='autumn'?(v<0.5?'#a5c064':'#9db95e'):SEASON==='spring'?(v<0.5?'#8fd16e':'#87cb67'):(v<0.5?'#86c56a':'#80bf64');
 ctx.fillStyle=col;diamond(ctx,cx,cy,TW/2+0.6,TH/2+0.6);ctx.fill();if(c.bridge)bridgeDeck(ctx,c,x,y,cx,cy); if(tun){ctx.fillStyle='#858279';ctx.beginPath();ctx.moveTo(cx-10+v*8,cy+3);ctx.lineTo(cx-3+v*8,cy-9-v*6);ctx.lineTo(cx+4+v*8,cy+3);ctx.fill();ctx.fillStyle='#b8b5ad';ctx.beginPath();ctx.moveTo(cx-3+v*8,cy-9-v*6);ctx.lineTo(cx+4+v*8,cy+3);ctx.lineTo(cx+v*8,cy+3);ctx.fill();
  if(v>0.6){ctx.fillStyle='#8f8c84';ctx.beginPath();ctx.moveTo(cx+4,cy+6);ctx.lineTo(cx+10,cy-3);ctx.lineTo(cx+15,cy+6);ctx.fill();}}
 if(c.t==='water'&&v<0.025){const ph=t/5000+v*400,bx=cx+Math.cos(ph)*10,by=cy+Math.sin(ph)*4.5,dir=Math.sin(ph)>0?-1:1;   // Boot
  ctx.fillStyle='#8a5a33';ctx.beginPath();ctx.moveTo(bx-7*dir,by);ctx.lineTo(bx+7*dir,by);ctx.lineTo(bx+5*dir,by+3);ctx.lineTo(bx-5*dir,by+3);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(bx,by-1);ctx.lineTo(bx,by-12);ctx.lineTo(bx+6*dir,by-1);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx-8*dir,by+3);ctx.lineTo(bx-14*dir,by+4);ctx.stroke();}
 if(c.t==='water'){ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.2;const o=Math.sin(t/700+x+y)*3;ctx.beginPath();ctx.moveTo(cx-10+o,cy-2);ctx.quadraticCurveTo(cx-4+o,cy-5,cx+2+o,cy-2);ctx.stroke();}
 if(c.t==='zone'||c.t==='zonec'||c.t==='zonei'){ctx.strokeStyle=c.t==='zone'?'rgba(60,120,40,.7)':c.t==='zonec'?'rgba(40,90,160,.7)':'rgba(150,120,20,.8)';ctx.setLineDash([4,3]);ctx.lineWidth=1.2;diamond(ctx,cx,cy,TW/2-5,TH/2-2.5);ctx.stroke();ctx.setLineDash([]);
  if(c.ready){ctx.fillStyle='#c9a46a';ctx.fillRect(cx-8,cy-6,16,3);ctx.fillStyle='#8d6b3a';ctx.fillRect(cx-7,cy-12,2,9);ctx.fillRect(cx+5,cy-12,2,9);ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('🚧',cx,cy-12);}}
}
function roadMarks(ctx,g,x,y,cx,cy,c,t,cars){const VD=[[1,0],[-1,0],[0,1],[0,-1]].map(([du,dv])=>wvec(du,dv)),n=VD.map(([dx,dy])=>tile(g,x+dx,y+dy)?.t==='road');
 const ends=[{x:cx+TW/4,y:cy+TH/4},{x:cx-TW/4,y:cy-TH/4},{x:cx-TW/4,y:cy+TH/4},{x:cx+TW/4,y:cy-TH/4}],L=c.lanes||1;
 ctx.strokeStyle=L>=4?'rgba(255,214,80,.9)':'rgba(255,255,255,.85)';ctx.lineWidth=L>=2?1.1:1.4;ctx.setLineDash(L>=2?[]:[4,4]);
 let any=false;n.forEach((on,i)=>{if(!on)return;any=true;if(c.rail)return;const e=ends[i];
  if(L>=2){const px=(e.y-cy),py=-(e.x-cx),len=Math.hypot(px,py)||1;for(const o of[-1.2,1.2]){ctx.beginPath();ctx.moveTo(cx+px/len*o,cy+py/len*o);ctx.lineTo(e.x+px/len*o,e.y+py/len*o);ctx.stroke();}
   if(L>=3){ctx.save();ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(255,255,255,.6)';for(const o of[-5,5]){ctx.beginPath();ctx.moveTo(cx+px/len*o,cy+py/len*o);ctx.lineTo(e.x+px/len*o,e.y+py/len*o);ctx.stroke();}ctx.restore();}}
  else{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(e.x,e.y);ctx.stroke();}});
 ctx.setLineDash([]);if(!any&&!c.rail){ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(cx-2,cy-1,4,2);}
 // Fußgänger auf dem Gehweg neben Häusern (tagsüber)
 if(!LIGHTS&&ZOOM>0.8&&NIGHT<0.6){const h0=hash(x,y);if(h0<0.45&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const o=tile(g,x+dx,y+dy)?.t;return o==='house'||o==='shop'||o==='park';})){
  const A={x:cx-TW/2+5,y:cy},B={x:cx,y:cy-TH/2+2.5},C={x:cx+TW/2-5,y:cy},D={x:cx,y:cy+TH/2-2.5},edges=[[A,B],[B,C],[C,D],[D,A]];
  for(let k=0;k<(h0<0.2?2:1);k++){const[P,Q]=edges[(Math.floor(h0*40)+k*2)%4],q=((t/(7000+k*900)+h0*7+k*0.5)%1),back=k%2,s0=back?1-q:q,px=P.x+(Q.x-P.x)*s0,py=P.y+(Q.y-P.y)*s0,step=Math.floor(t/220+k)%2;
   ctx.strokeStyle='#3a3a3a';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(px,py-2.5);ctx.lineTo(px-0.8+step*1.6,py);ctx.moveTo(px,py-2.5);ctx.lineTo(px+0.8-step*1.6,py);ctx.stroke();
   ctx.fillStyle=['#e74c3c','#3498db','#f1c40f','#9b59b6','#1abc9c'][(Math.floor(h0*100)+k)%5];ctx.fillRect(px-1,py-5.5,2,3.2);ctx.fillStyle='#f0c8a0';ctx.beginPath();ctx.arc(px,py-6.6,1.1,0,7);ctx.fill();}}}
 // Ampeln an Kreuzungen (3 oder 4 Straßen)
 const crossing=n.filter(Boolean).length>=3;if(crossing)lights(ctx,cx,cy,x,y,t);
 else if((x*3+y*5)%4===0&&!c.rail)lamp(ctx,cx,cy,n);
 // Fahrzeuge: je mehr Verkehr, desto mehr. Vor roter Ampel bleiben sie stehen und fahren bei Grün weiter.
 if(cars&&any){const dirs=n.map((on,i)=>on?i:-1).filter(i=>i>=0),k=Math.min(6,Math.round(cars*4));
  for(let m=0;m<k;m++){const d=dirs[m%dirs.length],e=ends[d],back=m%2,axis=d<2?0:1;
   // Fährt das Auto auf eine Kreuzung zu? Dann läuft seine Uhr nur bei Grün weiter (Auto steht bei Rot)
   const nx=x+VD[d][0],ny=y+VD[d][1],toCross=!back&&isCrossing(g,nx,ny),here=crossing&&!toCross;
   const clock=toCross?driveClock(t,axis,nx,ny):here?driveClock(t,axis,x,y):t;
   if(here&&!green(t,axis,x,y)&&!back)continue;                 // auf der Kreuzung selbst: Querverkehr wartet
   const ph=((clock/2200+m*0.37+(x*7+y*3)*0.13)%1);const s0=back?1-ph:ph;
   const ux=(e.x-cx)/Math.hypot(e.x-cx,e.y-cy),uy=(e.y-cy)/Math.hypot(e.x-cx,e.y-cy),dir=back?-1:1;
   const side=back?-3.4:3.4;                                        // zwei Fahrspuren: hin und zurück nebeneinander
   const X=cx+(e.x-cx)*s0-ux*side,Y=cy+(e.y-cy)*s0+uy*side;
   const kind=(m*7+x*3+y*5)%11;vehicle(ctx,X,Y,ux*dir,uy*dir,TRUCKS&&kind<3?10:kind,L);}}}
let TRUCKS=false,NIGHT=0,ZOOM=1;   // bei Handel fahren mehr Lieferwagen
// Straßenlaterne am Rand (nachts mit Lichtkegel)
function lamp(ctx,cx,cy,n){const px=n[0]||n[1]?cx-TW/4+2:cx+TW/4-2,py=n[0]||n[1]?cy+TH/4-1:cy+TH/4-1;
 if(LIGHTS){ctx.globalAlpha=1;const g2=ctx.createRadialGradient(px,py-3,0,px,py-3,16);g2.addColorStop(0,'rgba(255,220,140,.5)');g2.addColorStop(1,'rgba(255,220,140,0)');ctx.fillStyle=g2;ctx.beginPath();ctx.ellipse(px,py,16,9,0,0,7);ctx.fill();
  ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(px+2,py-15,1.6,0,7);ctx.fill();ctx.globalAlpha=0;return;}
 ctx.strokeStyle='#5a5f66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-15);ctx.lineTo(px+2,py-15);ctx.stroke();ctx.fillStyle='#d8d4c8';ctx.fillRect(px+1,py-15.5,2.4,1.4);}
// Kreuzung? (für Ampeln)
function isCrossing(g,x,y){if(tile(g,x,y)?.t!=='road')return false;let k=0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(tile(g,x+dx,y+dy)?.t==='road')k++;return k>=3;}
const CYCLE=8000;   // Ampelphase: 8 Sekunden (je Richtung 3,4 s Grün, 0,6 s Gelb)
const lightOff=(x,y)=>((x*1931+y*733)%CYCLE+CYCLE)%CYCLE;
function phase(t,x,y){return(t+lightOff(x,y))%CYCLE;}
function green(t,axis,x,y){const p=phase(t,x,y),h=CYCLE/2;return axis===0?p<h-600:p>=h&&p<CYCLE-600;}
function yellow(t,axis,x,y){const p=phase(t,x,y),h=CYCLE/2;return axis===0?p>=h-600&&p<h:p>=CYCLE-600;}
// Uhr, die nur bei Grün läuft: so stehen Autos bei Rot still und fahren bei Grün ohne Sprung weiter
function driveClock(t,axis,x,y){const off=lightOff(x,y),T=t+off,full=Math.floor(T/CYCLE),p=T-full*CYCLE,h=CYCLE/2,run=h-600;
 const start=axis===0?0:h,inPhase=Math.max(0,Math.min(run,p-start));return full*run*1.6+inPhase*1.6;}
// Ampeln an den vier Ecken der Kreuzung – auf dem Gehweg, wie in Deutschland
function lights(ctx,cx,cy,x,y,t){const V=[[-TW/2,0,1],[TW/2,0,1],[0,-TH/2,0],[0,TH/2,0]];   // Ecken der Kachel; axis = Richtung, die diese Ampel regelt
 if(!LIGHTS)for(const[vx,vy]of V){const ax=cx+vx,ay=cy+vy,ix=-Math.sign(vx)||0,iy=-Math.sign(vy)||0;   // Gehweg-Ecke (kleines helles Dreieck)
  ctx.fillStyle='#c9c6bd';ctx.beginPath();if(vx){ctx.moveTo(ax,ay);ctx.lineTo(ax+ix*13,ay-6.5);ctx.lineTo(ax+ix*13,ay+6.5);}else{ctx.moveTo(ax,ay);ctx.lineTo(ax-13,ay+iy*6.5);ctx.lineTo(ax+13,ay+iy*6.5);}ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e6e3da';ctx.lineWidth=1;ctx.stroke();}
 for(const[vx,vy,axis]of V){const px=cx+vx*0.82,py=cy+vy*0.82+(vy?0:1);ctx.strokeStyle='#4a4f55';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-14);ctx.stroke();
  ctx.fillStyle='#22262b';ctx.fillRect(px-2.1,py-21,4.2,8.6);const gr=green(t,axis,x,y),ye=yellow(t,axis,x,y);
  const dot=(dy,on,col,off)=>{if(LIGHTS){if(!on)return;ctx.globalAlpha=1;ctx.fillStyle=col.replace(')',',.5)').replace('rgb','rgba');ctx.beginPath();ctx.arc(px,py+dy,3.8,0,7);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py+dy,1.2,0,7);ctx.fill();ctx.globalAlpha=0;return;}ctx.fillStyle=on?col:off;ctx.beginPath();ctx.arc(px,py+dy,1.15,0,7);ctx.fill();};
  dot(-19.2,!gr&&!ye,'rgb(255,59,48)','#4a1a18');dot(-16.8,ye,'rgb(255,204,0)','#4a3d10');dot(-14.4,gr,'rgb(52,199,89)','#143d1e');}}
// Ein erkennbares Fahrzeug in Iso-Ansicht: Karosserie, Fenster, Dach, Räder. kind: Farbe/Typ (Bus, Lieferwagen)
const CAR_COLORS=['#d63031','#0984e3','#fdcb6e','#f5f6fa','#00b894','#6c5ce7','#2d3436','#e17055','#74b9ff'];
function vehicle(ctx,X,Y,ux,uy,kind,lanes){if(LIGHTS){ctx.globalAlpha=1;const g2=ctx.createRadialGradient(X+ux*10,Y+uy*10,0,X+ux*10,Y+uy*10,9);g2.addColorStop(0,'rgba(255,240,180,.55)');g2.addColorStop(1,'rgba(255,240,180,0)');ctx.fillStyle=g2;ctx.beginPath();ctx.arc(X+ux*10,Y+uy*10,9,0,7);ctx.fill();ctx.fillStyle='#ff4030';ctx.fillRect(X-ux*5-0.8,Y-uy*5-2,1.6,1.6);ctx.globalAlpha=0;return;}const bus=kind===9&&lanes>=2,van=kind===10,len=bus?9:van?6.5:5.2,wid=2.6,hgt=bus?6:van?4.6:2.6;
 const qx=-ux,qy=uy;const pt=(a,b,h=0)=>[X+ux*a+qx*b,Y+uy*a+qy*b-h];   // a: längs, b: quer (andere Iso-Achse), h: Höhe
 const poly=(ps,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(...ps[0]);for(const p of ps.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();};
 const body=bus?'#f1c40f':van?'#ecf0f1':CAR_COLORS[kind%CAR_COLORS.length];
 // Schatten und Räder
 poly([pt(-len,-wid,-0.8),pt(len,-wid,-0.8),pt(len,wid,-0.8),pt(-len,wid,-0.8)],'rgba(0,0,0,.22)');
 ctx.fillStyle='#1b1b1b';for(const[a,b]of[[-len*0.6,wid],[len*0.6,wid],[-len*0.6,-wid],[len*0.6,-wid]]){const p=pt(a,b,0.4);ctx.beginPath();ctx.arc(p[0],p[1],1.05,0,7);ctx.fill();}
 // Seiten (dunkler) und Oberseite
 poly([pt(-len,wid,0),pt(len,wid,0),pt(len,wid,hgt),pt(-len,wid,hgt)],shade(body,0.72));
 poly([pt(len,-wid,0),pt(len,wid,0),pt(len,wid,hgt),pt(len,-wid,hgt)],shade(body,0.85));
 poly([pt(-len,-wid,hgt),pt(len,-wid,hgt),pt(len,wid,hgt),pt(-len,wid,hgt)],body);
 if(bus){for(let i=0;i<4;i++){const a=-len+1.5+i*4;poly([pt(a,wid,hgt*0.45),pt(a+2.8,wid,hgt*0.45),pt(a+2.8,wid,hgt*0.85),pt(a,wid,hgt*0.85)],'#8ec3e6');}return;}
 if(van){poly([pt(len-2,-wid,hgt*0.55),pt(len,-wid,hgt*0.55),pt(len,wid,hgt*0.55),pt(len-2,wid,hgt*0.55)],'#8ec3e6');return;}
 // Kabine mit Scheiben
 const c0=-len*0.45,c1=len*0.35,ch=hgt+2.2;
 poly([pt(c0,wid*0.85,hgt),pt(c1,wid*0.85,hgt),pt(c1-0.6,wid*0.75,ch),pt(c0+0.4,wid*0.75,ch)],'#9fd0f0');
 poly([pt(c1,-wid*0.85,hgt),pt(c1,wid*0.85,hgt),pt(c1-0.6,wid*0.75,ch),pt(c1-0.6,-wid*0.75,ch)],'#b9def5');
 poly([pt(c0+0.4,-wid*0.75,ch),pt(c1-0.6,-wid*0.75,ch),pt(c1-0.6,wid*0.75,ch),pt(c0+0.4,wid*0.75,ch)],shade(body,1.08));
 // Scheinwerfer
 const h1=pt(len,wid*0.6,hgt*0.5),h2=pt(len,-wid*0.6,hgt*0.5);ctx.fillStyle='#fff7c2';ctx.fillRect(h1[0]-0.5,h1[1]-0.5,1,1);ctx.fillRect(h2[0]-0.5,h2[1]-0.5,1,1);}

function house(ctx,c,x,y,cx,cy,t){const v=hash(x,y),w=WALLS[Math.floor(v*WALLS.length)],roof=ROOFS[Math.floor(v*97)%ROOFS.length],gl=GLASS[Math.floor(v*31)%GLASS.length];
 const lit=true;
 switch(c.lvl){
  case 1:{box(ctx,cx,cy,15,7.5,11,w[0]);windows(ctx,cx,cy,15,7.5,2,10,1,2,'#5c7ea0');pyramidRoof(ctx,cx,cy,15,7.5,11,11,roof);tree(ctx,cx+20,cy+2,0.7);break;}
  case 2:{box(ctx,cx,cy,19,9.5,16,w[0]);windows(ctx,cx,cy,19,9.5,2,15,2,2,'#5c7ea0');pyramidRoof(ctx,cx,cy,19,9.5,16,13,roof);ctx.fillStyle='#7a4a33';ctx.fillRect(cx+6,cy+2,4,-0);break;}
  case 3:{box(ctx,cx,cy,22,11,28,w[0],w[1]);windows(ctx,cx,cy,22,11,3,27,3,3,'#55779a',lit);box(ctx,cx,cy-28,22,11,2,w[1]);break;}
  case 4:{box(ctx,cx,cy,24,12,48,w[0],w[1]);windows(ctx,cx,cy,24,12,3,46,6,4,'#4f6f90',lit);box(ctx,cx+4,cy-48,8,4,6,'#b8b8b8');break;}
  case 5:{box(ctx,cx,cy,22,11,88,'#dfe6ec','#c9d3dc');windows(ctx,cx,cy,22,11,3,86,12,4,gl,lit);box(ctx,cx,cy-88,12,6,8,'#aab4be');break;}
  case 6:{box(ctx,cx,cy,22,11,110,'#cfd9e2','#b8c6d2');windows(ctx,cx,cy,22,11,3,108,15,4,gl,lit);
   box(ctx,cx,cy-110,15,7.5,30,'#d8e1e9');windows(ctx,cx,cy-110,15,7.5,2,29,4,3,gl,lit);
   ctx.strokeStyle='#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy-140);ctx.lineTo(cx,cy-162);ctx.stroke();
   if(Math.floor(t/600)%2){ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(cx,cy-162,2,0,7);ctx.fill();}break;}
  case 7:{box(ctx,cx,cy,24,12,150,'#b9cad8','#a3b6c6');windows(ctx,cx,cy,24,12,3,148,22,4,'#6ea6d6',lit);box(ctx,cx,cy-150,17,8.5,50,'#c6d4e0');windows(ctx,cx,cy-150,17,8.5,2,48,7,3,'#6ea6d6',lit);
   box(ctx,cx,cy-200,9,4.5,30,'#d3dee8');ctx.strokeStyle='#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy-230);ctx.lineTo(cx,cy-262);ctx.stroke();if(Math.floor(t/600)%2){ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(cx,cy-262,2.5,0,7);ctx.fill();}break;}}}

function shop(ctx,c,x,y,cx,cy,t){
 if(c.lvl===1){box(ctx,cx,cy,13,6.5,12,'#f6f1e7');for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#fff':'#e2483b';ctx.beginPath();const a=i/4,b=(i+1)/4;ctx.moveTo(cx+a*13,cy+6.5-a*6.5-12);ctx.lineTo(cx+b*13,cy+6.5-b*6.5-12);ctx.lineTo(cx+b*13+2,cy+6.5-b*6.5-7);ctx.lineTo(cx+a*13+2,cy+6.5-a*6.5-7);ctx.fill();}
  ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('🛒',cx-6,cy-2);}
 else if(c.lvl===2){box(ctx,cx,cy,22,11,16,'#eef2f6','#d4dce4');windows(ctx,cx,cy,22,11,1,9,1,4,'#8cc0dc');ctx.fillStyle='#2f7d3a';ctx.fillRect(cx+2,cy-22,18,7);ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('MARKT',cx+11,cy-16.5);}
 else if(c.lvl===3){box(ctx,cx,cy,26,13,26,'#e7edf3','#cbd5df');windows(ctx,cx,cy,26,13,2,24,2,5,'#7fb3d9',true);ctx.fillStyle='#e85d8a';ctx.fillRect(cx-6,cy-40,24,8);ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('CENTER',cx+6,cy-34);}
 else{const z=[0,0,0,0,60,110,170][c.lvl];box(ctx,cx,cy,22,11,z,'#9fb8cc','#8aa6bc');windows(ctx,cx,cy,22,11,3,z-2,Math.round(z/7),4,'#5d8fb8',true);if(c.lvl>=5){box(ctx,cx,cy-z,14,7,14,'#a9bfd1');}
  if(c.lvl===6){ctx.fillStyle='#e2b23a';ctx.fillRect(cx-10,cy-z-24,20,6);ctx.fillStyle='#fff';ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.fillText('KONZERN',cx,cy-z-19.5);}}}
function smoke(ctx,x,y,t,seed){const k=(((t/40+seed*9)%60)+60)%60;ctx.fillStyle=`rgba(210,210,210,${0.7-k/90})`;ctx.beginPath();ctx.arc(x+k/6,y-k/2,4+k/10,0,7);ctx.fill();}
function factory(ctx,c,x,y,cx,cy,t){
 const saw=(hw,hh,z,n,col)=>{for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,p0={x:cx-hw+a*hw*2*0.5+a*hw,y:0};const bx=cx-hw+ (a*2*hw),bx2=cx-hw+(b*2*hw);ctx.fillStyle=i%2?col:shade(col,0.85);ctx.beginPath();ctx.moveTo(bx,cy-z+(a-0.5)*0);ctx.lineTo(bx2,cy-z);ctx.lineTo(bx2,cy-z-7);ctx.closePath();ctx.fill();}};
 if(c.lvl>=4){box(ctx,cx,cy,27,13.5,c.lvl===5?40:30,c.lvl===5?'#e9eef2':'#aab0b6');windows(ctx,cx,cy,27,13.5,3,c.lvl===5?38:28,c.lvl===5?4:2,6,c.lvl===5?'#6ea6d6':'#6f8496',c.lvl===5);if(c.lvl===4){box(ctx,cx-12,cy-10,3.5,1.8,50,'#8b4a3a');smoke(ctx,cx-12,cy-62,t,x);}else{label(ctx,cx,cy-50,'💡',12);}return;}
 if(c.lvl===1){box(ctx,cx,cy,16,8,14,'#c9b08a','#b39a74');ctx.fillStyle='#6a5a4a';ctx.fillRect(cx+4,cy-4,7,-0);windows(ctx,cx,cy,16,8,2,10,1,2,'#6f8496');ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('🔧',cx+8,cy-2);}
 else if(c.lvl===2){box(ctx,cx,cy,24,12,20,'#b7a27f','#a08d6b');saw(24,12,20,4,'#8a7a66');windows(ctx,cx,cy,24,12,3,16,1,4,'#6f8496');box(ctx,cx-10,cy-8,3,1.5,34,'#8b4a3a');smoke(ctx,cx-10,cy-44,t,x+y);}
 else{box(ctx,cx,cy,27,13.5,26,'#aab0b6','#949ba2');windows(ctx,cx,cy,27,13.5,3,22,2,5,'#6f8496');box(ctx,cx-12,cy-10,3.5,1.8,44,'#8b4a3a');box(ctx,cx-4,cy-14,3.5,1.8,50,'#8b4a3a');
  smoke(ctx,cx-12,cy-56,t,x);smoke(ctx,cx-4,cy-66,t,y+3);ctx.fillStyle='#d6dde3';ctx.beginPath();ctx.ellipse(cx+14,cy-30,6,3,0,0,7);ctx.fill();ctx.fillRect(cx+8,cy-30,12,8);}}
// ---------- Dienste und Sondergebäude ----------
function cyl(ctx,cx,cy,r,h,col,top){ctx.fillStyle=shade(col,0.85);ctx.fillRect(cx-r,cy-h,r*2,h);ctx.beginPath();ctx.ellipse(cx,cy,r,r/2,0,0,Math.PI);ctx.fill();ctx.fillStyle=top||shade(col,1.1);ctx.beginPath();ctx.ellipse(cx,cy-h,r,r/2,0,0,7);ctx.fill();}
function label(ctx,cx,cy,txt,size=12){ctx.font=`${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,cx,cy);ctx.textBaseline='alphabetic';}
function flag(ctx,x,y,col){ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-16);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(x,y-16,8,5);}
function pediment(ctx,cx,cy,hw,hh,z,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx,cy+hh-z);ctx.lineTo(cx+hw,cy-z);ctx.lineTo(cx+hw/2,cy-z-12+hh/2);ctx.closePath();ctx.fill();ctx.fillStyle=shade(col,0.85);ctx.beginPath();ctx.moveTo(cx-hw,cy-z);ctx.lineTo(cx,cy+hh-z);ctx.lineTo(cx+hw/2,cy-z-12+hh/2);ctx.lineTo(cx-hw/2,cy-z-12-hh/2);ctx.closePath();ctx.fill();}
function columns(ctx,cx,cy,hw,hh,z,n){ctx.fillStyle='#f4f1ea';for(let i=0;i<n;i++){const a=(i+0.5)/n;const px=cx+a*hw,py=cy+hh-a*hh;ctx.fillRect(px-1.5,py-z,3,z);}}
function turbine(ctx,x,y,t,ph){ctx.strokeStyle='#e8ecef';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-46);ctx.stroke();ctx.lineWidth=2;const a=t/500+ph;
 for(let k=0;k<3;k++){const b=a+k*2.094;ctx.beginPath();ctx.moveTo(x,y-46);ctx.lineTo(x+Math.cos(b)*17,y-46+Math.sin(b)*17);ctx.stroke();}ctx.fillStyle='#ccc';ctx.beginPath();ctx.arc(x,y-46,2.5,0,7);ctx.fill();}
// ---------- Schienennetz: Gleise, Bahnübergänge und Züge, die von Bahnhof zu Bahnhof fahren ----------
// Alles in Feld-Koordinaten der Welt (x, y als Kommazahlen); W(p,h) rechnet in Bildschirm-Punkte um
const Wv=(p,h=0)=>[(p[0]-p[1])*TW/2,(p[0]+p[1])*TH/2-h];   // Ansicht → Bildschirm
const W=(p,h=0)=>Wv(vpt(p[0],p[1]),h);                          // Welt → Bildschirm
const fillPoly=(ctx,ps,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(...ps[0]);for(const p of ps.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();};
const strokeLine=(ctx,ps,col,w)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(...ps[0]);for(const p of ps.slice(1))ctx.lineTo(...p);ctx.stroke();};
const glowOn=f=>{if(!LIGHTS)return;ctx0.globalAlpha=1;f();ctx0.globalAlpha=0;};let ctx0=null;
const isRail=c=>!!c&&(c.t==='rail'||(c.t==='road'&&c.rail));
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
// Hängen zwei Nachbarfelder zusammen? Bahnhöfe nur an ihren schmalen Enden (in x-Richtung, dort liegen die Gleise)
function linked(g,x,y,dx,dy){const a=tile(g,x,y),b=tile(g,x+dx,y+dy);if(!a||!b)return false;const sa=a.t==='train',sb=b.t==='train';
 if(!(sa||isRail(a))||!(sb||isRail(b)))return false;return!((sa||sb)&&dy!==0);}
const conns=(g,x,y)=>DIRS.filter(([dx,dy])=>linked(g,x,y,dx,dy));
const bez=(a,c,b,s)=>[(1-s)**2*a[0]+2*(1-s)*s*c[0]+s*s*b[0],(1-s)**2*a[1]+2*(1-s)*s*c[1]+s*s*b[1]];
// Gleisstücke eines Feldes als Linien (gerade, Kurve, Kreuzung oder Prellbock)
function railPieces(g,x,y){const C=[x+0.5,y+0.5],E=d=>[C[0]+d[0]*0.5,C[1]+d[1]*0.5],k=conns(g,x,y);
 if(!k.length)return{pieces:[[E([-1,0]),E([1,0])]],ends:[]};
 if(k.length===1){const d=k[0];return{pieces:[[E(d),[C[0]-d[0]*0.4,C[1]-d[1]*0.4]]],ends:[[[C[0]-d[0]*0.36,C[1]-d[1]*0.36],d]]};}
 if(k.length===2){const[a,b]=k;if(a[0]===-b[0]&&a[1]===-b[1])return{pieces:[[E(a),E(b)]],ends:[]};const ps=[];for(let i=0;i<=8;i++)ps.push(bez(E(a),C,E(b),i/8));return{pieces:[ps],ends:[]};}
 return{pieces:k.map(d=>[E(d),C]),ends:[]};}
// Linie in gleich lange Schritte teilen (für Schwellen), mit Richtung quer zur Linie
function resample(ps,step){const out=[];let carry=0;for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!L)continue;const n=[-(b[1]-a[1])/L,(b[0]-a[0])/L];
  for(let s=carry;s<=L;s+=step)out.push({p:[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L],n});carry=(carry-L)%step;if(carry<0)carry+=step;}return out;}
function offsetLine(ps,o){return ps.map((p,i)=>{const a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return[p[0]-(b[1]-a[1])/L*o,p[1]+(b[0]-a[0])/L*o];});}
// Ein Gleis zeichnen: Schotterbett, Holzschwellen, zwei Stahlschienen
function drawTrack(ctx,ps,ballast=true){
 if(ballast){const l=offsetLine(ps,0.14),r=offsetLine(ps,-0.14);fillPoly(ctx,[...l,...r.reverse()].map(p=>W(p)),'#8e887d');}
 for(const{p,n}of resample(ps,0.085))strokeLine(ctx,[W([p[0]+n[0]*0.1,p[1]+n[1]*0.1],0.4),W([p[0]-n[0]*0.1,p[1]-n[1]*0.1],0.4)],ballast?'#6e5238':'#5d5f63',1.6);
 for(const o of[-0.055,0.055]){const r=offsetLine(ps,o);strokeLine(ctx,r.map(p=>W(p,1)),'#4b4f56',1.3);strokeLine(ctx,r.map(p=>W(p,1.5)),'#d3d6db',0.5);}}
function railTile(ctx,g,x,y,c){const{pieces,ends}=railPieces(g,x,y);for(const ps of pieces)drawTrack(ctx,ps,c.t!=='road');
 for(const[p,d]of ends){const n=[-d[1],d[0]],a=W([p[0]+n[0]*0.12,p[1]+n[1]*0.12],3),b=W([p[0]-n[0]*0.12,p[1]-n[1]*0.12],3);strokeLine(ctx,[a,b],'#c0392b',3);strokeLine(ctx,[[a[0],a[1]-1],[b[0],b[1]-1]],'#f4f6f8',0.8);}   // Prellbock
 if(c.t==='road'){const q=W([x+0.12,y+0.12]);strokeLine(ctx,[q,[q[0],q[1]-13]],'#666',1);                // Andreaskreuz am Bahnübergang
  for(const s of[1,-1])strokeLine(ctx,[[q[0]-4,q[1]-13-s*2.5],[q[0]+4,q[1]-13+s*2.5]],'#d0312d',1.6);}}

// Ein Wagen von A nach B (Feld-Koordinaten). noseA/noseB: Lok-Front an diesem Ende
function railcar(ctx,A,B,noseA,noseB,body,stripe){A=vpt(A[0],A[1]);B=vpt(B[0],B[1]);const W=Wv,L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<0.03)return;
 const d=[(B[0]-A[0])/L,(B[1]-A[1])/L],w=0.13,H=13;let n=[-d[1],d[0]];if(n[0]+n[1]<0)n=[-n[0],-n[1]];   // n: die Seite, die zu uns zeigt
 const at=(s,o,h)=>W([A[0]+d[0]*s+n[0]*o,A[1]+d[1]*s+n[1]*o],h),nA=noseA?0.15:0,nB=noseB?0.15:0,s0=nA,s1=L-nB,endB=d[0]+d[1]>0;
 ctx.fillStyle='#1d1d1f';for(const s of[0.09,0.17,L-0.17,L-0.09])if(s>0&&s<L){const p=at(s,w,1.6);ctx.beginPath();ctx.arc(p[0],p[1],1.4,0,7);ctx.fill();}
 fillPoly(ctx,[at(s0,w,2),at(s1,w,2),at(s1,w,H),at(s0,w,H)],body);
 if(nB)fillPoly(ctx,[at(s1,w,2),at(L,w,2),at(L,w,H*0.42),at(s1,w,H)],body);
 if(nA)fillPoly(ctx,[at(0,w,2),at(s0,w,2),at(s0,w,H),at(0,w,H*0.42)],body);
 fillPoly(ctx,[at(0,w,4),at(L,w,4),at(L,w,5.6),at(0,w,5.6)],stripe);                                    // Zierstreifen
 const eh=(endB?nB:nA)?H*0.42:H,es=endB?L:0;fillPoly(ctx,[at(es,-w,2),at(es,w,2),at(es,w,eh),at(es,-w,eh)],shade(body,0.78));   // sichtbares Ende
 fillPoly(ctx,[at(s0,-w,H),at(s1,-w,H),at(s1,w,H),at(s0,w,H)],'#aeb5bc');                                // Dach
 if(nB)fillPoly(ctx,[at(s1,-w,H),at(L,-w,H*0.42),at(L,w,H*0.42),at(s1,w,H)],endB?'#22313f':shade(body,0.9));
 if(nA)fillPoly(ctx,[at(s0,-w,H),at(0,-w,H*0.42),at(0,w,H*0.42),at(s0,w,H)],endB?shade(body,0.9):'#22313f');
 if(endB?nB:nA){ctx.fillStyle='#fff6c8';for(const o of[-0.08,0.08]){const p=at(es,o,3.4);ctx.beginPath();ctx.arc(p[0],p[1],0.9,0,7);ctx.fill();}
  glowOn(()=>{const p=W([A[0]+d[0]*(endB?L+0.25:-0.25),A[1]+d[1]*(endB?L+0.25:-0.25)],2),g2=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],14);g2.addColorStop(0,'rgba(255,240,180,.55)');g2.addColorStop(1,'rgba(255,240,180,0)');ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p[0],p[1],14,0,7);ctx.fill();});}
 const win=(p0,p1,h0,h1,col)=>{p0=Math.max(s0,p0);p1=Math.min(s1,p1);if(p1<=p0)return;const q=[at(p0,w,h0),at(p1,w,h0),at(p1,w,h1),at(p0,w,h1)];fillPoly(ctx,q,col);glowOn(()=>fillPoly(ctx,q,'#ffd877'));};
 if(nA||nB){if(nB)win(s1-0.12,s1-0.03,7.5,11,'#3d5a73');if(nA)win(s0+0.03,s0+0.12,7.5,11,'#3d5a73');for(let s=s0+0.17;s<s1-0.17;s+=0.09)win(s,s+0.055,7.5,11,'#3d5a73');
  if(!LIGHTS)strokeLine(ctx,[at(L/2,0,H),at(L/2+0.05,0,27)],'#555',0.8);}                                   // Stromabnehmer
 else{win(0.05,0.1,2.5,11,shade(body,0.7));win(L-0.1,L-0.05,2.5,11,shade(body,0.7));for(let s=0.14;s<L-0.15;s+=0.085)win(s,s+0.06,7.5,11,'#3d5a73');}}
// Zug aus drei Teilen (Lok vorne und hinten, Wagen dazwischen) – so kann er an jedem Bahnhof wenden
const TRAIN_CARS=3,CAR_LEN=0.58,CAR_GAP=0.04,TRAIN_LEN=TRAIN_CARS*CAR_LEN+(TRAIN_CARS-1)*CAR_GAP;
const TRAIN_COLORS=[['#f4f6f8','#d0312d'],['#d0312d','#f4f6f8'],['#2f6fb0','#f1c40f'],['#27ae60','#f4f6f8']];

// Fahrpläne: je zusammenhängendes Netz mit Bahnhof ein Zug, der alle Bahnhöfe nacheinander anfährt und zurück.
// Bei nur einem Bahnhof fährt er bis zum Ende der Strecke (Prellbock) und zurück.
const netCache=new WeakMap();
export function railNet(g){const hit=netCache.get(g);if(hit&&hit.rev===(g.rev||0))return hit.v;
 const N=MAP_W*MAP_H,st=[],v={tours:[],used:new Set()};
 for(let i=0;i<N;i++){const c=g.tiles[i];if(c.t==='train'&&c.rx===i%MAP_W&&c.ry===((i/MAP_W)|0))st.push({x:c.rx,y:c.ry});}
 const row=(S,r)=>[idx(S.x,r),idx(S.x+1,r)],key=S=>idx(S.x,S.y);
 const bfs=src=>{const dist=new Int32Array(N).fill(-1),prev=new Int32Array(N).fill(-1),q=[...src];for(const s of src)dist[s]=0;
  for(let h=0;h<q.length;h++){const i=q[h],x=i%MAP_W,y=(i/MAP_W)|0;for(const[dx,dy]of DIRS){if(!linked(g,x,y,dx,dy))continue;const j=idx(x+dx,y+dy);if(dist[j]>=0)continue;dist[j]=dist[i]+1;prev[j]=i;q.push(j);}}return{dist,prev};};
 const done=new Set();
 for(const S0 of st){if(done.has(key(S0)))continue;done.add(key(S0));let src=[...row(S0,S0.y),...row(S0,S0.y+1)],cur=S0;const legs=[];
  for(let guard=0;guard<16;guard++){const B=bfs(src);let best=-1,bd=1e9;
   for(let i=0;i<N;i++){if(B.dist[i]<=0)continue;const c=g.tiles[i];if(c.t!=='train')continue;const k=idx(c.rx,c.ry);if(done.has(k)||k===key(cur))continue;if(B.dist[i]<bd){bd=B.dist[i];best=i;}}
   if(best<0){if(!legs.length){let far=-1,fd=0;for(let i=0;i<N;i++)if(B.dist[i]>fd&&isRail(g.tiles[i])&&conns(g,i%MAP_W,(i/MAP_W)|0).length===1){fd=B.dist[i];far=i;}
     const l=far>=0&&makeLeg(g,B.prev,far,false);if(l)legs.push(l);}break;}
   const c=g.tiles[best],T={x:c.rx,y:c.ry};done.add(key(T));const l=makeLeg(g,B.prev,best,true);if(!l)break;legs.push(l);src=row(T,(best/MAP_W)|0);cur=T;}
  if(!legs.length)continue;
  for(const l of legs)for(const i of l.cells){const c=g.tiles[i];if(c.t==='train')for(const j of row({x:c.rx},(i/MAP_W)|0))v.used.add(j);}
  const back=legs.slice().reverse().map(l=>leg(l.pts.slice().reverse(),true,l.cells));
  const all=[...legs,...back];let T0=0;for(const l of all){l.start=T0;T0+=l.travel+l.wait;}
  v.tours.push({legs:all,period:T0,colors:TRAIN_COLORS[v.tours.length%TRAIN_COLORS.length]});}
 netCache.set(g,{rev:g.rev||0,v});return v;}
function makeLeg(g,prev,end,toStation){const cells=[];for(let i=end;i>=0;i=prev[i])cells.unshift(i);const n=cells.length;if(n<2)return null;
 const C=i=>[i%MAP_W+0.5,((i/MAP_W)|0)+0.5],dir=(a,b)=>[b%MAP_W-a%MAP_W,((b/MAP_W)|0)-((a/MAP_W)|0)],P=[];
 const c0=cells[0],t0=g.tiles[c0],d0=dir(c0,cells[1]);P.push([d0[0]>0?t0.rx:t0.rx+2,C(c0)[1]]);           // Start: hinteres Ende des Bahnhofsgleises
 for(let k=0;k<n;k++){const i=cells[k],p=C(i);
  if(k>0&&k<n-1&&g.tiles[i].t!=='train'){const a=dir(cells[k-1],i),b=dir(i,cells[k+1]);
   if(a[0]*b[0]+a[1]*b[1]===0&&conns(g,i%MAP_W,(i/MAP_W)|0).length===2){const E1=[p[0]-a[0]*0.5,p[1]-a[1]*0.5],E2=[p[0]+b[0]*0.5,p[1]+b[1]*0.5];for(let s=0;s<=8;s++)P.push(bez(E1,p,E2,s/8));continue;}}
  P.push(p);}
 const cn=cells[n-1],tn=g.tiles[cn],dn=dir(cells[n-2],cn);
 if(toStation)P.push([dn[0]>0?tn.rx+2:tn.rx,C(cn)[1]]);else{const p=C(cn);P.push([p[0]+dn[0]*0.4,p[1]+dn[1]*0.4]);}
 return leg(P,toStation,cells);}
function leg(pts,toStation,cells){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 const len=cum[cum.length-1],s0=TRAIN_LEN+0.08,s1=Math.max(s0,len-(toStation?0.08:0.1));
 return{pts,cum,len,cells,s0,s1,travel:Math.max(2500,(s1-s0)/1.4*1000+1500),wait:toStation?4500:2500};}
function pointAt(l,s){s=Math.max(0,Math.min(l.len,s));let i=1;while(i<l.cum.length-1&&l.cum[i]<s)i++;const a=l.pts[i-1],b=l.pts[i],L=l.cum[i]-l.cum[i-1]||1,f=(s-l.cum[i-1])/L;return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}
// Alle Wagen dieses Bildes: nach Feld sortiert; Wagen im Bahnhof zeichnet der Bahnhof selbst
export function trainCars(g,net,t){const cell=new Map(),stn=new Map();
 for(const tour of net.tours){const p=((t%tour.period)+tour.period)%tour.period;const l=tour.legs.find(l=>p>=l.start&&p<l.start+l.travel+l.wait)||tour.legs[0];
  const q=Math.min(1,(p-l.start)/l.travel),e=q*q*(3-2*q),head=l.s0+(l.s1-l.s0)*e;
  for(let k=0;k<TRAIN_CARS;k++){const a1=head-k*(CAR_LEN+CAR_GAP),a0=a1-CAR_LEN,A=pointAt(l,a0),B=pointAt(l,a1),M=[(A[0]+B[0])/2,(A[1]+B[1])/2];
   const vm=vpt(M[0],M[1]),car={A,B,noseA:k===TRAIN_CARS-1,noseB:k===0,body:tour.colors[0],stripe:tour.colors[1],depth:vm[0]+vm[1]};
   let sk=-1;for(const p of[A,M,B]){const c=tile(g,Math.floor(p[0]),Math.floor(p[1]));if(c?.t==='train'){sk=idx(c.rx,c.ry);car.row=Math.floor(M[1]);break;}}
   const m=sk>=0?stn:cell,key=sk>=0?sk:idx(Math.floor(M[0]),Math.floor(M[1]));if(!m.has(key))m.set(key,[]);m.get(key).push(car);}}
 for(const m of[cell,stn])for(const a of m.values())a.sort((p,q)=>p.depth-q.depth);return{cell,stn};}
let NET={tours:[],used:new Set()},CARS={cell:new Map(),stn:new Map()};
const drawCars=(ctx,list)=>{if(list)for(const c of list)railcar(ctx,c.A,c.B,c.noseA,c.noseB,c.body,c.stripe);};

// ---------- Bahnhof: Gleise, Oberleitung, Bahnsteig, Gebäude (2×2 Felder) ----------
// Die Gleise liegen genau in der Mitte der beiden Feld-Reihen, damit verlegte Schienen nahtlos anschließen.
function station(ctx,rx,ry,t){const X=rx+1,Y=ry+1,P=(a,b,h=0)=>W([X+a,Y+b],h);
 const poly=(ps,col)=>fillPoly(ctx,ps,col),line=(p,q,col,w)=>strokeLine(ctx,[p,q],col,w);
 const rb=rvec(0,1),near=rb[0]+rb[1]>0;     // zeigt die Bahnhofs-Vorderseite (+b) zu uns? Sonst ist die Rückseite vorne
 // Quader im Bahnhof: gezeichnet werden nur die Seiten, die in der aktuellen Drehung zu uns zeigen
 const boxAB=(a0,a1,b0,b1,h,col,top)=>{const cs=[[a0,b0],[a1,b0],[a1,b1],[a0,b1]].map(([a,b])=>vpt(X+a,Y+b)),us=cs.map(p=>p[0]),vs=cs.map(p=>p[1]);
  const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),Q=(u,v,h=0)=>Wv([u,v],h);
  poly([Q(u0,v1),Q(u1,v1),Q(u1,v1,h),Q(u0,v1,h)],shade(col,0.86));poly([Q(u1,v0),Q(u1,v1),Q(u1,v1,h),Q(u1,v0,h)],shade(col,0.72));poly([Q(u0,v0,h),Q(u1,v0,h),Q(u1,v1,h),Q(u0,v1,h)],top||shade(col,1.06));};
 const masts=m=>{if(LIGHTS)return;for(const a of[-0.85,0,0.85]){line(P(a,m,0),P(a,m,30),'#7a8088',1.4);line(P(a,m,29),P(a,m+(m<0?-0.22:-0.25),29),'#7a8088',1);}};
 const wire=b=>{if(!LIGHTS)line(P(-1,b,27),P(1,b,27),'rgba(60,60,60,.75)',0.6);};
 // Eigener Zug, solange keine Strecke über dieses Gleis führt: fährt ein, hält, fährt weiter
 const local=(b,off,body,stripe)=>{const T=16000,p=(((t+off)%T)+T)%T/T,stop=0.95;
  const head=p<0.4?-1+(stop+1)*(1-(1-p/0.4)**2):p<0.65?stop:stop+2.1*((p-0.65)/0.35)**2;
  const cars=[];for(let k=TRAIN_CARS-1;k>=0;k--){const A1=head-k*(CAR_LEN+CAR_GAP),A0=A1-CAR_LEN,a0=Math.max(-1,A0),a1=Math.min(1,A1);if(a1-a0<0.03)continue;
   const m=vpt(X+(a0+a1)/2,Y+b);cars.push({A:[X+a0,Y+b],B:[X+a1,Y+b],noseA:k===TRAIN_CARS-1&&A0>=-1,noseB:k===0&&A1<=1,body,stripe,depth:m[0]+m[1]});}
  drawCars(ctx,cars.sort((p,q)=>p.depth-q.depth));};
 const rowCars=r=>{const list=CARS.stn.get(idx(rx,ry));return list&&list.filter(c=>c.row===r);};
 const trackRow=(b,r,off,col)=>{if(!LIGHTS)drawTrack(ctx,[[rx,Y+b],[rx+2,Y+b]]);
  if(NET.used.has(idx(rx,r)))drawCars(ctx,rowCars(r));else local(b,off,col[0],col[1]);};
 // Teile von hinten nach vorne – bei gedrehter Karte in umgekehrter Reihenfolge
 const house=()=>{boxAB(-0.8,0.55,-0.98,-0.7,26,'#e9dcc2','#b5523a');const f=near?-0.7:-0.98;                 // Bahnhofsgebäude, Fenster auf der sichtbaren Seite
  for(let k=0;k<5;k++){const a=-0.7+k*0.25,q=[P(a,f,6),P(a+0.12,f,6),P(a+0.12,f,18),P(a,f,18)];poly(q,'#5c7ea0');glowOn(()=>poly(q,'#ffd877'));}
  const p=P(-0.12,f,22);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(p[0],p[1]+1,3.4,3,0,0,7);ctx.fill();ctx.strokeStyle='#333';ctx.lineWidth=0.7;ctx.stroke();line([p[0],p[1]+1],[p[0],p[1]-1.2],'#333',0.6);line([p[0],p[1]+1],[p[0]+1.5,p[1]+1.6],'#333',0.6);};
 const back=()=>{masts(-0.3);trackRow(-0.5,ry,0,TRAIN_COLORS[0]);wire(-0.5);};
 const platform=()=>{boxAB(-0.95,0.95,-0.3,0.3,3,'#d6d0c2','#e2ddd2');line(P(-0.95,-0.27,3.1),P(0.95,-0.27,3.1),'#f1c40f',1);line(P(-0.95,0.27,3.1),P(0.95,0.27,3.1),'#f1c40f',1);
  for(const a of[-0.6,0,0.6])line(P(a,0,3),P(a,0,21),'#5a6470',1.4);const f=near?0.25:-0.25;
  poly([P(-0.8,-0.25,21),P(0.8,-0.25,21),P(0.8,0.25,21),P(-0.8,0.25,21)],'#6a7886');poly([P(-0.8,f,19),P(0.8,f,19),P(0.8,f,21),P(-0.8,f,21)],'#4d5965');};
 const front=()=>{masts(0.78);trackRow(0.5,ry+1,8000,TRAIN_COLORS[1]);wire(0.5);};
 for(const part of near?[house,back,platform,front]:[front,platform,back,house])part();
 label(ctx,P(-0.12,-0.84,0)[0],P(-0.12,-0.84,40)[1],'🚉',14);}
function special(ctx,id,cx,cy,n,t,big,seed=0){const vr=Math.floor(seed*4);const hw=n*TW/2*0.82,hh=n*TH/2*0.82;if(big){ctx.save();ctx.translate(cx,cy);ctx.scale(1.15,1.15);ctx.translate(-cx,-cy);}try{
 switch(id){
  case'school':box(ctx,cx,cy,20,10,18,'#f3d36b');windows(ctx,cx,cy,20,10,3,15,2,3,'#5c7ea0');pyramidRoof(ctx,cx,cy,20,10,18,10,'#b5523a');ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+10,cy-10,3,0,7);ctx.fill();flag(ctx,cx-14,cy-18,'#3f7ad8');break;
  case'fire':box(ctx,cx,cy,20,10,17,'#d8473a');for(const a of[0.2,0.6]){ctx.fillStyle='#f2e6d8';const px=cx+a*20,py=cy+10-a*10;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+6,py-3);ctx.lineTo(px+6,py-14);ctx.lineTo(px,py-11);ctx.fill();}box(ctx,cx-12,cy-6,4,2,26,'#c03a2e');break;
  case'police':box(ctx,cx,cy,19,9.5,20,'#3f6fb8','#5a86cc');windows(ctx,cx,cy,19,9.5,3,17,2,3,'#cfe0f3');ctx.fillStyle=Math.floor(t/400)%2?'#ff4a3a':'#3a7aff';ctx.fillRect(cx-3,cy-25,6,3);break;
  case'bus':ctx.fillStyle='#8a8f96';for(const[a,b]of[[-16,-2],[14,-2],[-2,6]])ctx.fillRect(cx+a,cy+b-16,2,16);box(ctx,cx,cy-16,20,10,2,'#5d6b7a');ctx.fillStyle='#f2c230';ctx.fillRect(cx-12,cy-8,22,8);ctx.fillStyle='#8ec3e6';ctx.fillRect(cx-10,cy-7,18,3);break;
  case'hospital':box(ctx,cx,cy,hw*0.8,hh*0.8,44,'#f4f6f8','#e3e8ec');windows(ctx,cx,cy,hw*0.8,hh*0.8,3,42,5,5,'#8cc0dc');ctx.fillStyle='#e0322b';ctx.fillRect(cx-3,cy-60,6,16);ctx.fillRect(cx-8,cy-55,16,6);break;
  case'uni':box(ctx,cx,cy,hw*0.8,hh*0.8,26,'#efe6d2');columns(ctx,cx,cy,hw*0.8,hh*0.8,24,6);pediment(ctx,cx,cy,hw*0.8,hh*0.8,26,'#e2d6bb');ctx.fillStyle='#8fb7c9';ctx.beginPath();ctx.arc(cx,cy-40,10,Math.PI,0);ctx.fill();label(ctx,cx,cy-56,'🎓',13);break;
  case'sport':ctx.strokeStyle='#fff';ctx.lineWidth=1.5;diamond(ctx,cx,cy,hw*0.8,hh*0.8);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-hw*0.4,cy-hh*0.4);ctx.lineTo(cx+hw*0.4,cy+hh*0.4);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,8,4,0,0,7);ctx.stroke();box(ctx,cx+hw*0.55,cy-hh*0.55,14,7,8,'#9aa4ad');label(ctx,cx-6,cy+2,'⚽',10);break;
  case'pool':ctx.fillStyle='#e9e4d8';diamond(ctx,cx,cy,hw,hh);ctx.fill();ctx.fillStyle='#4fb6e8';diamond(ctx,cx,cy+2,hw*0.6,hh*0.6);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1;for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(cx-hw*0.3+k*8,cy-hh*0.3+k*4+2);ctx.lineTo(cx+hw*0.3+k*8,cy+hh*0.3+k*4+2);ctx.stroke();}box(ctx,cx-hw*0.6,cy-hh*0.3,12,6,12,'#f2f2f2');label(ctx,cx+14,cy-14,'⛱️',12);break;
  case'ferris':{ctx.strokeStyle='#8a8f96';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-14,cy+4);ctx.lineTo(cx,cy-44);ctx.lineTo(cx+14,cy+4);ctx.stroke();ctx.strokeStyle='#d8dde2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy-44,34,0,7);ctx.stroke();
   const a=t/3000;for(let k=0;k<10;k++){const b=a+k*0.628,px=cx+Math.cos(b)*34,py=cy-44+Math.sin(b)*34;ctx.strokeStyle='rgba(200,205,210,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy-44);ctx.lineTo(px,py);ctx.stroke();ctx.fillStyle=['#e74c3c','#f1c40f','#3498db','#2ecc71','#9b59b6'][k%5];ctx.fillRect(px-3,py,6,5);}break;}
  case'zoo':ctx.strokeStyle='#8a6a42';ctx.lineWidth=1.5;diamond(ctx,cx,cy,hw*0.9,hh*0.9);ctx.stroke();diamond(ctx,cx-hw*0.3,cy,hw*0.35,hh*0.35);ctx.stroke();diamond(ctx,cx+hw*0.3,cy,hw*0.35,hh*0.35);ctx.stroke();
   tree(ctx,cx-hw*0.6,cy+4,0.9);tree(ctx,cx+hw*0.6,cy-2,0.9);tree(ctx,cx,cy-hh*0.6,0.8);label(ctx,cx-hw*0.3,cy-6,'🦒',18);label(ctx,cx+hw*0.3,cy-4,'🐘',16);label(ctx,cx,cy+hh*0.45,'🦁',14);label(ctx,cx-4,cy-hh*0.55,'🦓',12);break;
  case'themepark':{ctx.strokeStyle='#e74c3c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-hw*0.8,cy);for(let k=0;k<=20;k++){const a=k/20;ctx.lineTo(cx-hw*0.8+a*hw*1.6,cy-10-Math.abs(Math.sin(a*Math.PI*2))*34);}ctx.stroke();
   ctx.beginPath();ctx.arc(cx+hw*0.35,cy-28,14,0,7);ctx.stroke();ctx.strokeStyle='#8a8f96';ctx.lineWidth=1.5;for(let k=0;k<=8;k++){const px=cx-hw*0.8+k/8*hw*1.6;ctx.beginPath();ctx.moveTo(px,cy+4);ctx.lineTo(px,cy-10-Math.abs(Math.sin(k/8*Math.PI*2))*34);ctx.stroke();}
   for(const[a,b,col]of[[-0.5,0.4,'#f1c40f'],[0.1,0.5,'#9b59b6'],[0.55,0.15,'#3498db']]){const px=cx+a*hw,py=cy+b*hh;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(px-9,py);ctx.lineTo(px,py-18);ctx.lineTo(px+9,py);ctx.fill();}
   const k=(t/1500)%1,px=cx-hw*0.8+k*hw*1.6;ctx.fillStyle='#2c3e50';ctx.fillRect(px-4,cy-14-Math.abs(Math.sin(k*Math.PI*2))*34,8,4);break;}
  case'cityhall':box(ctx,cx,cy,hw*0.85,hh*0.85,24,'#efe2c6');windows(ctx,cx,cy,hw*0.85,hh*0.85,3,22,2,5,'#6d8aa6');pyramidRoof(ctx,cx,cy,hw*0.85,hh*0.85,24,12,'#3f6e8c');
   box(ctx,cx,cy-30,7,3.5,30,'#efe2c6');ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+3,cy-50,3.5,0,7);ctx.fill();pyramidRoof(ctx,cx,cy-30,7,3.5,30,12,'#3f6e8c');flag(ctx,cx,cy-72,'#e0b020');break;
  case'museum':box(ctx,cx,cy,hw*0.85,hh*0.85,24,'#e8e4da');columns(ctx,cx,cy,hw*0.85,hh*0.85,22,7);pediment(ctx,cx,cy,hw*0.85,hh*0.85,24,'#d9d3c4');label(ctx,cx,cy-42,'🖼️',12);break;
  case'stadium':{ctx.fillStyle='#9aa4ad';ctx.beginPath();ctx.ellipse(cx,cy-4,hw*0.95,hh*0.95,0,0,7);ctx.fill();ctx.fillStyle='#c0392b';ctx.beginPath();ctx.ellipse(cx,cy-18,hw*0.95,hh*0.95,0,0,7);ctx.fill();
   ctx.fillStyle='#d6dbe0';ctx.fillRect(cx-hw*0.95,cy-18,hw*1.9,14);ctx.fillStyle='#e8eaed';ctx.beginPath();ctx.ellipse(cx,cy-18,hw*0.78,hh*0.78,0,0,7);ctx.fill();
   ctx.fillStyle='#4caf50';ctx.beginPath();ctx.ellipse(cx,cy-16,hw*0.6,hh*0.6,0,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,cy-16,8,4,0,0,7);ctx.stroke();
   for(const a of[-1,1]){ctx.strokeStyle='#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+a*hw*0.9,cy-18);ctx.lineTo(cx+a*hw*0.9,cy-50);ctx.stroke();ctx.fillStyle='#fffbe0';ctx.fillRect(cx+a*hw*0.9-4,cy-54,8,4);}break;}
  case'harbor':box(ctx,cx-hw*0.3,cy-hh*0.1,14,7,12,'#c0392b');box(ctx,cx-hw*0.3,cy-hh*0.1-12,14,7,10,'#2980b9');box(ctx,cx+hw*0.1,cy+hh*0.25,12,6,10,'#27ae60');
   ctx.strokeStyle='#f1c40f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+hw*0.45,cy);ctx.lineTo(cx+hw*0.45,cy-50);ctx.lineTo(cx-hw*0.2,cy-56);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy-55);ctx.lineTo(cx,cy-30);ctx.stroke();label(ctx,cx+hw*0.6,cy+hh*0.6,'🚢',18);break;
  case'hotel':{// vier Bauarten – jedes Hotel sieht anders aus
   const sign=(x,y,bg,txt='HOTEL')=>{ctx.fillStyle=bg;ctx.fillRect(x,y,22,8);ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText(txt,x+11,y+6);};
   if(vr===0){box(ctx,cx,cy,hw*0.6,hh*0.6,76,'#f0e6d6','#e0d3bd');windows(ctx,cx,cy,hw*0.6,hh*0.6,3,74,11,4,'#7fb3d9',true);sign(cx+2,cy-88,'#8e44ad');}
   else if(vr===1){// moderner Glasturm mit Dachterrasse
    box(ctx,cx,cy,hw*0.5,hh*0.5,104,'#5f86a8','#8fb3cf');windows(ctx,cx,cy,hw*0.5,hh*0.5,4,100,16,3,'#bfe1f5',true);box(ctx,cx,cy-104,hw*0.3,hh*0.3,6,'#e8edf1');
    ctx.fillStyle='#2ecc71';diamond(ctx,cx-hw*0.12,cy-110,5,2.5);ctx.fill();sign(cx-11,cy-122,'#1f3b57','★★★★');}
   else if(vr===2){// Grandhotel: breit, Backstein, grünes Dach, Fahnen
    box(ctx,cx,cy,hw*0.78,hh*0.78,46,'#b5563c','#c9775d');windows(ctx,cx,cy,hw*0.78,hh*0.78,4,44,5,6,'#f4e4b8',true);pyramidRoof(ctx,cx,cy,hw*0.78,hh*0.78,46,18,'#3f7d5a');
    flag(ctx,cx-hw*0.5,cy-58,'#e74c3c');flag(ctx,cx+hw*0.4,cy-60,'#f1c40f');ctx.fillStyle='#7a2f22';ctx.fillRect(cx+hw*0.15,cy+hh*0.3-10,8,10);sign(cx-11,cy-80,'#3f7d5a','GRAND');}
   else{// weißes Resort mit zwei Flügeln, gelbem Schild und Pool
    box(ctx,cx-hw*0.3,cy-hh*0.2,hw*0.42,hh*0.42,60,'#fbfaf5','#ecebe4');windows(ctx,cx-hw*0.3,cy-hh*0.2,hw*0.42,hh*0.42,3,58,8,3,'#f2b84b',true);
    box(ctx,cx+hw*0.3,cy+hh*0.1,hw*0.36,hh*0.36,36,'#fbfaf5','#ecebe4');windows(ctx,cx+hw*0.3,cy+hh*0.1,hw*0.36,hh*0.36,3,34,5,3,'#f2b84b',true);
    ctx.fillStyle='#4fd1e8';diamond(ctx,cx-hw*0.2,cy+hh*0.55,12,6);ctx.fill();sign(cx-hw*0.3-11,cy-hh*0.2-72,'#d4a017');}
   break;}
  case'expo':{box(ctx,cx,cy,hw*0.9,hh*0.9,18,'#e7edf3');windows(ctx,cx,cy,hw*0.9,hh*0.9,3,16,1,8,'#8cc0dc');ctx.fillStyle='#d0dbe5';ctx.beginPath();ctx.ellipse(cx,cy-18,hw*0.9,hh*0.9+10,0,Math.PI,0);ctx.fill();
   for(let k=0;k<4;k++)flag(ctx,cx-hw*0.7+k*hw*0.45,cy+hh*0.6-k*2,['#e74c3c','#f1c40f','#3498db','#2ecc71'][k]);break;}
  case'tvtower':cyl(ctx,cx,cy,5,140,'#dfe3e6');cyl(ctx,cx,cy-100,14,14,'#c9ced3','#e8ebee');ctx.fillStyle='#8cc0dc';ctx.fillRect(cx-14,cy-110,28,4);ctx.strokeStyle='#d33';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy-140);ctx.lineTo(cx,cy-170);ctx.stroke();
   if(Math.floor(t/600)%2){ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(cx,cy-170,2.5,0,7);ctx.fill();}break;
  case'airport':{const rw=(a)=>({x:cx-hw+a*hw*2,y:cy-hh+a*hh*2});ctx.fillStyle='#55595e';ctx.beginPath();const p0=rw(0),p1=rw(1);ctx.moveTo(p0.x-10,p0.y+5);ctx.lineTo(p1.x-10,p1.y+5);ctx.lineTo(p1.x+10,p1.y-5);ctx.lineTo(p0.x+10,p0.y-5);ctx.fill();
   ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([8,6]);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();ctx.setLineDash([]);
   box(ctx,cx-hw*0.45,cy+hh*0.3,26,13,18,'#e9eef2');windows(ctx,cx-hw*0.45,cy+hh*0.3,26,13,3,16,1,6,'#7fb3d9');
   cyl(ctx,cx+hw*0.5,cy+hh*0.35,4,44,'#dfe3e6');cyl(ctx,cx+hw*0.5,cy+hh*0.35-44,9,8,'#8cc0dc');
   const k=(t/6000)%1,pp=rw(k);ctx.save();ctx.translate(pp.x,pp.y-k*40);ctx.rotate(0.46);ctx.fillStyle='#fff';ctx.fillRect(-14,-2.5,28,5);ctx.fillRect(-4,-14,6,28);ctx.fillRect(-14,-6,4,12);ctx.fillStyle='#2f6fb0';ctx.fillRect(10,-2.5,4,5);ctx.restore();break;}
  case'concert':box(ctx,cx,cy,hw*0.8,hh*0.8,22,'#b98b62');box(ctx,cx,cy-22,hw*0.8,hh*0.8,22,'#a9c9e0','#e8f1f7');windows(ctx,cx,cy-22,hw*0.8,hh*0.8,2,20,3,6,'#cfe3f1');
   ctx.fillStyle='#f4f7fa';ctx.beginPath();ctx.moveTo(cx-hw*0.8,cy-44);for(let k=0;k<=8;k++){const a=k/8;ctx.lineTo(cx-hw*0.8+a*hw*1.6,cy-44-Math.sin(a*Math.PI*3)*7-10);}ctx.lineTo(cx+hw*0.8,cy-44);ctx.closePath();ctx.fill();label(ctx,cx,cy-66,'🎼',12);break;
  case'research':box(ctx,cx-8,cy+4,hw*0.5,hh*0.5,30,'#f4f6f8');windows(ctx,cx-8,cy+4,hw*0.5,hh*0.5,3,28,3,4,'#8cc0dc');box(ctx,cx+14,cy-6,12,6,18,'#e3e8ec');
   ctx.fillStyle='#dfe3e6';ctx.beginPath();ctx.ellipse(cx+16,cy-36,13,8,-0.5,0,7);ctx.fill();ctx.strokeStyle='#999';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+16,cy-24);ctx.lineTo(cx+16,cy-36);ctx.lineTo(cx+24,cy-46);ctx.stroke();break;
  case'space':{ctx.fillStyle='#9aa4ad';diamond(ctx,cx,cy,hw*0.6,hh*0.6);ctx.fill();ctx.strokeStyle='#c0392b';ctx.lineWidth=2;for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(cx+18,cy-k*20);ctx.lineTo(cx+26,cy-k*20-20);ctx.stroke();}
   ctx.strokeStyle='#888';ctx.beginPath();ctx.moveTo(cx+22,cy);ctx.lineTo(cx+22,cy-120);ctx.stroke();
   ctx.fillStyle='#f4f6f8';ctx.fillRect(cx-7,cy-110,14,104);ctx.fillStyle='#d6dbe0';ctx.fillRect(cx-7,cy-110,5,104);ctx.fillStyle='#c0392b';ctx.beginPath();ctx.moveTo(cx-7,cy-110);ctx.lineTo(cx,cy-132);ctx.lineTo(cx+7,cy-110);ctx.fill();
   for(const a of[-1,1]){ctx.fillStyle='#c0392b';ctx.beginPath();ctx.moveTo(cx+a*7,cy-30);ctx.lineTo(cx+a*16,cy-6);ctx.lineTo(cx+a*7,cy-10);ctx.fill();}ctx.fillStyle='#2f6fb0';ctx.beginPath();ctx.arc(cx,cy-80,3.5,0,7);ctx.fill();
   smoke(ctx,cx-6,cy-4,t,1);smoke(ctx,cx+4,cy-2,t,4);box(ctx,cx-hw*0.6,cy+hh*0.4,16,8,12,'#e3e8ec');break;}
  case'wind':for(const[a,b,ph]of[[-0.45,-0.1,0],[0.3,-0.35,1],[0.1,0.4,2]])turbine(ctx,cx+a*hw,cy+b*hh,t,ph);break;
  case'solar':for(let r=0;r<4;r++)for(let k=0;k<3;k++){const a=-0.6+k*0.55,b=-0.6+r*0.42,px=cx+(a-b)*hw*0.55,py=cy+(a+b)*hh*0.55;ctx.fillStyle='#2c4f7c';ctx.beginPath();ctx.moveTo(px-12,py);ctx.lineTo(px,py-6);ctx.lineTo(px+12,py-2);ctx.lineTo(px,py+4);ctx.fill();ctx.strokeStyle='#6e9bd1';ctx.lineWidth=0.6;ctx.stroke();}break;
  case'quarry':ctx.fillStyle='#7d7a72';diamond(ctx,cx,cy+2,20,10);ctx.fill();ctx.fillStyle='#6a675f';diamond(ctx,cx,cy+4,12,6);ctx.fill();box(ctx,cx+12,cy-4,6,3,6,'#d4a43a');ctx.fillStyle='#c9c5bb';ctx.beginPath();ctx.arc(cx-10,cy-2,4,0,7);ctx.arc(cx-5,cy-5,3,0,7);ctx.fill();break;
  case'coal':case'ore':case'gold':{const heap={coal:'#2b2b2b',ore:'#9a5a3a',gold:'#e2b23a'}[id];ctx.fillStyle=heap;ctx.beginPath();ctx.moveTo(cx-hw*0.8,cy+6);ctx.lineTo(cx-hw*0.4,cy-16);ctx.lineTo(cx,cy+6);ctx.fill();
   ctx.beginPath();ctx.moveTo(cx+hw*0.1,cy+hh*0.6);ctx.lineTo(cx+hw*0.4,cy+hh*0.6-12);ctx.lineTo(cx+hw*0.7,cy+hh*0.6);ctx.fill();box(ctx,cx+hw*0.3,cy-hh*0.3,14,7,16,'#8a7a66');
   ctx.strokeStyle='#5a4a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-6,cy-4);ctx.lineTo(cx+2,cy-48);ctx.lineTo(cx+10,cy-4);ctx.moveTo(cx-3,cy-20);ctx.lineTo(cx+7,cy-20);ctx.stroke();ctx.fillStyle='#ccc';ctx.beginPath();ctx.arc(cx+2,cy-48,5,0,7);ctx.fill();
   if(id==='gold'&&Math.floor(t/500)%2)label(ctx,cx-hw*0.4,cy-22,'✨',10);label(ctx,cx-hw*0.1,cy+hh*0.5,'⛏️',11);break;}
  case'village':ctx.fillStyle='#d9cdb4';diamond(ctx,cx,cy,22,11);ctx.fill();cyl(ctx,cx,cy,9,5,'#a9a59b','#7fc0e8');ctx.fillStyle='#bfe4f7';ctx.fillRect(cx-1,cy-14,2,9);tree(ctx,cx-18,cy+2,0.7);tree(ctx,cx+18,cy-1,0.7);break;
  case'metro':ctx.fillStyle='#d6dbe0';diamond(ctx,cx,cy,20,10);ctx.fill();ctx.fillStyle='#3d4a59';diamond(ctx,cx,cy+1,10,5);ctx.fill();ctx.fillStyle='#1f5fbf';ctx.fillRect(cx+8,cy-26,12,12);ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('U',cx+14,cy-16);ctx.fillStyle='#888';ctx.fillRect(cx+13,cy-14,2,12);break;
  case'cathedral':box(ctx,cx,cy,hw*0.75,hh*0.75,30,'#c9bfae');windows(ctx,cx,cy,hw*0.75,hh*0.75,6,26,1,4,'#6b7fa8');pyramidRoof(ctx,cx,cy,hw*0.75,hh*0.75,30,14,'#5d6b5a');
   for(const a of[-1,1]){box(ctx,cx+a*14,cy-a*2,6,3,58,'#c9bfae');pyramidRoof(ctx,cx+a*14,cy-a*2,6,3,58,22,'#5d6b5a');}break;
  case'aquarium':box(ctx,cx,cy,hw*0.8,hh*0.8,18,'#e3f1f8');ctx.fillStyle='#4fb6e8';ctx.beginPath();ctx.ellipse(cx,cy-18,hw*0.6,hh*0.9,0,Math.PI,0);ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.ellipse(cx-6,cy-24,6,3,0,0,7);ctx.fill();label(ctx,cx+6,cy-26,'🐠',12);label(ctx,cx-hw*0.4,cy+4,'🐬',11);break;
  case'botanic':for(const[a,b]of[[-0.4,0.1],[0.3,-0.3],[0.2,0.4]])tree(ctx,cx+a*hw,cy+b*hh,1);ctx.fillStyle='rgba(200,235,245,.85)';ctx.beginPath();ctx.ellipse(cx,cy-10,24,18,0,Math.PI,0);ctx.fill();ctx.strokeStyle='#9fbfcf';ctx.lineWidth=1;ctx.stroke();
   for(const[a,b,c2]of[[-0.6,0.5,'🌺'],[0.6,0.2,'🌷'],[-0.1,-0.6,'🌻']])label(ctx,cx+a*hw,cy+b*hh,c2,11);break;
  case'studio':box(ctx,cx-hw*0.3,cy,hw*0.45,hh*0.45,26,'#3b3f46');box(ctx,cx+hw*0.35,cy-hh*0.2,hw*0.35,hh*0.35,20,'#e9eef2');ctx.fillStyle='#e2b23a';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText('STUDIO',cx-hw*0.3,cy-16);label(ctx,cx+hw*0.35,cy-30,'🎬',14);break;
  case'opera':box(ctx,cx,cy,hw*0.8,hh*0.8,14,'#e8e4da');for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#f7f7f4':'#e9ebe8';ctx.beginPath();ctx.moveTo(cx-hw*0.7+k*hw*0.35,cy-14);ctx.quadraticCurveTo(cx-hw*0.5+k*hw*0.35,cy-56+k*6,cx-hw*0.3+k*hw*0.35,cy-14);ctx.fill();}break;
  case'skytower':cyl(ctx,cx,cy,7,170,'#d8dde2');cyl(ctx,cx,cy-130,18,16,'#9fb3c4','#c9d6e0');ctx.strokeStyle='#d33';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy-170);ctx.lineTo(cx,cy-205);ctx.stroke();if(Math.floor(t/600)%2){ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(cx,cy-205,2.5,0,7);ctx.fill();}break;
  case'cruise':box(ctx,cx-hw*0.2,cy,hw*0.45,hh*0.45,10,'#e3e8ec');ctx.save();ctx.translate(cx+hw*0.35,cy+hh*0.35);ctx.fillStyle='#fff';ctx.fillRect(-30,-14,60,12);ctx.fillStyle='#1f3a5f';ctx.fillRect(-32,-4,64,8);ctx.fillStyle='#c0392b';ctx.fillRect(10,-26,8,12);
   ctx.fillStyle='#8cc0dc';for(let k=0;k<6;k++)ctx.fillRect(-26+k*9,-11,5,3);ctx.restore();break;
  case'bigairport':case'spaceport':case'olympia':return special(ctx,{bigairport:'airport',spaceport:'space',olympia:'stadium'}[id],cx,cy,n,t,true,seed);
  case'beach':{ctx.fillStyle='#f1dfa6';diamond(ctx,cx,cy,hw,hh);ctx.fill();ctx.fillStyle='#5cc0ee';diamond(ctx,cx+hw*0.35,cy+hh*0.35,hw*0.45,hh*0.45);ctx.fill();
   for(const[a,b,col]of[[-0.4,-0.2,'#e74c3c'],[-0.1,-0.45,'#f1c40f'],[0.05,0.0,'#3498db']]){const px=cx+a*hw,py=cy+b*hh;ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-14);ctx.stroke();ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(px-9,py-12);ctx.quadraticCurveTo(px,py-22,px+9,py-12);ctx.fill();}
   label(ctx,cx-hw*0.55,cy+4,'🏐',9);box(ctx,cx-hw*0.6,cy-hh*0.6,10,5,9,'#f4f1ea');break;}
  case'beachhotel':{ctx.fillStyle='#f1dfa6';diamond(ctx,cx,cy,hw,hh);ctx.fill();
   const pal=[['#fbfaf5','#ecebe4','#6fc3e8'],['#f7c6a3','#f3d9c4','#ffffff'],['#bfe6d8','#e2f4ec','#2e8b9a']][vr%3],hgt=[54,40,68][vr%3];
   box(ctx,cx-6,cy-3,hw*0.55,hh*0.55,hgt,pal[0],pal[1]);windows(ctx,cx-6,cy-3,hw*0.55,hh*0.55,3,hgt-2,Math.round(hgt/8),4,pal[2],true);
   if(vr%3===1)pyramidRoof(ctx,cx-6,cy-3,hw*0.55,hh*0.55,hgt,14,'#c0532f');
   if(vr%3===2){for(let k=0;k<3;k++){ctx.fillStyle='#ffffff';ctx.fillRect(cx-6-hw*0.5+k*4,cy-3-hgt*0.3-k*hgt*0.22,hw*0.5,2);}}
   ctx.fillStyle='#4fd1e8';diamond(ctx,cx+hw*0.45,cy+hh*0.4,14,7);ctx.fill();label(ctx,cx+hw*0.45,cy+hh*0.4-14,'🌴',14);
   if(vr%3!==0){for(const[a,b,col]of[[-0.7,0.3,'#e74c3c'],[-0.45,0.5,'#f1c40f']]){ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+a*hw,cy+b*hh);ctx.lineTo(cx+a*hw,cy+b*hh-10);ctx.stroke();ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx+a*hw-7,cy+b*hh-9);ctx.quadraticCurveTo(cx+a*hw,cy+b*hh-17,cx+a*hw+7,cy+b*hh-9);ctx.fill();}}
   break;}
  case'mountainhotel':{// Berghotel: Chalet, Alpen-Grandhotel oder moderne Lodge – im Schnee, mit Tannen und Schneefall
   ctx.fillStyle='#f4f8fb';diamond(ctx,cx,cy,hw,hh);ctx.fill();
   const snowRoof=(x,y,w,h,z,rh,col)=>{pyramidRoof(ctx,x,y,w,h,z,rh,col);ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.moveTo(x-w*0.55,y-z-rh*0.45);ctx.lineTo(x,y-z-rh);ctx.lineTo(x+w*0.6,y-z-rh*0.42);ctx.lineTo(x,y+h*0.2-z-rh*0.3);ctx.closePath();ctx.fill();};
   const balc=(x,y,w,h,z)=>{ctx.strokeStyle='#5a3416';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+h-z);ctx.lineTo(x+w,y-z);ctx.stroke();ctx.beginPath();ctx.moveTo(x-w,y-z);ctx.lineTo(x,y+h-z);ctx.stroke();};
   const v3=vr%3;
   if(v3===0){box(ctx,cx,cy,hw*0.55,hh*0.55,16,'#e8e2d6');box(ctx,cx,cy-16,hw*0.55,hh*0.55,22,'#a0663a','#8a5530');windows(ctx,cx,cy-16,hw*0.55,hh*0.55,2,20,2,3,'#ffe4a0',true);windows(ctx,cx,cy,hw*0.55,hh*0.55,2,14,1,3,'#9cc7e0');
    balc(cx,cy,hw*0.55,hh*0.55,24);snowRoof(cx,cy,hw*0.62,hh*0.62,38,22,'#5b3a24');cyl(ctx,cx+hw*0.25,cy-52,2.5,10,'#8b8b8b');
    const k=((t/80)%30);ctx.fillStyle=`rgba(230,230,230,${0.6-k/60})`;ctx.beginPath();ctx.arc(cx+hw*0.25+k/4,cy-64-k,3+k/8,0,7);ctx.fill();}
   else if(v3===1){box(ctx,cx-hw*0.15,cy-hh*0.1,hw*0.6,hh*0.6,58,'#f3ead8','#e6dac2');windows(ctx,cx-hw*0.15,cy-hh*0.1,hw*0.6,hh*0.6,3,56,6,5,'#ffe4a0',true);
    for(const z of[20,38])balc(cx-hw*0.15,cy-hh*0.1,hw*0.6,hh*0.6,z);snowRoof(cx-hw*0.15,cy-hh*0.1,hw*0.66,hh*0.66,58,24,'#7a2e24');
    flag(ctx,cx+hw*0.55,cy+hh*0.1,'#e74c3c');ctx.fillStyle='#7a2e24';ctx.fillRect(cx-hw*0.15-11,cy-hh*0.1-96,22,8);ctx.fillStyle='#fff';ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.fillText('ALPENHOF',cx-hw*0.15,cy-hh*0.1-90);}
   else{box(ctx,cx,cy,hw*0.62,hh*0.62,30,'#3c4650','#55626e');windows(ctx,cx,cy,hw*0.62,hh*0.62,3,28,2,5,'#ffd98a',true);
    box(ctx,cx-hw*0.12,cy-30,hw*0.42,hh*0.42,18,'#c79a6a','#f4f8fb');windows(ctx,cx-hw*0.12,cy-30,hw*0.42,hh*0.42,2,16,1,3,'#ffd98a',true);
    ctx.fillStyle='#4fd1e8';diamond(ctx,cx+hw*0.5,cy+hh*0.45,10,5);ctx.fill();ctx.fillStyle='rgba(255,255,255,.7)';for(let k=0;k<3;k++){const o=((t/900+k/3)%1);ctx.globalAlpha=(1-o)*0.7*GHOST_A;ctx.beginPath();ctx.arc(cx+hw*0.5-4+k*4,cy+hh*0.45-4-o*14,2.2,0,7);ctx.fill();}ctx.globalAlpha=GHOST_A;}
   for(const[a,b,s2]of[[-0.78,-0.05,0.9],[0.72,-0.35,0.8],[-0.4,0.6,0.75],[0.55,0.55,0.85]])pine(ctx,cx+a*hw,cy+b*hh,s2,true);
   snowfall(ctx,cx,cy,90,Math.round(cx),Math.round(cy),t,6);break;}
  case'naturepark':for(const[a,b,s2]of[[-0.6,0,1],[-0.3,-0.4,0.9],[0.2,-0.5,1.1],[0.55,-0.1,0.9],[0.3,0.35,1],[-0.25,0.45,0.85],[0,0,1.2]])tree(ctx,cx+a*hw,cy+b*hh,s2);
   label(ctx,cx+hw*0.15,cy+hh*0.15,'🦌',14);ctx.fillStyle='#8a5a33';ctx.fillRect(cx-hw*0.7,cy+hh*0.5,14,8);ctx.fillStyle='#e8f5e0';ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.fillText('NATUR',cx-hw*0.7+7,cy+hh*0.5+5.5);break;
  case'cablecar':{box(ctx,cx-6,cy+2,9,4.5,12,'#d9534f');ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-6,cy-12);ctx.lineTo(cx+60,cy-80);ctx.stroke();
   const k=(t/5000)%1,gx=cx-6+66*k,gy=cy-12-68*k;ctx.fillStyle='#e74c3c';ctx.fillRect(gx-4,gy+2,8,7);ctx.fillStyle='#bfe4f7';ctx.fillRect(gx-3,gy+3,6,3);label(ctx,cx+60,cy-84,'🚠',10);break;}
  case'ski':{// großer Schneeberg mit Pisten, Sessellift, Skifahrern und Hütte
   ctx.fillStyle='#f4f8fb';diamond(ctx,cx,cy,hw,hh);ctx.fill();const H=120,ax=cx+4,ay=cy-hh-H*0.75;
   peak(ctx,cx,cy,hw*1.05,hh*1.05,H,0.92,0.6);
   const P=(k,side)=>({x:ax+(side*hw*0.85-(ax-cx))*k,y:ay+(cy+hh*0.6-ay)*k});
   ctx.lineWidth=2.5;for(const[side,col]of[[-0.55,'rgba(70,140,220,.55)'],[0.15,'rgba(220,60,60,.5)'],[0.6,'rgba(30,30,30,.4)']]){ctx.strokeStyle=col;ctx.beginPath();for(let i=0;i<=12;i++){const p=P(i/12,side),w=Math.sin(i*1.3+side*5)*5;i?ctx.lineTo(p.x+w,p.y):ctx.moveTo(p.x+w,p.y);}ctx.stroke();}
   // Sessellift
   const b0={x:cx-hw*0.55,y:cy+hh*0.25},b1={x:ax-10,y:ay+16};ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(b0.x,b0.y-10);ctx.lineTo(b1.x,b1.y-10);ctx.stroke();
   for(const k of[0,0.33,0.66,1]){const px=b0.x+(b1.x-b0.x)*k,py=b0.y+(b1.y-b0.y)*k;ctx.strokeStyle='#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-10);ctx.stroke();}
   for(let i=0;i<4;i++){const k=((t/9000)+i/4)%1,px=b0.x+(b1.x-b0.x)*k,py=b0.y+(b1.y-b0.y)*k-10;ctx.strokeStyle='#555';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+5);ctx.stroke();ctx.fillStyle='#e74c3c';ctx.fillRect(px-3,py+5,6,3);}
   for(let i=0;i<3;i++){const k=((t/(6000+i*1500))+i*0.33)%1,side=[-0.55,0.15,0.6][i],p=P(k,side);label(ctx,p.x+Math.sin(k*12)*5,p.y-6,'⛷️',11);}
   box(ctx,cx+hw*0.55,cy+hh*0.3,12,6,14,'#8a5a33');pyramidRoof(ctx,cx+hw*0.55,cy+hh*0.3,12,6,14,9,'#f4f8fb');
   for(const[a,b]of[[-0.75,-0.05],[0.78,-0.3],[-0.2,0.65]])pine(ctx,cx+a*hw,cy+b*hh,0.9,true);
   snowfall(ctx,cx,cy,H+20,Math.round(cx),Math.round(cy),t,8);break;}
  case'oil':{ctx.fillStyle='#6d6a62';diamond(ctx,cx,cy,18,9);ctx.fill();const a=Math.sin(t/500)*0.35;ctx.strokeStyle='#333';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-4,cy-2);ctx.lineTo(cx-4,cy-20);ctx.stroke();
   ctx.save();ctx.translate(cx-4,cy-20);ctx.rotate(a);ctx.fillStyle='#e2b23a';ctx.fillRect(-16,-3,32,5);ctx.fillStyle='#333';ctx.fillRect(13,-3,5,12);ctx.restore();box(ctx,cx+10,cy+2,5,2.5,8,'#c0392b');break;}
  case'depot':box(ctx,cx-4,cy,18,9,16,'#c9ccd1','#b3b7bd');ctx.fillStyle='#7a7f86';for(const a of[0.2,0.55]){const px=cx-4+a*18,py=cy+9-a*9;ctx.fillRect(px,py-11,6,10);}
   vehicle(ctx,cx+14,cy+6,0.894,0.447,10,1);vehicle(ctx,cx+8,cy+12,0.894,0.447,10,1);break;
  case'freight':{ctx.fillStyle='#8a8378';diamond(ctx,cx,cy,hw,hh*0.45);ctx.fill();ctx.strokeStyle='#5a4a3a';ctx.lineWidth=1.5;for(const o of[-3,3]){ctx.beginPath();ctx.moveTo(cx-hw+6,cy+o*0.5-hh*0+o);ctx.lineTo(cx+hw-6,cy+o);ctx.stroke();}
   const k=((t/9000)%1)*2-1;for(let i=0;i<5;i++){const a=k*0.6+(-0.5+i*0.22);box(ctx,cx+a*hw,cy+a*hh*0,9,4.5,8,['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad'][i]);}
   box(ctx,cx-hw*0.55,cy-hh*0.55,14,7,16,'#e3e8ec');break;}
  case'pump':cyl(ctx,cx-hw*0.35,cy,14,18,'#7fa9c9','#a9cbe8');cyl(ctx,cx+hw*0.25,cy-hh*0.3,12,16,'#7fa9c9','#a9cbe8');box(ctx,cx+hw*0.2,cy+hh*0.4,14,7,14,'#e3e8ec');label(ctx,cx-hw*0.35,cy-26,'💧',12);break;
 }}finally{if(big){ctx.restore();if(id==='space')label(ctx,cx,cy-150,'🛸',18);if(id==='stadium')label(ctx,cx,cy-40,'🏅',16);}}}
// ---------- Berge (0.15): echte Gipfel mit Höhe, Licht/Schatten, Schneekappen, Tannen und Schneefall ----------
// Tiefe im Gebirge: 1 = Rand (Vorberg), je weiter innen, desto höher der Gipfel
const depthCache=new WeakMap();
const rocky=c=>c.t==='rock'||!!c.rock;   // Gebäude auf Fels zählen nicht – um sie herum wird es flacher (Lichtung)
function mountainDepth(g){const hit=depthCache.get(g);if(hit&&hit.rev===(g.rev||0))return hit.v;
 const N=MAP_W*MAP_H,d=new Uint8Array(N),q=new Int32Array(N);let h=0,e=0;
 for(let i=0;i<N;i++)if(!rocky(g.tiles[i])){d[i]=0;}else d[i]=255;
 for(let i=0;i<N;i++)if(d[i]===255){const x=i%MAP_W,y=(i/MAP_W)|0;if(x===0||y===0||x===MAP_W-1||y===MAP_H-1||d[i-1]===0||d[i+1]===0||d[i-MAP_W]===0||d[i+MAP_W]===0){d[i]=1;q[e++]=i;}}
 while(h<e){const i=q[h++],x=i%MAP_W,y=(i/MAP_W)|0;for(const j of[x>0?i-1:-1,x<MAP_W-1?i+1:-1,y>0?i-MAP_W:-1,y<MAP_H-1?i+MAP_W:-1])if(j>=0&&d[j]===255){d[j]=Math.min(12,d[i]+1);q[e++]=j;}}
 depthCache.set(g,{rev:g.rev||0,v:d});return d;}
const depthAt=(x,y)=>G?mountainDepth(G)[y*MAP_W+x]:0;
const peakH=(d,v)=>d<=0?0:Math.min(115,(d===1?13:6+d*12)*(0.7+v*0.6));
// Ein Gipfel: Grundfläche (Raute bw×bh), Spitze leicht versetzt; links Schatten, rechts Licht (wie bei den Häusern)
function peak(ctx,cx,cy,bw,bh,H,snow,v){const ax=cx+(v-0.5)*bw*0.35,ay=cy-H,L={x:cx-bw,y:cy},F={x:cx,y:cy+bh},R={x:cx+bw,y:cy};
 const lerp=(a,b,k)=>({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}),A={x:ax,y:ay};
 const low=H<30,rockL=low?'#7d8a62':'#787166',rockR=low?'#9aa878':'#a59d8f';
 ctx.fillStyle=rockL;ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(F.x,F.y);ctx.lineTo(A.x,A.y);ctx.closePath();ctx.fill();
 ctx.fillStyle=rockR;ctx.beginPath();ctx.moveTo(F.x,F.y);ctx.lineTo(R.x,R.y);ctx.lineTo(A.x,A.y);ctx.closePath();ctx.fill();
 // Felsrinnen
 if(!low){ctx.strokeStyle='rgba(60,52,44,.35)';ctx.lineWidth=1;for(const k of[0.3,0.62]){const a=lerp(A,F,0.08),b=lerp(L,F,k);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(lerp(a,b,0.7).x+(v-0.5)*4,lerp(a,b,0.7).y);ctx.stroke();}
  ctx.strokeStyle='rgba(255,255,255,.18)';const c1=lerp(F,R,0.45);ctx.beginPath();ctx.moveTo(lerp(A,c1,0.15).x,lerp(A,c1,0.15).y);ctx.lineTo(lerp(A,c1,0.75).x,lerp(A,c1,0.75).y);ctx.stroke();}
 // Grat (Kante vorne) etwas heller
 ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(F.x,F.y);ctx.stroke();
 // Schneekappe mit gezackter Unterkante
 if(snow>0){const k=Math.min(1,snow),zig=(P,Q,n,side)=>{const pts=[];for(let i=0;i<=n;i++){const p=lerp(P,Q,i/n),dn=(i%2?1:-0.4)*H*0.06*k;pts.push({x:p.x,y:p.y+dn});}return pts;};
  const l1=lerp(A,L,k),f1=lerp(A,F,k*(0.9+v*0.2)),r1=lerp(A,R,k*0.95);
  ctx.fillStyle='#dde6ef';ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(l1.x,l1.y);for(const p of zig(l1,f1,5))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(f1.x,f1.y);for(const p of zig(f1,r1,5))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();}}
// Tanne (im Winter mit Schnee)
function pine(ctx,x,y,s=1,snowy){ctx.fillStyle='#5a3d26';ctx.fillRect(x-1*s,y-4*s,2*s,4*s);
 for(let i=0;i<3;i++){const w=(7-i*1.8)*s,yy=y-4*s-i*5*s;ctx.fillStyle=i%2?'#2f6b3c':'#285e34';ctx.beginPath();ctx.moveTo(x-w,yy);ctx.lineTo(x+w,yy);ctx.lineTo(x,yy-8*s);ctx.closePath();ctx.fill();
  if(snowy){ctx.fillStyle='#f4f8fb';ctx.beginPath();ctx.moveTo(x-w*0.45,yy-4*s);ctx.lineTo(x,yy-8*s);ctx.lineTo(x+w*0.3,yy-5*s);ctx.closePath();ctx.fill();}}}
// Schneeflocken, die am Gipfel herunterrieseln
function snowfall(ctx,cx,cy,H,x,y,t,n){if(ZOOM<0.35)return;ctx.fillStyle='rgba(255,255,255,.9)';
 for(let k=0;k<n;k++){const sd=hash(x*5+k,y*7+k*13),L=H+40,f=((t*(0.012+sd*0.01)+sd*997)%L),fx=cx+(sd-0.5)*TW*1.1+Math.sin(t/700+sd*40)*5,fy=cy-H-24+f;
  ctx.globalAlpha=Math.min(1,Math.min(f,L-f)/18);ctx.beginPath();ctx.arc(fx,fy,1+sd*1.1,0,7);ctx.fill();}ctx.globalAlpha=GHOST_A;}
let GHOST_A=1;
function mountain(ctx,c,x,y,cx,cy,t){if(LIGHTS)return;const d=depthAt(x,y),v=hash(x,y),H=peakH(d,v),winter=SEASON==='winter';
 if(d<=1){// Vorberge: niedrige, bewachsene Hügel mit Tannen
  peak(ctx,cx,cy,TW/2*1.05,TH/2*1.05,H,winter?0.9:0,v);if(v>0.35)pine(ctx,cx-8+v*10,cy+4,0.9,winter);if(v>0.7)pine(ctx,cx+10,cy+1,0.75,winter);return;}
 const snow=d>=3?Math.min(0.62,(d-2)*0.12+v*0.12+(winter?0.2:0)):(winter?0.35:v>0.7?0.12:0),bw=TW/2*(1.15+H/75);
 peak(ctx,cx,cy,bw,bw/2,H,snow,v);
 if(d===2&&v<0.5)pine(ctx,cx+12-v*10,cy+6,0.8,true);
 snowfall(ctx,cx,cy,H,x,y,t,d>=3?4:2);}
// Das Feld eines n×n-Gebäudes, das in der aktuellen Drehung zuletzt (ganz vorne) gezeichnet wird
function frontCell(rx,ry,n){let best=null,bd=-1;for(const[x,y]of[[rx,ry],[rx+n-1,ry],[rx,ry+n-1],[rx+n-1,ry+n-1]]){const[u,v]=vpt(x+0.5,y+0.5);if(u+v>bd){bd=u+v;best=[x,y];}}return best;}
function building(ctx,c,x,y,cx,cy,t){
 const T=tool(c.t);if(T&&(T.size>1)){if(c.rx===undefined)return;const n=T.size;const F=frontCell(c.rx,c.ry,n);if(x!==F[0]||y!==F[1])return;if(c.t==='train')return station(ctx,c.rx,c.ry,t);const p=cellTop(c.rx+n/2,c.ry+n/2);return special(ctx,c.t,p.x,p.y,n,t,false,hash1((c.rx*397)^(c.ry*7919))*0.999);}
 if(T&&['school','fire','police','bus','tvtower','quarry','village','metro','cablecar','oil','depot'].includes(c.t))return special(ctx,c.t,cx,cy,1,t);
 if(c.t==='shop')return shop(ctx,c,x,y,cx,cy,t);if(c.t==='factory')return factory(ctx,c,x,y,cx,cy,t);
 if(c.t==='rock')return mountain(ctx,c,x,y,cx,cy,t);
 if(c.t==='tree'){const v=hash(x,y);tree(ctx,cx-8+v*6,cy+2,1);tree(ctx,cx+8,cy-2+v*4,0.85);if(v>0.5)tree(ctx,cx,cy+6,0.75);}
 else if(c.t==='house')house(ctx,c,x,y,cx,cy,t);
 else if(c.t==='park'){ctx.strokeStyle='#e9dcb5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-TW/4,cy-TH/4);ctx.lineTo(cx+TW/4,cy+TH/4);ctx.stroke();tree(ctx,cx-10,cy+4,0.9);tree(ctx,cx+12,cy-1,1);
  ctx.fillStyle='#8a5a33';ctx.fillRect(cx+2,cy+6,9,2);ctx.fillStyle='#e85d8a';ctx.beginPath();ctx.arc(cx-14,cy-4,2,0,7);ctx.arc(cx-4,cy-8,2,0,7);ctx.fill();}
 else if(c.t==='power'){box(ctx,cx,cy,24,12,22,'#b9b2a6','#a59e92');windows(ctx,cx,cy,24,12,4,18,1,3,'#7a8a99');
  for(const[ox,oy]of[[-8,-4],[6,-8]]){box(ctx,cx+ox,cy+oy-22,4,2,26,'#9a6b55');ctx.fillStyle='#e0d8cc';ctx.fillRect(cx+ox-4,cy+oy-44,8,3);
   const k=(((t/40+ox*9)%60)+60)%60;ctx.fillStyle=`rgba(220,220,220,${0.7-k/90})`;ctx.beginPath();ctx.arc(cx+ox+k/6,cy+oy-52-k/2,4+k/10,0,7);ctx.fill();}
  ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('⚡',cx+12,cy-4);}
 else if(c.t==='tower'){box(ctx,cx,cy,4,2,40,'#9aa4ad');ctx.fillStyle='#5aa0d8';ctx.beginPath();ctx.ellipse(cx,cy-46,15,7,0,0,7);ctx.fill();ctx.fillStyle='#4a8cc2';ctx.fillRect(cx-15,cy-58,30,12);
  ctx.fillStyle='#78b8e6';ctx.beginPath();ctx.ellipse(cx,cy-58,15,7,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('H₂O',cx,cy-48);}
}

function bubble(ctx,cx,cy,text,bg){ctx.fillStyle=bg;ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,9,0,7);ctx.fill();ctx.stroke();
 ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#222';ctx.fillText(text,cx,cy+0.5);ctx.textBaseline='alphabetic';}
const HEIGHT={house:[0,30,38,40,60,104,170,270],shop:[0,22,30,46,70,120,200],factory:[0,24,48,74,64,52]};

export function draw(ctx,g,cam,{w,h,dpr,sel,preview,t,showNeeds,money,dirt,traffic,land,bg=true,area,env,ghost,spin}){const V=info(g);TRUCKS=V.cap>0;SEASON=env?.season||'summer';NIGHT=env?.night||0;LIGHTS=false;ZOOM=cam.z;const vis=[];
 ctx.setTransform(dpr,0,0,dpr,0,0);if(bg){ctx.fillStyle='#5f9d4b';ctx.fillRect(0,0,w,h);}
 // spin: Karte wird gerade mit zwei Fingern gedreht (Winkel a um den Punkt px, py zwischen den Fingern)
 const sa=spin?.a||0,co=Math.cos(sa),si=Math.sin(sa),px=spin?.px||0,py=spin?.py||0;
 ctx.setTransform(dpr*co*cam.z,dpr*si*cam.z,-dpr*si*cam.z,dpr*co*cam.z,dpr*(co*(cam.x-px)-si*(cam.y-py)+px),dpr*(si*(cam.x-px)+co*(cam.y-py)+py));
 const pad=sa?Math.max(w,h)*0.6:200;ctx0=ctx;G=g;GHOST=!!ghost;NET=railNet(g);CARS=trainCars(g,NET,t);const cells=[];
 for(let d=0;d<MAP_W+MAP_H-1;d++)for(let u=Math.max(0,d-MAP_H+1);u<=Math.min(d,MAP_W-1);u++){const q=wpt(u+0.5,d-u+0.5),x=Math.floor(q[0]),y=Math.floor(q[1]),p=cellTop(x+0.5,y+0.5),cx=p.x,cy=p.y;
  const sx=cx*cam.z+cam.x,sy=cy*cam.z+cam.y;if(sx<-pad||sx>w+pad||sy<-pad||sy>h+pad*2)continue;if(area&&(x<area[0]||y<area[1]||x>area[2]||y>area[3]))continue;cells.push([x,y,cx,cy]);}
 // 1. Durchgang: flacher Boden (Gras, Straßen, Gleise, Markierungen) – so verdeckt nichts Flaches einen Zug oder ein Haus
 for(const[x,y,cx,cy]of cells){const c=g.tiles[y*MAP_W+x],mine=owns(g,x,y);ground(ctx,c,x,y,cx,cy,t);if(c.t==='grass'&&g.secrets?.[Math.floor(y/SECTOR)*SECTORS+Math.floor(x/SECTOR)]==='oil')oilSpot(ctx,x,y,cx,cy,t);
  if(c.t==='road'&&traffic){const j=V.jam[y*MAP_W+x];ctx.fillStyle=j>1?'rgba(220,40,30,.55)':j>0.7?'rgba(240,170,30,.5)':'rgba(60,170,60,.35)';diamond(ctx,cx,cy,TW/2,TH/2);ctx.fill();}
  if(isRail(c)&&!(isTunnel(c)&&!ghost))railTile(ctx,g,x,y,c);
  if(!mine){ctx.fillStyle=land&&canBuy(g,Math.floor(x/SECTOR),Math.floor(y/SECTOR))?'rgba(255,230,120,.28)':'rgba(20,30,20,.32)';diamond(ctx,cx,cy,TW/2+0.6,TH/2+0.6);ctx.fill();}
  if(dirt&&covered(g,x,y,'dirt')){ctx.fillStyle='rgba(120,80,40,.38)';diamond(ctx,cx,cy,TW/2,TH/2);ctx.fill();}
  if(preview&&x>=preview.x&&y>=preview.y&&x<preview.x+(preview.n||1)&&y<preview.y+(preview.n||1)){ctx.fillStyle=preview.ok?'rgba(255,255,255,.35)':'rgba(220,60,40,.35)';diamond(ctx,cx,cy,TW/2,TH/2);ctx.fill();}
  if(sel&&sel.x===x&&sel.y===y){ctx.strokeStyle='#ffd23f';ctx.lineWidth=2.5;diamond(ctx,cx,cy,TW/2-1,TH/2-1);ctx.stroke();}}
 // 2. Durchgang: von hinten nach vorne Ampeln, Autos, Züge und Gebäude
 for(const[x,y,cx,cy]of cells){const c=g.tiles[y*MAP_W+x];
  const inTunnel=isTunnel(c)&&!ghost;   // im Tunnel sieht man keine Autos und Züge, nur die Portale
  if(c.t==='road'&&!inTunnel)roadMarks(ctx,g,x,y,cx,cy,c,t,cam.z>0.55?Math.min(1.5,V.jam[y*MAP_W+x]):0);
  if(inTunnel)portals(ctx,g,x,y,c);else drawCars(ctx,CARS.cell.get(y*MAP_W+x));
  // Beim Straßenbau sind Gebäude durchsichtig, damit man die Straßen dahinter sieht
  const see=ghost&&c.t!=='tree'&&c.t!=='road'&&c.t!=='rail';if(see)ctx.globalAlpha=GHOST_A=0.28;building(ctx,c,x,y,cx,cy,t);if(see)ctx.globalAlpha=GHOST_A=1;if(NIGHT>0.05)vis.push([c,x,y,cx,cy]);
  if(showNeeds&&HEIGHT[c.t]){const top=cy-HEIGHT[c.t][c.lvl]-6;
   if(c.lvl<maxLevel(c)){const miss=missing(g,x,y,c.lvl+1);if(miss.length){if(miss[0]!=='city')bubble(ctx,cx,top,NEEDS[miss[0]].icon,'rgba(255,255,255,.92)');}else if(money>=upgradeCost(c))bubble(ctx,cx,top,'⬆️','rgba(190,240,160,.95)');}}
 }
 // Nacht: Himmel abdunkeln, dann Lichter (Fenster, Laternen, Scheinwerfer, Ampeln) darüber leuchten lassen
 if(NIGHT>0.05||env?.weather==='rain'||env?.weather==='cloud'||env?.dusk){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  if(env?.weather==='cloud'||env?.weather==='rain'){ctx.fillStyle=`rgba(90,100,115,${env.weather==='rain'?0.22:0.12})`;ctx.fillRect(0,0,w,h);}
  if(env?.dusk&&NIGHT<0.9){ctx.fillStyle=`rgba(255,130,60,${0.14*(1-Math.abs(NIGHT-0.5)*2)})`;ctx.fillRect(0,0,w,h);}
  if(NIGHT>0.05){ctx.fillStyle=`rgba(12,20,60,${0.58*NIGHT})`;ctx.fillRect(0,0,w,h);}ctx.restore();}
 if(NIGHT>0.3){LIGHTS=true;ctx.globalAlpha=0;for(const[c,x,y,cx,cy]of vis){if(isTunnel(c))continue;if(c.t==='road')roadMarks(ctx,g,x,y,cx,cy,c,t,cam.z>0.55?Math.min(1.5,V.jam[y*MAP_W+x]):0);drawCars(ctx,CARS.cell.get(y*MAP_W+x));if(c.t!=='road')building(ctx,c,x,y,cx,cy,t);}
  ctx.globalAlpha=1;LIGHTS=false;}
 // Wetter: Regen und Schnee (in Bildschirm-Koordinaten)
 if(env?.weather==='rain'||env?.weather==='snow'){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const snow=env.weather==='snow',n=snow?110:160;
  ctx.strokeStyle='rgba(200,215,235,.55)';ctx.lineWidth=1;ctx.fillStyle='rgba(255,255,255,.9)';
  for(let i=0;i<n;i++){const sp=snow?0.03:0.5,X=((i*97.3+(snow?Math.sin(t/900+i)*14:t*0.18))%w+w)%w,Y=((i*53.7+t*sp)%h+h)%h;
   if(snow){ctx.beginPath();ctx.arc(X,Y,1.2+(i%3)*0.6,0,7);ctx.fill();}else{ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X-3,Y+11);ctx.stroke();}}ctx.restore();}
 // Flugzeuge über der Stadt, wenn es einen Flughafen gibt
 if((V.count.airport||0)+(V.count.bigairport||0)>0){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const now=Date.now();
  for(let k=0;k<((V.count.bigairport||0)?2:1);k++){const q=((now/38000)+k*0.5)%1,X=-80+q*(w+160),Y=h*0.78-q*h*0.62+k*40;
   ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X-14,Y+9);ctx.lineTo(X-14-140,Y+9+140*0.62*h/(w+160));ctx.stroke();
   ctx.save();ctx.translate(X,Y);ctx.rotate(-Math.atan2(h*0.62,w+160));ctx.fillStyle='#f4f6f8';ctx.beginPath();ctx.ellipse(0,0,16,3.2,0,0,7);ctx.fill();
   ctx.fillStyle='#d5dbe1';ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-8,-12);ctx.lineTo(-4,-12);ctx.lineTo(5,0);ctx.lineTo(-4,12);ctx.lineTo(-8,12);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-17,-6);ctx.lineTo(-14,-6);ctx.lineTo(-10,0);ctx.fill();ctx.fillStyle='#2f6fb0';ctx.fillRect(-10,-1.2,18,1.2);
   if(Math.floor(now/500)%2){ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.arc(-6,-12,1.6,0,7);ctx.fill();ctx.fillStyle='#34c759';ctx.beginPath();ctx.arc(-6,12,1.6,0,7);ctx.fill();}ctx.restore();}ctx.restore();}
 // Beschriftungen in fester Bildschirmgröße (auch weit herausgezoomt lesbar)
 const k=Math.min(4,1/cam.z);const tag=(p,txt,font,dy,fg,bgc)=>{ctx.font=`${font}px sans-serif`;ctx.textAlign='center';const wd=(ctx.measureText(txt).width/1)+14*k;ctx.fillStyle=bgc;ctx.beginPath();ctx.roundRect(p.x-wd/2,p.y+dy-font*0.95,wd,font*1.35,8*k);ctx.fill();ctx.fillStyle=fg;ctx.fillText(txt,p.x,p.y+dy);};
 if(land){for(let sy=0;sy<SECTORS;sy++)for(let sx=0;sx<SECTORS;sx++){const p=cellTop(sx*SECTOR+SECTOR/2,sy*SECTOR+SECTOR/2),f=features(g,sx,sy),buy=canBuy(g,sx,sy);
   if(f.length)tag(p,f.map(q=>FEATURES[q].icon).join(' '),20*k,-16*k,'#000','rgba(255,255,255,.85)');
   if(buy)tag(p,'🗺️ '+sectorPrice(g,sx,sy).toLocaleString('de-DE'),13*k,14*k,'#245a91','rgba(255,255,255,.95)');}}
 // Ölfeld im eigenen Land: Schild, solange dort noch kein Ölbohrturm steht (auch ohne „Land“-Ansicht sichtbar)
 if(!land&&g.secrets){const hasTower=new Set();for(let i=0;i<g.tiles.length;i++)if(g.tiles[i].t==='oil')hasTower.add(Math.floor(Math.floor(i/MAP_W)/SECTOR)*SECTORS+Math.floor((i%MAP_W)/SECTOR));
  for(let i=0;i<g.secrets.length;i++)if(g.secrets[i]==='oil'&&g.land[i]===1&&!hasTower.has(i)){const sx=i%SECTORS,sy=Math.floor(i/SECTORS),p=cellTop(sx*SECTOR+SECTOR/2,sy*SECTOR+SECTOR/2),b=Math.sin(t/400)*3*k;
   tag({x:p.x,y:p.y+b},'🛢️ Öl – hier Ölbohrturm bauen',15*k,-10*k,'#fff','rgba(30,30,34,.88)');}}
 // Nachbarstädte am Rand der Welt
 const W2=wanted(Date.now());for(const[i,nb]of NEIGHBORS.entries()){const pos=[[MAP_W/2,-4],[MAP_W+4,MAP_H/2],[MAP_W/2,MAP_H+4],[-4,MAP_H/2]][i],p=cellTop(pos[0],pos[1]);
  for(const[a,b,hh,col]of[[-30,6,40,'#cfd9e2'],[0,0,70,'#b9cad8'],[28,8,50,'#e3d6c4'],[-12,18,26,'#f2d0c4'],[16,22,30,'#d9ecd5']])box(ctx,p.x+a,p.y+b,12,6,hh,col);
  tag({x:p.x,y:p.y+34+12*k},`${nb.icon} ${nb.name} · sucht ${GOODS[W2[nb.id]].icon}`,14*Math.max(1,k*0.8),0,'#1f2a36','rgba(255,255,255,.95)');}
 // Kartenrand
 ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=2;const a=cellTop(0,0),b=cellTop(MAP_W,0),c2=cellTop(MAP_W,MAP_H),d2=cellTop(0,MAP_H);
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c2.x,c2.y);ctx.lineTo(d2.x,d2.y);ctx.closePath();ctx.stroke();}
