import {C,base,slab,profile,local,revolve,elevation,arch,rail,flowerbed,palm,lamp,ripples,pebble,hull} from './world-craft.mjs';
// Y-plan tower: each setback retreats one wing independently. Narrow facade
// ribs and horizontal metallic spandrels trace the actual lobed silhouette.
export function burjKhalifa(b){base(b,2.12,1.92,['#9daa9e','#d7cdb0']);slab(b,'Dubai limestone plaza',0,0,2.00,1.80,.14,.18,.14,'#e7d5b3');
 const decks=[{y:.20,r:.60,w:[1,1,1]},{y:.48,r:.58,w:[1,1,1]},{y:.86,r:.53,w:[1,1,.95]},{y:1.24,r:.49,w:[1,.96,.82]},{y:1.59,r:.45,w:[.98,.87,.70]},{y:1.90,r:.40,w:[.90,.70,.65]},{y:2.20,r:.35,w:[.85,.60,.48]},{y:2.47,r:.30,w:[.68,.57,.46]},{y:2.73,r:.26,w:[.58,.49,.37]},{y:2.98,r:.22,w:[.45,.38,.32]},{y:3.23,r:.17,w:[.33,.25,.22]},{y:3.48,r:.13,w:[.25,.18,.15]}];
 const N=48,point=(a,y,r,w)=>{let k=Math.round(a/(2*Math.PI/3)),ang=a-k*2*Math.PI/3;const weight=w[(k+3)%3];const lobe=Math.pow(Math.max(0,Math.cos(ang*1.5)),1.8);const dist=r*(.53+.57*weight*lobe);return[Math.cos(a)*dist,y,Math.sin(a)*dist];};
 const palettes=['#5f90a7','#8cb4c1','#afc9cb','#739db3'];
 for(let i=0;i<decks.length-1;i++){const a=decks[i],c=decks[i+1],h=c.y-a.y,top={y:c.y-.026,r:a.r*.94,w:a.w};
  for(let j=0;j<N;j++){const t=j*Math.PI*2/N,u=(j+1)*Math.PI*2/N;const p=point(t,a.y,a.r,a.w),q=point(t,top.y,top.r,top.w),k=point(u,top.y,top.r,top.w),l=point(u,a.y,a.r,a.w);b.quad(p,q,k,l,palettes[(Math.floor(j/4)+i)%4]);b.beam('silver curtain-wall mullion',p,q,.0085,'#bfd4d2');
   for(let row=1;row<=4;row++){const f=row/5,y=a.y+(top.y-a.y)*f,r=a.r+(top.r-a.r)*f;b.beam('glazed floor spandrel',point(t,y,r,a.w),point(u,y,r,a.w),.008,'#759aa8');}
   const p2=point(t,top.y,top.r,top.w),q2=point(u,top.y,top.r,top.w),p3=point(t,c.y,c.r,c.w),q3=point(u,c.y,c.r,c.w);b.quad(p2,p3,q3,q2,'#c1d4cc');b.beam('metal setback cornice',p2,q2,.020,'#d8e2d2');}}
 revolve(b,'slender central silver pinnacle',0,0,[[3.48,.12],[3.61,.102],[3.85,.078],[4.04,.05],[4.25,.033],[4.47,.016],[4.65,.006]],['#a4c3ca','#a8c1c2','#c2d3ce','#b1c8c8','#d9e2d0','#e1dbbe'],24);for(let i=0;i<5;i++)b.cylinder('pinnacle ring',0,3.58+i*.16,0,.10-i*.015,.021,'#d4ddd4',.097-i*.014,20);
 for(let s=0;s<3;s++){const a=s*120;const f=local(b,{yaw:a});slab(f,'entrance glass canopy',0,.51,.31,.37,.19,.26,.05,'#92bdbe');for(const x of [-.105,.105])f.cylinder('canopy steel column',x,.21,.62,.018,.12,'#a4b9b1',.017,8);}
 slab(b,'crescent fountain basin',0,.73,1.22,.32,.18,.22,.13,'#78b3b7');for(let i=0;i<9;i++){const x=-.50+i*.125,z=.72+.055*Math.cos(i*.7),h=.075+.075*Math.sin(i*Math.PI/8);b.beam('miniature fountain jet',[x,.22,z],[x,.22+h,z],.011,'#c4e1d5');ripples(b,x,z,.223,.039);}
 for(const [x,z] of [[-.83,-.53],[.83,-.53],[-.79,.43],[.79,.43]]){palm(b,x,.18,z,.31);flowerbed(b,x,.18,z,.095);}lamp(b,-.63,.18,.70,.19);lamp(b,.63,.18,.70,.19);
}
// Frame the four original Jørn Utzon shell groups in a true waterfront setting.
export function operaWaterfront(b,drawShells){base(b,2.19,2.02,['#8da8a5','#78b5b8']);slab(b,'Sydney harbour water',0,0,2.08,1.91,.15,.18,.14,'#70aeb7');
 for(let k=0;k<4;k++)slab(b,'rounded Bennelong Point limestone terrace',-.04,-.12,1.80-k*.095,1.58-k*.095,.18+k*.062,.245+k*.062,.095,k%2?'#e6cfaa':'#c8b298');
 const stage=local(b,{x:-.04,y:.04,z:-.12,scale:.88});drawShells(stage);
 for(const side of [-1,1])rail(b,side*.87,-.78,side*.87,.37,.242,.115,'#8b9b91');rail(b,-.82,-.82,.73,-.82,.244,.11,'#8b9b91');
 for(let i=0;i<6;i++)slab(b,'front sandstone grand stair',-.05,.68-i*.066,1.20,.10,.18,.225+i*.043,.028,i%2?'#dfcba7':'#edd8b4');
 lamp(b,-.81,.24,.35,.21);lamp(b,.74,.24,.36,.21);flowerbed(b,-.78,.24,-.5,.09);flowerbed(b,.72,.24,-.5,.09);
 const sail=local(b,{x:.81,z:.70,yaw:45});hull(sail,'Sydney miniature sailing boat',0,.235,[[-.16,.019,.020],[-.10,.064,.035],[.075,.06,.032],[.17,.005,.012]],'#e1d3ac',14);sail.beam('sailboat mast',[0,.25,0],[0,.51,0],.014,'#8b8571');sail.tri([0,.50,0],[0,.26,.02],[0,.26,.14],'#f8efd9');sail.tri([0,.48,-.013],[0,.27,-.02],[0,.27,-.13],'#d5e2d8');ripples(b,.80,.69,.185,.12);ripples(b,-.87,.69,.185,.12);
}
