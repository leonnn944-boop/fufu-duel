// CSS-pixel reservations. The cube, its full spin envelope and a gutter must fit.
export function clipBoxToNearPlane(corners,depths,near){
  const points=corners.filter((_,i)=>depths[i]>=near);
  for(let i=0;i<8;i++)for(const bit of [1,2,4]){const j=i^bit;if(j<i||(depths[i]>=near)===(depths[j]>=near))continue;
    const t=(near-depths[i])/(depths[j]-depths[i]),a=corners[i],b=corners[j];points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  }
  return points;
}
export function chooseDiceSlot({width,height,radius,blockers,preferred,previous}){
  const fits=({x,y})=>x-radius>=12&&x+radius<=width-12&&y-radius>=12&&y+radius<=height-12&&!blockers.some(b=>x+radius>b.left&&x-radius<b.right&&y+radius>b.top&&y-radius<b.bottom);
  if(previous&&fits(previous))return previous;
  // A legal component can be narrower than a sampling grid. Include every
  // reservation boundary so even a single exactly fitting point is considered.
  const xs=new Set([radius+12,width-radius-12,preferred.x]),ys=new Set([radius+12,height-radius-12,preferred.y]);
  for(const b of blockers){xs.add(b.left-radius);xs.add(b.right+radius);ys.add(b.top-radius);ys.add(b.bottom+radius);}
  const candidates=[];for(const x of xs)for(const y of ys)candidates.push({x,y});
  return candidates.filter(fits).sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y))[0]||null;
}
