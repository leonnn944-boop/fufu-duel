import {elevation, pebble, softBox} from './toy-town.mjs';

const paint = {
  cream:'#fff1cc', stone:'#a38975', sill:'#d0a67d', biscuit:'#e5ab76',
  butter:'#ffdaa2', toast:'#b97243', cocoa:'#704c41', walnut:'#845641',
  oven:'#403f3c', shell:'#78afa5', jade:'#377e79', trim:'#2b696a', edge:'#a5d5b5',
  glass:'#416d70', sky:'#8fb9ad', shade:'#bc6854', brass:'#dfa153'
};

function extrudeOutline(b, name, outline, front, back, face, edge) {
  b.features.push(name);
  const mean=outline.reduce((s,p)=>[s[0]+p[0]/outline.length,s[1]+p[1]/outline.length],[0,0]);
  for(let i=0;i<outline.length;i++){
    const j=(i+1)%outline.length, a=outline[i], c=outline[j];
    b.tri([...mean,front],[...a,front],[...c,front],face);
    b.tri([...mean,back],[...c,back],[...a,back],edge);
    b.quad([...a,back],[...c,back],[...c,front],[...a,front],edge);
  }
}

function arch(b,name,x,base,z,width,feet,rise,face,edge,relief=.055){
  const points=[[x-width/2,base],[x+width/2,base]];
  for(let i=0;i<=16;i++){
    const a=i*Math.PI/16;
    points.push([x+width/2*Math.cos(a),base+feet+rise*Math.sin(a)]);
  }
  extrudeOutline(b,name,points,z+.5*relief,z-.5*relief,face,edge);
}

function barrel(b,name,y,rx,ry,z0,z1,body,edge) {
  // A full curved eave keeps its profile from the opposite street.
  b.features.push(name);
  const point=(i,z)=>[rx*Math.cos(i*Math.PI/24),y+ry*Math.sin(i*Math.PI/24),z];
  const normal=i=>{
    const x=Math.cos(i*Math.PI/24)/rx,h=Math.sin(i*Math.PI/24)/ry,len=Math.hypot(x,h);
    return [x/len,h/len,0];
  };
  for(let i=0;i<24;i++){
    const a=point(i,z0),c=point(i,z1),d=point(i+1,z1),e=point(i+1,z0);
    const n=normal(i),m=normal(i+1);
    b.smoothTri(a,d,c,body,n,m,n); b.smoothTri(a,e,d,body,n,m,m);
    b.tri([0,y,z0],point(i+1,z0),a,edge);
    b.tri([0,y,z1],c,point(i+1,z1),edge);
  }
  b.quad([-rx,y,z0],[rx,y,z0],[rx,y,z1],[-rx,y,z1],edge);
}

function croissant(b){
  b.features.push('folded butter croissant roof sculpture');
  // Taper a continuous pastry along its curved centreline. Twist the five fold
  // valleys slightly around the surface, so the layers read from both streets.
  const rings=60,sides=20;
  const position=(t,a)=>{
    const k=2*t-1, lng=k*1.70;
    const x=1.01*Math.sin(lng),y=2.86-.23*k*k,z=-.09+.59*(1-Math.cos(lng));
    const dx=1.717*Math.cos(lng),dz=1.003*Math.sin(lng),len=Math.hypot(dx,dz);
    const taper=.016+.46*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.88);
    const lap=t+.045*Math.cos(a+.35);
    const valleys=[.14,.32,.52,.71,.87];
    const distance=Math.min(...valleys.map(f=>Math.abs(f-lap)));
    const crease=Math.exp(-(distance**2)/.00015);
    const r=taper*(1-.29*crease);
    return {p:[x-dz/len*r*Math.cos(a),y+.83*r*Math.sin(a),z+dx/len*r*Math.cos(a)],crease};
  };
  const surface=Array.from({length:rings+1},(_,j)=>Array.from({length:sides+1},(_,i)=>{
    const t=j/rings,angle=2*Math.PI*i/sides,w=position(t,angle);
    const next=position(Math.min(1,t+.001),angle).p,prev=position(Math.max(0,t-.001),angle).p;
    const end=position(t,angle+.001).p,start=position(t,angle-.001).p;
    const axis=next.map((v,k)=>v-prev[k]),wrap=end.map((v,k)=>v-start[k]);
    const n=axis.map((_,k)=>axis[(k+1)%3]*wrap[(k+2)%3]-axis[(k+2)%3]*wrap[(k+1)%3]);
    return {...w,n:n.map(v=>v/Math.hypot(...n))};
  }));
  const shades=['#b46939','#d7813e','#e9954c','#f2a651','#f6b65e','#ffd58e'];
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
    const a=surface[j][i],c=surface[j+1][i],d=surface[j+1][i+1],e=surface[j][i+1];
    const t=(j+.5)/rings,theta=(i+.5)*2*Math.PI/sides;
    const crease=(a.crease+c.crease+d.crease+e.crease)/4;
    const tone=Math.max(0,Math.min(5,Math.round(3.3+.9*Math.sin(theta)+.55*Math.cos(t*27+theta)-3.3*crease)));
    b.smoothTri(a.p,c.p,d.p,shades[tone],a.n,c.n,d.n);
    b.smoothTri(a.p,d.p,e.p,shades[tone],a.n,d.n,e.n);
    if(j===0||j===rings-1){
      const tip=[(j===0?-1:1)*1.01*Math.sin(1.70),2.63,-.09+.59*(1-Math.cos(1.70))];
      if(j===0)b.tri(tip,a.p,e.p,paint.toast);else b.tri(tip,d.p,c.p,paint.toast);
    }
  }
}

function rolls(b,x,z,y,s=1){
  pebble(b,'scored country loaf',x,y,z,.19*s,.135*s,.13*s,paint.biscuit,12,6);
  for(const dx of [-.06,.05])b.beam('baked scoring',[x+(dx-.018)*s,y+.104*s,z+.048*s],[x+(dx+.023)*s,y+.116*s,z+.001*s],.027*s,paint.cream);
}

function wheatCrest(b) {
  const z=1.265,y=2.135;
  const ellipse=(rx,ry)=>Array.from({length:36},(_,i)=>[rx*Math.cos(2*Math.PI*i/36),y+ry*Math.sin(2*Math.PI*i/36)]);
  extrudeOutline(b,'cast brass bakery seal',ellipse(.48,.25),z+.045,z,paint.brass,paint.walnut);
  extrudeOutline(b,'fir enamel bakery seal',ellipse(.445,.212),z+.065,z+.043,paint.trim,paint.cocoa);
  for(const direction of [-1,1]){
    const p=t=>[direction*(.025+.30*t),y-.1+.22*t,z+.086];
    b.beam('wheat stalk',p(0),p(1),.021,paint.butter);
    for(const t of [.19,.43,.67,.91]){
      const [x,h,d]=p(t);
      for(const upper of [false,true]){
        const dx=direction*(upper?.024:.083),dy=upper?.077:-.006;
        const outline=[[x,h],[x+dx*.27-direction*.018,h+dy*.65+.018],[x+dx,h+dy],[x+dx*.77+direction*.013,h+dy*.25-.017]];
        extrudeOutline(b,'wheat ear relief',outline,d+.013,d,paint.butter,paint.brass);
      }
    }
  }
}

function display(b,x,front,width,side=false){
  const y=.43;
  arch(b,'carved shopfront reveal',x,y,front,width,.58,.23,paint.walnut,paint.cocoa,.12);
  arch(b,'recessed olive shop glass',x,y+.08,front+.074,width-.15,.54,.18,paint.glass,paint.trim,.028);
  arch(b,'top pane reflection',x,y+.44,front+.094,width-.25,.13,.15,paint.sky,paint.sky,.008);
  b.box('display transom',[x,y+.44,front+.11],[width-.10,.048,.047],paint.butter);
  softBox(b,'maple pastry shelf',x,front+.17,width+.13,.42,y-.031,y+.065,.06,paint.sill,.02);
  if(side){
    for(const d of [-.30,0,.30])rolls(b,x+d,front+.17,y+.16,d===0?.88:.78);
  }else{
    rolls(b,x-.13,front+.17,y+.13,.73);
    rolls(b,x+.13,front+.14,y+.15,.85);
  }
}

function canopy(b,front,width,center=0) {
  b.features.push('striped canvas with scalloped valance');
  const stripes=9;
  for(let i=0;i<stripes;i++){
    const left=center+width*(i/stripes-.5),right=left+width/stripes;
    const color=i%2 ? '#fff1d4' : '#cc7660';
    const profile=[[.00,1.78],[.12,1.80],[.30,1.76],[.46,1.67],[.55,1.54]];
    for(let j=1;j<profile.length;j++){
      const [d0,h0]=profile[j-1],[d1,h1]=profile[j];
      b.quad([left,h0,front+d0],[left,h1,front+d1],[right,h1,front+d1],[right,h0,front+d0],color);
    }
    const edgeZ=front+.55;
    for(let k=0;k<8;k++){
      const point=(s)=>[left+(right-left)*s,1.505-.085*Math.sin(Math.PI*s),edgeZ];
      const a=point(k/8),c=point((k+1)/8);
      b.quad([a[0],1.544,edgeZ],a,c,[c[0],1.544,edgeZ],color);
    }
  }
  for(const d of [-1,1]){
    const x=center+d*(width/2-.09);
    b.beam('bronze canopy brackets',[x,1.30,front+.02],[x,1.54,front+.53],.044,paint.cocoa);
  }
}

function lantern(b,x,z){
  b.box('enamel lamp bracket',[x,1.36,z+.085],[.062,.06,.23],paint.trim);
  b.cylinder('lamp lip',x,1.31,z+.18,.11,.08,paint.trim,.068,12);
  pebble(b,'honey lamp glass',x,1.20,z+.18,.076,.09,.076,paint.butter,10,6);
}

function stoneOven(b){
  const z=1.12;
  // Dark outer arch, warm firebrick lining, then the baking chamber within.
  arch(b,'oven masonry arch',0,.31,z+.03,1.94,.52,.55,paint.stone,paint.walnut,.17);
  arch(b,'toasted firebrick lining',0,.38,z+.135,1.66,.45,.46,'#b56a49',paint.cocoa,.052);
  arch(b,'deep brick baking chamber',0,.43,z+.17,1.40,.36,.41,paint.oven,paint.cocoa,.027);
  for(let n=0;n<11;n++){
    const a=(n+.065)*Math.PI/11,c=(n+.935)*Math.PI/11;
    const archPoint=(angle,outer)=>[(outer?.98:.72)*Math.cos(angle),.81+(outer?.60:.42)*Math.sin(angle)];
    extrudeOutline(b,'fired terracotta voussoir',[archPoint(a,false),archPoint(c,false),archPoint(c,true),archPoint(a,true)],z+.196,z+.165,['#cb805c','#ce966e','#dba179'][n%3],paint.cocoa);
  }
  for(const x of [-.84,.84])for(let row=0;row<3;row++)
    softBox(b,'oven jamb stone',x,z+.18,.24,.093,.35+row*.15,.48+row*.15,.018,row%2?paint.biscuit:paint.sill,.012);
  for(let row=0;row<2;row++)for(let brick=0;brick<3-row;brick++){
    const x=(brick-(2-row)/2)*.24;
    softBox(b,'brick oven rear hearth',x,z+.191,.221,.025,.55+row*.103,.638+row*.103,.009,row?'#82503b':'#a76342',.006);
  }
  softBox(b,'bread peel counter',0,z+.17,1.95,.4,.34,.47,.08,paint.sill,.026);
  for(const [x,s] of [[-.46,.94],[-.04,1.06],[.43,.86]])rolls(b,x,z+.16,.57,s);
  for(const x of [-1.14,1.14])lantern(b,x,z+.02);
  canopy(b,z,2.71);
}

export function drawCornerBakery(b){
  b.features.push('corner bakery studio model');
  softBox(b,'rounded biscuit foundation',0,0,3.27,2.71,.015,.18,.25,paint.stone,.05);
  softBox(b,'lower honey brickwork',0,0,2.97,2.28,.14,.47,.23,paint.sill);
  softBox(b,'buttercream bakery walls',0,0,2.97,2.29,.40,1.82,.24,paint.butter,.10);
  softBox(b,'carved timber wall plate',0,0,3.08,2.40,1.67,1.84,.25,paint.walnut,.035);
  softBox(b,'rolled roof drip edge',0,0,3.20,2.57,1.79,1.91,.23,paint.trim,.042);
  barrel(b,'enamel barrel roof',1.86,1.55,.67,-1.23,1.23,paint.jade,paint.shell);
  for(const z of [-1.20,-.63,0,.63,1.20])
    barrel(b,'rolled standing seam',1.86,1.565,.686,z-.026,z+.026,paint.shell,paint.shell);
  for(const side of [-1,1])
    b.beam('honey roof trim',[side*1.49,1.93,-1.20],[side*1.49,1.93,1.20],.065,paint.brass);
  // Sign posts go into the curved roof, carrying a freestanding double-sided miniature.
  for(const x of [-.44,.44]) b.cylinder('cast brass sign feet',x,2.51,.13,.068,.27,paint.brass,.055,12);
  croissant(b);
  wheatCrest(b);
  softBox(b,'baker chimney',-.94,-.66,.36,.42,2.10,2.71,.071,paint.shade);
  softBox(b,'chimney flashing',-.94,-.66,.50,.55,2.64,2.77,.081,paint.cream);
  softBox(b,'chimney throat',-.94,-.66,.30,.35,2.755,2.779,.05,paint.cocoa,.002);
  const front=1.14;
  for(const x of [-.96,.96])display(b,x,front,.76);
  arch(b,'deep arched entrance',0,.125,front,.91,1.05,.35,paint.walnut,paint.cocoa,.14);
  arch(b,'teal enamel door',0,.16,front+.096,.72,1.02,.24,paint.jade,paint.trim,.04);
  arch(b,'fanlight casing',0,.79,front+.128,.54,.23,.23,paint.butter,paint.brass,.03);
  arch(b,'fanlight glass',0,.84,front+.154,.43,.18,.17,paint.glass,paint.glass,.016);
  b.box('door kick plate',[0,.28,front+.123],[.51,.09,.04],paint.brass);
  pebble(b,'turned brass doorknob',.24,.68,front+.16,.061,.061,.045,paint.brass,10,6);
  softBox(b,'bakery threshold',0,1.48,1.06,.75,.045,.155,.17,paint.stone);
  softBox(b,'pavement step',0,2.03,.88,.76,.010,.068,.13,'#e5c5a0',.02);
  canopy(b,front,2.85);
  stoneOven(elevation(b,2));
  for(const turn of [-1,1]){
    const side=elevation(b,turn);
    display(side,0,1.475,1.38,true);
    softBox(side,'sea green side window hood',0,1.585,1.65,.46,1.23,1.36,.13,paint.jade,.038);
  }
  return 3.25;
}

