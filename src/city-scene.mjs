import {GameAudio} from './game-audio.mjs';
import {bindCastMotion, walkCast, blinkCast, smileCast} from './cast-motion.mjs';
import {routeCrowdGuide} from './crowd-guide-route.mjs';
import {chooseDiceSlot,clipBoxToNearPlane} from './dice-framing.mjs';
import {makeAwards,syncAwards,updateAwards,frameAwards} from './awards-presentation.mjs';
import { isNewGame, motionKey } from './game-session.mjs';
import * as pc from '../vendor/playcanvas.min.mjs';
import { dressSecondFigure, secondWardrobe, wearsSecondWardrobe } from './cast-wardrobe.mjs';
import { BOARD, BOARD_NAMES, WORLD_STOPS } from '../board-data.mjs';
import { netWorth } from './rules.mjs';
import { buildLandmark, buildRemainingLandmark } from './landmark-models.mjs';
import { buildOuterDistrict } from './outer-districts.mjs';
import {drawTownBoard,landmarkPedestal} from './toy-town.mjs';
import {updateWorldVessels} from './world-environment.mjs';
import { buildBoardRouteMarkings } from './board-route-markings.mjs';
import {beginRollRoute, updateRollRoute} from './roll-route.mjs';
import {CITY_LAYOUT,landmarkSite,buildPlannedCity,connectLandmark} from './city-layout.mjs';

const seatColors=['#ffcb45','#6ed9ff','#ff668f','#40d4ab','#a58cff','#ff8b39','#f26ddd','#8de063','#f5b9e7','#8dc8ff','#e4a86f','#a9f0d4'];
const careerAccents={founder:'#be4949',freelancer:'#d77e43',engineer:'#37577e',doctor:'#ff6c86',sales:'#986bb1',assistant:'#539677'};
const careerGlyphs={founder:'♛',freelancer:'✎',engineer:'⌨',doctor:'✚',sales:'◆',assistant:'✦'};
// Building footprints stay inside street blocks: the main road is z=0,
// service lanes are z=±5.15, and the cross streets are x=±4.8.
const buildingSpots=[[-6.3,-1.9,1],[-2.6,-1.9,5],[2.6,-1.9,2],[6.3,-1.9,0],[-6.3,1.9,2],[-2.6,1.9,0],[2.6,1.9,4],[6.3,1.9,3]];
const asColor=hex=>{const n=parseInt(hex.slice(1),16);return new pc.Color(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const frameBlend=(alpha,dt)=>1-(1-alpha)**(dt*60);
const MAP_SCALE=2.25;
const PAWN_Y=.5*MAP_SCALE-.5;
// Keep soft cheek and hair contours under the tabletop lights.
const castDiffuse = `
float getLightDiffuse(vec3 normal, vec3 viewDir, vec3 lightDir) {
    float n = max(dot(normal, -lightDir), 0.0);
    return 0.72 * n + 0.14 * smoothstep(0.08, 0.86, n);
}`;
const castStrideLength = .61;
const SHOWCASE_Y=.5*MAP_SCALE-.195;
const tileAt=index=>{const tile=BOARD[index]??BOARD[0];return new pc.Vec3((tile.x-.5)*CITY_LAYOUT.width,0,(tile.y-.5)*CITY_LAYOUT.height);};
const tileWorld=index=>tileAt(index).mulScalar(MAP_SCALE);

export class CityScene {
  constructor(canvas,stage){
    this.motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas=canvas;this.stage=stage;this.app=null;this.camera=null;this.mapRoot=null;this.pawns=new Map();this.labels=new Map();this.tileLabels=[];this.districtLabels=[];this.landmarkLabels=[];this.modelAssets=new Map();this.materialCache=new Map();this.showcase=[];this.preview=null;this.showcaseTime=0;this.motion=null;this.diceMotion=null;this.focus=new pc.Vec3(0,0,0);this.targetFocus=new pc.Vec3(0,0,0);this.panOffset=new pc.Vec3(0,0,0);this.orbitYaw=0;this.orbitPitch=0;this.viewSeat=null;this.overview=false;this.overviewFit=false;this.roster=[];this.state=null;this.lastRollRevision=-1;this.soundOn=true;this.gameAudio=new GameAudio();this.gameAudio.enabled=true;this.onMotionComplete=null;this.labelClock=0;this.statsClock=0;this.characterArtReady=false;
  }
  async init(onProgress=()=>{}){
    this.onLoadProgress=onProgress;
    onProgress('正在準備 3D 畫面');
    await new Promise(resolve=>setTimeout(resolve,0));
    const device=await pc.createGraphicsDevice(this.canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2,pc.DEVICETYPE_WEBGL1],antialias:true,powerPreference:'high-performance'});
    device.maxPixelRatio=Math.min(window.devicePixelRatio||1,this.stage.clientWidth<700?1:1.5);
    const options=new pc.AppOptions();options.graphicsDevice=device;
    options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem,pc.AnimComponentSystem];
    options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
    const app=new pc.AppBase(this.canvas);
    app.init(options);
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app=app;
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.stage.dataset.graphicsState='context-lost';});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.stage.dataset.graphicsState='restored';app.renderNextFrame=true;});
    app.scene.ambientLight=new pc.Color(.55,.59,.72);
    onProgress('正在建立城市棋盤');
    await new Promise(resolve=>setTimeout(resolve,0));
    this.makeLights();this.makeCamera();this.lightCast();await this.makeCity();this.makePodium();this.makeDice();this.makeTileLabels();this.enablePan();
    onProgress('棋盤已建立 · 準備城市素材');
    await this.loadModels();this.makeShowcase();
    app.on('update',dt=>this.update(dt));
    app.on('postrender',()=>this.updateLabels());
    this.resizeObserver=new ResizeObserver(entries=>{
      if(entries.some(entry=>entry.target===this.stage)){
        app.resizeCanvas(this.stage.clientWidth,this.stage.clientHeight);
        if(!this.celebrating)this.updateCamera(true);
      }
      if(this.celebrating)this.invalidateAwardLayout();
      app.renderNextFrame=true;
    });
    this.resizeObserver.observe(this.stage);
    this.resizeObserver.observe(document.getElementById('action-panel'));
    this.resizeObserver.observe(document.getElementById('award-banner'));
    app.resizeCanvas(this.stage.clientWidth,this.stage.clientHeight);
    this.updateCamera(true);
    app.start();
  }
  material(color,emissive){const key=`${color}:${emissive||''}`;if(this.materialCache.has(key))return this.materialCache.get(key);const m=new pc.StandardMaterial();m.diffuse=asColor(color);m.metalness=.08;m.gloss=.46;if(emissive){m.emissive=asColor(emissive);m.emissiveIntensity=.38;}m.update();this.materialCache.set(key,m);return m;}
  primitive(name,type,pos,scale,color,emissive,parent=this.mapRoot||this.app.root){const e=new pc.Entity(name);e.addComponent('render',{type,material:this.material(color,emissive)});parent.addChild(e);e.setLocalPosition(pos[0],pos[1],pos[2]);e.setLocalScale(scale[0],scale[1],scale[2]);if(/tree|foliage|^taiwan market (stall|canopy)|^park lamp |^building (planter|shrub)|^finance beacon|^harbor (footbridge|bridge rail|pier |bollard|boat)|^pier plank/.test(name))(this.occlusionGroups??=[]).push({root:e,opacity:1,target:1});return e;}
  makeLights(){
    const sun=new pc.Entity('warm key light');sun.addComponent('light',{type:'directional',color:new pc.Color(1,.94,.82),intensity:1.38,castShadows:false});sun.setEulerAngles(52,32,0);this.app.root.addChild(sun);
    const fill=new pc.Entity('cool fill light');fill.addComponent('light',{type:'directional',color:new pc.Color(.55,.73,1),intensity:.6});fill.setEulerAngles(35,-140,0);this.app.root.addChild(fill);
  }
  makeCamera(){this.camera=new pc.Entity('game camera');this.camera.addComponent('camera',{clearColor:new pc.Color(.68,.82,.82),projection:pc.PROJECTION_PERSPECTIVE,fov:56,orthoHeight:18,nearClip:.1,farClip:400});this.app.root.addChild(this.camera);this.cameraDirection=new pc.Vec3(-1,0,0);this.cameraAim=new pc.Vec3();}
  get reducedMotion(){return this.motionPreference.matches;}
  lightCast(){
    // Follow the player-facing camera with a soft key and cool fill. A warm
    // rear light catches the rim of dark hair as a figure turns on the board.
    const layers=this.app.scene.layers,world=layers.getLayerById(pc.LAYERID_WORLD);
    const cast=new pc.Layer({name:'Players'});
    layers.insertOpaque(cast,layers.getOpaqueIndex(world)+1);
    layers.insertTransparent(cast,layers.getTransparentIndex(world));
    this.camera.camera.layers=[...this.camera.camera.layers,cast.id];
    for(const [name,pitch,yaw,intensity,tint] of [
      ['Portrait key',56,27,1.22,[1,.94,.87]],
      ['Portrait fill',27,-61,.52,[.83,.91,1]],
      ['Hair rim',36,153,.85,[1,.90,.78]]
    ]){
      const lamp=new pc.Entity(name);
      lamp.addComponent('light',{type:'directional',color:new pc.Color(...tint),intensity,layers:[cast.id]});
      this.camera.addChild(lamp);
      lamp.setLocalEulerAngles(pitch,yaw,0);
    }
    this.castLayer=cast;
  }
  makePodium(){makeAwards(this);}
  invalidateAwardLayout(){this.awardLayoutDirty=true;}
  replayCelebration(){
    this.gameAudio?.cancel('award');
    this.gameAudio?.cancel('awardCrown');
    if(this.reducedMotion){this.skipCelebration();this.audioCue('awardCrown',null,{force:true});return;}
    this.celebrationStart=performance.now();
    this.celebrationSkipped=false;
    this.awardSoundPlayed=false;
    this.awardSettled=false;
    this.app.autoRender=true;
    this.audioCue('award',null,{force:true});
  }
  skipCelebration(){
    this.gameAudio?.cancel('award');
    this.gameAudio?.cancel('awardCrown');
    this.celebrationSkipped=true;
    this.awardSettled=false;
  }
  async makeCity(){
    this.mapRoot=new pc.Entity('expanded city board');this.mapRoot.setLocalScale(MAP_SCALE,MAP_SCALE,MAP_SCALE);this.app.root.addChild(this.mapRoot);
    await buildPlannedCity(this);await this.makeLandmarks();
    drawTownBoard(this,tileAt,BOARD);
    buildBoardRouteMarkings(this,tileAt,BOARD.length);

  }
  makeSurroundings(){
    const root=this.app.root;
    this.primitive('continuous city ground','box',[0,-.05,0],[300,1.2,270],'#304b51',null,root);
    for(let x=-138;x<=138;x+=11){if(Math.abs(x)<39){for(const side of [-1,1])this.primitive(`outer north-south road ${x} ${side}`,'box',[x,.57,side*79.5],[2.15,.035,101],'#293d49',null,root);}else this.primitive(`outer north-south road ${x}`,'box',[x,.57,0],[2.15,.035,260],'#293d49',null,root);}
    for(let z=-127;z<=127;z+=11){if(Math.abs(z)<29){for(const side of [-1,1])this.primitive(`outer east-west road ${z} ${side}`,'box',[side*90.5,.58,z],[103,.035,2.15],'#293d49',null,root);}else this.primitive(`outer east-west road ${z}`,'box',[0,.58,z],[284,.035,2.15],'#293d49',null,root);}
    for(const [axis,at] of [['z',-28],['z',27],['x',-39],['x',38]]){
      const alongZ=axis==='z',roadSize=alongZ?[83,.045,3.3]:[3.3,.045,63];
      this.primitive(`city ring avenue ${axis} ${at}`,'box',alongZ?[0,.61,at]:[at,.61,0],roadSize,'#18384d',null,root);
      for(const side of [-1,1])this.primitive(`city ring sidewalk ${axis} ${at} ${side}`,'box',alongZ?[0,.64,at+side*2.1]:[at+side*2.1,.64,0],alongZ?[83,.08,.58]:[.58,.08,63],'#a9b9aa',null,root);
    }
    for(const [x,z,alongZ] of [[13,27,true],[-14,-28,true],[38,0,false],[-39,0,false]])for(let stripe=-3;stripe<=3;stripe++)this.primitive(`city ring crossing ${x} ${z} ${stripe}`,'box',alongZ?[x+stripe*.48,.655,z]:[x,.655,z+stripe*.48],alongZ?[.27,.012,2.65]:[2.65,.012,.27],'#dce6df',null,root);
    for(let z=-39;z<=38;z+=11)for(let x=-67;x<=67;x+=9){if(Math.abs(x)<39&&Math.abs(z)<29)continue;this.primitive(`outer lane dash ${x} ${z}`,'box',[x,.62,z],[2.3,.012,.055],'#e0c98e',null,root);}
    for(let x=-138;x<=138;x+=11)for(let z=-121;z<=121;z+=8.5){if(Math.abs(x)<39&&Math.abs(z)<29)continue;this.primitive(`outer vertical lane dash ${x} ${z}`,'box',[x,.62,z],[.055,.012,2.15],'#e0c98e',null,root);}
    for(const side of [-1,1]){
      this.primitive(`east-west city connector ${side}`,'box',[side*34,.57,0],[31,.045,3.05],'#183448',null,root);
      for(const x of [24,30,36,42])this.primitive(`connector center stripe ${side} ${x}`,'box',[side*x,.61,0],[2.3,.014,.07],'#d4b979',null,root);
      for(const x of [-10.8,10.8]){
        this.primitive(`north-south city connector ${side} ${x}`,'box',[x,.57,side*28.6],[3.05,.045,34.8],'#183448',null,root);
        for(const z of [16,22,28,34,40])this.primitive(`connector center stripe ${side} ${x} ${z}`,'box',[x,.61,side*z],[.07,.014,2.3],'#d4b979',null,root);
      }
    }
    this.outerLots=[];
    let index=0;
    for(let x=-77;x<=77;x+=11)for(let z=-55;z<=55;z+=11){
      if(Math.abs(x)<39&&Math.abs(z)<29)continue;
      const kind=index%13===2?'park':index%17===8?'square':'building';
      this.outerLots.push({x,z,index,kind});
      const palette=z<0?['#405967','#496373','#536b76']:['#4f6a5e','#587166','#64766b'];
      this.primitive(`outer paved lot ${index}`,'box',[x,.65,z],[9.35,.12,9.35],kind==='park'?'#3a6958':kind==='square'?'#778780':palette[index%3],null,root);
      if(kind==='park'){
        this.primitive(`outer park walk ${index}`,'box',[x,.725,z],[7.6,.018,.55],'#c5bc9b',null,root);
        for(const [dx,dz] of [[-2.45,-2.2],[2.3,-2.1],[-2.2,2.3],[2.5,2.15]]){
          this.primitive(`outer park trunk ${index} ${dx} ${dz}`,'cylinder',[x+dx,1.1,z+dz],[.12,.72,.12],'#806747',null,root);
          this.primitive(`outer park canopy ${index} ${dx} ${dz}`,'sphere',[x+dx,1.86,z+dz],[.63,.72,.63],z<0?'#ad9aba':'#67a77b',null,root);
        }
      }else if(kind==='square'){
        this.primitive(`outer plaza inlay ${index}`,'box',[x,.72,z],[5.7,.018,5.7],'#a7aa93',null,root);
        this.primitive(`outer plaza kiosk ${index}`,'box',[x,.98,z],[1.25,.55,1.15],z<0?'#354b66':'#9a6652',null,root);
        this.primitive(`outer plaza canopy ${index}`,'box',[x,1.3,z],[2.3,.12,1.65],z<0?'#d57774':'#e3b77a',null,root);
      }else if(index%7===0)this.primitive(`outer garden bed ${index}`,'box',[x+3.35,.74,z+3.28],[1.15,.13,1.15],'#3f755b',null,root);
      index++;
    }
    for(const z of [-77,-66,66,77])for(let x=-77;x<=77;x+=11){const slot=(Math.abs(x*7+z*3)%9),roof=['#b67c61','#6ba69b','#d9af73','#8ba0b7'][slot%4],wall=['#526c80','#4b786e','#756985','#b28c68'][slot%4],height=slot%4===0?5.2:slot%3===0?3.6:2.2;
      this.primitive(`fringe lot ${x} ${z}`,'box',[x,.65,z],[9.25,.12,9.25],'#536b69',null,root);
      this.primitive(`fringe facade ${x} ${z}`,'box',[x,1+height/2,z],[5.4,height,4.8],wall,null,root);
      this.primitive(`fringe roof ${x} ${z}`,'box',[x,1+height+.16,z],[5.8,.28,5.2],roof,null,root);
      for(const floor of [0,1,2].filter(level=>1.65+level*1.2<height))for(const dx of [-1.7,0,1.7])this.primitive(`fringe window ${x} ${z} ${floor} ${dx}`,'box',[x+dx,1.7+floor*1.2,z+2.43],[.72,.52,.035],'#c8d9d7','#84c2d8',root);
    }
    this.makeCityGateways(root);
    for(const x of [-55,-33,-11,11,33,55])for(const z of [-39,-17,5,27]){if(Math.abs(x)<39&&Math.abs(z)<29)continue;this.primitive(`outer lamp post ${x} ${z}`,'cylinder',[x+4,1.2,z+4],[.07,.75,.07],'#b2c3c2',null,root);this.primitive(`outer lamp glow ${x} ${z}`,'sphere',[x+4,1.96,z+4],[.16,.16,.16],'#ffe5a2','#ffd878',root);}
  }
  makeCityGateways(root){
    for(const place of [{name:'taipei',x:13,z:22,side:1,road:'#91b9a6',wall:'#567f8b',trim:'#ebbd80',tree:'#69b686'},{name:'tokyo',x:-14,z:-22,side:-1,road:'#9ea9ad',wall:'#41546b',trim:'#e36e67',tree:'#db9dbc'}]){
      const {name,x,z,side,road,wall,trim,tree}=place;
      this.primitive(`${name} arrival promenade`,'box',[x,.64,z],[18,.05,5],road,null,root);
      for(let stripe=-7;stripe<=7;stripe++)this.primitive(`${name} promenade seam ${stripe}`,'box',[x+stripe*1.1,.67,z],[.025,.012,4.5],name==='tokyo'?'#dae1d8':'#c5d9bd',null,root);
      for(const dx of [-6.5,0,6.5]){
        const back=z+side*1.45;
        this.primitive(`${name} storefront ${dx}`,'box',[x+dx,1.32,back],[2.7,1.38,1.55],wall,null,root);
        this.primitive(`${name} shop glass ${dx}`,'box',[x+dx,1.22,back-side*.8],[1.95,.68,.055],name==='tokyo'?'#94a8bb':'#86c4bb',null,root);
        this.primitive(`${name} shop awning ${dx}`,'box',[x+dx,2.12,back-side*.33],[3.1,.14,2.2],trim,null,root);
        for(const edge of [-.8,.8])this.primitive(`${name} facade light ${dx} ${edge}`,'box',[x+dx+edge,1.23,back-side*.84],[.08,.48,.035],'#fff0ce','#ffe0a5',root);
      }
      for(const dx of [-8.3,8.3]){
        this.primitive(`${name} street tree trunk ${dx}`,'cylinder',[x+dx,1.25,z-side*1.4],[.14,.92,.14],'#806b51',null,root);
        this.primitive(`${name} street tree crown ${dx}`,'sphere',[x+dx,2.2,z-side*1.4],[.75,.82,.75],tree,null,root);
      }
      this.primitive(`${name} transit canopy`,'box',[x+3.3,1.82,z-side*1.15],[2.9,.14,1.1],name==='tokyo'?'#d86162':'#5ca9a1',null,root);
      for(const dx of [2.2,4.4])this.primitive(`${name} transit support ${dx}`,'cylinder',[x+dx,1.19,z-side*1.15],[.07,.64,.07],'#d2ded8',null,root);
    }
  }
  decorateOuterLot(index,x,z){
    const tone=['#e8bd81','#8fd5c3','#d7a4a8','#a7b9e4','#d9d0a5','#91c8dc'][index%6];
    this.primitive(`lot entrance ${index}`,'box',[x,.735,z-3.75],[2.05,.026,.73],'#b7c1b1',null,this.app.root);
    for(const side of [-1,1]){
      this.primitive(`lot planter ${index} ${side}`,'box',[x+side*2.75,.77,z-3.53],[.77,.18,.52],'#455e62',null,this.app.root);
      this.primitive(`lot foliage ${index} ${side}`,'sphere',[x+side*2.75,.95,z-3.53],[.39,.27,.26],index%2?'#63ac84':'#76b9a1',null,this.app.root);
    }
    switch(index%6){
      case 0:
        this.primitive(`lot cafe awning ${index}`,'box',[x,.95,z-3.05],[2.55,.09,.71],tone,null,this.app.root);
        for(const side of [-1,1])this.primitive(`lot cafe post ${index} ${side}`,'cylinder',[x+side*1.1,.84,z-3.32],[.045,.2,.045],'#f1e3c7',null,this.app.root);
        break;
      case 1:
        for(const side of [-1,1])this.primitive(`lot bicycle wheel ${index} ${side}`,'cylinder',[x+side*.57,.83,z-3.5],[.17,.06,.17],tone,null,this.app.root);
        break;
      case 2:
        this.primitive(`lot loading stripe ${index}`,'box',[x,.755,z-3.48],[2.35,.017,.11],tone,null,this.app.root);
        for(const side of [-1,1])this.primitive(`lot bollard ${index} ${side}`,'cylinder',[x+side*.93,.88,z-3.36],[.075,.26,.075],'#f2ce86',null,this.app.root);
        break;
      case 3:
        this.primitive(`lot kiosk ${index}`,'box',[x,.98,z-3.2],[.9,.48,.48],'#577989',null,this.app.root);
        this.primitive(`lot kiosk roof ${index}`,'box',[x,1.25,z-3.2],[1.1,.09,.61],tone,null,this.app.root);
        break;
      case 4:
        this.primitive(`lot seat ${index}`,'box',[x,.82,z-3.55],[1.52,.14,.37],'#ae8865',null,this.app.root);
        this.primitive(`lot seat back ${index}`,'box',[x,.99,z-3.7],[1.52,.29,.08],'#ae8865',null,this.app.root);
        break;
      default:
        this.primitive(`lot art plinth ${index}`,'cylinder',[x,.8,z-3.45],[.37,.15,.37],'#d3c7a5',null,this.app.root);
        this.primitive(`lot art ${index}`,'sphere',[x,1.13,z-3.45],[.27,.34,.27],tone,null,this.app.root);
    }
  }
  makeDistricts(){
    const districts=[[-8.2,'#285c57'],[0,'#2b5868'],[8.2,'#245576']];
    for(const [x,color] of districts){
      this.primitive(`district ground ${x}`,'box',[x,.16,0],[8.05,.045,14.05],color);
      for(const z of [-6.75,6.75])this.primitive(`district curb ${x} ${z}`,'box',[x,.2,z],[7.9,.065,.15],'#a6bdc4');
    }
    this.primitive('main boulevard','box',[0,.23,0],[18.5,.075,1.35],'#18364d');
    for(const z of [-.83,.83])this.primitive(`boulevard sidewalk ${z}`,'box',[0,.24,z],[18.5,.08,.28],'#c0b59b');
    for(let x=-8.4;x<=8.4;x+=1.4)this.primitive(`boulevard lane ${x}`,'box',[x,.28,0],[.7,.012,.045],'#e8c272','#e9b34c');
    for(const z of [-5.2,5.2]){
      this.primitive(`service lane ${z}`,'box',[0,.23,z],[18.5,.055,.67],'#1a4055');
      for(const side of [-.47,.47])this.primitive(`service walkway ${z} ${side}`,'box',[0,.245,z+side],[18.5,.055,.18],'#b8b8a4');
      for(let x=-8.2;x<=8.2;x+=1.7)this.primitive(`service dash ${z} ${x}`,'box',[x,.27,z],[.55,.012,.04],'#d9ca98');
    }
    for(const x of [-4.8,4.8]){
      this.primitive(`connector road ${x}`,'box',[x,.255,0],[.95,.055,10.6],'#1b4057');
      for(const z of [-5.2,0,5.2])for(let i=0;i<5;i++)this.primitive(`crosswalk ${x} ${z} ${i}`,'box',[x-.36+i*.18,.31,z],[.105,.015,.83],'#e9e5d7');
    }
    this.treeCanopies=[];
    for(const [x,z] of [[-9.6,4.65],[-5.7,3.9],[-5.7,-3.9],[-3.65,-2.2],[-3.65,2.45],[3.65,-2.2],[3.65,2.45],[5.7,-3.9],[5.7,3.9],[8.45,-4.0],[8.45,4.0]]){
      this.primitive(`innovation tree trunk ${x}`,'cylinder',[x,.49,z],[.12,.42,.12],'#6f553e');
      this.treeCanopies.push(this.primitive(`street tree canopy ${x} ${z}`,'sphere',[x,1.12,z],[.38,.46,.38],x<0?'#4dc68e':'#78ca9f'));
      this.primitive(`street tree highlight ${x} ${z}`,'sphere',[x-.13,1.34,z-.1],[.15,.16,.15],'#b6ecac');
    }
    for(const [x,z] of [[-8.95,1.25],[-7.2,-4.65],[-2.2,-4.55],[2.2,4.55],[7.1,-4.65],[8.15,1.2]]){
      this.primitive(`street light post ${x} ${z}`,'cylinder',[x,.52,z],[.07,.58,.07],'#c8d8dc');
      this.primitive(`street light ${x} ${z}`,'sphere',[x,.87,z],[.17,.17,.17],'#ffe1a0','#ffd16a');
    }
    for(const [x,z] of [[-9.25,1.25]]){
      this.primitive(`taiwan market stall ${x} ${z}`,'box',[x,.37,z],[.66,.28,.52],'#a36f4e');
      this.primitive(`taiwan market canopy ${x} ${z}`,'box',[x,.79,z],[.85,.11,.65],x<-7?'#e58d69':'#e7c76a');
    }
    this.primitive('finance square','cylinder',[0,.23,2.2],[1.4,.08,1.4],'#d4c5a8');
    this.primitive('finance fountain basin','cylinder',[0,.34,2.2],[.9,.16,.9],'#2a748d');
    this.fountainWater=this.primitive('finance fountain water','cylinder',[0,.44,2.2],[.72,.055,.72],'#66d3de','#5fcde0');
    this.primitive('finance fountain sculpture','sphere',[0,.88,2.2],[.32,.46,.32],'#ffd46e','#f6c858');
    this.marketBars=[];
    for(const [index,x] of [-.72,0,.72].entries()){
      this.primitive(`market signal base ${index}`,'box',[x,.32,1.2],[.42,.12,.42],'#d7c187');
      const bar=this.primitive(`market signal ${index}`,'box',[x,.62,1.2],[.3,.6,.3],['#ffcb59','#77d8e9','#53d6a8'][index],['#ffd472','#83e8f6','#70eac0'][index]);
      this.marketBars.push({bar,x});
    }
    for(const x of [-1.1,1.1])this.primitive(`finance bench ${x}`,'box',[x,.34,2.2],[.22,.18,.8],'#a67349');
    this.primitive('harbor canal','box',[9.75,.19,0],[1.55,.06,10.1],'#126184','#1e7695');
    this.primitive('harbor footbridge','box',[9.05,.34,0],[1.7,.13,1.22],'#d6bf92');
    for(const z of [-.5,.5])this.primitive(`harbor bridge rail ${z}`,'box',[9.05,.51,z],[1.7,.11,.05],'#e6d4ad');
    for(const z of [-3.1,-1.1,1.1,3.1]){
      this.primitive(`harbor pier ${z}`,'box',[9.1,.26,z],[1.8,.1,.28],'#9b7955');
      this.primitive(`harbor bollard ${z}`,'cylinder',[8.4,.45,z],[.11,.27,.11],'#e2ba71');
    }
    this.boatHull=this.primitive('harbor boat hull','box',[9.75,.32,2.1],[.86,.16,1.22],'#f2e8d8');
    this.boatCabin=this.primitive('harbor boat cabin','box',[9.75,.56,2.1],[.52,.36,.57],'#2b859c');
    this.primitive('finance beacon plinth','cylinder',[0,.3,-2.2],[1.05,.15,1.05],'#c28d4d');
    this.primitive('finance beacon column','cylinder',[0,1.35,-2.2],[.15,1.4,.15],'#c9d8df');
    this.primitive('finance beacon','sphere',[0,2.78,-2.2],[.35,.35,.35],'#ffcc62','#ffc857');
    for(const [x,z] of [[-8.8,3.45],[-8.8,-3.45]]){
      for(const offset of [-.15,0,.15])this.primitive(`garden bench slat ${x} ${z} ${offset}`,'box',[x,.38,z+offset],[1.05,.06,.11],'#b68a5a');
      for(const side of [-1,1])this.primitive(`garden bench leg ${x} ${z} ${side}`,'box',[x+side*.38,.29,z],[.06,.2,.4],'#36595b');
      this.primitive(`garden bench back ${x} ${z}`,'box',[x,.6,z-.23],[1.05,.25,.06],'#c49766');
    }
    for(let i=0;i<8;i++)this.primitive(`canal ripple ${i}`,'box',[9.75+(i%2?.15:-.13),.235,-4.1+i*1.1],[.48,.009,.035],i%2?'#76c5ce':'#4f9db4');
    for(const z of [-3.1,-1.1,1.1,3.1])for(let i=0;i<6;i++)this.primitive(`pier plank ${z} ${i}`,'box',[8.35+i*.28,.32,z],[.018,.008,.25],'#d5b17b');
    for(const [x,z,color] of [[-6.5,.3,'#efc679'],[2.1,-.3,'#8bbdd0']]){
      this.primitive(`boulevard car body ${x}`,'capsule',[x,.48,z],[.8,.25,.38],color);
      this.primitive(`boulevard car cabin ${x}`,'box',[x-.04,.66,z],[.38,.24,.32],'#dce8e2');
      this.primitive(`boulevard car glass ${x}`,'box',[x-.04,.7,z+.17],[.26,.13,.018],'#416a7c');
      for(const side of [-1,1])for(const axle of [-1,1]){const wheel=this.primitive(`boulevard wheel ${x} ${side} ${axle}`,'cylinder',[x+axle*.24,.38,z+side*.2],[.13,.055,.13],'#263a47');wheel.setLocalEulerAngles(90,0,0);}
    }
  }
  async makeLandmarks(){
    const landmarks = BOARD.filter(tile => WORLD_STOPS[tile.n].model);
    for (const {n: index} of landmarks) {
      const {name, model: type} = WORLD_STOPS[index];
      const p=tileAt(index),site=landmarkSite(index,p),{x,z,width:footprint}=site;
      const root=new pc.Entity(`landmark ${index} ${name}`);this.mapRoot.addChild(root);root.setLocalPosition(x,.3,z);root.landmarkIndex=index;root.setLocalEulerAngles(0,site.angle,0);
      landmarkPedestal(this,root,index);

      if(!buildLandmark(this,type,root)&&!buildRemainingLandmark(this,type,root))throw new Error('Unknown landmark '+type);
      // Fit new travel miniatures on their wooden bases, using their local geometry.
      if (['giza','colosseum','tajMahal','greatWall','bigBen','machuPicchu','goldenGate','hangingGardens','angkorWat','moai','mountFuji','pisaTower','stonehenge','liberty','airportStart','cruiseStart','opera','dubai'].includes(type)) {
        const piece=root.findByName(root.name+' painted wood');
        const {center,halfExtents}=piece.render.meshInstances[0].mesh.aabb;
        const scale=Math.min(1.76/(2*Math.max(halfExtents.x,halfExtents.z)), 2.95/(2*halfExtents.y));
        piece.setLocalScale(scale,scale,scale);
        piece.setLocalPosition(-center.x*scale,.099-(center.y-halfExtents.y)*scale,-center.z*scale);
      }
      const natural=1.8;
      root.setLocalScale(footprint/natural,footprint/natural,footprint/natural);this.fitFootprint(root,footprint);
      const boxes=root.findComponents('render').flatMap(c=>c.meshInstances.map(m=>m.aabb));
      const modelHeight=(Math.max(...boxes.map(b=>b.center.y+b.halfExtents.y))-Math.min(...boxes.map(b=>b.center.y-b.halfExtents.y)))/MAP_SCALE;
      const start=index===0||index===10, maxHeight=start ? .85 : 5.2;
      if(modelHeight>maxHeight){
        const scale=root.getLocalScale().clone(),cap=maxHeight/modelHeight;
        root.setLocalScale(scale.x*(start?1:Math.sqrt(cap)),scale.y*cap,scale.z*(start?1:Math.sqrt(cap)));
      }
      // These two skyline miniatures have tall spires. Keep their tips in
      // the pawn camera and leave the original pedestal attached to the path.
      if(index===1||index===16){
        const sculpture=root.findByName(root.name+' painted wood');
        const tableScale=index===16?.57:.60;
        sculpture.setLocalScale(tableScale,tableScale,tableScale);
        const slabBottom=index===16?.016:.02;
        sculpture.setLocalPosition(0,.099-slabBottom*tableScale,0);
      }
      connectLandmark(this,index,site,p,root);(this.occlusionGroups??=[]).push({root,opacity:1,target:1});
      const label=document.createElement('span');label.className='landmark-label';label.textContent=`${index} · ${name}`;this.stage.append(label);this.landmarkLabels.push({label,root,index});
      this.onLoadProgress?.(`城市地標 ${this.landmarkLabels.length} / ${landmarks.length}`);
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  makeTileLabels(){
    for(const tile of BOARD){
      const label=document.createElement('button');label.type='button';label.className=`tile-label ${tile.type}`;
      const name=document.createElement('strong');name.className='tile-face-name';name.textContent=BOARD_NAMES[tile.n];label.append(name);
      label.setAttribute('aria-label',`${BOARD_NAMES[tile.n]}，點擊查看此格說明`);
      label.onclick=()=>this.onTileInspect?.(tile);this.stage.append(label);this.tileLabels.push({label,tile});
    }
    for(const [text,x,z,tone,zone] of [['創業花園',-7,1.8,'mint','garden'],['金融大道',0,1.3,'gold','finance'],['港灣市集',7,1.7,'cyan','harbor']]){const label=document.createElement('button');label.type='button';label.className=`district-label ${tone}`;label.innerHTML=`<span>${text}</span><b aria-hidden="true">ⓘ</b>`;label.setAttribute('aria-label',`點擊查看${text}的玩法提示`);label.onclick=()=>this.onDistrictInspect?.(zone,text);this.stage.append(label);this.districtLabels.push({label,x,z,zone});}
  }
  enablePan(){
    const pointers=new Map();this.viewZoom=1;this.canvas.style.touchAction='none';
    const pan=(dx,dy)=>{const unit=(this.camera.camera.projection===pc.PROJECTION_ORTHOGRAPHIC?this.camera.camera.orthoHeight*2:(this.camera.getPosition().distance(this.focus)*.8))/this.stage.clientHeight,right=this.camera.right,up=this.camera.up;this.panOffset.x=clamp(this.panOffset.x-(dx*right.x-dy*up.x)*unit,-45,45);this.panOffset.z=clamp(this.panOffset.z-(dx*right.z-dy*up.z)*unit,-35,35);};
    const mark=()=>{this.stage.dataset.manualView='true';if(this.state&&this.state.phase!=='lobby')document.getElementById('focus-me-button').hidden=false;};
    this.canvas.addEventListener('contextmenu',event=>event.preventDefault());
    this.canvas.addEventListener('pointerdown',event=>{pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.canvas.setPointerCapture(event.pointerId);});
    this.canvas.addEventListener('pointermove',event=>{const old=pointers.get(event.pointerId);if(!old)return;const before=[...pointers.values()],next={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,next);
      if(pointers.size===2){const after=[...pointers.values()],distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),prior=distance(before);if(prior>8)this.viewZoom=clamp(this.viewZoom*prior/Math.max(8,distance(after)),.55,1.8);pan((after[0].x+after[1].x-before[0].x-before[1].x)/2,(after[0].y+after[1].y-before[0].y-before[1].y)/2);}
      else if(pointers.size===1){const dx=next.x-old.x,dy=next.y-old.y;if(event.shiftKey||event.buttons===2)pan(dx,dy);else{this.orbitYaw+=dx*.009;this.orbitPitch=clamp(this.orbitPitch+dy*.075,-7,13);}}
      mark();
    });
    const stop=event=>pointers.delete(event.pointerId);for(const type of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(type,stop);
    this.canvas.addEventListener('wheel',event=>{event.preventDefault();this.viewZoom=clamp(this.viewZoom*Math.exp(event.deltaY*.001),.55,1.8);mark();},{passive:false});
  }
  makeDice(){
    this.dice=new pc.Entity('three dimensional dice');this.dice.setLocalScale(1.5,1.5,1.5);this.app.root.addChild(this.dice);
    // One rounded mesh gives continuous highlights around edges and corners.
    const positions=[],normals=[],indices=[],steps=8;
    for(const [n,u,v] of [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]]){
      const start=positions.length/3;for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){const q=n.map((value,i)=>value*.5+u[i]*(x/steps-.5)+v[i]*(y/steps-.5)),core=q.map(value=>clamp(value,-.38,.38)),normal=new pc.Vec3(q[0]-core[0],q[1]-core[1],q[2]-core[2]).normalize();positions.push(core[0]+normal.x*.12,core[1]+normal.y*.12,core[2]+normal.z*.12);normals.push(normal.x,normal.y,normal.z);if(x<steps&&y<steps){const a=start+y*(steps+1)+x;indices.push(a,a+1,a+steps+2,a,a+steps+2,a+steps+1);}}
    }
    const mesh=new pc.Mesh(this.app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);const shell=new pc.Entity('polished rounded ivory die'),material=this.material('#fff7df').clone();material.gloss=.68;material.metalness=.04;material.update();shell.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});this.dice.addChild(shell);
    const faces=[{n:1,axis:'y',sign:1},{n:6,axis:'y',sign:-1},{n:2,axis:'z',sign:1},{n:5,axis:'z',sign:-1},{n:3,axis:'x',sign:1},{n:4,axis:'x',sign:-1}];
    const patterns={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
    for(const face of faces)for(const [u,v] of patterns[face.n]){
      const d=.23;let at;
      if(face.axis==='y')at=[u*d,face.sign*.502,v*d];
      else if(face.axis==='z')at=[u*d,v*d,face.sign*.502];
      else at=[face.sign*.502,v*d,u*d];
      this.primitive(`pip ${face.n}`,'sphere',at,face.axis==='y'?[.125,.018,.125]:face.axis==='z'?[.125,.125,.018]:[.018,.125,.125],'#142847',null,this.dice);
    }
    // The safe screen reservation is a foreground 3D presentation: terrain
    // must not bury the cube, while its own faces still share a depth buffer.
    this.diceLayer=new pc.Layer({name:'Dice presentation',clearDepthBuffer:true});
    this.app.scene.layers.push(this.diceLayer);this.camera.camera.layers=[...this.camera.camera.layers,this.diceLayer.id];
    for(const render of this.dice.findComponents('render'))render.layers=[this.diceLayer.id];
    for(const light of this.app.root.findComponents('light'))light.layers=[...light.layers,this.diceLayer.id];
    this.dice.enabled=false;
  }
  loadModel(url){return new Promise((resolve,reject)=>this.app.assets.loadFromUrlAndFilename(url,url.split('/').pop(),'container',(error,asset)=>error?reject(new Error(`${url}: ${error}`)):resolve(asset)));}
  fitFootprint(root,maxSize){
    const boxes=root.findComponents('render').flatMap(r=>r.meshInstances.map(m=>m.aabb)),min=[Infinity,Infinity],max=[-Infinity,-Infinity];
    for(const b of boxes){min[0]=Math.min(min[0],b.center.x-b.halfExtents.x);min[1]=Math.min(min[1],b.center.z-b.halfExtents.z);max[0]=Math.max(max[0],b.center.x+b.halfExtents.x);max[1]=Math.max(max[1],b.center.z+b.halfExtents.z);}
    const size=Math.max(max[0]-min[0],max[1]-min[1])/MAP_SCALE,factor=Math.min(1,maxSize/size);if(Number.isFinite(factor)&&factor>0){const world=root.getPosition(),local=root.getLocalPosition().clone(),dx=((min[0]+max[0])/2-world.x)*factor/MAP_SCALE,dz=((min[1]+max[1])/2-world.z)*factor/MAP_SCALE;root.setLocalScale(root.getLocalScale().clone().mulScalar(factor));root.setLocalPosition(local.x-dx,local.y,local.z-dz);}root.footprintLimit=maxSize;
  }
  async loadModels(){
    const careers=Object.keys(careerAccents);
    let settled=0;this.onLoadProgress?.(`職業棋子 0 / ${careers.length}`);
    const results=await Promise.allSettled(careers.map(async career=>{
      try{
        const asset=await this.loadModel(`./assets/cast/${career}.glb`).catch(()=>
          this.loadModel(`./assets/cast/compact/${career}.glb`));
        this.modelAssets.set('career/'+career,asset);
      }finally{this.onLoadProgress?.(`職業棋子 ${++settled} / ${careers.length} 已處理`);}
    }));
    const failed=results.filter(result=>result.status==='rejected');if(failed.length)console.warn('部分 3D 素材載入失敗',failed.map(x=>x.reason.message));
    this.stage.dataset.cityAssetBuildings=String(this.cityBuildings?.length||0);
  }
  makeAssetFigure(career,parent,scale=.85){
    const asset=this.modelAssets.get(`career/${career}`);
    if(!asset)return this.makeCareerFigure(career,parent,scale);
    const body=asset.resource.instantiateRenderEntity({castShadows:false});
    body.name=`Quaternius ${career}`;parent.addChild(body);
    body.setLocalPosition(0,.24,0);body.setLocalScale(scale*1.18,scale*1.18,scale*1.18);
    const animations=asset.resource.animations,idle=animations?.find(animation=>animation.resource?.name==='Idle'),walk=animations?.find(animation=>animation.resource?.name==='Walk');
    if(idle?.resource&&walk?.resource){
      body.addComponent('anim',{activate:true});
      body.anim.assignAnimation('Idle',idle.resource);
      body.anim.assignAnimation('Walk',walk.resource);
      body.anim.baseLayer.transition('Idle');
    }
    this.equipImportedFigure(career,body);
    return {body,limbs:null,asset};
  }
  equipImportedFigure(career,body){
    const part=(name,type,pos,size,color)=>this.primitive(`${career} ${name}`,type,pos,size,color,null,body);
    if(career==='engineer'){
      part('laptop keyboard','box',[.46,.92,.32],[.38,.035,.25],'#597a89');
      part('laptop display','box',[.46,1.02,.21],[.38,.22,.032],'#284d5b');
    }else if(career==='doctor'){
      for(const x of [-.18,.18]){
        const lapel=part(`coat lapel ${x}`,'box',[x,1.29,.19],[.2,.4,.045],'#f8f9ef');lapel.setLocalEulerAngles(0,0,x<0?13:-13);
        part(`coat tail ${x}`,'box',[x,.91,.16],[.22,.48,.045],'#f8f9ef');
      }
      part('medical cross','box',[.2,1.23,.23],[.045,.16,.025],'#ed6372');
      part('medical cross arm','box',[.2,1.23,.24],[.16,.045,.025],'#ed6372');
      part('stethoscope','sphere',[-.12,1.2,.24],[.09,.09,.045],'#336e84');
    }else if(career==='founder'){
      part('portfolio case','box',[.55,.62,.05],[.43,.34,.16],'#b98542');
      part('case handle','box',[.55,.85,.05],[.2,.07,.07],'#e2bd71');
    }else if(career==='freelancer'){
      part('sketch bag','box',[-.52,.81,.03],[.38,.5,.2],'#ad7fb1');
      part('sketch bag flap','box',[-.52,1.02,.16],[.39,.11,.04],'#e9c47d');
    }else if(career==='sales'){
      part('sales sample case','box',[.52,.63,.06],[.4,.33,.16],'#d89c5b');
      part('sample case latch','box',[.52,.66,.15],[.1,.08,.04],'#ffe19d');
    }else if(career==='assistant'){
      part('headset band','box',[.34,1.66,0],[.08,.32,.37],'#64cbe5');
      part('headset mic','box',[.37,1.51,.26],[.24,.05,.05],'#64cbe5');
    }
  }
  makeCareerFigure(career,parent,scale=.85,alternate=false){
    const asset=this.modelAssets.get(`career/${career}`);
    if(!asset){
      const body=new pc.Entity('備用職業棋子');
      parent.addChild(body);
      body.setLocalScale(scale,scale,scale);
      this.primitive('棋座','cylinder',[0,.18,0],[.84,.36,.84],careerAccents[career],null,body);
      const bodyColor=alternate?secondWardrobe[career]?.[career+'3']:careerAccents[career];
      this.primitive('棋身','capsule',[0,.75,0],[.55,1.30,.55],bodyColor||careerAccents[career],null,body);
      this.primitive('棋冠','sphere',[0,1.54,0],[.78,.78,.78],'#fff0cc',null,body);
      return {body,limbs:{},asset:null};
    }
    const body=asset.resource.instantiateRenderEntity({castShadows:false});
    body.name=`3D ${career} figure`;
    body.characterRevision='studio-cast';
    body.castHead=body.findByName('head and hair');
    body.neutralHead=body.castHead?.getLocalEulerAngles().clone();
    parent.addChild(body);
    body.setLocalPosition(0,.195,0);
    const fittedScale=scale*2.77/4.18;
    body.setLocalScale(fittedScale,fittedScale,fittedScale);
    body.castRig=bindCastMotion(body,career);
    for(const renderer of body.findComponents('render')){
      if(this.castLayer)renderer.layers=[this.castLayer.id];
      for(const {material} of renderer.meshInstances){
        if(!(material instanceof pc.StandardMaterial))continue;
        const chunks=material.getShaderChunks(pc.SHADERLANGUAGE_GLSL);
        if(chunks.get('lightDiffuseLambertPS')===castDiffuse)continue;
        chunks.set('lightDiffuseLambertPS',castDiffuse);
        material.update();
      }
    }
    if(alternate)dressSecondFigure(body,career);
    const limbs={};
    for(const name of ['leg-left','leg-right','arm-left','arm-right']){
      const entity=body.findByName(name);
      if(entity)limbs[name]={entity,base:entity.getLocalEulerAngles().clone()};
    }
    return {body,limbs,asset};
  }
  makeShowcaseActor(career,x,z,scale=1.5){
    const root=new pc.Entity(`showcase ${career}`);root.setPosition(x,SHOWCASE_Y,z);root.setLocalScale(1.08,1.08,1.08);this.app.root.addChild(root);
    this.primitive(`showcase shadow ${career}`,'cylinder',[0,.03,0],[.72,.07,.63],'#071d36',null,root);
    this.primitive(`showcase stage ${career}`,'cylinder',[0,.13,0],[.82,.13,.72],careerAccents[career],careerAccents[career],root);
    const {body}=this.makeCareerFigure(career,root,scale);
    const label=document.createElement('span');label.className=`showcase-label career-${career}`;label.textContent=`${careerGlyphs[career]} ${this.careerName(career)}`;this.stage.append(label);
    return {root,body,label,career,x,z};
  }
  careerName(id){return {founder:'創業家',freelancer:'自由業者',engineer:'軟體工程師',doctor:'醫生',sales:'公司業務',assistant:'公司助理'}[id]||id;}
  makeShowcase(){const a=tileWorld(0),b=tileWorld(10);this.showcase=[this.makeShowcaseActor('engineer',a.x,a.z),this.makeShowcaseActor('doctor',b.x,b.z)].filter(Boolean);this.stage.dataset.showcaseModels=String(this.showcase.length);}
  previewCareer(career){
    if(this.preview){this.preview.root.destroy();this.preview.label.remove();this.preview=null;}
    const player=this.state?.players?.[this.state.setupIndex];
    if(career&&careerAccents[career]){const point=tileWorld(player?.position??0);this.preview=this.makeShowcaseActor(career,point.x,point.z);}
    for(const pawn of this.pawns.values())pawn.root.enabled=!(this.preview&&player?.seat===this.followSeat&&pawn===this.pawns.get(player.seat));
    this.stage.dataset.previewCareer=career||'';
  }
  makePawn(player,seat,index,alternate){
    const root=new pc.Entity(`player ${seat}`);root.setLocalScale(1.08,1.08,1.08);this.app.root.addChild(root);
    const ring=this.primitive(`player ${seat} aura`,'cylinder',[0,.47,0],[.62,.06,.62],seatColors[index%seatColors.length],seatColors[index%seatColors.length],root);
    const {body,limbs}=this.makeCareerFigure(player.career?.id||'assistant',root,.9,alternate);
    const label=document.createElement('span');label.className='pawn-label';label.textContent=seat;this.stage.append(label);this.labels.set(seat,label);
    this.pawns.set(seat,{root,ring,body,limbs,bodyBaseY:.24,modelLoaded:true,career:player.career?.id,alternate,position:player.position,index});return this.pawns.get(seat);
  }
  decoratePawn(root,career){
    const accent=careerAccents[career]||'#ffcb45';
    const crest=this.primitive('career crest','box',[0,2.63,0],[.2,.2,.2],accent,accent,root);crest.setLocalEulerAngles(30,45,30);
    if(career==='founder'){
      this.primitive('founder crown band','box',[0,2.78,-.04],[.64,.12,.48],accent,null,root);
      for(const x of [-.2,0,.2])this.primitive('founder crown point','sphere',[x,2.96,-.04],[.11,.16,.1],accent,accent,root);
    }else if(career==='freelancer'){
      const cap=this.primitive('freelancer beret','cylinder',[0,2.82,0],[.52,.1,.44],accent,null,root);cap.setLocalEulerAngles(0,0,12);
      this.primitive('freelancer pen','box',[.31,1.54,.29],[.07,.37,.07],'#ffe2ad',null,root);
    }else if(career==='engineer'){
      this.primitive('software laptop keyboard','box',[.48,1.03,.64],[.55,.044,.38],'#597a89',null,root);
      this.primitive('software laptop display','box',[.48,1.19,.48],[.55,.32,.044],'#284d5b',null,root);
      this.primitive('software editor line','box',[.43,1.22,.51],[.21,.028,.015],'#7de2be',null,root);
    }else if(career==='doctor'){
      this.primitive('doctor coat front','box',[0,1.27,.56],[.66,.86,.1],'#fffaf0',null,root);
      for(const x of [-.34,.34])this.primitive('doctor coat sleeve','box',[x,1.32,.32],[.16,.78,.2],'#fffaf0',null,root);
      this.primitive('doctor shirt seam','box',[0,1.27,.63],[.06,.7,.04],'#90bdd2',null,root);
      this.primitive('doctor chest cross vertical','box',[.19,1.42,.65],[.06,.19,.04],accent,accent,root);
      this.primitive('doctor chest cross horizontal','box',[.19,1.42,.66],[.19,.06,.04],accent,accent,root);
      for(const x of [-.15,.15])this.primitive('doctor stethoscope tube','box',[x,1.6,.68],[.045,.38,.045],'#174963',null,root);
      this.primitive('doctor stethoscope bridge','box',[0,1.42,.69],[.33,.045,.05],'#174963',null,root);
      this.primitive('doctor stethoscope bell','sphere',[0,1.36,.73],[.11,.11,.07],'#7ec8db',null,root);
      this.primitive('doctor cap','box',[0,2.84,-.03],[.62,.15,.5],'#ffffff',null,root);
      this.primitive('doctor cross vertical','box',[0,2.87,.27],[.09,.23,.07],accent,accent,root);
      this.primitive('doctor cross horizontal','box',[0,2.87,.28],[.23,.09,.07],accent,accent,root);
    }else if(career==='sales'){
      const tie=this.primitive('sales tie','box',[0,1.42,.52],[.15,.35,.07],accent,accent,root);tie.setLocalEulerAngles(0,0,12);
      this.primitive('sales briefcase','box',[.48,.92,-.12],[.29,.26,.15],'#9e6b3b',null,root);
    }else if(career==='assistant'){
      this.primitive('assistant headset band','box',[0,2.82,0],[.6,.07,.5],accent,null,root);
      this.primitive('assistant headset mic','box',[.35,2.53,.37],[.07,.26,.07],accent,accent,root);
    }
  }
  posePawn(pawn,phase,active,stride=Number(active)){
    if(pawn?.body?.anim){
      if(pawn.walking!==active){pawn.body.anim.baseLayer.transition(active?'Walk':'Idle',this.reducedMotion?0:active?.18:.22);pawn.walking=active;}
      pawn.body.anim.speed=this.reducedMotion?0:active?.78+.27*stride:1;
      return;
    }
    if(!pawn?.limbs)return;
    blinkCast(pawn.body.castRig,this.showcaseTime,pawn.index+1,this.reducedMotion);
    const revealed=this.state?.phase==='careerResult' && this.state.setupIndex===pawn.index;
    const greeting=revealed ? (this.reducedMotion?1:clamp((this.showcaseTime-this.revealStarted)/.42,0,1)) : 0;
    smileCast(pawn.body.castRig, this.celebrating&&!active ? 1 : .76*greeting);
    const swing=Math.sin(phase)*29*stride;
    const weightShift=active?Math.cos(phase)*stride:0;
    if(pawn.body.castRig)walkCast(pawn.body.castRig,phase,stride);
    else for(const [name,sign] of [['leg-left',1],['leg-right',-1],['arm-left',-1],['arm-right',1]]){
      const limb=pawn.limbs[name];if(!limb)continue;const arm=name.startsWith('arm');
      const angle=swing*sign*(arm?.70:1);
      limb.entity.setLocalEulerAngles(limb.base.x+angle,limb.base.y,limb.base.z+weightShift*(arm?1.8:.8));
    }
    const neutral=pawn.body?.neutralHead;
    if(neutral){
      const idle=this.showcaseTime*.86+pawn.index*1.9;
      const nod=this.reducedMotion?0:active?Math.cos(phase*2)*.95*stride:Math.sin(idle)*.8;
      const glance=this.reducedMotion?0:active?-Math.sin(phase)*1.4*stride:Math.sin(idle*.57)*2.3;
      const sway=active&&!this.reducedMotion?Math.sin(phase)*2.5*stride:0;
      pawn.body.castHead.setLocalEulerAngles(neutral.x+nod,neutral.y+glance,neutral.z+sway+greeting*3);
    }
    if(pawn.body){
      const hasContact=pawn.body.castRig?.contacts.length===4&&!this.celebrating;
      const lift=active?(Math.sin(phase)**2-.4)*.035*stride:this.reducedMotion||hasContact?0:Math.sin(this.showcaseTime*2+pawn.index)*.012;
      pawn.body.setLocalPosition(weightShift*.026,pawn.bodyBaseY+lift,0);
      if(hasContact&&active){
        const lowest=Math.min(...pawn.body.castRig.contacts.map(sole=>sole.getPosition().y));
        const scale=pawn.root.getLocalScale().y;
        pawn.body.setLocalPosition(weightShift*.026,pawn.bodyBaseY+lift+(.68-lowest)/scale,0);
      }
    }
  }
  removePawn(seat){this.pawns.get(seat)?.root.destroy();this.pawns.delete(seat);this.labels.get(seat)?.remove();this.labels.delete(seat);}
  displayPoint(player,state){const base=tileWorld(player.position),group=state.players.filter(p=>p.position===player.position),rank=group.findIndex(p=>p.seat===player.seat),columns=group.length<=3?group.length:Math.min(4,Math.ceil(Math.sqrt(group.length))),rows=Math.ceil(group.length/columns),spacingX=group.length>3?1.9:2.4,spacingZ=group.length>3?2.55:2.4;return new pc.Vec3(base.x+(rank%columns-(columns-1)/2)*spacingX,PAWN_Y,base.z+(Math.floor(rank/columns)-(rows-1)/2)*spacingZ);}
  sync(state,roster,revision,localSeat){
    const previousState=this.state,newGame=isNewGame(previousState,state);
    if(state.phase==='careerResult' && (newGame || previousState?.phase!==state.phase || previousState?.setupIndex!==state.setupIndex)){
      this.revealStarted=this.showcaseTime;
    }
    if(newGame){
      this.motion=null;this.diceMotion=null;this.lastRollKey=null;this.dice.enabled=false;this.celebrationStart=null;this.celebrationSkipped=false;this.awardWinners=[];this.presentationSeat=null;this.crowdFrameKey=null;this.resetView();
      try{sessionStorage.removeItem(motionKey(new URLSearchParams(location.search).get('room'),previousState));}catch{}
      this.arrivalPulse=null;this.motionRollId=null;this.motionStorageKey=null;this.stage.dataset.motion='idle';delete this.stage.dataset.motionStep;delete this.stage.dataset.motionSeat;delete this.stage.dataset.die;delete this.stage.dataset.awardPhase;
    }
    this.state=state;this.roster=roster;this.localSeat=localSeat;
    this.cardPresentation=['setup','careerResult','income','incomeResult','deck','revealGroup','investIdle','offer','marketReady','marketReveal'].includes(state.phase);
    const finalAwards=state.phase==='summary'&&state.round===5;
    if(finalAwards&&(!this.celebrating||newGame))this.replayCelebration();
    if(!finalAwards&&this.celebrating)this.app.autoRender=true;
    this.celebrating=finalAwards;
    if(this.podiumRoot)this.podiumRoot.enabled=finalAwards;
    this.stage.dataset.awards=finalAwards?'true':'false';
    for(const actor of this.showcase){actor.root.enabled=state.phase==='lobby';actor.label.hidden=state.phase!=='lobby';}
    if(state.phase!=='setup'&&this.preview)this.previewCareer(null);
    const visiblePlayers=state.phase==='lobby'?[]:state.players;
    // The server has already moved the actor. Keep the departure formation
    // while the client presents the die, rather than centering both occupants.
    const startingRoll=state.lastRoll&&state.lastRoll.id!==this.lastRollKey&&(state.phase==='deck'||(!newGame&&previousState?.phase==='roll'&&previousState.lastRoll?.id!==state.lastRoll.id))?state.lastRoll:null;
    const departureRoll=this.reducedMotion?null:startingRoll||(this.motion?.phase==='dice'?state.lastRoll:null);
    const formation=departureRoll?{...state,players:state.players.map(p=>p.seat===departureRoll.seat?{...p,position:departureRoll.from}:p)}:state;
    const present=new Set(visiblePlayers.map(p=>p.seat));for(const seat of this.pawns.keys())if(!present.has(seat))this.removePawn(seat);
    visiblePlayers.forEach((player,index)=>{
      const alternate=wearsSecondWardrobe(state.players,player);
      let pawn=this.pawns.get(player.seat);
      if(pawn&&(pawn.career!==player.career?.id||pawn.alternate!==alternate)){this.removePawn(player.seat);pawn=null;}
      if(!pawn)pawn=this.makePawn(player,player.seat,index,alternate);
      pawn.position=player.position;
      const formationPlayer=formation.players.find(p=>p.seat===player.seat);
      pawn.formationPosition=formationPlayer.position;
      const tileCrowd=formation.players.filter(other=>other.position===formationPlayer.position).length;
      // Keep a single active figure readable while preserving the compact 12-player formation.
      const figureScale=tileCrowd===1?1.7:tileCrowd<=3?1.2:1.02;
      pawn.root.setLocalScale(figureScale,figureScale,figureScale);
      pawn.bodyBaseY=(.68-PAWN_Y)/figureScale;pawn.body.setLocalPosition(0,pawn.bodyBaseY,0);pawn.ring.setLocalPosition(0,(.66-PAWN_Y)/figureScale-.03,0);
      pawn.crowdCount=tileCrowd;
      if(this.motion?.seat!==player.seat)pawn.root.setPosition(this.displayPoint(formationPlayer,formation));
      const member=roster.find(p=>p.seat===player.seat),label=this.labels.get(player.seat),crowded=tileCrowd>3,name=member?.nickname||'未命名玩家';label.textContent=`${careerGlyphs[player.career?.id]||'●'} ${crowded?`${player.seat}`:name}`;label.className=`pawn-label career-${player.career?.id||'unknown'}${crowded?' crowded':''}`;label.title=`${player.seat} · ${name} · ${player.career?.name||'待抽職業'}`;
    });
    this.stage.dataset.modelCount=String([...this.pawns.values()].filter(p=>p.modelLoaded).length);
    const marketPresentation=['marketReady','marketReveal'].includes(state.phase);
    const actor=marketPresentation?state.players[state.drawer]?.seat:['setup','careerResult'].includes(state.phase)?state.players[state.setupIndex]?.seat:['income','incomeResult'].includes(state.phase)?state.players[state.incomeIndex]?.seat:state.phase==='coInvest'?state.players[state.coInvest?.targetIndex]?.seat:state.players[state.turn]?.seat;
    // Keep an explicitly rotated view anchored; default market views follow the drawer.
    if(!(marketPresentation&&this.stage.dataset.manualView==='true'&&!this.viewSeat&&this.followSeat))this.followSeat=this.presentationSeat&&!this.viewSeat?this.presentationSeat:this.viewSeat&&state.players.some(player=>player.seat===this.viewSeat)?this.viewSeat:actor??state.players[0]?.seat;
    for(const pawn of this.pawns.values()){
      // A seat which has not drawn yet has no character to present at a reveal.
      pawn.root.enabled=!(this.preview&&pawn===this.pawns.get(this.followSeat))&&
        (state.phase!=='careerResult'||Boolean(pawn.career));
    }
    this.awardLabels?.forEach(label=>{label.hidden=!finalAwards;});for(const pawn of this.pawns.values())pawn.ring.enabled=!finalAwards;
    if(finalAwards){this.motion=null;this.diceMotion=null;this.dice.enabled=false;syncAwards(this,state,roster);this.invalidateAwardLayout();}
    if(state.lastRoll&&state.lastRoll.id!==this.lastRollKey){
      this.lastRollKey=state.lastRoll.id;
      // Reconnecting after the landing phase must not replay a historical roll.
      if(state.phase==='deck'||(!newGame&&previousState?.phase==='roll'&&previousState.lastRoll?.id!==state.lastRoll.id))this.animateRoll(state.lastRoll);
    }
    const crowd=this.pawns.get(this.followSeat),frameKey=crowd?.crowdCount>1?`${this.followSeat}:${crowd.formationPosition}:${crowd.crowdCount}`:'';
    const frameNow=frameKey&&frameKey!==this.crowdFrameKey;this.crowdFrameKey=frameKey;
    this.updateCamera(Boolean(frameNow));if(frameNow)this.updateLabels();
    this.app.renderNextFrame=true;
  }
  resetView(){this.panOffset.set(0,0,0);this.orbitYaw=0;this.orbitPitch=0;this.viewZoom=1;this.stage.dataset.manualView='false';}
  setOverview(value){this.overview=value;this.overviewFit=value;this.resetView();this.stage.dataset.camera=value?'overview':'follow';this.updateCamera(true);}
  setFocusSeat(seat,{preserveView=false}={}){
    this.viewSeat=seat;
    this.followSeat=seat||this.localSeat||this.followSeat;
    if(!preserveView)this.resetView();
    this.stage.dataset.viewSeat=seat||'';
    const pawn=this.pawns.get(seat);
    if(!preserveView&&seat!==this.localSeat&&pawn?.crowdCount>3&&this.state?.phase==='roll'){
      const member=this.roster.find(player=>player.seat===seat);
      const banner=document.createElement('div');
      banner.className='crowd-selection';
      banner.textContent=[seat,member?.nickname,this.careerName(pawn.career)].filter(Boolean).join(' · ');
      this.stage.append(banner);
    }
    this.updateCamera(true);
    this.updateLabels();
  }
  setOverviewFit(value){this.overviewFit=value;this.panOffset.set(0,0,0);this.stage.dataset.manualView='false';this.updateCamera(true);}
  audioBus(){return this.gameAudio??=new GameAudio();}
  setSound(value){this.soundOn=Boolean(value);this.audioBus().setEnabled(value);}
  audioCue(name,key,options){return this.audioBus().cue(name,key,options);}
  settleArrival(){
    // Commit only the presentation formation. The server's position and money
    // already describe the landing; do not wait for the next card response.
    this.sync(this.state,this.roster,undefined,this.localSeat);
    this.updateCamera(true);this.updateLabels();
  }
  animateRoll(roll){
    const pawn=this.pawns.get(roll.seat);if(!pawn)return;
    this.motionStorageKey=motionKey(new URLSearchParams(location.search).get('room'),this.state);
    this.motionRollId=roll.id;this.presentationSeat=roll.seat;if(!this.viewSeat)this.followSeat=roll.seat;
    this.stage.dataset.motionSeat=roll.seat;this.stage.dataset.die=String(roll.die);
    let checkpoint=null;
    try{checkpoint=JSON.parse(sessionStorage.getItem(this.motionStorageKey));}catch{}
    beginRollRoute(this,roll,checkpoint,tileAt,BOARD.length);
    if(this.reducedMotion){
      const completed=checkpoint?.id===roll.id&&checkpoint.step>=roll.path.length;
      this.finishRoll(roll,{announce:!completed,audible:!completed,defer:true});
      return;
    }
    if(checkpoint?.id===roll.id&&checkpoint.phase==='path'){
      const step=Math.max(0,Math.min(roll.path.length,checkpoint.step||0));
      this.dice.enabled=false;this.diceMotion=null;this.stage.dataset.motionStep=String(step);this.stage.dataset.motionSeat=roll.seat;
      if(step===roll.path.length){this.finishRoll(roll,{audible:false,defer:true});return;}
      const start=step?tileWorld(roll.path[step-1]):pawn.root.getPosition().clone();
      pawn.root.setPosition(start.x,PAWN_Y,start.z);
      this.motion={seat:roll.seat,path:roll.path.slice(),step,t:0,start:new pc.Vec3(start.x,PAWN_Y,start.z),end:tileWorld(roll.path[step]),phase:'path'};
      this.stage.dataset.motion='path';return;
    }
    const start=pawn.root.getPosition().clone();
    this.motion={seat:roll.seat,path:roll.path.slice(),step:0,t:0,start:new pc.Vec3(start.x,PAWN_Y,start.z),end:tileWorld(roll.path[0]),phase:'dice'};
    this.stage.dataset.motion='dice';this.stage.dataset.motionStep='0';
    this.dice.enabled=true;
    this.diceMotion={time:0,spinDuration:1.65,duration:2.15,face:roll.die,landed:false};
    this.updateCamera(true);
    this.layoutDicePresentation();
    this.audioCue('diceStart','diceStart:'+roll.id);
    this.app.renderNextFrame=true;
  }
  finishRoll(roll,{announce=false,audible=true,defer=false}={}){
    const arrived=this.state.players.find(player=>player.seat===roll.seat);
    const pawn=this.pawns.get(roll.seat);
    this.dice.enabled=false;
    this.diceMotion=null;
    this.motion=null;
    if(pawn&&arrived){
      pawn.root.setPosition(this.displayPoint(arrived,this.state));
      this.posePawn(pawn,0,false);
    }
    this.saveMotionProgress(roll.path.length);
    this.stage.dataset.motionStep=String(roll.path.length);
    this.stage.dataset.motion='landed';
    this.settleArrival();
    if(announce)this.onDiceLanded?.(roll.die);
    if(audible){
      this.audioCue('arrival','arrival:'+roll.id);
      if(!this.reducedMotion)this.arrivalPulse={seat:roll.seat,started:performance.now()};
    }
    if(defer){
      const state=this.state;
      queueMicrotask(()=>{if(this.state===state)this.onMotionComplete?.();});
    }else this.onMotionComplete?.();
  }
  saveMotionProgress(step){
    if(!this.motionStorageKey)return;
    try{sessionStorage.setItem(this.motionStorageKey,JSON.stringify({id:this.motionRollId,phase:'path',step}));}catch{}
  }
  layoutDicePresentation(attempt=0){
    const m=this.diceMotion;if(!m||!this.dice.enabled)return;
    // A reservation measured while loading or reframing must not permanently
    // lock out a later valid camera composition. Retry against current bounds.
    if(attempt===0&&m.framingBlocked){m.radius=0;m.slot=null;}
    const width=this.stage.clientWidth,height=this.stage.clientHeight,mobile=width<700,edge=m.edgePixels??(mobile?64:76),radius=Math.max(Math.ceil(edge*1.25)+28,m.radius||0);
    this.camera.camera.onAppPrerender();this.updateLabels();
    const stageRect=this.stage.getBoundingClientRect();
    const reservations=()=>{const blockers=[];
    for(const pawn of this.pawns.values()){
      const b=this.projectBounds(pawn.root,true);if(b?.farthestDepth>0&&b.right>0&&b.left<width&&b.bottom>0&&b.top<height)blockers.push({left:b.left-12,right:b.right+12,top:b.top-16,bottom:b.bottom+12});
    }
    for(const element of document.querySelectorAll('.topbar,.play-panel,.players-live,.finance-nav,.world-toolbar,.player-strip,.main-action-tray,.world-heading,.stage-timer,#dice-readout,#card-focus,#camera-button,.pawn-label,.district-label,.landmark-label,.crowd-selection')){
      const style=getComputedStyle(element),r=element.getBoundingClientRect();if(element.hidden||style.display==='none'||style.visibility==='hidden'||!r.width||!r.height)continue;
      blockers.push({left:r.left-stageRect.left-8,right:r.right-stageRect.left+8,top:r.top-stageRect.top-8,bottom:r.bottom-stageRect.top+8});
    }
    return blockers;};
    // Recompute the full spin envelope at a smaller readable size when controls
    // leave no safe slot. Keep the original animation clock and path intact.
    const retrySmaller=()=>{if(edge<=48)return false;m.edgePixels=Math.max(48,edge-8);m.radius=0;m.slot=null;this.layoutDicePresentation(0);return true;};
    const actorBounds=mobile?this.projectBounds(this.pawns.get(this.motion?.seat||this.followSeat)?.root):null;
    const preferred=actorBounds?.inFront?{x:(actorBounds.left+actorBounds.right)/2,y:actorBounds.bottom+radius+20}:{x:this.sceneCenterX||width*.5,y:height*.73};
    // Keep a stable slot while it stays near the actor. The safe-slot solver
    // still decides whether a closer point fits without touching any blocker.
    const previous=mobile&&m.slot&&Math.hypot(m.slot.x-preferred.x,m.slot.y-preferred.y)>radius*.8?null:m.slot;
    let blockers=reservations(),slot=chooseDiceSlot({width,height,radius,blockers,preferred,previous});
    if(!slot){
      // Temporarily reframe the world while retaining the player's orbit and
      // zoom settings. Never fall back to drawing a cube through a person.
      const position=this.camera.getPosition().clone(),aim=this.cameraAim.clone(),rotation=this.camera.getRotation().clone(),ortho=this.camera.camera.orthoHeight;
      const subjects=[...this.pawns.values()].map(p=>({pawn:p,bounds:this.projectBounds(p.root,true)})).filter(({bounds:b})=>b?.farthestDepth>0&&b.right>0&&b.left<width&&b.bottom>0&&b.top<height);
      const actor=this.pawns.get(this.motion?.seat||this.followSeat),depth=Math.max(8,this.camera.forward.dot((actor?.root.getPosition()||this.focus).clone().sub(position)));
      const unit=this.camera.camera.projection===pc.PROJECTION_ORTHOGRAPHIC?ortho*2/height:2*Math.tan(this.camera.camera.fov*Math.PI/360)*depth/height;
      search:for(const factor of [1,1.15,1.35])for(const dy of [-64,64,-128,128,-192,192]){
        const shift=this.camera.up.clone().mulScalar(-dy*unit).sub(this.camera.forward.clone().mulScalar(depth*(factor-1)));
        this.camera.setPosition(position.clone().add(shift));this.camera.setRotation(rotation);this.cameraAim.copy(aim).add(shift);this.camera.camera.orthoHeight=ortho*factor;this.camera.camera.onAppPrerender();this.updateLabels();
        if(subjects.some(({pawn:p,bounds:before})=>{const b=this.projectBounds(p.root,true),wasWhole=before.inFront&&before.left>=0&&before.right<=width&&before.top>=0&&before.bottom<=height;return !b||b.farthestDepth<=0||b.right<=0||b.left>=width||b.bottom<=0||b.top>=height||(wasWhole&&(!b.inFront||b.left<8||b.right>width-8||b.top<8||b.bottom>height-8));}))continue;
        blockers=reservations();slot=chooseDiceSlot({width,height,radius,blockers,preferred,previous});if(slot)break search;
      }
      if(!slot){this.camera.setPosition(position);this.camera.setRotation(rotation);this.cameraAim.copy(aim);this.camera.camera.orthoHeight=ortho;this.camera.camera.onAppPrerender();this.updateLabels();}
      else this.diceCameraBase??={position,aim,rotation,ortho};
    }
    // When controls fill the viewport, the game still advances and the DOM
    // readout shows the result. Keep the cube hidden until a safe slot exists.
    m.framingBlocked=!slot;for(const render of this.dice.findComponents('render'))render.enabled=Boolean(slot);
    if(!slot){if(retrySmaller())return;this.diceLayout={safe:false,edgePixels:edge,radius,blockers,reason:'no-readable-slot'};return;}
    const target=slot;m.slot=slot;
    const cameraPosition=this.camera.getPosition(),forward=this.camera.forward,pawn=this.pawns.get(this.motion?.seat||this.followSeat),depth=Math.max(8,forward.dot((pawn?.root.getPosition()||this.focus).clone().sub(cameraPosition))*.75);
    const point=(x,y)=>{const a=this.camera.camera.screenToWorld(x,y,0),b=this.camera.camera.screenToWorld(x,y,1),ray=b.sub(a),denominator=forward.dot(ray);return a.add(ray.mulScalar((depth-forward.dot(a.clone().sub(cameraPosition)))/denominator));};
    const center=point(target.x,target.y),pixel=point(target.x+1,target.y).sub(center).length(),scale=edge*pixel;
    this.dice.setLocalScale(scale,scale,scale);
    const t=clamp(m.time/m.spinDuration,0,1),energy=1-t;
    const jitter=Math.sin(t*Math.PI*4)*8*energy;
    const lift=-Math.abs(Math.sin(t*Math.PI*3))*16*energy;
    this.dice.setPosition(point(target.x+jitter,target.y+lift));
    // Rotate in camera space so the last spin converges to the actual rolled face.
    const faceAngles={1:[0,0,0],2:[-90,0,0],3:[0,0,90],4:[0,0,-90],5:[90,0,0],6:[180,0,0]};
    const face=new pc.Quat().setFromEulerAngles(...faceAngles[m.face]);
    const tilt=new pc.Quat().setFromEulerAngles(65,20,0);
    const remaining=(1-t)**1.65;
    const spin=new pc.Quat().setFromEulerAngles(-820*remaining,-560*remaining,-445*remaining);
    this.dice.setRotation(this.camera.getRotation().clone().mul(tilt).mul(face).mul(spin));
    const bounds=this.projectBounds(this.dice),overlap=(a,b)=>a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom;
    const safe=bounds?.inFront&&bounds.left>=12&&bounds.right<=width-12&&bounds.top>=12&&bounds.bottom<=height-12&&!blockers.some(b=>overlap(bounds,b));
    if(!safe){
      if(bounds&&attempt<4){m.radius=Math.ceil(Math.max(radius*1.15,target.x-bounds.left,bounds.right-target.x,target.y-bounds.top,bounds.bottom-target.y)+12);return this.layoutDicePresentation(attempt+1);}
      if(retrySmaller())return;m.framingBlocked=true;for(const render of this.dice.findComponents('render'))render.enabled=false;
    }
    this.diceLayout={safe:Boolean(safe),edgePixels:edge,radius,center:target,blockers,bounds,face:m.face};
  }
  update(dt){
    updateRollRoute(this);
    const reduced=this.reducedMotion;
    if(this.celebrating){
      if(reduced&&!this.celebrationSkipped)this.skipCelebration();
      if(!this.awardSettled){
        this.awardSettled=updateAwards(this);
        this.app.renderNextFrame=true;
        if(this.awardSettled)this.app.autoRender=false;
      }
      this.updateCamera();
      return;
    }
    if(!reduced)this.showcaseTime+=dt;
    updateWorldVessels(this,this.showcaseTime,reduced);
    for(const actor of [...this.showcase,this.preview].filter(Boolean)){
      if(actor.root.enabled){
        actor.root.setEulerAngles(0,reduced?0:Math.sin(this.showcaseTime*.7+(actor.x||0))*9,0);
        blinkCast(actor.body?.castRig,this.showcaseTime,Math.abs(actor.x||0)%5+1,reduced);
      }
    }
    const activePawn=this.pawns.get(this.motion?.seat||this.followSeat),activeX=activePawn?.root.getPosition().x??0;
    this.activeZone=activeX< -9?'garden':activeX>9?'harbor':'finance';
    const pulse=reduced?.5:(Math.sin(this.showcaseTime*3)+1)/2;
    const arrivalAge=this.arrivalPulse?(performance.now()-this.arrivalPulse.started)/460:1;
    if(reduced||arrivalAge>=1)this.arrivalPulse=null;
    for(const [seat,pawn] of this.pawns){
      const arrivalLift=this.arrivalPulse?.seat===seat ? .26*Math.sin(Math.PI*arrivalAge)*(1-arrivalAge):0;
      const radius=(seat===this.followSeat?.68+pulse*.12:.62)+arrivalLift;
      pawn.ring?.setLocalScale(radius,.06,radius);
      if(!this.celebrating&&this.motion?.seat!==seat&&(reduced||!pawn.walking&&!pawn.body?.anim))this.posePawn(pawn,0,false);
    }
    for(const [index,{bar,x}] of (this.marketBars||[]).entries()){const effect=Number(this.state?.event?.assetEffect?.[index]);const active=['marketReady','marketReveal'].includes(this.state?.phase);const height=active ? .55+(Number.isFinite(effect)?clamp(1+effect,.45,1.7)*.65:.2)+pulse*.12 : .45+index*.15;bar.setLocalScale(.3,height,.3);bar.setLocalPosition(x,.38+height/2,1.2);}
    if(this.fountainWater)this.fountainWater.setLocalScale(.72+(this.activeZone==='finance'?pulse*.2:0),.055,.72+(this.activeZone==='finance'?pulse*.2:0));
    for(const [index,tree] of (this.treeCanopies||[]).entries())tree.setEulerAngles(0,0,!reduced&&this.activeZone==='garden'?Math.sin(this.showcaseTime*2+index)*5:0);
    if(this.boatHull&&this.boatCabin){const sway=!reduced&&this.activeZone==='harbor'?Math.sin(this.showcaseTime*2)*.17:0;this.boatHull.setLocalPosition(9.75,.32,2.1+sway);this.boatCabin.setLocalPosition(9.75,.56,2.1+sway);}
    if(reduced&&this.motion){
      this.finishRoll(this.state.lastRoll,{announce:this.motion.phase==='dice'&&!this.diceMotion?.landed});
    }
    if(this.diceMotion){
      const dice=this.diceMotion;
      dice.time+=dt;
      if(!dice.landed&&dice.time>=dice.spinDuration){
        dice.landed=true;
        this.audioCue('diceLand','diceLand:'+this.motionRollId);
        this.onDiceLanded?.(dice.face);
      }
      if(dice.time>=dice.duration){
        this.diceMotion=null;
        this.dice.enabled=false;
        if(this.motion){
          this.motion.phase='path';
          this.stage.dataset.motion='path';
          this.saveMotionProgress(0);
        }
      }
    }
    if(this.motion?.phase==='path'){
      const m=this.motion,pawn=this.pawns.get(m.seat);if(!pawn){this.motion=null;return;}
      const segmentLength=Math.hypot(m.end.x-m.start.x,m.end.z-m.start.z);
      const figureHeight=2.5*pawn.root.getLocalScale().y;
      const cycles=segmentLength/(figureHeight*castStrideLength);
      const segmentTime=clamp(cycles*.43,.85,1.55);
      m.t+=dt/segmentTime;
      const t=clamp(m.t,0,1),first=m.step===0,last=m.step===m.path.length-1;
      const e=first&&last?t*t*(3-2*t):first?t*t*(2-t):last?1-(1-t)*(1-t)*(1+t):t;
      const stride=Math.min(first?Math.min(1,t*4):1,last?Math.min(1,(1-t)*4):1);
      // Interpolate to the seat's final spot even when several players share the tile.
      const arriving=last?this.state.players.find(player=>player.seat===m.seat):null;
      const destination=arriving?this.displayPoint(arriving,this.state):m.end;
      const lift=pawn.body.castRig?0:Math.sin(Math.PI*t)*.085*stride,dx=destination.x-m.start.x,dz=destination.z-m.start.z;
      pawn.root.setPosition(lerp(m.start.x,destination.x,e),PAWN_Y+lift,lerp(m.start.z,destination.z,e));
      const targetHeading=Math.atan2(dx,dz)*180/Math.PI,forward=pawn.root.forward,currentHeading=Math.atan2(-forward.x,-forward.z)*180/Math.PI,headingDelta=((targetHeading-currentHeading+540)%360)-180;
      const traveled=Math.hypot(dx,dz)*e;
      const strideLength=figureHeight*castStrideLength;
      const phase=((m.stridePhase||0)+traveled/strideLength)*2*Math.PI;
      pawn.root.setEulerAngles(0,currentHeading+headingDelta*(1-Math.exp(-16*dt)),0);this.posePawn(pawn,phase,true,stride);
      this.targetFocus.copy(pawn.root.getPosition());
      if(t>=1){
        m.step++;
        if(m.step>=m.path.length)this.finishRoll(this.state.lastRoll);
        else{
          this.audioCue('step','step:'+this.motionRollId+':'+m.step);
          this.saveMotionProgress(m.step);
          this.stage.dataset.motionStep=String(m.step);
          m.stridePhase=(m.stridePhase||0)+traveled/strideLength;
          m.start=m.end;
          m.end=tileWorld(m.path[m.step]);
          m.t=0;
        }
      }
    }
    this.updateCamera(reduced,dt);
    this.layoutDicePresentation();
    const readingPanel=document.getElementById('card-focus'),reading=readingPanel&&!readingPanel.hidden&&getComputedStyle(readingPanel).display!=='none';
    if(!this.motion&&!this.celebrating&&!this.overview&&(reading||this.stage.dataset.manualView!=='true')){
      const pawn=this.pawns.get(this.followSeat);
      if(pawn){
        const p=pawn.root.getPosition(),c=this.camera.getPosition();
        const turn=this.state?.phase==='careerResult' ? (pawn.body.castRig?.holdingSide==='left' ? 12 : -12) : 0;
        const target=Math.atan2(c.x-p.x,c.z-p.z)*180/Math.PI+turn;
        const forward=pawn.root.forward,current=Math.atan2(-forward.x,-forward.z)*180/Math.PI;
        const delta=((target-current+540)%360)-180;
        if(Number.isFinite(target))pawn.root.setEulerAngles(0,current+delta*(reduced?1:1-Math.exp(-dt*(reading?10:7))),0);
      }
    }
    this.updateOcclusion(dt);
    this.statsClock+=dt;if(this.statsClock>=1){this.statsClock=0;const draws=this.app.stats?.drawCalls?.total;if(Number.isFinite(draws))this.stage.dataset.drawCalls=String(draws);}
  }
  projectBounds(root,clipNear=false){
    if(!root?.enabled)return null;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const component of root.findComponents('render')){if(!component.enabled||!component.entity.enabled||component.entity.name.endsWith(' aura'))continue;for(const mesh of component.meshInstances||[]){if(!mesh.visible)continue;const {center:c,halfExtents:h}=mesh.aabb;for(const [i,key] of ['x','y','z'].entries()){min[i]=Math.min(min[i],c[key]-h[key]);max[i]=Math.max(max[i],c[key]+h[key]);}}}
    if(!Number.isFinite(min[0]))return null;
    const corners=[];for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])corners.push({x,y,z});
    const position=this.camera.getPosition(),forward=this.camera.forward,depth=p=>(p.x-position.x)*forward.x+(p.y-position.y)*forward.y+(p.z-position.z)*forward.z;
    const visible=clipNear?clipBoxToNearPlane(corners,corners.map(depth),Math.max(.001,this.camera.camera.nearClip)):corners;if(!visible.length)return null;
    const points=visible.map(p=>this.camera.camera.worldToScreen(new pc.Vec3(p.x,p.y,p.z))),depths=visible.map(depth);
    return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),inFront:depths.every(z=>z>0),nearestDepth:Math.min(...depths),farthestDepth:Math.max(...depths)};
  }
  updateOcclusion(dt){
    const pawn=!this.overview&&!this.celebrating?this.projectBounds(this.pawns.get(this.followSeat)?.root):null;
    const die=pawn&&this.dice?.enabled?this.projectBounds(this.dice):null;
    const focused=this.pawns.get(this.followSeat),subjects=focused?.crowdCount>3?[...this.pawns.values()].filter(p=>p.formationPosition===focused.formationPosition).map(p=>this.projectBounds(p.root)).filter(Boolean):pawn?[pawn]:[];
    const protectedRects=subjects.map(p=>({left:p.left-14,right:p.right+14,top:p.top-14,bottom:p.bottom+14,depth:p.nearestDepth}));
    const panel=document.getElementById('card-focus');
    if(pawn&&panel&&!panel.hidden&&getComputedStyle(panel).display!=='none'){
      const r=panel.getBoundingClientRect(),stage=this.stage.getBoundingClientRect();
      if(r.width&&r.height)protectedRects.push({left:r.left-stage.left-8,right:r.right-stage.left+8,top:r.top-stage.top-8,bottom:r.bottom-stage.top+8,depth:pawn.nearestDepth});
    }
    // Hide only foreground groups crossing the pawn/card silhouette. Their meshes
    // stay enabled so bounds remain available and overview can restore originals.
    for(const group of this.occlusionGroups||[]){
      const box=pawn?this.projectBounds(group.root):null;
      const hidesPawn=box&&protectedRects.some(r=>box.nearestDepth<r.depth-.5&&(box.nearestDepth<0||box.right>r.left&&box.left<r.right&&box.bottom>r.top&&box.top<r.bottom));
      const hidesDie=box&&die&&box.nearestDepth<die.nearestDepth&&box.right>die.left-8&&box.left<die.right+8&&box.bottom>die.top-8&&box.top<die.bottom+8;
      group.target=box&&box.farthestDepth>0&&(hidesPawn||hidesDie)?0:1;
      if(group.opacity===group.target)continue;
      group.opacity=group.target===0||this.overview?group.target:lerp(group.opacity,group.target,Math.min(1,dt*10));
      if(Math.abs(group.opacity-group.target)<.005)group.opacity=group.target;
      if(!group.materials)group.materials=group.root.findComponents('render').flatMap(r=>r.meshInstances.map(mesh=>({mesh,original:mesh.material,fade:mesh.material.clone()})));
      for(const {mesh,original,fade} of group.materials){if(group.opacity===1)mesh.material=original;else{fade.blendType=pc.BLEND_NORMAL;fade.opacity=group.opacity;fade.depthWrite=false;fade.update();mesh.material=fade;}}
    }
  }
  layoutStageOverlays(){
    const stage=this.stage.getBoundingClientRect(),width=stage.width,height=stage.height;
    let safeTop=0,right=width;
    for(const element of document.querySelectorAll('.play-panel,.world-toolbar,.topbar')){const r=element.getBoundingClientRect(),style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden'||r.width===0||r.height===0)continue;const left=r.left-stage.left,top=r.top-stage.top,bottom=r.bottom-stage.top;if(r.width>width*.6&&bottom<height*.6)safeTop=Math.max(safeTop,bottom);else if(width>800&&left>width*.5&&r.height>height*.4)right=Math.min(right,left-12);}
    this.sceneCenterX=right/2;this.stage.style.setProperty('--scene-safe-top',`${Math.max(0,safeTop)}px`);this.stage.style.setProperty('--scene-center-x',`${this.sceneCenterX}px`);
  }
  frameCareerReveal(pawn, card) {
    const stage = this.stage.getBoundingClientRect();
    const padding = 12;
    const mobile = stage.width < 700;
    const obstacles = [card, ...Array.from(document.querySelectorAll(
      '.topbar,.stage-timer,.world-toolbar,.players-live,.finance-nav,.main-action-tray,.player-strip,.play-panel'
    )).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
      .map(el => el.getBoundingClientRect())].filter(r => r.width && r.height);
    const top = stage.top + padding;
    const bottom = stage.bottom - padding;
    const heightCap = mobile ? 220 : 360;
    let best;
    // Find a clear column for the full figure and its name, including the
    // career card's real animated position and any open player controls.
    const width = mobile ? 86 : 154;
    const margin=width/2+padding;
    const columns=new Set([stage.left+stage.width/2,stage.left+margin,stage.right-margin]);
    for(const r of obstacles){columns.add(r.left-margin);columns.add(r.right+margin);}
    for (const x of columns) {
      if(x<stage.left+margin||x>stage.right-margin)continue;
      const cuts = obstacles.filter(r => x + width/2 > r.left-padding && x - width/2 < r.right+padding)
        .map(r => [Math.max(top, r.top-padding), Math.min(bottom, r.bottom+padding)])
        .filter(([start,end]) => end>start).sort((a,b) => a[0]-b[0]);
      let cursor = top;
      for (const [start, end] of [...cuts, [bottom,bottom]]) {
        const height = Math.min(heightCap, start-cursor-34);
        const distance = Math.abs(x - (stage.left + stage.width/2));
        const score = height - distance * .08;
        if (height >= 65 && (!best || score > best.score)) {
          best = { x:x-stage.left, y:(cursor+start+24)/2-stage.top, height, width, score };
        }
        cursor = Math.max(cursor,end);
      }
    }
    if (!best) return false;
    const subject = pawn.root.getPosition();
    const outward = new pc.Vec3(subject.x,0,subject.z).normalize();
    const aim = new pc.Vec3(subject.x,subject.y+1.45,subject.z);
    this.camera.camera.projection=pc.PROJECTION_ORTHOGRAPHIC;
    this.camera.camera.orthoHeight=6;
    this.camera.setPosition(aim.x+outward.x*18,aim.y+2.6,aim.z+outward.z*18);
    this.camera.lookAt(aim);
    this.camera.camera.onAppPrerender();
    const bounds=this.projectBounds(pawn.body);
    if (!bounds?.inFront) return false;
    this.camera.camera.orthoHeight*=Math.max((bounds.bottom-bounds.top)/best.height,(bounds.right-bounds.left)/best.width);
    this.camera.camera.onAppPrerender();
    const fitted=this.projectBounds(pawn.body);
    const unit=2*this.camera.camera.orthoHeight/stage.height;
    const translate=this.camera.right.clone().mulScalar(((fitted.left+fitted.right)/2-best.x)*unit)
      .add(this.camera.up.clone().mulScalar((best.y-(fitted.top+fitted.bottom)/2)*unit));
    this.camera.setPosition(this.camera.getPosition().add(translate));
    this.cameraAim.copy(aim).add(translate);
    this.camera.camera.onAppPrerender();
    this.focus.copy(subject);
    return true;
  }
  updateCamera(immediate=false,dt=1/60){
    if(!this.camera)return;
    if(this.diceCameraBase){const b=this.diceCameraBase;this.camera.setPosition(b.position);this.camera.setRotation(b.rotation);this.cameraAim.copy(b.aim);this.camera.camera.orthoHeight=b.ortho;this.diceCameraBase=null;}
    if(this.celebrating){
      if(this.awardLayoutDirty&&!document.getElementById('award-banner').hidden){
        this.awardLayoutDirty=false;
        this.frameAwards();
        this.app.renderNextFrame=true;
      }
      return;
    }
    const mobile=this.stage.clientWidth<700,cardPanel=document.getElementById('card-focus'),modal=cardPanel&&!cardPanel.hidden,modalRect=modal?cardPanel.getBoundingClientRect():null;
    this.layoutStageOverlays();
    const featured=this.pawns.get(this.followSeat);
    if(this.state?.phase==='careerResult'&&modalRect?.height&&featured?.career&&!this.overview&&
      !this.viewSeat&&this.stage.dataset.manualView!=='true'&&this.frameCareerReveal(featured,modalRect))return;
    const movingSeat=this.motion&&!this.viewSeat?this.motion.seat:null;
    const focusPawn=this.pawns.get(movingSeat||this.followSeat),crowded=!this.overview&&this.motion?.phase!=='path'&&focusPawn?.crowdCount>3;
    let target=this.overview?new pc.Vec3(0,0,0):this.pawns.get(this.followSeat)?.root.getPosition()??new pc.Vec3(0,0,0);
    if(this.motion&&!this.overview&&!this.viewSeat)target=this.pawns.get(this.motion.seat)?.root.getPosition()??target;
    else if(this.preview&&this.state?.phase==='setup'&&!this.overview&&mobile)target=this.preview.root.getPosition();
    if(crowded)target=tileWorld(focusPawn.formationPosition??focusPawn.position);
    target=target.clone().add(this.panOffset);
    this.targetFocus.copy(target);
    const trackingPath=this.motion?.phase==='path'&&!this.viewSeat;
    const alpha=immediate||trackingPath||(mobile&&modal&&!this.motion)?1:frameBlend(.12,dt),smooth=(a,b)=>Math.abs(a-b)<.012?b:lerp(a,b,alpha);
    this.focus.x=smooth(this.focus.x,target.x);this.focus.y=smooth(this.focus.y,target.y);this.focus.z=smooth(this.focus.z,target.z);
    const shortLandscape=this.stage.clientHeight<600&&this.stage.clientWidth>this.stage.clientHeight*1.5;
    const lobby=!this.state||this.state.phase==='lobby';
    const follow=!this.overview&&!lobby&&!crowded;
    this.camera.camera.projection=follow?pc.PROJECTION_PERSPECTIVE:pc.PROJECTION_ORTHOGRAPHIC;
    let camTarget,aim;
    if(follow){
      const player=this.state.players.find(p=>p.seat===(movingSeat||this.followSeat));
      const from=movingSeat&&this.motion?.phase==='path'?this.motion.start:tileWorld(player?.position??0);
      const to=movingSeat&&this.motion?.phase==='path'?this.motion.end:tileWorld(((player?.position??0)+1)%BOARD.length);
      const direction=new pc.Vec3(to.x-from.x,0,to.z-from.z).normalize();
      const d=.16;this.cameraDirection.lerp(this.cameraDirection,direction,immediate?1:frameBlend(d,dt)).normalize();
      // Look inward from the board edge so each tile's landmark stays behind its pawn.
      const landmark=(!this.motion||this.motion.phase==='dice')&&this.landmarkLabels.find(item=>item.index===(this.motion?.phase==='dice'?this.state.lastRoll?.from:player?.position))?.root.getPosition();
      const radial=landmark?new pc.Vec3(this.focus.x-landmark.x,0,this.focus.z-landmark.z).normalize():new pc.Vec3(this.focus.x,0,this.focus.z).normalize(),baseX=Math.abs(radial.x)+Math.abs(radial.z)<.1?-this.cameraDirection.x:radial.x,baseZ=Math.abs(radial.x)+Math.abs(radial.z)<.1?-this.cameraDirection.z:radial.z;
      const yaw=this.orbitYaw+(mobile?.18:.42),cos=Math.cos(yaw),sin=Math.sin(yaw);
      let viewX=baseX*cos-baseZ*sin,viewZ=baseX*sin+baseZ*cos;
      // Two or three figures can line up along an inward camera ray. Select
      // a nearby automatic view with distinct horizontal projections. This
      // changes only the camera: tile coordinates and formation stay intact.
      if(this.stage.dataset.manualView!=='true'&&this.motion?.phase!=='path'&&focusPawn&&(focusPawn.crowdCount>=2&&focusPawn.crowdCount<=3||this.state?.phase==='coInvest')){
        const group=[...this.pawns.values()].filter(p=>p.root.enabled&&p.formationPosition===focusPawn.formationPosition).map(p=>p.root.getPosition());
        let best=null;
        for(let step=-12;step<=12;step++){
          const angle=step*Math.PI/12,c=Math.cos(angle),sn=Math.sin(angle),x=viewX*c-viewZ*sn,z=viewX*sn+viewZ*c;
          let separation=group.length>1?Infinity:0;
          for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)separation=Math.min(separation,Math.abs((group[j].x-group[i].x)*z-(group[j].z-group[i].z)*x));
          // R126: separation within this tile must not put another tile's pawn
          // close in front of the invitation camera. Keep every pawn in place.
          let foregroundPenalty=0;
          if(this.state?.phase==='coInvest'){
            const distance=(mobile?(modal?17:29):24)*(mobile&&modal?2.15:1)*(this.viewZoom||1);
            for(const pawn of this.pawns.values()){
              if(!pawn.root.enabled||pawn.formationPosition===focusPawn.formationPosition)continue;
              const p=pawn.root.getPosition(),dx=p.x-this.focus.x,dz=p.z-this.focus.z;
              const toward=dx*x+dz*z,lateral=Math.abs(dx*z-dz*x);
              if(toward>distance*.2&&lateral<distance*.7)foregroundPenalty+=8*(toward/distance-.2)*(1-lateral/(distance*.7));
            }
          }
          const score=separation-Math.abs(angle)*.05-foregroundPenalty;
          if(!best||score>best.score)best={x,z,score,separation,angle,foregroundPenalty};
        }
        if(best&&Number.isFinite(best.separation)){viewX=best.x;viewZ=best.z;this.smallCrowdView={seat:movingSeat||this.followSeat,count:group.length,separation:best.separation,angle:best.angle,foregroundPenalty:best.foregroundPenalty};}
      }
      const walking=this.motion?.phase==='path',modalScale=(mobile&&modal?2.15:1)*(this.viewZoom||1);
      const soloFocus=!modal&&(focusPawn?.crowdCount??1)<=1&&this.state?.phase==='roll';
      const idleDistance=mobile?(modal?17:soloFocus?23:29):(soloFocus?21:24);
      const distance=(walking?(mobile?13:15.5):idleDistance)*modalScale;
      const elevation=(walking?(mobile?12:14):(mobile?8:12))*modalScale+this.orbitPitch;
      camTarget=new pc.Vec3(this.focus.x+viewX*distance,this.focus.y+elevation,this.focus.z+viewZ*distance);
      aim=new pc.Vec3(this.focus.x,this.focus.y+1.3,this.focus.z);
      this.camera.camera.fov=mobile?52:46;
      this.stage.dataset.followDistance=String(distance);this.stage.dataset.followLead='0';
    }else{
      const lobbyView=!this.state||this.state.phase==='lobby';
      const offset=this.overview?(mobile?(this.stage.dataset.manualView==='true'?[0,75,50]:[0,100,1.5]):[0,69,67]):lobbyView?(mobile?[8,40,18]:[10,34,26]):(crowded?[0,28,16]:(mobile?[8,14,18]:[10,19,20]));
      const frameShiftX=shortLandscape?8.2:this.stage.clientWidth>this.stage.clientHeight*1.25?5.2:0;
      const yaw=this.orbitYaw,ox=offset[0]*Math.cos(yaw)-offset[2]*Math.sin(yaw),oz=offset[0]*Math.sin(yaw)+offset[2]*Math.cos(yaw);
      camTarget=new pc.Vec3(this.focus.x+frameShiftX+ox,this.focus.y+offset[1]+this.orbitPitch,this.focus.z+oz);
      aim=new pc.Vec3(this.focus.x+frameShiftX,this.focus.y,this.focus.z);
    }
    if(![this.camera.getPosition().x,this.camera.getPosition().y,this.camera.getPosition().z,this.cameraAim.x,this.cameraAim.y,this.cameraAim.z].every(Number.isFinite)){this.camera.setPosition(camTarget);this.cameraAim.copy(aim);}
    const current=this.camera.getPosition(),nx=smooth(current.x,camTarget.x),ny=smooth(current.y,camTarget.y),nz=smooth(current.z,camTarget.z);
    if(this.overview&&this.overviewFit&&this.stage.dataset.manualView!=='true'){this.camera.setPosition(camTarget);this.cameraAim.copy(aim);this.camera.lookAt(aim);if(mobile)this.camera.rotateLocal(0,0,90);}
    else if(Math.abs(current.x-nx)+Math.abs(current.y-ny)+Math.abs(current.z-nz)>.0001||follow){this.camera.setPosition(nx,ny,nz);this.cameraAim.lerp(this.cameraAim,aim,immediate||trackingPath?1:(mobile&&modal?alpha:frameBlend(.15,dt)));this.camera.lookAt(this.cameraAim);if(this.overview&&mobile)this.camera.rotateLocal(0,0,90);}
    // PlayCanvas refreshes its projection cache at prerender; framing runs earlier.
    // Refresh here so the correction uses this frame's camera, not the previous one.
    this.camera.camera.onAppPrerender();
    if(follow&&!this.overview&&(modal||this.stage.dataset.manualView!=='true')){
      const subject=this.pawns.get(movingSeat||this.followSeat)?.root.getPosition();
      if(subject){const projected=this.camera.camera.worldToScreen(subject),bounds=this.projectBounds(this.pawns.get(movingSeat||this.followSeat)?.root),stageRect=this.stage.getBoundingClientRect(),desiredX=modal&&!mobile?(modalRect.right-stageRect.left+(this.sceneCenterX||this.stage.clientWidth*.5)*2)/2:this.sceneCenterX||this.stage.clientWidth*.5,centerY=modal&&mobile?(modalRect.top-stageRect.top+50)/2:this.stage.clientHeight*.52;
        if(bounds){projected.x=(bounds.left+bounds.right)/2;projected.y=(bounds.top+bounds.bottom)/2;}
        const blockers=[...document.querySelectorAll('.play-panel,.players-live,.finance-nav,.world-toolbar,.player-strip,.main-action-tray,.world-heading,.stage-timer,#dice-readout,#card-focus')].filter(element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;}).map(element=>{const rect=element.getBoundingClientRect();return{left:rect.left-stageRect.left,right:rect.right-stageRect.left,top:rect.top-stageRect.top-12,bottom:rect.bottom-stageRect.top+12};});
        const intervals=[[32,this.stage.clientHeight-32]];for(const blocker of blockers){if(blocker.left>desiredX+48||blocker.right<desiredX-48)continue;const next=[];for(const [top,bottom] of intervals){if(blocker.bottom<=top||blocker.top>=bottom){next.push([top,bottom]);continue;}if(blocker.top>top)next.push([top,blocker.top]);if(blocker.bottom<bottom)next.push([blocker.bottom,bottom]);}intervals.splice(0,intervals.length,...next);}
        const eligible=intervals.filter(([top,bottom])=>bottom-top>=Math.min(96,this.stage.clientHeight*.18));
        const aboveCard=mobile&&modal?eligible.filter(([,bottom])=>bottom<=modalRect.top-stageRect.top):[];
        const verticalInterval=(aboveCard.length?aboveCard:eligible).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0]||[32,this.stage.clientHeight-32];
        // Fit the entire pawn plus its name into the gap below the fixed timer.
        // Centering only the model when this gap is short puts the label under the HUD.
        const labelHeight=this.labels.get(movingSeat||this.followSeat)?.getBoundingClientRect().height||26;
        const headRoom=mobile?18+labelHeight/2+2:Math.max(40,18+labelHeight/2+8),footRoom=mobile?4:12;
        let fittedBounds=bounds;
        const availableHeight=verticalInterval[1]-verticalInterval[0]-headRoom-footRoom;
        if(mobile&&modal&&bounds&&availableHeight>40&&bounds.bottom-bounds.top>availableHeight){
          const subjectDepth=this.camera.forward.dot(subject.clone().sub(this.camera.getPosition())),scale=(bounds.bottom-bounds.top)/availableHeight*1.015;
          if(subjectDepth>0){this.camera.setPosition(this.camera.getPosition().sub(this.camera.forward.clone().mulScalar(subjectDepth*(scale-1))));this.camera.lookAt(this.cameraAim);this.camera.camera.onAppPrerender();fittedBounds=this.projectBounds(this.pawns.get(movingSeat||this.followSeat)?.root);if(fittedBounds){projected.x=(fittedBounds.left+fittedBounds.right)/2;projected.y=(fittedBounds.top+fittedBounds.bottom)/2;}}
        }
        const halfHeight=fittedBounds?(fittedBounds.bottom-fittedBounds.top)/2:75,lower=verticalInterval[0]+halfHeight+headRoom,upper=verticalInterval[1]-halfHeight-footRoom,desiredY=lower<=upper?clamp(centerY,lower,upper):(verticalInterval[0]+verticalInterval[1])/2,fov=this.camera.camera.fov*Math.PI/360,depth=this.camera.forward.dot(subject.clone().sub(this.camera.getPosition())),worldPerPixel=2*Math.tan(fov)*Math.max(1,depth)/this.stage.clientHeight,correctionLimit=immediate||trackingPath||(mobile&&modal)?Infinity:2.5,correctionX=clamp((projected.x-desiredX)*worldPerPixel,-correctionLimit,correctionLimit),correctionY=clamp((projected.y-desiredY)*worldPerPixel,-correctionLimit,correctionLimit);
        this.framing={desiredX,desiredY,projectedY:projected.y,verticalInterval,halfHeight,depth,correctionY};
        if(depth>0&&Number.isFinite(correctionX)&&Number.isFinite(correctionY)&&(Math.abs(correctionX)>.01||Math.abs(correctionY)>.01)){const correction=this.camera.right.clone().mulScalar(correctionX).add(this.camera.up.clone().mulScalar(-correctionY)),position=this.camera.getPosition().add(correction);this.camera.setPosition(position);this.cameraAim.add(correction);this.camera.lookAt(this.cameraAim);}
      }
    }
    const overviewHeight=Math.max(48,43*this.stage.clientHeight/this.stage.clientWidth*.54);
    const desiredHeight=this.overview?(mobile?(this.overviewFit?overviewHeight:overviewHeight*.68):this.overviewFit?45:32):crowded?(mobile?17:16):!this.state||this.state.phase==='lobby'?(mobile?38:shortLandscape?44:43):this.motion?(mobile?16.5:16):(mobile?15:14.5);
    const zoomHeight=desiredHeight*(this.viewZoom||1),currentHeight=this.camera.camera.orthoHeight;this.camera.camera.orthoHeight=Math.abs(currentHeight-zoomHeight)<.02?zoomHeight:lerp(currentHeight,zoomHeight,immediate?1:frameBlend(.08,dt));
    this.camera.camera.onAppPrerender();
    if(((this.overview&&this.overviewFit)||lobby)&&this.stage.dataset.manualView!=='true')this.fitOverviewToControls();
    if(crowded&&modal&&(['careerResult','income','incomeResult'].includes(this.state?.phase)||this.stage.dataset.manualView!=='true'))this.frameIncomeCrowd(focusPawn,modalRect);
  }
  frameIncomeCrowd(focusPawn,cardRect){
    const stage=this.stage.getBoundingClientRect(),mobile=stage.width<700;
    const timer=document.getElementById('stage-timer').getBoundingClientRect();
    const safe=mobile?{left:14,right:stage.width-14,top:timer.bottom-stage.top+32,bottom:cardRect.top-stage.top-14}:{left:cardRect.right-stage.left+20,right:this.sceneCenterX*2-20,top:Math.max(100,timer.bottom-stage.top+32),bottom:stage.height-90};
    if(safe.right-safe.left<80||safe.bottom-safe.top<60)return;
    const group=[...this.pawns.values()].filter(p=>p.formationPosition===focusPawn.formationPosition&&p.root.enabled);
    const bounds=()=>{const boxes=group.map(p=>this.projectBounds(p.root)).filter(Boolean);return boxes.length?{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))}:null;};
    const before=bounds();if(!before)return;
    const scale=Math.max((before.right-before.left)/(safe.right-safe.left),(before.bottom-before.top)/(safe.bottom-safe.top))*(this.viewZoom||1);
    this.camera.camera.orthoHeight*=scale;this.camera.camera.onAppPrerender();
    const fitted=bounds(),unit=this.camera.camera.orthoHeight*2/stage.height;
    const dx=((fitted.left+fitted.right)-(safe.left+safe.right))/2,dy=((fitted.top+fitted.bottom)-(safe.top+safe.bottom))/2;
    const shift=this.camera.right.clone().mulScalar(dx*unit).add(this.camera.up.clone().mulScalar(-dy*unit));
    this.camera.setPosition(this.camera.getPosition().add(shift));this.cameraAim.add(shift);this.camera.lookAt(this.cameraAim);this.camera.camera.onAppPrerender();
    this.incomeFraming={safe,groupCount:group.length,bounds:bounds()};
  }
  fitOverviewToControls(){
    const stage=this.stage.getBoundingClientRect(),lobbyMobile=stage.width<700&&(!this.state||this.state.phase==='lobby'),safe={left:16,right:stage.width-16,top:16,bottom:stage.height-16};
    for(const e of document.querySelectorAll('.play-panel,.world-toolbar,.topbar,.world-heading,#stage-timer,.main-action-tray,#card-focus'+(lobbyMobile?',.touch-hint':''))){
      const r=e.getBoundingClientRect(),style=getComputedStyle(e);if(!r.width||!r.height||style.display==='none'||style.visibility==='hidden')continue;
      const b={left:r.left-stage.left,right:r.right-stage.left,top:r.top-stage.top,bottom:r.bottom-stage.top};
      if(lobbyMobile&&e.matches('.world-toolbar,.play-panel'))safe.bottom=Math.min(safe.bottom,b.top-12);else if(lobbyMobile&&e.matches('.touch-hint'))safe.top=Math.max(safe.top,b.bottom+12);else if(stage.width>700&&b.left>stage.width*.55&&r.height>stage.height*.4)safe.right=Math.min(safe.right,b.left-12);
      else if(b.bottom<stage.height*.42)safe.top=Math.max(safe.top,b.bottom+12);
      else if(b.top>stage.height*.5)safe.bottom=Math.min(safe.bottom,b.top-12);
    }
    if(safe.right-safe.left<120||safe.bottom-safe.top<120)return;
    if(!this.overviewCorners){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],roots=[...this.landmarkLabels.map(l=>l.root),...(this.cityBuildings||[]).map(b=>b.root),...this.mapRoot.children.filter(e=>e.name.startsWith('tile base ')||e.name.startsWith('inner street building'))];
      for(const root of roots)for(const render of root.findComponents('render'))for(const mesh of render.meshInstances){const b=mesh.aabb;for(const [i,k] of ['x','y','z'].entries()){min[i]=Math.min(min[i],b.center[k]-b.halfExtents[k]);max[i]=Math.max(max[i],b.center[k]+b.halfExtents[k]);}}
      // Preserve the R192 readable board framing even though the outer houses are gone.
      min[0]=Math.min(min[0],-35*MAP_SCALE);max[0]=Math.max(max[0],35*MAP_SCALE);min[2]=Math.min(min[2],-30*MAP_SCALE);max[2]=Math.max(max[2],30*MAP_SCALE);
      this.overviewCorners=[];for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])this.overviewCorners.push(new pc.Vec3(x,y,z));
    }
    const projected=()=>{const points=this.overviewCorners.map(p=>this.camera.camera.worldToScreen(p));return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};};
    let b=projected();this.camera.camera.orthoHeight*=Math.max((b.right-b.left)/(safe.right-safe.left),(b.bottom-b.top)/(safe.bottom-safe.top))*1.04;this.camera.camera.onAppPrerender();b=projected();
    const unit=2*this.camera.camera.orthoHeight/stage.height,dx=((b.left+b.right)-(safe.left+safe.right))/2*unit,dy=((b.top+b.bottom)-(safe.top+safe.bottom))/2*unit,shift=this.camera.right.clone().mulScalar(dx).add(this.camera.up.clone().mulScalar(-dy));this.camera.setPosition(this.camera.getPosition().add(shift));this.cameraAim.add(shift);this.camera.camera.onAppPrerender();this.overviewSafeRect=safe;
  }
  frameAwards(){frameAwards(this);}
  updateLabels(){
    if(!this.camera)return;const mobile=this.stage.clientWidth<700;
    // worldToScreen already returns CSS pixel coordinates for this canvas.
    const sx=1,sy=1;
    for(const [seat,label] of this.labels){
      const pawn=this.pawns.get(seat);if(!pawn)continue;
      const crowded=label.classList.contains('crowded'),p=pawn.root.getPosition().clone();
      p.y+=crowded?.12:pawn.crowdCount===1?5.2:pawn.crowdCount<=3?4.1:3.35;
      const screen=this.camera.camera.worldToScreen(p),x=screen.x*sx,y=screen.y*sy;
      const modelBounds=!crowded&&!this.celebrating?this.projectBounds(pawn.root):null,preferredX=modelBounds?(modelBounds.left+modelBounds.right)/2:crowded?x:x+(x<this.stage.clientWidth/2?(mobile?40:28):(mobile?-40:-28));
      label.style.display='block';
      const halfWidth=label.getBoundingClientRect().width/2;
      const labelX=Math.max(halfWidth+8,Math.min(this.stage.clientWidth-halfWidth-8,preferredX));
      const labelY=(modelBounds?modelBounds.top-18:crowded?y+12:y);
      const overviewPair=mobile&&this.overview&&this.overviewFit&&this.pawns.size<=2;
      const visible=(!(mobile&&this.overview&&this.overviewFit)||overviewPair)&&!(this.overview&&crowded)&&pawn.root.enabled&&labelY>0&&labelY<this.stage.clientHeight&&(!mobile||crowded||overviewPair||seat===this.followSeat||seat===this.localSeat);
      label.style.display=visible?'block':'none';
      label.style.transform=`translate(-50%,-50%) translate(${labelX}px,${labelY}px)`;
      label.classList.toggle('active',seat===this.followSeat);label.classList.toggle('mine',seat===this.localSeat);
    }
    this.positionCrowdLabels();
    for(const actor of [...this.showcase,this.preview].filter(Boolean)){const p=actor.root.getPosition().clone();p.y+=3.75;const screen=this.camera.camera.worldToScreen(p),x=screen.x*sx,y=screen.y*sy,labelX=x+(x<this.stage.clientWidth/2?(mobile?58:43):(mobile?-58:-43));actor.label.style.display=!(mobile&&this.overview)&&actor.root.enabled&&labelX>12&&labelX<this.stage.clientWidth-12&&y>12&&y<this.stage.clientHeight-12?'block':'none';actor.label.style.transform=`translate(-50%,-50%) translate(${labelX}px,${y}px)`;}
    const labelFloor=this.overview?50:mobile?244:225;
    let currentTile=this.state?.players?.find(player=>player.seat===(this.motion?.seat||this.followSeat))?.position;
    if(this.motion)currentTile=this.motion.phase==='path'&&this.motion.step>0?this.motion.path[this.motion.step-1]:this.state?.lastRoll?.from;
    const nextTile=this.motion?.phase==='path'?this.motion.path[this.motion.step]:(Number.isInteger(currentTile)?(currentTile+1)%BOARD.length:null);
    for(const {label,tile} of this.tileLabels){
      const point=tileWorld(tile.n);point.y=.4*MAP_SCALE;const screen=this.camera.camera.worldToScreen(point),x=screen.x*sx,y=screen.y*sy,compact=this.overviewFit;
      const relevant=this.overview||this.state?.phase==='lobby'||tile.n===currentTile;
      label.style.display=relevant&&x>8&&x<this.stage.clientWidth-8&&y>labelFloor&&y<this.stage.clientHeight-8?'flex':'none';
      label.classList.toggle('compact',compact);const size=label.getBoundingClientRect(),safeX=clamp(x,size.width/2+8,this.stage.clientWidth-size.width/2-8);label.style.transform=`translate(-50%,-50%) translate(${safeX}px,${y}px)`;
      const occupants=this.state?.players?.filter(player=>player.position===tile.n)||[];
      const name=label.querySelector('.tile-face-name'),base=compact?WORLD_STOPS[tile.n].shortName:BOARD_NAMES[tile.n];
      const copy=compact&&occupants.length?`${base}\n${occupants.length}位`:this.overview?base:`第 ${tile.n} 格 · ${base}`;
      if(name.textContent!==copy)name.textContent=copy;
      label.classList.toggle('occupied',compact&&occupants.length>0);
      label.title=occupants.length?`${BOARD_NAMES[tile.n]} · ${occupants.length} 位玩家，點擊查看名單`:BOARD_NAMES[tile.n];
      label.classList.toggle('current',this.state?.phase!=='lobby'&&currentTile===tile.n);label.classList.toggle('next',!this.overview&&nextTile===tile.n);
    }
    this.positionPlayerLabels();
    this.positionDistrictLabels(mobile);
    for(const {label,root,index} of this.landmarkLabels){const point=root.getPosition().clone();point.y=Math.max(...root.findComponents('render').flatMap(c=>c.meshInstances.map(m=>m.aabb.center.y+m.aabb.halfExtents.y)))+.7;const screen=this.camera.camera.worldToScreen(point),x=screen.x*sx,y=screen.y*sy,important=index===currentTile,near=Number.isInteger(currentTile)&&((index-currentTile+BOARD.length)%BOARD.length)<=2;label.style.display=important&&near&&!this.overview&&x>48&&x<this.stage.clientWidth-48&&y>205&&y<this.stage.clientHeight-80?'block':'none';label.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px)`;}
    const ui=[...document.querySelectorAll('.world-toolbar,.brand,.top-status,.play-panel,#card-focus')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
    const focusedPawn=!this.overview&&!this.celebrating?this.projectBounds(this.pawns.get(this.followSeat)?.root):null,stageBounds=this.stage.getBoundingClientRect();
    if(focusedPawn)for(const label of this.stage.querySelectorAll('.landmark-label,.tile-label')){const r=label.getBoundingClientRect();if([...this.pawns.values()].some(p=>{const b=this.projectBounds(p.root);return b?.inFront&&r.left<b.right+stageBounds.left+6&&r.right>b.left+stageBounds.left-6&&r.top<b.bottom+stageBounds.top+6&&r.bottom>b.top+stageBounds.top-6;}))label.style.display='none';}
    for(const label of this.stage.querySelectorAll('.pawn-label:not(.active),.showcase-label,.landmark-label,.tile-label')){if(label.style.display==='none')continue;const r=label.getBoundingClientRect();if(ui.some(b=>b.width&&b.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top))label.style.display='none';}
    this.positionCrowdSelection();
    this.drawCrowdGuide();
    // The lobby shows the whole board at a distance; keep only labels that fit.
    if(this.state?.phase==='lobby'){
      const occupied=[...this.stage.querySelectorAll('.showcase-label,.district-label')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
      for(const {label} of this.tileLabels){
        if(getComputedStyle(label).display==='none')continue;
        const r=label.getBoundingClientRect();
        if(occupied.some(b=>r.left<b.right+4&&r.right>b.left-4&&r.top<b.bottom+4&&r.bottom>b.top-4))label.style.display='none';
        else occupied.push(r);
      }
    }
  }
  positionPlayerLabels(){
    const stage=this.stage.getBoundingClientRect(),visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width&&r.height;};
    const boxes=[...document.querySelectorAll('.world-toolbar,.brand,.top-status,.play-panel,#card-focus,.stage-timer,.players-live,.finance-nav,.player-strip,.main-action-tray,.world-heading')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return{left:r.left-stage.left-8,right:r.right-stage.left+8,top:r.top-stage.top-8,bottom:r.bottom-stage.top+8};});
    // In a two-player mobile overview, keep both names clear of compact tile labels.
    if(this.overview&&this.overviewFit&&this.stage.clientWidth<700&&this.pawns.size<=2)for(const {label} of this.tileLabels){if(!visible(label))continue;const r=label.getBoundingClientRect();boxes.push({left:r.left-stage.left-3,right:r.right-stage.left+3,top:r.top-stage.top-3,bottom:r.bottom-stage.top+3});}
    // Keep player names clear of every visible pawn, including nearby crowd members.
    for(const pawn of this.pawns.values()){if(!pawn.root.enabled)continue;const b=this.projectBounds(pawn.root);if(b?.inFront)boxes.push({left:b.left-5,right:b.right+5,top:b.top-5,bottom:b.bottom+5});}
    const labels=[...this.labels.entries()].sort(([a],[b])=>Number(b===this.followSeat)-Number(a===this.followSeat)).map(([,label])=>label);
    for(const label of labels){if(!visible(label))continue;const r=label.getBoundingClientRect(),w=r.width,h=r.height,origin={x:(r.left+r.right)/2-stage.left,y:(r.top+r.bottom)/2-stage.top},candidates=[origin];
      for(const box of boxes)candidates.push({x:origin.x,y:box.top-h/2},{x:origin.x,y:box.bottom+h/2},{x:box.left-w/2,y:origin.y},{x:box.right+w/2,y:origin.y});
      const safe=candidates.filter(p=>p.x>=w/2+8&&p.x<=stage.width-w/2-8&&p.y>=h/2+8&&p.y<=stage.height-h/2-8&&!boxes.some(b=>p.x+w/2>b.left&&p.x-w/2<b.right&&p.y+h/2>b.top&&p.y-h/2<b.bottom)).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];
      if(!safe){label.style.display='none';continue;}label.style.transform='translate(-50%,-50%) translate('+safe.x+'px,'+safe.y+'px)';boxes.push({left:safe.x-w/2-4,right:safe.x+w/2+4,top:safe.y-h/2-4,bottom:safe.y+h/2+4});
    }
  }
  positionCrowdLabels(){
    const focused=this.pawns.get(this.followSeat),active=!this.overview&&!this.celebrating&&focused?.crowdCount>3;
    this.crowdLabelItems=[];
    if(!active)return;
    const items=[...this.pawns].filter(([,p])=>p.formationPosition===focused.formationPosition&&p.root.enabled).map(([seat,p])=>({seat,p,label:this.labels.get(seat),bounds:this.projectBounds(p.root)})).filter(x=>x.bounds?.inFront);
    if(!items.length)return;
    this.crowdLabelItems=items;
    const left=Math.min(...items.map(x=>x.bounds.left)),right=Math.max(...items.map(x=>x.bounds.right)),middle=(left+right)/2;
    for(const side of [-1,1]){
      const column=items.filter(x=>((x.bounds.left+x.bounds.right)/2<middle?-1:1)===side).sort((a,b)=>(a.bounds.top+a.bounds.bottom)-(b.bounds.top+b.bounds.bottom)||(a.bounds.left-b.bounds.left));
      const positions=[];let previous=42;
      for(const item of column){const center=(item.bounds.top+item.bounds.bottom)/2;positions.push(Math.max(center,previous+28));previous=positions.at(-1);}
      const overflow=Math.max(0,(positions.at(-1)||0)-(this.stage.clientHeight-65));
      for(const [i,item] of column.entries()){
        const label=item.label;label.style.display='block';const r=label.getBoundingClientRect(),x=clamp(side<0?left-r.width/2-10:right+r.width/2+10,r.width/2+8,this.stage.clientWidth-r.width/2-8),y=clamp(positions[i]-overflow,55,this.stage.clientHeight-65);
        label.style.transform='translate(-50%,-50%) translate('+x+'px,'+y+'px)';
      }
    }
  }
  positionCrowdSelection(){
    const banner=this.stage.querySelector('.crowd-selection');if(!banner)return;
    const pawn=this.pawns.get(this.viewSeat);
    if(!pawn||pawn.crowdCount<2||this.motion||this.celebrating||banner.dataset.portrait&&this.state?.phase!=='roll'){banner.remove();return;}
    banner.style.visibility=this.overview?'hidden':'visible';
    if(this.overview)return;
    if(pawn.crowdCount>3&&this.state?.phase==='roll'&&!banner.dataset.portrait){
      // The board keeps all seat markers in view. This inset is rendered from the
      // same role model, front-on, so its face is legible in a crowded formation.
      banner.dataset.portrait=pawn.career;
      const text=document.createElement('span');
      text.textContent=banner.textContent;
      const picture=document.createElement('img');
      picture.alt='';
      picture.src=new URL('../assets/chibi-roles/career-'+pawn.career+'.webp',import.meta.url).href;
      picture.className='crowd-role-portrait';
      Object.assign(picture.style,{display:'block',width:'220px',height:'126px',maxWidth:'none',marginLeft:'-82px',marginTop:'-4px'});
      const crop=document.createElement('span');
      Object.assign(crop.style,{display:'block',width:'72px',height:'72px',overflow:'hidden',borderRadius:'9px',flex:'0 0 auto'});
      picture.addEventListener('error',()=>crop.remove(),{once:true});
      crop.append(picture);
      banner.replaceChildren(crop,text);
      Object.assign(banner.style,{display:'flex',alignItems:'center',gap:'9px',textAlign:'left',padding:'6px 11px 6px 6px'});
    }
    const stage=this.stage.getBoundingClientRect(),r=banner.getBoundingClientRect();if(!r.width||!r.height)return;
    const blockers=[...this.pawns.values()].filter(p=>p.root.enabled).map(p=>this.projectBounds(p.root)).filter(b=>b?.inFront);
    for(const element of document.querySelectorAll('.play-panel,.world-toolbar,.topbar,.stage-timer,#action-panel,#card-focus,#camera-button,.pawn-label,.district-label,.landmark-label')){const b=element.getBoundingClientRect(),style=getComputedStyle(element);if(b.width&&b.height&&style.display!=='none'&&style.visibility!=='hidden')blockers.push({left:b.left-stage.left,right:b.right-stage.left,top:b.top-stage.top,bottom:b.bottom-stage.top});}
    const preferred=this.stage.clientHeight-(window.innerWidth<=1100?132:80)-r.height,left=r.left-stage.left,right=r.right-stage.left;
    const candidates=[preferred,8,...blockers.flatMap(b=>[b.top-4-r.height,b.bottom+4])].filter(top=>top>=8&&top+r.height<=this.stage.clientHeight-8).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));
    const chosen=candidates.find(top=>!blockers.some(b=>left<b.right+4&&right>b.left-4&&top<b.bottom+4&&top+r.height>b.top-4));
    banner.style.top=(chosen??preferred)+'px';banner.style.bottom='auto';
  }
  drawCrowdGuide(){
    const items=this.crowdLabelItems||[],selected=items.find(x=>x.seat===this.followSeat);
    if(!selected||getComputedStyle(selected.label).display==='none'){
      if(this.crowdGuides){this.crowdGuides.replaceChildren();this.crowdGuides.style.display='none';}this.crowdGuideKey=null;return;
    }
    if(!this.crowdGuides){this.crowdGuides=document.createElementNS('http://www.w3.org/2000/svg','svg');this.crowdGuides.setAttribute('aria-hidden','true');Object.assign(this.crowdGuides.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'19'});this.stage.append(this.crowdGuides);}
    const stage=this.stage.getBoundingClientRect(),r=selected.label.getBoundingClientRect(),bounds=selected.bounds,side=(r.left+r.right)/2-stage.left<(bounds.left+bounds.right)/2?-1:1;
    const start={x:(side<0?r.right:r.left)-stage.left+side*-2,y:(r.top+r.bottom)/2-stage.top},end={x:side<0?bounds.left-5:bounds.right+5,y:(bounds.top+bounds.bottom)/2};
    const heads=[...this.pawns].filter(([,pawn])=>pawn.root.enabled).map(([seat,pawn])=>({seat,bounds:this.projectBounds(pawn.body.findByName('head and hair'))})).filter(x=>x.bounds?.inFront);
    const obstacles=items.map(x=>({left:x.bounds.left-3,right:x.bounds.right+3,top:x.bounds.top-3,bottom:x.bounds.bottom+3}));
    for(const head of heads.filter(x=>!items.some(item=>item.seat===x.seat)))obstacles.push({left:head.bounds.left-3,right:head.bounds.right+3,top:head.bounds.top-3,bottom:head.bounds.bottom+3});
    const markerBlockers=heads.map(x=>x.bounds);
    for(const element of document.querySelectorAll('.play-panel,.world-toolbar,.topbar,.stage-timer,#action-panel,#card-focus,#camera-button,.pawn-label,.district-label,.landmark-label,.crowd-selection')){
      if(element===selected.label)continue;const b=element.getBoundingClientRect(),style=getComputedStyle(element);if(!b.width||!b.height||style.display==='none'||style.visibility==='hidden')continue;
      markerBlockers.push({left:b.left-stage.left,right:b.right-stage.left,top:b.top-stage.top,bottom:b.bottom-stage.top});
      obstacles.push({left:b.left-stage.left-3,right:b.right-stage.left+3,top:b.top-stage.top-3,bottom:b.bottom-stage.top+3});
    }
    const key=JSON.stringify([selected.seat,start,end,obstacles,heads,this.stage.clientWidth,this.stage.clientHeight],(k,v)=>typeof v==='number'?Math.round(v*10)/10:v);
    this.crowdGuides.style.display='block';if(key===this.crowdGuideKey)return;this.crowdGuideKey=key;this.crowdGuides.replaceChildren();
    const anchors=[end,{x:(bounds.left+bounds.right)/2,y:bounds.top-5},{x:(bounds.left+bounds.right)/2,y:bounds.bottom+5},{x:side<0?bounds.right+5:bounds.left-5,y:(bounds.top+bounds.bottom)/2}];
    let points=null;for(const anchor of anchors){points=routeCrowdGuide(start,anchor,obstacles,{width:this.stage.clientWidth,height:this.stage.clientHeight});if(points)break;}
    const markerSafe=(vertices,padding)=>{const box={left:Math.min(...vertices.map(p=>p.x))-padding,right:Math.max(...vertices.map(p=>p.x))+padding,top:Math.min(...vertices.map(p=>p.y))-padding,bottom:Math.max(...vertices.map(p=>p.y))+padding};return box.left>=0&&box.right<=this.stage.clientWidth&&box.top>=0&&box.bottom<=this.stage.clientHeight&&!markerBlockers.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top);};
    const makeArrow=(endpoint,head)=>{const dx=(head.left+head.right)/2-endpoint.x,dy=(head.top+head.bottom)/2-endpoint.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;return[{x:endpoint.x+ux*3,y:endpoint.y+uy*3},{x:endpoint.x-ux*4-uy*3,y:endpoint.y-uy*4+ux*3},{x:endpoint.x-ux*4+uy*3,y:endpoint.y-uy*4-ux*3}];};
    let route='clear',arrowPoints=null;
    if(!points){
      // Interior figures can be enclosed by overlapping projected body boxes.
      // Keep every face protected and end beside the selected head in that case.
      const h=heads.find(x=>x.seat===selected.seat)?.bounds;
      if(h&&items.every(item=>heads.some(x=>x.seat===item.seat))){
        const faceObstacles=heads.map(x=>({left:x.bounds.left-3,right:x.bounds.right+3,top:x.bounds.top-3,bottom:x.bounds.bottom+3})).concat(obstacles.slice(items.length));
        const headAnchors=[{x:side<0?h.left-5:h.right+5,y:(h.top+h.bottom)/2},{x:(h.left+h.right)/2,y:h.top-5},{x:(h.left+h.right)/2,y:h.bottom+5},{x:side<0?h.right+5:h.left-5,y:(h.top+h.bottom)/2}];
        for(const anchor of headAnchors){const arrow=makeArrow(anchor,h);if(!markerSafe(arrow,.75))continue;points=routeCrowdGuide(start,anchor,faceObstacles,{width:this.stage.clientWidth,height:this.stage.clientHeight});if(points){route='head-clear';arrowPoints=arrow;break;}}
      }
    }
    if(!points){this.crowdGuides.dataset.route='blocked';return;}
    this.crowdGuides.dataset.route=route;
    const outline=document.createElementNS('http://www.w3.org/2000/svg','path');outline.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' '));outline.setAttribute('fill','none');outline.setAttribute('stroke','#123646');outline.setAttribute('stroke-width','5');outline.setAttribute('stroke-linejoin','round');this.crowdGuides.append(outline);
    const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.dataset.seat=selected.seat;line.setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#a6efff');line.setAttribute('stroke-width','2');line.setAttribute('stroke-linejoin','round');this.crowdGuides.append(line);
    const endpoint=points.at(-1);
    if(arrowPoints){
      const arrow=document.createElementNS('http://www.w3.org/2000/svg','polygon');arrow.dataset.seat=selected.seat;arrow.setAttribute('points',arrowPoints.map(p=>p.x+','+p.y).join(' '));arrow.setAttribute('fill','#a6efff');arrow.setAttribute('stroke','#123646');arrow.setAttribute('stroke-width','1.5');arrow.setAttribute('stroke-linejoin','round');this.crowdGuides.append(arrow);
    }else if(markerSafe([endpoint],3.5)){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',endpoint.x);dot.setAttribute('cy',endpoint.y);dot.setAttribute('r','3');dot.setAttribute('fill',line.getAttribute('stroke'));dot.setAttribute('stroke','#123646');dot.setAttribute('stroke-width','1');this.crowdGuides.append(dot);}
  }
  positionDistrictLabels(mobile){
    const stageRect=this.stage.getBoundingClientRect(),blockers=[...document.querySelectorAll('.play-panel,.players-live,.finance-nav,.world-toolbar,.player-strip,.main-action-tray,.world-heading,.stage-timer')].filter(element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;}).map(element=>{const rect=element.getBoundingClientRect();return{left:rect.left-stageRect.left-8,right:rect.right-stageRect.left+8,top:rect.top-stageRect.top-8,bottom:rect.bottom-stageRect.top+8};}),placed=[];
    if(!this.overview&&!this.celebrating){for(const figure of this.pawns.values()){const pawn=this.projectBounds(figure.root);if(figure.root.enabled&&pawn?.inFront)blockers.push({left:pawn.left-10,right:pawn.right+10,top:pawn.top-10,bottom:pawn.bottom+10});}for(const label of this.labels.values()){const r=label.getBoundingClientRect();if(r.width&&r.height)blockers.push({left:r.left-stageRect.left-6,right:r.right-stageRect.left+6,top:r.top-stageRect.top-6,bottom:r.bottom-stageRect.top+6});}}
    for(const {label,x,z,zone} of this.districtLabels){
      const projected=this.camera.camera.worldToScreen(new pc.Vec3(x*MAP_SCALE,2*MAP_SCALE,z*MAP_SCALE)),show=this.overview||!this.overview&&zone===this.activeZone&&this.state?.phase!=='lobby';
      label.style.display=show?'block':'none';if(!show)continue;
      const size=label.getBoundingClientRect(),width=size.width,height=size.height,origin={x:projected.x,y:projected.y},candidates=[origin];
      for(const box of blockers){candidates.push({x:box.left-width/2-10,y:origin.y},{x:box.right+width/2+10,y:origin.y},{x:origin.x,y:box.top-height/2-10},{x:origin.x,y:box.bottom+height/2+10});}
      for(const other of placed){candidates.push({x:other.left-width/2-10,y:origin.y},{x:other.right+width/2+10,y:origin.y},{x:origin.x,y:other.top-height/2-10},{x:origin.x,y:other.bottom+height/2+10});}
      const safe=candidates.filter(point=>point.x>=width/2+8&&point.x<=this.stage.clientWidth-width/2-8&&point.y>=height/2+8&&point.y<=this.stage.clientHeight-height/2-8&&!blockers.some(box=>point.x+width/2>box.left&&point.x-width/2<box.right&&point.y+height/2>box.top&&point.y-height/2<box.bottom)&&!placed.some(box=>point.x+width/2>box.left&&point.x-width/2<box.right&&point.y+height/2>box.top&&point.y-height/2<box.bottom)).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];
      if(!safe){label.style.display='none';continue;}
      label.style.transform=`translate(-50%,-50%) translate(${safe.x}px,${safe.y}px)`;label.classList.toggle('active',zone===this.activeZone&&this.state?.phase!=='lobby');placed.push({left:safe.x-width/2,right:safe.x+width/2,top:safe.y-height/2,bottom:safe.y+height/2});
    }
  }
}

