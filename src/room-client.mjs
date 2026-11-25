import {fateKindLabel} from './fate-kind-label.mjs';
import { BOARD, WORLD_STOPS } from '../board-data.mjs';
const query = new URLSearchParams(location.search);
const enabled = query.get('multiplayer') === '1';
const $ = id => document.getElementById(id);
const tokenKey = code => `fufuduel:room:${code}`;
const recover = state => {
  for (const p of state.players) { p.investCategories = new Set(p.investCategories); p.usedCareers = new Set(p.usedCareers); }
  state.usedAssets = new Set(state.usedAssets); state.usedEvents = new Set(state.usedEvents);
  return state;
};
class RoomClient {
  constructor() {
    this.enabled=enabled; this.usePhaserControls=true; this.scene=null; this.sceneRevision=-1; this.latestState=null; this.code=null; this.token=null; this.seat=null; this.revision=-1; this.actor=null; this.players=[]; this.targetCount=2; this.pending=false; this.connectionProblem=false; this.deadline=0; this.serverOffset=0; this.lastRollRevision=-1;
    if (!enabled) return;
    document.body.insertAdjacentHTML('beforeend',`<section id="room-deck" aria-label="同格命運牌堆" hidden><h2>命運牌堆</h2><p id="deck-count"></p><div id="deck-stack"><button id="draw-normal">抽牌<br>一次翻開</button><button id="draw-extreme" hidden>極限命運<br>一次翻開</button></div></section><section id="room-investment" aria-label="投資類別牌堆" hidden><h2>投資牌堆</h2><p id="invest-progress"></p><p>點選類別後，由房間隨機抽出該類的一張牌；買入或放棄由你決定。</p><div id="invest-grid"></div><button id="invest-next">下一步・結束我的投資</button></section><section id="room-offer" aria-label="抽中的投資卡" hidden><article id="offer-face"><small>INVESTMENT CARD · 本回合已抽出</small><h2 id="offer-title"></h2><p id="offer-detail"></p><p>此卡只能買入或明確放棄；不會自動買入。</p></article><div id="offer-actions"><button id="offer-buy">買入此卡</button><button id="offer-decline">放棄此卡</button></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<section id="room-co-invest" aria-label="指定共同投資玩家" hidden><h2>選擇共同投資玩家</h2><p>請指定一位現金足夠的其他玩家，再由對方決定是否投資。</p><div id="co-invest-players"></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<section id="room-scoreboard" aria-label="全員資產與位置" hidden></section>`);
    document.body.insertAdjacentHTML('beforeend',`<button id="open-guide" type="button" aria-label="開啟玩法說明">玩法說明</button><section id="game-guide" role="dialog" aria-modal="true" aria-label="五回合玩法說明" hidden><div class="guide-paper"><header><h2>五回合怎麼玩</h2><button id="close-guide" type="button">返回遊戲</button></header><ol><li><strong>先選人數，再從兩端出發</strong><span>開局決定人數，所有玩家各自加入並抽取職業。系統隨機把玩家分到國際機場與環球郵輪港出發。</span></li><li><strong>擲骰並一起翻牌</strong><span>玩家依序移動。落格後一次翻出該格全部命運牌；固定效果自動結算，選擇題由當前玩家點選。可提早按下一步；擲骰倒數結束後，系統會自動擲骰並繼續。</span></li><li><strong>全員走完才投資</strong><span>每人每回合最多抽 3 張、同類別不重抽。翻出後自己選買入或放棄，也能提早結束。多人共同投資由抽卡者指定一位其他玩家決定。逾時由系統保守結束投資，不代買。</span></li><li><strong>市場結算後換回合</strong><span>目前資產較高者抽市場事件；本試玩暫以現金加持有現價比較。全員看到同一事件，房間結算後自動進入下一回合，共 5 回合。</span></li></ol><p>轉職後改用新職業收入池，固定支出、貸款利率與攤還規則沿用轉職前條件；新借款和原有負債合併，依同一利率自動攤還，之後也可再次轉職。斷線時在原裝置、原瀏覽器重開房間連結即可恢復座位。</p></div></section>`);
    const lobby=$('room-lobby'); lobby.hidden=false;
    $('open-guide').onclick=()=>{$('game-guide').hidden=false;};
    $('close-guide').onclick=()=>{$('game-guide').hidden=true;};
    $('create-room').onclick=()=>this.create();
    $('join-room').onclick=()=>this.join();
    for(let count=2;count<=12;count++)$('player-count').add(new Option(`${count} 人`,String(count)));
    $('host-start').onclick=()=>this.dispatch('start');
    $('room-code-input').value=query.get('room') || '';
    $('room-code-input').oninput=event=>event.target.value=event.target.value.toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,8);
    $('copy-room').onclick=async()=>{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?multiplayer=1&room=${this.code}`);this.message('邀請網址已複製');};
    $('open-board-zoom').onclick=()=>{ $('board-zoom').hidden=false; };
    $('close-board-zoom').onclick=()=>{ $('board-zoom').hidden=true; };
    $('draw-normal').onclick=()=>this.dispatch('drawAll',{extreme:false});
    $('draw-extreme').onclick=()=>this.dispatch('drawAll',{extreme:true});
    $('invest-next').onclick=()=>this.dispatch('nextStep');
    $('offer-buy').onclick=()=>this.dispatch('resolveOffer',{buy:true});
    $('offer-decline').onclick=()=>this.dispatch('resolveOffer',{buy:false});
    setInterval(()=>this.tick(),250);
    setInterval(()=>this.poll(),1000);
    const code=query.get('room')?.toUpperCase();
    if (code && (sessionStorage.getItem(tokenKey(code))||localStorage.getItem(tokenKey(code)))) { this.code=code; this.token=sessionStorage.getItem(tokenKey(code))||localStorage.getItem(tokenKey(code)); this.poll(true); }
  }
  attach(scene) { this.scene=scene; if(!this.enabled)return; if(this.latestState){scene.s=recover(this.latestState);this.sceneRevision=this.revision;scene.render();this.renderCards(this.latestState);this.renderDeck(this.latestState);this.renderInvestment(this.latestState);this.renderCoInvest(this.latestState);}this.renderStatus(); }
  message(value) { $('room-message').textContent=value; }
  async request(path,options={}) {
    const response=await fetch(path,{...options,headers:{'content-type':'application/json','x-player-token':this.token || '',...options.headers},cache:'no-store'});
    const result=await response.json();
    if(!response.ok) throw Object.assign(new Error(result.error || '操作失敗'),{result,status:response.status});
    return result;
  }
  async create() {
    try { const result=await this.request('/api/rooms',{method:'POST',body:JSON.stringify({nickname:$('nickname').value,playerCount:Number($('player-count').value)})});this.acceptIdentity(result);this.apply(result); }
    catch(error){this.message(error.message);}
  }
  async join() {
    const code=$('room-code-input').value;
    if(code.length!==8){this.message('請輸入 8 碼房碼');return;}
    try { const result=await this.request(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({nickname:$('nickname').value})});this.acceptIdentity(result);this.apply(result); }
    catch(error){this.message(error.message);}
  }
  acceptIdentity(result) {
    this.code=result.code;if(result.playerToken){this.token=result.playerToken;sessionStorage.setItem(tokenKey(this.code),this.token);localStorage.setItem(tokenKey(this.code),this.token);}this.seat=result.seat;
    history.replaceState(null,'',`${location.pathname}?multiplayer=1&room=${this.code}`);
    $('room-join-form').hidden=true;$('room-active').hidden=false;$('room-code').textContent=this.code;
  }
  apply(result) {
    if(result.playerToken && !this.token)this.acceptIdentity(result);
    if(result.revision < this.revision)return;
    const changed=result.revision!==this.revision;
    this.revision=result.revision;this.actor=result.actor;this.players=result.players;this.targetCount=result.targetCount??result.state.players.length;this.deadline=result.deadline;this.serverOffset=result.serverNow-Date.now();this.latestState=result.state;
    if(this.scene && this.sceneRevision!==this.revision) { this.scene.s=recover(result.state);this.sceneRevision=this.revision;this.scene.render(); if(changed && result.state.lastRoll && this.lastRollRevision!==this.revision){this.lastRollRevision=this.revision;this.scene.animateRemoteRoll?.(result.state.lastRoll);} }
    this.renderScoreboard(result.state);
    this.renderCards(result.state);
    this.renderMarket(result.state);
    this.renderBoardZoom(result.state);
    this.renderDeck(result.state);
    this.renderInvestment(result.state);
    this.renderCoInvest(result.state);
    this.renderStatus();
  }
  canAct(){return this.enabled && this.players.length===this.targetCount && (this.latestState?.phase==='lobby'?this.seat==='A':this.seat===this.actor) && !this.pending;}
  async poll(force=false) {
    if(!this.enabled || !this.code || !this.token || (this.pending && !force))return;
    try { const result=await this.request(`/api/rooms/${this.code}`);if(!this.seat)this.acceptIdentity(result);this.apply(result);if(this.connectionProblem)this.message('連線已恢復，已同步最新房間狀態');this.connectionProblem=false;return true; }
    catch(error){this.connectionProblem=true;this.message(error.status===401?'此瀏覽器的玩家身分無效；請回原本建立或加入房間的瀏覽器，重開房間連結':error.status===404?'找不到房間，請核對房碼或邀請連結':`連線中斷：${error.message}，將自動重試`);return false;}
  }
  async dispatch(type,payload={}) {
    if(!this.canAct())return;
    this.pending=true;this.renderStatus();
    try { const result=await this.request(`/api/rooms/${this.code}/actions`,{method:'POST',body:JSON.stringify({type,payload,revision:this.revision,requestId:crypto.randomUUID()})});this.apply(result);this.message('操作已同步到全員棋盤'); }
    catch(error){
      if(error.result?.state){this.apply(error.result);this.message(error.message);}
      else if(!error.status){const restored=await this.poll(true);if(restored)this.message('已同步最新房間狀態；請確認畫面後再操作');}
      else this.message(error.message);
    }
    finally{this.pending=false;this.scene?.render();const state=this.scene?.s||{phase:''};this.renderCards(state);this.renderDeck(state);this.renderInvestment(state);this.renderCoInvest(state);this.renderStatus();}
  }
  renderStatus() {
    if(!this.enabled)return;
    $('room-lobby').classList.toggle('active',!!this.code);
    $('room-lobby').classList.toggle('playing',!!this.code&&this.latestState?.phase!=='lobby');
    $('my-seat').textContent=this.seat ? `你是玩家 ${this.seat}` : '';
    $('room-members').textContent=this.players.length<=4?`已加入 ${this.players.length}/${this.targetCount} 人：${this.players.map(player=>`${player.nickname}（${player.seat}）`).join(' · ')}`:`已加入 ${this.players.length}/${this.targetCount} 人；全員名單與資產在下方可左右滑動查看`;
    const lobby=this.latestState?.phase==='lobby';
    $('room-turn').textContent=lobby?(this.players.length===this.targetCount?'已滿員，等待主持人開始':'等待所有玩家加入'):this.canAct()?'輪到你操作':`輪到玩家 ${this.actor || '—'}`;
    $('host-start').hidden=!(lobby&&this.seat==='A'&&this.players.length===this.targetCount);
    $('host-start').disabled=this.pending;
    this.tick();
  }
  renderScoreboard(state){
    const pane=$('room-scoreboard');if(!pane)return;
    pane.hidden=state.players.length<=2||state.phase==='revealGroup';if(pane.hidden)return;
    pane.replaceChildren();
    for(const player of state.players.filter(player=>state.phase!=='lobby'||this.players.some(member=>member.seat===player.seat))){
      const member=this.players.find(item=>item.seat===player.seat);
      const net=player.cash+player.holdings.reduce((total,holding)=>total+holding.price,0)-player.debt;
      const card=document.createElement('div');card.className=`score-chip${player.seat===this.seat?' mine':''}${player.seat===this.actor?' active':''}`;
      card.textContent=`${player.seat} ${member?.nickname??''}｜第 ${player.position} 格｜現金 $${Math.round(player.cash).toLocaleString('zh-TW')}｜淨資產 $${Math.round(net).toLocaleString('zh-TW')}`;
      pane.append(card);
    }
  }
  renderCards(state) {
    const tray=$('room-cards');if(!tray)return;
    if(this.usePhaserControls){tray.hidden=true;return;}
    tray.hidden=state.phase!=='revealGroup';if(tray.hidden)return;
    const grid=$('card-grid');grid.replaceChildren();
    const pending=state.cards.filter(c=>c.status==='pending').length;
    $('cards-hint').textContent=pending?`同時翻出 ${state.cards.length} 張，還有 ${pending} 張需作選擇。`:`${state.cards.length} 張已結算；約 5 秒後自動進下一步，也可提前前進。`;
    state.cards.forEach((card,index)=>{
      const row=card.rows.find(r=>r.description&&r.description!=='無')||card.rows[0];
      const article=document.createElement('article');article.className=`fate-card ${card.status}`;
      const kind=document.createElement('small');kind.textContent=fateKindLabel(card.kind,row.id);
      const title=document.createElement('h3');title.textContent=`${row.id.split('-')[0]}｜${row.title==='無'?'命運牌':row.title}`;
      const description=document.createElement('p');description.textContent=row.description==='無'?'依卡面選擇處理方式。':row.description;
      article.append(kind,title,description);
      if(card.status==='pending') {
        for(const choice of card.rows){
          const button=document.createElement('button');button.textContent=choice.id===row.id&&card.rows.length===1?'確認':`${choice.id.replace(row.id.split('-')[0],'').replace(/^-/, '') || choice.title} ${choice.title}`.slice(0,34);
          const affordable=this.scene?.variantAffordable(choice)??true;
          if(!affordable)button.textContent+=' · 資金不足';
          button.disabled=!this.canAct()||!affordable;button.onclick=()=>this.dispatch('chooseCard',{cardIndex:index,id:choice.id});article.append(button);
        }
      } else {const effect=document.createElement('small');effect.textContent=card.effect||'效果已結算';article.append(effect);}
      grid.append(article);
    });
    const next=$('cards-next');next.disabled=pending>0||!this.canAct();next.onclick=()=>this.dispatch('nextStep');
  }
  renderMarket(state) {
    const pane=$('market-event');if(!pane)return;
    pane.hidden=state.phase!=='marketReveal';if(pane.hidden)return;
    const event=state.event;
    $('market-drawer').textContent=`玩家 ${state.players[state.drawer].seat} 翻開全員市場事件 · ${event.id}`;
    $('market-title').textContent=event.title;
    $('market-region').textContent=`${event.region}市場；全員共同套用以下變動，約 6 秒後自動結算。`;
    const list=$('market-effects');list.replaceChildren();
    ['股票','房地產','創業','貴金屬','加密貨幣','外匯'].forEach((name,index)=>{
      const cell=document.createElement('span'),value=Math.round(event.assetEffect[index]*100);
      const yieldChange=Math.round(event.yieldEffect[index]*100);
      cell.textContent=`${name} 市價 ${value>=0?'+':''}${value}% · 收益 ${yieldChange>=0?'+':''}${yieldChange}%`;
      list.append(cell);
    });
  }
  renderBoardZoom(state) {
    const holder=$('zoom-pawns');if(!holder)return;holder.replaceChildren();
    for(const tile of BOARD){const label=document.createElement('div');label.className='zoom-stop-name';label.textContent=WORLD_STOPS[tile.n].shortName;label.title=WORLD_STOPS[tile.n].name;label.style.left=`${tile.x*100}%`;label.style.top=`calc(${tile.y*100}% + 19px)`;holder.append(label);}
    for(const p of state.players.filter(player=>state.phase!=='lobby'||this.players.some(member=>member.seat===player.seat))){
      const point=BOARD[p.position],marker=document.createElement('span');
      marker.className=p.seat==='B'?'b':'';marker.textContent=p.seat;
      marker.style.left=`calc(${point.x*100}% - 16px)`;marker.style.top=`calc(${point.y*100}% - 16px)`;
      holder.append(marker);
    }
  }
  renderDeck(state){
    const pane=$('room-deck');if(!pane)return;if(this.usePhaserControls){pane.hidden=true;return;}pane.hidden=state.phase!=='deck';if(pane.hidden)return;
    const me=state.players[state.turn],worth=me.cash+me.holdings.reduce((sum,h)=>sum+h.price,0)-me.debt;
    const eligible=worth>=5000000&&state.queue.some(q=>q.kind==='general');
    $('deck-count').textContent=`這一格會一次翻開 ${state.queue.length} 張牌`;
    $('draw-normal').disabled=!this.canAct();$('draw-extreme').hidden=!eligible;$('draw-extreme').disabled=!this.canAct();
  }
  renderInvestment(state){
    const pane=$('room-investment'),offer=$('room-offer');if(!pane||!offer)return;
    if(this.usePhaserControls){pane.hidden=true;offer.hidden=true;return;}
    pane.hidden=state.phase!=='investIdle';offer.hidden=state.phase!=='offer';
    if(!pane.hidden){
      const me=state.players[state.turn];$('invest-progress').textContent=`已抽 ${me.investDraws}/3 張；每個類別本回合只能抽一次。`;
      const grid=$('invest-grid');grid.replaceChildren();
      for(const [key,title] of [['stock','股票'],['property','房地產'],['venture','創業'],['metal','貴金屬'],['forex','外匯'],['crypto','加密貨幣']]){
        const button=document.createElement('button');button.className='invest-card';button.textContent=title;
        const categoryUsed=Array.isArray(me.investCategories)?me.investCategories.includes(key):me.investCategories.has(key);
        button.disabled=!this.canAct()||categoryUsed||me.investDraws>=3||(key==='crypto'&&state.round<4);
        button.onclick=()=>this.dispatch('drawAsset',{category:key});grid.append(button);
      }
      $('invest-next').disabled=!this.canAct();
    }
    if(!offer.hidden){
      const me=state.players[state.turn],card=state.offer;
      $('offer-title').textContent=`${card.id}｜${card.name}`;
      $('offer-detail').textContent=`隨機抽中的投資卡 · 買入價 $${Math.round(card.price).toLocaleString('zh-TW')} · 你目前現金 $${Math.round(me.cash).toLocaleString('zh-TW')}`;
      $('offer-buy').disabled=!this.canAct()||me.cash<card.price;
      $('offer-decline').disabled=!this.canAct();
    }
  }
  renderCoInvest(state){
    const pane=$('room-co-invest');if(!pane)return;if(this.usePhaserControls){pane.hidden=true;return;}pane.hidden=state.phase!=='coInvestTarget';if(pane.hidden)return;
    const grid=$('co-invest-players');grid.replaceChildren();
    state.players.forEach((player,index)=>{
      if(index===state.turn)return;
      const button=document.createElement('button');
      const member=this.players.find(item=>item.seat===player.seat);
      button.textContent=`${player.seat} ${member?.nickname??''} · 現金 $${Math.round(player.cash).toLocaleString('zh-TW')}`;
      button.disabled=!this.canAct()||player.cash<state.coInvest.cost;
      button.onclick=()=>this.dispatch('chooseCoInvestor',{seat:player.seat});
      grid.append(button);
    });
  }
  tick() {
    if(!this.enabled || !this.code)return;
    const remaining=Math.max(0,Math.ceil((this.deadline-(Date.now()+this.serverOffset))/1000));
    const phase=this.scene?.s?.phase;
    if(phase==='lobby'){$('room-countdown').textContent='等待開局';return;}
    if(phase==='revealGroup'&&this.scene.s.cards.some(card=>card.status==='pending')){
      $('room-countdown').textContent='等待卡牌選擇';return;
    }
    if(phase==='summary'&&this.scene.s.round===5){$('room-countdown').textContent='五回合結束';return;}
    const timed=phase==='revealGroup'||phase==='marketReveal'||phase==='summary';
    $('room-countdown').textContent=timed?(remaining?`共同倒數 ${remaining} 秒`:'即將進入下一階段'):'等待當前玩家操作';
  }
}
export const roomClient = new RoomClient();
