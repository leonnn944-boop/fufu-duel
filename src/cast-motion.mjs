import { Quat, Vec3 } from '../vendor/playcanvas.min.mjs';

const SIDES = ['left', 'right'];
const BODY_AXES = [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)];

// Skinning bones carry a rest rotation from Blender. Express each motion in
// character space, then convert to the bone's parent space once at bind time.
export function bindCastMotion(body, career) {
  const joints = {};
  for (const side of SIDES) {
    for (const part of ['leg', 'shin', 'foot', 'arm', 'forearm']) {
      const name = part + '-' + side;
      const entity = body.findByName(name);
      if (!entity) return null;
      const parentFromBody = entity.parent.getRotation().clone().invert().mul(body.getRotation());
      joints[name] = {
        entity, neutral: entity.getLocalRotation().clone(),
        axes: BODY_AXES.map(axis => parentFromBody.transformVector(axis, new Vec3())),
        output: new Quat(), turn: new Quat(),
      };
    }
  }
  const contacts = ['toe-left', 'heel-left', 'toe-right', 'heel-right'].map(name => body.findByName(name)).filter(Boolean);
  const left = joints['arm-left'].entity.getPosition().clone().sub(body.getPosition());
  const eyelids = new Set();
  const smiles = new Set();
  for(const component of body.findComponents('render'))for(const mesh of component.meshInstances){
    const morph=mesh.morphInstance;
    if(morph?.morph.targets.some(target=>target.name==='Blink'))eyelids.add(morph);
    if(morph?.morph.targets.some(target=>target.name==='Cheer'))smiles.add(morph);
  }
  const holdingSide = career === 'doctor' || career === 'sales' ? 'left' : 'right';
  return { joints, contacts, eyelids, smiles, holdingSide, bothHands:career==='assistant',
    lastBlink:0, lastSmile:0, waveDirection: left.dot(body.right) >= 0 ? 1 : -1 };
}

export function smileCast(rig, amount) {
  if(!rig || rig.lastSmile===amount)return;
  for(const mouth of rig.smiles)mouth.setWeight('Cheer',amount);
  rig.lastSmile=amount;
}

export function blinkCast(rig, seconds, seed, reduced) {
  if(!rig?.eyelids.size)return;
  const t=(seconds+seed*.87)%(3.65+(seed%4)*.41);
  let weight=reduced?0:Math.max(0,Math.min(t/.07,1-(t-.095)/.14,1));
  weight=weight*weight*(3-2*weight);
  if(weight===rig.lastBlink)return;
  for(const lid of rig.eyelids)lid.setWeight('Blink',weight);
  rig.lastBlink=weight;
}

function pose(joint, flex, twist = 0, spread = 0) {
  const { output, turn, axes } = joint;
  output.setFromAxisAngle(axes[0], flex);
  if (twist) output.mul(turn.setFromAxisAngle(axes[1], twist));
  if (spread) output.mul(turn.setFromAxisAngle(axes[2], spread));
  joint.entity.setLocalRotation(output.mul(joint.neutral));
}

export function walkCast(rig, phase, amount) {
  const joints = rig.joints;
  for (const side of SIDES) {
    const t = phase + (side === 'left' ? 0 : Math.PI);
    const swing = Math.sin(t);
    const forward = Math.cos(t);
    // Bend the trailing knee as the shoe leaves the board, straighten it
    // before heel strike, then let the ankle roll through the planted phase.
    const transfer = Math.max(0, forward);
    const knee = (4 + 22 * transfer * transfer) * amount;
    const hip = -(22 * swing + 5 * transfer) * amount;
    pose(joints['leg-' + side], hip);
    pose(joints['shin-' + side], knee);
    pose(joints['foot-' + side], -.78 * (hip + knee) - 4 * swing * amount);
    const carrying = rig.bothHands || side === rig.holdingSide;
    pose(joints['arm-' + side], (carrying ? 3 : 17) * swing * amount);
    pose(joints['forearm-' + side], -(carrying ? 1 : 4 + 8 * Math.max(0, -swing)) * amount);
  }
}

export function waveCast(rig, time, amount) {
  const side = rig.holdingSide === 'left' ? 'right' : 'left';
  const direction = side === 'left' ? rig.waveDirection : -rig.waveDirection;
  pose(rig.joints['arm-' + side], -20 * amount, 0, direction * 66 * amount);
  pose(rig.joints['forearm-' + side], -16 * amount, 0, direction * (26 + 12 * Math.sin(time * 5)) * amount);
}
