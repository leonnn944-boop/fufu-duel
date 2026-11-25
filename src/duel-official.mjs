import {fateKindLabel} from './fate-kind-label.mjs';
import { CAREERS, drawRoundIncome, drawBaseReturns, getBaseRepayment } from '../official-five.mjs';
import { CARD_SNAPSHOT } from '../cards-snapshot.mjs';
import { BOARD, BOARD_NAMES, WORLD_STOPS } from '../board-data.mjs';
import { unusedAssets, applyMarketEvent, drawMarketEvent, pendingPassiveIncome, netWorth, marketDrawerIndex, traversedTiles } from './rules.mjs';
import { MAX_INVESTMENT_DRAWS, landingFateQueue, canDrawInvestment, drawInvestmentCard, legalPhaseAction } from './turn-state.mjs';
import { roomClient } from './room-client.mjs';

const COLOR={navy:0x07182b,deep:0x102a45,blue:0x1c659d,gold:0xffcc4c,orange:0xf4a63b,white:0xf8f6ee,muted:0xb6c7d8,red:0xa14450,stroke:0x57708a};
const LABEL={stock:'股票',property:'房地產',venture:'創業',metal:'貴金屬',crypto:'加密貨幣',forex:'外匯'};
const ICON={stock:'📈',property:'🏠',venture:'🚀',metal:'🪙',crypto:'₿',forex:'💱'};
const CAREER_KEY={founder:'JA',freelancer:'JB',engineer:'JC',doctor:'JD',sales:'JE',assistant:'JF'};
const money=n=>'$'+Math.round(n||0).toLocaleString('zh-TW');
const careerName=p=>p.activeIncomePool?`自營商（原${p.career?.name??'職業'}）`:p.career?.name??'待選職業';
const signed=n=>(n<0?'−':'+')+money(Math.abs(n));
const amount=s=>Number(String(s??'').replace(/[^\d.-]/g,''))||0;
const root=id=>String(id).match(/^(?:DA|DB|D|JA|JB|JC|JD|JE|JF|L)\d{3}/)?.[0]??id;
const wrapCjk=(value,limit)=>{const lines=[''];for(const char of Array.from(String(value))){if(char==='\n'){lines.push('');continue;}const index=lines.length-1;if(Array.from(lines[index]).length>=limit)lines.push('');lines[lines.length-1]+=char;}return lines.join('\n');};
const choose=list=>list[Math.floor(Math.random()*list.length)];
function grouped(rows){const map=new Map();for(const row of rows){if(row.id.endsWith('特殊事件'))continue;const id=root(row.id);if(!map.has(id))map.set(id,[]);map.get(id).push(row);}return [...map.values()];}
const JOBS=Object.fromEntries(Object.entries(CARD_SNAPSHOT.jobs).map(([id,rows])=>[id,grouped(rows)]));
const NORMAL=grouped(CARD_SNAPSHOT.general.filter(row=>!row.id.startsWith('DB')));
const EXTREME=grouped(CARD_SNAPSHOT.general.filter(row=>row.id.startsWith('DB')));
const actionName={lobby:'等待玩家加入',setup:'選擇職業',roll:'擲骰移動',deck:'抽同格命運牌',revealGroup:'同格命運牌',generalChoice:'選擇命運牌池',reveal:'翻牌',coInvestTarget:'指定共同投資玩家',coInvest:'共同投資選擇',receipt:'收支結果',investIdle:'投資階段',offer:'投資機會',marketReady:'市場事件',marketReveal:'事件揭示',summary:'回合結算',hostReview:'主持人判定'};
function newPlayer(seat,position){return {seat,position,career:null,cash:0,debt:0,holdings:[],income:0,pendingPassive:0,extraPassive:0,future:[],pendingCareerChange:null,investDraws:0,investCategories:new Set(),careerDraws:0,generalDraws:0,usedCareers:new Set()};}

class OfficialDuel extends Phaser.Scene {
  constructor(){super('official-duel');this.usePhaserControls=true;this.cardFocus=0;this.reset();}
  reset(){this.s={round:1,phase:'setup',setupIndex:0,players:[newPlayer('A',0),newPlayer('B',10)],turn:0,queue:[],current:null,offer:null,receipt:null,event:null,returns:null,drawer:0,usedAssets:new Set(),usedEvents:new Set(),note:'玩家 A 從國際機場、玩家 B 從環球郵輪港 出發；開局可交換座位。',busy:false};}
  preload(){this.load.image('official-board','./assets/board-5.jpg');}
  create(){window.__officialDuel=this;this.cameras.main.setBackgroundColor(COLOR.navy);this.scale.on('resize',()=>this.render());this.render();roomClient.attach(this);}
  p(){return this.s.players[this.s.turn];}
  label(x,y,value,size=14,color=COLOR.white,origin=.5,width=600,bold=true){return this.add.text(x,y,String(value),{fontFamily:'system-ui, Microsoft JhengHei, sans-serif',fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:'#'+color.toString(16).padStart(6,'0'),align:origin===0?'left':'center',wordWrap:{width},lineSpacing:2}).setOrigin(origin);}
  box(x,y,w,h,color=COLOR.deep){return this.add.rectangle(x,y,w,h,color).setStrokeStyle(1,COLOR.stroke,.9);}
  button(x,y,value,action,w=180,h=42,enabled=true,color=COLOR.blue,requiresTurn=true){enabled=enabled&&(!requiresTurn||!roomClient.enabled||roomClient.canAct());const b=this.box(x,y,w,h,enabled?color:0x34475b),t=this.label(x,y,value,14,enabled?COLOR.white:COLOR.muted,.5,w-10),phase=this.s.phase;if(enabled)b.setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(!this.s.busy&&this.s.phase===phase)action();});return {b,t};}
  render(){this.children.removeAll(true);this.W=this.scale.gameSize.width;this.H=this.scale.gameSize.height;this.mobile=this.W<680;const W=this.W,H=this.H,s=this.s;
    this.add.rectangle(W/2,H/2,W,H,COLOR.navy);this.add.rectangle(W/2,36,W,72,0x071226);
    this.label(13,13,'富負對決',this.mobile?20:27,COLOR.white,0,300);
    this.label(13,46,`正式地圖 #5 · ${s.players.length} 人棋盤`,this.mobile?10:13,COLOR.muted,0,350);
    this.label(W-13,15,`第 ${s.round} / 5 回合`,this.mobile?13:18,COLOR.gold,1,200);
    this.label(W-13,48,`${roomClient.enabled?`輪到 ${roomClient.actor??'—'} · `:''}${actionName[s.phase]??s.phase}`,this.mobile?10:13,COLOR.muted,1,260);
    this.drawBoard();this.drawPlayers();this.drawPanel();if(roomClient.enabled&&s.phase==='revealGroup')this.drawCardScreen();
  }
  drawBoard(){const W=this.W,H=this.H,ratio=10004/7087;const maxW=this.mobile?W*.97:W*.635,maxH=this.mobile?H*.32:H*.74,w=Math.min(maxW,maxH*ratio),h=w/ratio;const x=this.mobile?W/2:W*.326,y=this.mobile?H*.29:H*.49;this.board={x,y,w,h};
    this.add.image(x,y,'official-board').setDisplaySize(w,h).setStrokeStyle?.(1,COLOR.gold);
    this.add.rectangle(x,y,w,h).setStrokeStyle(2,COLOR.gold,.75);
    for(const tile of BOARD){const p=this.tilePoint(tile.n);this.add.text(p.x,p.y+h*.040,WORLD_STOPS[tile.n].shortName,{fontFamily:'Microsoft JhengHei, sans-serif',fontSize:this.mobile?'8px':'11px',color:'#fff7e2',backgroundColor:'#1c4d51',padding:{x:2,y:1}}).setOrigin(.5);}
    const shown=this.s.phase==='lobby'&&roomClient.enabled?this.s.players.filter(p=>roomClient.players.some(member=>member.seat===p.seat)):this.s.players;
    shown.forEach((p,i)=>{const point=this.tilePoint(p.position),group=shown.filter(q=>q.position===p.position),slot=group.findIndex(q=>q.seat===p.seat),spread=group.length>1?Math.min(this.mobile?17:27,8+group.length*2):0,angle=2*Math.PI*slot/group.length-Math.PI/2,pt={x:point.x+Math.cos(angle)*spread,y:point.y+Math.sin(angle)*spread},colors=[COLOR.orange,COLOR.blue,0x39b57d,0xd778b0,0x9678db,0xc4a344],c=colors[i%colors.length],r=this.mobile?(this.s.players.length>6?7:9):(this.s.players.length>6?11:15),active=(roomClient.enabled?roomClient.actor===p.seat:i===this.s.turn);this.add.circle(pt.x,pt.y,r+4,0x07182b,.85).setStrokeStyle(active?3:1,active?COLOR.gold:COLOR.white,.95);this.add.circle(pt.x,pt.y-r*.5,r*.55,c).setStrokeStyle(1,COLOR.white);this.add.ellipse(pt.x,pt.y+r*.48,r*1.48,r*1.08,c).setStrokeStyle(2,COLOR.white);this.label(pt.x,pt.y+r*.5,p.seat,this.mobile?8:11,COLOR.navy);});
    this.label(x,y-h/2-(this.mobile?12:17),'沿正式地圖編號前進 · 經過小確幸角抽牌',this.mobile?9:12,COLOR.gold,.5,w);
  }
  tilePoint(n){const tile=BOARD[n],b=this.board;return {x:b.x+(tile.x-.5)*b.w,y:b.y+(tile.y-.5)*b.h};}
  drawPlayers(){if(roomClient.enabled&&this.s.players.length>2)return;const W=this.W,H=this.H,y=this.mobile?H*.483:H*.918;this.s.players.forEach((p,i)=>{const x=this.mobile?W*(i?.75:.25):W*(i?.48:.16),w=this.mobile?W*.47:W*.305,h=this.mobile?H*.067:H*.075;this.box(x,y,w,h,i===this.s.turn&&this.s.phase!=='setup'?0x1a4569:COLOR.deep);this.label(x-w*.45,y-h*.30,`${p.seat} ${careerName(p)} · ${p.position===0?'機場':p.position===10?'郵輪港':`第 ${p.position} 格`}`,this.mobile?10:13,i?COLOR.gold:COLOR.orange,0,w*.9);this.label(x-w*.45,y+h*.02,`現金 ${money(p.cash)}  淨資產 ${money(netWorth(p.cash,p.holdings,p.debt))}`,this.mobile?9:12,COLOR.white,0,w*.9);});}
  panel(){const W=this.W,H=this.H;const x=this.mobile?W/2:W*.818,y=this.mobile?H*.752:H*.525,w=this.mobile?W*.968:W*.342,h=this.mobile?H*.46:H*.79;this.box(x,y,w,h,0x0e2947);return {x,y,w,h,left:x-w/2+14,top:y-h/2+14,bottom:y+h/2-12};}
  panelBody(p,title,body,bodySize){this.label(p.left,p.top,title,this.mobile?19:22,COLOR.gold,0,p.w-28);if(body){const size=bodySize??14,limit=Math.max(15,Math.floor((p.w-28)/(size*.96)));this.label(p.left,p.top+(this.mobile?39:43),wrapCjk(body,limit),size,COLOR.white,0,p.w-28,false);}}
  drawCardScreen(){
    const s=this.s,W=this.W,H=this.H;
    const batch=`${s.round}:${s.turn}:${s.lastRoll?.from}:${s.lastRoll?.die}:${s.cards.length}`;
    if(this.cardBatch!==batch){this.cardBatch=batch;this.cardFocus=0;}
    this.cardFocus=Math.max(0,Math.min(this.cardFocus,s.cards.length-1));
    const card=s.cards[this.cardFocus];if(!card)return;
    this.add.rectangle(W/2,H/2,W,H,0x041326,.94).setInteractive();
    const number=this.cardFocus+1,total=s.cards.length,pending=s.cards.filter(item=>item.status==='pending').length;
    this.label(W/2,this.mobile?120:42,`同格命運牌  ${number} / ${total}  ·  ${pending} 張待選`,this.mobile?16:21,COLOR.gold);
    const paperW=Math.min(W*.94,this.mobile?520:760),paperH=Math.min(H*.64,this.mobile?560:630),paperX=W/2,paperY=H*.49,top=paperY-paperH/2,bottom=paperY+paperH/2,left=paperX-paperW/2+24;
    this.add.rectangle(paperX,paperY,paperW,paperH,0xf4e8cf).setStrokeStyle(5,COLOR.gold);
    const row=card.rows.find(item=>item.description&&item.description!=='無')??card.rows[0];
    const kind=fateKindLabel(card.kind,row.id);
    this.label(left,top+20,`${kind}  ·  ${card.status==='resolved'?'效果已結算':'請選擇'}`,this.mobile?13:16,0x8a5f1e,0,paperW-48);
    const title=this.label(left,top+53,wrapCjk(`${root(row.id)}｜${row.title==='無'?'命運牌':row.title}`,this.mobile?18:32),this.mobile?18:24,COLOR.navy,0,paperW-48);
    const options=card.status==='pending'?card.rows.filter(item=>!(root(item.id)==='D002'&&item.id.endsWith('投資'))):[];
    const rows=Math.ceil(options.length/2),firstOptionY=bottom-36-(rows-1)*50;
    const bodyTop=Math.max(top+(this.mobile?99:105),top+53+title.height+12),bodyLimit=(options.length?firstOptionY-34:bottom-65)-bodyTop;
    const description=row.description==='無'?'依卡面選擇處理方式。':row.description;
    const body=this.label(left,bodyTop,wrapCjk(description,this.mobile?19:38),this.mobile?15:18,COLOR.navy,0,paperW-48,false);
    for(let size=this.mobile?15:18;body.height>bodyLimit&&size>11;size--)body.setFontSize(size-1);
    if(card.status==='resolved')this.label(left,bottom-53,card.effect||'效果已結算',this.mobile?14:17,0x6e5919,0,paperW-48);
    options.forEach((choice,index)=>{
      const columns=options.length===1?1:2,col=index%columns,r=Math.floor(index/columns),width=columns===1?paperW-48:(paperW-58)/2;
      const x=columns===1?paperX:paperX+(col?1:-1)*(width/2+5),y=firstOptionY+r*50;
      const label=options.length===1?'套用卡牌':this.variantLabel(choice);
      this.button(x,y,label,()=>roomClient.dispatch('chooseCard',{cardIndex:this.cardFocus,id:choice.id}),width,42,this.variantAffordable(choice),COLOR.blue);
    });
    this.button(W*.26,H-88,'上一張',()=>{this.cardFocus=(this.cardFocus+total-1)%total;this.render();},Math.min(145,W*.38),42,total>1,0x3d5d78,false);
    this.button(W*.74,H-88,'下一張',()=>{this.cardFocus=(this.cardFocus+1)%total;this.render();},Math.min(145,W*.38),42,total>1,0x3d5d78,false);
    this.button(W/2,H-35,pending?'請完成卡牌選擇':'全部看完 · 下一步',()=>roomClient.dispatch('nextStep'),Math.min(300,W*.82),44,pending===0,COLOR.blue);
  }
  pile(x,y,w,h,label,onOpen,enabled=true,color=COLOR.blue){
    for(let layer=2;layer>0;layer--)this.add.rectangle(x+layer*5,y+layer*5,w,h,0x07182b).setStrokeStyle(2,COLOR.gold);
    const front=this.add.rectangle(x,y,w,h,enabled?color:0x34475b).setStrokeStyle(4,COLOR.gold),caption=this.label(x,y,label,this.mobile?16:20,enabled?COLOR.gold:COLOR.muted,.5,w-16);
    if(enabled&&(!roomClient.enabled||roomClient.canAct())){
      front.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
        this.tweens.add({targets:[front,caption],scaleX:0,duration:150,ease:'Sine.easeIn',onComplete:onOpen});
      });
    }
  }
  bottomButton(p,label,fn,enabled=true,color=COLOR.blue){this.button(p.x,p.bottom-17,label,fn,p.w-28,this.mobile?40:47,enabled,color);}
  twoButtons(p,items,y,colors=[]){const w=(p.w-38)/2;items.forEach((it,i)=>this.button(p.x+(i?1:-1)*(w/2+3),y,it.label,it.run,w,this.mobile?39:45,it.enabled!==false,colors[i]??COLOR.blue));}
  diceRow(x,y){
    const size=this.mobile?29:39,step=size+8;
    const dots={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
    for(let face=1;face<=6;face++){
      const cx=x+(face-3.5)*step;
      this.add.rectangle(cx,y,size,size,COLOR.white).setStrokeStyle(2,COLOR.gold);
      for(const [dx,dy] of dots[face])this.add.circle(cx+dx*size*.29,y+dy*size*.29,size*.065,COLOR.navy);
    }
  }
  drawPanel(){const s=this.s,p=this.panel(),me=this.p(),unit=this.mobile?43:51;
    if(roomClient.enabled&&s.phase==='lobby'){
      const full=roomClient.players.length===s.players.length;
      this.panelBody(p,full?'等待主持人開始':'等待玩家加入',`本局 ${s.players.length} 人。所有玩家從自己的裝置加入後，主持人按「開始遊戲」；每位玩家只操作自己的角色。`);
      return;
    }
    if(roomClient.enabled&&s.phase==='deck'){
      const eligible=netWorth(me.cash,me.holdings,me.debt)>=5000000&&s.queue.some(card=>card.kind==='general');
      this.panelBody(p,`${me.seat}：翻開命運牌`,`擲出 ${s.lastRoll?.die??'—'} 點，抵達第 ${me.position} 格 · ${BOARD_NAMES[me.position]}。這一格連同途中小確幸共 ${s.queue.length} 張牌；點牌背一次翻開。`);
      const y=p.top+(this.mobile?175:290),w=eligible?Math.min(145,p.w*.39):Math.min(205,p.w*.6),h=this.mobile?155:245;
      if(eligible){
        this.pile(p.x-w*.57,y,w,h,'一般命運',()=>roomClient.dispatch('drawAll',{extreme:false}));
        this.pile(p.x+w*.57,y,w,h,'極限命運',()=>roomClient.dispatch('drawAll',{extreme:true}),true,0x6e3457);
      }else this.pile(p.x,y,w,h,`RICH OR POOR\n翻開 ${s.queue.length} 張`,()=>roomClient.dispatch('drawAll',{extreme:false}));
      return;
    }
    if(roomClient.enabled&&s.phase==='revealGroup'){
      this.panelBody(p,`${me.seat}：同格命運牌`,`已同時翻出 ${s.cards.length} 張，請在卡牌區檢視效果。需要決策的卡保留卡內選項；其餘效果只結算一次。`);
      return;
    }
    if(roomClient.enabled&&s.phase==='investIdle'){
      this.panelBody(p,`${me.seat}：投資階段`,`已抽 ${me.investDraws}/3 張；每類本回合只能抽一次。點選牌堆抽出一張，也可提前結束。`);
      const cats=[['stock','股票'],['property','房地產'],['venture','創業'],['metal','貴金屬'],['forex','外匯'],['crypto','加密貨幣']];
      const w=(p.w-48)/3,h=this.mobile?80:130,y0=p.top+(this.mobile?142:190),step=this.mobile?90:145;
      cats.forEach(([key,title],index)=>{
        const col=index%3,row=Math.floor(index/3),x=p.x+(col-1)*(w+7),issue=canDrawInvestment({phase:s.phase,player:me,category:key,round:s.round,unusedCards:unusedAssets(s.round,s.usedAssets)});
        this.pile(x,y0+row*step,w,h,title,()=>roomClient.dispatch('drawAsset',{category:key}),!issue);
      });
      this.bottomButton(p,'結束我的投資',()=>roomClient.dispatch('nextStep'),true,0x3d5d78);return;
    }
    if(roomClient.enabled&&s.phase==='offer'){
      const a=s.offer,afford=me.cash>=a.price,paperW=p.w-32,paperH=this.mobile?205:370,paperY=p.top+(this.mobile?170:300);
      this.add.rectangle(p.x,paperY,paperW,paperH,0xf4e8cf).setStrokeStyle(4,COLOR.gold);
      this.label(p.x-paperW/2+18,paperY-paperH/2+18,'INVESTMENT CARD',this.mobile?12:17,0x8a5f1e,0,paperW-36);
      this.label(p.x-paperW/2+18,paperY-paperH/2+55,`${a.id}｜${a.name}`,this.mobile?19:25,COLOR.navy,0,paperW-36);
      this.label(p.x-paperW/2+18,paperY-paperH/2+(this.mobile?110:155),`買入價 ${money(a.price)}\n現金 ${money(me.cash)}\n${afford?'可買入或放棄':'資金不足，仍消耗抽牌次數'}`,this.mobile?14:19,COLOR.navy,0,paperW-36,false);
      this.twoButtons(p,[{label:'買入',run:()=>roomClient.dispatch('resolveOffer',{buy:true}),enabled:afford},{label:'放棄',run:()=>roomClient.dispatch('resolveOffer',{buy:false})}],p.bottom-25);return;
    }
    if(s.phase==='setup'){
      this.panelBody(p,`玩家 ${s.players[s.setupIndex].seat}：選擇職業`,'六種職業取自主持人表，每種有兩個名額。');
      const choices=CAREERS.filter(c=>s.players.filter(player=>player.career?.id===c.id).length<2);
      choices.forEach((c,i)=>{const col=i%2,row=Math.floor(i/2),bw=(p.w-38)/2,x=p.x+(col?1:-1)*(bw/2+3),y=p.top+(this.mobile?115:145)+row*unit;this.button(x,y,c.name,()=>this.chooseCareer(c.id),bw,this.mobile?37:44);});
      if(s.players.length===2)this.bottomButton(p,s.players[0].position===0?'交換兩側起點':'恢復原本起點',()=>this.swapStarts(),true,0x3d5d78);return;
    }
    if(s.phase==='roll'){this.panelBody(p,`${me.seat}：擲骰移動`,`收入 ${money(me.income)} 已入帳。從第 ${me.position} 格 · ${BOARD_NAMES[me.position]} 出發；骰子會逐格前進，途中經過小確幸角也抽牌。`);this.diceRow(p.x,p.top+(this.mobile?148:180));this.bottomButton(p,'擲骰前進',()=>this.roll());return;}
    if(s.phase==='deck'){
      const count=k=>s.queue.filter(q=>q.kind===k).length;
      this.panelBody(p,`${me.seat}：選擇命運牌堆`,`抵達第 ${me.position} 格。請點圖示抽牌，每張翻開並結算後再選下一張。\n本回合職業 ${me.careerDraws}/3、一般 ${me.generalDraws}/3。`);
      [['lucky','✨ 小確幸'],['career','💼 職業命運'],['general','❔ 一般命運']].forEach(([kind,label],i)=>this.button(p.x,p.top+(this.mobile?135:170)+i*unit,`${label} × ${count(kind)}`,()=>this.takeDeck(kind),p.w-36,this.mobile?38:46,count(kind)>0));
      this.bottomButton(p,'牌已處理',()=>this.finishFate(),s.queue.length===0,0x3d5d78);return;
    }
    if(s.phase==='generalChoice'){this.panelBody(p,'選擇一般命運牌池',`${me.seat} 淨資產已達 ${money(netWorth(me.cash,me.holdings,me.debt))}；這張牌可選一般命運或極限命運。`);this.twoButtons(p,[{label:'❔ 一般命運',run:()=>this.revealGeneral(false)},{label:'⚡ 極限命運',run:()=>this.revealGeneral(true)}],p.bottom-25);return;}
    if(s.phase==='reveal'){
      const rows=s.current.rows,shown=rows.find(r=>r.description&&r.description!=='無')??rows[0],title=shown.title==='無'?'命運牌':shown.title;
      const paperW=p.w-24,paperH=this.mobile?238:386,paperY=p.top+(this.mobile?124:210),paper=this.add.container(p.x,paperY);
      paper.add(this.add.rectangle(0,0,paperW,paperH,0xf4e8cf).setStrokeStyle(2,COLOR.gold));
      const cardText=(value,xx,yy,size,bold=false)=>{
        const text=this.add.text(xx,yy,String(value),{fontFamily:'system-ui, Microsoft JhengHei, sans-serif',fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:'#22334a',lineSpacing:3}).setOrigin(0);
        const lines=[''];
        for(const char of Array.from(String(value))){
          if(char==='\n'){lines.push('');continue;}
          const last=lines.length-1,next=lines[last]+char;
          if(lines[last]&&text.context.measureText(next).width>paperW-30)lines.push(char);
          else lines[last]=next;
        }
        text.setText(lines.join('\n'));
        return text;
      };
      const heading=cardText(`${root(shown.id)}｜${title}`,-paperW/2+15,-paperH/2+14,this.mobile?16:21,true);
      paper.add(heading);
      const description=shown.description&&shown.description!=='無'?shown.description:'選擇此卡的處理方式。';
      paper.add(cardText(description,-paperW/2+15,-paperH/2+Math.max(this.mobile?49:57,14+heading.height+8),this.mobile?(description.length<100?13:11):(description.length<120?17:14)));
      const effect=[shown.currentIncome?`收入 ${shown.currentIncome}`:'',shown.currentExpense?`支出 ${shown.currentExpense}`:''].filter(Boolean).join('　');
      if(effect)paper.add(cardText(effect,-paperW/2+15,paperH/2-34,this.mobile?10:13,true));
      const options=rows.filter(r=>!r.id.includes('投資方'));const y0=p.bottom-(options.length>2?(this.mobile?102:122):(this.mobile?55:65));
      options.forEach((row,i)=>{const cols=options.length>1?2:1,col=i%cols,r=Math.floor(i/cols),bw=cols===2?(p.w-38)/2:p.w-28,x=cols===2?p.x+(col?1:-1)*(bw/2+3):p.x,y=y0+r*(this.mobile?40:49);const label=options.length===1?'套用卡牌':this.variantLabel(row);this.button(x,y,label,()=>this.applyCard(row),bw,this.mobile?35:44,this.variantAffordable(row));});
      if(s.flip){s.flip=false;paper.scaleX=0;this.tweens.add({targets:paper,scaleX:1,duration:320,ease:'Cubic.easeOut'});}return;
    }
    if(s.phase==='coInvestTarget'){
      this.panelBody(p,`${me.seat}：指定投資者`,`抽卡者選一位其他玩家；對方需有 ${money(s.coInvest.cost)} 現金，並由對方決定是否投資。`);
      const others=s.players.filter(player=>player!==me),pageSize=this.mobile?4:6,pages=Math.ceil(others.length/pageSize);
      this.targetPage=Math.max(0,Math.min(this.targetPage??0,pages-1));
      others.slice(this.targetPage*pageSize,(this.targetPage+1)*pageSize).forEach((player,index)=>{
        const col=index%2,row=Math.floor(index/2),w=(p.w-38)/2,x=p.x+(col?1:-1)*(w/2+3),y=p.top+(this.mobile?150:190)+row*(this.mobile?52:61),member=roomClient.players.find(item=>item.seat===player.seat);
        this.button(x,y,`${player.seat} ${member?.nickname??''}\n${money(player.cash)}`,()=>roomClient.dispatch('chooseCoInvestor',{seat:player.seat}),w,this.mobile?46:54,player.cash>=s.coInvest.cost);
      });
      if(pages>1){
        this.button(p.x-p.w*.22,p.bottom-20,'上一頁',()=>{this.targetPage=(this.targetPage+pages-1)%pages;this.render();},p.w*.4,40,true,0x3d5d78,false);
        this.button(p.x+p.w*.22,p.bottom-20,`下一頁 ${this.targetPage+1}/${pages}`,()=>{this.targetPage=(this.targetPage+1)%pages;this.render();},p.w*.4,40,true,0x3d5d78,false);
      }
      return;
    }
    if(s.phase==='coInvest'){const c=s.coInvest;this.panelBody(p,`${s.players[c.targetIndex].seat}：是否共同投資？`,`基金共同管理人 ${c.key} 方案。投資方需付 ${money(c.cost)}，下回合被動收益 ${money(c.investorPassive)}；兼職方收益 ${money(c.managerPassive)}。`);this.twoButtons(p,[{label:'同意投資',run:()=>this.resolveCoInvest(true)},{label:'不投資',run:()=>this.resolveCoInvest(false)}],p.bottom-25);return;}
    if(s.phase==='receipt'){this.panelBody(p,s.receipt.title,s.receipt.text);this.bottomButton(p,s.queue.length?'處理下一張牌':'完成格位事件',()=>this.advanceReceipt());return;}
    if(s.phase==='investIdle'){
      this.panelBody(p,`${me.seat}：投資階段`,`本回合已抽 ${me.investDraws}/${MAX_INVESTMENT_DRAWS} 張。每次先選類別，再隨機抽 1 張；同一玩家本回合不能重複選同類。買不起或放棄也消耗次數。`,this.mobile?10:13);
      const cats=['stock','property','venture','metal','forex','crypto'];cats.forEach((cat,i)=>{const col=i%2,row=Math.floor(i/2),bw=(p.w-38)/2,x=p.x+(col?1:-1)*(bw/2+3),y=p.top+(this.mobile?150:190)+row*unit;const issue=canDrawInvestment({phase:s.phase,player:me,category:cat,round:s.round,unusedCards:unusedAssets(s.round,s.usedAssets)});this.button(x,y,`${ICON[cat]} ${LABEL[cat]}`,()=>this.drawAsset(cat),bw,this.mobile?37:44,!issue);});
      this.bottomButton(p,roomClient.enabled?'下一步・結束我的投資':'完成我的投資',()=>this.finishInvest(),true,0x3d5d78);return;
    }
    if(s.phase==='offer'){const a=s.offer,afford=me.cash>=a.price;this.panelBody(p,`🪙 ${a.id}｜${a.name}`,`${LABEL[a.category]} · 買入價 ${money(a.price)}\n目前現金 ${money(me.cash)}\n這張卡抽出後已離開牌堆。${afford?'可買入或放棄。':'現金不足，這次抽牌仍會消耗。'}`);if(afford)this.twoButtons(p,[{label:'買入',run:()=>this.resolveOffer(true)},{label:'放棄',run:()=>this.resolveOffer(false)}],p.bottom-25);else this.bottomButton(p,'資金不足，機會消耗',()=>this.resolveOffer(false));return;}
    if(s.phase==='marketReady'){const d=s.players[s.drawer];this.panelBody(p,'全員投資完成',`目前以現金＋持有資產現價比較，${d.seat} 資產最高，負責抽市場事件。同額時暫按 A 優先；正式同分規則尚待核對。`);this.bottomButton(p,`🌍 ${d.seat} 翻開市場事件`,()=>this.drawMarket());return;}
    if(s.phase==='marketReveal'){const e=s.event;this.panelBody(p,`🌍 ${e.id}｜${e.title}`,`${e.region}市場事件已由 ${s.players[s.drawer].seat} 翻開。全員共同看見同一張事件牌，約 6 秒後由房間伺服器一次結算。`);if(!roomClient.enabled)this.bottomButton(p,'套用事件並結算',()=>this.settle());return;}
    if(s.phase==='summary'){const summary=s.players.map(q=>`${q.seat} ${careerName(q)}：淨資產 ${money(netWorth(q.cash,q.holdings,q.debt))}\n持有 ${money(q.holdings.reduce((a,h)=>a+h.price,0))}｜負債 ${money(q.debt)}｜下回合預定被動收入 ${money(q.pendingPassive)}`).join('\n\n');this.panelBody(p,`第 ${s.round} 回合完成`,`${s.event.id} ${s.event.title}\n\n${summary}`,this.mobile?12:15);if(!roomClient.enabled)this.bottomButton(p,s.round<5?'進入下一回合':'重新開局',()=>this.nextRound());else if(s.round===5)this.bottomButton(p,'重新開局',()=>this.restart());return;}
    if(s.phase==='hostReview'){this.panelBody(p,'需主持人確認轉職',`${s.players.filter(q=>q.pendingCareerChange).map(q=>`${q.seat}：${q.pendingCareerChange}`).join('\n')}\n來源卡牌寫了下回合轉職，但目前可讀的六職業收入池不足以安全自動代入。這條路徑停在本回合結算。`,this.mobile?10:13);this.bottomButton(p,'重新開局',()=>this.restart());}
  }
  swapStarts(){[this.s.players[0].position,this.s.players[1].position]=[this.s.players[1].position,this.s.players[0].position];this.render();}
  restart(){this.reset();this.render();}
  animateRemoteRoll(roll){if(!roll?.path?.length||!this.board)return;const color=roll.seat==='A'?COLOR.orange:COLOR.blue,start=this.tilePoint(roll.from),r=this.mobile?7:11,marker=this.add.circle(start.x,start.y,r,COLOR.gold).setStrokeStyle(2,color).setDepth(100);let i=0;const step=()=>{if(i===roll.path.length){marker.destroy();return;}const pt=this.tilePoint(roll.path[i++]);this.tweens.add({targets:marker,x:pt.x,y:pt.y,duration:170,ease:'Sine.easeInOut',onComplete:step});};step();}
  chooseCareer(id){if(!legalPhaseAction(this.s.phase,'setup'))return;const s=this.s,p=s.players[s.setupIndex],role=CAREERS.find(c=>c.id===id);if(!role||s.players[1-s.setupIndex].career?.id===id)return;p.career=role;p.cash=role.initialCash;p.debt=role.initialDebt;if(s.setupIndex===0)s.setupIndex=1;else this.startRound();this.render();}
  startRound(){const s=this.s;for(const p of s.players){p.investDraws=0;p.investCategories=new Set();p.careerDraws=0;p.generalDraws=0;for(const h of p.holdings.filter(h=>h.recoverNext)){p.cash+=h.price;}p.holdings=p.holdings.filter(h=>!h.recoverNext);for(const f of p.future)p.cash+=amount(f.income)-amount(f.expense);p.future=[];p.cash+=p.pendingPassive;p.pendingPassive=0;const repayment=getBaseRepayment(p.career,s.round);p.income=drawRoundIncome(p.career);p.cash+=p.income-p.career.fixedExpense-repayment.payment;p.debt=repayment.debtAfter;}
    s.turn=0;s.phase='roll';s.note=`第 ${s.round} 回合收入已為兩位玩家入帳。`;}
  roll(){if(!legalPhaseAction(this.s.phase,'roll'))return;const s=this.s,p=this.p(),forced=window.__duelDice?.shift?.(),die=Number.isInteger(forced)&&forced>=1&&forced<=6?forced:1+Math.floor(Math.random()*6),path=traversedTiles(p.position,die,BOARD.length);s.busy=true;s.note=`${p.seat} 擲出 ${die} 點，棋子逐格前進。`;this.render();const from=this.tilePoint(p.position),marker=this.add.circle(from.x,from.y,this.mobile?8:12,COLOR.orange).setDepth(100);let step=0;const advance=()=>{if(step===path.length){marker.destroy();p.position=path.at(-1);s.queue=[];for(const n of path)if(BOARD[n].type==='lucky')s.queue.push({kind:'lucky',playerIndex:s.turn});s.queue.push(...landingFateQueue(BOARD[p.position],s.turn,p.careerDraws,p.generalDraws));s.phase='deck';s.busy=false;s.note=`${p.seat} 抵達第 ${p.position} 格，待處理 ${s.queue.length} 張牌。`;this.render();return;}const point=this.tilePoint(path[step++]);this.tweens.add({targets:marker,x:point.x,y:point.y,duration:155,ease:'Sine.easeInOut',onComplete:advance});};advance();}
  takeDeck(kind){const s=this.s;if(!legalPhaseAction(s.phase,'deck'))return;const index=s.queue.findIndex(q=>q.kind===kind);if(index<0)return;s.queue.splice(index,1);if(kind==='general'&&netWorth(this.p().cash,this.p().holdings,this.p().debt)>=5000000){s.phase='generalChoice';this.render();return;}this.reveal(kind,kind==='general'?false:null);}
  revealGeneral(extreme){if(!legalPhaseAction(this.s.phase,'generalChoice'))return;this.reveal('general',extreme);}
  reveal(kind,extreme){const s=this.s,p=this.p();let rows;if(kind==='lucky')rows=[choose(CARD_SNAPSHOT.lucky)];else if(kind==='career'){const pool=JOBS[CAREER_KEY[p.career.id]],unused=pool.filter(group=>!p.usedCareers.has(root(group[0].id)));rows=choose(unused.length?unused:pool);p.usedCareers.add(root(rows[0].id));p.careerDraws++;}else{rows=choose(extreme?EXTREME:NORMAL);p.generalDraws++;}s.current={kind,rows};s.phase='reveal';s.flip=true;this.render();}
  variantLabel(row){const tail=row.id.replace(root(row.id),'').replace(/^-/,'');return tail?`${tail} ${row.title.replace(/.*\((.*?)\).*/,'$1')}`.slice(0,17):row.title.slice(0,17);}
  variantAffordable(row){const id=root(row.id),p=this.p(),others=this.s.players.filter(player=>player!==p);if(id==='D001'&&/-[ABC]$/.test(row.id)){const cost={A:1000000,B:300000,C:100000}[row.id.at(-1)];return p.cash>=cost;}if(id==='D002'&&/[ABC]兼職$/.test(row.id)){const cost={A:1000000,B:300000,C:100000}[row.id.match(/[ABC](?=兼職$)/)[0]];return others.some(other=>other.cash>=cost);}if(['DA003','DA004','DB003','DB004'].includes(id)&&!row.id.includes('不投資'))return p.cash+amount(row.currentIncome)>=amount(row.currentExpense);return true;}
  applyCard(row){const s=this.s;if(!legalPhaseAction(s.phase,'reveal')||!s.current.rows.includes(row)||!this.variantAffordable(row))return;const p=this.p(),id=root(row.id),before=p.cash;if(id==='D001'&&/-[ABC]$/.test(row.id)){const key=row.id.at(-1),[cost,rate]={A:[1000000,.106],B:[300000,.103],C:[100000,.102]}[key];p.cash-=cost;p.holdings.push({id:row.id,name:row.title,category:'special',price:cost,passiveRate:rate,bought:s.round,recoverNext:true});}
    else if(id==='D002'&&/[ABC]兼職$/.test(row.id)){const key=row.id.match(/[ABC](?=兼職$)/)[0],[cost,investorRate,managerRate]={A:[1000000,.096,.01],B:[300000,.09,.013],C:[100000,.084,.018]}[key];s.coInvest={key,cost,investorPassive:cost*investorRate,managerPassive:cost*managerRate,row};s.phase='coInvest';this.render();return;}
    else{const income=amount(row.currentIncome),expense=amount(row.currentExpense),special=['DA003','DA004','DB003','DB004'].includes(id)&&!row.id.includes('不投資');p.cash+=income-expense;if(special)p.holdings.push({id:row.id,name:row.title,category:'special',price:expense,passiveRate:expense?amount(row.passiveIncome)/expense:0,bought:s.round,recoverNext:true});else if(row.passiveIncome)p.extraPassive+=amount(row.passiveIncome);if(row.futureIncome||row.futureExpense)p.future.push({income:row.futureIncome,expense:row.futureExpense});if(/轉職/.test(row.title)&&/接受/.test(row.title))p.pendingCareerChange=row.description;}
    this.receipt(row,afterDelta(p.cash,before));}
  resolveCoInvest(agreed){const s=this.s;if(!legalPhaseAction(s.phase,'coInvest'))return;const c=s.coInvest,p=this.p(),other=s.players[1-s.turn];if(agreed&&other.cash>=c.cost){other.cash-=c.cost;other.holdings.push({id:c.row.id,name:`${c.row.title} 投資方`,category:'special',price:c.cost,passiveRate:c.investorPassive/c.cost,bought:s.round,recoverNext:true});p.extraPassive+=c.managerPassive;}this.receipt(c.row,agreed?`${other.seat} 支出 ${money(c.cost)}；雙方下回合收益已排定。`:'另一位玩家未投資，本事件沒有金額效果。');s.coInvest=null;}
  receipt(row,delta){const s=this.s;s.receipt={title:`${row.id} ${row.title}`,text:`${delta}\n${this.p().seat} 目前現金 ${money(this.p().cash)}。${row.futureIncome||row.futureExpense?' 下回合效果已記錄。':''}`};s.phase='receipt';this.render();}
  advanceReceipt(){if(!legalPhaseAction(this.s.phase,'receipt'))return;this.s.phase='deck';this.render();}
  finishFate(){const s=this.s;if(!legalPhaseAction(s.phase,'deck')||s.queue.length)return;if(s.turn===0){s.turn=1;s.phase='roll';}else{s.turn=0;s.phase='investIdle';}this.render();}
  drawAsset(category){const s=this.s,p=this.p(),available=unusedAssets(s.round,s.usedAssets),result=drawInvestmentCard({phase:s.phase,player:p,category,round:s.round,unusedCards:available});if(result.issue){s.note=result.issue;this.render();return;}s.offer=result.card;s.usedAssets.add(result.card.id);s.phase='offer';this.render();}
  resolveOffer(buy){const s=this.s;if(!legalPhaseAction(s.phase,'offer')||!s.offer)return;const p=this.p(),a=s.offer;if(buy&&p.cash<a.price)return;if(buy){p.cash-=a.price;p.holdings.push({id:a.id,name:a.name,category:a.category,price:a.price,bought:s.round});}s.note=`${p.seat} ${buy?'買入':'放棄'} ${a.id}；本回合已抽 ${p.investDraws}/3 張。`;s.offer=null;s.phase='investIdle';this.render();}
  finishInvest(){const s=this.s;if(!legalPhaseAction(s.phase,'investIdle'))return;if(s.turn===0)s.turn=1;else{s.turn=0;s.drawer=marketDrawerIndex(s.players);s.phase='marketReady';}this.render();}
  drawMarket(){const s=this.s;if(!legalPhaseAction(s.phase,'marketReady'))return;s.event=drawMarketEvent(s.usedEvents);s.usedEvents.add(s.event.id);s.returns=drawBaseReturns(s.round);s.phase='marketReveal';this.render();}
  settle(){const s=this.s;if(!legalPhaseAction(s.phase,'marketReveal'))return;for(const p of s.players){const result=applyMarketEvent(p.holdings,s.returns,s.event);p.holdings=result.holdings;p.pendingPassive=pendingPassiveIncome(p.holdings,result.returns,s.round)+p.extraPassive;p.extraPassive=0;}s.phase='summary';this.render();}
  nextRound(){const s=this.s;if(!legalPhaseAction(s.phase,'summary'))return;if(s.round===5){this.reset();this.render();return;}if(s.players.some(p=>p.pendingCareerChange)){s.phase='hostReview';this.render();return;}s.round++;this.startRound();this.render();}
}
function afterDelta(after,before){const delta=after-before;return `當回合現金變化 ${signed(delta)}。`;}
if(roomClient.enabled){
  const calls={chooseCareer:id=>['chooseCareer',{id}],swapStarts:()=>['swapStarts',{}],roll:()=>['roll',{}],takeDeck:kind=>['takeDeck',{kind}],revealGeneral:extreme=>['revealGeneral',{extreme}],applyCard:row=>['applyCard',{id:row.id}],resolveCoInvest:agreed=>['resolveCoInvest',{agreed}],advanceReceipt:()=>['advanceReceipt',{}],finishFate:()=>['finishFate',{}],drawAsset:category=>['drawAsset',{category}],resolveOffer:buy=>['resolveOffer',{buy}],finishInvest:()=>['nextStep',{}],drawMarket:()=>['drawMarket',{}],settle:()=>['settle',{}],nextRound:()=>['nextRound',{}],restart:()=>['restart',{}]};
  for(const [method,translate] of Object.entries(calls)) OfficialDuel.prototype[method]=function(...args){const [type,payload]=translate(...args);roomClient.dispatch(type,payload);};
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:720,resolution:Math.min(window.devicePixelRatio||1,2),backgroundColor:'#07182b',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,pixelArt:false},scene:[OfficialDuel]});
