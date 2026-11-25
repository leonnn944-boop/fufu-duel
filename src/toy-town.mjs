// Small-town models share rounded timber edges, enamel signs and glazed roofs.
import * as pc from '../vendor/playcanvas.min.mjs';
import {Builder} from './landmark-models.mjs';

const C={
  ink:'#355d65',wood:'#a26c4e',bark:'#856348',cream:'#fff0cc',honey:'#edbd70',
  glass:'#82c8c5',shade:'#4d8d90',leaf:'#71ae80',leafLight:'#a5c778',stone:'#bdac97',
  jade:'#589e94',clay:'#ce775c',apricot:'#edaa77',butter:'#f3d783',plum:'#987b9d',
};
const TINTS=[
  {wall:'#ffdaac',roof:'#ca755c',light:'#e79270'},
  {wall:'#f6cf9e',roof:'#45998e',light:'#78b9a0'},
  {wall:'#d6d8ac',roof:'#6c8ead',light:'#94aec3'},
  {wall:'#efc6ae',roof:'#a47492',light:'#ce99aa'},
];

// Draw bevels as real geometry. An overhead player sees the light-catching
// lip and front eaves even when a townhouse is only a thumbnail.
export function softBox(b,name,x,z,w,d,bottom,top,radius,color,rim=.045){
  b.features.push(name);
  const profile=(inset,y)=>{
    const hw=w/2-inset, hd=d/2-inset;
    const r=Math.max(.001,Math.min(radius-inset,hw-.001,hd-.001));
    return [[1,1],[-1,1],[-1,-1],[1,-1]].flatMap(([sx,sz],i)=>{
      const cx=x+sx*(hw-r),cz=z+sz*(hd-r);
      return [0,1,2,3].map(n=>{
        const a=(i+n/3)*Math.PI/2;
        return [cx+r*Math.cos(a),y,cz+r*Math.sin(a)];
      });
    });
  };
  const edge=Math.min(rim,(top-bottom)/3,w*.12,d*.12);
  const rings=[profile(edge,bottom),profile(0,bottom+edge),profile(0,top-edge),profile(edge,top)];
  for(let i=0;i<rings[0].length;i++){
    const j=(i+1)%rings[0].length;
    for(let k=0;k<rings.length-1;k++)b.quad(rings[k][j],rings[k][i],rings[k+1][i],rings[k+1][j],color);
    b.tri([x,top,z],rings[3][j],rings[3][i],color);
    b.tri([x,bottom,z],rings[0][i],rings[0][j],color);
  }
}

export function pebble(b,name,x,y,z,rx,ry,rz,color,sides=12,layers=7){
  b.features.push(name);
  const vertex=(j,i)=>{
    const elevation=-Math.PI/2+Math.PI*j/layers,theta=2*Math.PI*i/sides;
    const dx=Math.cos(elevation)*Math.cos(theta),dy=Math.sin(elevation),dz=Math.cos(elevation)*Math.sin(theta);
    const len=Math.hypot(dx/rx,dy/ry,dz/rz)||1;
    return {p:[x+rx*dx,y+ry*dy,z+rz*dz],n:[dx/rx/len,dy/ry/len,dz/rz/len]};
  };
  const ring=Array.from({length:layers+1},(_,j)=>Array.from({length:sides},(_,i)=>vertex(j,i)));
  const draw=(a,c,d)=>b.smoothTri(a.p,c.p,d.p,color,a.n,c.n,d.n);
  for(let j=0;j<layers;j++)for(let i=0;i<sides;i++){
    const k=(i+1)%sides,lo=ring[j],hi=ring[j+1];
    if(j===0)draw(lo[i],hi[i],hi[k]);
    else if(j===layers-1)draw(lo[k],lo[i],hi[i]);
    else{draw(lo[k],lo[i],hi[i]);draw(lo[k],hi[i],hi[k]);}
  }
}

function pane(b,x,y,z,w,h){
  softBox(b,'painted casing',x,z,w+.13,.13,y-h/2-.07,y+h/2+.07,.06,C.cream,.025);
  b.box('sea glass',[x,y,z+.072],[w,h,.055],C.shade);
  b.box('upper pane',[x,y+.08*h,z+.11],[w*.84,h*.62,.025],C.glass);
  b.box('crossbar',[x,y-.16*h,z+.13],[w,.055,.035],C.cream);
  b.box('timber window ledge',[x,y-h*.5-.06,z+.08],[w+.23,.095,.21],C.wood);
}

// Build equivalent detail on faces the follow camera can see after a turn.
export function elevation(b,quarterTurns){
  const turn=quarterTurns*Math.PI/2,cs=Math.cos(turn),sn=Math.sin(turn);
  const rotate=([x,y,z])=>[cs*x+sn*z,y,-sn*x+cs*z];
  const face=new Builder(b.scene,b.root);
  face.features=b.features;
  face.tri=(a,c,d,dye)=>b.tri(rotate(a),rotate(c),rotate(d),dye);
  face.smoothTri=(a,c,d,dye,na,nc,nd)=>b.smoothTri(rotate(a),rotate(c),rotate(d),dye,rotate(na),rotate(nc),rotate(nd));
  return face;
}

function loaf(b,x,y,z,scale){
  pebble(b,'golden scored loaf',x,y,z,.26*scale,.17*scale,.17*scale,C.honey,12,7);
  for(const d of [-.08,.08])b.beam('bread score',[x+(d-.04)*scale,y+.13*scale,z+.08*scale],[x+(d+.04)*scale,y+.14*scale,z+.055*scale],.035*scale,C.cream);
}

function tradingWindow(b,face,use,tint){
  const z=face;
  softBox(b,'shop window painted frame',0,z,1.79,.15,.39,1.38,.12,C.cream);
  softBox(b,'deep display recess',0,z+.09,1.57,.08,.49,1.25,.06,C.ink,.02);
  softBox(b,'display shelf',0,z+.23,1.80,.43,.43,.55,.08,C.wood,.025);
  if(use==='shop'){
    for(const [x,dy,s] of [[-.49,.15,1.05],[-.06,.13,1.16],[.42,.15,.98]])loaf(b,x,.53+dy,z+.25,s);
    b.box('display transom',[0,1.08,z+.12],[1.47,.075,.05],C.cream);
  }else{
    for(const [x,scale] of [[-.46,.83],[0,1.05],[.49,.68]]){
      b.cylinder('workbench flowerpot',x,.65,z+.20,.108*scale,.25*scale,C.clay,.16*scale);
      pebble(b,'potted herb',x,.65+.23*scale,z+.21,.19*scale,.22*scale,.14*scale,C.leafLight,10,6);
    }
  }
  softBox(b,'display eave',0,z+.17,1.96,.53,1.30,1.43,.11,tint.roof);
}

function envelope(b,x,y,z,w){
  softBox(b,'enamel letter sign',x,z,w,.13,y-w*.28,y+w*.28,.065,C.cream,.02);
  for(const side of [-1,1])b.beam('letter chevron',[x+side*w*.44,y+w*.2,z+.079],[x,y-w*.065,z+.084],.062,C.clay);
}

function districtElevations(b,use,tint){
  const rear=elevation(b,2);
  if(use==='shop')tradingWindow(rear,1.15,'shop',tint);
  else if(use==='office')tradingWindow(rear,1.17,'office',tint);
  else if(use==='public'){
    for(const x of [-.95,.95])pane(rear,x,.85,1.18,.49,.76);
    softBox(rear,'mail station recess',0,1.22,.96,.14,.34,1.40,.11,C.wood);
    envelope(rear,0,1.06,1.33,.77);
    softBox(rear,'blue parcel slot',0,1.33,.58,.14,.49,.67,.055,C.ink);
    softBox(rear,'covered parcel counter',0,1.44,.95,.43,.34,.46,.07,C.honey);
  }else{
    for(const x of [-.72,.72])pane(rear,x,.91,1.145,.64,.75);
    pebble(rear,'round attic casing',0,1.93,1.37,.24,.24,.06,C.cream);
    pebble(rear,'attic pane',0,1.93,1.425,.17,.17,.04,C.shade);
  }
  for(const turn of [-1,1]){
    const side=elevation(b,turn);
    if(use==='shop'&&turn===1){tradingWindow(side,1.479,'shop',tint);continue;}
    if(use==='office')continue;
    const z=use==='home'?1.40:use==='shop'?1.48:1.51;
    pane(side,0,.90,z,.95,.72);
    for(const sign of [-1,1]){
      softBox(side,'louvered timber shutters',sign*.65,z+.043,.21,.10,.50,1.29,.045,tint.roof,.02);
      for(const y of [.71,.96,1.16])side.box('shutter boards',[sign*.65,y,z+.105],[.15,.032,.025],tint.light);
    }
    if(use==='public'){
      envelope(side,0,1.46,z+.095,.56);
    }else if(use==='home'){
      softBox(side,'herb window box',0,z+.14,.94,.29,.34,.52,.075,C.wood,.03);
      for(const x of [-.28,0,.29])pebble(side,'kitchen herbs',x,.55,z+.17,.21,.13,.12,C.leaf,8,5);
    }
  }
}

function threshold(b,face){
  softBox(b,'stone porch',0,1.65,1.18,.98,.02,.115,.18,C.stone);
  softBox(b,'front step',0,2.15,.94,.53,.012,.07,.13,'#dfc8a3',.018);
  b.arch('painted door casing',0,.11,face+.03,.86,1.40,C.cream,C.cream);
  b.arch('round top door',0,.13,face+.075,.69,1.22,C.jade,C.ink);
  b.arch('door lite',0,.71,face+.106,.45,.49,C.glass,C.cream);
  pebble(b,'enamel doorknob',.20,.59,face+.15,.065,.065,.04,C.honey,8,5);
}

function bentRoof(b,y,w,d,tint){
  // Deliberately bowed slope and lifted eaves, with three staggered tile courses.
  const ridgeZ=-d/2, backZ=d/2;
  const yAt=t=>y+.93*(1-t)**1.18+.09*t*t;
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const t=i/4,n=(i+1)/4;
      const x=side*w*.5*t, xx=side*w*.5*n;
      const roof=[[x,yAt(t),ridgeZ],[xx,yAt(n),ridgeZ],[xx,yAt(n),backZ],[x,yAt(t),backZ]];
      if(side>0)roof.reverse();
      b.quad(...roof,tint.roof);
      if(i>0){
        b.beam('raised roof course',[x,yAt(t)+.012,ridgeZ],[x,yAt(t)+.012,backZ],.052,tint.light);
        for(let k=0;k<3;k++){const z=-d*.36+k*d*.32+(i%2)*.18;
          b.beam('overlapping shingles',[x,yAt(t)+.02,z],[xx,yAt(n)+.02,z],.03,tint.light);}
      }
    }
    b.beam('sculpted eave',[side*w*.5,yAt(1),ridgeZ],[side*w*.5,yAt(1),backZ],.13,tint.light);
    for(const z of [ridgeZ,backZ]){
      for(let i=0;i<4;i++){
        const t=i/4,n=(i+1)/4;
        const start=[side*w*.5*n,yAt(n),z],end=[side*w*.5*t,yAt(t),z];
        b.tri([0,y,z],side*z>0?start:end,side*z>0?end:start,tint.wall);
        b.beam('painted bargeboard',[side*w*.5*t,yAt(t),z],[side*w*.5*n,yAt(n),z],.09,tint.light);
      }
    }
  }
  b.beam('ridge cap',[0,yAt(0)+.03,ridgeZ-.04],[0,yAt(0)+.03,backZ+.04],.13,tint.light);
}

function awning(b,face,w,color){
  const ribs=7;
  for(let i=0;i<ribs;i++){
    const xa=(i/ribs-.5)*w,xb=((i+1)/ribs-.5)*w;
    const dye=i%2?C.cream:color;
    const track=[[.00,1.59],[.19,1.62],[.39,1.59],[.61,1.49],[.73,1.34]];
    for(let j=0;j<track.length-1;j++){
      const [za,ya]=track[j],[zb,yb]=track[j+1];
      b.quad([xa,ya,face+za],[xa,yb,face+zb],[xb,yb,face+zb],[xb,ya,face+za],dye);
    }
    const z=face+.735;
    b.quad([xa,1.34,z],[xa,1.25,z],[xb,1.25,z],[xb,1.34,z],dye);
    for(let j=0;j<7;j++){
      const angle=j*Math.PI/7,a=(j+1)*Math.PI/7;
      const arc=v=>[(xa+xb)/2-(xb-xa)/2*Math.cos(v),1.251-.095*Math.sin(v),z];
      b.tri([(xa+xb)/2,1.255,z],arc(angle),arc(a),dye);
    }
  }
}

function bakehouse(b,tint){
  const h=1.67,d=2.30;
  softBox(b,'bakehouse walls',0,0,2.95,d,.10,h,.19,tint.wall);
  softBox(b,'baker roof rim',0,0,3.2,2.60,h-.04,h+.14,.27,C.wood);
  pebble(b,'domed clay oven roof',0,h+.11,-.04,1.60,.72,1.27,tint.roof,20,10);
  for(const side of [-1,1])for(const x of [.63,1.12]){
    const r=Math.sqrt(1-(x/1.61)**2);
    const p=a=>[x*side,h+.125+.72*r*Math.sin(a),-.04+1.28*r*Math.cos(a)];
    for(let k=0;k<9;k++)b.beam('glazed oven roof rib',p(k*Math.PI/9),p((k+1)*Math.PI/9),.058,tint.light);
  }
  softBox(b,'bread sign board',0,.15,1.61,.43,h+.52,h+.99,.16,C.wood);
  pebble(b,'brioche sign',0,h+.91,.40,.68,.29,.16,C.honey);
  for(const x of [-.26,0,.26])b.beam('scored loaf',[x-.095,h+.93,.547],[x+.085,h+1.04,.518],.065,C.cream);
  const reverse=elevation(b,2);
  pebble(reverse,'bakers loaf sign verso',0,h+.91,.09,.68,.29,.16,C.honey);
  for(const x of [-.26,0,.26])reverse.beam('loaf score',[x-.095,h+.93,.237],[x+.085,h+1.04,.208],.065,C.cream);
  for(const x of [-.92,.92])pane(b,x,.72,d/2+.005,.61,.64);
  for(const x of [-.92,.92]){
    softBox(b,'window bread tray',x,d/2+.155,.68,.33,.41,.49,.065,C.wood);
    loaf(b,x,.595,d/2+.22,.74);
  }
  threshold(b,d/2);awning(b,d/2,2.85,tint.roof);
  softBox(b,'side chimney',-1.16,-.62,.40,.43,h+.12,h+.89,.075,C.clay);
  softBox(b,'chimney cap',-1.16,-.62,.52,.52,h+.81,h+.98,.08,C.cream);
  return h+1.20;
}

function postHouse(b,tint){
  const h=1.64,face=1.17;
  softBox(b,'civic hall',0,0,3.02,face*2,.11,h,.18,'#e1d6af');
  softBox(b,'cornice',0,0,3.23,2.53,h-.04,h+.12,.20,C.cream);
  b.frustum('copper hipped roof',0,h+.37,0,3.26,2.30,.55,2.60,1.55,tint.roof);
  for(const k of [.20,.54,.86]){
    const y=h+.096+k*.55,w=3.26-k*.96,d=2.60-k*1.05;
    for(const sign of [-1,1]){
      b.beam('raised copper roof course',[-w/2,y,sign*d/2],[w/2,y,sign*d/2],.059,tint.light);
      b.beam('raised side roof course',[sign*w/2,y,-d/2],[sign*w/2,y,d/2],.059,tint.light);
    }
  }
  softBox(b,'clocktower',0,-.05,.96,.96,h+.60,h+1.18,.13,C.cream);
  for(const side of [-1,1]){
    pebble(b,'clock bezel',0,h+.94,side*.452-.05,.278,.278,.075,C.wood);
    pebble(b,'clock dial',0,h+.94,side*.510-.05,.231,.231,.047,C.butter);
    const z=side*.55-.05;
    b.beam('clock hands',[0,h+.92,z],[0,h+1.085,z],.045,C.ink);
    b.beam('clock hands',[0,h+.92,z],[.125,h+.98,z],.045,C.ink);
    const turn=elevation(b,side);
    pebble(turn,'side clock bezel',.05*side,h+.94,.493,.255,.255,.065,C.wood);
    pebble(turn,'side clock dial',.05*side,h+.94,.541,.207,.207,.040,C.butter);
    turn.beam('side clock hands',[.05*side,h+.93,.578],[.05*side,h+1.075,.578],.043,C.ink);
    turn.beam('side clock hands',[.05*side,h+.93,.578],[.05*side+.109,h+.98,.578],.043,C.ink);
  }
  b.frustum('clock cap',0,h+1.31,-.05,1.22,.55,.32,1.18,.54,tint.roof);
  pebble(b,'copper finial',0,h+1.55,-.05,.13,.16,.13,C.honey);
  for(const sign of [-1,1])pane(b,sign*.97,.81,face,.53,.81);
  threshold(b,face);
  envelope(b,0,1.46,1.24,.69);
  softBox(b,'letterbox',1.23,1.49,.42,.40,.07,.78,.09,C.clay);
  b.box('letter slot',[1.23,.61,1.71],[.27,.06,.035],C.ink);
  return h+1.72;
}

function greenhouse(b,tint){
  const h=1.45,w=2.98,d=2.3;
  softBox(b,'studio glazed wall',0,0,w,d,.08,h,.15,C.shade);
  for(const x of [-.96,0,.96])pane(b,x,.82,d/2,.70,.78);
  for(const side of [-1,1])for(const z of [-.64,.0,.64]){
    b.box('glazed side pane',[side*(w/2+.02),.88,z],[.04,.75,.51],C.glass);
  }
  threshold(b,d/2+.1);
  softBox(b,'curved roof lower lip',0,0,w+.19,d+.18,h-.07,h+.09,.16,tint.roof);
  const radius=w*.52;
  const point=(a,z)=>[radius*Math.cos(a),h+.04+.82*Math.sin(a),z];
  for(let j=0;j<10;j++){
    const a=j*Math.PI/10,n=(j+1)*Math.PI/10;
    b.quad(point(a,-1.24),point(n,-1.24),point(n,1.24),point(a,1.24),j>4?C.glass:'#b2d8c9');
    for(const z of [-1.24,-.52,.17,.86,1.24])b.beam('greenhouse hoop',point(a,z),point(n,z),.070,C.cream);
    for(const z of [-1.22,1.22])b.tri([0,h,z],point(a,z),point(n,z),C.glass);
  }
  for(const a of [Math.PI*.25,Math.PI*.5,Math.PI*.75])b.beam('copper roof rib',point(a,-1.24),point(a,1.24),.078,tint.roof);
  flowerpot(b,-1.20,1.52,.42,tint.light);
  return h+.94;
}

function flowerpot(b,x,z,scale,dye){
  b.cylinder('terracotta pot',x,scale*.27,z,scale*.31,scale*.48,C.clay,scale*.42);
  for(const [dx,dz,r] of [[-.22,.03,.32],[.18,-.11,.38],[.02,.2,.28]]){
    pebble(b,'potted foliage',x+dx*scale,scale*.67,z+dz*scale,r*scale,.36*scale,r*scale,C.leaf,8,5);
    pebble(b,'flower',x+dx*scale,scale*.91,z+dz*scale,.13*scale,.105*scale,.13*scale,dye,8,4);
  }
}

function cottage(b,tint,variant){
  const w=2.8,d=2.28,h=1.64;
  softBox(b,'stucco cottage',0,0,w,d,.09,h,.20,tint.wall);
  bentRoof(b,h,w+.39,d+.44,tint);
  const z=1.15;for(const side of [-1,1]){
    pane(b,side*.94,.79,z,.49,.60);
    b.box('painted shutter',[side*1.28,.82,z+.06],[.14,.69,.07],tint.roof);
  }
  threshold(b,d/2);
  softBox(b,'chimney stack',.82,-.60,.38,.44,h+.17,h+.97,.07,C.clay);
  softBox(b,'chimney cap',.82,-.60,.49,.54,h+.91,h+1.08,.075,C.cream);
  flowerpot(b,variant%2?.91:-.91,1.54,.45,variant%2?C.butter:'#e7a396');
  return h+1.08;
}

// Public model factory also supplies the entrance diorama with the same meshes.
export function modelFrontage(b,{use,variant=0}){
  const tint=TINTS[(Math.floor(variant/4)+variant%3)%TINTS.length];
  softBox(b,'raised biscuit plinth',0,0,3.27,2.71,.015,.18,.24,C.stone);
  const height=use==='shop'?bakehouse(b,tint):use==='public'?postHouse(b,tint):use==='office'?greenhouse(b,tint):cottage(b,tint,variant);
  districtElevations(b,use,tint);
  return height;
}

export function orchardTree(b,x,z,variant=0,size=1){
  // Trunk forks and broad interlocking crown volumes still read at board scale.
  const dye=variant%4===0?'#d98775':variant%4===1?'#71a57d':'#6e9a6f';
  const light=variant%4===0?'#eba391':variant%4===1?'#a3c77e':'#8fb87c';
  const h=size;
  b.cylinder('splayed tree roots',x,.27*h,z,.20*h,.54*h,C.bark,.13*h);
  b.beam('fruit tree trunk',[x,.30*h,z],[x+.03*h,1.04*h,z],.19*h,C.bark);
  b.beam('forked branch',[x,.67*h,z],[x-.32*h,1.12*h,z+.04*h],.12*h,C.bark);
  pebble(b,'rounded leaf canopy',x,1.53*h,z,.71*h,.81*h,.62*h,dye);
  pebble(b,'sunny leaf canopy',x-.43*h,1.31*h,z+.09*h,.48*h,.49*h,.46*h,light);
  pebble(b,'rounded leaf canopy',x+.44*h,1.32*h,z-.12*h,.49*h,.54*h,.43*h,dye);
  for(const [dx,dz,y] of [[-.39,.47,1.30],[.15,.54,1.58],[.53,-.42,1.22]]){
    pebble(b,'orchard fruit',x+dx*h,y*h,z+dz*h,.13*h,.14*h,.13*h,variant%2?C.honey:C.apricot,8,5);
  }
}

export function drawTownBoard(scene,tileAt,board){
  const root=new pc.Entity('enamel playing route');
  scene.mapRoot.addChild(root);
  const b=new Builder(scene,root);
  const wards=['#53a399','#649e9c','#55969c','#6589a4','#798ea9','#9a89a9','#c88c82','#c58972'];
  for(const [i,tile] of board.entries()){
    const {x,z}=tileAt(i),logo=tile.type==='logo',lucky=tile.type==='lucky';
    const dye=logo?C.honey:lucky?'#8bb171':wards[Math.floor(i/2.5)%wards.length];
    softBox(b,'rounded timber tile '+i,x,z,3.42,3.42,-.12,.22,.37,C.wood,.085);
    softBox(b,'porcelain tile lip '+i,x,z,3.38,3.38,.15,.272,.34,C.cream);
    softBox(b,'enamel tile face '+i,x,z,3.18,3.18,.245,.301,.29,dye,.018);
    if(logo||lucky){
      // A second cue besides color identifies the two starts and the lucky
      // squares. The center remains clear for a party of pawns.
      const sx=x-.96,sz=z+.96,top=.309;
      b.cylinder('stamped medallion',sx,top,sz,.28,.012,logo?'#ab7d46':'#5d916e',.28,24);
      if(logo){
        for(let n=0;n<8;n++){
          const ang=n*Math.PI/4,dx=Math.cos(ang),dz=Math.sin(ang);
          b.beam('sun ray',[sx+dx*.124,top+.010,sz+dz*.124],[sx+dx*.203,top+.010,sz+dz*.203],.037,C.cream);
        }
        b.cylinder('sun centre',sx,top+.013,sz,.088,.009,C.cream,.088,16);
      }else{
        for(const [dx,dz] of [[-.073,-.073],[-.073,.073],[.073,.073],[.073,-.073]])
          b.cylinder('clover leaf',sx+dx,top+.011,sz+dz,.089,.009,C.cream,.089,12);
      }
    }
    for(const side of [-1,1])for(const other of [-1,1]){
      b.cylinder('enamel studs',x+side*1.31,.303,z+other*1.31,.055,.009,C.cream,.055,10);
    }
    const next=tileAt((i+1)%board.length),dx=next.x-x,dz=next.z-z;
    const width=Math.hypot(dx,dz)-3.18,alongX=Math.abs(dx)>Math.abs(dz);
    const mx=x+dx/2,mz=z+dz/2;
    softBox(b,'wooden footbridge '+i,mx,mz,alongX?width:2.40,alongX?2.40:width,.15,.278,.10,'#c99a6b',.024);
    for(const k of [-.35,0,.35]){
      b.box('plank seam',[mx+(alongX?k*width:0),.282,mz+(alongX?0:k*width)],[alongX?.03:2.24,.006,alongX?2.24:.03],'#a97e58');
    }
    for(const k of [-1,1]){
      b.box('bridge border',[mx+(alongX?0:k*1.13),.287,mz+(alongX?k*1.13:0)],[alongX?width:.055,.024,alongX?.055:width],C.cream);
    }
  }
  b.finishPainted();
}

export function drawTownCoast(b){
  // One uninterrupted low-contrast water plane. The land itself is a layered
  // oval-ended diorama, so turning the camera never reveals a black void.
  b.box('estuary',[0,-1.65,0],[260,.18,250],'#6fbbba');
  softBox(b,'shallow water',0,0,85,75,-1.58,-1.50,11,'#9ed1bc',.025);
  softBox(b,'sandbank',0,0,80,70,-1.54,-.84,9,'#e7c99a',.23);
  softBox(b,'cut riverbank',0,0,78,68,-1.35,.16,8.5,'#bf996b',.16);
  softBox(b,'grassy bank',0,0,78.2,68.2,-.08,.24,8.6,'#82ad79',.13);
  softBox(b,'inner garden lawn',0,0,37.5,30.9,.18,.252,3.4,'#a2bc83',.022);
  for(const sign of [-1,1])for(const [index,pos] of [-29,-20,-12,-3,8,20,29].entries()){
    const z=sign*(36.4+(index%3)*.45);
    b.beam('sandbar foam',[pos,-1.467,z],[pos+1.6,-1.467,z+.06],.105,'#d2e1c5');
    b.beam('broken foam',[pos+2,-1.469,z+.05],[pos+2.41,-1.469,z+.08],.075,'#d2e1c5');
  }
  // Low grass brushwork: broad clusters break up vacant lawns without competing
  // with the directions on the boardwalk. The palette is deliberately tonal.
  let state=1597;
  const rand=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  for(let i=0;i<260;i++){
    const x=rand()*72-36,z=rand()*61-30.5,s=.09+rand()*.16;
    for(const [dx,dz,f] of [[0,0,1],[.27,.08,.61]]){
      const y=Math.abs(x)<17&&Math.abs(z)<14?.256:.247;
      b.tri([x+dx-s*f,y,z+dz],[x+dx+s*f,y,z+dz+s*.16*f],[x+dx+s*.25*f,y,z+dz-s*.9*f],i%4?'#9fc085':'#bbca91');
    }
  }
}

export function trailGarden(scene,b,{outerOrchards=true}={}){
  if(outerOrchards)for(const side of [-1,1]){
    for(const x of [-26,-17,-8,3,13,24]){
      const z=side*(30.9+(Math.abs(x)%4)*.40),tree=new pc.Entity('waterside orchard');
      scene.mapRoot.addChild(tree);const clump=new Builder(scene,tree);
      const scale=1.02+((Math.abs(x)%4)*.1);
      orchardTree(clump,x,z,Math.abs(x),scale);
      orchardTree(clump,x+1.29,z+.64,Math.abs(x)+1,scale*.7);
      clump.finishPainted();(scene.occlusionGroups??=[]).push({root:tree,opacity:1,target:1});
    }
  }
  // Small enclosed parks give the streets an address and a foreground in the
  // close camera; rooflines and parked carts remain outside the walking loop.
  for(const [x,z] of [[-3.22,4.65],[7.22,-5.05],[-7.34,-4.72],[3.12,4.63]]){
    softBox(b,'garden bed',x,z,1.21,.61,.25,.38,.19,'#ae8a63',.025);
    for(const d of [-.33,0,.33]){
      pebble(b,'mound of herbs',x+d,.46,z,.24,.29,.24,C.leaf,8,5);
      pebble(b,'daisy head',x+d-.04,.69,z+.05,.095,.10,.09,d===0?C.butter:'#e6a98f',8,4);
    }
  }
  for(const {x,z,angle,use} of scene.cityBuildings){
    const a=angle*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
    const at=(dx,dz)=>[x+dx*cs+dz*sn,z-dx*sn+dz*cs];
    const [gx,gz]=at(0,-.13);
    softBox(b,'lawn around shop',gx,gz,Math.abs(cs)>.5?4.14:3.45,Math.abs(cs)>.5?3.45:4.14,.252,.263,.39,use==='home'?'#a9be87':use==='shop'?'#c2bf89':'#a3ba87',.004);
    // A low hedge returns at the rear corner, leaving every front step open.
    if(use==='home'||use==='office'){
      const [lx,lz]=at(-1.85,-.65);
      softBox(b,'hedge foundation',lx,lz,Math.abs(cs)>.5?.38:1.07,Math.abs(cs)>.5?1.07:.38,.258,.36,.15,'#a48b66',.019);
      for(const d of [-.31,0,.31]){const [px,pz]=at(-1.85,-.65+d);
        pebble(b,'clipped hedge',px,.50,pz,.25,.26,.29,use==='home'?'#759979':'#89aa73',10,5);}
    }
  }
  // Distinct public gardens mark opposite quarters without occupying the path.
  for(const [x,z] of [[2.46,3.38],[-2.48,-3.39]]){
    b.cylinder('garden fountain footing',x,.335,z,.86,.15,C.stone,.88,24);
    b.cylinder('garden fountain rim',x,.445,z,.80,.15,C.cream,.76,24);
    b.cylinder('pond water',x,.525,z,.66,.018,C.glass,.66,24);
    b.cylinder('fountain stem',x,.67,z,.14,.30,C.wood,.092,16);
    b.cylinder('tiered bowl',x,.855,z,.16,.15,C.honey,.39,24);
    b.cylinder('bowl water',x,.938,z,.34,.015,C.glass,.34,24);
    pebble(b,'water spout',x,1.005,z,.095,.14,.095,'#c5ddd0',10,6);
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=sx*23.96,z=sz*11.77;
    const root=new pc.Entity('orchard market handcart');scene.mapRoot.addChild(root);
    root.setLocalPosition(x,.26,z);root.setLocalEulerAngles(0,sx<0?36:218,0);
    const v=new Builder(scene,root),canopy=sx*sz<0?C.jade:C.clay;
    softBox(v,'handcart bed',0,0,1.61,1.01,.33,.50,.12,C.wood);
    for(const side of [-1,1]){
      for(const edge of [-1,1])v.beam('cart post',[side*.64,.42,edge*.37],[side*.64,1.48,edge*.37],.09,C.wood);
      for(const wx of [-.50,.5]){
        pebble(v,'cart wheel',wx,.27,side*.52,.25,.25,.068,C.ink,10,6);
        pebble(v,'turned wheel hub',wx,.27,side*.58,.09,.09,.03,C.honey,8,5);
      }
    }
    for(let i=0;i<5;i++){
      const xx=(i-2)*.36;
      const dye=i%2?C.cream:canopy;
      for(const sign of [-1,1]){
        const p=[[xx-.18,1.57,0],[xx-.18,1.39,sign*.69],[xx+.18,1.39,sign*.69],[xx+.18,1.57,0]];
        if(sign<0)p.reverse();v.quad(...p,dye);
        v.box('canvas valance',[xx,1.35,sign*.69],[.357,.10,.038],dye);
      }
    }
    for(const dx of [-.46,0,.46]){
      softBox(v,'produce crate',dx,.05,.42,.54,.49,.62,.055,C.honey,.022);
      for(const dz of [-.11,.12])pebble(v,'round fruit',dx,.67,.05+dz,.14,.13,.14,dx===0?C.leafLight:C.apricot,10,6);
    }
    v.finishPainted();(scene.occlusionGroups??=[]).push({root,opacity:1,target:1});
    // Different-height grouping outside the board crowds the orchard edge,
    // while the space around the pawn and the two directions remains free.
    const tree=new pc.Entity('corner market fruit tree');scene.mapRoot.addChild(tree);
    tree.setLocalPosition(x+sx*1.62,.25,z+sz*1.30);
    const tb=new Builder(scene,tree);orchardTree(tb,0,0,sx*sz===1?1:2,1.34);tb.finishPainted();
    (scene.occlusionGroups??=[]).push({root:tree,opacity:1,target:1});
  }
  // Flower borders flank the two starting patios. Their taller plants sit at
  // the outer edge so the player and the route remain in the central opening.
  for(const corner of [-1,1]){
    for(const [gx,gz,count,daisy] of [[17.79,16.98,6,true],[20.06,16.12,5,false]]){
      const x=gx*corner,z=gz*corner,span=daisy?1.60:1.30;
      pebble(b,'flowering verge',x,.249,z,span*.56,.083,.43,'#799d70',16,6);
      for(let i=0;i<count;i++){
        const px=x+corner*((i/(count-1)-.5)*(span-.37)),pz=z+corner*(i%2?-.14:.13);
        const size=[1,.72,.85,.95,.64,.86][i],head=.33+.32*size+(i%2)*.04;
        const cx=px+(i%2?-.055:.043)*corner;
        b.beam('flower stalk',[px,.29,pz],[cx,head,pz],.020,'#63885c');
        for(const side of [-1,1]){
          const tip=[px+side*.165*size,.49+(i%2)*.055,pz+side*.037],base=[px,.31,pz],mid=[px+side*.060,.412,pz+.019],wide=.052*size;
          b.quad(base,[mid[0],mid[1]-.014,mid[2]-wide],tip,mid,'#79a16a');
          b.quad(base,mid,tip,[mid[0],mid[1]-.010,mid[2]+wide],'#88ac70');
        }
        if(daisy){
          for(let k=0;k<6;k++){
            const a=k*Math.PI/3;
            pebble(b,'round daisy petals',cx+Math.cos(a)*.092*size,head,pz+Math.sin(a)*.092*size,.068*size,.040*size,.067*size,C.cream,8,4);
          }
          pebble(b,'daisy pollen centre',cx,head+.026,pz,.065*size,.045*size,.065*size,C.honey,8,5);
        }else{
          pebble(b,'cupped tulip',cx,head,pz,.126*size,.124*size,.108*size,C.clay,10,6);
          for(const side of [-1,1])pebble(b,'turned tulip petals',cx+side*.061*size,head+.052,pz+.026,.069*size,.11*size,.066*size,side<0?C.apricot:'#e68e77',8,5);
        }
      }
    }
  }
}

export function townContactShadows(scene,{outerOrchards=true}={}){
  // A single feathered mesh anchors the miniatures without a full-board shadow
  // map. Keeping the top under paths and tiles preserves their printed faces.
  const pos=[],indices=[],rgba=[];
  const oval=(x,z,rx,rz,y,amt)=>{
    const origin=pos.length/3,segments=24;
    for(const [r,alpha] of [[0,amt],[.54,amt],[.79,amt*.58],[1,0]])for(let i=0;i<segments;i++){
      const a=2*Math.PI*i/segments;
      pos.push(x+rx*r*Math.cos(a)+.19*r,y,z+rz*r*Math.sin(a)+.19*r);
      rgba.push(73,79,65,Math.round(alpha*255));
    }
    for(let j=0;j<3;j++)for(let i=0;i<segments;i++){
      const n=(i+1)%segments,lo=origin+j*segments,hi=lo+segments;
      indices.push(lo+i,hi+n,hi+i,lo+i,lo+n,hi+n);
    }
  };
  for(const {x,z,angle} of scene.cityBuildings){
    const turned=Math.abs(Math.sin(angle*Math.PI/180))>.50;
    oval(x+.22,z+.24,turned?1.95:2.41,turned?2.41:1.95,.270,.38);
  }
  for(const x of [-7.2,7.2])for(const z of [-10.5,-3.5,3.5,10.5])oval(x+.14,z+.16,1.23,.80,.265,.39);
  if(outerOrchards)for(const side of [-1,1])for(const x of [-26,-17,-8,3,13,24])oval(x+.61,side*(30.9+(Math.abs(x)%4)*.40)+.28,2,.99,.249,.32);
  const mesh=new pc.Mesh(scene.app.graphicsDevice);
  mesh.setPositions(pos);mesh.setColors32(rgba);mesh.setIndices(indices);mesh.update();
  const m=new pc.StandardMaterial();m.useLighting=false;m.emissive=new pc.Color(1,1,1);m.emissiveVertexColor=true;
  m.opacityVertexColor=true;m.opacityVertexColorChannel='a';m.depthWrite=false;m.blendType=pc.BLEND_NORMAL;m.cull=pc.CULLFACE_NONE;m.update();
  const e=new pc.Entity('miniature contact shadows');
  e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,m)]});scene.mapRoot.addChild(e);
}

export function stampPlaza(b,site,index){
  softBox(b,'trimmed landmark lawn',site.x,site.z,4.37,4.37,.247,.302,.47,'#d7bd94',.019);
  for(const side of [-1,1]){
    const x=site.x+side*1.79,z=site.z+1.63;
    pebble(b,'border cushion',x,.40,z,.26,.21,.24,index%3===1?'#a3ba80':'#86a883',9,5);
  }
}

export function landmarkPedestal(scene,root,index){
  const plinth=new pc.Entity('collectible landmark pedestal');root.addChild(plinth);
  const b=new Builder(scene,plinth);
  softBox(b,'oiled wood edge',0,0,1.8,1.8,-.025,.055,.14,'#aa825f',.025);
  softBox(b,'inlaid stone top',0,0,1.72,1.72,.048,.099,.12,'#dfc7a0',.015);
  b.finishPainted();
}


