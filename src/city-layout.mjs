import * as pc from '../vendor/playcanvas.min.mjs';
import {Builder} from './landmark-models.mjs';
import {modelFrontage,orchardTree,stampPlaza,trailGarden,townContactShadows} from './toy-town.mjs';
import {sculptCoast,buildWorldEnvironment,refineInnerPlazas} from './world-environment.mjs';
import {drawCornerBakery} from './corner-bakery.mjs';
// City dimensions are presentation-only; BOARD order and card counts are unchanged.
export const CITY_LAYOUT={width:42,height:34,tileWidth:3.42,avenueX:28.9,avenueZ:24};
export function landmarkSite(index,p){
 if(index===0)return{x:21.15,z:18.15,width:3.55,angle:180};
 if(index===10)return{x:-21.15,z:-18.15,width:3.55,angle:0};
 if(index===6)return{x:-20.8,z:17.65,width:4.2,angle:135};
 if(index===16)return{x:20.8,z:-17.65,width:4.2,angle:-45};
 if(index<6)return{x:p.x,z:17.65,width:4.2,angle:180};
 if(index>=11&&index<=15)return{x:p.x,z:-17.65,width:4.2,angle:0};
 if(index>=7&&index<=9)return{x:-20.8,z:p.z,width:4.2,angle:90};
 return{x:20.8,z:p.z,width:4.2,angle:-90};
}
function group(scene,name,parent=scene.mapRoot){const root=new pc.Entity(name);parent.addChild(root);return {root,b:new Builder(scene,root)};}
function finish(scene,g,occludes=false){g.b.finishPainted();if(occludes)(scene.occlusionGroups??=[]).push({root:g.root,opacity:1,target:1});return g.root;}
const sidewalkWidth=.52;
function road(scene,g,name,a,c,width=1.35,junctions=[],crossings=[]){
 const horizontal=a[1]===c[1],along=horizontal?0:1,cross=1-along;
 const start=a[along],end=c[along],fixed=a[cross],half=width/2;
 const slab=(label,from,to,offset,y,span,thickness,color)=>{
  const center=(from+to)/2,length=to-from;
  g.b.box(name+' '+label,horizontal?[center,y,fixed+offset]:[fixed+offset,y,center],
   horizontal?[length,thickness,span]:[span,thickness,length],color);
 };
 slab('laid terracotta brick',start,end,0,.275,width,.055,'#bc8269');
 scene.cityRoads.push({name,a,c,width,y:.303});
 const edges=[start,...junctions.flatMap(center=>[center-half-sidewalkWidth,center+half+sidewalkWidth]),end];
 for(let i=0;i<edges.length;i+=2){
  const from=edges[i],to=edges[i+1];
  for(const side of [-1,1]){
   slab('sidewalk',from,to,side*(half+sidewalkWidth/2),.303,sidewalkWidth,.085,'#e2cba2');
   let curbStart=from;
   for(const center of crossings.filter(center=>center>from&&center<to)){
    slab('curb',curbStart,center-.32,side*(half+.032),.337,.064,.028,'#eee0c6');
    curbStart=center+.32;
   }
   slab('curb',curbStart,to,side*(half+.032),.337,.064,.028,'#eee0c6');
  }
 }
 for(let row=0;row<3;row++){
  const unit=.83,span=width/3,offset=(row-1)*span;
  for(let d=start+(row%2)*unit*.5;d<end-.1;d+=unit){
   if(junctions.some(center=>Math.abs(center-d)<half+.45))continue;
   const to=Math.min(d+unit-.04,end);
   const dye=['#bb7d63','#c68c6e','#c88a70','#be8267'][Math.abs(Math.floor((d-start)/unit)+row*3)%4];
   slab('staggered clay brick',d+.025,to,offset,.306,span-.03,.006,dye);
  }
 }
}
function junction(g,x,z,width){
 const half=width/2,offset=half+sidewalkWidth/2;
 g.b.box('continuous clay crossroads',[x,.277,z],[width,.06,width],'#bd8268');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  g.b.box('sidewalk corner',[x+sx*offset,.303,z+sz*offset],[sidewalkWidth,.085,sidewalkWidth],'#e2cba2');
 }
 for(const side of [-1,1]){
  crossing(g,x+side*(half+.36),z,'z',width);
  crossing(g,x,z+side*(half+.36),'x',width);
 }
}
function walkway(scene,g,name,a,c,width=.56){const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz)||1,ox=-dz/len*width/2,oz=dx/len*width/2;g.b.quad([a[0]+ox,.325,a[1]+oz],[c[0]+ox,.325,c[1]+oz],[c[0]-ox,.325,c[1]-oz],[a[0]-ox,.325,a[1]-oz],'#e3c29a');(scene.walkConnections??=[]).push({name,a,c,width});}
function crossing(g,x,z,axis='z',width=1.6){for(let j=-2;j<=2;j++)g.b.box('zebra crossing',[x+(axis==='z'?j*.115:0),.314,z+(axis==='x'?j*.115:0)],axis==='z'?[.07,.012,width]:[width,.012,.07],'#f1edda');}
function house(scene,{x,z,angle=0,use='home',variant=0,name}){
 const g=group(scene,'town '+(name||use)+' '+x+' '+z);
 g.root.setLocalPosition(x,.32,z);
 g.root.setLocalEulerAngles(0,angle,0);
 const isCornerBakery=use==='shop' && x===5 && z===9.55;
 const height=isCornerBakery?drawCornerBakery(g.b):modelFrontage(g.b,{use,variant});
 const root=finish(scene,g,true);
 const orientation=angle*Math.PI/180;
 const door=[x+Math.sin(orientation)*2.46,z+Math.cos(orientation)*2.46];
 scene.cityBuildings.push({root,use,x,z,angle,door,width:3.27,depth:2.71,height,floorPitch:1.45,doorHeight:1.22});
 return door;
}
export async function buildPlannedCity(scene){
 const breathe=async()=>{
   scene.onLoadProgress?.(`正在建立街區 · ${scene.cityBuildings.length} 棟完成`);
   await new Promise(resolve=>setTimeout(resolve,0));
 };
 const g=group(scene,'R32 connected streets'),b=g.b;scene.cityRoads=[];scene.walkConnections=[];scene.cityBuildings=[];
 sculptCoast(b);
 // Inner streets terminate at the board promenade, never through an occupied tile.
 for(const z of [-7,0,7])road(scene,g,'inner east west '+z,[-14.85665,z],[14.85665,z],1.35,[-10,0,10]);
 for(const x of [-10,0,10])road(scene,g,'inner north south '+x,[x,-11.7011],[x,11.7011],1.35,[-7,0,7]);
 for(const x of [-10,0,10])for(const z of [-7,0,7])junction(g,x,z,1.35);
 let v=0;for(const x of [-12.65,-5,5,12.65])for(const z of [-9.55,-3.5,3.5,9.55]){const roadZ=Math.abs(z)>7?Math.sign(z)*7:0,angle=z>roadZ?180:0,use=['home','shop','public','office'][(Math.floor(v/4)+v)%4],door=house(scene,{x,z,angle,use,variant:v++,name:'inner '+use});walkway(scene,g,'inner entrance connection '+v,door,[x,roadZ+Math.sign(z-roadZ)*.95],.8);if(v%4===0)await breathe();}
 for(const z of [-24,24])road(scene,g,'outer east west '+z,[-28.9,z],[28.9,z],1.6,[],[-22,-14,-6,2,10,18,26]);
 for(const x of [-28.9,28.9])road(scene,g,'outer north south '+x,[x,-24],[x,24],1.6,[],[-18,-9,0,9,18]);
 for(const x of [-28.9,28.9])for(const z of [-24,24]){b.box('corner intersection',[x,.315,z],[1.62,.02,1.62],'#ac936f');crossing(g,x,z-Math.sign(z)*1.2);crossing(g,x-Math.sign(x)*1.2,z,'x');}
 // R193: the outside avenue opens onto four natural biomes, not town lots.
 for(const side of [-1,1])for(const x of [-22,-14,-6,2,10,18,26])crossing(g,x,side*24);
 for(const side of [-1,1])for(const z of [-18,-9,0,9,18])crossing(g,side*28.9,z,'x');
 buildWorldEnvironment(scene);
 // Interior landscape: street trees stay in pavement bays outside lanes and entrances.
 for(const x of [-7.2,7.2])for(const [i,z] of [-10.5,-3.5,3.5,10.5].entries()){
   const t=group(scene,'orchard tree '+x+' '+z);
   orchardTree(t.b,x,z,i+(x<0?0:2),1.05);
   finish(scene,t,true);
 }
 trailGarden(scene,b,{outerOrchards:false});
 refineInnerPlazas(scene,b);
 townContactShadows(scene,{outerOrchards:false});
 finish(scene,g);scene.stage.dataset.cityAssetBuildings=String(scene.cityBuildings.length);
}
export function connectLandmark(scene,index,site,p,root){
 const g=group(scene,'R32 landmark access '+index),b=g.b,half=site.width/2;const dx=site.x-p.x,dz=site.z-p.z,dist=Math.hypot(dx,dz),ux=dx/dist,uz=dz/dist;
 const tileEdge=[p.x+ux*1.71,p.z+uz*1.71],landEdge=[site.x-ux*half,site.z-uz*half];
 stampPlaza(b,site,index);
 walkway(scene,g,'tile '+index+' entrance promenade',tileEdge,landEdge,.7);
 const outer=index<=6?[site.x,22.95]:index>=10&&index<=16?[site.x,-22.95]:index<10?[-27.85,site.z]:[27.85,site.z];
 walkway(scene,g,'landmark '+index+' city footpath',[site.x+ux*half,site.z+uz*half],outer,.7);
 finish(scene,g);
 root.citySite={index,x:site.x,z:site.z,width:site.width,tile:[p.x,p.z],entrance:tileEdge};
}
