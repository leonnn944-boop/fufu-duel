import * as pc from '../vendor/playcanvas.min.mjs';
import { makeCareerHead } from './career-head.mjs';
const proportions = {
  "doctor": {
    "leg": 1.13,
    "shoulder": 0.82,
    "head": [
      0.49,
      0.55,
      0.54
    ],
    "iris": "#633d3d",
    "reach": [
      -5,
      -21
    ],
    "bend": [
      -10,
      -44
    ],
    "open": [
      -4,
      7
    ],
    "yaw": [
      10,
      -14
    ],
    "stance": [
      0.159,
      0.04
    ],
    "gaze": [
      2,
      -7,
      -2
    ]
  },
  "founder": {
    "leg": 1.16,
    "shoulder": 0.95,
    "head": [
      0.51,
      0.55,
      0.55
    ],
    "iris": "#624235",
    "reach": [
      9,
      -14
    ],
    "bend": [
      -7,
      -32
    ],
    "open": [
      -8,
      10
    ],
    "yaw": [
      -4,
      -18
    ],
    "stance": [
      0.215,
      0.105
    ],
    "gaze": [
      -4,
      12,
      2
    ]
  },
  "freelancer": {
    "leg": 1.14,
    "shoulder": 0.78,
    "head": [
      0.5,
      0.55,
      0.53
    ],
    "iris": "#533a74",
    "reach": [
      -11,
      -19
    ],
    "bend": [
      -33,
      -54
    ],
    "open": [
      -10,
      8
    ],
    "yaw": [
      8,
      -24
    ],
    "stance": [
      0.162,
      -0.068
    ],
    "gaze": [
      6,
      -12,
      -5
    ]
  },
  "engineer": {
    "leg": 1.01,
    "shoulder": 0.97,
    "head": [
      0.54,
      0.55,
      0.53
    ],
    "iris": "#3b5555",
    "reach": [
      -9,
      6
    ],
    "bend": [
      -23,
      -11
    ],
    "open": [
      -13,
      9
    ],
    "yaw": [
      8,
      -6
    ],
    "stance": [
      0.222,
      0.054
    ],
    "gaze": [
      1,
      6,
      0
    ]
  },
  "sales": {
    "leg": 1.1,
    "shoulder": 0.88,
    "head": [
      0.51,
      0.55,
      0.54
    ],
    "iris": "#4f4535",
    "reach": [
      -12,
      -25
    ],
    "bend": [
      -36,
      -34
    ],
    "open": [
      -4,
      17
    ],
    "yaw": [
      12,
      -13
    ],
    "stance": [
      0.193,
      -0.092
    ],
    "gaze": [
      -2,
      -8,
      3
    ]
  },
  "assistant": {
    "leg": 1.05,
    "shoulder": 0.79,
    "head": [
      0.48,
      0.54,
      0.53
    ],
    "iris": "#3c6271",
    "reach": [
      -6,
      -17
    ],
    "bend": [
      -20,
      -39
    ],
    "open": [
      -3,
      4
    ],
    "yaw": [
      3,
      -11
    ],
    "stance": [
      0.15,
      0.063
    ],
    "gaze": [
      3,
      9,
      -3
    ]
  }
};
// Elliptical cross-sections shape the chin, shoulders and seams without cube joints.
function loft(scene, group, name, color, position, rings) {
  const positions = [], indices = [], sides = 28;
  for (const [y, width, depth, center] of rings) {
    for (let side = 0; side < sides; side++) {
      const angle = side * 2 * Math.PI / sides;
      positions.push(Math.sin(angle) * width, y, center + Math.cos(angle) * depth);
    }
  }
  for (let ring = 1; ring < rings.length; ring++) {
    for (let side = 0; side < sides; side++) {
      const base = (ring - 1) * sides;
      const a = base + side, b = base + (side + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const mesh = new pc.Mesh(scene.app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(pc.calculateNormals(positions, indices));
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const entity = new pc.Entity(name);
  entity.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, scene.material(color))] });
  group.addChild(entity);
  entity.setLocalPosition(...position);
}
// Capsule primitives have a native height of 2; sizes below are full dimensions.
// Hardware and folded fabric share a small bevel.
const bevelMeshes=new WeakMap();
// Cross sections run from the heel counter to the toe, sharing a continuous outsole.
function shoeLast(scene,parent,name,color,sections) {
  const vertex=[],indices=[],sides=24;
  sections.forEach(([z,width,floor,top],ring)=>{
    for(let side=0;side<sides;side++){
      const angle=side*Math.PI*2/sides, sine=Math.sin(angle),cosine=Math.cos(angle);
      // A broad contact patch under the heel and ball, smoothly curved upper.
      const h=sine<0 ? .24*(1-Math.pow(-sine,.45)) : .24+.76*sine;
      vertex.push(width*Math.sign(cosine)*Math.pow(Math.abs(cosine),.82),floor+(top-floor)*h,z);
      if(ring>0){const a=(ring-1)*sides+side,b=(ring-1)*sides+(side+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
    }
  });
  const mesh=new pc.Mesh(scene.app.graphicsDevice);
  mesh.setPositions(vertex);mesh.setNormals(pc.calculateNormals(vertex,indices));mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
  const entity=new pc.Entity(name);entity.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,scene.material(color))]});
  parent.addChild(entity);
}

function bevelMesh(device){
  const cached = bevelMeshes.get(device);
  if (cached?.vertexBuffer) return cached;
  const positions=[],normals=[],indices=[],steps=3;
  for(const [n,u,v] of [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]]){
    const start=positions.length/3;for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){const q=n.map((a,i)=>a*.5+u[i]*(x/steps-.5)+v[i]*(y/steps-.5)),core=q.map(a=>Math.max(-.4,Math.min(.4,a))),normal=new pc.Vec3(q[0]-core[0],q[1]-core[1],q[2]-core[2]).normalize();positions.push(core[0]+normal.x*.1,core[1]+normal.y*.1,core[2]+normal.z*.1);normals.push(normal.x,normal.y,normal.z);if(x<steps&&y<steps){const a=start+y*(steps+1)+x;indices.push(a,a+1,a+steps+2,a,a+steps+2,a+steps+1);}}
  }
  const mesh=new pc.Mesh(device);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);bevelMeshes.set(device,mesh);return mesh;
}
export function makeCareerFigure(scene,career,parent,scale=.85){
    const palette={
      founder:['#3d3236','#34303a','#e9b390','#342831','#e7c9a8','#e9b64e'],
      freelancer:['#76599e','#494773','#e9bea2','#5c3f69','#f1dfca','#e8c67d'],
      engineer:['#355e61','#31515e','#d6a384','#2a2b38','#b4c5bb','#d2a662'],
      doctor:['#e7f1e9','#4c6d9b','#f0c4a5','#503b36','#d7e8ed','#e96874'],
      sales:['#28524d','#213d42','#d1a17d','#332539','#f6eee0','#53aa90'],
      assistant:['#4a405e','#333848','#e5b490','#382e3a','#eee1ce','#87a9ce']
    };
    const [coat,pants,skin,,shirt,accent]=palette[career]||palette.assistant;
    const profile = proportions[career] || proportions.assistant;
    const body=new pc.Entity(`3D ${career} figure`);parent.addChild(body);body.setLocalPosition(0,.195,0);
    const torsoLength = 1.29;
    const pelvisLift = profile.leg - .6975 * (torsoLength - 1);
    const fittedScale = scale * 2.77 / (pelvisLift + 1.70 * torsoLength + .72);
    body.setLocalScale(fittedScale, fittedScale, fittedScale);
    const part=(name,type,pos,size,color,group=body)=>{
      if(career==='doctor'&&/jacket lapel/.test(name))color='#d3e2df';
      if(career==='doctor'&&/long coat back panel/.test(name))color='#e1ece6';
      if(career==='doctor'&&/coat panel/.test(name)&&!name.includes('back'))color='#f1f6ed';
      if(name==='tailored back seam')color=({founder:'#60738c',freelancer:'#9a84ac',engineer:'#69aa9e',doctor:'#b8cdca',sales:'#b79974',assistant:'#b0c3d8'})[career];
      if(career==='sales'&&/jacket lapel/.test(name))color='#396b5e';
      if(career==='assistant'&&/jacket lapel/.test(name))color='#6f91ba';
      if(type==='box'&&/hips|sole|shoe|tablet|clipboard|case|satchel|coat back panel|coat panel|jacket front|pocket flap|heel/.test(name)){
        const e=new pc.Entity(career+' '+name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(bevelMesh(scene.app.graphicsDevice),scene.material(color))]});group.addChild(e);e.setLocalPosition(...pos);e.setLocalScale(...size);return e;
      }
      return scene.primitive(career+' '+name,type,pos,type==='capsule'?[size[0],size[1]/2,size[2]]:size,color,null,group);
    };
    const curve=(name,points,radius,color,group=body)=>{
      const positions=[],normals=[],indices=[],sides=6;
      points.forEach((point,i)=>{const prior=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],tangent=new pc.Vec3(next[0]-prior[0],next[1]-prior[1],next[2]-prior[2]).normalize(),a=new pc.Vec3().cross(tangent,new pc.Vec3(0,0,1)).normalize(),b=new pc.Vec3().cross(tangent,a).normalize();for(let j=0;j<sides;j++){const angle=j/sides*Math.PI*2,n=a.clone().mulScalar(Math.cos(angle)).add(b.clone().mulScalar(Math.sin(angle)));positions.push(point[0]+n.x*radius,point[1]+n.y*radius,point[2]+n.z*radius);normals.push(n.x,n.y,n.z);if(i<points.length-1){const k=i*sides+j,l=i*sides+(j+1)%sides;indices.push(k,l,k+sides,l,l+sides,k+sides);}}});
      const mesh=new pc.Mesh(scene.app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);const e=new pc.Entity(career+' '+name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,scene.material(color))]});group.addChild(e);return e;
    };
    loft(scene, body, 'shaped hips', pants, [0, .69, 0], [
      [-.18,.02,.02,0],[-.15,.29,.19,0],[-.08,.38,.26,0],[.04,.39,.28,0],[.16,.34,.25,0],[.19,.02,.02,0]
    ]);
    loft(scene, body, 'tailored jacket', coat, [0, 1.12, 0], [
      [-.43,.02,.02,0],[-.40,.38,.26,0],[-.25,.35,.29,0],[-.10,.33,.29,0],
      [.08,.37,.31,0],[.24,.45,.33,0],[.32,.46,.29,0],[.37,.37,.23,0],[.43,.18,.16,0],[.44,.02,.02,0]
    ]);
    part('shirt','box',[0,1.18,.28],[.32,.43,.05],shirt);
    loft(scene,body,'neck',skin,[0,1.55,-.012],[[-.100,.128,.114,.014],[-.05,.111,.095,.016],[.010,.105,.09,.027],[.063,.114,.094,.040],[.092,.092,.075,.046]]);
    for(const side of [-1,1]){const collar=part('shirt collar '+side,'box',[side*.095,1.43,.32],[.13,.13,.05],shirt);collar.setLocalEulerAngles(0,0,side*28);}
    makeCareerHead(scene,career,body);
    for(const side of [-1,1]){
      const jacket=part('jacket front layered panel '+side,'box',[side*.255,1.05,.292],[.245,.53,.12],coat);jacket.setLocalEulerAngles(0,0,-side*4);
      part('pocket flap '+side,'box',[side*.255,1.035,.36],[.19,.065,.04],career==='engineer'?'#297578':coat);
    }
    for(const side of [-1,1]){const lapel=part(`jacket lapel ${side}`,'box',[side*.19,1.33,.32],[.16,.29,.065],career==='doctor'?'#ffffff':coat);lapel.setLocalEulerAngles(0,0,side*22);part(`pocket welt ${side}`,'box',[side*.25,.97,.32],[.2,.034,.033],accent);}
    for(const y of [.93,1.07])part(`jacket button ${y}`,'sphere',[.04,y,.35],[.045,.045,.025],'#d8b777');
    part('coat back panel','box',[0,1.12,-.31],[.64,.63,.035],coat);
    part('tailored back seam','box',[0,1.12,-.335],[.014,.58,.012],shirt);
    part('back collar','capsule',[0,1.49,-.24],[.4,.1,.16],shirt);
    if(career!=='doctor')part('waist belt','box',[0,.74,-.31],[.72,.07,.055],pants);
    for(const side of [-1,1])part('back shoulder yoke '+side,'capsule',[side*.18,1.39,-.335],[.32,.06,.035],career==='engineer'?'#69aa9e':coat);
    const limbs={};
    for(const side of [-1,1]){
      const armName=side<0?'arm-left':'arm-right',arm=new pc.Entity(armName);body.addChild(arm);arm.setLocalPosition(side*.396,1.405,0);
      // The cap overlaps the jacket shoulder at rest and rotates around its centre.
      loft(scene,arm,armName+' upper sleeve',coat,[0,0,0],[
        [-.34,.082,.098,.014],[-.30,.105,.120,.008],[-.19,.126,.137,-.006],
        [-.055,.147,.151,-.015],[.040,.139,.139,-.012],[.092,.098,.105,-.008],[.12,.012,.014,0]
      ]);
      loft(scene,arm,armName+' lower sleeve',coat,[0,0,0],[
        [-.54,.103,.110,.010],[-.48,.104,.115,.010],[-.38,.112,.119,.013],
        [-.294,.116,.121,.009],[-.25,.102,.109,.009],[-.225,.064,.070,.009]
      ]);part(`${armName} cuff`,'box',[0,-.52,0],[.25,.075,.28],shirt,arm);part(`${armName} cuff button`,'sphere',[0,-.5,.16],[.035,.035,.02],'#d8b777',arm);part(`${armName} palm`,'sphere',[0,-.65,.035],[.23,.24,.21],skin,arm);part(`${armName} thumb`,'sphere',[-side*.11,-.64,.13],[.105,.15,.11],skin,arm);for(let finger=0;finger<3;finger++)part(`${armName} finger ${finger}`,'capsule',[-.065+finger*.065,-.73,.10],[.062,.13,.075],skin,arm);limbs[armName]={entity:arm,base:arm.getLocalEulerAngles().clone()};
      const legName=side<0?'leg-left':'leg-right',leg=new pc.Entity(legName);
      body.addChild(leg);
      leg.setLocalPosition(side*profile.stance[0],.6975+profile.leg,side*profile.stance[1]);
      leg.setLocalEulerAngles(0,side*(career==='engineer'?13:7),0);
      loft(scene,leg,`${legName} tapered trouser`,pants,[0,0,0],[
        [-.57-profile.leg,.115,.13,.018],[-.48-profile.leg,.125,.134,.019],
        [-.29-profile.leg*.55,.138,.155,.015],[-.15,.158,.169,-.007],[-.01,.18,.176,-.017],[.11,.12,.15,-.01],[.12,.01,.01,0]
      ]);
      const shoeColor=career==='engineer'?'#ac793e':career==='doctor'?'#e2eee7':career==='freelancer'?'#574576':'#263142',soleColor=career==='doctor'?'#93b1ad':'#48505a';
      const shoe=new pc.Entity(legName+' footwear');leg.addChild(shoe);
      shoe.setLocalPosition(0,-.6975-profile.leg,0);
      const boot=career==='engineer',sport=career==='freelancer'||career==='doctor';
      const width=boot?1.07:sport?1:.95;
      const last=[
        [-.146,.005,.027,.077],[-.127,.076,.008,.133],[-.086,.106,.001,.168],
        [-.012,.119,.004,boot?.25:.202],[.064,.124,.016,boot?.224:.171],
        [.147,.136,.005,.129],[.218,.139,0,.106],[.292,.117,.005,.083],
        [.348,.070,.015,.065],[.372,.008,.035,.046]
      ].map(([z,w,low,high])=>[z,w*width,low,high]);
      shoeLast(scene,shoe,legName+' sole',soleColor,last.map(([z,w,y,h])=>[z,w,y,Math.min(y+.034,h)]));
      shoeLast(scene,shoe,legName+' shaped vamp',shoeColor,last.map(([z,w,y,h])=>[z,w*.97,Math.min(y+.018,h-.002),h]));
      if(boot)part(legName+' boot ankle','capsule',[0,.224,-.012],[.225,.26,.25],shoeColor,shoe);
      if(sport||boot){
        for(const [z,y]of [[.084,.163],[.12,.146]])part(legName+' lace '+z,'sphere',[0,y,z],[.152,.020,.022],shirt,shoe);
      }else{
        part(legName+' saddle','sphere',[0,.15,.110],[.188,.029,.058],shoeColor,shoe);
      }
      limbs[legName]={entity:leg,base:leg.getLocalEulerAngles().clone()};
    }
    if(career==='engineer'){part('tool belt','box',[0,.87,.3],[.8,.12,.12],'#273b45');for(const side of [-1,1]){part('work jacket reflective strip '+side,'box',[side*.25,1.22,.375],[.075,.35,.035],'#f0efcc');part('tool pouch '+side,'box',[side*.32,.81,.29],[.18,.22,.16],'#c79b4e');}part('spanner handle','box',[-.34,.91,.39],[.065,.24,.045],'#d2dfe0');part('spanner jaw','sphere',[-.34,1.05,.39],[.14,.12,.055],'#d2dfe0');}
    if(career==='doctor'){
      for(const x of [-.255,.255])part('coat panel '+x,'box',[x,.81,.24],[.30,1.0,.17],'#f9fff4');
      for(const x of [-.2,.2])part('long coat back panel '+x,'box',[x,.72,-.30],[.40,.87,.13],'#f9fff4');
      part('coat rear vent','box',[0,.43,-.375],[.025,.26,.02],'#c6dcd7');part('coat back waist tab','box',[0,.95,-.38],[.42,.09,.045],'#e3ece7');curve('stethoscope continuous rubber tube',Array.from({length:17},(_,i)=>{const a=i*Math.PI/16;return[Math.cos(a)*.2,1.34-Math.sin(a)*.24,.405];}),.036,'#273f50');for(const side of [-1,1]){const stem=part('stethoscope metal stem '+side,'capsule',[side*.18,1.42,.405],[.025,.18,.025],'#9db6c0');stem.setLocalEulerAngles(0,0,side*14);part('stethoscope earpiece '+side,'sphere',[side*.158,1.51,.405],[.055,.045,.04],'#344858');}part('stethoscope chestpiece','sphere',[.24,1.04,.38],[.17,.17,.055],'#c0d5da');part('medical pocket','box',[.27,1.03,.36],[.19,.18,.025],'#ffffff');part('doctor badge','box',[-.26,1.23,.35],[.18,.23,.035],'#8bb1c3');part('badge face','box',[-.26,1.26,.375],[.12,.13,.015],'#f5f6e6');for(const x of [.23,.29])part('pocket pen '+x,'cylinder',[x,1.17,.35],[.024,.15,.024],accent);}
    if(career==='doctor'){
      const arm=limbs['arm-right'].entity;
      part('medical work clipboard','box',[.025,-.44,.23],[.35,.53,.075],'#334e70',arm);
      part('medical work clipboard paper edge','box',[.025,-.43,.274],[.29,.46,.016],'#f7efda',arm);
      part('medical work clipboard cover','box',[.025,-.455,.29],[.31,.42,.018],'#415e83',arm);
      part('medical work clipboard clip','box',[.025,-.18,.30],[.13,.055,.035],'#c4a46c',arm);
      part('medical work clipboard hinge','box',[-.135,-.44,.28],[.025,.48,.028],'#253f60',arm);
    }
    if(career==='founder'){
      const tie=part('woven necktie','capsule',[0,1.29,.351],[.105,.32,.054],'#5b4042');tie.setLocalEulerAngles(0,0,-3);
      part('necktie knot','sphere',[0,1.443,.367],[.104,.12,.052],'#795850');
      for(const side of [-1,1])for(const y of [.92,1.07,1.20])part('brass double breast button '+side+' '+y,'sphere',[side*.128,y,.38],[.046,.046,.022],'#b59663');
      part('folded pocket square','box',[-.239,1.20,.391],[.155,.041,.022],'#c58c50');
      for(const side of [-1,1]){part('long coat front tail '+side,'capsule',[side*.3,.68,.21],[.27,.61,.22],coat);part('wide long coat lapel '+side,'box',[side*.25,1.33,.37],[.2,.39,.07],'#504144');}
      part('long split coat back','box',[0,.65,-.33],[.76,.48,.09],coat);part('coat split seam','box',[0,.52,-.39],[.035,.25,.025],shirt);
      const arm=limbs['arm-right'].entity;part('business tablet frame','box',[.09,-.55,.22],[.44,.65,.08],'#d4bc88',arm);part('business tablet screen','box',[.09,-.55,.268],[.36,.56,.018],'#24565f',arm);
      for(let i=0;i<3;i++)part('business dashboard bar '+i,'box',[-.04+i*.12,-.7+i*.06,.285],[.075,.14+i*.12,.018],accent,arm);
    }
    if(career==='sales'){
      for(const side of [-1,1]){
        const scarf=part('jade scarf fold '+side,'capsule',[side*.065,1.44,.37],[.17,.28,.085],'#4eba97');
        scarf.setLocalEulerAngles(0,0,side*28);
      }
      part('braided scarf keeper','sphere',[.04,1.35,.425],[.15,.14,.085],'#289277');
      part('teal waistcoat','box',[0,1.12,.335],[.39,.52,.065],accent);for(const y of [.97,1.11,1.25])part('waistcoat button '+y,'sphere',[0,y,.38],[.045,.045,.025],'#e2c18a');
      part('cropped jacket hem','box',[0,.85,-.32],[.76,.09,.06],coat);
      const left=limbs['arm-left'].entity,right=limbs['arm-right'].entity;part('sales phone','box',[0,-.42,.24],[.22,.39,.07],'#283c4a',left);part('sales phone screen','box',[0,-.42,.28],[.17,.3,.015],'#e9f1dc',left);
      part('sample case tray','box',[.12,-.81,.24],[.64,.18,.36],'#a47a43',right);part('sample case open lid','box',[.12,-.57,.12],[.64,.46,.065],'#345e61',right);part('sample case lining','box',[.12,-.7,.25],[.57,.035,.29],'#183d47',right);
      part('sample bottle','cylinder',[-.08,-.57,.29],[.1,.25,.1],'#f3e7d0',right);part('sample bottle cap','cylinder',[-.08,-.42,.29],[.1,.05,.1],'#dcba74',right);
      part('sample jar','cylinder',[.12,-.62,.29],[.15,.13,.15],'#e4d2ae',right);part('sample box','box',[.32,-.56,.29],[.14,.26,.15],'#ece3cf',right);
    }
    if(career==='freelancer'){
      part('satchel','box',[-.49,.87,.18],[.32,.4,.23],'#b49359');part('satchel flap','box',[-.49,.94,.31],[.32,.17,.055],'#ead08d');part('satchel clasp','box',[-.49,.88,.34],[.07,.095,.025],'#76604a');
      const strap=part('satchel strap','box',[-.07,1.23,.39],[.09,.76,.055],'#cba966');strap.setLocalEulerAngles(0,0,-36);
      part('creative jacket rolled cuff','capsule',[0,-.48,0],[.31,.14,.34],shirt,limbs['arm-left'].entity);
      for(const side of [-1,1])part('utility trouser pocket '+side,'box',[side*.09,-.1975,.15],[.14,.22,.12],'#59537c',limbs[side<0?'leg-left':'leg-right'].entity);const arm=limbs['arm-right'].entity;part('drawing tablet','box',[.03,-.4,.22],[.38,.48,.06],'#354154',arm);part('tablet screen','box',[.03,-.4,.257],[.31,.39,.008],'#abdfe0',arm);part('tablet drawing','sphere',[.03,-.39,.266],[.16,.17,.008],'#ebd491',arm);part('tablet home key','sphere',[.03,-.61,.266],[.025,.025,.009],'#b9d4df',arm);part('stylus','cylinder',[0,-.53,.14],[.035,.35,.035],'#dabe84',limbs['arm-left'].entity);}
    if(career==='assistant'){
      part('headset ear cushion','sphere',[.62,2.03,-.04],[.15,.34,.32],'#283647');part('headset earcup','sphere',[.69,2.03,-.04],[.13,.28,.26],accent);const mic=part('headset mic arm','box',[.51,1.86,.26],[.055,.055,.48],'#31404c');mic.setLocalEulerAngles(0,-22,0);part('headset microphone','sphere',[.39,1.84,.48],[.14,.09,.09],'#293c4d');
      const lanyard=part('assistant identity lanyard','box',[-.18,1.26,.39],[.035,.38,.03],accent);lanyard.setLocalEulerAngles(0,0,-12);part('assistant identity badge','box',[-.15,1.03,.40],[.14,.19,.035],shirt);part('assistant badge stripe','box',[-.15,.99,.425],[.1,.035,.015],accent);
      const arm=limbs['arm-right'].entity;part('clipboard','box',[.02,-.43,.23],[.34,.49,.07],'#334e70',arm);part('clipboard paper','box',[.02,-.43,.275],[.27,.38,.012],'#f7efda',arm);part('clipboard clip','box',[.02,-.2,.29],[.13,.055,.035],'#d7b573',arm);for(let i=0;i<3;i++)part(`clipboard line ${i}`,'box',[.02,-.34-i*.075,.29],[.19,.022,.014],'#718a99',arm);part('pen','cylinder',[.06,-.5,.18],[.035,.34,.035],'#d1ad5c',limbs['arm-left'].entity);
    }
    // Retain the limb pivots and dimensions expected by the existing walk cycle.
    // Shallow garment construction and arm-local grips retain the existing silhouette and soles.
    for(const side of [-1,1]){
      part('sleeve seam '+side,'box',[side*.11,-.26,-.11],[.014,.35,.018],career==='doctor'?'#c6dcd7':pants,limbs[side<0?'arm-left':'arm-right'].entity);
    }
    if(career==='founder'){
      part('coat buttonhole','box',[-.18,1.31,.411],[.025,.07,.01],'#182e49');
      part('tablet holding thumb','capsule',[-.09,-.62,.28],[.085,.16,.07],skin,limbs['arm-right'].entity);
      part('rear shirt collar','capsule',[0,1.563,-.065],[.245,.033,.021],'#d6b993');
    }
    if(career==='freelancer'){
      curve('rear satchel strap',[[.23,1.49,-.26],[.18,1.38,-.35],[-.02,1.2,-.36],[-.23,1.02,-.34],[-.27,.84,-.3],[-.30,.82,.12]],.035,'#cba966');
      part('satchel side gusset','box',[-.65,.86,.18],[.025,.29,.17],'#9d7b48');
      part('tablet holding thumb','capsule',[-.11,-.51,.28],[.08,.14,.065],skin,limbs['arm-right'].entity);
      part('stylus grip','capsule',[.04,-.61,.14],[.075,.13,.07],skin,limbs['arm-left'].entity);
    }
    if(career==='engineer'){
      part('rear safety strip','box',[0,1.38,-.36],[.58,.055,.018],'#e9e6b9');
      part('tool pouch flap edge','box',[.27,.88,.4],[.15,.035,.02],'#c89d4f');
    }
    if(career==='doctor'){
      part('coat waist tab lower seam','box',[0,.905,-.405],[.38,.018,.01],'#b8cdca');
      part('clipboard holding thumb','capsule',[-.115,-.57,.29],[.08,.15,.07],skin,limbs['arm-right'].entity);
      part('pocket folded top','box',[.27,1.125,.38],[.18,.025,.025],'#c6dcd7');
    }
    if(career==='sales'){
      const right=limbs['arm-right'].entity,left=limbs['arm-left'].entity;
      part('case front lip','box',[.12,-.73,.41],[.6,.045,.025],'#806345',right);
      for(const x of[-.08,.32])part('case hinge '+x,'box',[x,-.72,.13],[.08,.04,.04],'#cfb16f',right);
      part('sample jar lid','cylinder',[.12,-.545,.29],[.16,.025,.16],'#4b928b',right);
      part('sample carton face','box',[.32,-.56,.37],[.10,.18,.015],'#cfb16f',right);
      part('phone holding thumb','capsule',[.1,-.5,.285],[.08,.13,.06],skin,left);
    }
    if(career==='assistant'){
      part('headset cushion rim','sphere',[.635,2.03,-.04],[.14,.29,.27],'#3e5968');
      part('headset boom joint','sphere',[.59,1.95,.09],[.09,.09,.09],accent);
      part('clipboard holding thumb','capsule',[-.11,-.56,.29],[.08,.14,.065],skin,limbs['arm-right'].entity);
      part('pen grip','capsule',[.09,-.61,.18],[.075,.13,.07],skin,limbs['arm-left'].entity);
    }
    if(career==='doctor'){
      // A cool scrub collar set inside chalk-white lapels separates the coat from the shirt.
      part('scrub undercollar','capsule',[0,1.48,.22],[.36,.24,.25],'#437a80');
      for(const side of [-1,1]){
        const lapel=part('folded coat facing '+side,'box',[side*.17,1.35,.355],[.115,.37,.065],'#faf9eb');
        lapel.setLocalEulerAngles(0,0,-side*29);
        const flap=part('coat skirt fold '+side,'box',[side*.22,.59,-.328],[.35,.55,.12],'#d3e1d8');
        flap.setLocalEulerAngles(0,0,side*8);
      }
      part('clipboard inset chart','box',[.02,-.445,.306],[.225,.255,.014],'#a3c5c1',limbs['arm-right'].entity);
      part('clipboard chart header','box',[.02,-.357,.319],[.166,.040,.012],'#31596e',limbs['arm-right'].entity);
    }
    if(career==='founder'){
      // The coat skirts flare around the thighs instead of blending into the trousers.
      for(const side of [-1,1]){
        const skirt=part('overcoat skirt '+side,'box',[side*.357,.69,.082],[.145,.48,.49],'#334f70');
        skirt.setLocalEulerAngles(0,0,side*9);
        const facing=part('overcoat folded lapel '+side,'box',[side*.232,1.315,.392],[.15,.41,.065],'#50708a');
        facing.setLocalEulerAngles(0,0,-side*24);
      }
      part('rear overcoat half belt','box',[0,.96,-.385],[.61,.083,.027],'#496782');
    }
    if(career==='sales'){
      // The cooler sample case body separates from the camel suit. Its hardware
      // and sample containers stay attached to the existing carrying hand.
      const hand=limbs['arm-right'].entity;
      part('sample case enamel front','box',[.12,-.81,.426],[.618,.144,.036],'#346b68',hand);
      for(const side of [-1,1]){
        part('sample case corner guard '+side,'box',[.12+side*.293,-.805,.437],[.069,.147,.041],'#cfaf6b',hand);
        part('sample case enamel gusset '+side,'box',[.12+side*.32,-.82,.268],[.025,.139,.28],'#3c706c',hand);
      }
      part('bottle display label','box',[-.08,-.58,.335],[.072,.078,.021],'#558782',hand);
    }
    // Bend at the elbow, keeping fingers, grip and equipment on the forearm.
    for(const [i,name]of ['arm-left','arm-right'].entries()){
      const limb=limbs[name],arm=limb.entity,forearm=new pc.Entity(name+' forearm joint');
      const elbowY=-.29;
      for(const piece of [...arm.children]){
        if(/upper sleeve|padded shoulder/.test(piece.name))continue;
        const point=piece.getLocalPosition().clone();
        arm.removeChild(piece);forearm.addChild(piece);piece.setLocalPosition(point.x,point.y-elbowY,point.z);
      }
      arm.addChild(forearm);forearm.setLocalPosition(0,elbowY,0);
      forearm.setLocalEulerAngles(profile.bend[i],0,0);
      arm.setLocalEulerAngles(profile.reach[i],profile.yaw[i],profile.open[i]);limb.base=arm.getLocalEulerAngles().clone();
    }
    body.characterRevision='R175';
    const head = new pc.Entity('head and hair');
    const upperBody = new pc.Entity('coat and shoulders');
    for (const child of [...body.children]) {
      if (child.name.startsWith('leg-')) continue;
      const p = child.getLocalPosition().clone();
      body.removeChild(child);
      if (p.y >= 1.70 || /pony|forelock|eyelid|headset|side hair|sculpted side lock|subtle smile|formed hard hat ridge|spectacle|knit ridge/.test(child.name)) {
        head.addChild(child);
        child.setLocalPosition(p.x,p.y-1.70,p.z);
      } else {
        upperBody.addChild(child);
        child.setLocalPosition(p.x,p.y,p.z);
      }
    }
    body.addChild(upperBody);
    upperBody.setLocalPosition(0,pelvisLift,0);
    upperBody.setLocalScale(profile.shoulder,torsoLength,.86);
    body.addChild(head);
    head.setLocalPosition(0,1.70*torsoLength+pelvisLift-.025,0);
    head.setLocalEulerAngles(...profile.gaze);
    head.setLocalScale(...profile.head);
    return {body,limbs};
  }

