// A board note reserves screen space without changing the user's camera inputs.
export function openBoardInfo(game,{title,message,detail,steps=[]}){
  const origin=document.activeElement;
  const fromIndex=origin?.closest('#board-index-dialog');
  let dialog=document.getElementById('board-info-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='board-info-dialog';document.body.append(dialog);}
  dialog.boardInfoCleanup?.();dialog.replaceChildren();dialog.className='board-info-dialog';
  const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
  const header=el('header','board-info-header'),heading=el('h3','',''+title),clock=el('div','dialog-countdown'),close=el('button','board-info-close','×');
  heading.id='board-info-title';dialog.setAttribute('aria-labelledby',heading.id);close.type='button';close.setAttribute('aria-label','關閉格子說明');close.onclick=()=>dialog.close();header.append(heading,clock,close);
  const body=el('div','board-info-body');dialog.setAttribute('aria-description',detail);if(message)body.append(el('p','',message));
  if(steps.length){const list=el('ol','board-info-list');for(const text of steps)list.append(el('li','',text));body.append(list);}
  const hint=el('div','board-info-scroll-hint','↕ 捲動查看完整內容');hint.hidden=true;
  dialog.append(header,body,hint);let active=true;
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
  const place=()=>{
    const mobile=innerWidth<=800,w=mobile?innerWidth-24:320,pad=8,blocks=[];
    hint.hidden=true;
    const measure=dialog.cloneNode(true);measure.id='';measure.setAttribute('open','');
    Object.assign(measure.style,{visibility:'hidden',left:'-10000px',top:'0',width:w+'px',height:'auto'});document.body.append(measure);
    const naturalHeight=Math.ceil(measure.getBoundingClientRect().height);measure.remove();
    if(fromIndex){
      const height=Math.min(innerHeight-24,Math.max(104,naturalHeight));
      Object.assign(dialog.style,{left:(innerWidth-w)/2+'px',top:(innerHeight-height)/2+'px',width:w+'px',height:height+'px'});
      dialog.dataset.safePlacement='board-index';
      hint.hidden=naturalHeight<=height+1;
      return;
    }
    for(const e of document.querySelectorAll('button,#stage-timer,.topbar,.play-panel')){
      if(dialog.contains(e)||e.closest('.tile-label,.district-label,.landmark-label,.pawn-label')||!visible(e))continue;
      blocks.push(box(e));
    }
    if(origin instanceof HTMLElement&&visible(origin))blocks.push(box(origin));
    const scene=game.scene,stage=scene?.stage.getBoundingClientRect();
    if(stage)for(const[seat,pawn]of scene.pawns){
      const b=pawn.root.enabled&&scene.projectBounds(pawn.root);if(!b?.inFront)continue;
      const r={left:b.left+stage.left,right:b.right+stage.left,top:b.top+stage.top,bottom:b.bottom+stage.top};
      if(r.right<=0||r.left>=innerWidth||r.bottom<=0||r.top>=innerHeight)continue;
      blocks.push(r);const name=scene.labels.get(seat);if(name&&visible(name))blocks.push(box(name));
    }
    const candidates=[];
    for(const x of mobile?[12]:[16,innerWidth-w-16]){
      let intervals=[[12,innerHeight-12]];
      for(const b of blocks){if(b.right+pad<=x||b.left-pad>=x+w)continue;intervals=intervals.flatMap(([a,z])=>b.bottom+pad<=a||b.top-pad>=z?[[a,z]]:[[a,Math.min(z,b.top-pad)],[Math.max(a,b.bottom+pad),z]].filter(([a,z])=>z-a>=1));}
      // 44px header + 24px frame + 6px gap + at least one full23px text line.
      for(const[a,z]of intervals){const h=Math.min(mobile?240:400,Math.max(104,naturalHeight),z-a);if(h<104)continue;const y=mobile?z-h:a;candidates.push({x,y,w,h,score:h+(mobile?y/innerHeight*32:x===16?12:0)});}
    }
    // A compact readable scroll area is preferable to covering a visible pawn.
    const best=candidates.sort((a,b)=>b.score-a.score)[0];
    if(best){Object.assign(dialog.style,{left:best.x+'px',top:best.y+'px',width:best.w+'px',height:best.h+'px'});dialog.dataset.safePlacement='measured';}
    else{Object.assign(dialog.style,{left:'12px',top:'52px',width:(innerWidth-24)+'px',height:'104px'});dialog.dataset.safePlacement='compact-fallback';}
    hint.hidden=!(best&&naturalHeight>best.h+1&&best.h>=128);
  };
  place();document.body.classList.add('board-info-open');dialog.dataset.boardInfoPhase=game.state?.phase;
  const resized=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active&&dialog.open)place();}));
  window.addEventListener('resize',resized);
  const cleanup=()=>{active=false;window.removeEventListener('resize',resized);document.body.classList.remove('board-info-open');};dialog.boardInfoCleanup=cleanup;
  dialog.onclose=()=>{cleanup();if(origin instanceof HTMLElement&&origin.isConnected)origin.focus({preventScroll:true});};
  if(!dialog.open)dialog.showModal();
}
