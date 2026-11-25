import {C,base,slab,profile,local,hull,revolve,window,rail,flowerbed,tree,lamp,ripples,pebble,elevation} from './world-craft.mjs';
const ivory='#fff1d6',teal='#408d91',glass='#78b2b8',shadow='#476c73',steel='#8b9e9c',red='#b9604d';
function terminalRoof(b,x,z,w,d,y){
 const strips=12;const edge=(i,depth,lift=0)=>{const a=Math.PI*i/strips;return[x+Math.cos(a)*w/2,y+Math.sin(a)*.105+lift,z+depth]};
 for(let i=0;i<strips;i++){const a=edge(i,-d/2),c=edge(i+1,-d/2),e=edge(i+1,d/2),f=edge(i,d/2);b.quad(a,c,e,f,i%3?'#70acae':'#90c6c3');b.beam('curving terminal roof seams',a,f,.015,'#d6e2cf');for(const q of [-d/2,d/2])b.beam('arched aluminium eave',edge(i,q,.004),edge(i+1,q,.004),.026,ivory);}
 for(const z2 of [-d/2,d/2]){for(let i=0;i<strips;i++)b.tri([x,y,z+z2],edge(i,z2),edge(i+1,z2),'#648f97');}
}
function plane(b,x,z,y){const g=local(b,{x,z,y});hull(g,'smooth airliner fuselage',0,0,[[-.43,.012,.012],[-.31,.054,.055],[-.16,.073,.070],[.17,.073,.070],[.34,.060,.061],[.43,.025,.034],[.46,.003,.007]],'#f8edd6',22);
 for(const s of [-1,1]){const points=[[s*.048,.0,.10],[s*.43,-.008,-.16],[s*.42,-.008,-.25],[s*.045,0,-.095]];for(const lift of [-.012,.012])g.quad(...points.map(([a,b,c])=>[a,b+lift,c]),lift>0?'#f7ecd3':'#b0bcb9');for(let i=0;i<4;i++){const p=points[i],q=points[(i+1)%4];g.quad([p[0],p[1]-.012,p[2]],[q[0],q[1]-.012,q[2]],[q[0],q[1]+.012,q[2]],[p[0],p[1]+.012,p[2]],'#d5d9cf');}
 hull(g,'turbofan nacelle',s*.21,-.034,[[-.18,.025,.024],[-.15,.048,.043],[.052,.050,.046],[.075,.039,.036]],'#dbe2d8',14);hull(g,'dark turbine inlet',s*.21,-.034,[[.074,.031,.028],[.080,.035,.032]],'#405d66',14);
 g.quad([s*.03,.025,-.28],[s*.19,.025,-.37],[s*.16,.025,-.42],[s*.026,.025,-.35],ivory);
 for(let i=0;i<7;i++)g.box('cabin window row',[s*.072,.027,-.18+i*.063],[.012,.016,.028],shadow);
 g.box('cockpit side glazing',[s*.045,.035,.305],[.012,.028,.10],shadow);}
 g.quad([0,.034,-.24],[0,.16,-.38],[0,.148,-.44],[0,.025,-.41],red);g.beam('tail fin leading edge',[0,.034,-.24],[0,.16,-.38],.019,'#e0a572');
 for(const x2 of [-.06,.06])pebble(g,'mini landing wheel',x2,-.069,-.08,.025,.025,.016,'#526268',10,5);
}
export function airportStart(b){
 base(b,2.14,1.96,['#a69b81','#a5b6a9']);slab(b,'rounded apron concrete',.06,.02,2.01,1.83,.145,.177,.13,'#b9c4b6');
 slab(b,'asphalt runway',.37,.03,.72,1.73,.177,.202,.07,'#607d84');for(const s of [-1,1]){b.beam('runway edge stripe',[.37+s*.325,.209,-.77],[.37+s*.325,.209,.81],.013,'#f2e2bd');for(let i=0;i<8;i++){const z=-.69+i*.195;b.cylinder('embedded runway lamp',.37+s*.355,.211,z,.018,.017,'#e8c67f',.014,10);}for(let i=0;i<5;i++)b.box('threshold marking',[.125+i*.12,.211,s*.70+.03],[.05,.01,.12],ivory);}
 for(let i=0;i<7;i++)b.box('runway centre dash',[.37,.21,-.62+i*.21],[.032,.008,.10],ivory);
 slab(b,'taxiway paving',-.25,.28,.60,.36,.17,.195,.09,'#9caead');for(let i=0;i<4;i++)b.box('taxiway amber dashes',[-.43+i*.14,.204,.25],[.065,.009,.019],'#dfb768');
 const x=-.57,z=-.38;slab(b,'terminal granite plinth',x,z,.79,.78,.17,.217,.085,'#e5cda6');profile(b,'terminal steel glazed body',x,z,[{y:.215,w:.70,d:.69},{y:.43,w:.70,d:.69}],['#73a4ac','#8ebbbc']);
 for(let side=0;side<4;side++){const f=local(elevation(local(b,{x,z}),side));for(const u of [-.21,0,.21])window(f,u,.32,.352,.17,.162,glass,'#e5ddc3');b.box('terminal fascia',[0,.425,.36],[.68,.035,.04],ivory);}
 terminalRoof(b,x,z,.83,.82,.439);slab(b,'glass boarding bridge',-.56,.20,.19,.41,.22,.285,.025,'#6e9eaa');for(const z2 of [.05,.15,.25])b.box('boarding mullion',[-.46,.258,z2],[.016,.087,.018],ivory);
 // Low control tower stays beside the terminal, below the height cap.
 revolve(b,'compact control tower',-.87,.15,[[.18,.069],[.30,.062],[.42,.045],[.43,.10],[.51,.10],[.535,.07]],['#d6c8a9','#ddd4bc',teal,'#588d9d','#d8ddca'],16);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;b.beam('tower observation glazing',[-.87+.10*Math.cos(a),.438,.15+.10*Math.sin(a)],[-.87+.10*Math.cos(a),.499,.15+.10*Math.sin(a)],.015,ivory);}
 plane(b,.35,.08,.296);lamp(b,-.86,.185,.64,.15);flowerbed(b,-.67,.18,.70,.16,'#e3b48b');flowerbed(b,-.91,.18,-.79,.10);b.features.push('low aircraft apron and terminal');
}
function ship(b,x,z){const g=local(b,{x,z});hull(g,'streamlined ocean liner hull',0,.281,[[-.70,.08,.05],[-.60,.25,.08],[-.37,.29,.10],[.28,.28,.095],[.52,.21,.08],[.67,.065,.05],[.70,.005,.025]],(j,i)=>i<10?'#f5e9d8':'#416c89',20);
 for(let deck=0;deck<3;deck++){const y=.345+deck*.092,w=.49-deck*.065,d=1.08-deck*.19;slab(g,'deck rounded superstructure',0,-.045,w,d,y,y+.065,.095,deck===1?'#ede4d0':'#fff2d9');slab(g,'overhanging promenade deck',0,-.045,w+.045,d+.025,y+.057,y+.079,.10,'#e5dcca');
 for(const x of [-1,1])for(let i=0;i<7-deck;i++){const z=-d*.42+i*d*.84/(6-deck);g.box('ocean view balcony glass',[x*(w/2+.004),y+.032,z],[.013,.042,.050],'#578b99');g.box('balcony sill',[x*(w/2+.01),y+.015,z],[.023,.013,.062],'#d8ddc9');}
 for(const s of [-1,1])rail(g,s*(w*.48),-.045-d*.38,s*(w*.48),-.045+d*.38,y+.079,.044,'#879f99');}
 slab(g,'wheelhouse',0,.34,.28,.23,.586,.660,.048,'#c4ded8');for(const a of [-.085,0,.085])window(g,a,.624,.456,.072,.04,'#4f8897','#c4ded8');
 for(const s of [-1,1]){revolve(g,'dual painted funnel',s*.09,-.28,[[.60,.058],[.69,.055],[.715,.051],[.735,.052]],['#c46b53','#c46b53','#324f62'],14);g.cylinder('funnel silver ring',s*.09,.693,-.28,.057,.022,ivory,.057,14);}
 for(const s of [-1,1])hull(g,'lifeboat in davits',s*.26,.42,[[-.23,.025,.018],[-.18,.049,.032],[.08,.048,.033],[.13,.015,.016]],'#dca06a',12);g.beam('foremast',[0,.46,.52],[0,.64,.52],.018,'#c8d9d2');g.quad([0,.635,.52],[.10,.61,.52],[.10,.575,.52],[0,.596,.52],red);
}
export function cruiseStart(b){base(b,2.15,1.97,['#9daba3','#70b3b9']);slab(b,'harbour water inlay',0,0,2.04,1.85,.15,.17,.15,'#69b0b8');
 slab(b,'stone quay foundation',-.59,0,.84,1.84,.16,.23,.12,'#b7a18a');slab(b,'sandstone promenade',-.59,0,.82,1.79,.222,.28,.10,'#e5caa2');for(let i=0;i<9;i++)b.box('quay mortar course',[-.16,.246,-.79+i*.19],[.013,.025,.013],'#8d7d6d');
 for(const z of [-.67,-.23,.24,.68])b.cylinder('brass mooring bollard',-.21,.314,z,.043,.07,'#7f8c7d',.039,12);
 rail(b,-.96,-.73,-.96,.75,.28,.11,'#86958a');rail(b,-.89,-.86,-.22,-.86,.28,.10,'#86958a');
 slab(b,'pier shelter foundation',-.57,-.49,.60,.56,.28,.30,.07,'#f0dcb5');for(const x of [-.80,-.35])for(const z of [-.70,-.28])b.cylinder('pier canopy post',x,.37,z,.026,.15,'#eee0bf',.023,10);terminalRoof(b,-.57,-.49,.68,.62,.46);
 const lx=-.59,lz=.56;revolve(b,'striped lighthouse tower',lx,lz,[[.28,.15],[.32,.13],[.39,.105],[.45,.095],[.51,.091],[.56,.087],[.61,.091]],['#c6b59f',ivory,red,ivory,red,ivory],20);slab(b,'lighthouse lookout platform',lx,lz,.24,.24,.60,.635,.055,'#dfccab');b.cylinder('lantern glazing',lx,.67,lz,.080,.074,'#5f97a2',.080,16);for(let i=0;i<6;i++){const a=i*Math.PI/3;b.beam('lantern window bar',[lx+.078*Math.cos(a),.632,lz+.078*Math.sin(a)],[lx+.078*Math.cos(a),.712,lz+.078*Math.sin(a)],.012,ivory);}revolve(b,'lighthouse copper roof',lx,lz,[[.713,.105],[.74,.11],[.79,.06],[.81,.012]],[red,'#c68465','#d8ac83'],18);
 ship(b,.37,.04);const boat=local(b,{x:.74,z:-.62,yaw:-20});hull(boat,'small harbor tender',0,.218,[[-.14,.025,.025],[-.09,.060,.034],[.08,.054,.032],[.15,.005,.012]],'#edd4a9',14);slab(boat,'tender cockpit',0,0,.064,.10,.245,.265,.016,'#5b8692');ripples(b,.76,.65,.179,.15);ripples(b,.78,-.20,.179,.12);ripples(b,.04,.74,.179,.11);lamp(b,-.91,.28,.05,.20);flowerbed(b,-.78,.28,.18,.11,'#d9a182');
}
