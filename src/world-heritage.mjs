import { elevation, pebble, softBox } from './toy-town.mjs';
import {palm,flowerbed,slab,ripples} from './world-craft.mjs';

// All dimensions are proportions of a tabletop plinth. Names below also allow
// the board inspector to identify the actual mesh mounted at each destination.
function pyramid(b, name, x, z, width, height, courses, facing) {
  b.features.push(name);
  const sand = ['#dcae75', '#e1b780', '#d6a471', '#e6bd88', '#daab78'];
  const granite = ['#b38070', '#bd8974', '#c99780', '#b7826c', '#c0937d'];
  const floor = .116;
  const facePoint = (face, u, t) => {
    const r = width * (1 - t) / 2;
    const a = u * r;
    const [dx,dz] = [[a,r],[r,-a],[-a,-r],[-r,a]][face];
    return [x + dx, floor + height*t, z + dz];
  };
  for (let side = 0; side < 4; side++) {
    for (let row = 0; row < courses; row++) {
      const lo = row / courses;
      const hi = (row + 1) / courses;
      const smoothCrown = facing === 'limestone' && lo >= .70;
      const blocks = Math.max(1, Math.round((1-lo)*11));
      const stone = facing === 'granite' && lo < .26 ? granite : sand;
      let left = -1;
      for (let i = 1; i <= blocks; i++) {
        // Alternate the headers. These are adjacent colored faces, so the
        // carved masonry stays stable when the board camera pulls away.
        const right = i === blocks ? 1 : -1 + 2*(i + (row%2 ? .24 : -.24))/blocks;
        const ink = smoothCrown ? ['#e9c991','#efcf9c','#e5c38e'][(row+i+side)%3] : stone[(row*3 + i + side*2) % stone.length];
        const a = facePoint(side,left,lo), c = facePoint(side,right,lo);
        const d = facePoint(side,right,hi), e = facePoint(side,left,hi);
        if (row === courses-1) b.tri(a,c,d,ink);
        else b.quad(a,c,d,e,ink);
        left = right;
      }
    }
  }
}

export function giza(b) {
  softBox(b,'sandstone plateau',0,0,2.28,1.98,.01,.115,.21,'#bc8b60');
  softBox(b,'wind-polished desert sand',0,0,2.25,1.94,.08,.128,.21,'#ecd19f');
  pyramid(b,'Great Pyramid of Khufu',-.51,-.31,1.20,1.04,22,'bare');
  pyramid(b,'limestone-capped pyramid of Khafre',.64,.065,.87,.73,18,'limestone');
  pyramid(b,'granite-footed pyramid of Menkaure',-.62,.66,.48,.39,12,'granite');
  // A reclining sphinx, with paws pointing away from the pyramid complex.
  const x = .055;
  softBox(b,'sphinx enclosure',x,.67,.47,.51,.126,.152,.065,'#c4986c');
  pebble(b,'reclining limestone body',x,.224,.614,.097,.092,.183,'#d5a76e',12,6);
  for (const sign of [-1,1]) {
    softBox(b,'forepaw',x+sign*.063,.771,.068,.194,.15,.203,.026,'#efc792',.012);
    b.frustum('nemes side fold',x+sign*.062,.326,.715,.062,.067,.14,.079,.095,'#c09568');
  }
  pebble(b,'nemes crown',x,.371,.695,.096,.096,.069,'#dcba83',12,6);
  pebble(b,'sphinx face',x,.353,.739,.055,.073,.054,'#efcb92',16,8);
  pebble(b,'sphinx nose bridge',x,.352,.792,.014,.022,.022,'#dbb079',10,5);
  for(const sign of [-1,1]){pebble(b,'carved sphinx eye',x+sign*.023,.371,.789,.012,.007,.012,'#877052',8,4);b.beam('nemes painted stripe',[x+sign*.078,.323,.741],[x+sign*.050,.401,.715],.009,'#b9976b');}
  b.beam('sphinx mouth',[x-.018,.324,.791],[x+.018,.324,.791],.008,'#94724d');
  slab(b,'small oasis pool',.83,-.67,.29,.22,.128,.141,.065,'#84b9b8');ripples(b,.83,-.67,.146,.09);for(const [px,pz] of [[.96,-.68],[.69,-.75]])palm(b,px,.14,pz,.24);flowerbed(b,.97,.14,-.49,.07);
  pebble(b,'wind rounded dune',-.89,.15,-.65,.16,.046,.12,'#d9b880',14,5);
  for (const [px,pz,rx] of [[.76,-.63,.11],[.92,-.53,.06],[-.99,.55,.04],[-.17,.78,.06]]) {
    pebble(b,'exposed limestone',px,.138,pz,rx,rx*.34,rx*.71,'#dcbd8c',9,4);
  }
}

// Custom revolved profile: a swelling belly and narrow neck are visible at
// board scale. Vertex normals are averaged along the drawn profile.
function bulb(b, name, x, floor, z, radius, height, color, sides) {
  b.features.push(name);
  const profile = radius < .15
    ? [[.70,0],[.93,.20],[1,.42],[.86,.65],[.42,.85],[.052,1]]
    : [[.70,0],[.76,.09],[.9,.19],[1,.37],[.995,.47],[.91,.60],
      [.72,.72],[.46,.83],[.24,.90],[.113,.959],[.052,1]];
  const point = (ring, i) => {
    const [r,y] = profile[ring];
    const [r0,y0] = profile[Math.max(0,ring-1)], [r1,y1] = profile[Math.min(profile.length-1,ring+1)];
    const a = i*Math.PI*2/sides;
    const dy = (y1-y0)*height, dr = (r1-r0)*radius;
    const len = Math.hypot(dy,dr);
    return {p:[x+radius*r*Math.cos(a),floor+height*y,z+radius*r*Math.sin(a)],
      n:[dy/len*Math.cos(a),-dr/len,dy/len*Math.sin(a)]};
  };
  for (let j = 0; j < profile.length-1; j++) {
    for (let i = 0; i < sides; i++) {
      const a = point(j,i), c = point(j,i+1), d = point(j+1,i+1), e = point(j+1,i);
      b.smoothTri(c.p,a.p,e.p,color,c.n,a.n,e.n);
      b.smoothTri(c.p,e.p,d.p,color,c.n,e.n,d.n);
    }
  }
  b.cylinder('finial socket',x,floor+height,z,radius*.058,height*.028,'#b18e59',radius*.045,8);
}

function pointedPortal(b, x, bottom, z, width, height) {
  const edge = [[-1,0],[-1,.47],[-.97,.59],[-.85,.72],[-.67,.81],[-.39,.89],
    [0,1],[.39,.89],[.67,.81],[.85,.72],[.97,.59],[1,.47],[1,0]];
  const vertex = ([u,t],scale,depth) => [x+u*width*.5*scale,bottom+t*height*scale,z+depth];
  const innerFront = edge.map(v=>vertex(v,.80,.021));
  const outerFront = edge.map(v=>vertex(v,1,.021));
  const innerBack = edge.map(v=>vertex(v,.80,0));
  const center = [x,bottom+.22*height,z];
  for (let i=0;i<edge.length-1;i++) {
    b.tri(center,innerBack[i+1],innerBack[i],'#536776');
    b.quad(innerFront[i],innerFront[i+1],outerFront[i+1],outerFront[i],'#e5cfab');
    b.quad(innerBack[i],innerBack[i+1],innerFront[i+1],innerFront[i],'#a79890');
  }
  b.tri(center,innerBack[0],innerBack.at(-1),'#536776');
}

function minaret(b,x,z) {
  const stone = '#f5e6cb', shadows = '#cfbda5', trim = '#ffefd4';
  b.cylinder('minaret plinth',x,.259,z,.108,.13,shadows,.098,12);
  b.cylinder('tapered marble minaret',x,.845,z,.083,1.12,stone,.051,16);
  for (const [y,r] of [[.58,.094],[.96,.082],[1.34,.073]]) {
    b.cylinder('corbelled minaret balcony',x,y,z,r*.77,.045,shadows,r,16);
    b.cylinder('marble gallery rail',x,y+.032,z,r,.028,trim,r,16);
  }
  for (const dx of [-.035,.035]) for (const dz of [-.035,.035]) {
    b.cylinder('lantern pillar',x+dx,1.443,z+dz,.012,.135,stone,.012,6);
  }
  b.cylinder('minaret eave',x,1.516,z,.079,.03,shadows,.086,12);
  bulb(b,'minaret cupola',x,1.53,z,.067,.105,trim,10);
  b.cylinder('minaret pin',x,1.66,z,.009,.05,'#b88c50',.003,8);
}

export function tajMahal(b) {
  const marble='#f6e8d5', eave='#fff4da', shade='#c7bab4', gold='#bd945b';
  softBox(b,'sandstone garden terrace',0,0,2.25,1.98,.01,.13,.15,'#bf9079');
  softBox(b,'inlaid garden pavement',0,0,2.22,1.95,.12,.167,.146,'#e1c3a8');
  softBox(b,'marble platform',0,-.111,1.95,1.39,.157,.247,.042,marble);
  softBox(b,'central mausoleum',0,0,1.14,1.14,.242,.977,.165,marble);
  softBox(b,'parapet cornice',0,0,1.165,1.165,.94,.997,.171,'#dbccc1');
  for (let side=0;side<4;side++) {
    const f=elevation(b,side);
    f.box('projecting iwan wall',[0,.637,.563],[.435,.78,.078],eave);
    f.box('portal parapet',[0,1.026,.564],[.459,.037,.091],shade);
    pointedPortal(f,0,.261,.604,.362,.665);
    for (const sign of [-1,1]) {
      for (const sill of [.29,.598]) pointedPortal(f,sign*.337,sill,.573,.155,.244);
      f.cylinder('portal pinnacle',sign*.212,1.055,.568,.015,.094,gold,.005,8);
    }
  }
  b.cylinder('dome drum',0,1.053,0,.316,.177,'#d9cfc4',.316,32);
  b.cylinder('dome springing cornice',0,1.135,0,.334,.04,eave,.334,32);
  bulb(b,'white marble onion dome',0,1.143,0,.412,.577,marble,36);
  b.cylinder('gilt finial',0,1.774,0,.018,.125,gold,.005,12);
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    const x=sx*.394,z=sz*.394;
    b.cylinder('chhatri arcade',x,1.059,z,.088,.127,shade,.088,16);
    for (const dx of [-.062,.062]) for (const dz of [-.062,.062]) {
      b.cylinder('chhatri column',x+dx,1.068,z+dz,.018,.149,eave,.015,8);
    }
    b.cylinder('chhatri roof ledge',x,1.144,z,.122,.037,eave,.122,16);
    bulb(b,'rooftop chhatri',x,1.16,z,.111,.149,marble,12);
    minaret(b,sx*.83,-.10+sz*.58);
  }
  softBox(b,'reflecting pool stone coping',0,.758,.256,.361,.167,.191,.045,eave,.008);
  softBox(b,'turquoise reflecting pool',0,.758,.202,.313,.19,.198,.036,'#64aaaa',.002);
  for (const side of [-1,1]) {
    softBox(b,'formal garden lawn',side*.517,.762,.55,.289,.166,.187,.021,'#92ad83',.006);
    for (const z of [.678,.823]) for (const x of [.316,.712]) {
      b.cylinder('cypress trunk',side*x,.22,z,.018,.09,'#8d7553',.015,7);
      pebble(b,'trimmed cypress',side*x,.292,z,.042,.098,.042,'#507965',9,5);
    }
  }
}

export function kukulcan(b) {
  const floor=.127, rise=.107, light='#e9d8ad', shadow='#b6a489';
  softBox(b,'Yucatan limestone shelf',0,0,2.25,1.98,.008,.116,.173,'#a59c7f');
  softBox(b,'grassy ceremonial plaza',0,0,2.21,1.95,.091,floor,.168,'#8aa477',.012);
  for (let i=0;i<9;i++) {
    const y=floor+i*rise,w=1.705-i*.127;
    b.frustum('receding terrace '+(i+1),0,y+rise*.5,0,w,w-.039,rise,w,w-.039,
      i%3===1?'#d2c1a2':'#d9c9a8');
    b.frustum('bevelled terrace lip',0,y+rise-.016,0,w-.026,w-.054,.032,w-.026,w-.054,light);
    for (let side=0;side<4;side++) {
      const f=elevation(b,side);
      const panels=Math.max(1,Math.floor((w*.5-.21)/.16));
      for (const sign of [-1,1]) for (let p=0;p<panels;p++) {
        const span=(w*.5-.21)/panels,x=sign*(.19+(p+.54)*span);
        const z=w*.5-.009;
        f.quad([x-span*.31,y+.030,z+.005],[x+span*.31,y+.030,z+.005],
          [x+span*.31,y+.058,z+.001],[x-span*.31,y+.058,z+.001],shadow);
      }
    }
  }
  const summit=floor+rise*9;
  for (let side=0;side<4;side++) {
    const f=elevation(b,side);
    const outer=.922,inner=.254,steps=22,run=(outer-inner)/steps,stepHeight=(summit-floor)/steps;
    for (let i=0;i<steps;i++) {
      const front=outer-i*run,back=front-run,y=floor+i*stepHeight;
      f.quad([-.135,y,front],[.135,y,front],[.135,y+stepHeight,front],[-.135,y+stepHeight,front],'#b5a48a');
      f.quad([-.135,y+stepHeight,front],[.135,y+stepHeight,front],[.135,y+stepHeight,back],[-.135,y+stepHeight,back],light);
    }
    for (const sign of [-1,1]) {
      f.beam('stone stair balustrade',[sign*.157,floor+.024,outer],[sign*.157,summit+.027,inner],.053,'#e5d1aa');
    }
  }
  softBox(b,'summit landing',0,0,.628,.628,summit-.008,summit+.032,.024,light,.009);
  const base=summit+.031;
  b.box('summit sanctuary',[0,base+.127,0],[.428,.255,.428],'#cabca2');
  for(let side=0;side<4;side++) {
    const f=elevation(b,side);
    f.box('recessed doorway',[0,base+.099,.215],[side===0?.265:.139,.199,.009],'#584f46');
    if(side===0) for(const x of [-.059,.059]) {
      f.cylinder('serpent doorway column',x,base+.094,.229,.021,.188,'#c7b594',.021,8);
    }
    f.box('lintel',[0,base+.207,.224],[.312,.035,.032],light);
  }
  b.frustum('temple roof band',0,base+.254,0,.438,.48,.06,.438,.48,'#d8c8a8');
  b.frustum('flat summit roof',0,base+.295,0,.48,.417,.042,.48,.417,light);
  for(const x of [-.159,.159]) {
    // Sculpted serpent heads sit at the foot of the principal staircase only.
    b.box('serpent lower jaw',[x,floor+.026,.917],[.088,.05,.116],shadow);
    pebble(b,'serpent snout',x,floor+.075,.899,.056,.044,.079,'#ddccac',10,5);
    for(const side of [-1,1]) pebble(b,'carved serpent eye',x+side*.041,floor+.085,.907,.012,.012,.014,'#655c4e',8,4);
  }
}
