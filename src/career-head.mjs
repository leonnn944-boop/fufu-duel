import * as pc from '../vendor/playcanvas.min.mjs';

const styles = {
  doctor: {width:.96, jaw:.82, eyes:.139, eyeHeight:.072, tilt:.023, skin:'#edbc9e', shade:'#d78778', iris:'#724538', dark:'#301a20', hair:'#51292c', light:'#804038', part:-.04, cap:.64, attitude:.007, type:'bob'},
  founder: {width:1.01, jaw:1.07, eyes:.144, eyeHeight:.050, tilt:.028, skin:'#e9b390', shade:'#cb826d', iris:'#644138', dark:'#201c25', hair:'#342831', light:'#62433b', part:.12, cap:.68, attitude:.021, type:'quiff'},
  engineer: {width:1.02, jaw:1.13, eyes:.139, eyeHeight:.049, tilt:.031, skin:'#d6a384', shade:'#ad6d5d', iris:'#3b514e', dark:'#171925', hair:'#2a2b38', light:'#4f516a', part:.10, cap:.63, attitude:-.013, type:'spikes'},
  freelancer: {width:.95, jaw:.88, eyes:.143, eyeHeight:.072, tilt:.015, skin:'#e7b9ad', shade:'#ba7780', iris:'#63435f', dark:'#251826', hair:'#45304c', light:'#794b88', part:.12, cap:.59, attitude:-.011, type:'shag'},
  sales: {width:.96, jaw:.91, eyes:.147, eyeHeight:.069, tilt:.033, skin:'#dcb28d', shade:'#bc7663', iris:'#674732', dark:'#241c26', hair:'#39282c', light:'#725142', part:.04, cap:.65, attitude:.024, type:'tail'},
  assistant: {width:1, jaw:.96, eyes:.144, eyeHeight:.054, tilt:.015, skin:'#e5b490', shade:'#be7863', iris:'#46606a', dark:'#241f29', hair:'#382e3a', light:'#655062', part:-.05, cap:.69, attitude:.006, type:'curls'},
};

// Ring values are Y, half-width, half-depth and front/back offset.
const headSection = [
  [-.425,.032,.041,.166],[-.409,.134,.143,.116],[-.365,.234,.233,.080],
  [-.290,.330,.308,.038],[-.185,.407,.360,.008],[-.064,.468,.404,-.015],
  [.048,.487,.409,-.030],[.179,.490,.422,-.043],[.289,.469,.405,-.052],
  [.393,.408,.362,-.060],[.480,.300,.292,-.067],[.536,.155,.171,-.075],[.553,.002,.004,-.079],
];
const headCache=new WeakMap();
const pi=Math.PI;
const gaussian=(x,width)=>Math.exp(-((x/width)**2));
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
const mix=(a,b,t)=>a+(b-a)*t;

function interpolate(values,t){
  const segment=limit(Math.floor(t),0,values.length-2);
  const p=values[segment],q=values[segment+1];
  const previous=values[Math.max(0,segment-1)];
  const next=values[Math.min(values.length-1,segment+2)];
  const u=limit(t-segment,0,1);
  return p.map((v,i)=>.5*((2*v)+(-previous[i]+q[i])*u+(2*previous[i]-5*v+4*q[i]-next[i])*u*u+(-previous[i]+3*v-3*q[i]+next[i])*u*u*u));
}

function faceSection(y,style){
  const upper=headSection.findIndex(ring=>ring[0]>=y);
  const segment=upper<0?headSection.length-2:limit(upper-1,0,headSection.length-2);
  const a=headSection[segment],b=headSection[segment+1];
  const [,width,depth,shift]=interpolate(headSection,segment+limit((y-a[0])/(b[0]-a[0]),0,1));
  return [width*style.width*mix(style.jaw,1,limit((y+.38)/.38,0,1)),depth,shift];
}

function frontDepth(x,y,style){
  const [width,depth,shift]=faceSection(y,style);
  const c=Math.sqrt(1-Math.min(1,(x/width)**2));
  const cheeks=.029*gaussian(Math.abs(x)-.285,.120)*gaussian(y+.087,.115);
  const sockets=-.019*gaussian(Math.abs(x)-.213,.106)*gaussian(y-.076,.082);
  const nose=gaussian(x,.080)*(.062*gaussian(y-.036,.117)+.091*gaussian(y+.105,.058));
  const nostrils=.030*gaussian(Math.abs(x)-.056,.034)*gaussian(y+.136,.031);
  const lips=.027*gaussian(x,.124)*gaussian(y+.243,.065);
  return shift+depth*c+Math.pow(c,4)*(cheeks+sockets+nose+nostrils+lips);
}

function geometry(scene){
  const buffers=new Map();
  const buffer=tint=>{
    if(!buffers.has(tint))buffers.set(tint,{positions:[],indices:[]});
    return buffers.get(tint);
  };
  return {
    surface(tint,columns,rows,vertex,reverse=false){
      const {positions,indices}=buffer(tint);
      const initial=positions.length/3;
      for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
        positions.push(...vertex(col/columns,row/rows));
        if(col===columns||row===rows)continue;
        const a=initial+row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
        indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
      }
    },
    strand(tint,points,depth=.7){
      const surface=this.surface.bind(this);
      surface(tint,10,Math.max(16,(points.length-1)*5),(u,v)=>{
        const t=v*(points.length-1);
        const [x,y,z,radius]=interpolate(points,t);
        const before=interpolate(points,Math.max(0,t-.018));
        const after=interpolate(points,Math.min(points.length-1,t+.018));
        const tangent=new pc.Vec3(after[0]-before[0],after[1]-before[1],after[2]-before[2]).normalize();
        const reference=Math.abs(tangent.z)>.94?new pc.Vec3(0,1,0):new pc.Vec3(0,0,1);
        const across=new pc.Vec3().cross(tangent,reference).normalize();
        const around=new pc.Vec3().cross(tangent,across).normalize();
        const angle=u*2*pi,r=Math.max(.0003,radius);
        const offset=across.mulScalar(r*Math.cos(angle)).add(around.mulScalar(r*depth*Math.sin(angle)));
        return [x+offset.x,y+offset.y,z+offset.z];
      });
    },
    meshes(){
      return [...buffers].map(([tint,{positions,indices}])=>{
        const mesh=new pc.Mesh(scene.app.graphicsDevice);
        mesh.setPositions(positions);
        mesh.setIndices(indices);
        mesh.setNormals(pc.calculateNormals(positions,indices));
        mesh.update(pc.PRIMITIVE_TRIANGLES);
        const material=scene.material(tint).clone();
        material.metalness=0;
        material.gloss=.31;
        material.cull=pc.CULLFACE_NONE;
        material.update();
        return {mesh,material};
      });
    }
  };
}

function buildFace(shape,style){
  shape.surface(style.skin,72,62,(u,v)=>{
    const y=mix(-.425,.553,v),angle=(u-.5)*pi*2;
    const [width,depth,shift]=faceSection(y,style);
    const x=width*Math.sin(angle),c=Math.cos(angle);
    return [x,y,c>0?frontDepth(x,y,style):shift+depth*c];
  });
  const projection=(x,y,lift)=>[x,y,frontDepth(x,y,style)+lift];
  for(const side of [-1,1]){
    const inner=.085,outer=inner+style.eyes*2;
    const eye=(t,v,lift=0)=>{
      const x=side*mix(inner,outer,t),sin=Math.sin(pi*t);
      const axis=.062+style.tilt*(t-.35);
      const y=axis+mix(-style.eyeHeight*.62,style.eyeHeight,v)*sin;
      return projection(x,y,.009+sin*Math.sin(pi*v)*.019+lift);
    };
    shape.surface('#e9d4cc',30,9,eye,side<0);
    const irisX=side*.218,irisY=.063+style.tilt*.18;
    const stamp=(tint,x,y,rx,ry,lift)=>{
      shape.surface(tint,28,4,(u,v)=>{
        const angle=u*2*pi, px=x+rx*Math.cos(angle)*v, py=y+ry*Math.sin(angle)*v;
        const t=limit((Math.abs(px)-inner)/(outer-inner),.01,.99),sin=Math.sin(pi*t);
        const axis=.062+style.tilt*(t-.35);
        const bounded=limit(py,axis-style.eyeHeight*.60*sin,axis+style.eyeHeight*.97*sin);
        const vEye=limit(((bounded-axis)/sin+style.eyeHeight*.62)/(style.eyeHeight*1.62),0,1);
        return projection(px,bounded,.009+sin*Math.sin(pi*vEye)*.019+lift);
      },true);
    };
    stamp(style.dark,irisX,irisY,.063,style.eyeHeight*.94,.004);
    stamp(style.iris,irisX,irisY-.003,.052,style.eyeHeight*.81,.005);
    stamp('#222028',irisX,irisY,.028,style.eyeHeight*.64,.006);
    stamp('#ffebd5',irisX-.018,irisY+.021,.016,.012,.009);
    stamp('#ffd6ba',irisX+.018,irisY-.019,.007,.006,.009);
    const lash=Array.from({length:13},(_,index)=>{
      const t=index/12,s=Math.sin(t*pi),[x,y,z]=eye(t,1,.009);
      return [x,y,z,.003+.014*s+.008*t];
    });
    const end=lash.at(-1);
    lash.push([end[0]+side*.035,end[1]+.033,end[2]-.007,.001]);
    shape.strand(style.dark,lash,.62);
    shape.strand(style.shade,Array.from({length:11},(_,index)=>{
      const t=index/10,[x,y,z]=eye(t,0,.004);
      return [x,y-.004,z,.002+Math.sin(pi*t)*.004];
    }),.58);
    const browBase=style.type==='curls'?.199:.217;
    const browWidth=(style.type==='bob'||style.type==='tail')?.021:.028;
    shape.strand(style.hair,[
      [...projection(side*.079,browBase-.034,.013),.005],
      [...projection(side*.157,browBase-.016,.015),browWidth],
      [...projection(side*.255,browBase+.004+style.tilt*.3,.016),browWidth*.83],
      [...projection(side*.323,browBase-.001,.012),browWidth*.42],
      [...projection(side*.372,browBase-.028,.010),.001],
    ],.32);
    shape.strand(style.shade,[
      [...projection(side*.036,-.135,.001),.001],
      [...projection(side*.051,-.150,.003),.0036],
      [...projection(side*.076,-.144,.004),.001],
    ],.6);
    shape.surface(style.skin,24,13,(u,v)=>{
      const longitude=u*2*pi,latitude=(v-.5)*pi,r=Math.cos(latitude);
      return [side*(.456+.077*r*Math.sin(longitude)),-.025+.157*Math.sin(latitude),-.084+.096*r*Math.cos(longitude)];
    },side<0);
    shape.strand(style.shade,[[side*.476,.061,-.003,.008],[side*.514,.047,-.001,.011],[side*.518,-.024,-.005,.012],[side*.494,-.076,-.001,.006]],.7);
  }
  const lip=(u,offset,lift)=>{
    const x=(u-.5)*.242,s=Math.sin(pi*u);
    const y=-.233+style.attitude*(u-.48)+.013*Math.cos(u*pi*2)+offset*s;
    return projection(x,y,lift);
  };
  shape.surface(style.shade,28,8,(u,v)=>lip(u,mix(-.023,.018+.010*Math.sin(pi*2*u)**2,v),.010+.011*Math.sin(pi*v)*Math.sin(pi*u)));
  shape.strand('#7a4650',Array.from({length:13},(_,i)=>[...lip(i/12,0,.024),.001+.006*Math.sin(pi*i/12)]),.65);
  shape.strand('#e5a392',Array.from({length:9},(_,i)=>[...lip(.3+i*.05,-.015,.023),.001+.005*Math.sin(pi*i/8)]),.5);
}

function addSweptLock(shape,style,points,width,highlight=true){
  shape.strand(style.hair,points.map(([x,y,z,radius])=>[x,y,z,radius*width]),.68);
  if(!highlight)return;
  const tints=[style.light,style.light];
  const distances=[-.30,.20];
  for(let j=0;j<distances.length;j++){
    shape.strand(tints[j],points.map(([x,y,z,radius],index)=>{
      const r=radius*width, amount=distances[j];
      const end=index===0||index===points.length-1;
      return [x+r*amount,y,z+r*(.67-.22*Math.abs(amount)),end?.0003:Math.min(.006,r*(j===1?.066:.043))];
    }),.54);
  }
}

function buildHair(shape,style){
  const isLong=style.type==='bob'||style.type==='shag';
  const sweep=isLong?[[-.64,.12,.07,.8],[-.56,-.19,.14,.95],[-.46,-.43,.22,1]]:[[-.58,.21,.10,.80],[-.55,.09,.12,.63],[-.46,.01,.28,.6]];
  // Connected crown covers temples and the back, with an uneven hairline around the part.
  const scalp=(u,v,layer=0)=>{
    const angle=(u-.5)*pi*2,cosine=Math.cos(angle);
    const front=limit((cosine+.09)/1.09,0,1);
    const temple=gaussian(cosine,.45);
    const lower=mix(isLong?2.50:1.98,isLong?2.20:1.56,temple);
    const edge=1.18+style.part*.33*Math.sin(angle*1.32)+.032*Math.cos(angle*5);
    const end=mix(lower,edge,front**1.45);
    const polar=Math.max(.002,v*end);
    const wave=Math.sin(angle*5+polar*2)*.011+Math.sin(angle*8-polar)*.005;
    const expand=style.type==='curls'?1.04:1;
    return [
      (.557+wave+layer)*Math.sin(polar)*Math.sin(angle)*expand,
      .065+(style.cap-.065+layer)*Math.cos(polar),
      -.081+(.49+layer+wave)*Math.sin(polar)*Math.cos(angle),
    ];
  };
  shape.surface(style.hair,76,32,(u,v)=>scalp(u,v),true);
  for(let lock=0;lock<27;lock++){
    const location=lock/27, drift=.026*Math.sin(location*6.28);
    const tones=lock%7===0?style.light:style.hair;
    const points=Array.from({length:9},(_,i)=>{
      const t=i/8;
      return [...scalp(location+.04+drift*(1-t),.27+.69*t,.001+.005*Math.sin(pi*t)),.0008+.006*Math.sin(pi*t)];
    });
    shape.strand(tones,points,.63);
  }
  if(style.type==='bob'||style.type==='tail'||style.type==='shag'){
    for(let strand=0;strand<6;strand++){
      const index=strand/5;
      const points=[
        [style.part+.11+index*.13,.489+index*.040,.218,.027],
        [style.part-.078+index*.13,.501+index*.028,.382,.073],
        [-.274+index*.16,.409+index*.050,.449-(index-.26)**2*.065,.091],
        [-.491+index*.10,.292+index*.052,.398,.082],
        [-.557+index*.077,.145+index*.081,.331,.047],
        [-.525+index*.050,.072+index*.074,.279,.003],
      ];
      addSweptLock(shape,style,points,1);
    }
    for(let strand=0;strand<4;strand++){
      const index=strand/3;
      addSweptLock(shape,style,[
        [style.part+.12,.472+index*.10,.28,.020],[.276+index*.05,.436+index*.04,.381,.069],
        [.423+index*.028,.323+index*.013,.37,.075],[.516+index*.044,.132+index*.033,.235,.063],
        [.502+index*.055,-.005-index*.038,.098,.002],
      ],1);
    }
    for(const side of [-1,1])for(let strand=0;strand<4;strand++){
      const depth=strand*.106,hang=isLong?(side<0?.037:-.032)+depth*.04:.05;
      addSweptLock(shape,style,[
        [side*.37,.383,-.139-depth,.079],
        [side*(.49+depth*.1),.207,-.087-depth,.103],
        [side*(.541+depth*.06),.015,-.051-depth,.106],
        ...sweep.slice(1).map(([x,y,z,radius],i)=>[side*-x,y+hang+(i>0?.027*strand:0),z-depth,.095*radius*(i===0?1:.03)]),
      ],1);
    }
  }
  if(style.type==='quiff'||style.type==='spikes'){
    const spike=style.type==='spikes';
    for(let i=0;i<10;i++){
      const f=i/9,from=mix(-.48,.47,f),y=.35+Math.sin(pi*f)*.124;
      const tipX=spike?from-.10*(i%3-1):from+.20;
      addSweptLock(shape,style,[
        [from,y-.035,.267,.045],[from+.032,y+.086,.375,.070],
        [from+.052,y+.157+(i%3)*.021,.332,.073],
        [tipX,y+.174+(i%3)*.031,.163,.034],
        [tipX+(spike?.061:.071),y+.133+(i%3)*.030,.018,.002],
      ],1);
    }
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const x=side*(.27+i*.078);
      addSweptLock(shape,style,[[x,.264+i*.013,.389,.038],[side*.494,.185+i*.042,.265,.059],[side*(.52+i*.019),.087+i*.079,.136,.003]],1);
    }
  }
  if(style.type==='curls'){
    for(let i=0;i<15;i++){
      const x=(i%8-3.5)*.132,y=i<8?.349+Math.sin(i*pi/7)*.102:.465+Math.sin((i-8)*pi/6)*.086,z=i<8?.352:.212;
      const points=Array.from({length:15},(_,step)=>{
        const t=step/14,angle=t*2*pi+Math.cos(i*.8),r=.066*(1-.36*t);
        return [x+r*Math.cos(angle),y-r*Math.sin(angle)-t*.063,z+.095*Math.sin(pi*t)+t*.043,.003+.057*Math.sin(pi*t)**.71];
      });
      addSweptLock(shape,style,points,1);
    }
  }
  if(style.type==='tail'){
    for(let i=0;i<8;i++){
      const f=i/7;
      addSweptLock(shape,style,[[.024+.22*f,.507,-.49,.024],[.127+.22*f,.619,-.63,.066],[.329+.17*f,.565,-.734,.084],[.414+.20*f,.276,-.767,.072],[.487+.17*f,-.073,-.742,.055],[.554+.17*f,-.475,-.613,.046],[.610+.11*f,-.685,-.534,.002]],1);
    }
    shape.strand('#d0a660',[[-.013,.494,-.53,.032],[.123,.572,-.638,.033],[.267,.562,-.697,.030],[.438,.459,-.734,.020]]);
  }
}

function addAccessories(shape,style){
  if(style.type==='bob'){
    for(const side of [-1,1]){
      const points=Array.from({length:42},(_,i)=>{
        const angle=i*2*pi/41,x=side*.220+Math.cos(angle)*.177,y=.057+Math.sin(angle)*.133;
        return [x,y,Math.max(.463,frontDepth(x,y,style)+.049),.010];
      });
      shape.strand('#a57855',points);
      shape.strand('#b68962',[[side*.389,.084,.465,.011],[side*.469,.082,.348,.010],[side*.523,.056,-.033,.009]]);
    }
    shape.strand('#aa805c',[[-.047,.100,.480,.010],[0,.118,.494,.011],[.047,.100,.480,.010]]);
  }
  if(style.type==='spikes'){
    for(const side of [-1,1]){
      shape.surface('#bd7b4e',24,6,(u,v)=>{
        const angle=u*2*pi,r=v, x=side*.228+Math.cos(angle)*.171*r;
        return [x,.344+Math.sin(angle)*.089*r,.503+(.028*(1-r))-(Math.abs(x)-.16)**2*.55];
      },true);
      const line=Array.from({length:29},(_,i)=>{const a=i*2*pi/28,x=side*.228+.172*Math.cos(a);return[x,.344+.090*Math.sin(a),.511-(Math.abs(x)-.16)**2*.55,.021];});
      shape.strand('#71553e',line);
      shape.strand('#eab474',[[side*.127,.371,.537,.005],[side*.186,.381,.542,.011],[side*.252,.384,.540,.006]]);
      shape.strand('#4d423e',[[side*.382,.336,.469,.028],[side*.481,.325,.299,.030],[side*.534,.314,.091,.026],[side*.512,.282,-.208,.018]]);
    }
    shape.strand('#9c754e',[[-.066,.329,.499,.025],[0,.313,.526,.024],[.066,.329,.499,.025]]);
  }
  if(style.type==='shag'){
    const cap=(u,v)=>{
      const angle=u*2*pi,polar=Math.max(.001,v*1.50);
      return [.60*Math.sin(angle)*Math.sin(polar)-.031,.449+.204*Math.cos(polar)+.08*Math.sin(angle)*Math.sin(polar),-.123+.485*Math.cos(angle)*Math.sin(polar)];
    };
    shape.surface('#4e385e',46,14,cap,true);
    const hem=Array.from({length:53},(_,i)=>[...cap(i/52,1),.046]);
    shape.strand('#6e5178',hem,.66);
    for(let i=0;i<25;i++)shape.strand(i%5===0?'#8a628b':'#61466f',Array.from({length:9},(_,j)=>{
      const t=.30+.685*j/8,[x,y,z]=cap(i/25,t);
      return [x*1.01,y+.012,z*1.01,.003+.009*Math.sin((j/9)*pi)];
    }));
  }
  if(style.type==='tail'){
    for(const side of [-1,1]){
      shape.strand('#e0b56f',[[side*.492,-.071,-.025,.024],[side*.511,-.143,.014,.028],[side*.510,-.227,.019,.023]],.91);
      shape.strand('#68a188',[[side*.511,-.205,.043,.010],[side*.51,-.239,.046,.025],[side*.503,-.278,.043,.001]],.86);
    }
  }
}

export function makeCareerHead(scene,role,body){
  const cacheKey=scene.app.graphicsDevice;
  if(!headCache.has(cacheKey))headCache.set(cacheKey,new Map());
  const cache=headCache.get(cacheKey);
  const style=styles[role]||styles.assistant;
  // A preview can be the last render instance. PlayCanvas frees its buffers on removal.
  if(!cache.get(role)?.every(({mesh})=>mesh.vertexBuffer)){
    const shape=geometry(scene);
    buildFace(shape,style);
    buildHair(shape,style);
    addAccessories(shape,style);
    cache.set(role,shape.meshes());
  }
  const head=new pc.Entity(role+' sculpted head');
  head.addComponent('render',{meshInstances:cache.get(role).map(({mesh,material})=>new pc.MeshInstance(mesh,material))});
  body.addChild(head);
  head.setLocalPosition(0,2.02,0);
  return head;
}
