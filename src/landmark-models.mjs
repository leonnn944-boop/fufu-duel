import * as pc from '../vendor/playcanvas.min.mjs';
import {burjKhalifa,operaWaterfront} from './world-v1-retained.mjs';
import {airportStart,cruiseStart,hangingGardens,angkorWat,moai,mountFuji,pisaTower,stonehenge,liberty} from './world-v1-landmarks.mjs';
import {giza, tajMahal, kukulcan} from './world-heritage.mjs';
import {colosseum, bigBen, goldenGate} from './world-monuments.mjs';
import {greatWall, gyeongbokgung, machuPicchu} from './world-landscapes.mjs';
import {buildWorkingHarbor} from './harbor-landmark.mjs';
import {taipei101, tokyoTower, parisEiffel} from './world-towers.mjs';

// Static landmark parts are combined by material, keeping the added detail inexpensive.
export class Builder {
  constructor(scene,root){this.scene=scene;this.root=root;this.groups=new Map();this.features=[];}
  tri(a,b,c,color){let g=this.groups.get(color);if(!g)this.groups.set(color,g={positions:[],indices:[]});const i=g.positions.length/3;g.positions.push(...a,...b,...c);g.indices.push(i,i+1,i+2);}
  smoothTri(a,b,c,color,na,nb,nc){
    this.tri(a,b,c,color);
    const g=this.groups.get(color);
    (g.smooth??=[]).push(g.positions.length-9,...na,...nb,...nc);
  }
  normals(g){
    const result=pc.calculateNormals(g.positions,g.indices),smooth=g.smooth??[];
    for(let k=0;k<smooth.length;k+=10){
      const at=smooth[k];
      for(let i=0;i<9;i++)result[at+i]=smooth[k+1+i];
    }
    return result;
  }
  quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
  frustum(name,x,y,z,bottom,top,height,depthBottom,depthTop,color){
    this.features.push(name);const h=height/2,w=bottom/2,t=top/2,d=depthBottom/2,e=depthTop/2;
    const p=[[-w,-h,-d],[w,-h,-d],[w,-h,d],[-w,-h,d],[-t,h,-e],[t,h,-e],[t,h,e],[-t,h,e]].map(v=>[v[0]+x,v[1]+y,v[2]+z]);
    for(const f of [[0,1,2,3],[4,7,6,5],[3,2,6,7],[1,0,4,5],[0,3,7,4],[2,1,5,6]])this.quad(...f.map(i=>p[i]),color);
  }
  box(name,pos,size,color){this.frustum(name,...pos,size[0],size[0],size[1],size[2],size[2],color);}
  cylinder(name,x,y,z,radius,height,color,topRadius=radius,segments=12){
    this.features.push(name);for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,lo=[x+Math.cos(a)*radius,y-height/2,z+Math.sin(a)*radius],lo2=[x+Math.cos(b)*radius,y-height/2,z+Math.sin(b)*radius],hi=[x+Math.cos(a)*topRadius,y+height/2,z+Math.sin(a)*topRadius],hi2=[x+Math.cos(b)*topRadius,y+height/2,z+Math.sin(b)*topRadius];this.quad(lo2,lo,hi,hi2,color);this.tri([x,y+height/2,z],hi2,hi,color);this.tri([x,y-height/2,z],lo,lo2,color);}
  }
  beam(name,a,b,width,color){
    this.features.push(name);const from=new pc.Vec3(...a),to=new pc.Vec3(...b),dir=to.clone().sub(from).normalize(),side=new pc.Vec3().cross(dir,Math.abs(dir.y)>.9?pc.Vec3.RIGHT:pc.Vec3.UP).normalize().mulScalar(width/2),up=new pc.Vec3().cross(dir,side).normalize().mulScalar(width/2),corners=[];
    for(const p of [from,to])for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const v=p.clone().add(side.clone().mulScalar(i)).add(up.clone().mulScalar(j));corners.push([v.x,v.y,v.z]);}
    for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])this.quad(...f.map(i=>corners[i]),color);
  }
  gable(name,x,y,z,width,height,depth,color){
    this.features.push(name);const p=[[-width/2,0,-depth/2],[width/2,0,-depth/2],[0,height,-depth/2],[-width/2,0,depth/2],[width/2,0,depth/2],[0,height,depth/2]].map(v=>[v[0]+x,v[1]+y,v[2]+z]);this.tri(p[2],p[1],p[0],color);this.tri(p[3],p[4],p[5],color);this.quad(p[0],p[3],p[5],p[2],color);this.quad(p[2],p[5],p[4],p[1],color);this.quad(p[1],p[4],p[3],p[0],color);
  }
  arch(name,x,y,z,width,height,color,frame='#e5d4ae'){
    const r=width/2;this.box(name+' opening',[x,y+(height-r)/2,z],[width,height-r,.025],color);
    for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;this.tri([x,y+height-r,z],[x+r*Math.cos(a),y+height-r+r*Math.sin(a),z],[x+r*Math.cos(b),y+height-r+r*Math.sin(b),z],color);this.beam(name+' arch',[x+r*Math.cos(a),y+height-r+r*Math.sin(a),z+.015],[x+r*Math.cos(b),y+height-r+r*Math.sin(b),z+.015],.035,frame);}
    for(const side of [-1,1])this.box(name+' jamb',[x+side*(r+.015),y+(height-r)/2,z+.015],[.035,height-r,.035],frame);
  }
  finish(){
    for(const [color,g] of this.groups){const mesh=new pc.Mesh(this.scene.app.graphicsDevice);mesh.setPositions(g.positions);mesh.setNormals(this.normals(g));mesh.setIndices(g.indices);mesh.update();const material=this.scene.material(color).clone();material.cull=pc.CULLFACE_NONE;material.update();const entity=new pc.Entity(this.root.name+' detail '+color);entity.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});this.root.addChild(entity);}
    this.root.landmarkFeatures=[...new Set(this.features)];
  }
  finishPainted(){
    // These miniatures are opaque painted wood. One mesh/material per miniature
    // keeps roof details and framing economical and preserves independent fades.
    const pos=[],norm=[],rgba=[],idx=[];
    for(const [hex,g] of this.groups){
      const color=new pc.Color().fromString(hex).linear();
      const rgb=[color.r,color.g,color.b].map(v=>Math.round(v*255));
      const normals=this.normals(g);
      const offset=pos.length/3;
      for(let i=0;i<g.positions.length;i++) {pos.push(g.positions[i]);norm.push(normals[i]);}
      for(let i=0;i<g.positions.length/3;i++)rgba.push(...rgb,255);
      for(const i of g.indices)idx.push(offset+i);
    }
    if(!idx.length)return;
    const mesh=new pc.Mesh(this.scene.app.graphicsDevice);
    mesh.setPositions(pos);mesh.setNormals(norm);mesh.setColors32(rgba);mesh.setIndices(idx);mesh.update();
    const material=this.scene.material('#ffffff').clone();
    material.diffuseVertexColor=true;material.cull=pc.CULLFACE_NONE;material.gloss=.38;material.metalness=.025;material.update();
    const entity=new pc.Entity(this.root.name+' painted wood');
    entity.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});this.root.addChild(entity);
    this.root.landmarkFeatures=[...new Set(this.features)];
  }
}


function operaShells(b){
  const shell=(x,z,w,l,h,reverse=false)=>{
    const point=(u,t)=>{const curve=Math.sqrt(Math.max(0,1-t*t));return[x+w*.5*curve*Math.cos(u),.36+h*(.6*t+.8*curve*Math.sin(u)),z+(reverse?-1:1)*l*(.5-t)];};
    for(let i=0;i<16;i++)for(let j=0;j<16;j++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16,t=j/16,v=(j+1)/16,points=[point(a,t),point(a,v),point(c,v),point(c,t)];if(reverse)points.reverse();b.quad(...points,i%3?'#fff4dc':'#e6dbc3');}
    for(const angle of [0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI])for(let j=0;j<8;j++)b.beam('shell ribs',point(angle,j/8),point(angle,(j+1)/8),.013,'#d1c6af');
    const center=[x,.36,z+(reverse?-1:1)*l*.5];for(let i=0;i<12;i++){b.tri(center,point(i*Math.PI/12,0),point((i+1)*Math.PI/12,0),'#547b85');b.beam('glazed entrance ribs',center,point(i*Math.PI/12,0),.014,'#c6d7ce');}
  };
  shell(-.44,-.31,.74,.86,1.52);shell(.4,-.22,.72,.9,1.25);shell(-.4,.45,.68,.68,.94,true);shell(.4,.47,.65,.66,.82,true);b.features.push('four curved shell groups');
}

function belem(b){
  const stone='#e2d2b0',trim='#f3e6ca',shade='#677d79';
  b.box('riverside bastion',[0,.25,.12],[1.72,.42,1.5],stone);b.box('bastion parapet',[0,.49,.12],[1.82,.09,1.62],trim);
  b.box('square tower',[-.16,1.37,-.2],[.98,1.75,.9],stone);
  for(const y of [.69,1.15,1.61,2.09])b.box('tower string courses',[-.16,y,-.2],[1.06,.05,.98],trim);
  for(const y of [.76,1.22,1.68])for(const x of [-.38,.06])b.arch('arched tower windows',x,y,.26,.16,.25,shade,trim);
  b.box('balcony floor',[-.16,1.17,.39],[.84,.07,.32],trim);for(const x of [-.5,-.27,-.04,.19])b.box('balcony balusters',[x,1.3,.54],[.035,.22,.035],trim);b.box('balcony rail',[-.16,1.42,.54],[.85,.05,.06],trim);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=sx*.75,z=.12+sz*.63;b.cylinder('bastion turret',x,.65,z,.14,.42,stone);b.cylinder('turret conical cap',x,.94,z,.19,.2,trim,.015);
    const tx=-.16+sx*.47,tz=-.2+sz*.42;b.cylinder('tower corner turret',tx,2.18,tz,.11,.24,trim);b.cylinder('tower turret cap',tx,2.39,tz,.15,.18,stone,.01);
  }
  for(let i=0;i<5;i++){const x=-.65+i*.245;b.box('tower battlements',[x,2.27,.26],[.12,.2,.12],trim);b.box('tower rear battlements',[x,2.27,-.66],[.12,.2,.12],trim);}
  for(const x of [-.48,0,.48])b.arch('bastion openings',x,.1,.88,.22,.26,shade,trim);
  for(const sx of [-1,1]){
    for(const y of [.89,1.35,1.81])for(const z of [-.44,.045]){
      b.box('tower side stone windowframe',[-.16+sx*.499,y,z],[.04,.25,.15],trim);
      b.box('tower side embrasure',[-.16+sx*.527,y+.013,z],[.023,.18,.086],shade);
    }
  }
}

function windows(b,x,y,z,w,h,cols=4,rows=4,color='#4e7887'){
  for(const side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)b.box('window grid',[x+(col-(cols-1)/2)*w/cols,y+(row+.5)*h/rows,side*z],[w/cols*.58,h/rows*.6,.025],color);
}
function dome(b,x,y,z,r,h,color){for(let i=0;i<8;i++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16;b.cylinder('segmented dome',x,y+h*(Math.sin(a)+Math.sin(c))/2,z,r*Math.cos(a),h*(Math.sin(c)-Math.sin(a)),color,r*Math.cos(c),16);}}
function science(b){
  for(const [x,h] of [[-.65,1.62],[.65,1.43]]){
    b.box('museum glazed research wing',[x,h/2+.06,0],[.62,h,.85],'#78b5ba');
    for(const side of [-1,1]){b.box('continuous glass facade',[x,h/2+.06,side*.435],[.54,h-.12,.018],'#39768c');for(let row=0;row<6;row++)b.box('horizontal glazing transom',[x,.13+row*(h-.1)/5,side*.449],[.58,.025,.02],'#c3ded8');for(const dx of [-.18,0,.18])b.box('slender facade mullion',[x+dx,h/2+.06,side*.45],[.018,h-.08,.025],'#d8e6db');}
    for(const side of [-1,1]){b.box('white structural frame',[x+side*.3,h/2+.06,0],[.045,h+.06,.88],'#e3e9dd');for(let row=0;row<5;row++)b.box('side laboratory ribbon glazing',[x+side*.325,.25+row*.25,0],[.018,.12,.68],'#427c91');}
    b.box('roof parapet',[x,h+.1,0],[.68,.07,.92],'#c0d7c6');
    if(x<0){for(const z of [-.24,.12]){b.box('solar array frame',[x,h+.16,z],[.46,.035,.23],'#dae1ce');b.box('photovoltaic panels',[x,h+.185,z],[.42,.018,.2],'#355b80');for(const dx of [-.1,0,.1])b.box('solar cell divisions',[x+dx,h+.196,z],[.009,.006,.19],'#8bb4c6');}}
    else{b.frustum('roof skylight',x,h+.22,0,.39,.23,.2,.55,.4,'#9bcdd0');for(const z of [-.22,0,.22])b.beam('skylight ribs',[x-.2,h+.12,z],[x-.115,h+.32,z*.85],.018,'#e5e7cc');}
  }
  b.box('enclosed skybridge',[0,1.03,0],[1.48,.28,.4],'#dce8d9');b.box('skybridge glazing',[0,1.04,.21],[1.38,.18,.025],'#3f6d83');
  for(let i=0;i<6;i++){const x=-.66+i*.22;b.beam('skybridge diagonal supports',[x,.93,.24],[x+.22,1.15,.24],.022,'#bad4d0');}
  b.cylinder('planetarium drum',0,.29,.5,.35,.39,'#d5ddca');dome(b,0,.49,.5,.36,.31,'#8ac5c5');b.arch('museum entry',0,.08,.87,.23,.32,'#294f67');
  for(let k=0;k<8;k++)for(let j=0;j<6;j++){const a=k*Math.PI/4,t=j*Math.PI/12,u=(j+1)*Math.PI/12;b.beam('planetarium dome ribs',[.365*Math.cos(t)*Math.cos(a),.49+.315*Math.sin(t),.5+.365*Math.cos(t)*Math.sin(a)],[.365*Math.cos(u)*Math.cos(a),.49+.315*Math.sin(u),.5+.365*Math.cos(u)*Math.sin(a)],.012,'#dce9dc');}
  b.cylinder('science sculpture pedestal',0,1.25,0,.13,.14,'#cad8ce');
  b.cylinder('armillary shaft',0,1.54,0,.105,.53,'#b38b53',.07,12);
  for(const ring of [0,1])for(let j=0;j<24;j++){
    const point=t=>ring?[.36*Math.cos(t),1.99+.32*Math.sin(t),.29*Math.cos(t)]:[.42*Math.cos(t),1.99+.12*Math.cos(t),.41*Math.sin(t)];
    b.beam('brass roof armillary',point(j*Math.PI/12),point((j+1)*Math.PI/12),.051,ring?'#d6a058':'#e4c780');
  }
  b.cylinder('celestial globe',0,1.97,0,.19,.18,'#649f9d',.19,16);dome(b,0,2.06,0,.19,.16,'#79b7ac');
  b.box('entry stairs',[0,.045,.91],[.64,.07,.16],'#ece1c3');for(const x of [-.27,.27]){b.cylinder('entrance bollard',x,.16,.93,.018,.22,'#506f7c');b.cylinder('bollard lamp',x,.28,.93,.035,.035,'#e7d69b');}
}

function grove(b){
  // Monopteros-inspired miniature: ten columns on a grassy rise, not a site replica.
  b.root.landmarkReference='Englischer Garten — Monopteros';
  const stone='#eee2c4',shade='#c9b893',path='#e5d1aa',green='#80a66a';
  b.cylinder('lawn boundary',0,.12,0,.88,.07,'#5d805b',.88,32);
  b.cylinder('open garden lawn',0,.16,0,.85,.045,green,.85,32);
  b.cylinder('gentle grassy mound',0,.22,-.14,.6,.12,'#91b475',.46,32);
  // A continuous oval walk with an entrance and a spur to the temple stairs.
  for(let i=0;i<48;i++){
    const a=i*Math.PI/24,c=(i+1)*Math.PI/24,p=(t,r)=>[Math.cos(t)*r,.185,Math.sin(t)*r*.87];
    b.quad(p(a,.59),p(c,.59),p(c,.73),p(a,.73),path);
    b.beam('curved lawn edging',p(a,.735),p(c,.735),.018,'#d0bd97');
  }
  b.features.push('continuous curved garden path');
  b.box('garden entrance connection',[0,.183,.75],[.2,.018,.3],path);
  b.box('temple approach path',[0,.187,.43],[.2,.02,.38],path);
  for(let i=0;i<3;i++)b.cylinder('round stepped temple plinth',0,.285+i*.045,-.14,.51-i*.035,.05,i%2?shade:stone,.51-i*.035,32);
  for(let i=0;i<3;i++)b.box('connected approach steps',[0,.205+i*.045,.44-i*.08],[.24,.05,.12],i%2?shade:stone);
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5+Math.PI/10,x=Math.cos(a)*.365,z=-.14+Math.sin(a)*.365;
    b.cylinder('column base moulding',x,.405,z,.063,.055,shade,.057,12);
    b.cylinder('ten slender temple columns',x,.805,z,.037,.75,stone,.032,12);
    b.box('Ionic capital abacus',[x,1.205,z],[.115,.04,.095],stone);
    for(const dx of [-.038,.038])b.cylinder('simplified capital volutes',x+dx,1.178,z,.024,.036,'#d6c39b',.024,10);
  }
  b.cylinder('architrave supported by capitals',0,1.255,-.14,.445,.07,shade,.445,32);
  b.cylinder('decorated frieze',0,1.315,-.14,.46,.055,stone,.46,32);
  for(let i=0;i<30;i++){const a=i*Math.PI/15;b.box('frieze dentils',[Math.cos(a)*.458,1.343,-.14+Math.sin(a)*.458],[.025,.025,.025],'#a38c65');}
  b.cylinder('projecting roof cornice',0,1.365,-.14,.49,.045,stone,.49,32);
  dome(b,0,1.387,-.14,.475,.22,'#799a8c');
  for(let k=0;k<20;k++)for(let i=0;i<6;i++){const a=k*Math.PI/10,t=i*Math.PI/12,u=(i+1)*Math.PI/12,p=v=>[Math.cos(a)*.478*Math.cos(v),1.387+.222*Math.sin(v),-.14+Math.sin(a)*.478*Math.cos(v)];b.beam('radial roof ribs',p(t),p(u),.012,'#aec1a6');}
  b.cylinder('roof finial base',0,1.62,-.14,.055,.05,stone,.035,12);b.cylinder('roof finial',0,1.68,-.14,.03,.085,'#c4a76b',.009,12);
  // Open-legged benches face the walk; the gaps remain visible at game distance.
  for(const x of [-.55,.55]){
    for(const dx of [-.12,.12])for(const z of [.48,.59])b.beam('bench metal legs',[x+dx,.18,z],[x+dx,.34,z],.025,'#44635b');
    for(const z of [.47,.52,.57])b.box('separate wooden seat slats',[x,.345,z],[.34,.028,.037],'#b98f58');
    for(const dx of [-.13,.13])b.beam('backrest supports',[x+dx,.3,.605],[x+dx,.55,.64],.023,'#44635b');
    for(const y of [.43,.50])b.box('separate wooden back slats',[x,y,.63],[.34,.045,.026],'#cca469');
    for(const dx of [-.155,.155])b.beam('bench arm rests',[x+dx,.43,.46],[x+dx,.43,.63],.022,'#44635b');
  }
  for(const [x,z,h] of [[-.67,-.52,1.24],[.66,-.49,1.4],[-.72,.02,.87]]){
    b.cylinder('visible branching tree trunk',x,.18+h*.25,z,.034,h*.5,'#8e7251',.025,10);
    for(const [dx,dz,dy,r] of [[-.06,0,.53,.16],[.06,.02,.64,.17],[0,-.035,.8,.14]]){
      b.beam('tree fork',[x,.18+h*.35,z],[x+dx,.18+h*dy,z+dz],.025,'#8e7251');
      b.cylinder('rounded layered broadleaf crown',x+dx,.18+h*dy,z+dz,r,.16,dy>.7?'#a3ba77':'#659568',r*.9,10);dome(b,x+dx,.26+h*dy,z+dz,r*.9,.13,dy>.7?'#a3ba77':'#79a26c');
    }
  }
  for(const x of [-.34,.34]){
    b.cylinder('flower bed raised border',x,.2,.73,.115,.055,'#b7aa87',.115,16);
    b.cylinder('flower bed soil',x,.23,.73,.096,.018,'#6e7051',.096,16);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;b.cylinder('flower clumps',x+.06*Math.cos(a),.265,.73+.06*Math.sin(a),.024,.055,i%2?'#d8b779':'#ba8594',.032,8);}
  }
}
function arcade(b){
  const cream='#f5dfa9',water='#68aca8',ink='#3c6a79',brick='#ba8062';
  b.box('canal water',[0,.095,.55],[1.93,.08,.66],water);
  for(const [i,color] of ['#ce846d','#c4a274','#6e9e94'].entries()){
    const x=(i-1)*.61,h=[1.25,1.54,1.30][i],depth=.74;
    b.box('narrow canal house',[x,h/2,-.24],[.55,h,depth],color);
    b.gable('steep slate roof',x,h,-.24,.61,.35,.85,i===1?'#637b85':'#6b777a');
    for(const side of [-1,1]){
      const z=-.24+side*(depth/2+.035);
      for(const yy of [.38,.78,1.12])for(const dx of [-.14,.14]){
        b.box('merchant window surround',[x+dx,yy,z],[.18,.25,.054],cream);
        b.box('dark canal window',[x+dx,yy,z+side*.035],[.123,.182,.017],ink);
        b.box('window sash',[x+dx,yy-.025,z+side*.049],[.13,.024,.018],cream);
      }
      if(i===1){
        for(const [k,w] of [.64,.48,.34,.21].entries()){
          b.box('stepped clock gable',[x,h+.067+k*.09,z],[w,.13,.10],color);
          b.box('stepped coping',[x,h+.137+k*.09,z],[w+.035,.035,.13],cream);
        }
      }else if(i===0){
        b.frustum('bell gable shoulder',x,h+.13,z,.61,.35,.26,.11,.11,color);
        b.box('bell gable neck',[x,h+.325,z],[.33,.18,.11],color);
        b.gable('bell gable cornice',x,h+.41,z,.39,.115,.14,cream);
      }else{
        b.gable('gable front',x,h,z,.63,.40,.13,color);
        for(const dx of [-.30,.30])b.beam('Dutch gable bargeboard',[x+dx,h,z+side*.07],[x,h+.39,z+side*.07],.044,cream);
      }
    }
  }
  b.box('masonry quay',[0,.17,.19],[1.94,.15,.14],brick);
  for(let i=0;i<9;i++){
    const z=.22+i*.077,y=.238+.14*Math.sin(i*Math.PI/8);
    b.box('arched canal footbridge',[0,y,z],[.43,.061,.084],cream);
    for(const x of [-.23,.23]){
      if(i%2===0)b.box('bridge baluster',[x,y+.14,z],[.034,.25,.038],ink);
      if(i<8)b.beam('continuous canal rail',[x,y+.27,z],[x,.508+.14*Math.sin((i+1)*Math.PI/8),z+.077],.043,ink);
    }
  }
}
function fort(b){
  const stone='#c78d62',trim='#ecd0a2';b.box('fort courtyard',[0,.1,0],[1.75,.16,1.6],'#d9bb89');
  for(const z of [-.66,.66])b.box('fort curtain walls',[0,.52,z],[1.7,.8,.16],stone);for(const x of [-.77,.77])b.box('fort side walls',[x,.52,0],[.16,.8,1.3],stone);
  for(const x of [-.73,.73])for(const z of [-.64,.64]){b.cylinder('octagonal watchtower',x,.72,z,.2,1.25,stone,.2,8);b.cylinder('watchtower cornice',x,1.35,z,.25,.1,trim,.25,8);dome(b,x,1.4,z,.24,.2,trim);}
  for(let i=0;i<9;i++)for(const z of [-.67,.67])b.box('crenellated walls',[-.66+i*.165,.99,z],[.09,.15,.2],trim);
  b.box('gateway pavilion',[0,.69,.67],[.64,1.15,.26],stone);b.arch('ornate main arch',0,.12,.81,.4,.78,'#725644',trim);b.gable('gate pediment',0,1.28,.67,.75,.2,.35,trim);
  b.box('inner palace',[0,.63,-.2],[.95,1,.5],'#dcad78');for(const x of [-.3,0,.3])b.arch('palace arcade',x,.44,.06,.17,.44,'#80674e',trim);
}
function campus(b){
  b.box('university library',[0,1.0,-.15],[1.15,1.8,.72],'#d7ccad');b.box('mural wall',[0,1.05,.22],[1.08,1.45,.025],'#527b7c');
  const colors=['#e1b25e','#aa654f','#e5d8ad','#4b686b'];for(let row=0;row<7;row++)for(let col=0;col<7;col++){const x=(col-3)*.14,y=.48+row*.18,c=colors[(row*3+col*col)%4];b.box('geometric campus mural',[x,y,.245],[.12,.15,.02],c);}
  b.box('library roof',[0,1.94,-.15],[1.27,.09,.84],'#eadfc5');
  for(const x of [-.7,.7]){b.box('low teaching wing',[x,.38,.21],[.35,.58,1.04],'#c6d6c7');for(const z of [-.2,.1,.4,.7])b.box('campus colonnade',[x,.26,z],[.055,.45,.055],'#f0e4c7');}b.box('campus steps',[0,.08,.72],[1.3,.1,.26],'#c6b997');
  // Both ends of the library carry a single graphic sun above a terraced
  // skyline. At miniature scale the mosaic remains one legible composition.
  for(const sign of [-1,1]){
    const x=sign*.584;
    b.box('sandstone mosaic frame',[x,1.10,-.15],[.053,1.49,.65],'#e3c697');
    b.box('teal mosaic ground',[x+sign*.035,1.10,-.15],[.025,1.38,.54],'#538986');
    const pane=x+sign*.054;
    b.box('mosaic sun',[pane,1.48,-.06],[.019,.21,.21],'#e9b66a');
    for(let row=0;row<4;row++)b.box('mosaic terrace',[pane,.54+row*.13,-.16],[.023,.14,.51-row*.105],row%2?'#e3b677':'#c57e60');
  }
  for(const x of [-.30,.30])for(const y of [.56,1.01,1.46])b.box('rear library glazing',[x,y,-.525],[.35,.28,.033],'#648785');
}
function pavilion(b){
  b.box('stone temple terrace',[0,.12,0],[1.7,.22,1.45],'#919987');b.box('shrine body',[0,.66,-.2],[.65,.88,.65],'#ac9d78');b.arch('shrine doorway',0,.24,.14,.25,.5,'#526458');
  for(let i=0;i<5;i++){const w=1.15-i*.15;b.frustum('meru tiered roofs',0,1.0+i*.22,-.2,w,w*.32,.2,w,w*.32,'#4d665a');b.box('roof eaves',[0,.91+i*.22,-.2],[w+.07,.045,w+.07],'#738674');}b.cylinder('temple finial',0,2.13,-.2,.04,.25,'#cdbb85');
  for(const sign of [-1,1]){for(let i=0;i<4;i++)b.box('split gateway stepped stone',[sign*(.4+i*.025),.28+i*.21,.56],[.31-i*.045,.22,.25],'#9ca58d');b.box('gateway base',[sign*.4,.19,.56],[.43,.15,.38],'#c3b895');}
  for(let i=0;i<3;i++)b.box('temple entrance stairs',[0,.045+i*.05,.83-i*.06],[.57,.07,.13],'#b8b39a');
}
function neon(b){
  // Three different silhouettes retain the original street footprint.
  b.box('west retail podium',[-.57,.55,0],[.49,1.1,.65],'#b49c89');b.box('west setback offices',[-.6,1.38,-.07],[.39,.56,.51],'#7593aa');
  b.box('central glass tower',[0,1.22,0],[.49,2.44,.65],'#526c86');b.frustum('tapered tower crown',0,2.57,0,.49,.32,.26,.65,.46,'#9abac7');
  b.box('east commercial tower',[.57,1.03,0],[.49,2.06,.65],'#73a99f');
  for(const [x,h] of [[-.57,1.08],[0,2.44],[.57,2.06]]){
    b.box('shop display glazing',[x,.19,.345],[.4,.3,.035],'#375968');for(const dx of [-.11,.11])b.box('shop door mullions',[x+dx,.19,.369],[.018,.31,.02],'#dce2ce');
    b.box('illuminated shop fascia',[x,.41,.39],[.47,.11,.08],x===0?'#d28ca9':x<0?'#dfad6b':'#e1d2aa');
    b.box('storefront canopy',[x,.48,.46],[.47,.035,.26],x<0?'#cf8c70':'#9db7ae');
    if(x===0){b.box('blue curtain wall',[0,1.48,.338],[.43,1.75,.02],'#407791');for(let i=0;i<9;i++)b.box('glass tower transom',[0,.64+i*.21,.358],[.44,.016,.02],'#a5c7d0');for(const dx of [-.145,0,.145])b.box('silver tower fins',[dx,1.48,.37],[.017,1.77,.06],'#d8e4db');b.tri([-.2,.65,.363],[.2,.65,.363],[.2,2.22,.363],'#6b9eb0');}
    else windows(b,x,.6,.34,.41,h-.64,2,x<0?2:5,'#c1dfd0');
    for(let row=0;row<(x===0?8:5);row++)for(const z of [-.19,.05,.24])b.box('side window rhythm',[x+.252,.62+row*.2,z],[.02,.105,.105],'#bdd7d1');
  }
  windows(b,-.6,1.14,.19,.32,.45,2,2,'#cae4d7');
  b.box('west roof garden terrace',[-.57,1.12,.23],[.5,.04,.22],'#8da881');for(const x of [-.75,-.39])b.box('roof terrace planter',[x,1.21,.23],[.11,.16,.14],'#617f76');
  for(const x of [-.8,-.57,-.34])b.beam('terrace balustrade',[x,1.15,.34],[x,1.36,.34],.015,'#d5dfd3');b.beam('terrace handrail',[-.8,1.36,.34],[-.34,1.36,.34],.018,'#d5dfd3');
  for(const [x,y] of [[.57,2.1],[0,2.75]]){b.box('roof mechanical enclosure',[x,y,-.12],[.23,.12,.27],'#9eb1b7');for(let k=0;k<4;k++)b.box('ventilation slats',[x-.08+k*.05,y,.025],[.015,.085,.015],'#506b79');}
  for(let i=0;i<4;i++)b.box('vertical illuminated storefront sign',[.24,.65+i*.22,.39],[.11,.16,.055],i%2?'#d1dfd3':'#e7a6c1');
  b.box('pavement storefront strip',[0,.05,.55],[1.8,.07,.3],'#c7b9a0');for(const x of [-.76,.75]){b.box('street planter',[x,.12,.59],[.19,.12,.15],'#75867b');b.cylinder('street shrub',x,.24,.59,.085,.17,'#8baa77',.045);}
}

function marina(b){
  for(const x of [-.58,0,.58]){b.frustum('three hotel towers',x,1.12,0,.43,.36,2.1,.55,.46,'#90b8c6');windows(b,x,.15,.28,.35,1.9,3,9,'#426c83');for(const side of [-1,1])b.box('hotel tower edge',[x+side*.19,1.13,0],[.035,2.12,.55],'#d2dcd0');}
  b.frustum('skypark boat hull',0,2.27,0,1.65,2.0,.21,.45,.62,'#ccd7c7');for(const sign of [-1,1])b.cylinder('rounded skypark ends',sign*.89,2.32,0,.31,.09,'#dce0c9',.31,12);b.box('skypark garden',[0,2.39,0],[1.75,.04,.42],'#749f72');b.box('infinity pool',[0,2.42,.12],[1.34,.03,.13],'#6bb7bc');for(const x of [-.7,.7]){b.cylinder('skypark tree',x,2.51,-.12,.08,.16,'#82ad79',.04);}
  b.box('hotel entrance podium',[0,.1,0],[1.95,.16,.8],'#d6c7a6');
}
function dubai(b){
  const colors=['#7fa7b9','#a4c4ce','#608caa'];
  for(let i=0;i<9;i++){const w=.96-i*.085,y=.19+i*.38;b.cylinder('stepped central core',0,y+.19,0,w/2,.4,colors[i%3],w/2,12);for(let k=0;k<3;k++){const a=k*Math.PI*2/3,r=w*.35,x=Math.cos(a)*r,z=Math.sin(a)*r;b.box('setback wings',[x,y+.17,z],[w*.47,.36,w*.47],colors[(i+k)%3]);}for(let k=0;k<8;k++){const a=k*Math.PI/4;b.beam('silver vertical ribs',[Math.cos(a)*w*.51,y,Math.sin(a)*w*.51],[Math.cos(a)*w*.51,y+.35,Math.sin(a)*w*.51],.018,'#d0ded8');}}
  b.cylinder('slender upper mast',0,3.97,0,.045,.7,'#c6d6d4');b.cylinder('needle spire',0,4.48,0,.018,.4,'#e3e3ca');b.cylinder('lobed tower podium',0,.12,0,.8,.2,'#a7b7b1',.7,12);
}
function gherkin(b){
  const rings=14,n=16,point=(i,j)=>{const t=i/rings,y=.15+t*2.85,r=.18*(1-t)+.48*Math.sin(Math.PI*Math.pow(t,.8));return[Math.cos(j*2*Math.PI/n)*r,y,Math.sin(j*2*Math.PI/n)*r];};
  for(let i=0;i<rings;i++)for(let j=0;j<n;j++){const a=point(i,j),c=point(i,j+1),d=point(i+1,j+1),e=point(i+1,j);b.quad(a,c,d,e,(i+j)%4===0?'#36677b':'#83b1b7');b.beam('diagonal facade lattice',a,d,.015,'#d7e1d1');b.beam('crossed facade lattice',c,e,.015,'#b7d3ca');}b.features.push('tapered egg silhouette');b.cylinder('circular entrance base',0,.12,0,.52,.19,'#ced2b7');b.arch('street entrance',0,.1,.5,.27,.4,'#284c64');
}
function easel(b){
  b.box('Montmartre studio',[0,.78,-.14],[1.38,1.48,.94],'#e0bda0');
  b.frustum('steep mansard roof',0,1.73,-.14,1.57,1.06,.4,1.1,.68,'#626d78');b.box('flat mansard ridge',[0,1.95,-.14],[1.07,.045,.69],'#536271');
  for(let i=0;i<10;i++){const x=-.7+i*.155;b.beam('slate roof seams',[x,1.54,.413],[x*.68,1.94,.205],.012,'#8a979d');}
  for(const y of [.6,1.0,1.43])b.box('stone facade stringcourse',[0,y,.344],[1.4,.035,.04],'#f2d8b8');
  for(const x of [-.383,0,.383])for(const y of [.8075,1.1825]){
    b.box('recessed window glazing',[x,y,.347],[.23,.255,.025],'#4b7884');
    for(const dx of [-.13,.13])b.box('window limestone jamb',[x+dx,y,.37],[.028,.3,.045],'#f0d8b7');for(const dy of [-.15,.15])b.box('window sill lintel',[x,y+dy,.38],[.31,.035,.065],'#eed4b0');
    b.box('window central mullion',[x,y,.37],[.014,.25,.02],'#e8d9bb');b.box('window crossbar',[x,y+.035,.37],[.23,.014,.02],'#e8d9bb');
  }
  b.box('upper wrought balcony slab',[0,1.02,.44],[1.25,.045,.2],'#ab9b87');for(let i=0;i<12;i++)b.beam('wrought iron balcony uprights',[-.58+i*.105,1.04,.53],[-.58+i*.105,1.24,.53],.013,'#4d6368');b.beam('balcony handrail',[-.64,1.25,.53],[.64,1.25,.53],.022,'#4d6368');
  for(const x of [-.45,.45]){b.box('dormer front',[x,1.69,.28],[.27,.27,.19],'#dbd4b9');b.gable('dormer roof',x,1.82,.28,.34,.13,.25,'#536372');b.box('dormer glazing',[x,1.69,.39],[.15,.17,.02],'#537b8b');b.box('dormer cross mullion',[x,1.69,.405],[.015,.18,.015],'#e8dbc0');}
  b.box('brick chimney',[.51,2.08,-.39],[.17,.3,.2],'#b38975');b.box('chimney cap',[.51,2.24,-.39],[.23,.04,.26],'#e7d0ac');for(const z of [-.44,-.34])b.cylinder('terracotta chimney pot',.51,2.31,z,.035,.12,'#a77d67');
  for(const x of [-.7,.7])for(const y of [.36,.75,1.14])for(const z of [-.34,.06]){b.box('side studio window',[x,y,z],[.025,.23,.18],'#6d8b92');b.box('side window sill',[x,y-.13,z],[.05,.025,.24],'#e8ceab');}
  b.box('cafe awning',[0,.59,.55],[1.15,.09,.42],'#c68572');for(let i=0;i<6;i++)b.box('striped awning',[-.48+i*.19,.64,.55],[.09,.025,.42],'#f0ddbb');
  b.arch('cafe entry',-.32,.06,.34,.25,.47,'#496575');b.box('cafe shopfront display',[.17,.28,.35],[.47,.42,.035],'#5a8287');for(const x of [-.05,.18,.4])b.box('shopfront mullion',[x,.28,.38],[.025,.43,.02],'#eed9b5');
  for(const x of [-.14,.14])b.beam('artist easel legs',[.52+x,.08,.77],[.52,.76,.73],.035,'#9a764f');b.box('painted canvas',[.52,.61,.77],[.31,.34,.035],'#f4dfad');b.tri([.39,.48,.795],[.65,.48,.795],[.53,.7,.795],'#7da598');
  b.cylinder('cafe table',-.46,.31,.76,.18,.04,'#a77d56');b.cylinder('table leg',-.46,.17,.76,.025,.27,'#576a65');
  for(const x of [-.69,-.22]){b.cylinder('bistro chair seat',x,.2,.77,.075,.035,'#b89363');b.beam('bistro chair back',[x-.06,.22,.83],[x-.06,.39,.83],.017,'#687a70');b.beam('bistro chair back',[x+.06,.22,.83],[x+.06,.39,.83],.017,'#687a70');b.beam('chair back rail',[x-.06,.39,.83],[x+.06,.39,.83],.02,'#687a70');for(const z of [.73,.81])b.beam('chair legs',[x,.06,z],[x,.2,z],.018,'#687a70');}
  b.cylinder('table coffee cup',-.45,.35,.74,.026,.047,'#f3e7cb');
}

function exchange(b){
  b.box('exchange rear hall',[0,.85,-.16],[1.55,1.5,.8],'#c3cbd0');windows(b,0,.9,.25,1.25,.55,5,2,'#5e7d88');
  for(let i=0;i<4;i++)b.box('exchange entrance steps',[0,.05+i*.06,.47-i*.04],[1.85-i*.1,.075,.82-i*.12],'#dfd7bf');
  for(const x of [-.65,-.39,-.13,.13,.39,.65]){b.cylinder('classical fluted columns',x,.88,.49,.055,1.2,'#eee6ce',.05,10);b.box('column capital',[x,1.51,.49],[.15,.09,.16],'#f1e4c5');b.box('column plinth',[x,.3,.49],[.15,.09,.16],'#dfd4b6');}
  b.box('entablature',[0,1.63,.16],[1.85,.17,1.0],'#e3dcc6');b.gable('triangular pediment',0,1.72,.16,1.94,.43,1.03,'#d5cfb9');b.gable('pediment inset',0,1.78,.685,1.47,.28,.02,'#8d9e9b');for(const x of [-.43,0,.43])b.cylinder('pediment relief',x,1.87,.71,.06,.14,'#e4dbc0');
  for(const side of [-1,1]){
    b.box('trading hall roof gutter',[side*.88,1.72,.15],[.10,.09,1.01],'#ae956e');
    for(const z of [-.41,-.14,.13]){
      b.box('side trading hall recessed bay',[side*.786,.95,z],[.038,.93,.213],'#68888b');
      for(const y of [.67,1.10])b.box('sandstone sash',[side*.813,y,z],[.028,.045,.22],'#ded4b9');
    }
  }
  for(const x of [-.53,0,.53]){
    b.box('back hall window frame',[x,1.05,-.578],[.36,.78,.045],'#e2d6b7');
    b.box('back hall glazing',[x,1.05,-.605],[.27,.68,.025],'#6e8d91');
  }
}
function bridge(b){
  // First Bosphorus Bridge, post-rehabilitation vertical hangers. Compressed banks
  // and anchor blocks are diagrammatic; longer approach slopes connect to the planned city streets.
  b.root.landmarkReference='Bosphorus Bridge / 15 July Martyrs Bridge';
  const steel='#c5d1d0',edge='#e1e4d9',cable='#dbe1d5',stone='#b6b7a5';
  b.box('strait water',[0,.115,0],[2.1,.06,1.35],'#579fa8');
  for(const side of [-1,1]){
    b.frustum('landward shore embankment',side*.86,.29,0,.41,.36,.30,1.35,1.19,'#79937c');
    b.box('shore retaining wall',[side*.67,.27,0],[.07,.25,1.25],stone);
    b.box('quay coping',[side*.65,.402,0],[.12,.035,1.28],'#dbd6bb');
    for(let i=0;i<7;i++)b.box('quay stone joints',[side*.63,.27,-.54+i*.18],[.012,.2,.014],'#87958c');
    b.box('bridge abutment',[side*.76,.53,0],[.15,.35,.54],stone);
    for(const z of [-.32,.32]){
      b.frustum('shore cable anchor block',side*.96,.48,z,.18,.14,.22,.23,.19,'#a9b7b1');
      b.box('anchor saddle cap',[side*.96,.60,z],[.15,.045,.17],edge);
    }
    // The roadway reaches solid land at each end rather than stopping in air.
    const xa=side*.73,xb=side*1.6,ya=.71,yb=.14;
    b.quad([xa,ya,-.25],[xa,ya,.25],[xb,yb,.25],[xb,yb,-.25],'#677b80');
    for(const z of [-.25,.25]){b.quad([xa,ya,z],[xb,yb,z],[xb,.1,z],[xa,.1,z],stone);b.beam('approach guardrail',[xa,ya+.11,z],[xb,yb+.11,z],.023,edge);}
    for(let i=0;i<=4;i++){const t=i/4,x=xa+(xb-xa)*t,y=ya+(yb-ya)*t;for(const z of [-.25,.25])b.beam('approach guardrail posts',[x,y,z],[x,y+.11,z],.016,steel);}
  }
  b.frustum('aerodynamic suspended deck',0,.66,0,1.52,1.52,.1,.40,.52,'#82989b');
  b.box('continuous road surface',[0,.713,0],[1.52,.012,.45],'#657980');
  for(const x of [-.56,.56]){
    for(const z of [-.29,.29]){
      b.box('concrete tower footing',[x,.27,z],[.17,.25,.18],stone);
      b.frustum('pale steel portal tower leg',x,1.12,z,.085,.07,1.65,.09,.075,steel);
      b.box('tower vertical highlight',[x+.043,1.12,z],[.012,1.65,.045],edge);
      b.box('main cable tower saddle',[x,1.94,z],[.12,.075,.1],edge);
    }
    for(const y of [1.57,1.87])b.box('portal tower crossbeam',[x,y,0],[.10,.08,.64],steel);
    b.box('deck bearing crossbeam',[x,.605,0],[.13,.07,.65],'#9aaead');
  }
  const cableY=x=>Math.abs(x)<=.56?1.01+.93*(x/.56)**2:1.94-(Math.abs(x)-.56)/.40*1.34;
  for(const z of [-.29,.29]){
    for(let i=0;i<48;i++){const x=-.96+i*.04,n=x+.04;b.beam('continuous main cable to shore anchor',[x,cableY(x),z],[n,cableY(n),z],.026,cable);}
    for(let i=0;i<=16;i++){const x=-.56+i*.07,y=cableY(x);b.beam('vertical replacement hangers',[x,.724,z],[x,y,z],.013,cable);b.box('main cable hanger clamps',[x,y,z],[.033,.04,.035],'#8faaa9');b.box('deck hanger sockets',[x,.735,z],[.03,.04,.035],steel);}
    for(let i=0;i<=20;i++){const x=-.73+i*.073;b.beam('bridge parapet posts',[x,.716,z*.85],[x,.835,z*.85],.014,steel);}
    for(const y of [.765,.835])b.beam('continuous bridge guardrail',[-.76,y,z*.85],[.76,y,z*.85],.018,edge);
  }
  for(const z of [-.075,.075])for(let i=0;i<12;i++)b.box('road lane dashes',[-.69+i*.125,.724,z],[.065,.008,.009],'#e8e5cd');
  b.box('central road divider',[0,.728,0],[1.5,.025,.012],'#b7c6bf');
  for(const x of [-.88,.88])for(const z of [-.53,.53]){b.cylinder('shore planting',x,.48,z,.075,.12,'#72976d',.05,10);}
  for(const x of [-.4,.1,.4])for(const z of [-.53,.52])b.box('water surface highlights',[x,.151,z],[.16,.006,.012],'#84bdba');
}
export function buildLandmark(scene,type,root){
  const builders={airportStart,cruiseStart,hangingGardens,angkorWat,moai,mountFuji,pisaTower,stonehenge,liberty,giza,tajMahal,kukulcan,colosseum,bigBen,goldenGate,greatWall,gyeongbokgung,machuPicchu,tower:taipei101,tokyo:tokyoTower,opera:b=>operaWaterfront(b,operaShells),lighthouse:belem};if(!builders[type])return false;
  const builder=new Builder(scene,root);builders[type](builder);builder.finishPainted();return true;
}

export function buildRemainingLandmark(scene,type,root){const builders={science,grove,arcade,fort,campus,pavilion,neon,marina,dubai:burjKhalifa,gherkin,easel:b=>parisEiffel(b,easel),exchange,bridge,port:buildWorkingHarbor};if(!builders[type])return false;const b=new Builder(scene,root);builders[type](b);b.finishPainted();return true;}
