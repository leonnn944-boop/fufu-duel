import {gameCardCopy} from './card-game-copy.mjs';
// Local design review fixtures. These are never loaded by the normal game.
import {RoomEngine} from './room-engine.mjs';
import {CAREERS} from '../official-five.mjs';
import {CARD_SNAPSHOT} from '../cards-snapshot.mjs';
import {ASSET_CARDS,MARKET_EVENTS} from '../market-data.mjs';
export function cardReviewCases(){
 const make=(career='assistant')=>{const e=new RoomEngine(()=>.5,2,false);e.s.round=3;e.s.players.forEach((p,i)=>Object.assign(p,{career:CAREERS.find(c=>c.id===(i?'engineer':career)),cash:4000000,debt:200000,income:0,position:i?10:0}));return e;};
 const cases=[];
 for(const c of CAREERS){const e=make(c.id);e.s.phase='careerResult';e.s.lastCareerDraw={seat:'A',careerId:c.id};cases.push({id:'career-'+c.id,title:'職業 · '+c.name,state:e.snapshot()});}
 for(const c of ['assistant','freelancer']){const e=make(c);e.s.phase='income';const title=c==='assistant'?'固定薪資':'浮動收入';cases.push({id:'income-'+(c==='assistant'?'fixed':'variable'),title:title+' · 領取前',state:e.snapshot()});e.action('A','claimIncome');cases.push({id:'income-'+(c==='assistant'?'fixed':'variable')+'-result',title:title+' · 結算',state:e.snapshot()});}
 const all=[...Object.values(CARD_SNAPSHOT.jobs).flat(),...CARD_SNAPSHOT.general,...CARD_SNAPSHOT.lucky];
 const resolved=(kind,id)=>{const e=make(kind==='career'?({JA:'founder',JB:'freelancer',JC:'engineer',JD:'doctor',JE:'sales',JF:'assistant'}[id.slice(0,2)]||'engineer'):'assistant'),row=all.find(r=>r.id===id),cash=e.me().cash;if(id==='JA030')e.me().income=2000000;if(id==='JC029')e.me().income=1800000;e.s.current={kind,rows:[row]};e.s.phase='reveal';e.applyCard(id);e.s.phase='revealGroup';e.s.cards=[{kind,rows:[row],status:'resolved',selectedId:id,cashDelta:e.me().cash-cash,effect:e.s.receipt?.effect}];return e.snapshot();};
 for(const [kind,id] of [['career','JC001'],['general','DA005'],['lucky','L001'],['general','DA049'],['general','DB040']]){const state=resolved(kind,id);cases.push({id:'art-'+id,title:({career:'職業命運',general:'一般命運',lucky:'小確幸'})[kind]+' · '+state.cards[0].rows[0].title,state});}
 for(const id of ['JC019','JC020']){const e=make('engineer');e.s.phase='revealGroup';e.s.cards=[{kind:'career',rows:all.filter(r=>r.id.startsWith(id+'-')),status:'pending'}];cases.push({id:'art-'+id,title:id==='JC019'?'合夥創業 · 選擇前':'軟體創業 · 選擇前',state:e.snapshot()});}
 for(const [kind,id] of [["general","DA018"],["general","DB014"],["general","DA019"],["general","DA028"],["general","DA035"],["general","DB026"],["general","DA041"],["general","DB032"],["general","DA044"],["general","DB035"],["general","DA060"],["general","DB051"],["general","DB009"],["lucky","L013"]]){const state=resolved(kind,id);cases.push({id:'art-'+id,title:'事件圖意 · '+state.cards[0].rows[0].title,state});}
 // R34 exact-source event comparisons; fixtures do not run in normal gameplay.
 for(const id of ['JA008','JA009','JA022','DA052','DB043','JC026','JC032','JE022','JC036','JC021','JB015','JC011','JA029','JA040','JB032','JB037','JC039','JE038','JF030','JF040','DA051','DB042','DA022','DB016','DA020']){
   const state=resolved(id.startsWith('J')?'career':'general',id);cases.push({id:'art-'+id,title:'R34 事件圖意 · '+(gameCardCopy(state.cards[0].rows[0])?.title||state.cards[0].rows[0].title),state});
 }
 {const e=make();e.s.phase='marketReveal';e.s.round=4;e.s.event=MARKET_EVENTS.find(event=>event.id==='M406');cases.push({id:'art-M406',title:'R34 市場事件 · '+e.s.event.title,state:e.snapshot()});}
 // R35: exact source rows in review fixtures only.
 for(const id of ["L002","L005","JB039","JE029","JA032","JB035","JA024","JC029","JF022","JF026","JA030","JA027","JA039","JA035"]){const state=resolved(id.startsWith('L')?'lucky':'career',id);cases.push({id:'art-'+id,title:'R35 事件圖意 · '+state.cards[0].rows[0].title,state});}
 // R36: source-based visual review fixtures, not normal game data.
 for(const id of ["JA021","JA023","JA025","JA033","JA036","JC033","JD040","JE021","JE026","JE037","JF021","JF038"]){const state=resolved('career',id);cases.push({id:'art-'+id,title:'R36 事件圖意 · '+state.cards[0].rows[0].title,state});}
 // R37: exact source visual review fixtures only.
 for(const id of ["JA037","JB030","JB040","JC038","JE027","JE034","JE039","JF029"]){const state=resolved('career',id);cases.push({id:'art-'+id,title:'R37 事件圖意 · '+state.cards[0].rows[0].title,state});}
 for(const id of ["M101","M106","M201","M402"]){const e=make();e.s.phase='marketReveal';e.s.round=4;e.s.event=MARKET_EVENTS.find(event=>event.id===id);cases.push({id:'art-'+id,title:'R37 市場事件 · '+e.s.event.title,state:e.snapshot()});}
 // R38: final remaining mismatch market fixtures; no normal state changes.
 for(const id of ["M501","M602","M606","M706","M702"]){const e=make();e.s.phase='marketReveal';e.s.round=4;e.s.event=MARKET_EVENTS.find(event=>event.id===id);cases.push({id:'art-'+id,title:'R38 市場事件 · '+e.s.event.title,state:e.snapshot()});}
 const hand=make('engineer');hand.s.phase='revealGroup';hand.s.cards=[resolved('career','JC001').cards[0],resolved('general','DA005').cards[0],resolved('lucky','L001').cards[0],resolved('general','DA049').cards[0],{kind:'career',rows:all.filter(r=>r.id.startsWith('JC019-')),status:'pending'},{kind:'general',rows:all.filter(r=>r.id.startsWith('DA003-')),status:'pending'}];cases.push({id:'hand-six',title:'六張手牌 · 好壞影響與選擇',state:hand.snapshot()});
 for(const [career,pool] of [['engineer','JC019-1'],['doctor','JD019-1'],['assistant','JF019-1']]){const e=make(career);e.s.phase='income';e.s.players[0].activeIncomePool=pool;cases.push({id:'transition-'+career,title:CAREERS.find(c=>c.id===career).name+' · 轉職後浮動收入',state:e.snapshot()});}
 for(const round of [3,4]){const e=make();e.s.phase='investIdle';e.s.round=round;cases.push({id:'categories-'+round,title:'六種投資類別 · 第 '+round+' 回合',state:e.snapshot()});}
 for(const id of ['IA001','IB001','IC001','ID001','IE002','IF001']){const e=make(),offer=ASSET_CARDS.find(c=>c.id===id);e.s.round=4;e.s.phase='offer';e.s.offer=offer;cases.push({id:'art-'+id,title:'投資標的 · '+offer.name,state:e.snapshot()});}
 for(const phase of ['loanDecision','marketReady','marketReveal']){const e=make();e.s.phase=phase;if(phase==='marketReveal')e.s.event=MARKET_EVENTS[0];cases.push({id:phase,title:({loanDecision:'借款與還款',marketReady:'市場事件 · 抽取前',marketReveal:'市場事件 · 結果'})[phase],state:e.snapshot()});}
 return cases;
}
