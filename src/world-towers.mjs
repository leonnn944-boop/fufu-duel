import {elevation, pebble, softBox} from './toy-town.mjs';

// These are original tabletop miniatures. All railings and open trusses belong
// to the same painted mesh as their building and therefore fade with it.
const limestone='#e9ce9d',mortar='#ad8e73',brass='#dbac63',night='#344f60';

function roundSlab(b,name,x,z,w,d,lo,hi,r,ink){
  softBox(b,name,x,z,w,d,lo,hi,r,ink,Math.min(.025,(hi-lo)*.25));
}

function profile(b,name,x,z,levels,colours){
  // Chamfered square with independent top and bottom widths. The corner
  // facets catch a glint when the four principal sides are in the shade.
  b.features.push(name);
  const row=({y,w,d=w,cut=.16})=>{
    const a=w/2,c=d/2,k=Math.min(a,c)*cut;
    return [[-a+k,-c],[a-k,-c],[a,-c+k],[a,c-k],[a-k,c],[-a+k,c],[-a,c-k],[-a,-c+k]]
      .map(([u,v])=>[x+u,y,z+v]);
  };
  const rings=levels.map(row);
  for(let j=1;j<rings.length;j++)for(let side=0;side<8;side++){
    const k=(side+1)%8,prev=rings[j-1],next=rings[j];
    b.quad(prev[side],next[side],next[k],prev[k],side%2?colours[1]:colours[0]);
  }
  const top=rings.at(-1),bottom=rings[0];
  for(let j=0;j<8;j++){const k=(j+1)%8;
    b.tri([x,levels.at(-1).y,z],top[k],top[j],colours[2]||colours[1]);
    b.tri([x,levels[0].y,z],bottom[j],bottom[k],colours[0]);
  }
}

function magnolia(b,x,z){
  b.cylinder('terrace tree trunk',x,.24,z,.038,.30,'#926547',.03,10);
  pebble(b,'round evergreen tree',x,.46,z,.14,.18,.13,'#559787',10,6);
}

export function taipei101(b){
  const jade='#438c82',glass='#66ad9c',corner='#9dcdac',dark='#2d6664';
  roundSlab(b,'jade court stone foundation',0,0,1.94,1.78,.02,.12,.21,mortar);
  roundSlab(b,'jade court limestone terrace',0,0,1.89,1.74,.105,.18,.21,limestone);
  profile(b,'battered granite tower base',0,0,[{y:.16,w:1.2},{y:.70,w:1.03}],['#578d83',corner]);
  profile(b,'lower glazed lantern',0,0,[{y:.69,w:1.05},{y:1.15,w:.82}],[dark,jade]);
  for(let side=0;side<4;side++){
    const f=elevation(b,side);
    roundSlab(f,'shopping arcade lintel',0,.56,1.00,.24,.35,.44,.07,brass);
    for(const x of [-.34,0,.34]){
      f.arch('mall arcade',x,.155,.60,.25,.20,night,limestone);
      f.box('arcade stone pier',[x-.124,.245,.61],[.044,.18,.045],limestone);
    }
    // The large circular coin is a useful secondary cue below the eight sections.
    pebble(f,'bronze coin',0,.89,.49,.121,.121,.04,brass,20,8);
    f.box('square coin opening',[0,.89,.526],[.053,.058,.014],dark);
  }
  for(const sx of [-1,1])for(const sz of [-1,1])magnolia(b,sx*.73,sz*.57);
  for(let tier=0;tier<8;tier++){
    const y=1.12+tier*.371, w=.94-tier*.028, low=w*.79, high=w*1.035;
    profile(b,'bamboo glass tier '+(tier+1),0,0,[{y,w:low},{y:y+.253,w},{y:y+.298,w:high}],
      [tier%2?glass:jade,corner]);
    profile(b,'jade projecting eave',0,0,[{y:y+.291,w:high},{y:y+.322,w:high*1.08},{y:y+.349,w:high*1.07}],
      ['#c0d4ac','#e5d9a5']);
    profile(b,'recess between bamboo tiers',0,0,[{y:y+.347,w:w*.8},{y:y+.377,w:w*.8}],
      [dark,jade]);
    for(let side=0;side<4;side++){
      const f=elevation(b,side);
      for(const k of [-.30,-.13,.13,.30])
        f.beam('flush bronze glass mullion',[low*k,y+.012,low/2+.004],[w*k,y+.25,w/2+.004],.012,'#a4cab3');
      for(const h of [.115,.198]){
        const panel=low+(w-low)*h/.253;
        f.box('storey glazing ribbon',[0,y+h,panel/2+.003],[panel*.78,.012,.011],dark);
      }
      // Corner cloud brackets are deliberately larger than the glazing bars.
      for(const sx of [-1,1])f.beam('cloud eave bracket',[sx*w*.35,y+.245,w*.499],[sx*w*.415,y+.305,high*.51],.041,brass);
    }
  }
  profile(b,'stepped jade crown',0,0,[{y:4.085,w:.56},{y:4.24,w:.48},{y:4.33,w:.31},{y:4.44,w:.30}],[jade,corner]);
  b.cylinder('crown lantern',0,4.46,0,.124,.10,brass,.105,12);
  b.cylinder('top mast',0,4.63,0,.055,.28,corner,.032,12);
  b.cylinder('broadcast pin',0,4.85,0,.025,.21,brass,.011,10);
}

function point(face,across,y,reach,zRatio=1){
  return [[across,y,reach*zRatio],[-reach,y,across*zRatio],[-across,y,-reach*zRatio],[reach,y,-across*zRatio]][face];
}

function latticeBand(b,name,lower,upper,ink,width,options={}){
  const [lowY,low]=lower,[highY,high]=upper;
  const {ratio=1,brace='#ba8055',panel='cross',ring=true}=options;
  for(let side=0;side<4;side++){
    const a=point(side,-low,lowY,low,ratio),c=point(side,low,lowY,low,ratio);
    const p=point(side,-high,highY,high,ratio),q=point(side,high,highY,high,ratio);
    b.beam(name+' corner chord',a,p,width,ink);
    if(ring)b.beam(name+' strap',a,c,width*.56,ink);
    if(panel==='cross'){
      b.beam(name+' light brace',a,q,width*.36,brace);b.beam(name+' light brace',c,p,width*.36,brace);
    }else if(panel==='chevron'){
      const mid=point(side,0,highY,high,ratio);
      b.beam(name+' chevron',a,mid,width*.48,brace);b.beam(name+' chevron',c,mid,width*.48,brace);
    }
  }
}

function glassDeck(b,name,y,w,h,wall,edge){
  profile(b,name+' underhang',0,0,[{y:y-h*.77,w:w*.74},{y:y-h*.50,w:w*.98}],[edge,brass]);
  profile(b,name+' glass gallery',0,0,[{y:y-h*.50,w:w*.94},{y:y+h*.33,w}], [wall,'#8cb9b0']);
  roundSlab(b,name+' lookout roof',0,0,w*1.065,w*1.065,y+h*.30,y+h*.57,.053,edge);
  for(let side=0;side<4;side++){
    const f=elevation(b,side);
    for(const k of [-.31,-.105,.105,.31])
      f.beam('gallery bars',[k*w,y-h*.49,w*.471],[k*w,y+h*.32,w*.502],.021,edge);
  }
}

export function tokyoTower(b){
  const red='#d9513b',coral='#f17b56',white='#fff0ce',shadow='#aa4639';
  roundSlab(b,'azuki plaza',0,0,2.14,1.87,.02,.10,.18,'#a37f76');
  roundSlab(b,'blush porcelain plaza',0,0,2.07,1.80,.09,.16,.17,'#eed6bf');
  roundSlab(b,'FootTown shopping base',0,-.09,1.39,.96,.154,.50,.13,'#d3b49a');
  for(const y of [.28,.445]){
    roundSlab(b,'foot town shopfront glass',0,-.09,1.42,.99,y-.07,y,.11,'#587b7d');
    roundSlab(b,'foot town balcony lip',0,-.09,1.47,1.01,y,y+.028,.10,white);
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    roundSlab(b,'vermillion column shoe',sx*.87,sz*.72,.31,.28,.14,.26,.044,limestone);
    b.frustum('lacquered kickplate',sx*.87,.27,sz*.72,.23,.19,.12,.21,.17,red);
  }
  const floors=[[.28,.87],[.76,.70],[1.18,.54],[1.57,.43],[1.99,.35],[2.34,.275],[2.73,.207],[3.10,.158],[3.46,.115],[3.76,.084]];
  for(let i=1;i<floors.length;i++){
    const ink=i<=4||i===7?red:white;
    latticeBand(b,'Tokyo riveted frame',floors[i-1],floors[i],ink,i===1?.105:i<5?.081:.052,
      {ratio:.83,brace:ink===white?'#eddaba':coral,panel:i===1?'chevron':'cross'});
  }
  glassDeck(b,'two-storey main deck',2.02,.98,.32,'#365c69',red);
  roundSlab(b,'main deck ivory belt',0,0,.976,.976,1.997,2.036,.06,white);
  glassDeck(b,'upper enclosed observatory',3.50,.43,.21,'#78aaa3',white);
  // A single thick radio mast remains legible at normal board scale.
  for(let i=0;i<6;i++)b.cylinder('banded transmitter',0,3.84+i*.145,0,.064-i*.007,.15,i%2?white:red,.061-i*.007,12);
  b.cylinder('orange radio needle',0,4.69,0,.025,.21,red,.009,10);
  for(const sx of [-1,1]){
    const x=sx*.84,z=-.60;
    b.cylinder('sakura wood',x,.37,z,.034,.39,'#8a6251',.028,8);
    for(const [dx,dy,dz] of [[-.075,0,0],[.075,.012,0],[0,.085,-.03]])
      pebble(b,'pink cherry crown',x+dx,.60+dy,z+dz,.104,.091,.096,dy?'#f7c3bd':'#dd9fa7',10,5);
  }
  b.features.push('Tokyo radio tower');
}

function lamp(b,x,z){
  b.cylinder('iron street lamp foot',x,.15,z,.075,.19,'#4b6a60',.061,12);
  b.cylinder('lamp standard',x,.34,z,.031,.29,'#547969',.022,8);
  pebble(b,'warm opal lamp',x,.52,z,.059,.077,.059,'#f9dd9b',10,5);
}

export function parisEiffel(b,drawStudio){
  const bronze='#a66c4c',highlight='#d9a775',deep='#7f5344';
  roundSlab(b,'Paris promenade earth',0,0,2.47,1.98,.016,.092,.17,'#a68764');
  roundSlab(b,'Paris limestone promenade',0,0,2.41,1.93,.088,.16,.17,'#eee0ba');
  // Keep the old Montmartre studio and easel as a small piece beside the tower.
  const reduced=new b.constructor(b.scene,b.root),scale=.36;
  const transform=p=>[-.88+p[0]*scale,.16+p[1]*scale,-.50+p[2]*scale];
  reduced.features=b.features;
  reduced.tri=(a,c,d,ink)=>b.tri(transform(a),transform(c),transform(d),ink);
  reduced.smoothTri=(a,c,d,ink,na,nc,nd)=>b.smoothTri(transform(a),transform(c),transform(d),ink,na,nc,nd);
  drawStudio(reduced);
  // Curve each pier inward independently, leaving the first-level arch open.
  const foot=.82,levels=[[.22,.82],[.48,.728],[.82,.568],[1.11,.444],[1.47,.34],[1.77,.267],[2.10,.214],[2.47,.17],[2.90,.13],[3.37,.099],[3.80,.071],[4.06,.061]];
  for(const sx of [-1,1])for(const sz of [-1,1]){
    roundSlab(b,'Champ de Mars pillar footing',sx*foot,sz*foot,.32,.30,.145,.252,.047,'#d2aa85');
    for(let i=1;i<=3;i++){
      const [lo,r]=levels[i-1],[hi,t]=levels[i],wide=[.11,.095,.076,.062];
      for(const [dx,dz] of [[-1,-1],[-1,1],[1,-1],[1,1]])
        b.beam('curved open iron pier',[sx*r+dx*wide[i-1],lo,sz*r+dz*wide[i-1]],[sx*t+dx*wide[i],hi,sz*t+dz*wide[i]],.052,bronze);
      for(const dz of [-1,1]){
        b.beam('pier diagonal weave',[sx*r-wide[i-1],lo,sz*r+dz*wide[i-1]],[sx*t+wide[i],hi,sz*t+dz*wide[i]],.024,highlight);
        b.beam('pier diagonal weave',[sx*r+wide[i-1],lo,sz*r+dz*wide[i-1]],[sx*t-wide[i],hi,sz*t+dz*wide[i]],.024,highlight);
      }
    }
  }
  for(let side=0;side<4;side++){
    const span=.827;
    const arch=t=>{const x=-span+2*span*t;
      const h=.26+.78*Math.sqrt(Math.max(0,1-(x/span)**2));
      const r=.82-(h-.22)*.405;
      return point(side,x,h,r);
    };
    for(let i=0;i<22;i++){
      const a=arch(i/22),c=arch((i+1)/22);
      b.beam('wrought arch ring',a,c,.055,bronze);
      if(i>3&&i<19&&i%2===0&&Math.abs(a[side%2?2:0])<.445){
        const top=point(side,side===2||side===3?-a[side%2?2:0]:a[side%2?2:0],1.085,.448);
        b.beam('arch spandrel',a,top,.021,highlight);
      }
    }
  }
  for(let i=4;i<levels.length;i++)latticeBand(b,'Paris curved ironwork',levels[i-1],levels[i],bronze,i<=6?.071:.044,
    {brace:i%2?highlight:deep,panel:i%2?'chevron':'cross'});
  for(const [y,w] of [[1.105,1.075],[1.79,.67]]){
    roundSlab(b,'bronze gallery fascia',0,0,w,w,y-.029,y+.046,.043,bronze);
    for(let side=0;side<4;side++){
      const f=elevation(b,side);
      f.beam('ivory rail',[ -w*.494,y+.135,w*.485],[w*.494,y+.135,w*.485],.025,highlight);
      for(const k of [-.43,-.21,0,.21,.43]) f.beam('balustrade',[w*k,y+.05,w*.485],[w*k,y+.13,w*.485],.016,deep);
    }
  }
  glassDeck(b,'summit gallery',4.09,.31,.115,'#639393',bronze);
  b.cylinder('top belvedere',0,4.20,0,.091,.18,bronze,.063,12);
  b.cylinder('Paris broadcast finial',0,4.40,0,.027,.25,highlight,.010,10);
  lamp(b,-.98,.56);lamp(b,.98,-.55);
  b.features.push('Eiffel open arch silhouette');
}
