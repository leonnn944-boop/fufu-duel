import * as pc from '../vendor/playcanvas.min.mjs';
import {Builder} from './landmark-models.mjs';

const ink = '#214649';
const brass = '#f5c879';
const ivory = '#fff2cf';
const enamel = '#478f83';
const stampHeight = .342;
const arrivalHoldMs = 1100;

// Build a shoe sole in the tile plane. The small detached heel and toe make its
// direction legible from either side of the board, independently of color.
function sole(builder, side, advance) {
  const toe = [[-.16,-.10], [.13,-.10], [.18,.04], [.17,.26], [.1,.34], [-.04,.36], [-.15,.28], [-.19,.10]];
  const heel = [[-.11,-.31], [.105,-.31], [.13,-.25], [.11,-.175], [-.12,-.175], [-.145,-.24]];
  for (const shape of [toe, heel]) {
    const cx = shape.reduce((s,p)=>s+p[0],0) / shape.length;
    const cz = shape.reduce((s,p)=>s+p[1],0) / shape.length;
    for (const [size, height, color] of [[1.24,.002,ink],[1,.012,ivory]]) {
      const points = shape.map(([x,z])=>[side+(cx+(x-cx)*size)*1.22,height,advance+(cz+(z-cz)*size)*1.22]);
      for (let i=1;i<points.length-1;i++) builder.tri(points[0],points[i+1],points[i],color);
    }
  }
}

function ringArc(builder, inner, outer, start, end, y, color) {
  const point=(r,a)=>[r*Math.cos(a),y,r*Math.sin(a)];
  for(let i=0;i<10;i++) {
    const a=start+(end-start)*i/10,b=start+(end-start)*(i+1)/10;
    builder.quad(point(inner,a),point(inner,b),point(outer,b),point(outer,a),color);
  }
}

function pieces(scene) {
  const root = new pc.Entity('Roll route');
  root.enabled = false;
  scene.mapRoot.addChild(root);
  const print = new pc.Entity('Enamel shoe prints');
  const shoeBuilder = new Builder(scene,print);
  sole(shoeBuilder,-.23,-.25);
  sole(shoeBuilder,.23,.25);
  shoeBuilder.finishPainted();
  root.addChild(print);
  const prints = [print];
  for(let i=1;i<5;i++){
    const copy=print.clone();
    root.addChild(copy);
    prints.push(copy);
  }
  const target = new pc.Entity('Destination compass');
  const ringBuilder = new Builder(scene,target);
  for(let quadrant=0;quadrant<4;quadrant++){
    const angle=quadrant*Math.PI/2;
    // Four openings preserve the tile's original corner symbols. The open
    // middle leaves the landing player's shoes and footplate visible.
    ringArc(ringBuilder,1.21,1.52,angle-.68,angle+.68,0,ink);
    ringArc(ringBuilder,1.245,1.475,angle-.635,angle+.635,.012,brass);
    ringArc(ringBuilder,1.29,1.43,angle-.59,angle+.59,.022,enamel);
    ringArc(ringBuilder,1.29,1.43,angle-.09,angle+.09,.03,ivory);
  }
  ringBuilder.finishPainted();
  root.addChild(target);
  return {root, prints, target, active:null};
}

export function rollRoutePlan(roll, tileAt, count) {
  if(!roll || !Array.isArray(roll.path) || roll.path.length!==roll.die ||
    roll.path.length<1 || roll.path.length>6 || !Number.isInteger(roll.from) ||
    roll.from<0 || roll.from>=count) return null;
  let previous=roll.from;
  const prints=[];
  for(const tile of roll.path){
    if(tile!==(previous+1)%count) return null;
    const start=tileAt(previous), end=tileAt(tile);
    const dx=end.x-start.x, dz=end.z-start.z, length=Math.hypot(dx,dz);
    if(!length) return null;
    // Stamp the outgoing side of the path, leaving the center for the pawn.
    prints.push({tile, x:end.x+.72*dz/length, z:end.z-.72*dx/length, yaw:Math.atan2(dx,dz)*180/Math.PI});
    previous=tile;
  }
  const tile=roll.path.at(-1), at=tileAt(tile);
  return {prints:prints.slice(0,-1), target:{tile,x:at.x,z:at.z}};
}

function clear(guide) {
  guide.root.enabled=false;
  guide.active=null;
}

export function beginRollRoute(scene, roll, checkpoint, tileAt, count) {
  const same=checkpoint?.id===roll.id;
  const plan=rollRoutePlan(roll,tileAt,count);
  if(!plan || (same && checkpoint.step>=roll.path.length)) {
    if(scene.rollRoute)clear(scene.rollRoute);
    return;
  }
  const guide=scene.rollRoute??=pieces(scene);
  if(guide.active?.id===roll.id) return;
  guide.root.enabled=false;
  guide.active={id:roll.id,seat:roll.seat,plan,holdUntil:scene.reducedMotion?performance.now()+arrivalHoldMs:0,step:-1};
  for(const [i,print] of guide.prints.entries()) {
    print.enabled=false;
    const mark=plan.prints[i];
    if(!mark)continue;
    print.setLocalPosition(mark.x,stampHeight,mark.z);
    print.setLocalEulerAngles(0,mark.yaw,0);
  }
  guide.target.setLocalPosition(plan.target.x,stampHeight,plan.target.z);
  guide.target.enabled=true;
}

// No overlay DOM, screen-space picking, or independent timer. Existing game
// updates drive the world-space decals, which naturally sit behind pawns.
export function updateRollRoute(scene) {
  const guide=scene.rollRoute, active=guide?.active;
  if(!active)return;
  if(scene.celebrating || !scene.pawns.has(active.seat) || scene.state?.lastRoll?.id!==active.id || scene.motionRollId!==active.id) {
    clear(guide);
    return;
  }
  if(scene.reducedMotion) {
    if(!active.holdUntil)active.holdUntil=performance.now()+arrivalHoldMs;
    if(performance.now()>=active.holdUntil)clear(guide);
    else {
      guide.root.enabled=true;
      for(const print of guide.prints) print.enabled=false;
    }
    return;
  }
  const moving=scene.motion;
  if(!moving||moving.seat!==active.seat){clear(guide);return;}
  // The route must never give away a result while the die is still spinning.
  if(moving.phase==='dice'&&!scene.diceMotion?.landed)return;
  guide.root.enabled=true;
  const step=moving.phase==='path'?moving.step:0;
  if(step===active.step)return;
  active.step=step;
  guide.prints.forEach((print,i)=>{
    print.enabled=i>=step&&i<active.plan.prints.length;
    if(print.enabled){
      const scale=i===step?1:.78;
      print.setLocalScale(scale,1,scale);
    }
  });
}
