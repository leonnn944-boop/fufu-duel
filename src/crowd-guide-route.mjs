// A single selected-player guide routes outside projected model and UI rectangles.
export function segmentCrossesRect(a,b,r){
  let lo=0,hi=1;
  for(const [axis,min,max] of [['x',r.left,r.right],['y',r.top,r.bottom]]){
    const d=b[axis]-a[axis];
    if(Math.abs(d)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;continue;}
    let x=(min-a[axis])/d,y=(max-a[axis])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>=hi)return false;
  }
  return hi>0&&lo<1;
}
export function routeCrowdGuide(start,end,obstacles,viewport){
  const inside=p=>p.x>=2&&p.x<=viewport.width-2&&p.y>=2&&p.y<=viewport.height-2;
  const blocked=p=>obstacles.some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom);
  if(!inside(start)||!inside(end)||blocked(start)||blocked(end))return null;
  const nodes=[start,end];for(const r of obstacles)for(const x of [r.left-.5,r.right+.5])for(const y of [r.top-.5,r.bottom+.5]){const p={x,y};if(inside(p)&&!blocked(p))nodes.push(p);}
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();costs[0]=0;
  while(done.size<nodes.length){let index=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(index<0||costs[i]<costs[index]))index=i;if(index<0||!Number.isFinite(costs[index]))return null;if(index===1)break;done.add(index);
    for(let i=0;i<nodes.length;i++){if(done.has(i)||i===index)continue;const cost=costs[index]+Math.hypot(nodes[index].x-nodes[i].x,nodes[index].y-nodes[i].y);if(cost>=costs[i]||obstacles.some(r=>segmentCrossesRect(nodes[index],nodes[i],r)))continue;costs[i]=cost;previous[i]=index;}
  }
  if(!Number.isFinite(costs[1]))return null;const route=[];for(let i=1;i>=0;i=previous[i]){route.unshift(nodes[i]);if(i===0)break;}return route;
}
