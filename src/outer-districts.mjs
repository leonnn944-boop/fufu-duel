import * as pc from '../vendor/playcanvas.min.mjs';
import {Builder} from './landmark-models.mjs';

export const OUTER_DISTRICTS=Object.freeze({46:'tram-bakery',52:'library-bookshop',77:'market-hall',83:'arcade-homes',37:'warehouse-studios',39:'clinic-cycle-cafe'});
const C={cream:'#f2dfb4',stone:'#a8b9ac',glass:'#568b9b',light:'#a8d9d7',iron:'#345467',wood:'#a87b58',leaf:'#79a88a',brick:'#bb7860',slate:'#4c6979',gold:'#e9bd70'};
function window(b,x,y,z,w=.85,h=1.12){b.box('recessed window',[x,y,z],[w+.16,h+.16,.09],C.cream);b.box('blue window',[x,y,z+.055],[w,h,.04],C.glass);b.box('window mullion',[x,y,z+.08],[.055,h,.035],C.cream);b.box('window sill',[x,y-h/2-.07,z+.13],[w+.25,.12,.24],C.cream);}
function glazing(b,x,y,z,w,h){b.box('shop glazing',[x,y,z],[w,h,.08],C.glass);for(const t of [-.5,0,.5])b.box('shop glazing frame',[x+t*w,y,z+.06],[.065,h+.08,.07],C.cream);b.box('shop transom',[x,y+.25,z+.06],[w,.065,.07],C.cream);}
function awning(b,x,y,z,w,d,color){for(let i=0;i<8;i++){b.box('striped shop awning',[x-w/2+(i+.5)*w/8,y,z],[w/8,.12,d],i%2?C.cream:color);b.box('awning valance',[x-w/2+(i+.5)*w/8,y-.17,z+d/2],[w/8,.32,.06],i%2?C.cream:color);}}
function bench(b,x,z){b.box('street bench slatted seat',[x,.5,z],[1.35,.12,.45],C.wood);b.box('street bench back',[x,.88,z-.2],[1.35,.58,.09],C.wood);for(const dx of [-.5,.5])b.box('bench legs',[x+dx,.23,z],[.1,.48,.35],C.iron);}
function planter(b,x,z,w=.8){b.box('sidewalk planter',[x,.25,z],[w,.5,.58],C.stone);for(const dx of [-.25,0,.25])b.box('trimmed street shrub',[x+dx,.62,z],[w*.37,.4,.48],C.leaf);}
function lamp(b,x,z){b.cylinder('street lamp',x,1.1,z,.055,2.2,C.iron);b.box('lamp shade',[x,2.24,z],[.4,.13,.4],C.gold);b.box('lamp light',[x,2.07,z],[.24,.22,.24],C.cream);}
function pavement(b){b.box('retained parcel sidewalk',[0,.035,0],[8.5,.07,8.5],'#aab5a4');for(const x of [-3,-1,1,3])b.box('paving joints',[x,.075,3.2],[.025,.012,1.8],'#879b93');}
function sideWindows(b,x,z,levels,depth){for(const y of levels)for(const dz of [-depth*.3,depth*.3]){b.box('side window surround',[x,y,z+dz],[.08,.98,.8],C.cream);b.box('side blue window',[x+Math.sign(x)*.06,y,z+dz],[.035,.82,.63],C.glass);}}
function tram(b){
  b.box('depot brick hall',[-.85,1.65,-.7],[4.7,3.3,4.7],C.brick);
  for(const x of [-2.38,-.85,.68]){b.gable('sawtooth depot roof',x,3.32,-.7,1.55,.78,4.9,C.slate);b.box('roof clerestory', [x,3.59,1.77],[1.05,.36,.035],C.light);b.arch('depot tram portal',x,.1,1.68,1.16,2.65,C.glass,C.cream);}
  for(const x of [-2.65,-2.1,-1.12,-.57,.41,.96])b.box('tram rail in courtyard',[x,.085,2.6],[.045,.018,1.8],C.iron);
  b.box('bakery corner tower',[2.65,2.45,-.65],[1.85,4.9,3.9],'#e2bd79');b.frustum('bakery hipped roof',2.65,5.28,-.65,2.15,.9,.75,4.2,2.6,C.slate);
  window(b,2.65,3.8,1.32,1.05,1.15);glazing(b,2.65,1.35,1.34,1.42,1.95);awning(b,2.65,2.46,1.86,2,.95,'#c87459');
  b.box('clock housing',[2.65,4.87,1.44],[.8,.8,.12],C.cream);b.box('clock hands',[2.65,4.96,1.52],[.04,.3,.025],C.iron);b.box('clock hands',[2.76,4.84,1.52],[.25,.04,.025],C.iron);
  b.box('bakery hanging sign',[3.67,2.9,1.27],[.1,.65,.72],C.wood);for(const z of [1.07,1.27,1.47])b.box('bread loaf icon',[3.735,2.92,z],[.035,.21,.16],C.gold);
  sideWindows(b,-3.21,-.7,[1.6,2.7],4.7);bench(b,-2.7,3.65);planter(b,2.9,3.25);lamp(b,-3.8,3.7);
}
function library(b){
  b.box('civic library main wing',[-.7,2.55,-.6],[5.15,5.1,4.65],'#b5ccc1');b.box('library cornice',[-.7,5.12,-.6],[5.43,.18,4.9],C.cream);b.box('roof parapet',[-.7,5.48,-2.85],[5.4,.56,.18],C.stone);
  for(const x of [-2.4,-.7,1]){b.arch('reading room arch',x,2.85,1.76,1.15,1.8,C.glass);b.arch('street arcade arch',x,.14,1.78,1.23,2.35,C.iron);b.box('arcade pier',[x-.72,1.27,2],[.2,2.5,.46],C.cream);}
  b.box('library entry steps',[-.7,.14,2.35],[4.6,.27,.8],C.cream);b.box('library open book left',[-.94,5.5,1.77],[.45,.55,.1],C.gold);b.box('library open book right',[-.45,5.5,1.77],[.45,.55,.1],C.gold);b.box('book spine',[-.7,5.5,1.85],[.045,.65,.05],C.wood);
  b.box('bookshop annex',[2.65,1.7,-.55],[1.7,3.4,4.45],C.brick);glazing(b,2.65,1.35,1.72,1.4,2.15);awning(b,2.65,2.65,2.06,1.95,.9,C.leaf);
  b.box('roof garden terrace',[2.65,3.48,-.55],[1.9,.14,4.55],C.cream);for(const x of [1.78,3.52])for(const z of [-2.6,1.6])b.box('terrace railing posts',[x,3.85,z],[.06,.7,.06],C.iron);for(const x of [1.78,3.52])b.box('terrace railing',[x,4.16,-.55],[.05,.05,4.25],C.iron);b.box('terrace bench',[2.65,3.76,-1.7],[1.25,.4,.48],C.wood);
  b.box('book display trolley',[2.85,.48,3.35],[1,.8,.45],C.wood);for(let i=0;i<5;i++)b.box('display book spine',[2.45+i*.18,.87,3.59],[.12,.4,.08],[C.cream,C.brick,C.light][i%3]);sideWindows(b,-3.3,-.6,[1.4,3.6],4.65);bench(b,-2.5,3.6);lamp(b,-3.8,3.7);
}
function market(b){
  b.box('market hall base',[0,1.75,-.75],[6.5,3.5,4.7],'#d9c08c');b.gable('market glazed pitched roof',0,3.5,-.75,6.9,1.65,5.05,C.slate);
  for(const x of [-2.1,-.7,.7,2.1]){b.box('market front clerestory',[x,3.58,1.8],[1.15,.62,.04],C.light);b.box('market slender structural post',[x-.65,1.75,1.67],[.15,3.5,.22],C.cream);}
  for(const [x,color] of [[-2.15,'#d17767'],[0,'#6d9e8a'],[2.15,'#c8a95f']]){glazing(b,x,1.55,1.7,1.85,2.2);awning(b,x,2.7,2.32,2.08,1.35,color);b.box('market stall counter',[x,.63,2.75],[1.8,1.1,.65],C.wood);for(const dx of [-.58,0,.58]){b.box('produce crate',[x+dx,1.25,2.72],[.5,.19,.48],C.gold);b.cylinder('produce display',x+dx,1.41,2.72,.18,.18,dx===0?'#d97e56':C.leaf,.13,6);}}
  b.box('market roof lantern',[0,5.22,-.75],[1.25,.6,4.1],C.light);b.gable('roof lantern cap',0,5.52,-.75,1.55,.35,4.35,C.slate);for(const z of [-2.2,-.75,.7])b.box('lantern ribs',[0,5.23,z],[1.3,.66,.08],C.cream);
  b.box('market side loading hatch',[-3.3,1.25,-.6],[.08,2.1,2.5],C.wood);for(const z of [-1.45,-.6,.25])b.box('loading hatch frame',[-3.36,1.25,z],[.06,2.2,.08],C.iron);planter(b,-3.5,3.4,.55);lamp(b,3.75,3.65);
}
function homes(b){
  const fronts=[{x:-2.4,h:4.4,color:'#c58573'},{x:0,h:5.8,color:'#d7c594'},{x:2.4,h:4.95,color:'#8bb7ab'}];
  for(const [i,{x,h,color}] of fronts.entries()){b.box('individual townhouse',[x,h/2,-.7],[2.18,h,4.65],color);b.box('house stringcourse',[x,2.4,-.7],[2.28,.13,4.74],C.cream);if(i===0)b.gable('steep townhouse roof',x,h,-.7,2.4,1.3,4.9,C.slate);else if(i===1)b.frustum('mansard roof',x,h+.45,-.7,2.4,1.55,.9,4.9,3.65,C.slate);else{b.box('roof terrace',[x,h+.09,-.7],[2.35,.18,4.8],C.cream);b.box('roof solar panel',[x,h+.3,-1],[1.55,.15,2.2],C.glass);}
    b.arch('arcade shop opening',x,.12,1.69,1.55,2.13,C.glass);for(const dx of [-1.05,1.05])b.box('arcade columns',[x+dx,1.23,2],[.16,2.46,.55],C.cream);b.box('continuous arcade canopy',[x,2.42,2],[2.4,.18,1.25],C.cream);
    for(const y of [3.25,4.85].filter(y=>y<h-.5))window(b,x,y,1.68,1.15,1.08);b.box('balcony base',[x,2.68,2.04],[1.65,.12,.7],C.cream);for(const dx of [-.72,-.36,0,.36,.72])b.box('balcony balusters',[x+dx,3,2.35],[.045,.58,.045],C.iron);b.box('balcony handrail',[x,3.3,2.35],[1.6,.06,.06],C.iron);
  }
  b.box('corner cafe sign',[2.4,1.9,2.71],[.75,.5,.08],C.wood);b.box('cup sign icon',[2.4,1.9,2.77],[.3,.24,.03],C.cream);b.box('cup handle',[2.6,1.92,2.77],[.1,.14,.03],C.cream);b.cylinder('cafe table',2.6,.76,3.55,.46,.1,C.wood);b.cylinder('table stem',2.6,.4,3.55,.05,.7,C.iron);for(const x of [1.85,3.35])b.box('cafe chair',[x,.45,3.5],[.48,.75,.48],C.stone);planter(b,-2.6,3.6,1.2);sideWindows(b,-3.52,-.7,[1.4,3.35],4.6);
}
function studios(b){
  b.box('warehouse brick volume',[-.65,2.45,-.6],[5.4,4.9,4.8],C.brick);b.gable('warehouse pitched roof',-.65,4.9,-.6,5.7,1.35,5.05,C.slate);
  for(const [w,y] of [[5.65,5],[4.3,5.35],[2.8,5.7],[1.15,6.05]])b.box('stepped warehouse gable',[-.65,y,1.98],[w,.38,.19],C.brick);
  for(const x of [-2.4,-.65,1.1]){window(b,x,3.65,1.87,1.15,1.48);glazing(b,x,1.45,1.87,1.38,1.95);}
  b.box('loading dock platform',[-.65,.3,2.4],[5.7,.6,1],C.stone);b.box('loading dock step',[-.65,.15,3.03],[2,.3,.4],C.cream);b.box('workshop lifting beam',[-.65,4.85,2.57],[.2,.2,1.25],C.iron);b.box('hoist rope',[-.65,3.98,3.12],[.04,1.7,.04],C.iron);
  b.box('glass artist annex',[2.9,1.9,-.7],[1.45,3.8,4.5],C.light);for(const z of [-2.8,-1.4,0,1.4])b.box('annex glass mullions',[3.67,1.9,z],[.07,3.8,.07],C.iron);b.box('annex green roof',[2.9,3.87,-.7],[1.65,.14,4.7],C.leaf);
  b.cylinder('rooftop water tank',.6,5.75,-1.65,.65,1.3,C.wood);for(const y of [5.25,6.25])b.cylinder('tank steel hoop',.6,y,-1.65,.68,.08,C.iron);b.cylinder('tank cap',.6,6.47,-1.65,.73,.15,C.slate,.2);
  b.box('artist easel canvas',[2.7,1.1,3.1],[.65,.8,.09],C.cream);for(const dx of [-.34,.34])b.beam('easel feet',[2.7+dx,0,3.2],[2.7+dx*.6,1.6,3.02],.06,C.wood);b.box('painting color study',[2.7,1.12,3.16],[.4,.5,.025],C.light);bench(b,-2.5,3.7);sideWindows(b,-3.4,-.6,[1.5,3.65],4.7);
}
function clinic(b){
  b.box('community clinic tower',[-1.4,3.2,-.7],[3.65,6.4,4.65],'#c7d6cb');b.box('clinic horizontal canopy',[-1.4,2.3,1.9],[4,.2,1.25],C.light);b.box('clinic roof ledge',[-1.4,6.45,-.7],[3.9,.18,4.9],C.cream);
  for(const y of [3.3,4.85])for(const x of [-2.35,-.45])window(b,x,y,1.7,1.14,.98);glazing(b,-1.4,1.1,1.7,2.8,1.95);
  b.box('clinic cross vertical',[-1.4,5.95,1.85],[.24,.95,.12],'#ce7a71');b.box('clinic cross horizontal',[-1.4,5.95,1.85],[.9,.24,.12],'#ce7a71');
  b.box('cycle cafe low wing',[2.2,1.55,-.7],[3,3.1,4.65],'#e2ba7d');glazing(b,2.2,1.35,1.7,2.5,2.2);awning(b,2.2,2.6,2.06,3.1,1.1,C.leaf);b.box('cycle cafe rooftop deck',[2.2,3.18,-.7],[3.15,.15,4.8],C.wood);
  for(const x of [.8,3.6])for(const z of [-2.9,1.45])b.box('rooftop pergola posts',[x,3.95,z],[.12,1.5,.12],C.cream);for(const z of [-2.9,-1.8,-.7,.4,1.45])b.box('pergola roof slats',[2.2,4.7,z],[3.2,.12,.18],C.cream);
  for(const z of [3.05,3.7]){for(const x of [1.6,2.7]){for(let i=0;i<12;i++){const a=i*Math.PI/6,c=(i+1)*Math.PI/6;b.beam('bicycle wheel rim',[x+Math.cos(a)*.32,.42+Math.sin(a)*.32,z],[x+Math.cos(c)*.32,.42+Math.sin(c)*.32,z],.045,C.iron);}}b.beam('bicycle frame',[1.6,.42,z],[2.15,.95,z],.05,C.brick);b.beam('bicycle frame',[2.15,.95,z],[2.7,.42,z],.05,C.brick);b.beam('bicycle frame',[1.6,.42,z],[2.7,.42,z],.05,C.brick);b.box('bicycle saddle',[2.12,1.04,z],[.28,.08,.16],C.iron);}
  bench(b,-2.1,3.5);planter(b,-3.5,3.4,.6);sideWindows(b,-3.28,-.7,[1.2,3.3,4.85],4.65);
}
export function buildOuterDistrict(scene,lot){
  const name=OUTER_DISTRICTS[lot.index];if(!name)return null;
  const root=new pc.Entity('outer district '+lot.index);scene.app.root.addChild(root);root.setPosition(lot.x,.74,lot.z);root.setEulerAngles(0,lot.x===-44?90:lot.z>0?180:0,0);
  const b=new Builder(scene,root);pavement(b);({'tram-bakery':tram,'library-bookshop':library,'market-hall':market,'arcade-homes':homes,'warehouse-studios':studios,'clinic-cycle-cafe':clinic})[name](b);b.finish();
  // The original paved parcels extend toward the ring avenue. Keep every new
  // facade, sidewalk detail and prop within the actual clear street envelope.
  root.setLocalScale(.76,.76,.76);root.districtType=name;root.parcelIndex=lot.index;(scene.outerDistricts??=[]).push({root,lot,type:name});return root;
}
