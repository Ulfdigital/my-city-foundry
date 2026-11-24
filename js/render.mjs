// My City Foundry – Zeichnen der Stadt in schräger Draufsicht (isometrisch) auf einem Canvas.
import {MAP_W,MAP_H,LEVELS,NEEDS,BIZ} from './data.mjs';
import {tile,missing,maxLevel,upgradeCost} from './engine.mjs';

export const TW=64,TH=32;
export const cellTop=(x,y)=>({x:(x-y)*TW/2,y:(x+y)*TH/2});
export function screenToCell(cam,sx,sy){const wx=(sx-cam.x)/cam.z,wy=(sy-cam.y)/cam.z,u=wx/(TW/2),v=wy/(TH/2);return{x:Math.floor((v+u)/2),y:Math.floor((v-u)/2)};}
export function centerOn(cam,x,y,w,h){const p=cellTop(x,y);cam.x=w/2-p.x*cam.z;cam.y=h/2-(p.y+TH/2)*cam.z;}

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
function windows(ctx,cx,cy,hw,hh,z0,z1,rows,cols,color,lit){
 const fh=(z1-z0)/rows;
 for(const side of[0,1])for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const t0=(c+0.22)/cols,t1=(c+0.78)/cols,v0=z0+r*fh+fh*0.22,v1=z0+r*fh+fh*0.78;
  const P=(t,v)=>side?{x:cx+t*hw,y:cy+hh-t*hh-v}:{x:cx-hw+t*hw,y:cy+t*hh-v};
  const a=P(t0,v0),b=P(t1,v0),d=P(t1,v1),e=P(t0,v1);
  ctx.fillStyle=lit&&((r*7+c*3+side)%5===0)?'#ffe9a8':(side?color:shade(color,0.8));
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.closePath();ctx.fill();}}
function pyramidRoof(ctx,cx,cy,hw,hh,z,rh,color){const ap={x:cx,y:cy-z-rh};
 ctx.fillStyle=shade(color,0.8);ctx.beginPath();ctx.moveTo(cx-hw-2,cy-z);ctx.lineTo(cx,cy+hh-z+1);ctx.lineTo(ap.x,ap.y);ctx.closePath();ctx.fill();
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(cx,cy+hh-z+1);ctx.lineTo(cx+hw+2,cy-z);ctx.lineTo(ap.x,ap.y);ctx.closePath();ctx.fill();}
function tree(ctx,x,y,s=1){ctx.fillStyle='#6b4a2e';ctx.fillRect(x-1.5*s,y-8*s,3*s,8*s);ctx.fillStyle='#3f8a3a';ctx.beginPath();ctx.arc(x,y-12*s,7*s,0,7);ctx.fill();ctx.fillStyle='#57a64a';ctx.beginPath();ctx.arc(x-2*s,y-14*s,4*s,0,7);ctx.fill();}

function ground(ctx,c,x,y,cx,cy,t){
 const v=hash(x,y);let col='#86c56a';
 if(c.t==='water'){col='#4fa3d8';}else if(c.t==='road')col='#8d9096';else if(c.t==='zone')col='#a9d98f';else if(c.t==='zonec')col='#a9cbe8';else if(c.t==='zonei')col='#e6d98f';else if(c.t==='park')col='#6fbf5a';else col=v<0.5?'#86c56a':'#80bf64';
 ctx.fillStyle=col;diamond(ctx,cx,cy,TW/2+0.6,TH/2+0.6);ctx.fill();
 if(c.t==='water'){ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.2;const o=Math.sin(t/700+x+y)*3;ctx.beginPath();ctx.moveTo(cx-10+o,cy-2);ctx.quadraticCurveTo(cx-4+o,cy-5,cx+2+o,cy-2);ctx.stroke();}
 if(c.t==='zone'||c.t==='zonec'||c.t==='zonei'){ctx.strokeStyle=c.t==='zone'?'rgba(60,120,40,.7)':c.t==='zonec'?'rgba(40,90,160,.7)':'rgba(150,120,20,.8)';ctx.setLineDash([4,3]);ctx.lineWidth=1.2;diamond(ctx,cx,cy,TW/2-5,TH/2-2.5);ctx.stroke();ctx.setLineDash([]);
  if(c.ready){ctx.fillStyle='#c9a46a';ctx.fillRect(cx-8,cy-6,16,3);ctx.fillStyle='#8d6b3a';ctx.fillRect(cx-7,cy-12,2,9);ctx.fillRect(cx+5,cy-12,2,9);ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('🚧',cx,cy-12);}}
}
function roadMarks(ctx,g,x,y,cx,cy){const n=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>tile(g,x+dx,y+dy)?.t==='road');
 const ends=[{x:cx+TW/4,y:cy+TH/4},{x:cx-TW/4,y:cy-TH/4},{x:cx-TW/4,y:cy+TH/4},{x:cx+TW/4,y:cy-TH/4}];
 ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.4;ctx.setLineDash([4,4]);
 let any=false;n.forEach((on,i)=>{if(on){any=true;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ends[i].x,ends[i].y);ctx.stroke();}});
 ctx.setLineDash([]);if(!any){ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(cx-2,cy-1,4,2);}}

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
   if(Math.floor(t/600)%2){ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(cx,cy-162,2,0,7);ctx.fill();}break;}}}

function shop(ctx,c,x,y,cx,cy,t){
 if(c.lvl===1){box(ctx,cx,cy,13,6.5,12,'#f6f1e7');for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#fff':'#e2483b';ctx.beginPath();const a=i/4,b=(i+1)/4;ctx.moveTo(cx+a*13,cy+6.5-a*6.5-12);ctx.lineTo(cx+b*13,cy+6.5-b*6.5-12);ctx.lineTo(cx+b*13+2,cy+6.5-b*6.5-7);ctx.lineTo(cx+a*13+2,cy+6.5-a*6.5-7);ctx.fill();}
  ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('🛒',cx-6,cy-2);}
 else if(c.lvl===2){box(ctx,cx,cy,22,11,16,'#eef2f6','#d4dce4');windows(ctx,cx,cy,22,11,1,9,1,4,'#8cc0dc');ctx.fillStyle='#2f7d3a';ctx.fillRect(cx+2,cy-22,18,7);ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('MARKT',cx+11,cy-16.5);}
 else{box(ctx,cx,cy,26,13,26,'#e7edf3','#cbd5df');windows(ctx,cx,cy,26,13,2,24,2,5,'#7fb3d9',true);ctx.fillStyle='#e85d8a';ctx.fillRect(cx-6,cy-40,24,8);ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('CENTER',cx+6,cy-34);}}
function smoke(ctx,x,y,t,seed){const k=(((t/40+seed*9)%60)+60)%60;ctx.fillStyle=`rgba(210,210,210,${0.7-k/90})`;ctx.beginPath();ctx.arc(x+k/6,y-k/2,4+k/10,0,7);ctx.fill();}
function factory(ctx,c,x,y,cx,cy,t){
 const saw=(hw,hh,z,n,col)=>{for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,p0={x:cx-hw+a*hw*2*0.5+a*hw,y:0};const bx=cx-hw+ (a*2*hw),bx2=cx-hw+(b*2*hw);ctx.fillStyle=i%2?col:shade(col,0.85);ctx.beginPath();ctx.moveTo(bx,cy-z+(a-0.5)*0);ctx.lineTo(bx2,cy-z);ctx.lineTo(bx2,cy-z-7);ctx.closePath();ctx.fill();}};
 if(c.lvl===1){box(ctx,cx,cy,16,8,14,'#c9b08a','#b39a74');ctx.fillStyle='#6a5a4a';ctx.fillRect(cx+4,cy-4,7,-0);windows(ctx,cx,cy,16,8,2,10,1,2,'#6f8496');ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('🔧',cx+8,cy-2);}
 else if(c.lvl===2){box(ctx,cx,cy,24,12,20,'#b7a27f','#a08d6b');saw(24,12,20,4,'#8a7a66');windows(ctx,cx,cy,24,12,3,16,1,4,'#6f8496');box(ctx,cx-10,cy-8,3,1.5,34,'#8b4a3a');smoke(ctx,cx-10,cy-44,t,x+y);}
 else{box(ctx,cx,cy,27,13.5,26,'#aab0b6','#949ba2');windows(ctx,cx,cy,27,13.5,3,22,2,5,'#6f8496');box(ctx,cx-12,cy-10,3.5,1.8,44,'#8b4a3a');box(ctx,cx-4,cy-14,3.5,1.8,50,'#8b4a3a');
  smoke(ctx,cx-12,cy-56,t,x);smoke(ctx,cx-4,cy-66,t,y+3);ctx.fillStyle='#d6dde3';ctx.beginPath();ctx.ellipse(cx+14,cy-30,6,3,0,0,7);ctx.fill();ctx.fillRect(cx+8,cy-30,12,8);}}
function building(ctx,c,x,y,cx,cy,t){
 if(c.t==='shop')return shop(ctx,c,x,y,cx,cy,t);if(c.t==='factory')return factory(ctx,c,x,y,cx,cy,t);
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
const HEIGHT={house:[0,30,38,40,60,104,170],shop:[0,22,30,46],factory:[0,24,48,74]};

export function draw(ctx,g,cam,{w,h,dpr,sel,preview,t,showNeeds,money}){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#5f9d4b';ctx.fillRect(0,0,w,h);
 ctx.setTransform(dpr*cam.z,0,0,dpr*cam.z,dpr*cam.x,dpr*cam.y);
 const pad=200;
 for(let d=0;d<MAP_W+MAP_H-1;d++)for(let x=Math.max(0,d-MAP_H+1);x<=Math.min(d,MAP_W-1);x++){const y=d-x,p=cellTop(x,y),cx=p.x,cy=p.y+TH/2;
  const sx=cx*cam.z+cam.x,sy=cy*cam.z+cam.y;if(sx<-pad||sx>w+pad||sy<-pad||sy>h+pad*2)continue;
  const c=g.tiles[y*MAP_W+x];ground(ctx,c,x,y,cx,cy,t);if(c.t==='road')roadMarks(ctx,g,x,y,cx,cy);
  if(preview&&preview.x===x&&preview.y===y){ctx.fillStyle=preview.ok?'rgba(255,255,255,.35)':'rgba(220,60,40,.35)';diamond(ctx,cx,cy,TW/2,TH/2);ctx.fill();}
  if(sel&&sel.x===x&&sel.y===y){ctx.strokeStyle='#ffd23f';ctx.lineWidth=2.5;diamond(ctx,cx,cy,TW/2-1,TH/2-1);ctx.stroke();}
  building(ctx,c,x,y,cx,cy,t);
  if(showNeeds&&HEIGHT[c.t]){const top=cy-HEIGHT[c.t][c.lvl]-6;
   if(c.lvl<maxLevel(c)){const miss=missing(g,x,y,c.lvl+1);if(miss.length){if(miss[0]!=='city')bubble(ctx,cx,top,NEEDS[miss[0]].icon,'rgba(255,255,255,.92)');}else if(money>=upgradeCost(c))bubble(ctx,cx,top,'⬆️','rgba(190,240,160,.95)');}}
 }
 // Kartenrand
 ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=2;const a=cellTop(0,0),b=cellTop(MAP_W,0),c2=cellTop(MAP_W,MAP_H),d2=cellTop(0,MAP_H);
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c2.x,c2.y);ctx.lineTo(d2.x,d2.y);ctx.closePath();ctx.stroke();}
