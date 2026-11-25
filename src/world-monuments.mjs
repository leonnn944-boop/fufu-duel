import {elevation, softBox} from './toy-town.mjs';

const TAU = Math.PI * 2;

// An elliptical section of the Colosseum. Each masonry strip has an outer
// face, inner face and soffit; even the smallest arcade can be seen through.
function ringPoint(angle, radius, y) {
  return [1.04 * radius * Math.cos(angle), y, .81 * radius * Math.sin(angle)];
}

function stoneStrip(b, a, z, outer, inner, loA, loZ, hiA, hiZ, stone, shade, top) {
  const p = (t, r, y) => ringPoint(t, r, y);
  const A = p(a, outer, loA), B = p(z, outer, loZ);
  const C = p(z, outer, hiZ), D = p(a, outer, hiA);
  const E = p(a, inner, loA), F = p(z, inner, loZ);
  const G = p(z, inner, hiZ), H = p(a, inner, hiA);
  b.quad(A,D,C,B,stone);
  b.quad(E,F,G,H,shade);
  b.quad(D,H,G,C,top);
  b.quad(A,B,F,E,shade);
}

function archBay(b, a, z, bottom, height, tint) {
  const span = z-a, u = t => a + span*t;
  const peak = bottom + height;
  const warm = '#c28f68', cream = '#ebcca3';
  const spring = bottom + height*.40, rise = height*.38;
  for (const [left,right] of [[0,.16],[.84,1]]) {
    stoneStrip(b,u(left),u(right),1,.86,bottom,bottom,peak,peak,tint,warm,cream);
  }
  // Jamb reveals close the columns at the sides of the aperture.
  for (const [t,reverse] of [[.16,false],[.84,true]]) {
    const ends = [[1,bottom],[.86,bottom],[.86,spring],[1,spring]].map(([r,y])=>ringPoint(u(t),r,y));
    b.quad(...(reverse ? ends.reverse() : ends),warm);
  }
  const vault = n => {
    const theta = Math.PI*n/6;
    return [u(.5-.34*Math.cos(theta)),spring+rise*Math.sin(theta)];
  };
  for (let n=0;n<6;n++) {
    const [s,h] = vault(n), [e,j] = vault(n+1);
    stoneStrip(b,s,e,1,.86,h,j,peak,peak,tint,warm,cream);
    b.quad(ringPoint(s,1.006,h),ringPoint(s,1.006,h+.022),
           ringPoint(e,1.006,j+.022),ringPoint(e,1.006,j),n===2||n===3?'#f6dcaf':'#e7c29a');
  }
  // A projecting horizontal lip ties one storey to the next.
  stoneStrip(b,a,z,1.018,.855,peak-.022,peak-.022,peak+.009,peak+.009,cream,warm,'#f7dcb3');
}

export function colosseum(b) {
  const sand = '#e1b893', shade = '#b98562', sun = '#efcba0';
  softBox(b,'Roman travertine courtyard',0,0,2.30,1.87,.012,.10,.23,'#ccb193',.018);
  const count=24, width=TAU/count;
  // The surviving outer wall rises on the far side. The broken edge drops
  // in visible steps to expose the seats and the chambers below the arena.
  b.features.push('tiered open elliptical Roman arches','broken outer wall','excavated hypogeum');
  for (let i=0;i<count;i++) {
    const a=i*width,z=a+width;
    const back = Math.sin(a+width*.5);
    const floors=back<-.25?3:back<.60?2:1;
    for (let level=0;level<floors;level++) {
      archBay(b,a,z,.108+level*.335,.335,(i+level)%4===0?'#d7aa84':sand);
    }
    if(back<-.48) {
      const y=1.129, u=t=>a+width*t;
      const strip=(t,v,lo,hi,ink)=>stoneStrip(b,u(t),u(v),1,.87,lo,lo,hi,hi,ink,shade,sun);
      strip(0,1,y,y+.057,sand);
      strip(0,.34,y+.057,y+.177,sand);strip(.66,1,y+.057,y+.177,sand);
      strip(0,1,y+.177,y+.231,sun);
    }
    for(let row=0;row<5;row++) {
      const inner=.42+row*.078, outer=inner+.079, y=.147+row*.081;
      const aisle=i%4===1;
      stoneStrip(b,a,z,outer,inner,y-.046,y-.046,y,y,
                 shade,shade,aisle?'#c59372':row%2===0?'#e9c6a1':'#d9ae8b');
    }
    // Only one end of the deck is reconstructed, leaving the maze visible.
    if(Math.cos(a+width/2)<-.45) {
      b.tri([-.12,.162,0],ringPoint(z,.414,.162),ringPoint(a,.414,.162),'#efce96');
    }
  }
  for(const z of [-.20,-.10,0,.10,.20]) {
    const half=.37*Math.sqrt(1-(z/.31)**2);
    b.box('excavated arena passage',[0,.127,z],[half*2,.055,.027],shade);
    for(const x of [-.13,.10]) {
      if(Math.abs(x)<half-.035)b.box('connecting cell',[x,.132,z+.035],[.022,.063,.052],sun);
    }
  }
}

function clockDial(f) {
  const y=2.72,z=.488,r=.37;
  const disk=(radius,depth,ink)=>{
    for(let i=0;i<40;i++){
      const circle=n=>[radius*Math.cos(n*TAU/40),y+radius*Math.sin(n*TAU/40),depth];
      f.tri([0,y,depth],circle(i),circle(i+1),ink);
    }
  };
  disk(r,z,'#b57e40');disk(r-.022,z+.003,'#e6c075');disk(r-.045,z+.006,'#fff0c8');
  const navy='#29536a';
  const radial=(a,rad,depth)=>[Math.sin(a)*rad,y+Math.cos(a)*rad,depth];
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    f.beam('Prussian blue dial index',radial(a,.244,z+.015),radial(a,.298,z+.015),
           i%3===0?.023:.014,navy);
  }
  f.beam('minute hand',radial(Math.PI/3,-.050,z+.033),radial(Math.PI/3,.246,z+.033),.026,navy);
  f.beam('hour hand',radial(-.96,-.046,z+.052),radial(-.96,.165,z+.052),.035,navy);
  f.box('gilded dial pivot',[0,y,z+.068],[.051,.051,.020],'#d4a34d');
}

export function bigBen(b) {
  const stone='#deb27b',trim='#f0cb8d',grit='#b58d66',slate='#4d6768',blue='#365762',gold='#e4b460';
  softBox(b,'Westminster pavement',0,0,1.93,1.59,.012,.11,.20,'#cdb79a',.017);
  softBox(b,'tower footing',0,0,1.09,1.07,.106,.23,.075,grit,.018);
  b.box('clock tower shaft',[0,1.285,0],[.83,2.13,.83],stone);
  for(const x of [-.393,.393])for(const z of [-.393,.393]){
    b.box('sandstone buttress',[x,1.31,z],[.125,2.18,.125],trim);
    b.frustum('buttress slope',x,2.36,z,.151,.092,.22,.151,.092,grit);
  }
  for(const y of [.42,.92,1.39,1.89,2.246]) {
    b.box('shaft string course',[0,y,0],[.904,.052,.904],trim);
  }
  b.box('gilded dial chamber',[0,2.71,0],[.944,.91,.944],stone);
  for(let side=0;side<4;side++){
    const f=elevation(b,side);
    for(let row=0;row<4;row++){
      const lo=.5+row*.49;
      for(const x of [-.219,0,.219]){
        f.box('lancet shadow',[x,lo+.129,.418],[.087,.255,.012],grit);
        f.tri([x-.044,lo+.253,.426],[x+.044,lo+.253,.426],[x,lo+.320,.426],grit);
        f.box('stone lancet mullion',[x,lo+.116,.432],[.014,.231,.016],trim);
      }
    }
    clockDial(f);
    for(const x of [-.285,-.15,0,.15,.285]){
      f.box('belfry louvre',[x,3.27,.448],[.071,.184,.027],blue);
      f.tri([x-.036,3.361,.462],[x+.036,3.361,.462],[x,3.42,.462],blue);
    }
  }
  b.box('clock entablature',[0,3.156,0],[1.02,.079,1.02],trim);
  b.box('open belfry stonework',[0,3.305,0],[.88,.26,.88],stone);
  b.box('belfry caps',[0,3.439,0],[1.016,.068,1.016],gold);
  b.frustum('steep slate roof',0,3.688,0,1.00,.353,.46,1.00,.353,slate);
  for(const x of [-1,1])for(const z of [-1,1]){
    const px=x*.447,pz=z*.447;
    b.cylinder('corner pinnacle',px,3.547,pz,.052,.203,grit,.044,8);
    b.cylinder('pinnacle gilded tip',px,3.712,pz,.051,.145,gold,.008,8);
    b.beam('gilded roof hip',[x*.474,3.483,z*.474],[x*.17,3.917,z*.17],.022,trim);
  }
  b.box('Ayrton lantern glowing chamber',[0,3.995,0],[.303,.17,.303],'#f1c57d');
  for(const x of [-.147,.147])for(const z of [-.147,.147])
    b.box('lantern tracery',[x,3.996,z],[.032,.182,.032],blue);
  b.frustum('fleche roof',0,4.223,0,.382,.057,.31,.382,.057,slate);
  b.cylinder('gold finial',0,4.433,0,.034,.147,gold,.010,8);
}

function headland(b, side) {
  // Rounded, sloping landfalls frame the bay while the centre stays open.
  const rim=[[1.12,-.63,.19],[.97,-.53,.29],[.85,-.34,.34],[.83,-.07,.42],
             [.89,.26,.32],[.98,.50,.28],[1.12,.58,.22]];
  const point=([x,z,y])=>[side*x,y,z];
  const crest=[side*1.075,.47,-.025];
  for(let i=0;i<rim.length-1;i++){
    const a=point(rim[i]),c=point(rim[i+1]),p=[a[0],.12,a[2]],q=[c[0],.12,c[2]];
    const face=side>0?[a,c,crest]:[c,a,crest];
    b.tri(...face,i%3===0?'#91ab78':'#7d966e');
    b.quad(...(side>0?[p,q,c,a]:[q,p,a,c]),i%2?'#b59674':'#c6a883');
  }
  const a=point(rim[0]),c=point(rim.at(-1));
  b.tri(...(side>0?[c,a,crest]:[a,c,crest]),'#7d966e');
}

export function goldenGate(b) {
  const vermilion='#cb513a',orange='#e8794f',rust='#9c4439',foam='#c7dbce';
  softBox(b,'Pacific waterline',0,0,2.29,1.56,.012,.128,.20,'#71a5a2',.020);
  softBox(b,'enamel bay water',0,0,2.25,1.52,.119,.151,.19,'#80b7b2',.009);
  for(const side of [-1,1])headland(b,side);
  for(const x of [-.69,.69]) {
    softBox(b,'concrete pier caisson',x,0,.23,.64,.15,.442,.056,'#c1b69d',.012);
    for(const z of [-.225,.225]){
      b.frustum('stepped deco tower leg',x,.976,z,.122,.098,1.09,.110,.083,vermilion);
      b.frustum('deco tower upper column',x,1.665,z,.100,.080,.30,.085,.066,vermilion);
      for(const dx of [-.050,.050])
        b.beam('projecting vertical rib',[x+dx,.453,z],[x+dx*.77,1.818,z],.017,orange);
      b.box('tower top cap',[x,1.835,z],[.10,.040,.084],orange);
    }
    for(const y of [.64,.99,1.37,1.66]){
      b.box('stepped portal crosspiece',[x,y,0],[.093,.069,.41],vermilion);
      for(const side of [-1,1]){
        b.box('deco portal shoulder',[x,y-.054,side*.161],[.088,.042,.104],rust);
        b.box('portal cornice',[x,y+.036,side*.142],[.103,.022,.153],orange);
      }
    }
  }
  b.box('suspended roadway',[0,.636,0],[2.22,.09,.378],'#616b68');
  for(const z of [-.204,.204]){
    b.box('orange stiffening girder',[0,.610,z],[2.24,.11,.033],rust);
    b.box('sidewalk parapet',[0,.698,z],[2.24,.040,.030],vermilion);
    for(let j=0;j<14;j++){
      const x=-1.10+j*.157;
      b.beam('painted girder lattice',[x,.572,z*1.08],[x+.138,.657,z*1.08],.015,orange);
    }
  }
  for(let i=-5;i<=5;i++)b.box('road centre dash',[i*.185,.684,0],[.078,.008,.010],foam);
  // Main span and two side spans have different sag. Each hanger ends on
  // the cable curve itself, including when seen from below the bridge deck.
  for(const z of [-.225,.225]){
    for(const [from,to,minH,endH,spanCount] of [[-1.085,-.69,.716,1.823,5],[-.69,.69,.907,1.823,14],[.69,1.085,.716,1.823,5]]){
      const h=t=>{
        if(spanCount===14)return minH+(endH-minH)*(2*t-1)**2;
        const d=from<-.7?t:1-t;
        return minH+(endH-minH)*(.36*d+.64*d*d);
      };
      const p=t=>[from+(to-from)*t,h(t),z];
      for(let i=0;i<spanCount;i++){
        const t=i/spanCount;
        b.beam('vermillion main cable',p(t),p((i+1)/spanCount),.033,orange);
        if(i>0){const [x,y]=p(t);b.beam('vertical suspender',[x,.721,z],[x,y,z],.012,vermilion);}
      }
    }
  }
  for(const [x,z] of [[-.70,.50],[-.51,.58],[.40,-.51],[.57,-.47],[.09,.47]]){
    for(let k=0;k<2;k++)b.beam('bay ripples',[x+k*.050,.158,z],[x+.05+k*.05,.158,z+(k===0?.012:-.012)],.012,foam);
  }
  const bx=.27,bz=.44;
  b.frustum('sailboat varnished hull',bx,.176,bz,.125,.195,.043,.046,.074,'#a16c4c');
  b.beam('sailboat timber mast',[bx,.185,bz],[bx,.379,bz],.012,rust);
  b.tri([bx-.078,.213,bz+.004],[bx-.008,.213,bz+.004],[bx-.008,.37,bz+.004],'#fff1cf');
  b.tri([bx+.01,.211,bz+.004],[bx+.071,.211,bz+.004],[bx+.01,.335,bz+.004],'#f2d8ac');
}
