import { CAREERS, INCOME_POOLS, drawCandidate, drawBaseReturns } from '../official-five.mjs';
import { CARD_SNAPSHOT } from '../cards-snapshot.mjs';
import { BOARD, BOARD_NAMES } from '../board-data.mjs';
import { unusedAssets, applyMarketEvent, drawMarketEvent, pendingPassiveIncome, netWorth, marketDrawerIndex, traversedTiles } from './rules.mjs';
import { landingFateQueue, drawInvestmentCard } from './turn-state.mjs';
import { gameEpoch, gameKey } from './game-session.mjs';

const amount = value => Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
const root = id => String(id).match(/^(?:DA|DB|D|JA|JB|JC|JD|JE|JF|L)\d{3}/)?.[0] ?? id;
const pick = (rows, random) => rows[Math.floor(random() * rows.length)];
function groups(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (row.id.endsWith('特殊事件')) continue;
    const id = root(row.id);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(row);
  }
  return [...byId.values()];
}
const JOBS = Object.fromEntries(Object.entries(CARD_SNAPSHOT.jobs).map(([id, rows]) => [id, groups(rows)]));
const NORMAL = groups(CARD_SNAPSHOT.general.filter(row => !row.id.startsWith('DB') && !(root(row.id)==='D002'&&row.id.endsWith('投資'))));
const EXTREME = groups(CARD_SNAPSHOT.general.filter(row => row.id.startsWith('DB')));
const CAREER_KEY = { founder:'JA', freelancer:'JB', engineer:'JC', doctor:'JD', sales:'JE', assistant:'JF' };
// Verified against 轉職規則設定 and 回合收入抽籤 in the host workbook.
const incomeRange=(first,last)=>Array.from({length:(last-first)/100000+1},(_,index)=>first+index*100000);
const TRANSITIONS={
  'JC019-1':incomeRange(1200000,2500000),'JC020-1':incomeRange(1000000,2800000),
  'JD019-1':incomeRange(1800000,3000000),'JD020-1':incomeRange(1400000,3200000),
  'JE019-1':incomeRange(1000000,2000000),'JE020-1':incomeRange(1200000,2500000),
  'JF019-1':incomeRange(1000000,1800000),'JF020-1':incomeRange(1200000,2200000),
};
const TIMEOUT_SKIP_OPTIONS={D001:'D001-不投資',D002:'D002-不兼職',DA003:'DA003-不投資',DA004:'DA004-不投資',DB003:'DB003-不投資',DB004:'DB004-不投資',
  JC019:'JC019-2',JC020:'JC020-2',JD019:'JD019-2',JD020:'JD020-2',JE019:'JE019-2',JE020:'JE020-2',JF019:'JF019-2',JF020:'JF020-2'};
const money = n => '$' + Math.round(n || 0).toLocaleString('zh-TW');
const cashEffect=(delta,current)=>`${delta<0?`現金減少 ${money(-delta)}`:delta>0?`現金增加 ${money(delta)}`:'現金不變'}；目前 ${money(current)}`;
const player = (seat, position) => ({ seat, position, career:null, activeIncomePool:null, cash:0, debt:0, holdings:[], income:0, passiveIncome:0, pendingPassive:0, extraPassive:0, future:[], pendingCareerChange:null, investDraws:0, investCategories:new Set(), careerDraws:0, generalDraws:0, usedCareers:new Set(), loanDecision:null });
const fail = message => { throw new Error(message); };

export class RoomEngine {
  constructor(random = Math.random, playerCount = 2, lobby = false) { this.random = random; this.playerCount = playerCount; this.lobby = lobby; this.reset(); }
  static fromSnapshot(snapshot,random=Math.random){
    // Restoring a game must not initialize another game or consume its random stream.
    const engine=Object.create(RoomEngine.prototype);engine.random=random;engine.playerCount=snapshot.players.length;engine.lobby=snapshot.phase==='lobby';engine.s=snapshot;
    engine.s.gameEpoch=gameEpoch(snapshot);
    if(!Number.isSafeInteger(engine.s.gameEpoch)||engine.s.gameEpoch<1)fail('無效的局次識別');
    for(const p of engine.s.players){p.investCategories=new Set(p.investCategories);p.usedCareers=new Set(p.usedCareers);}
    engine.s.usedAssets=new Set(engine.s.usedAssets);engine.s.usedEvents=new Set(engine.s.usedEvents);
    return engine;
  }
  reset() {
    const count=this.playerCount;
    const epoch=this.s?gameEpoch(this.s)+1:1;
    if(!Number.isSafeInteger(epoch))fail('局次識別已達上限，請建立新房間');
    this.s = { round:1, phase:this.lobby?'lobby':'setup', setupIndex:0, incomeIndex:0, incomeReveal:null, players:Array.from({length:count},(_,index)=>player(String.fromCharCode(65+index),index<Math.ceil(count/2)?0:10)), turn:0, queue:[], cards:[], current:null, offer:null, receipt:null, event:null, returns:null, drawer:0, usedAssets:new Set(), usedEvents:new Set(), note:'玩家開局隨機分往國際機場與環球郵輪港。', busy:false, lastRoll:null, history:[], financeLog:[], roundStartTotals:[] };
    this.s.gameEpoch=epoch;
    if(!this.lobby)this.beginGame();
  }
  startLobby() {
    if (this.s.phase !== 'lobby') fail('遊戲已開始');
    this.beginGame();
  }
  beginGame() {
    const order = this.s.players.map((_, index) => index);
    for (let i=order.length-1;i>0;i--) {
      const j=Math.floor(this.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    const rightCount=Math.floor(order.length/2)+(order.length%2?Math.floor(this.random()*2):0);
    order.forEach((index,rank)=>{this.s.players[index].position=rank<rightCount?0:10;});
    this.lobby=false;
    this.s.careerPause=true;
    this.s.phase='setup';
    this.s.note='玩家已隨機分到國際機場與環球郵輪港；請依序抽取職業卡。';
  }
  snapshot() { return JSON.parse(JSON.stringify(this.s, (_key, value) => value instanceof Set ? [...value] : value)); }
  record(seat,description){this.s.history??=[];this.s.history.push({round:this.s.round,seat,description});}
  financeState(){return this.s.players.map(p=>({seat:p.seat,cash:p.cash,debt:p.debt,assets:p.holdings.reduce((sum,h)=>sum+(h.price||0),0),passiveNext:p.pendingPassive,passiveUnsettled:p.extraPassive}));}
  recordFinance(kind,before,detail={}){this.s.financeLog??=[];const after=this.financeState();for(let i=0;i<after.length;i++){const a=after[i],b=before[i];if(!b||a.cash!==b.cash||a.debt!==b.debt||a.assets!==b.assets||a.passiveNext!==b.passiveNext||a.passiveUnsettled!==b.passiveUnsettled)this.s.financeLog.push({round:this.s.round,kind,seat:a.seat,before:b,after:a,detail});}}
  me() { return this.s.players[this.s.turn]; }
  actor() {
    const s = this.s;
    if (s.phase === 'lobby') return 0;
    if (s.phase === 'setup'||s.phase === 'careerResult') return s.setupIndex;
    if (s.phase === 'income'||s.phase==='incomeResult') return s.incomeIndex;
    if (s.phase === 'coInvestTarget') return s.turn;
    if (s.phase === 'coInvest') return s.coInvest.targetIndex;
    if (s.phase === 'marketReady') return s.drawer;
    if (['marketReveal', 'summary', 'hostReview'].includes(s.phase)) return 0;
    return s.turn;
  }
  action(seat, type, payload = {}) {
    const s = this.s;
    const beforeFinance=this.financeState();
    const coInvestBefore=s.coInvest?{key:s.coInvest.key,target:s.players[s.coInvest.targetIndex]?.seat,cost:s.coInvest.cost,investorNext:s.coInvest.investorPassive,managerNext:s.coInvest.managerPassive}:null;
    const index = s.players.findIndex(p=>p.seat===seat);
    if (index !== this.actor() && !(s.phase==='lobby' && type==='start')) fail('目前不是你的操作階段');
    const allowed = {
      lobby:['start'], setup:['drawCareer','chooseCareer'], careerResult:['nextCareer'], income:['claimIncome'], incomeResult:['nextIncome'], roll:['roll'], deck:['drawAll','drawNext'], revealGroup:['chooseCard','nextStep'], coInvestTarget:['chooseCoInvestor'], coInvest:['resolveCoInvest'], loanDecision:['decideLoan'], investIdle:['drawAsset','sellHolding','nextStep'], offer:['resolveOffer'], marketReady:['drawMarket'], marketReveal:[], summary:s.round===5?['restart']:[], hostReview:['restart'],
    };
    if (!allowed[s.phase]?.includes(type)) fail('目前階段不能執行此動作');
    switch (type) {
      case 'start': this.startLobby();break;
      case 'chooseCareer': this.chooseCareer(payload.id); break;
      case 'drawCareer': this.drawCareer(); break;
      case 'nextCareer': this.nextCareer(); break;
      case 'claimIncome': this.claimIncome(); break;
      case 'nextIncome': this.nextIncome(); break;
      case 'roll': this.roll(); break;
      case 'drawAll': this.drawAll(payload.extreme === true); break;
      case 'drawNext': this.drawNext(payload.extreme === true); break;
      case 'chooseCard': this.chooseCard(payload.cardIndex,payload.id); break;
      case 'nextStep': if(s.phase==='revealGroup')this.advanceGroup();else this.finishInvest();break;
      case 'chooseCoInvestor': this.chooseCoInvestor(payload.seat);break;
      case 'resolveCoInvest': this.resolveCoInvest(payload.agreed === true); break;
      case 'decideLoan': this.decideLoan(payload.kind,payload.amount); break;
      case 'drawAsset': this.drawAsset(payload.category); break;
      case 'sellHolding': this.sellHolding(payload.id); break;
      case 'resolveOffer': this.resolveOffer(payload.buy === true); break;
      case 'drawMarket': this.drawMarket(); break;
      case 'settle': this.settle(); break;
      case 'nextRound': this.nextRound(); break;
      case 'restart': this.reset(); break;
    }
    if(type==='chooseCareer'||type==='drawCareer')this.record(seat,`${type==='drawCareer'?'抽得':'選擇'} ${s.players[index].career.name}`);
    if(type==='chooseCard')this.record(seat,`命運選擇 ${payload.id}`);
    if(type==='resolveCoInvest')this.record(seat,payload.agreed?'接受共同投資':'拒絕共同投資');
    if(type==='resolveOffer')this.record(seat,s.note);
    if(type==='drawMarket')this.record(seat,`翻開市場事件 ${s.event.id}`);
    if(type!=='claimIncome'&&type!=='restart')this.recordFinance(type,beforeFinance,{choice:type==='decideLoan'?payload.kind:type==='resolveOffer'?payload.buy:type==='chooseCard'?payload.id:type==='resolveCoInvest'?payload.agreed:null,...(type==='resolveCoInvest'?{coInvest:coInvestBefore}:{}),...(type==='sellHolding'?{holdingId:payload.id}:{})});
    return this.snapshot();
  }
  chooseCareer(id) {
    const s = this.s, p = s.players[s.setupIndex], role = CAREERS.find(c => c.id === id);
    if (!role || s.players.filter(q=>q.career?.id===id).length>=2) fail('職業名額已滿');
    p.career = role; p.cash = role.initialCash; p.debt = role.initialDebt;
    s.lastCareerDraw={seat:p.seat,careerId:role.id,drawNumber:s.setupIndex+1};
    if(s.careerPause){s.phase='careerResult';s.note=`${p.seat} 抽得 ${role.name}，確認後繼續。`;}
    else this.nextCareer();
  }
  nextCareer(){const s=this.s;if(s.setupIndex<s.players.length-1){s.setupIndex++;s.phase='setup';s.note=`輪到 ${s.players[s.setupIndex].seat} 抽職業卡。`;}else this.startRound();}
  drawCareer(){
    const available=CAREERS.flatMap(role=>Array.from({length:2-this.s.players.filter(player=>player.career?.id===role.id).length},()=>role));
    if(!available.length)fail('職業卡已抽完');
    this.chooseCareer(pick(available,this.random).id);
  }
  startRound() {
    const s = this.s;
    s.roundStartTotals=s.players.map(p=>netWorth(p.cash,p.holdings,p.debt));
    for(const p of s.players){p.investDraws=0;p.investCategories=new Set();p.careerDraws=0;p.generalDraws=0;p.loanDecision=null;}
    s.incomeIndex=0;s.incomeReveal=null;s.turn=0;s.phase='income';s.note=`第 ${s.round} 回合開始，依序領取收入。`;
  }
  incomePool(p){return p.activeIncomePool?TRANSITIONS[p.activeIncomePool]:INCOME_POOLS[p.career.id];}
  claimIncome(){
    const s=this.s,p=s.players[s.incomeIndex],before=this.financeState(),pool=this.incomePool(p),variable=pool.length>1;
    const recovered=p.holdings.filter(h=>h.recoverNext).reduce((sum,h)=>sum+h.price,0);
    p.cash+=recovered;p.holdings=p.holdings.filter(h=>!h.recoverNext);
    const futureEffects=p.future.map(f=>({income:amount(f.income),expense:amount(f.expense)}));
    const futureNet=p.future.reduce((sum,f)=>sum+amount(f.income)-amount(f.expense),0);
    p.cash+=futureNet;p.future=[];
    p.passiveIncome=p.pendingPassive;p.cash+=p.passiveIncome;p.pendingPassive=0;
    const principalComponent=p.debt/(8-s.round),interestComponent=p.debt*p.career.rate,repayment=principalComponent+interestComponent;
    p.income=variable?drawCandidate(pool,this.random):pool[0];
    p.cash+=p.income-p.career.fixedExpense-repayment;p.debt=Math.max(0,p.debt-repayment);
    s.incomeReveal={seat:p.seat,amount:p.income,source:variable?'抽取':'固定',passiveIncome:p.passiveIncome,fixedExpense:p.career.fixedExpense,repayment,interestComponent,recovered,futureNet,futureEffects};
    s.phase='incomeResult';s.note=`${p.seat} 本回合${variable?'抽得':'領取'}收入 ${money(p.income)}。`;
    this.record(p.seat,`本回合${variable?'抽得':'領取固定'}收入 ${money(p.income)}`);
    this.recordFinance('income',before,{seat:p.seat,source:s.incomeReveal.source,recovered,futureNet,passiveIncome:p.passiveIncome,activeIncome:p.income,fixedExpense:p.career.fixedExpense,principalComponent,interestComponent,repayment});
  }
  nextIncome(){
    const s=this.s;if(s.incomeIndex<s.players.length-1){s.incomeIndex++;s.incomeReveal=null;s.phase='income';s.note=`輪到 ${s.players[s.incomeIndex].seat} 領取本回合收入。`;}
    else{s.incomeReveal=null;s.turn=0;s.phase='roll';s.note=`全員已領取第 ${s.round} 回合收入，開始擲骰。`;}
  }
  roll() {
    const s = this.s, p = this.me(), die = 1 + Math.floor(this.random() * 6);
    const path = traversedTiles(p.position, die, BOARD.length);
    s.lastRoll = { id:gameKey(s,s.round,p.seat,s.turn,p.position,die), seat:p.seat, die, from:p.position, path };
    this.record(p.seat,`擲出 ${die} 點，前進至第 ${path.at(-1)} 格 · ${BOARD_NAMES[path.at(-1)]}`);
    p.position = path.at(-1); s.queue = [];
    for (const n of path) if (BOARD[n].type === 'lucky') s.queue.push({kind:'lucky', playerIndex:s.turn});
    s.queue.push(...landingFateQueue(BOARD[p.position], s.turn, p.careerDraws, p.generalDraws));
    s.cards=[];s.phase = 'deck'; s.note = `${p.seat} 擲出 ${die} 點，抵達第 ${p.position} 格 · ${BOARD_NAMES[p.position]}。`;
    if(!s.queue.length){s.note+=`本格沒有卡牌。`;this.finishFate();}
  }
  drawAll(extreme) {
    const s=this.s,me=this.me(),eligible=netWorth(me.cash,me.holdings,me.debt)>=5000000;
    if(extreme&&!eligible)fail('目前不能抽極限命運牌');
    s.cards.push(...s.queue.map(q=>({kind:q.kind,rows:this.drawRows(q.kind,q.kind==='general'&&extreme),status:'pending',effect:''})));
    s.queue=[];s.phase='revealGroup';
    this.resolveAutomaticCards();
    if(s.phase!=='coInvest'&&s.phase!=='coInvestTarget')s.note=`一次翻開 ${s.cards.length} 張命運牌；需要選擇的卡請先決定。`;
  }
  drawNext(extreme) {
    const s=this.s,me=this.me(),next=s.queue[0];if(!next)fail('沒有待抽卡牌');
    if(extreme&&(next.kind!=='general'||netWorth(me.cash,me.holdings,me.debt)<5000000))fail('目前不能抽極限命運牌');
    s.queue.shift();s.cards.push({kind:next.kind,rows:this.drawRows(next.kind,extreme),status:'pending',effect:''});
    s.phase='revealGroup';this.resolveAutomaticCards();
    if(s.phase==='revealGroup')s.note=`已抽出第 ${s.cards.length} 張；${s.queue.length?`還有 ${s.queue.length} 張待抽。`:'本格卡牌已抽完。'}`;
  }
  resolveAutomaticCards(){
    const s=this.s,me=this.me();
    for(let i=0;i<s.cards.length;i++){
      const card=s.cards[i];if(card.status!=='pending'||card.rows.length!==1)continue;
      const before=me.cash;s.current={kind:card.kind,rows:card.rows};
      this.applyCard(card.rows[0].id);
      if(s.phase==='coInvest'||s.phase==='coInvestTarget'){s.coInvest.cardIndex=i;break;}
      card.status='resolved';card.selectedId=card.rows[0].id;card.cashDelta=me.cash-before;card.effect=cashEffect(card.cashDelta,me.cash);s.phase='revealGroup';s.current=null;
    }
  }
  drawRows(kind,extreme) {
    const p=this.me();let rows;
    if(kind==='lucky')rows=[pick(CARD_SNAPSHOT.lucky,this.random)];
    else if(kind==='career'){
      const pool=JOBS[CAREER_KEY[p.career.id]],unused=pool.filter(g=>!p.usedCareers.has(root(g[0].id)));
      rows=pick(unused.length?unused:pool,this.random);p.usedCareers.add(root(rows[0].id));p.careerDraws++;
    }else if(kind==='general'){rows=pick(extreme?EXTREME:NORMAL,this.random);p.generalDraws++;}
    else fail('未知牌堆');
    return rows;
  }
  chooseCard(index,id){
    const s=this.s,card=s.cards[index];
    if(!Number.isInteger(index)||!card||card.status!=='pending'||card.rows.length<2)fail('此卡不需選擇');
    if(root(id)==='D002'&&String(id).endsWith('投資'))fail('投資方不是抽卡選項');
    const before=this.me().cash;s.current={kind:card.kind,rows:card.rows};this.applyCard(id);
    if(s.phase==='coInvest'||s.phase==='coInvestTarget'){s.coInvest.cardIndex=index;return;}
    card.status='resolved';card.selectedId=id;card.cashDelta=this.me().cash-before;card.effect=cashEffect(card.cashDelta,this.me().cash);s.phase='revealGroup';s.current=null;
  }
  advanceGroup(){
    if(this.s.cards.some(c=>c.status==='pending'))fail('請先完成卡內選擇');
    if(this.s.queue.length){this.s.phase='deck';this.s.note=`已翻開 ${this.s.cards.length} 張，還有 ${this.s.queue.length} 張待抽。`;return;}
    this.finishFate();
  }
  takeDeck(kind) {
    const s = this.s, index = s.queue.findIndex(q => q.kind === kind);
    if (index < 0) fail('沒有這張待抽牌');
    s.queue.splice(index, 1);
    if (kind === 'general' && netWorth(this.me().cash, this.me().holdings, this.me().debt) >= 5000000) s.phase = 'generalChoice';
    else this.reveal(kind, false);
  }
  reveal(kind, extreme) {
    const s = this.s, p = this.me(); let rows;
    if (kind === 'lucky') rows = [pick(CARD_SNAPSHOT.lucky, this.random)];
    else if (kind === 'career') {
      const pool = JOBS[CAREER_KEY[p.career.id]], unused = pool.filter(g => !p.usedCareers.has(root(g[0].id)));
      rows = pick(unused.length ? unused : pool, this.random);
      p.usedCareers.add(root(rows[0].id)); p.careerDraws++;
    } else if (kind === 'general') { rows = pick(extreme ? EXTREME : NORMAL, this.random); p.generalDraws++; }
    else fail('未知牌堆');
    s.current = {kind, rows}; s.phase = 'reveal'; s.flip = true;
  }
  affordable(row) {
    const id = root(row.id), p = this.me(), others = this.s.players.filter(q=>q!==p);
    if (id === 'D001' && /-[ABC]$/.test(row.id)) return p.cash >= {A:1000000,B:300000,C:100000}[row.id.at(-1)];
    if (id === 'D002' && /[ABC]兼職$/.test(row.id)) return others.some(other=>other.cash >= {A:1000000,B:300000,C:100000}[row.id.match(/[ABC](?=兼職$)/)[0]]);
    if (['DA003','DA004','DB003','DB004'].includes(id) && !row.id.includes('不投資')) return p.cash + amount(row.currentIncome) >= amount(row.currentExpense);
    return true;
  }
  applyCard(id) {
    const s = this.s, row = s.current?.rows.find(r => r.id === id);
    if (!row || !this.affordable(row)) fail('卡牌選項不可用');
    const p = this.me(), cardId = root(row.id), before = p.cash;
    const selfEmployed=Boolean(p.activeIncomePool)||['founder','freelancer'].includes(p.career.id);
    if(selfEmployed&&row.description?.includes('此卡無效於自營商')){
      this.receipt(row,'自營商不適用，此卡沒有金額效果。');return;
    }
    if (cardId === 'D001' && /-[ABC]$/.test(row.id)) {
      const key = row.id.at(-1), [cost, rate] = {A:[1000000,.106],B:[300000,.103],C:[100000,.102]}[key];
      p.cash -= cost; p.holdings.push({id:row.id,name:row.title,category:'special',price:cost,passiveRate:rate,bought:s.round,recoverNext:true});
    } else if (cardId === 'D002' && /[ABC]兼職$/.test(row.id)) {
      const key = row.id.match(/[ABC](?=兼職$)/)[0], [cost,investorRate,managerRate] = {A:[1000000,.096,.01],B:[300000,.09,.013],C:[100000,.084,.018]}[key];
      s.coInvest = {key,cost,investorPassive:cost*investorRate,managerPassive:cost*managerRate,row,invitees:[],targetIndex:null,responses:[]};
      s.phase='coInvestTarget';return;
    } else {
      if(String(row.currentIncome).includes('本回合無收入')){p.cash-=p.income;p.income=0;}
      const income = amount(row.currentIncome), expense = amount(row.currentExpense);
      const special = ['DA003','DA004','DB003','DB004'].includes(cardId) && !row.id.includes('不投資');
      p.cash += income - expense;
      if (special) p.holdings.push({id:row.id,name:row.title,category:'special',price:expense,passiveRate:expense?amount(row.passiveIncome)/expense:0,bought:s.round,recoverNext:true});
      else if (row.passiveIncome) p.extraPassive += amount(row.passiveIncome);
      if (row.futureIncome || row.futureExpense) p.future.push({income:row.futureIncome,expense:row.futureExpense});
      if (/轉職/.test(row.title) && /接受/.test(row.title)) p.pendingCareerChange = row.id;
    }
    this.receipt(row, `當回合現金變化 ${money(p.cash - before)}。`);
  }
  chooseCoInvestor(seat){
    const s=this.s,c=s.coInvest,index=s.players.findIndex(p=>p.seat===seat);
    if(!c||index<0||index===s.turn||s.players[index].cash<c.cost)fail('請選擇有足夠現金的其他玩家');
    c.invitees=[index];c.targetIndex=index;s.phase='coInvest';
  }
  resolveCoInvest(agreed) {
    const s = this.s, c = s.coInvest, p = this.me(), other = s.players[c?.targetIndex];
    if (!c) fail('沒有共同投資待決');
    if(agreed&&other.cash<c.cost)fail('投資現金不足');
    if (agreed) {
      other.cash -= c.cost;
      other.holdings.push({id:`D002-${c.key}投資`,name:`基金共同管理人 方案 ${c.key} 投資`,category:'special',price:c.cost,passiveRate:c.investorPassive/c.cost,bought:s.round,recoverNext:true});
      p.extraPassive += c.managerPassive;
    }
    c.responses.push({seat:other.seat,agreed,cost:agreed?c.cost:0,investorPassive:agreed?c.investorPassive:0,managerPassive:agreed?c.managerPassive:0});
    this.record(other.seat,agreed?`接受共同投資，支付 ${money(c.cost)}；下回合預計收益 ${money(c.investorPassive)}`:'拒絕共同投資，沒有金額變化');
    s.note=agreed?`${other.seat} 接受共同投資，雙方下回合收益已排定。`:`${other.seat} 不參與共同投資。`;
    if(c.responses.length<c.invitees.length){c.targetIndex=c.invitees[c.responses.length];return;}
    const accepted=c.responses.filter(response=>response.agreed);
    this.receipt(c.row,accepted.length?`${accepted.length} 位玩家投資；總管理收益 ${money(accepted.length*c.managerPassive)}，下回合領取。`:'沒有玩家投資，沒有管理收益。');
    const card=s.cards[c.cardIndex];if(card){card.status='resolved';card.effect=accepted.length?`${accepted.length} 位投資人參與；下回合管理收益 ${money(accepted.length*c.managerPassive)}`:'沒有人投資；無收入';card.coInvestResponses=c.responses;}
    s.lastCoInvest={round:s.round,manager:p.seat,key:c.key,responses:c.responses};
    s.coInvest=null;s.phase='revealGroup';s.current=null;this.resolveAutomaticCards();
  }
  receipt(row, delta) { this.s.receipt = {title:`${row.id} ${row.title}`,text:`${delta}\n${this.me().seat} 目前現金 ${money(this.me().cash)}。${row.futureIncome || row.futureExpense ? ' 下回合效果已記錄。' : ''}`}; this.s.phase = 'receipt'; }
  finishFate() {
    const s = this.s;
    if (s.queue.length) fail('還有待處理的牌');
    if (s.turn < s.players.length-1) { s.turn++; s.phase = 'roll'; }
    else { s.turn = 0; this.beginInvestmentDecision(); }
  }
  beginInvestmentDecision(){const s=this.s,p=this.me();s.phase='loanDecision';if((s.round===5||this.loanLimit(p)<1)&&(p.cash<1||p.debt<1))this.decideLoan('skip');}
  loanLimit(p=this.me()) {
    // 主持人表的本回合最高信貸金額：職業收入 + 卡牌的未來收入增加額。
    return Math.max(0,Math.floor(p.income+p.future.reduce((total,item)=>total+amount(item.income),0)));
  }
  decideLoan(kind,value=0) {
    const s=this.s,p=this.me(),requested=Number(value);
    if(!['borrow','repay','skip'].includes(kind))fail('請選擇借款、還款或略過');
    if(kind!=='skip'&&(!Number.isSafeInteger(requested)||requested<=0))fail('金額需為正整數');
    if(kind==='borrow'){
      if(s.round===5)fail('第 5 回合不可新增借款');
      if(requested>this.loanLimit(p))fail('借款超過本回合貸款上限');
      p.cash+=requested;p.debt+=requested;
    }else if(kind==='repay'){
      if(requested>p.cash)fail('還款超過目前現金');
      if(requested>p.debt)fail('還款超過目前負債');
      p.cash-=requested;p.debt-=requested;
    }
    p.loanDecision={round:s.round,kind,amount:kind==='skip'?0:requested};
    this.record(p.seat,kind==='borrow'?`投資前借款 ${money(requested)}`:kind==='repay'?`投資前提前還款 ${money(requested)}`:'投資前選擇保留現金');
    s.note=`${p.seat} 已完成投資前的借貸選擇。`;
    s.phase='investIdle';
  }
  drawAsset(category) {
    const s = this.s, result = drawInvestmentCard({phase:s.phase,player:this.me(),category,round:s.round,unusedCards:unusedAssets(s.round,s.usedAssets),random:this.random});
    if (result.issue) fail(result.issue);
    s.offer = result.card; s.usedAssets.add(result.card.id); s.phase = 'offer';
  }
  resolveOffer(buy) {
    const s = this.s, p = this.me(), offer = s.offer;
    if (!offer) fail('沒有待處理的投資機會');
    if (buy && p.cash < offer.price) fail('現金不足');
    if (buy) { p.cash -= offer.price; p.holdings.push({id:offer.id,name:offer.name,category:offer.category,purchasePrice:offer.price,price:offer.price,bought:s.round}); }
    s.note = `${p.seat} ${buy?'買入':'放棄'} ${offer.id}；本回合已抽 ${p.investDraws}/3 張。`;
    s.offer = null; s.phase = 'investIdle';
    if(p.investDraws>=3)this.finishInvest();
  }
  sellHolding(id){
    const s=this.s,p=this.me(),index=p.holdings.findIndex(holding=>holding.id===id&&holding.category!=='special'&&!holding.recoverNext);
    if(index<0)fail('該投資已不在可賣清單');
    const holding=p.holdings[index],salePrice=holding.price;
    if(!Number.isFinite(salePrice)||salePrice<0)fail('目前市值異常，暫不可賣出');
    p.holdings.splice(index,1);
    p.cash+=salePrice;s.note=`${p.seat} 依目前市值 ${money(salePrice)} 賣出 ${holding.name}。`;
    this.record(p.seat,`賣出 ${holding.name}：入帳 ${money(salePrice)}，此後不再取得該標的收益`);
  }
  finishInvest() {
    const s = this.s;
    if (s.turn < s.players.length-1) {s.turn++;this.beginInvestmentDecision();}
    else { s.turn = 0; s.drawer = marketDrawerIndex(s.players); s.phase = 'marketReady'; }
  }
  expireInvestment(){
    const s=this.s,seat=s.players[s.turn].seat;
    if(s.phase==='offer'){this.resolveOffer(false);this.record(seat,'投資時間結束：未買入待決卡片');return true;}
    if(s.phase==='investIdle'){this.finishInvest();this.record(seat,'投資時間結束：未再抽牌，結束投資');return true;}
    if(s.phase==='loanDecision'){this.decideLoan('skip');this.record(seat,'借貸時間結束：系統略過');return true;}
    if(s.phase==='coInvestTarget'){
      const c=s.coInvest,card=s.cards[c.cardIndex];
      if(card){card.status='resolved';card.effect='未指定投資人；無收入';card.coInvestResponses=[];}
      s.lastCoInvest={round:s.round,manager:seat,key:c.key,responses:[]};
      s.coInvest=null;s.phase='revealGroup';s.current=null;s.note='邀請時間結束；這張卡未成立投資。';
      this.record(seat,'邀請時間結束：未指定共同投資玩家');this.resolveAutomaticCards();return true;
    }
    if(s.phase==='coInvest'){this.resolveCoInvest(false);this.record(seat,'回覆時間結束：未參與共同投資');return true;}
    return false;
  }
  expireFateChoices(){
    const s=this.s;if(s.phase!=='revealGroup')return false;
    const pending=s.cards.map((card,index)=>({card,index})).filter(({card})=>card.status==='pending');
    const choices=pending.map(({card,index})=>({index,id:TIMEOUT_SKIP_OPTIONS[root(card.rows[0]?.id)]}));
    if(choices.some(({index,id})=>!id||!s.cards[index].rows.some(row=>row.id===id)))return false;
    for(const {index,id} of choices){this.chooseCard(index,id);this.record(s.players[s.turn].seat,`選牌逾時：系統選擇 ${id}`);}
    this.advanceGroup();return true;
  }
  drawMarket() { const s = this.s; s.event = drawMarketEvent(s.usedEvents, this.random); s.usedEvents.add(s.event.id); s.returns = drawBaseReturns(s.round, this.random); s.phase = 'marketReveal'; }
  settle() {
    const s = this.s;
    const before=this.financeState();
    for (const p of s.players) {
      const result = applyMarketEvent(p.holdings, s.returns, s.event);
      p.holdings = result.holdings;
      p.pendingPassive = pendingPassiveIncome(p.holdings, result.returns, s.round) + p.extraPassive;
      p.extraPassive = 0;
    }
    this.record('系統',`市場 ${s.event.id} 已結算；第 ${s.round} 回合排行更新`);
    this.recordFinance('marketSettle',before,{event:s.event.id,returns:s.returns});
    s.phase = 'summary';
  }
  nextRound() {
    const s = this.s;
    if (s.round === 5) { this.reset(); return; }
    for(const p of s.players)if(p.pendingCareerChange){
      if(!TRANSITIONS[p.pendingCareerChange]){s.phase='hostReview';return;}
      p.activeIncomePool=p.pendingCareerChange;p.pendingCareerChange=null;
    }
    s.round++; this.startRound();
  }
}
