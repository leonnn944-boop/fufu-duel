import * as pc from '../vendor/playcanvas.min.mjs';
import {waveCast} from './cast-motion.mjs';
import {netWorth} from './rules.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
export function makeAwards(scene){
 const root=new pc.Entity('five round awards');scene.app.root.addChild(root);root.enabled=false;scene.podiumRoot=root;
 const block=(name,pos,scale,color,glow,parent=root)=>scene.primitive(name,'box',pos,scale,color,glow,parent);
 // Stage the final standings as a town fair, with the skyline behind the winners.
 block('fair painted sky',[0,26,-8],[100,28,.3],'#a8d6ca');
 block('fair square floor',[0,19.7,0],[200,.65,200],'#dabb89');
 block('fair platform',[0,19.94,1],[17,.22,12],'#598579');
 block('platform front lip',[0,19.9,6.95],[17,.12,.08],'#e9bf63');
 const prop=(name,shape,pos,size,color,parent=root)=>scene.primitive(name,shape,pos,size,color,null,parent);
 for(const [x,w,h] of [[-13,13,7],[-6,9,4.4],[2,12,5.5],[9,9,6.3],[16,11,4.5]]){
   prop('painted hills','sphere',[x,20.0,-6.3],[w,h,1.2],'#8fb9a3');
 }
 for(const x of [-10,10]){
   block('flagstaff',[x,23.8,-3.7],[.18,7.6,.18],'#9a7450');
   prop('finial','sphere',[x,27.65,-3.7],[.43,.48,.43],'#edb750');
 }
 const festoon=['#c97151','#ffda88','#5d978a','#f1ab74'];
 for(let j=0;j<12;j++){
   const x=-9.15+j*1.66;
   const height=26.5+.012*x*x;
   const cord=block('festival cord',[x,height,-3.7],[1.69,.045,.055],'#716e55');
   cord.setEulerAngles(0,0,Math.atan(.024*x)*180/Math.PI);
   const pennant=prop('paper pennant','cone',[x,height-.28,-3.7],[.62,.55,.09],festoon[j%festoon.length]);
   pennant.setEulerAngles(0,0,180);
 }
 scene.awardPedestals=[];scene.awardLabels=[];
 for(let rank=0;rank<3;rank++){
  const pedestal=new pc.Entity('podium place '+(rank+1));root.addChild(pedestal);const height=[1.8,1.35,1][rank];
  block('rank '+(rank+1)+' pedestal',[0,20.05+height/2,0],[3.7,height,3.35],['#d9ae51','#9ebcc5','#b98d68'][rank],null,pedestal);
  block('rank '+(rank+1)+' illuminated top',[0,20.08+height,0],[3.85,.12,3.55],'#f4e6bc',null,pedestal);
  const seal=prop('prize seal','cylinder',[0,20.05+height*.54,1.71],[.66,.09,.66],'#fff1c7',pedestal);
  seal.setLocalEulerAngles(90,0,0);
  for(const sign of [-1,1]){
    const tail=block('award ribbon',[sign*.13,20.05+height*.54-.29,1.70],[.14,.39,.07],'#ab6945',null,pedestal);
    tail.setLocalEulerAngles(0,0,-sign*17);
  }
  const run=4.4,rise=height+.09,ramp=block('rank '+(rank+1)+' approach ramp',[0,20.05+rise/2-.065,3.8],[2.1,.13,Math.hypot(run,rise)],'#50717a',null,pedestal);ramp.setEulerAngles(Math.atan2(rise,run)*180/Math.PI,0,0);
  scene.awardPedestals.push(pedestal);
  const label=document.createElement('div');label.className='award-nameplate';label.hidden=true;label.dataset.rank=String(rank+1);scene.stage.append(label);scene.awardLabels.push(label);
 }
 scene.confetti=[];for(let i=0;i<20;i++){const x=((i*17)%47-23)/3.3,y=26+(i%7)*.6,z=-2-(i%3)*.3,piece=block('award confetti '+i,[x,y,z],[.1,.06,.18],['#f6d478','#8ed7d4','#ebac8d'][i%3]);piece.enabled=false;scene.confetti.push({piece,x,y,z,phase:i});}
}
export function syncAwards(scene,state,roster){
 const ranked=[...state.players].sort((a,b)=>netWorth(b.cash,b.holdings,b.debt)-netWorth(a.cash,a.holdings,a.debt)),count=Math.min(3,ranked.length),xs=count===2?[2.25,-2.25]:[0,-4.5,4.5];
 scene.awardWinners=ranked.slice(0,3).map((p,rank)=>({seat:p.seat,x:xs[rank],y:[21.94,21.49,21.14][rank],rank,name:roster.find(r=>r.seat===p.seat)?.nickname||'未命名玩家'}));
 scene.awardDuration=(count-1)*1.15+2.7+.65;
 scene.awardPedestals.forEach((p,i)=>{p.enabled=i<count;if(i<count)p.setLocalPosition(xs[i],0,0);});
 scene.awardLabels.forEach((label,i)=>{const w=scene.awardWinners[i];label.hidden=!w;if(!w)return;label.dataset.seat=w.seat;const rank=document.createElement('b'),name=document.createElement('span');rank.textContent=`第 ${i+1} 名`;name.textContent=w.name;label.replaceChildren(rank,name);});
 for(const[seat,pawn]of scene.pawns){const w=scene.awardWinners.find(w=>w.seat===seat);pawn.root.enabled=Boolean(w);pawn.ring.enabled=false;if(w){pawn.root.setLocalScale(1.65,1.65,1.65);pawn.bodyBaseY=0;scene.posePawn(pawn,0,false);}}
 updateAwards(scene);
}
function support(w,z){return z>=6?20.05:z<=1.6?w.y:20.05+(w.y-20.05)*(6-z)/4.4;}
export function updateAwards(scene){
 const celebrationEnd=scene.awardDuration+4;
 const elapsed=scene.celebrationSkipped?celebrationEnd:(performance.now()-(scene.celebrationStart??performance.now()))/1000;
 const settled=elapsed>=celebrationEnd;
 for(const w of scene.awardWinners||[]){const pawn=scene.pawns.get(w.seat),delay=(scene.awardWinners.length-1-w.rank)*1.15,t=clamp((elapsed-delay)/2.7,0,1),z=6.8*(1-smooth(t));
  pawn.root.enabled=true;scene.awardLabels[w.rank].hidden=t<1;pawn.root.setLocalScale(1.65,1.65,1.65);pawn.root.setPosition(w.x,support(w,z),z);
  // Walk forward up a continuous ramp; turn toward the audience only after arrival.
  pawn.root.setEulerAngles(0,180*(1-smooth(clamp((elapsed-delay-2.35)/.7,0,1))),0);
  scene.posePawn(pawn,elapsed*10,t>0&&t<1);
  if(t>0&&t<1){
   // Lift the gait only enough to keep the lowest shoe above the ramp surface.
   let correction=0;
   if(pawn.body.castRig){
    for(const contact of pawn.body.castRig.contacts){
     const p=contact.getPosition();correction=Math.max(correction,support(w,p.z)-p.y);
    }
   }else{
    for(const limb of['leg-left','leg-right'])for(const r of pawn.limbs?.[limb]?.entity.findComponents('render')||[])if(r.entity.name.includes('sole'))for(const mesh of r.meshInstances){const b=mesh.aabb;correction=Math.max(correction,support(w,b.center.z-b.halfExtents.z)-(b.center.y-b.halfExtents.y));}
   }
   if(correction>0){const p=pawn.body.getLocalPosition();pawn.body.setLocalPosition(p.x,p.y+correction/1.65,p.z);}
  }
  const cheer=elapsed>=scene.awardDuration&&!settled,waveProgress=cheer?smooth(clamp((elapsed-scene.awardDuration)/.5,0,1))*smooth(clamp((celebrationEnd-elapsed)/.65,0,1)):0;
  const arm=pawn.limbs?.['arm-left'];
  if(cheer&&pawn.body.castRig)waveCast(pawn.body.castRig,elapsed+w.rank,waveProgress);
  else if(arm&&cheer)arm.entity.setLocalEulerAngles(arm.base.x,arm.base.y,arm.base.z+(-115+Math.sin(elapsed*4+w.rank)*12)*waveProgress);
  w.entry={elapsed,t,z,surfaceY:support(w,z),arrived:t===1,celebrating:cheer,waveProgress};
 }
 const celebrate=elapsed>=scene.awardDuration&&!settled;
 if(celebrate&&!scene.awardSoundPlayed){
  scene.awardSoundPlayed=true;
  scene.audioCue('awardCrown',null,{force:true});
 }
 for(const item of scene.confetti||[]){item.piece.enabled=celebrate;if(celebrate)item.piece.setLocalPosition(item.x+Math.sin(elapsed+item.phase)*.3,item.y-(elapsed-scene.awardDuration)*1.3,item.z);}
 scene.stage.dataset.awardPhase=settled?'settled':elapsed>=scene.awardDuration?'celebrating':'entering';
 return settled;
}
export function frameAwards(scene){
 const stage=scene.stage.getBoundingClientRect(),panel=document.getElementById('action-panel'),banner=document.getElementById('award-banner'),tray=panel.getBoundingClientRect();
 const mobile=stage.width<=800&&!matchMedia('(orientation: landscape) and (max-height: 540px)').matches;
 // Reserve the list's actual height independently of its positioned top; avoid layout feedback.
 const safe={left:mobile?14:28,right:mobile?stage.width-14:tray.left-stage.left-24,top:banner.getBoundingClientRect().bottom-stage.top+20,bottom:mobile?stage.height-tray.height-28:stage.height-30};
 banner.style.left=(safe.left+safe.right)/2+'px';banner.style.width=(safe.right-safe.left)+'px';banner.style.maxWidth=(safe.right-safe.left)+'px';safe.top=banner.getBoundingClientRect().bottom-stage.top+20;
 const half=scene.awardWinners?.length===2?5.1:7.4;
 scene.camera.camera.projection=pc.PROJECTION_ORTHOGRAPHIC;scene.camera.camera.orthoHeight=10;scene.camera.setPosition(0,28.5,36);scene.cameraAim.set(0,23,1);scene.camera.lookAt(scene.cameraAim);scene.camera.camera.onAppPrerender();
 const projected=()=>{const points=[];for(const x of[-half,half])for(const y of[19.5,26.5])for(const z of[-1.7,7.5])points.push(scene.camera.camera.worldToScreen(new pc.Vec3(x,y,z)));return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};};
 let b=projected();scene.camera.camera.orthoHeight*=Math.max((b.right-b.left)/(safe.right-safe.left),(b.bottom-b.top)/Math.max(160,safe.bottom-safe.top))*1.04;scene.camera.camera.onAppPrerender();b=projected();
 const unit=2*scene.camera.camera.orthoHeight/stage.height,dx=((b.left+b.right)-(safe.left+safe.right))/2*unit,dy=(mobile?b.top-safe.top:((b.top+b.bottom)-(safe.top+safe.bottom))/2)*unit,shift=scene.camera.right.clone().mulScalar(dx).add(scene.camera.up.clone().mulScalar(-dy));scene.camera.setPosition(scene.camera.getPosition().add(shift));scene.cameraAim.add(shift);scene.camera.camera.onAppPrerender();scene.awardsSafeRect=safe;
 let contentBottom=projected().bottom;
 for(const w of scene.awardWinners||[]){const label=scene.awardLabels[w.rank],p=scene.camera.camera.worldToScreen(new pc.Vec3(w.x,w.y-.25,1.9)),left=scene.camera.camera.worldToScreen(new pc.Vec3(w.x-1.8,w.y,1.9)),right=scene.camera.camera.worldToScreen(new pc.Vec3(w.x+1.8,w.y,1.9));label.style.left=p.x+'px';label.style.top=p.y+'px';label.style.width=Math.max(80,right.x-left.x)+'px';if(mobile){const hidden=label.hidden,visibility=label.style.visibility;label.style.visibility='hidden';label.hidden=false;contentBottom=Math.max(contentBottom,label.getBoundingClientRect().bottom-stage.top);label.hidden=hidden;label.style.visibility=visibility;}}
 if(mobile){const rankingTop=Math.min(stage.height-tray.height-12,contentBottom+16);panel.style.setProperty('--awards-ranking-top',rankingTop+stage.top+'px');scene.stage.style.setProperty('--awards-stage-bottom',Math.min(stage.height,rankingTop+8)+'px');}else{panel.style.removeProperty('--awards-ranking-top');scene.stage.style.removeProperty('--awards-stage-bottom');}
}
