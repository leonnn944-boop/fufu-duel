import * as pc from '../vendor/playcanvas.min.mjs';
import {Builder} from './landmark-models.mjs';
import {softBox,pebble} from './toy-town.mjs';

// A painted tabletop archipelago. All dimensions are in map-local units.
// The playing route and the 20 landmark sites live inside the clear promenade.
const TAU=Math.PI*2, C={sand:'#e6c591',foam:'#f7efd8',water:'#4caaa9',ink:'#47696b',wood:'#a9825c',stone:'#b9ad94',cream:'#f3e5c6'};
const palette={south:['#dab87e','#e5c791','#e9d2a1','#cba36d'],west:['#7da17b','#92b58a','#a9bb83','#6f986f'],north:['#98b68c','#b5c38d','#c4ce9b','#8eac84'],east:['#75a69a','#89b59b','#a3c29b','#6b968b']};
const sector=(x,z)=>Math.abs(x)/39>Math.abs(z)/34?(x<0?'west':'east'):(z<0?'north':'south');
const seed=()=>{let n=193;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
function group(scene,name,parent=scene.mapRoot){const root=new pc.Entity(name);parent.addChild(root);return {root,b:new Builder(scene,root)};}
function finish(g){g.b.finishPainted();return g.root;}
function line(b,name,points,width,dye){for(let i=1;i<points.length;i++)b.beam(name,points[i-1],points[i],width,dye);}
function ribbon(b,name,points,width,col){b.features.push(name);for(let i=1;i<points.length;i++){const a=points[i-1],c=points[i],dx=c[0]-a[0],dz=c[2]-a[2],l=Math.hypot(dx,dz)||1,nx=-dz/l*width*.5,nz=dx/l*width*.5;b.quad([a[0]+nx,a[1],a[2]+nz],[c[0]+nx,c[1],c[2]+nz],[c[0]-nx,c[1],c[2]-nz],[a[0]-nx,a[1],a[2]-nz],col);}}
function disk(b,name,x,z,r,y,color){b.cylinder(name,x,y,z,r,.016,color,r,32);}
function ellipse(b,name,x,z,rx,rz,y,color){b.features.push(name);for(let i=0;i<32;i++){const a=i*TAU/32,c=(i+1)*TAU/32;b.tri([x,y,z],[x+rx*Math.cos(c),y,z+rz*Math.sin(c)],[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],color);}}
function coastPoint(a,rx,rz,y){const c=Math.cos(a),s=Math.sin(a),w=(1+.011*Math.sin(5*a)+.006*Math.cos(11*a))/(Math.abs(c)**6+Math.abs(s)**6)**(1/6);return [rx*c*w,y,rz*s*w];}
export function sculptCoast(b){
 b.box('deep ocean blue',[0,-1.72,0],[250,.18,240],'#539bb5');
 const rings=[[49,44,-1.61,'#62aec0'],[45,40,-1.59,'#70c1c0'],[42,37,-1.56,'#8cd4c4'],[40.7,35.7,-1.53,'#c1dfcb'],[40,35,-1.50,'#e7d5ae'],[39.2,34.1,-.88,'#dfbc88'],[38.8,33.8,.16,'#b2926d'],[38.7,33.7,.24,null],[29.9,25.2,.245,null],[22.8,19.1,.246,null]];
 const N=144;
 for(let i=0;i<N;i++){
  const a=i*TAU/N,c=(i+1)*TAU/N;
  for(let j=0;j<rings.length-1;j++){
   const [rx,rz,y,dye]=rings[j],[xx,zz,yy]=rings[j+1],p=coastPoint(a,rx,rz,y),q=coastPoint(c,rx,rz,y),r=coastPoint(c,xx,zz,yy),s=coastPoint(a,xx,zz,yy),colors=palette[sector((p[0]+q[0])/2,(p[2]+q[2])/2)];
   b.quad(q,p,s,r,dye||colors[j===7?0:1]);
  }
  const [rx,rz,y]=rings.at(-1);b.tri([0,.246,0],coastPoint(c,rx,rz,y),coastPoint(a,rx,rz,y),'#a8bd87');
  if(i%3!==2){const p=coastPoint(a,40.4,35.4,-1.465),q=coastPoint((a+c)/2,40.46,35.46,-1.465),r=coastPoint(c,40.4,35.4,-1.465);ribbon(b,'curved broken ivory sea foam',[p,q,r],.13,C.foam);if(i%5===0)ribbon(b,'receding surf',[coastPoint(a,41.7,36.7,-1.48),coastPoint(c,41.7,36.7,-1.48)],.065,'#d9e7d5');}
 }
 // Fine tonal stipples on untouched coast / lawns only, never on tile faces.
 const r=seed();for(let i=0;i<760;i++){
  const x=(r()-.5)*72,z=(r()-.5)*62;if(Math.abs(x)<23&&Math.abs(z)<19)continue;
  if((Math.abs(x)/38.2)**6+(Math.abs(z)/33.3)**6>.95)continue;
  if(Math.abs(Math.abs(x)-28.9)<1.4||Math.abs(Math.abs(z)-24)<1.4)continue;
  const p=palette[sector(x,z)],s=.055+r()*.095;b.tri([x-s,.254,z],[x+s,.254,z+s*.20],[x+.1,.254,z-s],p[1+i%2]);
 }
}
// Multi-ring sculpted mountains, directional strata and nested summits. Each
// ring has an asymmetric silhouette so the ridgelines never look like cones.
function relief(b,x,z,rx,rz,h,kind='green',phase=0){
 const colors=kind==='sand'?['#c69d68','#e4ba7e','#ecc993','#f0d5a0']:kind==='snow'?['#6b9183','#8da8a0','#92b4b2','#f4ead8']:kind==='cliff'?['#80948b','#88938c','#a8ae99','#b7c3a1']:['#628b72','#769b76','#99b78a','#a7c094'];
 const levels=kind==='sand'?[[1,0],[.94,.055],[.82,.20],[.69,.37],[.54,.57],[.39,.76],[.24,.91],[.09,.985],[.018,1]]:kind==='cliff'?[[1,0],[.95,.13],[.88,.28],[.78,.45],[.65,.69],[.46,.84],[.30,.95],[.12,.99],[.025,1]]:[[1,0],[.91,.10],[.74,.27],[.62,.43],[.47,.65],[.34,.81],[.21,.93],[.08,.985],[.018,1]],n=32;
 const rings=levels.map(([r,y],k)=>Array.from({length:n},(_,i)=>{const a=i*TAU/n,noise=1+(kind==='sand'?.10:.18)*Math.sin(a*3+phase)+(kind==='sand'?.06:.105)*Math.cos(a*5+k*.22+phase),crest=(kind==='sand'?.045:.13)*Math.sin(a*3+phase)*Math.sin(y*Math.PI)*r;return[x+rx*(Math.cos(a)*r*noise+.12*y),.25+h*(y+crest),z+rz*(Math.sin(a)*r*noise-.08*y)];}));
 const normals=rings.map((ring,j)=>ring.map((p,i)=>{const t=new pc.Vec3(...ring[(i+1)%n]).sub(new pc.Vec3(...ring[(i+n-1)%n])),r=new pc.Vec3(...rings[Math.min(j+1,levels.length-1)][i]).sub(new pc.Vec3(...rings[Math.max(0,j-1)][i]));const v=new pc.Vec3().cross(r,t).normalize();return [v.x,v.y,v.z];}));
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n,lo=rings[j],hi=rings[j+1],a=normals[j],c=normals[j+1],dye=colors[Math.min(3,kind==='sand'?(j<2?1:j<5?2:3):kind==='snow'?(j<2?0:j<4?1:j<5+(Math.sin(i*.68)>0?1:0)?2:3):kind==='cliff'?(j<2?0:j<5?1:j<7?2:3):(j<2?0:j<4?1:j<7?2:3))];b.smoothTri(lo[k],lo[i],hi[i],dye,a[k],a[i],c[i]);b.smoothTri(lo[k],hi[i],hi[k],dye,a[k],c[i],c[k]);}
 for(let i=0;i<n;i++)b.smoothTri(rings.at(-1)[(i+1)%n],rings.at(-1)[i],[x+rx*.12,.25+h*1.005,z-rz*.08],colors[3],normals.at(-1)[(i+1)%n],normals.at(-1)[i],[0,1,0]);
 b.features.push(kind+' sculpted multi-ridge summit');
 // Small ledges, lichen and rooted bushes sit on the calculated actual slope.
 if(kind!=='sand')for(let i=2;i<n;i+=7){const [px,py,pz]=rings[2+i%2][i];pebble(b,'mountain lichen boulder',px,py+.025,pz,.38,.14,.25,kind==='cliff'?'#b1ad98':'#889f88',10,5);if(kind==='green'&&i%2===0){shrub(b,px,pz,.46,py-.05,true);const [xx,yy,zz]=rings[1][(i+2)%n];tree(b,xx,zz,.63,'pine',yy-.07);}}
 // Overlay strips follow the exact same triangles as the sculpted surface;
 // a tiny normal offset prevents intersection/shimmer on thin mountain paths.
 const contour=(j,first,count,frac,w,dye)=>{for(let k=0;k<count;k++){const i=(first+k+n)%n,q=(i+1)%n;const point=(idx,t)=>rings[j][idx].map((v,d)=>v*(1-t)+rings[j+1][idx][d]*t+(d===1?.022:0));b.quad(point(q,frac),point(i,frac),point(i,frac+w),point(q,frac+w),dye);}};
 if(kind==='cliff')for(let j=2;j<=5;j++)contour(j,0,15,.22,.11,j%2?'#9cad98':'#c0b8a2');
 if(kind==='green')contour(1,Math.floor(phase*3),20,.60,.15,'#c2b994');
 if(kind==='sand')for(let i=0;i<3;i++)contour(2+i,5+i*2,8,.30,.048,'#dfbc88');
 return rings;
}
function rock(b,x,z,s,y=.25){pebble(b,'weathered rounded rock',x,y+s*.19,z,s*.65,s*.34,s*.48,'#a2a99a',9,5);pebble(b,'lichen on rock',x-s*.14,y+s*.39,z+s*.04,s*.26,s*.08,s*.17,'#a8b889',7,4);}
function shrub(b,x,z,s=.5,y=.25,flowers=false){for(let i=0;i<4;i++){const a=i*TAU/4;pebble(b,'layered leafy shrub',x+Math.cos(a)*s*.24,y+s*.28,z+Math.sin(a)*s*.23,s*.40,s*.36,s*.33,i%2?'#86ad81':'#678e72',8,5);if(flowers)pebble(b,'flower cluster',x+Math.cos(a)*s*.27,y+s*.60,z+Math.sin(a)*s*.23,s*.105,s*.10,s*.105,['#f3db98','#e7a6ad','#f4e5cb'][i%3],7,4);}}
function trunk(b,x,z,h,s=.1,y=.25,lean=.14){let p=[x,y,z];for(let i=1;i<=4;i++){const q=[x+lean*h*(i/4)**1.7,y+h*i/4,z+lean*h*.25*Math.sin(i*.7)];b.beam('curved tapering trunk',p,q,s*(1-.13*i),'#85664d');p=q;}return p;}
function tree(b,x,z,s=1,kind='leaf',y=.25){
 const [tx,ty,tz]=trunk(b,x,z,s*.96,s*.145,y,kind==='palm'?.26:.08);
 if(kind==='palm'){
  for(let i=0;i<7;i++){const a=i*TAU/7,dx=Math.cos(a),dz=Math.sin(a),v=[-dz,dx];let last=[tx,ty,tz];for(let k=1;k<=5;k++){const t=k/5,dist=s*.82*t,at=[tx+dx*dist,ty+s*(.35*Math.sin(t*Math.PI)-.30*t*t),tz+dz*dist],w=s*.16*Math.sin(t*Math.PI);const middle=[(last[0]+at[0])/2,(last[1]+at[1])/2+.025*s,(last[2]+at[2])/2];for(const side of [-1,1]){const tip=[middle[0]+v[0]*w*side+dx*.09*s,middle[1]-.045*s,middle[2]+v[1]*w*side+dz*.09*s];b.tri(last,middle,tip,side>0?'#7da36c':'#a0b86e');b.tri(middle,at,tip,side>0?'#7da36c':'#a0b86e');}b.beam('palm frond spine',last,at,.021*s,'#a6b97c');last=at;}}
  for(const d of [-1,1])pebble(b,'date cluster',tx+d*.12*s,ty-.07*s,tz,.11*s,.16*s,.105*s,'#b58251',8,5);return;
 }
 if(kind==='pine'||kind==='redwood'){
  for(let k=0;k<4;k++){const tall=kind==='redwood',h=y+s*((tall?.69:.53)+k*(tall?.32:.29)),r=s*((tall?.37:.46)-k*.072);b.cylinder('layered evergreen whorl',tx,h,tz,r,s*.62,k%2?'#759d7b':'#59886e',r*.08,12);for(let i=0;i<5;i++){const a=i*TAU/5+k*.6;pebble(b,'pine skirt bough',tx+Math.cos(a)*r*.58,h-.10*s,tz+Math.sin(a)*r*.58,r*.42,s*.15,r*.42,'#7ba386',8,4);}}return;
 }
 const pink=kind==='cherry',dyes=pink?['#dba6b3','#efbdc1','#f6d5d2']:['#6b9a72','#91b77f','#afd092'];
 for(let i=0;i<5;i++){const a=i*TAU/5,dx=Math.cos(a)*s*.35,dz=Math.sin(a)*s*.31; b.beam('forking bough',[tx,ty-.35*s,tz],[tx+dx,ty+.10*s,tz+dz],.075*s,'#987259');pebble(b,'round crown lobes',tx+dx,ty+.16*s,tz+dz,s*.36,s*.40,s*.34,dyes[i%3],10,6);}
 pebble(b,'upper luminous crown',tx,ty+.42*s,tz,s*.42,s*.40,s*.39,dyes[2],10,6);
}
function bamboo(b,x,z,s){for(let i=0;i<5;i++){const a=i*TAU/5,px=x+.25*s*Math.cos(a),pz=z+.25*s*Math.sin(a),h=s*(1.02+(i%3)*.19);const tip=[px+s*.12,.25+h,pz];b.beam('slender bamboo culm',[px,.25,pz],tip,.053*s,'#7f9f65');for(let k=1;k<=4;k++){const f=k/5,xx=px+s*.12*f,y=.25+h*f;b.cylinder('bamboo joint',xx,y,pz,.046*s,.035*s,'#b0c587',.046*s,8);if(k>=2)for(const side of [-1,1]){const end=[xx+side*.31*s,y+.13*s,pz+side*.13*s];b.tri([xx,y,pz],[end[0],end[1],end[2]],[xx+side*.18*s,y+.21*s,pz-side*.06*s],side<0?'#6b9d69':'#a6bb74');}}}}
function stones(b,points,y=.27){for(const [x,z] of points)softBox(b,'worn stepping paver',x,z,.54,.38,y,y+.055,.12,'#d2c5a6',.015);}
function ripples(b,x,z,scale,y,col='#d8e9d7'){for(let i=0;i<4;i++){const pts=Array.from({length:6},(_,k)=>[x+(k-2.5)*scale*.24,y,z+i*scale*.32+Math.sin(k*.9+i)*scale*.06]);ribbon(b,'water glints',pts,.045*scale,col);}}
function oasis(b,x,z){ellipse(b,'oasis limestone basin',x,z,3.25,2.05,.265,'#f0d5a2');ellipse(b,'shallow aqua spring',x,z,2.9,1.78,.28,'#8bc9b7');ellipse(b,'deep oasis water',x,z,2.35,1.34,.29,'#59aea9');ripples(b,x-.65,z-.5,1,.31);for(let i=0;i<6;i++){const a=i*TAU/6;const px=x+2.45*Math.cos(a),pz=z+1.48*Math.sin(a);disk(b,'lily pad',px,pz,.14,.315,'#7ca67e');if(i%2===0)pebble(b,'water lily',px,.375,pz,.11,.07,.11,'#efb8c4',8,5);}for(let k=0;k<9;k++){const a=k*TAU/9+.13,px=x+2.68*Math.cos(a),pz=z+1.62*Math.sin(a);if(k%3===0)rock(b,px,pz,.31,.27);else grassTuft(b,px,pz,.39,.29);}for(const [dx,dz,s] of [[-3,.5,1.3],[-2.5,-1.5,1.15],[2.8,-.8,1.4],[2.9,1.3,1.05]])tree(b,x+dx,z+dz,s,'palm');}
function tent(b,x,z,s){softBox(b,'woven camp mat',x,z,2*s,1.7*s,.255,.29,.10,'#c79870',.013);b.gable('canvas traveler tent',x,.29,z,1.55*s,.88*s,1.35*s,'#e9d0a4');b.tri([x-.47*s,.30,z+.685*s],[x+.47*s,.30,z+.685*s],[x,.99*s+.20,z+.685*s],'#886951');for(const side of [-1,1])line(b,'tent guy ropes',[[x+side*.54*s,.74*s+.29,z],[x+side*1.02*s,.30,z+1*s]],.035*s,'#aa845f');b.beam('tent ridge',[x,.29+.88*s,z-.72*s],[x,.29+.88*s,z+.72*s],.09*s,'#c5a477');}
function lamp(b,x,z,y=.30,s=.7){b.cylinder('cast lamp plinth',x,y+.06*s,z,.15*s,.12*s,C.stone,.12*s,10);b.cylinder('tapered lamp post',x,y+.51*s,z,.045*s,.88*s,C.ink,.025*s,8);softBox(b,'enamel lamp cage',x,z,.23*s,.23*s,y+.90*s,y+1.18*s,.05*s,'#e7d49b',.023*s);b.cylinder('cast lamp crown',x,y+1.23*s,z,.17*s,.1*s,C.ink,.075*s,8);}
function bench(b,x,z,y=.31){for(const dx of [-.50,.50])b.box('iron bench legs',[x+dx,y+.16,z],[.10,.32,.38],C.ink);for(let i=0;i<3;i++)b.box('timber bench seat',[x,y+.34,z+(i-1)*.13],[1.35,.075,.103],C.wood);for(let i=0;i<2;i++)b.box('timber bench back',[x,y+.50+i*.13,z-.23],[1.35,.095,.08],C.wood);}
function fountain(b,x,z,s=1,y=.27){b.cylinder('fountain stone footing',x,y+.09*s,z,1.12*s,.18*s,C.stone,1.03*s,28);b.cylinder('rounded fountain coping',x,y+.23*s,z,.99*s,.12*s,C.cream,1.04*s,28);disk(b,'turquoise fountain basin',x,z,.90*s,y+.30*s,'#77bdb5');b.cylinder('sculpted fountain stem',x,y+.55*s,z,.20*s,.50*s,C.stone,.11*s,12);b.cylinder('upper carved bowl',x,y+.80*s,z,.18*s,.17*s,C.cream,.52*s,24);disk(b,'upper fountain pool',x,z,.47*s,y+.89*s,'#8fc8bf');for(let i=0;i<6;i++){const a=i*TAU/6;const pts=Array.from({length:6},(_,k)=>{const t=k/5;return[x+Math.cos(a)*s*.77*t,y+s*(.94+.40*Math.sin(t*Math.PI)-.64*t),z+Math.sin(a)*s*.77*t]});line(b,'arched fountain streams',pts,.034*s,'#e0e8d7');}}
function harborLight(b,x,z,s=1,y=.25){b.cylinder('lighthouse stone quay',x,y+.12*s,z,.50*s,.24*s,C.stone,.46*s,16);for(let i=0;i<5;i++){const r=(.28-i*.026)*s;b.cylinder('painted lighthouse masonry',x,y+(.40+i*.28)*s,z,r,.28*s,i%2?'#f0e2c8':'#c66b5b',r-.025*s,16);}b.cylinder('lantern balcony',x,y+1.69*s,z,.33*s,.1*s,C.cream,.33*s,16);b.cylinder('sea beacon glazing',x,y+1.88*s,z,.20*s,.30*s,'#9fd1cb',.20*s,12);for(let i=0;i<8;i++){const a=i*TAU/8;b.beam('lantern mullion',[x+.21*s*Math.cos(a),y+1.73*s,z+.21*s*Math.sin(a)],[x+.21*s*Math.cos(a),y+2.04*s,z+.21*s*Math.sin(a)],.025*s,C.ink);}b.cylinder('red domed beacon roof',x,y+2.05*s,z,.31*s,.20*s,'#b66055',.035*s,16);}
function balloon(b,x,z,s,y=.25){pebble(b,'fabric balloon envelope',x,y+2.42*s,z,.60*s,.80*s,.60*s,'#dfac78',16,10);for(let i=0;i<8;i++){const a=i*TAU/8,pts=Array.from({length:11},(_,k)=>{const t=-Math.PI/2+Math.PI*k/10;return[x+.605*s*Math.cos(t)*Math.cos(a),y+2.42*s+.80*s*Math.sin(t),z+.605*s*Math.cos(t)*Math.sin(a)]});line(b,'sewn balloon gore',pts,.025*s,i%2?'#f1d79b':'#c98478');}softBox(b,'woven wicker gondola',x,z,.34*s,.34*s,y+1.26*s,y+1.55*s,.06*s,C.wood,.025*s);for(const sx of [-1,1])for(const sz of [-1,1])b.beam('balloon suspension cords',[x+sx*.14*s,y+1.52*s,z+sz*.14*s],[x+sx*.22*s,y+1.91*s,z+sz*.22*s],.022*s,'#8f765d');}
function pier(b,x,z){softBox(b,'rounded plank pier deck',x,z,5.5,2.15,.20,.34,.18,'#937657',.065);for(let i=0;i<20;i++)b.box('wood quay plank',[x+(i-9.5)*.265,.375,z],[.246,.08,1.98],i%2?'#ac8c65':'#c3a17a');for(const dx of [-2.35,-.70,.9,2.35])for(const dz of [-.80,.80]){b.cylinder('pier timber piling',x+dx,-.58,z+dz,.13,1.72,'#856b53',.13,10);b.cylinder('iron mooring post',x+dx,.51,z+dz,.07,.28,C.ink,.07,8);b.cylinder('mooring cap',x+dx,.66,z+dz,.105,.055,C.cream,.09,10);}}
function boat(scene,parent,name,x,z,angle,large=false){const g=group(scene,name,parent),b=g.b,s=large?1.1:.7;g.root.setLocalPosition(x,-1.46,z);g.root.setLocalEulerAngles(0,angle,0); // hull points towards +z
 const shape=[[-.47,-.82],[.47,-.82],[.62,-.35],[.57,.56],[.29,1.02],[0,1.19],[-.29,1.02],[-.57,.56],[-.62,-.35]];
 for(let i=0;i<shape.length;i++){const [px,pz]=shape[i],[qx,qz]=shape[(i+1)%shape.length];b.quad([px*s*.79,-.14*s,pz*s*.87],[qx*s*.79,-.14*s,qz*s*.87],[qx*s,.2*s,qz*s],[px*s,.2*s,pz*s],'#426f80');b.tri([0,.22*s,0],[qx*s,.22*s,qz*s],[px*s,.22*s,pz*s],'#e4c59b');b.beam('painted gunwale',[px*s,.23*s,pz*s],[qx*s,.23*s,qz*s],.085*s,C.cream);}
 if(large){for(let k=0;k<2;k++){const y=(.22+k*.30)*s;softBox(b,'rounded ferry deck cabin',0,-.13*s,(.93-k*.24)*s,(1.27-k*.31)*s,y,y+.26*s,.12*s,'#f2e4cd',.04*s);for(const side of [-1,1])for(let i=0;i<5-k;i++)b.box('cabin blue glazing',[side*(.46-k*.12)*s,y+.14*s,(-.62+i*.23)*s],[.027*s,.115*s,.14*s],'#79a5b1');}b.cylinder('red ferry funnel',0,.94*s,-.33*s,.14*s,.30*s,'#c87960',.115*s,12);b.cylinder('dark funnel lip',0,1.11*s,-.33*s,.129*s,.07*s,C.ink,.125*s,12);}
 else{b.beam('wooden sailboat mast',[0,.24*s,.05*s],[0,1.70*s,.05*s],.055*s,C.wood);b.tri([0,1.67*s,.07*s],[0,.34*s,.04*s],[.72*s,.34*s,-.45*s],'#f6e9c9');b.tri([0,1.34*s,.08*s],[0,.33*s,.08*s],[-.52*s,.33*s,.81*s],'#d89f79');b.beam('boom spar',[0,.33*s,.03*s],[.73*s,.32*s,-.46*s],.04*s,C.wood);}
 for(const side of [-1,1])line(b,'white bow wake',[[side*.24*s,.02,1.30*s],[side*.74*s,.02,.46*s],[side*.92*s,.02,-.8*s],[side*.62*s,.02,-2.45*s]],.09*s,'#e0eadd');
 finish(g);(scene.worldVessels??=[]).push({root:g.root,x,z,angle,routeAngle:Math.atan2(z/39,x/44),phase:scene.worldVessels.length*1.6});return g.root;
}
export function updateWorldVessels(scene,time,reduced){for(const v of scene.worldVessels||[]){const a=v.routeAngle+(reduced?0:time*.0105),p=coastPoint(a,44,39,-1.46+(reduced?0:.018*Math.sin(time*.85+v.phase))),q=coastPoint(a+.002,44,39,p[1]);v.root.setLocalPosition(...p);v.root.setLocalEulerAngles(0,Math.atan2(q[0]-p[0],q[2]-p[2])*180/Math.PI,0);}}
function zone(scene,name){const g=group(scene,'R193 biome '+name);(scene.environmentZones??={})[name]=g.root;return g;}
function grassTuft(b,x,z,s,y=.25){for(let i=0;i<5;i++){const a=i*TAU/5,dx=Math.cos(a),dz=Math.sin(a);b.tri([x-dz*s*.055,y,z+dx*s*.055],[x+dz*s*.055,y,z-dx*s*.055],[x+dx*s*.38,y+s*(.23+.14*Math.sin(i*2)),z+dz*s*.38],i%2?'#83a67a':'#a7be89');}}
function curvedTrail(b,pts){for(let k=1;k<pts.length;k++){const [x,z]=pts[k-1],[xx,zz]=pts[k],dx=xx-x,dz=zz-z,len=Math.hypot(dx,dz),nx=-dz/len*.27,nz=dx/len*.27;b.quad([x+nx,.267,z+nz],[xx+nx,.267,zz+nz],[xx-nx,.267,zz-nz],[x-nx,.267,z-nz],'#d0ba97');}}
function coastalExtras(scene,g,x,z,angle){const b=g.b;for(let i=0;i<5;i++){const a=i*.9+angle;rock(b,x+Math.cos(a)*1.6,z+Math.sin(a)*.7,.65+i*.09,-1.60);} }
export function buildWorldEnvironment(scene){
 const south=zone(scene,'south'),s=south.b;
 for(const [x,z,rx,rz,h,p] of [[-27,28.8,4.8,2.8,1.38,2],[-15,30.0,4.8,2.6,1.0,5],[5.0,29.8,5.2,2.6,1.44,1],[14.1,29.5,4.5,2.6,.95,3],[27.3,29,3.9,2.7,1.46,4]])relief(s,x,z,rx,rz,h,'sand',p);
 oasis(s,-5.8,29);tent(s,20.7,28,1.05);tent(s,23.0,30,.83);for(const [x,z] of [[19.3,30],[24.6,28.5],[20.9,31.4]]){rock(s,x,z,.42);grassTuft(s,x+.37,z,.42);} for(const [x,z] of [[-31,27],[-20,26.8],[10,26.7],[17,32],[30,27]]){tree(s,x,z,1.2,'palm');rock(s,x+.8,z+.5,.5);}
 curvedTrail(s,Array.from({length:72},(_,i)=>[-29+i*.79,26.15+.25*Math.sin(i*.24)]));stones(s,Array.from({length:25},(_,i)=>[-28+i*2.15,26.15+.25*Math.sin(i*.65)]));for(let i=0;i<12;i++){const x=-30+i*5.3;shrub(s,x,25.93,.27,.25,i%3===0);}for(const x of [-25,14,30])ripples(s,x,37.6,1,-1.48);finish(south);
 const west=zone(scene,'west'),w=west.b;
 for(const [x,z,rx,rz,h,p] of [[-34,-21,3.8,5.6,2.6,2],[-35,-13,3.1,4.5,2.35,4],[-34,-8,3.6,3.5,2.2,3],[-34,11.9,3.7,3.6,2.45,5],[-34,19,3.6,5,1.75,6]])relief(w,x,z,rx,rz,h,'green',p);
 // Terraces are carved into the lower forest edge, each retaining face visible.
 for(let k=0;k<5;k++){const x=-35.65+k*.86,y=.27+k*.25,depth=6.0-k*.17;softBox(w,'curved terraced stone wall',x,1.0,1.16,depth,.25,y+.035,.28,'#9e987e',.055);softBox(w,'terrace planted cap',x,1.0,1.09,depth-.12,y+.03,y+.085,.22,'#96b989',.018);for(let j=0;j<11;j++){const z=1.0-depth*.40+j*depth*.08;w.box('terrace stone mortar',[x-.585,y-.07,z],[.012,.12,.023],'#bdb298');for(const dx of [-.31,.05,.36])pebble(w,'terrace leaf crop',x+dx,y+.14,z,.14,.095,.12,j%2?'#91b37c':'#7b9e73',7,4);}}
 for(let i=0;i<10;i++){const z=-20+i*4.6;const x=-31.4+.28*Math.sin(i*1.6);if(i%3===0)bamboo(w,x,z,1.0);else tree(w,x,z,1.15,i%2?'pine':'leaf');rock(w,x-.55,z+.85,.58);shrub(w,x+.1,z-1,.42,.25,true);}
 harborLight(w,-34,23,.83);curvedTrail(w,Array.from({length:55},(_,i)=>[-30.78-.22*Math.sin(i*.35),-22+i*.82]));stones(w,Array.from({length:27},(_,i)=>[-30.78-.22*Math.sin(i*.9),-22+i*1.72]));coastalExtras(scene,west,-40,-5,1);finish(west);
 const north=zone(scene,'north'),n=north.b;
 for(const [x,z,rx,rz,h,k,p] of [[-27,-29,4.8,3.4,2.65,'snow',3],[-20,-30.3,4.1,2.75,2.1,'snow',5],[-12,-29.7,4.1,2.7,1.55,'green',4],[10,-29.6,5.6,2.6,1.6,'green',3],[19,-30.1,4.6,2.5,1.8,'green',5],[29,-28.5,3.4,3,1.6,'green',6]])relief(n,x,z,rx,rz,h,k,p);
 for(let i=0;i<10;i++){const x=-29+i*6.15,z=-26.64-.18*Math.cos(i);tree(n,x,z,1.20,i<5?'cherry':'pine');shrub(n,x+.9,z,.46,.25,true);}
 softBox(n,'European garden stone terrace',-.1,-29.6,9.2,5.9,.25,.34,.68,'#cfc0a0',.055);for(let r=0;r<7;r++)for(let c=0;c<12;c++){const x=-4.06+c*.72,z=-31.93+r*.72;softBox(n,'hand-set garden ashlar',x,z,.68,.68,.341,.365,.075,['#d8c9aa','#e0d3b8','#c7bd9f'][(r*7+c)%3],.009);}
 fountain(n,0,-29.5,1.25,.37);for(const x of [-3.5,3.5])for(const z of [-31.4,-27.7]){shrub(n,x,z,.66,.36,true);lamp(n,x+.65,z,.36,.65);}bench(n,-2.3,-29.55,.36);bench(n,2.3,-29.55,.36);balloon(n,17,-32.0,.78);balloon(n,-17,-31.6,.60);curvedTrail(n,Array.from({length:72},(_,i)=>[-29+i*.79,-25.92+.12*Math.sin(i*.34)]));stones(n,Array.from({length:27},(_,i)=>[-28+i*2.15,-25.92]));finish(north);
 const east=zone(scene,'east'),e=east.b;
 for(const [x,z,rx,rz,h,p] of [[34,-19,3.6,4.5,2.45,3],[35,-12.5,3.5,4.5,2.9,6],[34,-4,3.9,5.4,2.5,4],[34,5.5,3.6,4.2,1.8,2],[34,19.3,3.8,4.4,1.6,5]])relief(e,x,z,rx,rz,h,z<0?'green':'cliff',p);
 for(let i=0;i<10;i++){const z=-21+i*4.5,x=31.5+.35*Math.sin(i);tree(e,x,z,1.22,i%3===0?'leaf':'redwood');shrub(e,x-.45,z+1,.4,.25,true);rock(e,x+.45,z-.70,.55);}
 for(let i=0;i<5;i++)rock(e,38.1+(i%2)*.6,-13+i*5.5,1.1,-.25);pier(e,39.1,12.5);harborLight(e,36.8,16.2,.92);curvedTrail(e,Array.from({length:55},(_,i)=>[30.8+.19*Math.sin(i*.4),-22+i*.82]));stones(e,Array.from({length:27},(_,i)=>[30.8+.19*Math.sin(i),-22+i*1.75]));coastalExtras(scene,east,41,17,2);finish(east);
 // Four additional low botanical borders, at the perimeter but not in the playing lane.
 const edges=group(scene,'R193 coastal groundcover');const g=edges.b;for(let i=0;i<24;i++){const x=-28+i*2.4;if(i%3===0){shrub(g,x,23.0,.34,.25,true);shrub(g,x,-23.0,.39,.25,true);}if(i%4===0){rock(g,x,21.4,.33);rock(g,x,-21.4,.40);}}for(let i=0;i<18;i++){const z=-19+i*2.2;if(i%2===0){shrub(g,-27.0,z,.42,.25,true);shrub(g,27.0,z,.42,.25,true);}}const random=seed();for(let i=0;i<360;i++){const side=i%4,x=side<2?(random()-.5)*54:(side===2?-1:1)*(24.0+random()*3.0),z=side<2?(side===0?1:-1)*(20.6+random()*2.1):(random()-.5)*39; // narrow ornamental margins kept behind landmark plinths
 if(side<2&&[-16.57,-11.04,-5.52,0,5.52,11.04,16.57].some(v=>Math.abs(v-x)<.62))continue;
 if(side>=2&&[-13.41,-6.70,0,6.70,13.41].some(v=>Math.abs(v-z)<.62))continue;
 if(side===0){if(i%3===0)pebble(g,'desert gravel',x,.265,z,.095,.04,.065,'#c3a278',7,4);}else{grassTuft(g,x,z,.28+random()*.27);if(i%11===0)shrub(g,x,z,.28,.25,true);}}
 finish(edges);
 // Separate baked vessel roots keep the moving ocean details inexpensive.
 const sea=group(scene,'R193 ring shipping lanes');scene.environmentSea=sea.root;const b=sea.b;
 for(let i=0;i<28;i++){const a=i*TAU/28,mid=coastPoint(a,44,39,-1.45),next=coastPoint(a+.07,44,39,-1.45);ribbon(b,'dashed sea route inlay',[mid,next],.12,'#b6d8ca');if(i%4===0){const [x,y,z]=coastPoint(a,43,38,-1.36);b.cylinder('navigation float',x,y,z,.21,.24,i%8?'#dd9d69':'#e7e0c6',.15,12);b.cylinder('buoy light mast',x,y+.27,z,.055,.32,C.ink,.045,8);disk(b,'buoy lamp',x,z,.13,y+.45,'#f4db96');}}
 for(let i=0;i<22;i++){const a=i*TAU/22+.05,[x,,z]=coastPoint(a,47,42,-1.46);ripples(b,x,z,.70,-1.45,'#a9d9d0');}
 finish(sea);for(const [name,x,z,a,l] of [['south sailboat',-12,39,90,false],['south passenger ferry',20,39,-90,true],['west sailboat',-44,5,0,false],['north ferry',-9,-39,90,true],['east sailboat',44,-12,180,false],['east passenger ferry',44,19,0,true]])boat(scene,sea.root,'R193 '+name,x,z,a,l);
 // Small cloudlets stay beyond the island silhouette, away from board labels.
 const clouds=group(scene,'R193 distant clouds');for(const [x,z,y] of [[-45,-35,3.3],[45,-35,3.6],[-45,35,3.2],[45,35,3.6]])for(let i=0;i<4;i++)pebble(clouds.b,'soft cloud lobes',x+(i-1.5)*.78,y+(i%2)*.18,z,.86,.35+.13*(i%2),.68,'#e4efdf',10,6);finish(clouds);
}
// Inlaid inner plazas and low street furniture, clear of the pedestrian loop.
export function refineInnerPlazas(scene,b){
 for(const [x,z,tone] of [[-7.35,1.65,'#b8c99d'],[0,1.80,'#d3bd93'],[7.35,1.65,'#a6c7be']]){
  const w=x===0?2.8:2.05,d=1.42;softBox(b,'district stone plaza edging',x,z,w,d,.251,.283,.25,'#d9c9ab',.018);
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){const px=x+(col-2)*w/5,pz=z+(row-1)*d/3;softBox(b,'district hand-set paving',px,pz,w/5-.025,d/3-.025,.284,.305,.045,(row+col)%3===0?'#e0d1b7':tone,.008);}
  if(x!==0){bench(b,x,z+.38,.31);shrub(b,x-.76,z-.38,.30,.30,true);shrub(b,x+.76,z-.38,.30,.30,true);}else{for(const dx of [-1.04,1.04]){lamp(b,x+dx,z,.31,.54);shrub(b,x+dx,z+.39,.28,.31,true);}}
 }
 // Stone joints and edge studs on the wide inner promenade; no visual change to tile faces.
 for(const z of [-7,0,7])for(let x=-14;x<=14;x+=.66){if([-10,0,10].some(i=>Math.abs(i-x)<1.3))continue;for(const side of [-1,1])b.box('sidewalk stone joint',[x,.350,z+side*.95],[.025,.008,.45],'#bbaa90');}
 for(const x of [-10,0,10])for(let z=-11;z<=11;z+=.66){if([-7,0,7].some(i=>Math.abs(i-z)<1.3))continue;for(const side of [-1,1])b.box('sidewalk stone joint',[x+side*.95,.350,z],[.45,.008,.025],'#bbaa90');}
 for(const [x,z] of [[-9,5.9],[-11,-5.9],[9,-5.9],[11,5.9],[-1.05,6],[1.05,-6]])lamp(b,x,z,.35,.62);
}
