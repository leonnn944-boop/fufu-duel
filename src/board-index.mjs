import {BOARD, WORLD_STOPS} from '../board-data.mjs';

const controllers=new WeakMap();

const element=(tag, className, text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text)node.textContent=text;
  return node;
};

function button(className, text, activate){
  const node=element('button',className,text);
  node.type='button';
  node.addEventListener('click',activate);
  return node;
}

function createBoardIndex(game){
  const dialog=element('dialog','board-index-dialog');
  dialog.id='board-index-dialog';
  dialog.setAttribute('aria-labelledby','board-index-title');
  const header=element('header','board-index-header');
  const title=element('h2','','棋盤索引');
  title.id='board-index-title';
  const close=button('board-index-close','關閉',()=>dialog.close());
  header.append(title,close);

  const bar=element('div','board-index-bar');
  const moveToPlayer=button('board-index-locate','我的位置',()=>{
    const mine=game.state?.players.find(player=>player.seat===game.seat);
    const row=rows.get(mine?.position)?.trigger;
    row?.scrollIntoView({block:'nearest'});
    row?.focus({preventScroll:true});
  });
  bar.append(moveToPlayer,element('div','dialog-countdown'));

  const list=element('ol','board-index-list');
  list.setAttribute('role','list');
  list.setAttribute('aria-label','依前進順序排列的二十格');
  list.start=0;
  const rows=new Map();
  for(const tile of BOARD){
    const entry=element('li','board-index-entry');
    entry.dataset.tile=String(tile.n);
    entry.dataset.kind=tile.type;
    const trigger=button('board-index-stop',null,()=>{
      trigger.focus({preventScroll:true});
      game.inspectTile(tile);
    });
    const number=element('span','board-index-number',String(tile.n));
    const copy=element('span','board-index-copy');
    const stop=WORLD_STOPS[tile.n];
    const name=element('strong','',stop.name);
    const counts=tile.type==='logo'?'開局起點':`一般 ${tile.general} 張 · 職業 ${tile.career} 張`;
    const info=element('span','board-index-counts',counts);
    const markers=element('span','board-index-markers');
    copy.append(name);
    if(stop.location)copy.append(element('span','board-index-location',stop.location));
    copy.append(info);
    if(tile.type==='lucky')copy.append(element('span','board-index-lucky','經過得小確幸'));
    copy.append(markers);
    const arrow=element('span','board-index-arrow','›');
    arrow.setAttribute('aria-hidden','true');
    trigger.append(number,copy,arrow);
    entry.append(trigger);
    list.append(entry);
    rows.set(tile.n,{trigger,markers});
  }
  dialog.append(header,bar,list);
  document.body.append(dialog);

  let origin=null;
  dialog.addEventListener('close',()=>{
    if(origin instanceof HTMLElement&&origin.isConnected)origin.focus({preventScroll:true});
  });
  const controller={dialog,rows,moveToPlayer,show(source){
    origin=source;
    dialog.showModal();
    refreshBoardIndex(game);
    list.scrollTop=0;
    close.focus({preventScroll:true});
  }};
  controllers.set(game,controller);
  return controller;
}

export function openBoardIndex(game,origin){
  const controller=controllers.get(game)||createBoardIndex(game);
  if(!controller.dialog.open)controller.show(origin);
}

export function refreshBoardIndex(game){
  const controller=controllers.get(game);
  if(!controller?.dialog.open)return;
  const playing=game.state?.phase&&game.state.phase!=='lobby';
  const players=playing?game.state.players:[];
  const mine=players.find(player=>player.seat===game.seat);
  const actor=players.find(player=>player.seat===game.actor);
  const counts=new Map();
  for(const player of players)counts.set(player.position,(counts.get(player.position)||0)+1);
  controller.moveToPlayer.hidden=!mine;
  for(const [tile,{trigger,markers}] of controller.rows){
    const occupied=counts.get(tile)||0;
    const isMine=mine?.position===tile;
    const isActor=actor?.position===tile;
    if(isMine)trigger.setAttribute('aria-current','location');
    else trigger.removeAttribute('aria-current');
    trigger.classList.toggle('actor-stop',isActor);
    const badges=[];
    if(isMine)badges.push(element('span','board-index-tag mine-tag',mine.career?.name?`我的位置 · ${mine.career.name}`:'我的位置'));
    if(isActor)badges.push(element('span','board-index-tag actor-tag',actor.seat===mine?.seat?'輪到你':`輪到 ${game.displayName(actor.seat)}`));
    if(occupied>1||(!isMine&&!isActor&&occupied))badges.push(element('span','board-index-tag',`${occupied} 位玩家`));
    markers.replaceChildren(...badges);
    markers.hidden=!badges.length;
  }
}
