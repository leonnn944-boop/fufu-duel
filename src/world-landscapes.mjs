import {elevation, pebble, softBox} from './toy-town.mjs';
import {profile,local,arch,slab,tree,flowerbed,stoneJoint} from './world-craft.mjs';

const grass = ['#436d59', '#538563', '#749661', '#93af72'];
const rock = ['#727c70', '#8e937e', '#a3a18a', '#7b8d7f'];
const stone = '#d3c4a4';

function ridge(b, name, x, z, rx, rz, bottom, height, lean, palette) {
  // Off-centre crests and broken rock faces give each approach a different profile.
  b.features.push(name);
  const sides = 20;
  const ring = (fraction, width, shift) => Array.from({length:sides}, (_, i) => {
    const a = 2 * Math.PI * i / sides;
    const variation = .91 + .09 * Math.sin(3*a+.5) + .06 * Math.cos(5*a);
    return [x + shift*lean + rx*width*Math.cos(a)*variation,
      bottom + height*(fraction + (fraction === 0 ? 0 : .025*Math.cos(3*a))),
      z + rz*width*Math.sin(a)*variation];
  });
  const rings = [ring(0,1,0),ring(.16,.97,.05),ring(.35,.86,.12),ring(.52,.69,.27),ring(.69,.52,.42),ring(.80,.38,.63),ring(.89,.24,.8),ring(.95,.12,.92)];
  for(let level=1;level<rings.length;level++){
    for(let i=0;i<sides;i++){
      const k=(i+1)%sides, lo=rings[level-1], hi=rings[level];
      const ink=palette[(i+level)%palette.length];
      b.quad(lo[k],lo[i],hi[i],hi[k],ink);
    }
  }
  const top=rings.at(-1);
  for(let i=0;i<sides;i++)b.tri(top[(i+1)%sides],top[i],[x+lean,bottom+height,z],palette[2]);
}

function watchtower(b,x,z,y){
  const h=.43;
  const g=local(b,{x,z});
  profile(g,'chamfered carved tower foundation',0,0,[{y,w:.48,d:.46},{y:y+.06,w:.47,d:.45},{y:y+.36,w:.40,d:.38}],[ '#b7a486','#dbc7a3']);
  b.frustum('battered watchtower base',x,y+h/2,z,.45,.395,h,.43,.38,'#bda989');
  for(let side=0;side<4;side++){const f=elevation(g,side);for(let j=0;j<4;j++){const yy=y+.06+j*.083,reach=.232-j*.008;stoneJoint(f,0,yy,reach,.39-j*.013,.069,'#9b8c73');}}
  b.box('tower observation chamber',[x,y+.53,z],[.405,.22,.40],stone);
  b.box('watchtower cornice',[x,y+.65,z],[.45,.055,.445],'#eee1ba');
  for(const sign of [-1,1]){
    for(const offset of [-.105,.105]){
      b.box('narrow lookout window',[x+offset,y+.53,z+sign*.202],[.069,.104,.012],'#514e45');
      const face=elevation(g,sign===1?0:2);arch(face,'carved lookout arch',offset,y+.478,.204,.071,.111,['#514e45','#d9c8a5','#9c8c73']);
      b.box('side lookout window',[x+sign*.205,y+.53,z+offset],[.012,.104,.069],'#514e45');
    }
    for(const offset of [-.17,0,.17]){
      b.box('tower battlement',[x+offset,y+.708,z+sign*.187],[.069,.088,.063],stone);
      if(offset===0)b.box('side battlement',[x+sign*.193,y+.708,z],[.06,.088,.079],stone);
    }
  }
}

export function greatWall(b){
  softBox(b,'pine green landscape tray',0,0,2.28,1.88,.02,.13,.19,'#75846a');
  ridge(b,'western forested spur',-.60,.10,.59,.77,.10,.59,.08,grass);
  ridge(b,'central wooded saddle',-.02,-.12,.69,.72,.10,.77,.03,grass);
  ridge(b,'high eastern summit',.58,-.19,.60,.65,.10,1.01,.10,grass);
  const path=[[-1.01,.29,.60],[-.78,.38,.38],[-.53,.49,.28],[-.36,.63,.036],[-.12,.77,-.05],[.11,.78,.095],[.37,.83,.075],[.51,.86,-.104],[.64,1.03,-.26],[.89,.79,-.51],[1.04,.56,-.65]];
  const sides=path.map(([x,y,z],i)=>{
    const prev=path[Math.max(0,i-1)], next=path[Math.min(i+1,path.length-1)];
    const dx=next[0]-prev[0],dz=next[2]-prev[2],len=Math.hypot(dx,dz);
    return [-1,1].map(sign=>[x-sign*dz*.118/len,y,z+sign*dx*.118/len]);
  });
  const lift=(p,h)=>[p[0],p[1]+h,p[2]];
  const mix=(p,q,t)=>p.map((v,k)=>v+(q[k]-v)*t);
  for(let i=1;i<sides.length;i++){
    const [a,c]=sides[i-1],[d,e]=sides[i];
    b.quad(a,c,e,d,'#ddcda8');
    for(const [p,q] of [[a,d],[e,c]]){
      b.quad(lift(p,-.32),lift(q,-.32),q,p,i%2?'#ab9d81':'#b7a387');
      b.beam('snaking wall coping',lift(p,.028),lift(q,.028),.065,'#e4d4b0');
      for(const h of [-.07,-.15,-.23])b.beam('brick course',lift(p,h),lift(q,h),.010,'#d1bea0');
      for(const t of [.18,.40,.64,.85])b.beam('staggered brick mortar joint',lift(mix(p,q,t),-.07),lift(mix(p,q,t),-.15),.009,'#907f67');
      for(const t of [.15,.62]){
        b.beam('paired parapet merlons',lift(mix(p,q,t),.078),lift(mix(p,q,t+.22),.078),.089,stone);
      }
    }
  }
  for(const i of [2,8]){const [x,y,z]=path[i];watchtower(b,x,z,y-.045);}
  for(const [x,z,h] of [[-.89,-.42,.23],[-.67,-.56,.29],[-.44,-.57,.21],[.12,.64,.22],[.29,.56,.26],[.81,.36,.21]]){
    b.cylinder('pine trunk',x,.20,z,.025,.16,'#796e52',.02,8);
    for(let k=0;k<3;k++)pebble(b,'layered sculpted pine crown',x,.24+h*(.20+k*.27),z,.12*(1-k*.24),h*.36,.105*(1-k*.22),k%2?'#6c9869':'#4d805c',12,6);
  }
}

function terrace(b,x,z,w,d,y,offset){
  softBox(b,'Inca retaining wall',x,z,w,d,y,y+.113,.08,'#aa9b78',.015);
  softBox(b,'green agricultural terrace',x,z,w-.018,d-.012,y+.101,y+.141,.08,offset%2?'#8da85e':'#9bb76f',.010);
  for(let i=0;i<Math.floor(w/.15);i++){const px=x-w*.44+i*.14;stoneJoint(b,px,y+.035,z+d/2+.005,.135,.054,'#887d66');}
}

function rooflessHouse(b,x,z,w,d,y){
  const h=.195,t=.055,wall='#c1b89a';
  b.box('Inca lateral walls',[x-w*.5,y+h/2,z],[t,h,d],wall);
  b.box('Inca lateral walls',[x+w*.5,y+h/2,z],[t,h,d],wall);
  b.box('rear gable wall',[x,y+h/2,z-d*.5],[w,h,t],wall);
  b.gable('exposed stone gable',x,y+h,z-d*.5,w,.12,t,wall);
  for(const side of [-1,1])b.box('door jamb',[x+side*w*.32,y+h/2,z+d*.5],[w*.35,h,t],wall);
  b.box('trapezoid doorway lintel',[x,y+h-.018,z+d*.5],[w*.38,.048,t],'#d4c9a5');
  b.gable('broken front gable',x,y+h,z+d*.5,w,.11,t,wall);
  const g=local(b,{x,z});for(const side of [0,1,2,3]){const f=elevation(g,side),width=side%2?d:w,depth=side%2?w:d;for(const level of [.045,.10,.15])stoneJoint(f,0,y+level,depth*.5+.007,width*.95,.041,'#9c9279');}
  slab(b,'chamfered stone doorway sill',x,z+d*.55,w*.41,.08,y,y+.025,.012,'#dfd3b3');
}

export function machuPicchu(b){
  softBox(b,'Andean earth plinth',0,0,2.25,1.89,.02,.14,.21,'#8d8369');
  ridge(b,'Huayna Picchu peak',.10,-.39,.60,.55,.13,1.48,.18,
    ['#5e876f','#688b71','#789474','#657f70','#719880']);
  ridge(b,'distant rocky shoulder',-.49,-.48,.47,.40,.13,.87,-.08,rock);

  ridge(b,'eastern granite spur',.62,-.41,.44,.43,.13,.70,-.07,grass);
  for(let i=0;i<5;i++)terrace(b,-.11-.031*i,.24-.026*i,1.87-.17*i,1.18-.15*i,.13+.126*i,i);
  const floor=.13+4*.126+.141;
  for(const [x,z,w,d] of [[-.50,.17,.24,.22],[-.18,.18,.23,.19],[.10,.12,.24,.23]])
    rooflessHouse(b,x,z,w,d,floor);
  // Lower guardhouse stands apart from the long ridge of roofless dwellings.
  rooflessHouse(b,.56,.36,.24,.24,.524);
  rooflessHouse(b,.39,-.04,.24,.21,floor);
  rooflessHouse(b,-.64,-.10,.21,.18,floor);
  for(const [x,z] of [[.75,.59],[-.78,.49],[-.77,-.42]]){tree(b,x,.19,z,.20);flowerbed(b,x,.18,z,.08);}
  for(let i=0;i<10;i++){
    const z=.805-i*.064;
    b.box('stone terrace stair',[-.35,.17+i*.059,z],[.135,.053,.080],'#cabb95');
  }
  for(const [x,z] of [[.73,.42],[-.85,-.18],[-.70,-.24]])pebble(b,'weathered Andean granite',x,.19,z,.085,.080,.063,'#979d88',8,4);
}

function tiledRoof(b,w,d,base,h){
  // A hipped roof with a long horizontal ridge, concave slopes and lifted tips.
  const edge=(side,u,t)=>{
    const end=side===1||side===3, sx=[1,1,-1,-1][side],sz=[1,-1,-1,1][side];
    const u2=end?1:u, v=end?u:1;
    const x=sx*(w*.5*(1-t)+.27*w*t)*u2;
    const z=sz*(d*.5*(1-t))*v;
    return [x,base+h*(.13*t+.87*t*t)+.13*Math.abs(u)**3*(1-t)**2,z];
  };
  for(let side=0;side<4;side++){
    for(let i=0;i<12;i++){
      const u=-1+i/6,v=u+1/6;
      for(let k=0;k<5;k++){
        const t=k/5,n=(k+1)/5;
        const a=edge(side,u,t),c=edge(side,v,t),p=edge(side,v,n),q=edge(side,u,n);
        const ink=i%3===1?'#506473':'#435869';
        if(k===4&&(side===1||side===3))b.tri(a,c,q,ink);
        else b.quad(a,c,p,q,ink);
        if(i%2===0 && !(k===4&&(side===1||side===3)))b.beam('glazed tile rolls',a,q,.017,'#6e8190');
      }
      const a=edge(side,u,0),c=edge(side,v,0);
      b.beam('vermilion curved fascia',[a[0],a[1]-.035,a[2]],[c[0],c[1]-.035,c[2]],.063,'#b65343');
      b.beam('celadon decorated eaves',a,c,.039,'#85aa8b');
    }
    for(let i=0;i<5;i++)b.beam('raised hip ridge',edge(side,1,i/5),edge(side,1,(i+1)/5),.048,'#738595');
  }
  b.beam('horizontal ceramic ridge',[-.27*w,base+h,0],[.27*w,base+h,0],.065,'#72828a');
  for(const sign of [-1,1])b.beam('ridge end ornaments',[sign*.27*w,base+h,0],[sign*(.27*w+.037),base+h+.071,0],.053,'#5b6b75');
}

export function gyeongbokgung(b){
  softBox(b,'granite court',0,0,2.14,1.81,.02,.13,.14,'#baad93');
  softBox(b,'lower ceremonial terrace',0,-.035,1.82,1.34,.13,.23,.075,'#dfd1b3');
  softBox(b,'upper ceremonial terrace',0,-.035,1.62,1.14,.23,.34,.055,'#eee2c6');
  for(let i=0;i<4;i++)b.box('stone stairway',[0,.07+.028*i,.845-.064*i],[.43,.085+.055*i,.089],'#e2d5b8');
  const timber='#ac5344',jade='#508776', doors='#4c665f';
  b.box('main throne hall',[0,.65,0],[1.28,.62,.78],doors);
  for(let side=0;side<4;side++){
    const f=elevation(b,side),long=side%2===0,w=long?1.30:.80,z=long?.414:.66,panels=long?5:3;
    for(let i=0;i<=panels;i++){
      const x=w*(i/panels-.5);
      f.cylinder('red lacquer hall column',x,.634,z,.043,.586,timber,.039,12);
      f.box('painted corbel',[x,.93,z],[.139,.093,.113],jade);
      if(i===panels)continue;
      const c=x+w/(2*panels);
      f.box('wooden door lattice',[c,.65,z-.010],[w/panels-.064,.39,.034],'#749584');
      for(const h of [.52,.64,.76])f.box('door cross slat',[c,h,z+.012],[w/panels-.060,.015,.024],'#355c57');
      f.box('door centre slat',[c,.645,z+.020],[.014,.35,.012],'#365d57');
    }
  }
  tiledRoof(b,1.97,1.43,.973,.42);
  b.box('upper storey red hall',[0,1.30,0],[1.11,.36,.64],timber);
  for(const sign of [-1,1]){
    for(let i=0;i<6;i++)b.box('upper clerestory',[i*.18-.45,1.36,sign*.327],[.11,.16,.026],'#669a85');
    b.box('painted upper architrave',[0,1.50,sign*.33],[1.20,.054,.047],'#91bba1');
  }
  tiledRoof(b,1.66,1.11,1.515,.46);
  for(const sign of [-1,1])for(const x of [-.71,-.41,.41,.71]){
    const c=z=>[x,.30,z];
    const post=c(sign*.62);
    b.cylinder('granite balustrade post',post[0],post[1],post[2],.03,.17,'#d4c7af',.028,8);
    if(Math.abs(x)>.5)b.beam('ceremonial stone railing',[x,.33,post[2]],[x*.58,.33,post[2]],.038,'#ded3bd');
  }
}

