import {C,base,slab,profile,local,revolve,elevation,arch,window,rail,flowerbed,tree,palm,lamp,ripples,stair,stoneJoint,pebble} from './world-craft.mjs';
const ivory='#f2dcb1',ochre='#c9a77a',sand='#b89975',deep='#685d53',jade='#4b8f82',leaf='#649364';
export function hangingGardens(b){
 base(b,2.20,2.02,['#ad8762','#e4c79a']);slab(b,'Babylon glazed stone foundation',0,0,2.10,1.91,.15,.23,.12,'#c9a87b');
 const stages=[{w:1.98,d:1.78,y:.23},{w:1.66,d:1.48,y:.64},{w:1.33,d:1.17,y:1.05},{w:1.00,d:.87,y:1.46}];
 for(let k=0;k<4;k++){const {w,d,y}=stages[k];profile(b,'chamfered sandstone gallery '+(k+1),0,0,[{y,w,d},{y:y+.07,w:w*.98,d:d*.98},{y:y+.29,w:w*.94,d:d*.94},{y:y+.32,w:w*.98,d:d*.98}],['#c8ae87','#dfc49b']);
 for(let s=0;s<4;s++){const f=elevation(b,s),span=s%2?d:w,reach=s%2?w:d,front=reach*.475+.005,n=k<2?5:k===2?4:3;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*span*.155;arch(f,'sunken vaulted arcade',x,y+.055,front,span*.112,.205,[deep,ivory,ochre]);f.cylinder('small limestone pilaster',x-span*.068,y+.142,front+.045,.024,.19,ivory,.024,10);f.box('tiny cornice capital',[x-span*.068,y+.245,front+.05],[.072,.037,.07],'#dfc096');}
 for(const v of [-.38,.38]){f.box('deep corner buttress',[span*v,y+.16,front+.012],[.06,.26,.06],ochre);f.box('corner carved head',[span*v,y+.279,front+.047],[.09,.045,.075],ivory);}
 f.beam('continuous turquoise glazed frieze',[-span*.44,y+.308,front],[span*.44,y+.308,front],.030,jade);for(let i=0;i<8;i++){const x=span*(-.40+i*.114);f.box('glazed golden accent',[x,y+.307,front+.021],[.026,.021,.016],'#d4b275');}
 }
 slab(b,'projecting rounded terrace cornice',0,0,w+.055,d+.055,y+.31,y+.365,.08,ivory);slab(b,'inlaid lush garden soil',0,0,w-.012,d-.012,y+.355,y+.39,.075,'#91ae72');
 for(let side=0;side<4;side++){const f=elevation(b,side),span=side%2?d:w,reach=side%2?w:d;for(let i=0;i<(k<2?6:4);i++){const x=span*(-.39+.78*i/(k<2?5:3));flowerbed(f,x,y+.385,reach*.43,k>1?.065:.09,i%2?'#f0c18c':'#ce9887');if(i%2===0){for(let j=0;j<3;j++)pebble(f,'hanging vine leaves',x+.025*Math.sin(j*1.7),y+.34-j*.055,reach*.49,.042,.048,.035,j%2?'#8caa69':'#4f9260',9,5);}}}
 }
 // A cascading narrow aqueduct curves from the upper court to a lower basin.
 for(let k=0;k<4;k++){const {d,y}=stages[k],z=d*.5+.018;slab(b,'carved spillway basin',.25,z,.22,.16,y+.365,y+.401,.032,'#c9b48e');slab(b,'blue water pool',.25,z,.17,.115,y+.397,y+.409,.024,'#6cb5b8');if(k>0){for(let j=0;j<6;j++)b.beam('falling turquoise water',[.21+j*.016,y+.395,z+.045],[.21+j*.016,y+.085,z+.045],.020,j%2?'#acd8d1':'#64b2b8');}}
 stair(b,-.35,.99,.15,.31,.30,5,.042);const t=local(b,{x:-.10,z:-.075,y:1.86});slab(t,'top temple pavilion base',0,0,.61,.47,0,.06,.06,ivory);for(const x of [-.24,.24])for(const z of [-.16,.16]){t.cylinder('carved temple column',x,.17,z,.035,.24,ivory,.033,12);t.cylinder('column capital',x,.29,z,.060,.045,ochre,.048,12);}
 profile(t,'Babylon pavilion roof',0,0,[{y:.30,w:.72,d:.58},{y:.34,w:.75,d:.60},{y:.40,w:.55,d:.43},{y:.49,w:.31,d:.25}],[jade,'#73aaa0',ivory]);slab(t,'gold roof ridge',0,0,.33,.26,.47,.51,.04,'#d4ad68');
 slab(b,'upper reflecting pool',.28,.22,.36,.28,1.86,1.90,.08,'#69b5b6');ripples(b,.28,.22,1.909,.13);tree(b,-.38,1.86,-.22,.23);tree(b,.35,1.87,-.24,.22);flowerbed(b,-.37,1.85,.31,.10);
}
function lotusTower(b,x,z,y,r,h){const g=local(b,{x,z,y});revolve(g,'sculpted lotus sanctuary tower',0,0,[[0,r*.76],[h*.06,r],[h*.13,r*.94],[h*.21,r*.83],[h*.28,r*.79],[h*.37,r*.67],[h*.45,r*.58],[h*.54,r*.49],[h*.64,r*.40],[h*.76,r*.28],[h*.87,r*.16],[h*.96,r*.08],[h,.023]],[ochre,'#d3bd98','#b69e7b','#cabb9a','#ab9478','#c9b592','#b19b7e','#cfbd9d','#b39c7a','#d3bb90',ivory,ivory],24);
 for(let k=0;k<5;k++){const y=h*(.14+k*.145),rr=r*(.91-k*.165);g.cylinder('carved lotus molding',0,y,0,rr*1.06,h*.023,ivory,rr*.95,24);for(let j=0;j<8;j++){const a=j*Math.PI/4;pebble(g,'relief lotus petal',Math.cos(a)*rr*.89,y+h*.03,Math.sin(a)*rr*.89,rr*.23,h*.055,rr*.23,k%2?'#b9a387':'#d5bf98',8,5);}}
 for(let side=0;side<4;side++){const f=elevation(g,side);arch(f,'tower niche',0,.025,r*.76,r*.47,h*.17,[deep,'#e0c49b',ochre]);}g.cylinder('lotus finial',0,h*1.011,0,r*.083,h*.08,ivory,.008,12);}
export function angkorWat(b){
 base(b,2.23,2.02,['#8e9a86','#75b4b4']);slab(b,'moat blue enamel',0,0,2.13,1.93,.15,.19,.14,'#65aeb6');slab(b,'outer sandstone retaining edge',0,-.06,1.88,1.64,.18,.235,.11,'#b69b76');slab(b,'inner island on moat',0,-.06,1.79,1.57,.23,.277,.09,'#9aaa77');
 for(let i=0;i<3;i++){const w=1.65-i*.20,d=1.38-i*.17,y=.275+i*.16;profile(b,'receding Khmer plinth',0,-.08,[{y,w,d},{y:y+.045,w:w*.98,d:d*.98},{y:y+.126,w:w*.92,d:d*.92},{y:y+.16,w:w*.96,d:d*.96}],['#c2ad8e','#d9c3a1']);for(let s=0;s<4;s++){const f=elevation(local(b,{z:-.08}),s),span=s%2?d:w,reach=s%2?w:d;for(let n=0;n<5;n++)stoneJoint(f,(n-2)*span*.16,y+.066,reach*.48,span*.15,.045,'#99886e');}}
 const w=1.21,d=1.09,y=.755;profile(b,'walled temple gallery',0,-.08,[{y,w,d},{y:y+.30,w:w*.98,d:d*.98}],[sand,'#c5ad8d']);for(let s=0;s<4;s++){const f=elevation(local(b,{z:-.08}),s),span=s%2?d:w,reach=s%2?w:d;for(let i=0;i<5;i++){const x=(i-2)*span*.17;arch(f,'carved Khmer gallery',x,y+.036,reach*.495,.145,.225,[deep,ivory,ochre]);f.cylinder('gallery relief colonette',x-.092,y+.15,reach*.51,.021,.19,ivory,.018,10);f.box('carved entablature',[x,y+.265,reach*.51],[.15,.035,.032],'#d8bc96');}}
 profile(b,'Khmer sloping gallery cornice',0,-.08,[{y:1.055,w:1.29,d:1.18},{y:1.10,w:1.30,d:1.19},{y:1.15,w:1.18,d:1.07}],[ivory,'#c8a782']);
 for(const x of [-.40,.40])for(const z of [-.43,.27])lotusTower(b,x,z,1.15,.195,.83);lotusTower(b,0,-.07,1.15,.27,1.12);
 // The causeway sits above the moat and stone Naga banisters frame shallow steps.
 slab(b,'moat stone causeway',0,.76,.39,.51,.18,.25,.06,ochre);stair(b,0,.83,.24,.38,.55,8,.052);for(const s of [-1,1]){b.beam('stone Naga parapet',[s*.25,.27,.96],[s*.25,.30,.56],.055,'#aa987e');pebble(b,'carved guardian serpent',s*.25,.32,.92,.046,.071,.064,'#c5ae90',12,6);}
 for(const [x,z] of [[-.91,-.65],[.91,-.65],[-.87,.58],[.87,.58]]){palm(b,x,.24,z,.29);flowerbed(b,x,.24,z,.07);}
 for(const s of [-1,1]){ripples(b,s*.79,.87,.194,.13);pebble(b,'lotus lily pad',s*.65,.20,.87,.071,.012,.058,'#91ae70',12,4);pebble(b,'pink lotus blossom',s*.65,.224,.87,.043,.037,.043,'#d8a08d',9,5);}
}
function circularGallery(b,y,r,columns,height){const dark='#817e71',trim='#f6e7c9';revolve(b,'recessed limestone gallery core',0,0,[[y,r*.70],[y+height*.81,r*.70],[y+height*.9,r*.75]],[dark,'#b7ac95'],32);revolve(b,'beveled marble gallery lower rim',0,0,[[y,r*1.04],[y+.025,r*1.09],[y+.055,r*1.055]],[ochre,trim],40);
 for(let i=0;i<columns;i++){const a=2*Math.PI*i/columns,aa=2*Math.PI*(i+1)/columns,x=Math.cos(a)*r,z=Math.sin(a)*r;revolve(b,'slender gallery column with base and capital',x,z,[[y+.047,.041],[y+.070,.047],[y+.09,.033],[y+height*.66,.026],[y+height*.72,.04],[y+height*.76,.046]],[trim,'#d3bfa2',trim,ivory,'#d9c5a6'],10);
 const xx=Math.cos(aa)*r,zz=Math.sin(aa)*r,cy=y+height*.74;for(let k=0;k<8;k++){const t=k/8,u=(k+1)/8,P=v=>[x+(xx-x)*v,cy+Math.sin(Math.PI*v)*height*.19,z+(zz-z)*v];b.beam('continuous gallery archivolt',P(t),P(u),.029,k%2?trim:ivory);}}
 revolve(b,'triple projecting cornice',0,0,[[y+height*.91,r*1.045],[y+height*.94,r*1.10],[y+height*.98,r*1.12],[y+height*1.02,r*1.075]],[ochre,trim,ivory],40);
}
export function pisaTower(b){base(b,2.13,1.98,['#a0a281','#98b47a']);revolve(b,'Piazza circular marble steps',0,0,[[.15,.63],[.19,.63],[.20,.58],[.25,.58],[.26,.52],[.31,.52]],[ochre,ivory,ivory,ochre,ivory],40);
 const g=local(b,{y:.31,roll:-10.5});revolve(g,'battered first-storey marble shaft',0,0,[[0,.46],[.06,.47],[.11,.44],[.44,.44],[.48,.46]],[ivory,ochre,'#dfd0b3',ivory],40);
 for(let i=0;i<12;i++){const a=i*30;const f=local(g,{yaw:a});arch(f,'marble blind arcade',0,.13,.442,.19,.26,['#8e8677',ivory,'#dfcdb0']);}revolve(g,'base cornice',0,0,[[.455,.46],[.48,.49],[.51,.47]],[ivory,ochre],40);
 for(let floor=0;floor<6;floor++)circularGallery(g,.51+floor*.28,.405-floor*.008,12,.28);
 const y=2.20,r=.25;revolve(g,'bell chamber inner platform',0,0,[[y,.32],[y+.05,.32],[y+.08,.27]],[ivory,ochre],32);for(let i=0;i<8;i++){const a=i*Math.PI/4,aa=(i+1)*Math.PI/4,x=Math.cos(a)*r,z=Math.sin(a)*r,xx=Math.cos(aa)*r,zz=Math.sin(aa)*r;g.cylinder('bell chamber pilaster',x,y+.215,z,.033,.29,ivory,.029,12);for(let k=0;k<8;k++){const P=t=>[x+(xx-x)*t,y+.30+Math.sin(Math.PI*t)*.095,z+(zz-z)*t];g.beam('bell chamber carved arch',P(k/8),P((k+1)/8),.033,'#e6d3b2');}}
 revolve(g,'golden bronze bell',0,0,[[y+.12,.117],[y+.14,.119],[y+.19,.085],[y+.30,.060],[y+.32,.04]],['#ba9253','#e3ba6a','#cc9d58','#e4bf79'],20);revolve(g,'open marble crown parapet',0,0,[[y+.385,.33],[y+.42,.34],[y+.465,.32],[y+.48,.30]],[ivory,ochre,ivory],32);for(let i=0;i<16;i++){const a=i*Math.PI/8;g.cylinder('upper balustrade',.28*Math.cos(a),y+.50,.28*Math.sin(a),.016,.06,ivory,.015,8);}
 for(const [x,z] of [[-.77,-.58],[.74,-.61],[-.76,.53]]){revolve(b,'slender cypress tree',x,z,[[.15,.05],[.24,.10],[.43,.075],[.57,.018]],[leaf,'#739963','#a0b17a'],14);flowerbed(b,x,.15,z,.085);}lamp(b,.73,.15,.59,.25);slab(b,'promenade paving',0,.81,1.21,.18,.15,.18,.055,'#dbc8a7');
}
