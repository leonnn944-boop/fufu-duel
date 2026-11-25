import {fateKindLabel} from './fate-kind-label.mjs';
import {createTableGuide} from './table-guide.mjs';
import {incomeImpactLines,incomeImpactItems,signedCardCash} from './income-impact.mjs';
import {investmentFacts} from './investment-facts.mjs';
import {unusedAssets} from './rules.mjs';
import {marketTitle} from './market-display.mjs';
import {openBoardInfo} from './board-info.mjs';
import {openBoardIndex,refreshBoardIndex} from './board-index.mjs';
import {gameCardCopy} from './card-game-copy.mjs';
import {resolvedCardImpact} from './card-result.mjs';
import {shortCardTitle} from './r32-card-labels.mjs';
import {careerArt,incomeArt,fateCardArt,investmentCardArt,marketEventArt,setNativeCardArt} from './r32-card-art.mjs';
import {phaseDescription} from './phase-description.mjs';
import { displayRoundResults, historyByRound, roundStandings } from './round-results.mjs';
import {mountCardDelivery} from './r46-card-delivery.mjs';
import {MARKET_INTRO_MS,MARKET_READING_MS} from './presentation-timing.mjs';
import {formatLoanMoney,maximumWholeRepayment,loanPrecisionNote,financeFormula} from './loan-display.mjs';
import {cardDescription,impactText,cardTone,marketPercent} from './card-impact.mjs';
import { CityScene } from './city-scene.mjs';
import { SoloMatch } from './solo-match.mjs';
import { createAudioSettings, readAudioMix } from './audio-settings.mjs';
import { OnboardingTips } from './onboarding-tips.mjs';
import { gameEpoch, gameKey, isNewGame } from './game-session.mjs';
import { CAREERS, INCOME_POOLS } from '../official-five.mjs';
import { BOARD_NAMES, WORLD_STOPS } from '../board-data.mjs';
import {fateTitle,choiceLabel,compactChoiceLabel,choiceAction,playerText} from './card-display.mjs';

const $=id=>document.getElementById(id);
const fmt=value=>`$${Math.round(value||0).toLocaleString('zh-TW')}`;
const shortFmt=value=>{const n=Math.round(Math.abs(value||0));return n>=10000?`${(Math.round(n/1000)/10).toLocaleString('zh-TW')}萬`:fmt(n);};
const tokenKey=code=>`fufuduel:room:${code}`;
const soundKey='fufuduel:sound';
const recentRoomKey='fufuduel:recent-room';
const validRoomCode=code=>typeof code==='string'&&/^[A-F0-9]{8}$/.test(code);
const storageRead=(storage,key)=>{try{return window[storage].getItem(key);}catch{return null;}};
const storageWrite=(storage,key,value)=>{try{if(value===null)window[storage].removeItem(key);else window[storage].setItem(key,value);}catch{}};
const soloStorage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const storedRoomToken=code=>validRoomCode(code)?storageRead('sessionStorage',tokenKey(code))||storageRead('localStorage',tokenKey(code)):null;
const params=new URLSearchParams(location.search);
const compactTurnActionPhases=new Set(['setup','income','marketReady','coInvest','coInvestTarget']);
const compactOfferLayout=matchMedia('(max-width: 800px) and (orientation: portrait), (max-height: 700px) and (orientation: landscape)');
const categoryNames={stock:'股票',property:'房地產',venture:'創業',metal:'貴金屬',forex:'外匯',crypto:'加密貨幣'};
const categoryIcons={stock:'◈',property:'▥',venture:'⚙',metal:'✦',forex:'⇄',crypto:'◇'};
const investmentArt={stock:'market',property:'home',venture:'venture',metal:'metal',forex:'forex',crypto:'crypto'};
const phaseNames={lobby:'等待玩家',setup:'抽取職業',careerResult:'職業揭曉',income:'本回合收入',incomeResult:'收入結算',roll:'擲骰前進',deck:'抽出命運',revealGroup:'命運抉擇',coInvestTarget:'邀請夥伴',coInvest:'共同投資',loanDecision:'借貸選擇',investIdle:'投資時間',offer:'投資機會',marketReady:'市場時刻',marketReveal:'市場變動',summary:'回合結算',hostReview:'規則待確認'};
const node=(tag,className,text)=>{const item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=String(text);return item;};
const button=(parent,label,fn,className='secondary-button',disabled=false)=>{const item=node('button',className,label);item.type='button';item.disabled=disabled;item.onclick=fn;parent.append(item);return item;};
const cardOwner=(heading,name,status,onOpen)=>{heading.classList.add('card-owner');const owner=node('button','card-owner-name',name);owner.type='button';owner.title=name;owner.setAttribute('aria-label','查看玩家完整名稱：'+name);owner.onclick=onOpen;heading.replaceChildren(node('span','card-owner-status',status),owner);};
const card=(parent,eyebrow,title,description,className='action-card')=>{const box=node('article',className);box.append(node('small','',eyebrow),node('h3','',title));if(description)box.append(node('p','',description));parent.append(box);return box;};
const renderImpact=(element,impact,omit='',compact=false)=>{for(const p of impact.parts||[{text:impact.text,kind:impact.kind}]){if(p.text===omit)continue;const text=compact?p.text.replace(/^下回合收回本金與 (.+) 收益$/u,'下回合本金＋$1收益'):p.text;const span=node('span','effect-part '+p.kind);if(/^現金/u.test(text))span.classList.add('cash-effect-part');let at=0;for(const match of text.matchAll(/[+−-]?\$[\d,]+(?:\.\d+)?/g)){span.append(document.createTextNode(text.slice(at,match.index)),node('span','money-token',match[0]));at=match.index+match[0].length;}span.append(document.createTextNode(text.slice(at)));span.dataset.direction=p.kind;element.append(span);}return element;};
const pageItems=(items,perPage,{anchor=0,onPageChange}={})=>{
  const lastPage=Math.max(0,Math.ceil(items.length/perPage)-1);
  let page=Math.min(lastPage,Math.floor(anchor/perPage));
  const nav=node('nav','list-pagination');
  nav.setAttribute('aria-label','名單分頁');
  const label=node('span','page-label');
  label.setAttribute('aria-live','polite');
  const goTo=index=>{
    page=Math.max(0,Math.min(lastPage,index));
    for(const [i,item] of items.entries())item.hidden=i<page*perPage||i>=(page+1)*perPage;
    label.textContent=(page+1)+' / '+(lastPage+1);
    previous.disabled=page===0;
    next.disabled=page===lastPage;
  };
  const previous=button(nav,'上一頁',()=>{goTo(page-1);onPageChange?.(page*perPage);},'secondary-button');
  nav.append(label);
  const next=button(nav,'下一頁',()=>{goTo(page+1);onPageChange?.(page*perPage);},'secondary-button');
  goTo(page);
  return nav;
};
const worth=p=>(p.cash||0)+(p.holdings||[]).reduce((sum,h)=>sum+(h.price||0),0)-(p.debt||0);
const root=id=>String(id).match(/^(?:DA|DB|D|JA|JB|JC|JD|JE|JF|L)\d{3}/)?.[0]??id;
const cardAmount=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
const shortCardText=value=>{const text=String(value||'').trim().replace(/\s+/g,' ');if(!text||text==='無')return '';const first=text.split(/[。；;]/)[0],lead=first.length>46?first.split(/[，,]/)[0]:first;return lead.length<=46?lead:'';};
const fateArt=(row,tone)=>{const revised=gameCardCopy(row);if(revised)return ['cash',revised.title];const id=String(row?.id||'');const specific={"JD005":["market","投資"],"JD011":["market","投資"],"JD008":["learning","學術"],"JD009":["learning","學術"],"JD014":["learning","進修"],"JD025":["legal","法律"],"JD026":["legal","法律"],"JB023":["softwarelicense","授權爭議"],"JB033":["cyberattack","網路攻擊"],"JC017":["softwareventure","軟體副業"],"JC023":["cyberattack","資料外洩"],"JC027":["codeerror","程式錯誤"],"JC035":["dataloss","資料遺失"],"JC040":["aireplacement","職位替代"]};if(specific[id])return specific[id];if(['DA009','DB008'].includes(id))return ['financeapp','理財工具'];if(['DA014','DB010'].includes(id))return ['sharedsoftware','共用軟體'];if(['DA045','DB036'].includes(id))return ['utility','訂閱帳單'];const text=`${row.title||''} ${cardDescription(row)||''}`;if(/^D002/u.test(id))return ['together','合作'];if(/^(?:DA|DB)003/u.test(id))return ['together','人情'];if(/^(?:DA|DB)004/u.test(id))return ['venture','創業'];if(/^D001/u.test(id))return ['market','投資'];if(/轉職|職涯|薪資/u.test(text))return ['career','職涯'];if(/醫|健康|病|健身|運動|體育/.test(text))return ['health','健康'];if(/車|交通|旅行|旅費|旅館/.test(text))return ['travel','交通'];if(/網購|購物|退貨|退費|消費|折價券/.test(text))return ['shopping','購物'];if(/供應鏈|貨運|物流/.test(text))return ['supply','物流'];if(/稅|罰款|報稅|退稅|罰鍰/.test(text))return ['tax','稅務'];if(/訴訟|法律|合約爭議|官司/.test(text))return ['legal','法律'];if(/課程|工作坊|進修|培訓|學習|研討會|論文/.test(text))return ['learning','學習'];if(/軟體|程式|駭客|科技|資料|人工智慧|APP|網站/.test(text))return ['technology','科技'];if(/水電|電信|電信費|電價|電費|訂閱|帳單/.test(text))return ['utility','帳單'];if(/餐費|自炊|日常開銷|食材|聚會/.test(text))return ['daily','生活'];if(/房|地產|租|搬遷|搬家|市中心|家具|裝修/.test(text))return ['home','居所'];if(/中獎|獎金|幸運|抽中|紅包|贈品/.test(text))return ['surprise','好運'];if(/朋友|合作|共同|團購|夥伴/.test(text))return ['together','合作'];if(/投資|股票|市場|經濟|景氣|資產|創業|公司估值/.test(text))return ['market','投資'];if(/工作|職|薪|公司|員工|客戶|專案|業績/.test(text))return ['career','職涯'];if(/現金|資金|支出|收入|費用|成本|補助/.test(text))return ['cash','現金'];if(tone==='negative')return ['setback','損失'];if(tone==='mixed')return ['balance','得失'];return ['fate','命運'];};
const previewTitle=title=>{const value=String(title||'');if(/搬遷.*市中心/.test(value))return '搬回市區';if(/退稅/.test(value))return '退稅入帳';return [...value].slice(0,4).join('');};
const artShapes={
  health:'<path d="M40 10 60 18v21c0 15-10 24-20 30-10-6-20-15-20-30V18Z"/><path d="M40 24v27M27 37h26"/>',
  career:'<rect x="13" y="29" width="54" height="35" rx="5"/><path d="M29 29v-8h22v8M13 42c15 10 39 10 54 0M36 48h8"/>',
  home:'<path d="m11 38 29-25 29 25M20 34v32h40V34M33 66V46h14v20"/>',
  market:'<path d="M13 66V54h11v12M29 66V42h11v24M45 66V31h11v35M61 66V19h8v47M12 33l16-9 13 7 24-18"/>',
  surprise:'<rect x="16" y="35" width="48" height="30" rx="3"/><path d="M12 28h56v10H12zM40 28v37M39 27c-16-4-18-16-8-17 8-1 10 10 9 17Zm2 0c16-4 18-16 8-17-8-1-10 10-9 17Z"/>',
  together:'<circle cx="25" cy="25" r="9"/><circle cx="55" cy="25" r="9"/><path d="M9 63V49c0-9 7-15 16-15s16 6 16 15v14M39 63V49c0-9 7-15 16-15s16 6 16 15v14M30 50h20"/>',
  travel:'<path d="m17 45 7-20h32l7 20M14 45h52v17H14zM24 62v6M56 62v6"/><circle cx="26" cy="52" r="3"/><circle cx="54" cy="52" r="3"/>',
  shopping:'<path d="M15 26h50l-5 35H20zM27 27c0-10 5-16 13-16s13 6 13 16M29 46l8 8 15-18"/>',
  supply:'<path d="m14 25 26-12 26 12v32L40 70 14 57zM14 25l26 13 26-13M40 38v32M25 19l26 13"/>',
  venture:'<path d="M40 9c12 9 18 20 18 33L40 57 22 42C22 29 28 18 40 9ZM30 51l-5 16 15-7 15 7-5-16"/><circle cx="40" cy="34" r="6"/>',
  metal:'<circle cx="40" cy="39" r="27"/><circle cx="40" cy="39" r="19"/><path d="m40 23 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2Z"/>',
  forex:'<circle cx="40" cy="40" r="28"/><path d="M12 40h56M40 12c-10 8-15 17-15 28s5 20 15 28M40 12c10 8 15 17 15 28s-5 20-15 28M19 25h42M19 55h42"/>',
  crypto:'<path d="m40 10 25 15v30L40 70 15 55V25Z"/><path d="m40 21 15 9v20l-15 9-15-9V30ZM33 29v22M40 21v38M47 29v22"/>',
  tax:'<path d="M18 14h44v52H18zM27 27h26M27 37h26M27 47h18M27 57h12"/><path d="m56 52 5 5 10-12"/>',
  legal:'<path d="m23 18 16 16m-8-23 22 22m-5-26 18 18M37 32 25 44m22-5 11 11M19 52l10 10M45 66h24M50 61l-5 5 5 5"/>',
  learning:'<path d="M12 18q15-6 28 3v45q-13-9-28-3zM68 18q-15-6-28 3v45q13-9 28-3z"/><path d="M20 30h12m-12 9h12m16-9h12m-12 9h12"/>',
  technology:'<rect x="20" y="20" width="40" height="40" rx="7"/><path d="M30 30h20v20H30zM40 11v9m0 40v9M11 40h9m40 0h9M17 17l7 7m32 32 7 7m0-46-7 7m-32 32-7 7"/>',
  utility:'<path d="M18 14h44v52H18zM27 27h26M27 39h12m8 0h6M27 51h26"/><path d="m45 29-8 14h9l-6 14 15-19h-9l6-9z"/>',
  daily:'<path d="M15 37h50l-5 28H20zM26 37c0-10 5-17 14-17s14 7 14 17"/><path d="M30 47h20m-17 9h14"/>',
  cash:'<rect x="11" y="22" width="58" height="39" rx="7"/><path d="M11 32h58M27 44h14m-14 8h8"/><circle cx="54" cy="47" r="8"/><path d="M54 42v10m-3-7h6m-6 4h6"/>',
  fate:'<path d="M40 8 49 31l23 9-23 9-9 23-9-23-23-9 23-9Z"/>',
  setback:'<path d="M14 22h52v40H14zM20 30h40M25 43h12m8 0h10M40 13v20M31 24l9 9 9-9"/>',
  balance:'<path d="M40 12v54M18 27h44M20 27l-9 20h18zm40 0-9 20h18zM28 65h24"/>',
};
const illustration=(kind,label)=>{const visual=node('div',`card-illustration art-${kind}`),index=({health:0,career:1,home:2,market:3,surprise:4,together:5,travel:6,shopping:7,supply:8,venture:9,metal:10,forex:11,crypto:12,tax:13,legal:14,learning:15,technology:9,utility:13,daily:7,cash:10,fate:4,setback:13,balance:14})[kind]??4,art=node('span','topic-art');art.style.backgroundPosition=`${index%4*100/3}% ${Math.floor(index/4)*100/3}%`;art.setAttribute('aria-hidden','true');if(['financeapp','sharedsoftware','softwarelicense','cyberattack','softwareventure','codeerror','dataloss','aireplacement'].includes(kind))art.classList.add('topic-'+kind);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('aria-hidden','true');svg.innerHTML=artShapes[kind]||artShapes.fate;visual.append(art,svg,node('small','',label));return visual;};
const assetIllustration=offer=>{
  const indexes={'市區住宅公寓':0,'高級住宅區豪宅':1,'企業辦公大樓':2,'知名連鎖飯店':3,'豪華度假村':4,'路邊餐車創業':5,'連鎖餐飲品牌':6,'網路電商平台':7,'遊戲開發工作室':8,'AI軟體開發公司':9,'實體金條':10,'黃金飾品收藏':11,'銀幣投資組合':12,'實體白銀庫存':12,'限量發行收藏金幣':10,'黃金珠寶設計品牌入股':11,'國際貴金屬儲備倉參股':13,'環保能源股':14,'半導體大廠':15};
  const index=indexes[offer.name]??(offer.category==='property'?0:offer.category==='venture'?5:null),visual=illustration(investmentArt[offer.category]||'fate',categoryNames[offer.category]||'投資');
  if(index!==null){const art=visual.querySelector('.topic-art');art.classList.add('investment-atlas');art.style.backgroundPosition=String(index%4*100/3)+'% '+String(Math.floor(index/4)*100/3)+'%';}
  const metalIndex={'限量發行收藏金幣':0,'實體白銀庫存':1,'黃金珠寶設計品牌入股':2,'國際貴金屬儲備倉參股':3}[offer.name];
  if(metalIndex!==undefined){const art=visual.querySelector('.topic-art');art.classList.remove('investment-atlas');art.classList.add('metals-atlas');art.style.backgroundPosition=`${metalIndex%2*100}% ${Math.floor(metalIndex/2)*100}%`;}
  visual.setAttribute('role','img');visual.setAttribute('aria-label',offer.name?offer.name+'示意圖':categoryNames[offer.category]+'類別插圖');return setNativeCardArt(visual,investmentCardArt(offer));
};
const roleIllustration=id=>{
  const colors={founder:['#314966','#f3bb4f'],freelancer:['#71559c','#b68ae2'],engineer:['#368b92','#ffd052'],doctor:['#f7f7ec','#ef7380'],sales:['#335a7b','#79dba2'],assistant:['#7195c5','#79dce8']};
  const [coat,accent]=colors[id]||colors.assistant;
  const accessory={founder:'<path d="M61 29 70 18 79 29 88 18 97 29v8H61Z" fill="#ffd267" stroke="#90551c" stroke-width="3"/><path d="M66 94h25v20H66z" fill="#ba8449" stroke="#694422" stroke-width="3"/>',freelancer:'<path d="M58 30q18-19 44 0v9H58z" fill="#a679d5" stroke="#584078" stroke-width="3"/><path d="m99 88 11-18 4 3-11 18z" fill="#ffd886"/>',engineer:'<path d="M91 80h30v22H91z" fill="#273f51" stroke="#65808d" stroke-width="3"/><path d="m90 103-6 6h38l1-6z" fill="#7896a2"/><path d="m97 87 4 3-4 3m8 2h7" fill="none" stroke="#83d6b6" stroke-width="2"/>',doctor:'<path d="M58 82h44v38H58z" fill="#fffdf5" stroke="#bfd6da" stroke-width="3"/><path d="M87 89v17m-8-8h16" stroke="#ed6572" stroke-width="5"/><path d="M65 36h31v8H65z" fill="#fffdf5"/>',sales:'<path d="m76 82 5 15 5-15z" fill="#56d4a2"/><path d="M99 92h20v19H99z" fill="#b88a52" stroke="#684a32" stroke-width="3"/>',assistant:'<path d="M57 37q24-30 46 0" fill="none" stroke="#79dce8" stroke-width="6"/><path d="M103 40v18l-11 4" fill="none" stroke="#79dce8" stroke-width="5"/><circle cx="92" cy="62" r="4" fill="#fff6c7"/>'}[id]||'';
  const svg=node('span',`role-art role-cube career-${id}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${id} 方塊人插畫`);svg.innerHTML=`<svg viewBox="0 0 150 160" aria-hidden="true"><ellipse cx="78" cy="148" rx="43" ry="8" fill="#16375055"/><path d="M61 111h15v31H61zm25 0h15v31H86z" fill="#33465f" stroke="#263347" stroke-width="3"/><path d="M54 78h52v44H54z" fill="${coat}" stroke="#294357" stroke-width="3"/><path d="M46 82h13v32H46zm59 0h13v32h-13z" fill="${coat}" stroke="#294357" stroke-width="3"/><path d="M46 108h13v12H46zm59 0h13v12h-13z" fill="#efbf9a" stroke="#9e745d" stroke-width="2"/><path d="M58 34h44v42H58z" fill="#efbf9a" stroke="#9e745d" stroke-width="3"/><path d="M57 31h46v12H57z" fill="#473e4a"/><path d="M57 42h11v10H57z" fill="#473e4a"/><rect x="67" y="54" width="5" height="7" rx="2" fill="#26364a"/><rect x="89" y="54" width="5" height="7" rx="2" fill="#26364a"/><path d="M75 67q6 5 12 0" fill="none" stroke="#b3746e" stroke-width="2" stroke-linecap="round"/><path d="M56 80h48v8H56z" fill="${accent}" opacity=".82"/>${accessory}<path d="M61 140h16v8H57zm25 0h17l5 8H85z" fill="#29354a"/></svg>`;return svg;
};

class CityGame {
  constructor(){
    if(location.hostname==='127.0.0.1'||location.hostname==='localhost')window.__cityGame=this;
    document.body.classList.toggle('desktop-solo',location.protocol==='fufuduel:');
    this.roomEntryPending=false;this.code=null;this.token=null;this.seat=null;this.state=null;this.members=[];this.targetCount=2;this.actor=null;this.revision=-1;this.deadline=0;this.serverOffset=0;this.pending=false;this.connectionProblem=false;this.scene=null;this.sceneReady=false;this.viewMode='ranking';this.lastShownRoll=-1;this.playerCount=2;this.cardFlipSeen=new Map();this.lobbyJoin=false;this.lastMarketEventId=null;this.solo=null;this.soloSave=SoloMatch.restore(soloStorage);this.incomeCeremony=null;this.loanMode=null;this.loanDraft='';this.loanContext=null;this.cardDrawing=null;this.focusCardIndex=0;this.focusCardContext=null;this.loanFinanceSeat=null;this.sellSelection=null;
    $('count-down').onclick=()=>this.setPlayerCount(this.playerCount-1);$('count-up').onclick=()=>this.setPlayerCount(this.playerCount+1);this.setPlayerCount(2);
    $('room-code-input').value=(params.get('room')||'').toUpperCase();
    $('room-code-input').oninput=event=>event.target.value=event.target.value.toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,8);
    $('create-room').onclick=()=>this.create();$('join-room').onclick=()=>this.join();
    $('solo-test').onclick=()=>this.createSolo(this.soloSave);
    $('solo-nickname').onkeydown=event=>{
      if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){
        event.preventDefault();
        $('solo-test').click();
      }
    };
    $('lobby-host-mode').onclick=()=>this.setLobbyMode(false);
    $('lobby-switch').onclick=()=>this.setLobbyMode(true);
    const soloDialog=$('new-solo-dialog');
    $('new-solo').onclick=()=>{
      soloDialog.returnValue='';
      $('new-solo-nickname').value=this.soloSave?.nickname || '';
      soloDialog.showModal();
    };
    soloDialog.addEventListener('close',()=>{
      if(soloDialog.returnValue==='new')this.createSolo(null,$('new-solo-nickname').value);
    });

    for(const [field,target] of [['nickname','create-room'],['join-nickname','room-code-input'],['room-code-input','join-room']]){
      $(field).addEventListener('keydown',event=>{
        if(event.key!=='Enter'||event.isComposing||event.keyCode===229)return;
        event.preventDefault();
        if($(target).tagName==='INPUT')$(target).focus();
        else $(target).click();
      });
    }
    $('panel-toggle').onclick=()=>this.togglePanel();
    $('finance-nav').onclick=()=>{const expanded=document.body.classList.toggle('finance-expanded');$('finance-nav').setAttribute('aria-expanded',String(expanded));$('finance-nav').textContent=expanded?'收合玩家財務':'查看玩家財務';};
    $('copy-invite').onclick=()=>this.copyInvite();
    const boardIndex=button(document.querySelector('.world-buttons'),'棋盤索引',()=>openBoardIndex(this,boardIndex),'quiet-button');
    boardIndex.id='board-index-open';
    $('overview-scale').after(boardIndex);
    $('camera-button').onclick=()=>{if(!this.scene)return;const overview=!this.scene.overview;document.body.classList.toggle('board-overview',overview);document.body.classList.toggle('board-fit',overview);this.scene.setOverview(overview);$('camera-button').textContent=this.scene.overview?'返回遊戲':'總覽棋盤';$('overview-scale').hidden=!this.scene.overview;$('overview-scale').textContent=this.scene.overviewFit?'放大棋盤':'縮小整盤';};
    $('focus-me-button').onclick=()=>this.focusPlayer(this.seat);
    const automatic=button($('world-stage'),'自動跟隨',()=>this.resumeAutomaticView(),'automatic-follow-button');automatic.id='automatic-follow-button';automatic.hidden=true;
    const help=node('div','camera-help');help.append(node('span','desktop-help','拖曳旋轉 · 右鍵平移 · 滾輪縮放'),node('span','mobile-help','單指旋轉 · 雙指平移／縮放'));button(help,'重設視角',()=>{this.scene?.resetView();this.scene?.updateCamera();},'');$('world-stage').append(help);
    const info=node('dialog','player-info-dialog');info.id='player-info-dialog';const infoHead=node('div','guide-top');infoHead.append(node('strong','','玩家資料'));button(infoHead,'關閉',()=>info.close(),'secondary-button');info.append(infoHead,node('div','player-info-content'));document.body.append(info);const financeShortcut=button(document.querySelector('.top-status'),'玩家資料',()=>{info.querySelector('.player-info-content').replaceChildren(...[...$('players-live').children].map(e=>{const item=e.cloneNode(true);item.onclick=()=>{e.click();info.close();};item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}};return item;}));info.showModal();},'finance-shortcut');financeShortcut.id='finance-shortcut';
    $('crowd-button').onclick=()=>this.inspectCrowd();
    $('overview-scale').onclick=()=>{if(!this.scene?.overview)return;this.scene.setOverviewFit(!this.scene.overviewFit);$('overview-scale').textContent=this.scene.overviewFit?'放大棋盤':'縮小整盤';document.body.classList.toggle('board-fit',this.scene.overviewFit);};
    $('sound-button').onclick=()=>this.toggleSound();
    compactOfferLayout.addEventListener('change',()=>{if(['offer','loanDecision','investIdle'].includes(this.state?.phase)||compactTurnActionPhases.has(this.state?.phase))this.render();});
    this.awardStandingAnchor=0;
    this.awardNarrowLayout=matchMedia('(max-width: 800px)');
    this.awardCompactLayout=matchMedia('(max-height: 540px), (max-width: 800px) and (max-height: 650px)');
    const refreshAwards=()=>{
      if(this.state?.phase==='summary'&&this.state.round===5)this.render();
    };
    for(const media of [this.awardNarrowLayout,this.awardCompactLayout,matchMedia('(prefers-reduced-motion: reduce)')]){
      media.addEventListener('change',refreshAwards);
    }
    document.addEventListener('click',event=>{
      if(!event.isTrusted)return;
      if(event.target.closest('[data-open-audio-settings]')){this.openAudioSettings();return;}
      const control=event.target.closest('button, .focus-draw-card[role="button"], .lobby-resume');
      if(!control||control.matches(':disabled,[aria-disabled="true"],#sound-button,#guide-tool-sound,#award-sound-button'))return;
      this.scene?.audioCue(control.dataset.audioCue||'ui');
    });
    $('guide-button').onclick=()=>this.openGuide();$('guide-close').onclick=()=>$('guide-dialog').close();
    $('score-button').onclick=()=>$('score-dialog').showModal();$('score-close').onclick=()=>$('score-dialog').close();
    $('ranking-tab').onclick=()=>this.switchDeck('ranking');$('history-tab').onclick=()=>this.switchDeck('history');
    document.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.target?.matches?.('input,textarea,select'))return;const host=$('card-focus');if(host.hidden||!host.querySelector('.focus-card-hand'))return;event.preventDefault();this.carouselNavigate?.(event.key==='ArrowLeft'?-1:1);});
    setInterval(()=>this.tick(),250);setInterval(()=>this.poll(),1000);setInterval(()=>this.advanceSoloBot(),850);
    this.scene = new CityScene($('city-canvas'), $('world-stage'));
    this.onboarding = new OnboardingTips($('world-stage'));
    this.restoreSoundPreference();
    const syncReadingClock = () => {
      this.updateSoloReadingClock();
      this.tick();
    };
    new MutationObserver(syncReadingClock).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['open'],
    });
    document.addEventListener('visibilitychange', syncReadingClock);
    const code=(params.get('room')||'').toUpperCase();
    const saved=storedRoomToken(code);
    this.setLobbyMode(Boolean(code&&!saved));
    if(!code&&params.get('solo')==='continue'&&this.soloSave){
      this.createSolo(this.soloSave);
    }else if(saved){
      this.code=code;this.token=saved;
      this.render();
      this.notice('正在回到房間…');
      this.poll(true);
    }else this.render();
  }
  updateSoloReadingClock(){
    if (!this.solo) return;
    const reading = document.hidden || !this.sceneReady || Boolean(document.querySelector('dialog[open]'));
    this.solo.setReadingPaused(reading);
    this.deadline = this.solo.deadline;
  }
  async loadScene(){
    if (this.sceneRequested) return;
    this.sceneRequested = true;
    const message=$('stage-message');message.hidden=false;message.classList.add('loading-active');message.setAttribute('role','status');message.setAttribute('aria-live','polite');const label=node('span','','正在準備城市棋盤');message.replaceChildren(node('span','loading-orbit'),label);
    try {
      await this.scene.init(status => {
        label.textContent = status;
        message.dataset.loadStage = status;
      });
      this.sceneReady = true;
      this.updateSoloReadingClock();
      this.scene.app.autoRender = Boolean(this.code);
      this.scene.onMotionComplete = () => {
        if ($('dice-readout').hidden) {
          this.finishLandingPresentation();
        } else {
          this.landingPending = true;
          this.render();
        }
      };
      this.scene.onDiceLanded = face => {
        const readout = $('dice-readout');
        readout.setAttribute('role','status');
        readout.textContent = `擲出 ${face} 點`;
        readout.hidden = false;
        clearTimeout(this.diceReadoutTimer);
        this.diceReadoutTimer = setTimeout(() => {
          readout.hidden = true;
          if (this.landingPending) this.finishLandingPresentation();
        }, this.scene.reducedMotion ? 950 : 1700);
      };
      this.scene.onDistrictInspect = (zone,name) => this.inspectDistrict(zone,name);
      this.scene.onTileInspect = tile => this.inspectTile(tile);
      message.classList.remove('loading-active');
      message.hidden = true;
      if (this.state) {
        this.scene.sync(this.state,this.members,this.revision,this.seat);
        this.updateCrowdControl();
        this.render();
      }
    }
    catch(error){
      console.error(error);
      this.sceneReady = false;
      if(this.scene.app) this.scene.app.autoRender = false;
      this.updateSoloReadingClock();
      message.hidden = false;
      message.classList.remove('loading-active');
      message.dataset.loadStage = 'error';
      message.setAttribute('role','alert');
      message.replaceChildren(node('strong','','城市棋盤載入失敗'));
      const actions = node('div','stage-retry-actions');
      button(actions,'重新開啟棋盤',()=>location.reload());
      button(actions,'回到主選單',()=>location.assign(location.pathname));
      message.append(actions);
    }
  }
  restoreSoundPreference(){
    let muted=false;
    try{muted=localStorage.getItem(soundKey)==='off';}catch{}
    this.scene.audioBus().setMix(readAudioMix());
    if(muted)this.scene.setSound(false);
    this.updateSoundButtons();
  }
  toggleSound(){
    if(!this.scene)return;
    this.setSoundEnabled(!this.scene.soundOn);
  }
  setSoundEnabled(enabled){
    this.scene.setSound(enabled);
    try{localStorage.setItem(soundKey,enabled?'on':'off');}catch{}
    this.updateSoundButtons();
  }
  openAudioSettings(){
    if(!this.scene)return;
    this.audioSettings??=createAudioSettings(this.scene.audioBus(),enabled=>this.setSoundEnabled(enabled));
    this.audioSettings.open();
  }
  updateSoundButtons(){
    const enabled=this.scene.soundOn,label=enabled?'音效：開':'音效：關';
    for(const id of ['sound-button','guide-tool-sound','award-sound-button']){
      const control=$(id);
      if(control){control.textContent=label;control.setAttribute('aria-pressed',String(enabled));}
    }
    const titleAudio=$('title-audio-button');
    if(titleAudio){
      titleAudio.textContent=enabled?'聲音設定':'聲音：關';
      titleAudio.setAttribute('aria-pressed',String(enabled));
      titleAudio.dataset.muted=String(!enabled);
    }
    this.audioSettings?.refresh();
  }
  notice(message){if($('notice').textContent!==message)$('notice').textContent=message;$('notice').hidden=!message;}
  updateCrowdControl(){
    const focus=this.state?.players?.find(p=>p.seat===this.scene?.followSeat),count=focus?this.state.players.filter(p=>p.position===focus.position).length:0;
    $('crowd-button').hidden=count<2;$('crowd-button').textContent=`同格 ${count} 位`;
  }
  openGuide(){
    this.showTableGuide ??= createTableGuide(this, openBoardIndex);
    this.showTableGuide();
  }
  setLobbyMode(join){
    this.lobbyJoin=join;
    $('lobby-panel').classList.toggle('join-mode',join);
    $('lobby-create').hidden=join;
    $('lobby-join').hidden=!join;
    $('lobby-switch').setAttribute('aria-pressed',String(join));
    $('lobby-host-mode').setAttribute('aria-pressed',String(!join));
    if(join&&!$('join-nickname').value)$('join-nickname').value=$('nickname').value;
    if(!join&&!$('nickname').value)$('nickname').value=$('join-nickname').value;
  }
  togglePanel(forceExpand=false){const panel=document.querySelector('.play-panel'),collapsed=forceExpand?false:!panel.classList.contains('collapsed');panel.classList.toggle('collapsed',collapsed);$('panel-toggle').textContent=collapsed?'▴':'▾';$('panel-toggle').setAttribute('aria-expanded',String(!collapsed));$('panel-toggle').setAttribute('aria-label',collapsed?'展開操作面板':'收合操作面板');}
  setPlayerCount(value){
    this.playerCount=Math.max(2,Math.min(12,value));$('player-count').textContent=`${this.playerCount} 人`;$('count-down').disabled=this.playerCount===2;$('count-up').disabled=this.playerCount===12;
    const preview=$('seat-preview');preview.replaceChildren();for(let index=0;index<this.playerCount;index++)preview.append(node('span','seat-token',String(index+1)));
  }
  async request(path,options={}){
    const requestStarted=Date.now();
    if(String(path).startsWith('/api/')){throw new Error('目前為 GitHub 免費靜態試玩版，請使用「單人遊玩」體驗完整五回合；多人線上開房將於正式主機啟用。');}
    const response=await fetch(path,{...options,headers:{'content-type':'application/json','x-player-token':this.token||'',...options.headers},cache:'no-store'});
    let result;try{result=await response.json();}catch{throw new Error(`房間服務暫時無法回應（${response.status}）`);}
    if(Number.isFinite(result.serverNow))result.clientClockOffset=result.serverNow-(requestStarted+Date.now())/2;
    if(!response.ok)throw Object.assign(new Error(result.error||'操作失敗'),{result,status:response.status});
    return result;
  }
  identity(result){
    this.code=result.code;this.seat=result.seat;
    if(result.playerToken){
      this.token=result.playerToken;
      storageWrite('sessionStorage',tokenKey(this.code),this.token);
      storageWrite('localStorage',tokenKey(this.code),this.token);
    }
    storageWrite('localStorage',recentRoomKey,this.code);
    history.replaceState(null,'',`${location.pathname}?room=${this.code}`);
  }
  apply(result){
    if(this.state&&gameEpoch(result.state)<gameEpoch(this.state))return;
    if(result.code&&(!this.seat||result.playerToken))this.identity(result);
    if(result.revision<this.revision)return;
    if(result.revision===this.revision){this.deadline=result.deadline;this.serverOffset=result.clientClockOffset??result.serverNow-Date.now();return;}
    const previousState=this.state,previousPhase=this.state?.phase,previousFollowSeat=this.scene?.followSeat;
    if(isNewGame(this.state,result.state)){
      this.scene?.gameAudio?.cancel();this.pendingAudioCue=null;this.lastShownRoll=-1;this.cardFlipSeen.clear();this.lastMarketEventId=null;this.lastMarketPresentationKey=null;this.focusCardContext=null;this.focusCardIndex=0;this.celebrationKey=null;this.celebrationSkipped=false;this.landingPending=false;clearTimeout(this.diceReadoutTimer);$('dice-readout').hidden=true;document.body.classList.remove('celebration-skip');
      this.incomeCeremony=null;this.careerDrawing=null;this.assetDrawing=null;this.cardDrawing=null;this.loanMode=null;this.loanDraft='';this.loanContext=null;this.sellSelection=null;this.pendingAction=null;this.pending=false;this.clearMarketFx();
    }
    this.revision=result.revision;this.state=result.state;this.members=result.players;this.targetCount=result.targetCount;this.actor=result.actor;this.deadline=result.deadline;this.serverOffset=result.clientClockOffset??result.serverNow-Date.now();
    void this.loadScene();
    this.updateSoloReadingClock();
    if(previousState&&previousPhase!=='lobby'){
      let cue=null;const s=this.state;
      if(s.round>previousState.round)cue='round';
      else if(s.phase!==previousPhase){
        if(s.phase==='revealGroup'&&s.cards?.some(card=>card.kind==='lucky'))cue='lucky';
        else cue=({incomeResult:'income',careerResult:'reveal',offer:'reveal',revealGroup:'reveal'})[s.phase]||null;
      }
      else if(s.phase==='revealGroup'){
        const i=s.cards.findIndex((c,i)=>c.status==='resolved'&&previousState.cards?.[i]?.status==='pending');
        if(i>=0){const c=s.cards[i],row=c.rows.find(r=>r.id===c.selectedId)||c.rows[0];cue=c.kind==='lucky'?'lucky':cardTone(row,s.players[s.turn]);if(cue==='neutral')cue='reveal';}
      }
      if(cue)this.pendingAudioCue={name:cue,key:gameKey(s,this.code,s.round,s.turn,s.phase,this.revision,cue),phase:s.phase,round:s.round,turn:s.turn};
    }
    const boardInfo=$('board-info-dialog');if(boardInfo?.open&&boardInfo.dataset.boardInfoPhase!==this.state.phase)boardInfo.close();
    if(this.state.phase!=='income')this.incomeCeremony=null;
    if(this.state.phase!=='setup')this.careerDrawing=null;
    if(this.state.phase!=='investIdle')this.assetDrawing=null;
    if(this.state.phase!=='loanDecision'){this.loanMode=null;this.loanDraft='';this.loanContext=null;}
    if(this.state.phase!=='deck')this.cardDrawing=null;
    this.sellSelection=null;
    if(this.state.phase!=='investIdle'){this.salesExpanded=false;this.holdingIndex=0;this.holdingContext=null;}
    if(previousPhase==='lobby'&&this.state.phase!=='lobby')this.notice('');
    if(this.state.phase!=='marketReveal')this.clearMarketFx();
    const marketKey=gameKey(this.state,this.code,this.state.round,this.state.event?.id,this.deadline);
    if(this.state.phase==='marketReveal'&&marketKey!==this.lastMarketPresentationKey){this.lastMarketPresentationKey=marketKey;this.marketFx(this.state.event);}
    if(previousPhase!==this.state.phase&&this.actor===this.seat&&document.querySelector('.play-panel').classList.contains('collapsed'))this.togglePanel(true);
    if(this.sceneReady){if((this.state.phase!=='setup'||this.actor!==this.seat)&&this.scene.preview)this.scene.previewCareer(null);this.scene.sync(this.state,this.members,this.revision,this.seat);}
    refreshBoardIndex(this);
    this.render();if(this.sceneReady&&previousFollowSeat!==this.scene.followSeat&&!this.scene.motion)this.scene.updateCamera(true);
  }
  async enterRoom(message,operation){
    if(this.roomEntryPending||this.code)return;
    this.roomEntryPending=true;
    const panel=$('lobby-panel');
    const controls=['create-room','join-room','solo-test','lobby-switch','lobby-host-mode','new-solo'].map($);
    panel.setAttribute('aria-busy','true');
    for(const control of controls)control.disabled=true;
    this.notice(message);
    try{await operation();}
    catch(error){this.notice(error.message);}
    finally{
      this.roomEntryPending=false;
      panel.removeAttribute('aria-busy');
      for(const control of controls)control.disabled=false;
    }
  }
  async create(){
    if(!$('nickname').value.trim()){this.notice('請先輸入你的玩家名稱。');$('nickname').focus();return;}
    await this.enterRoom('正在建立房間…',async()=>{
      const result=await this.request('/api/rooms',{method:'POST',body:JSON.stringify({nickname:$('nickname').value,playerCount:this.playerCount})});
      this.identity(result);this.apply(result);this.notice('房間已建立，分享邀請連結讓朋友加入。');
    });
  }
  createSolo(savedMatch=null,name){
    if(this.roomEntryPending||this.code)return;
    const field=location.protocol==='fufuduel:'?'solo-nickname':'nickname';
    const nickname=Array.from((name??$(field).value).trim()).slice(0,24).join('');
    this.solo=savedMatch||new SoloMatch(soloStorage,undefined,nickname);
    this.solo.saved=this.solo.save();
    this.code='SOLO';
    this.seat='A';
    history.replaceState(null,'',location.pathname+'?solo=continue');
    this.apply(this.solo.result());
    if(!this.solo.saved)this.notice('此裝置暫時無法儲存單人進度。保持頁面開啟即可繼續遊玩。');
  }
  advanceSoloBot(){
    if(!this.solo||!this.sceneReady||this.pending||document.hidden||this.soloPaused)return;
    const canRead=!this.landingPending&&!this.scene.motion&&!this.scene.diceMotion;
    try{
      const result=this.solo.advance(canRead,(option,state)=>this.affordable(option,state));
      if(result){
        this.apply(result);
        if(!this.solo.saved)this.notice('單人進度無法儲存，保持頁面開啟即可繼續。');
      }
    }catch(error){
      this.soloPaused=true;
      this.notice('電腦對手暫停。請從主選單繼續此局。');
      console.error(error);
    }
  }
  async join(){
    const code=$('room-code-input').value;if(!/^[A-F0-9]{8}$/.test(code)){this.notice('請輸入 8 碼房碼。');return;}
    if(!$('join-nickname').value.trim()){this.notice('請先輸入你的玩家名稱。');$('join-nickname').focus();return;}
    await this.enterRoom('正在加入房間…',async()=>{
      const result=await this.request('/api/rooms/'+code+'/join',{method:'POST',body:JSON.stringify({nickname:$('join-nickname').value})});
      this.identity(result);this.apply(result);this.notice('已加入房間，等待其他玩家。');
    });
  }
  async copyInvite(){
    try{await navigator.clipboard.writeText(`${location.origin}/city-game.html?room=${this.code}`);this.notice('邀請連結已複製。');}
    catch{this.notice(`房碼：${this.code}`);}
  }
  recoverUnavailableRoom(code){
    storageWrite('sessionStorage',tokenKey(code),null);
    storageWrite('localStorage',tokenKey(code),null);
    if(storageRead('localStorage',recentRoomKey)===code)storageWrite('localStorage',recentRoomKey,null);
    this.code=null;this.token=null;this.connectionProblem=false;
    const url=new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null,'',url);
    $('room-code-input').value='';
    this.setLobbyMode(false);
    this.render();
    this.notice('上次的房間已失效。請建立新房間，或向朋友索取新的邀請連結。');
    $('nickname').focus();
  }
  async poll(force=false){
    if(this.solo||!this.code||!this.token||(this.pending&&!force))return;
    const code=this.code,token=this.token;
    const sameRoom=()=>this.code===code&&this.token===token;
    try{
      const result=await this.request('/api/rooms/'+code);
      if(!sameRoom())return;
      const reconnecting=!this.state||this.connectionProblem;
      this.apply(result);
      if(reconnecting){this.connectionProblem=false;this.notice('');}
    }
    catch(error){
      if(!sameRoom())return;
      if(!this.state&&[401,404].includes(error.status)){this.recoverUnavailableRoom(code);return;}
      this.connectionProblem=true;
      this.notice(error.status===401?'此瀏覽器的玩家身分無效，請回到原本加入的裝置開啟房間連結。':`連線暫時中斷，正在重試：${error.message}`);}
  }
  canAct(){return this.sceneReady&&this.state&&this.members.length===this.targetCount&&!this.pending&&!this.scene?.motion&&!this.landingPending&&(this.state.phase==='lobby'||this.seat===this.actor);}
  async startIncomeCeremony(variable){
    if(!this.canAct()||this.state?.phase!=='income'||this.incomeCeremony)return;
    const current=this.state.players[this.state.incomeIndex],remaining=this.deadline-(Date.now()+this.serverOffset);
    const duration=this.scene.reducedMotion?0:Math.max(250,Math.min(variable?1500:950,remaining-650));
    const ceremony={seat:current.seat,round:this.state.round,epoch:gameEpoch(this.state),variable,duration};this.incomeCeremony=ceremony;this.scene?.audioCue('draw',gameKey(this.state,'income-draw',this.revision));this.render();
    if(duration)await new Promise(resolve=>setTimeout(resolve,duration));
    if(this.incomeCeremony!==ceremony||gameEpoch(this.state)!==ceremony.epoch)return;
    if(ceremony&&this.state?.phase==='income'&&this.state.round===ceremony.round&&this.state.players[this.state.incomeIndex]?.seat===ceremony.seat&&this.canAct())await this.dispatch('claimIncome');
    if(this.incomeCeremony===ceremony)this.incomeCeremony=null;this.render();
  }
  async startCareerDraw(){
    if(!this.canAct()||this.state?.phase!=='setup'||this.careerDrawing)return;
    const revision=this.revision,drawing={epoch:gameEpoch(this.state)};this.careerDrawing=drawing;this.scene?.audioCue('draw',gameKey(this.state,'career-draw',this.revision));this.render();
    if(!this.scene.reducedMotion)await new Promise(resolve=>setTimeout(resolve,850));
    if(this.careerDrawing!==drawing||gameEpoch(this.state)!==drawing.epoch)return;
    if(this.revision===revision&&this.state?.phase==='setup'&&this.canAct())await this.dispatch('drawCareer');
    if(this.careerDrawing===drawing)this.careerDrawing=null;this.render();
  }
  async startAssetDraw(category){
    if(!this.canAct()||this.state?.phase!=='investIdle'||this.assetDrawing)return;
    const round=this.state.round,turn=this.state.turn,revision=this.revision;
    const drawing={category,round,turn,epoch:gameEpoch(this.state)};this.assetDrawing=drawing;this.scene?.audioCue('draw',gameKey(this.state,'asset-draw',this.revision,category));this.render();
    if(!this.scene.reducedMotion)await new Promise(resolve=>setTimeout(resolve,850));
    if(this.assetDrawing!==drawing||gameEpoch(this.state)!==drawing.epoch)return;
    if(this.revision===revision&&this.state?.phase==='investIdle'&&this.state.round===round&&this.state.turn===turn&&this.canAct())await this.dispatch('drawAsset',{category});
    if(this.assetDrawing===drawing)this.assetDrawing=null;this.render();
  }
  finishLandingPresentation(){
    this.landingPending=false;
    if(this.scene){this.scene.presentationSeat=null;this.scene.sync(this.state,this.members,this.revision,this.seat);}
    this.render();
    if(this.state?.phase==='deck'&&this.canAct())this.startCardDraw(false);
    this.scene?.updateCamera(true);this.scene?.updateOcclusion(1);
  }
  async startCardDraw(extreme){
    if(!this.canAct()||this.state?.phase!=='deck'||this.cardDrawing||this.landingPending||this.scene?.motion||this.scene?.diceMotion)return;
    const next=this.state.queue[0];if(!next)return;
    const round=this.state.round,turn=this.state.turn,kind=next.kind,remaining=this.deadline-(Date.now()+this.serverOffset),duration=this.scene.reducedMotion?0:Math.max(200,Math.min(720,remaining-650));
    const drawing={round,turn,kind,extreme,duration,started:performance.now(),epoch:gameEpoch(this.state)};this.cardDrawing=drawing;this.scene?.audioCue('draw',gameKey(this.state,'fate-draw',this.revision));this.render();
    if(duration)await new Promise(resolve=>setTimeout(resolve,duration));
    if(this.cardDrawing!==drawing||gameEpoch(this.state)!==drawing.epoch)return;
    if(drawing&&this.state?.phase==='deck'&&this.state.round===round&&this.state.turn===turn&&this.state.queue[0]?.kind===kind&&this.canAct())await this.dispatch('drawAll',{extreme});
    if(this.cardDrawing===drawing)this.cardDrawing=null;this.render();
  }
  async dispatch(type,payload={}){
    if(!this.canAct())return;
    const operation={epoch:gameEpoch(this.state)};this.pendingAction=operation;this.pending=true;this.render();
    try{
      const result=this.solo?this.solo.play(type,payload):
        await this.request(`/api/rooms/${this.code}/actions`,{method:'POST',body:JSON.stringify({type,payload,revision:this.revision,requestId:crypto.randomUUID()})});
      if(gameEpoch(result.state)<gameEpoch(this.state))return;
      this.apply(result);
      this.notice(this.solo&&!this.solo.saved?'單人進度無法儲存，保持頁面開啟即可繼續。':'');
    }
    catch(error){if(this.pendingAction!==operation)return;if(error.result?.state){this.apply(error.result);if(type==='drawAll'&&error.status===409){this.notice('');return;}}else if(!error.status)await this.poll(true);this.notice(error.message);}
    finally{if(this.pendingAction===operation){this.pendingAction=null;this.pending=false;this.render();}}
  }
  switchDeck(which){this.viewMode=which;$('ranking-tab').classList.toggle('active',which==='ranking');$('history-tab').classList.toggle('active',which==='history');$('ranking-list').hidden=which!=='ranking';$('history-list').hidden=which!=='history';}
  member(seat){return this.members.find(p=>p.seat===seat);}
  displayName(seat){return this.member(seat)?.nickname||'未命名玩家';}
  visibleText(value){return playerText(value).replace(/(?<![A-Za-z0-9-])([A-L])(?=\s|$)/g,(_all,seat)=>this.member(seat)?.nickname||seat);}
  actorName(){return this.displayName(this.actor);}
  focusPlayer(seat,options){if(!this.scene||!this.state?.players.some(player=>player.seat===seat))return;$('world-stage').querySelector('.crowd-selection')?.remove();this.scene.setFocusSeat(seat,options);if(this.scene.overview)$('camera-button').click();$('focus-me-button').hidden=seat===this.seat;this.renderLivePlayers(this.state);this.updateCrowdControl();}
  resumeAutomaticView(){
    if(!this.scene||!this.state)return;
    this.scene.viewSeat=null;this.scene.stage.dataset.viewSeat='';this.scene.resetView();
    if(this.scene.overview)$('camera-button').click();
    this.scene.sync(this.state,this.members,this.revision,this.seat);this.scene.updateCamera(true);this.scene.updateLabels();this.render();
  }
  render(){
    const s=this.state,phase=s?.phase;
    const frontDoor=!this.code;
    const leavingFrontDoor=document.body.classList.contains('front-door')!==frontDoor;
    document.body.classList.toggle('front-door',frontDoor);
    if(leavingFrontDoor&&this.scene?.app){
      this.scene.app.autoRender=!frontDoor;
      this.scene.app.renderNextFrame=!frontDoor;
    }
    this.updateCrowdControl();
    document.body.classList.toggle('playing',Boolean(s&&phase!=='lobby'));
    const finalAwards=phase==='summary'&&s?.round===5,award=$('award-banner');document.body.classList.toggle('final-awards',finalAwards);award.hidden=!finalAwards;
    this.scene?.audioBus().setScoreScene(finalAwards?'awards':!phase||phase==='lobby'?'lobby':'board');
    if(finalAwards){const champion=[...s.players].sort((a,b)=>worth(b)-worth(a))[0];award.textContent=`★ 冠軍 ${this.displayName(champion.seat)} · ${fmt(worth(champion))}`;}
    else{this.celebrationKey=null;this.celebrationSkipped=false;this.awardStandingAnchor=0;document.body.classList.remove('celebration-skip');}
    const recentRoom=storageRead('localStorage',recentRoomKey),resume=$('resume-room');
    resume.hidden=Boolean(this.code||params.has('room')||!storedRoomToken(recentRoom));
    if(!resume.hidden)resume.href=location.pathname+'?room='+recentRoom;
    $('solo-label').textContent=this.soloSave?'繼續單人對決':'單人遊玩';
    $('desktop-solo-identity').hidden=location.protocol!=='fufuduel:'||Boolean(this.soloSave);
    if(frontDoor && this.soloSave){
      const saved=this.soloSave.engine.s;
      const phase=saved.phase==='summary'&&saved.round===5?'最終成績':phaseNames[saved.phase];
      $('solo-caption').textContent=[this.soloSave.nickname,'第 '+saved.round+'／5 回合',phase].filter(Boolean).join(' · ');
    }
    $('new-solo').hidden=!this.soloSave;
    $('lobby-panel').hidden=Boolean(this.code);$('action-panel').hidden=!this.code;$('players-live').hidden=!s||phase==='lobby';
    $('copy-invite').hidden=!this.code||Boolean(this.solo);$('room-badge').hidden=!this.code;$('room-badge').textContent=this.solo?'單人對決':this.code?`房間 ${this.code}`:'';
    $('my-seat').textContent=this.seat?`你是 ${this.displayName(this.seat)}`:'你的旅程即將開始';
    $('round-badge').textContent=s&&phase!=='lobby'?`第 ${s.round}／5 回合`:'五回合挑戰';
    $('world-step').textContent=phaseNames[phase]||'準備開局';
    $('world-title').textContent=phase==='summary'&&s.round===5?'五回合，見證你的結局。':phase==='lobby'?'集結玩家，準備啟程。':phase==='roll'?'城市在等你的下一步。':'選一條路，改寫結局。';
    $('phase-eyebrow').textContent=phase==='summary'&&s.round===5?'最終章':phase==='lobby'?'等待玩家':phase?`第 ${s.round} 回合 · ${phaseNames[phase]||'遊戲進行中'}`:'準備出發';
    $('phase-title').textContent=s&&phase!=='lobby'?'全員即時狀況':phaseNames[phase]||'歡迎來到富負對決';
    $('phase-description').textContent=this.visibleText(phaseDescription(s,this.actor));
    if(s){this.renderActions(s);this.renderCardFocus(s);this.renderPlayers(s);this.renderLivePlayers(s);this.renderRanking(s);this.renderHistory(s);if(s.lastCareerDraw&&!this.canAct()&&(phase==='setup'||phase==='roll'))requestAnimationFrame(()=>$('action-panel').scrollLeft=0);}
    else{$('ranking-list').replaceChildren(node('p','empty-deck','建立房間後，玩家的旅程會出現在這裡。'));}
    if(finalAwards)this.scene?.invalidateAwardLayout();
    this.onboarding?.sync(this);
    this.tick();this.flushAudioCue();
  }
  flushAudioCue(){
    const cue=this.pendingAudioCue,s=this.state;if(!cue||!s)return;
    if(cue.phase!==s.phase||cue.round!==s.round||cue.turn!==s.turn){this.pendingAudioCue=null;return;}
    if(this.scene?.motion||this.scene?.diceMotion||this.landingPending||this.cardDrawing||this.incomeCeremony)return;
    const host=$('card-focus');if(['incomeResult','careerResult','offer','revealGroup'].includes(s.phase)&&host.hidden)return;
    this.pendingAudioCue=null;this.scene?.audioCue(cue.name,cue.key);
  }
  renderHoldingManager(current,holdings,act){
    const sale=node('section','sale-actions holding-manager');sale.setAttribute('aria-label','持有投資逐筆檢視');
    this.holdingIndex=Math.max(0,Math.min(holdings.length-1,this.holdingIndex||0));
    const holding=holdings[this.holdingIndex];
    if(!holding){this.sellSelection=null;sale.append(node('p','holding-empty','目前沒有可出售投資'),node('p','holding-cash',`目前現金 ${fmt(current.cash)}`));return sale;}
    sale.dataset.holdingId=holding.id;
    if(this.sellSelection&&this.sellSelection!==holding.id)this.sellSelection=null;
    const navigate=delta=>{if(!this.canAct())return;this.holdingIndex+=delta;this.sellSelection=null;this.render();};
    const nav=node('nav','holding-navigation');nav.setAttribute('aria-label','切換持有標的');
    button(nav,'上一筆',()=>navigate(-1),'secondary-button',!act||this.holdingIndex===0);
    const position=node('span','holding-position',`第 ${this.holdingIndex+1}／${holdings.length} 筆`);position.setAttribute('aria-live','polite');nav.append(position);
    button(nav,'下一筆',()=>navigate(1),'secondary-button',!act||this.holdingIndex===holdings.length-1);sale.append(nav);
    const confirming=this.sellSelection===holding.id,detail=node('article','holding-detail');detail.dataset.holdingId=holding.id;
    const heading=node('div','holding-heading'),art=assetIllustration(holding),name=node('h3','holding-name',holding.name);const nameParts={IF006:['歐洲央行政策','投資組合'],IF009:['外匯技術分析','自動交易程式'],ID010:['國際貴金屬','儲備倉參股'],ID009:['黃金珠寶設計','品牌入股']}[holding.id];if(nameParts?.join('')===holding.name)name.replaceChildren(...nameParts.map(part=>node('span','holding-title-part',part)));art.classList.add('holding-art');heading.append(art,name);detail.append(heading);
    const amounts=node('dl','holding-amounts'),rows=[['買入價',holding.purchasePrice??holding.price],['目前現價',holding.price],['目前現金',current.cash]];
    if(confirming)rows.push(['本筆售價',holding.price],['售後現金',current.cash+holding.price]);
    for(const[label,value]of rows){amounts.append(node('dt','',label),node('dd','',fmt(value)));}detail.append(amounts);
    const controls=node('div',confirming?'holding-controls confirming':'holding-controls');
    if(confirming){detail.append(node('p','holding-note','售出後停止取得本筆收益'));
      button(controls,'取消',()=>{this.sellSelection=null;this.render();},'secondary-button',!act).dataset.audioCue='cancel';
      button(controls,this.pending?'出售中…':'確認出售',()=>{if(this.sellSelection===holding.id)this.dispatch('sellHolding',{id:holding.id});},'primary-button',!act).dataset.audioCue='sell';
    }else button(controls,'出售這筆',()=>{if(!this.canAct())return;this.sellSelection=holding.id;this.render();},'primary-button',!act);
    detail.append(controls);sale.append(detail);return sale;
  }
  renderCardFocus(s){
    const host=$('card-focus'),pane=$('action-panel');
    this.offerReadingObserver?.disconnect();
    this.turnReadingObserver?.disconnect();
    host.dataset.phase=s.phase;
    const reading={context:this.focusCardContext,tabFocused:document.activeElement?.matches('#card-focus .hand-peek')};
    const previousCard=host.querySelector('.focus-card-frame > [data-reading-key]');
    const readingKey=previousCard?.dataset.readingKey;
    const readingScroll=previousCard?.scrollTop||0;
    const cardPhases=['setup','careerResult','income','incomeResult','deck','revealGroup','loanDecision','investIdle','offer','marketReady','marketReveal','coInvest','coInvestTarget'];host.replaceChildren();host.className='card-focus';host.onwheel=null;host.onkeydown=null;delete pane.dataset.cardFocus;host.hidden=!this.sceneReady||!cardPhases.includes(s.phase);
    if((this.scene?.motion||this.landingPending)&&['roll','deck','revealGroup','loanDecision','investIdle'].includes(s.phase))host.hidden=true;
    document.body.classList.toggle('card-focus-active',!host.hidden);
    if(host.hidden)return;
    if(s.phase==='marketReady')host.classList.add('market-ready-focus');
    if(s.phase==='offer')host.classList.add('offer-focus');
    const context=gameKey(s,s.round,s.turn,s.phase,s.cards?.length||0);
    if(this.focusCardContext!==context){
      this.focusCardContext=context;
      const firstDecision=s.phase==='revealGroup'?s.cards.findIndex(card=>card.status==='pending'):-1;
      this.focusCardIndex=Math.max(0,firstDecision);
    }
    const mount=(items,{navigation=false,footer=null}={})=>{
      if(!items.length){host.hidden=true;return;}
      for(const item of items)if(item.matches('.investment,.market-event-card')){const art=item.querySelector(':scope > .card-illustration'),kind=item.querySelector(':scope > small'),title=item.querySelector(':scope > h3, :scope > .market-card-heading');if(art&&title){if(kind)art.before(kind);art.before(title);}}
      this.focusCardIndex=Math.max(0,Math.min(items.length-1,this.focusCardIndex));
      const pendingCards=navigation?s.cards.filter(card=>card.status==='pending').length:0;
      const handProgress=navigation?`第 ${this.focusCardIndex+1}／${items.length} 張 · ${pendingCards?'待決定 '+pendingCards+' 張':'本格已結算'}`:'';
      const count=navigation?node('small','focus-hand-count',handProgress):null;
      if(count)host.append(count);
      const frame=node('div',`focus-card-frame${navigation?' card-hand-stage':''}`);
      if(navigation){
        host.classList.add('readable-hand');
        const fan=node('div','card-hand-fan');fan.setAttribute('aria-label','本格所有手牌');fan.style.setProperty('--card-count',String(items.length));
        items.forEach((item,index)=>{const selected=index===this.focusCardIndex,resolved=item.classList.contains('resolved'),kind=['career','general','lucky'].find(k=>item.classList.contains(k))||'general',tone=['positive','negative','mixed'].find(k=>item.classList.contains(k))||'neutral',title=item.querySelector('h3')?.textContent||'命運牌';const peek=button(fan,'',()=>{if(this.focusCardIndex!==index)this.scene?.audioCue('select',null,{force:true});this.focusCardIndex=index;this.render();},`hand-peek ${selected?'selected':''} ${resolved?'resolved':'pending'}`);peek.dataset.cardId=item.dataset.cardId;peek.dataset.kind=kind;peek.dataset.tone=tone;peek.setAttribute('aria-pressed',String(selected));peek.setAttribute('aria-label',`放大第 ${index+1} 張：${title}`);peek.title=title;peek.style.setProperty('--hand-index',String(index-(items.length-1)/2));peek.append(node('small','hand-kind',`${index+1} ${fateKindLabel(kind,item.dataset.cardId,true)}`));const art=item.querySelector('.card-illustration .topic-art');if(art){const miniature=art.cloneNode(true);miniature.classList.add('hand-event-art');peek.append(miniature);}peek.append(node('strong','hand-title',shortCardTitle(item.dataset.cardId,title)),node('small','hand-effect',!resolved?'待選':({positive:'有利 ✓',negative:'不利 ✓',mixed:'得失 ✓',neutral:'完成 ✓'})[tone]));});
        items[this.focusCardIndex].classList.add('hand-focus-card');frame.append(items[this.focusCardIndex]);host.append(fan,frame);this.carouselNavigate=delta=>{this.focusCardIndex=(this.focusCardIndex+delta+items.length)%items.length;this.render();};host.tabIndex=0;host.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.stopPropagation();event.preventDefault();this.carouselNavigate(event.key==='ArrowLeft'?-1:1);}};
      }else{frame.append(items[this.focusCardIndex]);host.append(frame);host.onwheel=null;host.removeAttribute('tabindex');this.carouselNavigate=null;}
      if(footer)host.append(footer);
      mountCardDelivery(host);this.armOfferControls(host);pane.dataset.cardFocus='true';
      const selected=items[this.focusCardIndex],entryKey=gameKey(s,s.round,s.turn,s.phase,this.focusCardIndex,selected.dataset.cardId||selected.className,selected.classList.contains('resolved'));
      if(navigation)this.prepareTurnReading(selected);
      selected.dataset.readingKey=entryKey;
      if(entryKey===readingKey&&readingScroll)selected.scrollTop=readingScroll;
      if(entryKey!==this.cardEntryKey){this.cardEntryKey=entryKey;this.cardEntrance?.cancel();if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const settled=selected.classList.contains('resolved');
        const reveal=s.phase==='revealGroup'&&this.lastRevealBatch!==this.focusCardContext;
        if(reveal)this.lastRevealBatch=this.focusCardContext;
        const frames=reveal?[
          {transform:'perspective(850px) translateY(-16px) rotateY(-68deg) scale(.85)',opacity:.48},
          {transform:'perspective(850px) rotateY(5deg) scale(1.01)',opacity:1,offset:.78},
          {transform:'none',opacity:1}
        ]:[{transform:settled?'translateY(5px) scale(.98)':'translateY(8px)',opacity:.78},{transform:'none',opacity:1}];
        this.cardEntrance=frame.animate(frames,{duration:reveal?390:230,easing:'cubic-bezier(.2,.75,.2,1)'});}}
      if(count){
        const fan=host.querySelector('.card-hand-fan');
        const tab=fan.querySelector('.selected');
        if(tab){
          const bounds=fan.getBoundingClientRect(), selectedTab=tab.getBoundingClientRect();
          if(selectedTab.left<bounds.left)fan.scrollLeft+=selectedTab.left-bounds.left-3;
          else if(selectedTab.right>bounds.right)fan.scrollLeft+=selectedTab.right-bounds.right+3;
        }
        if(reading?.context===context){
          if(reading.tabFocused)host.querySelector('.hand-peek.selected')?.focus({preventScroll:true});

        }
        requestAnimationFrame(()=>{
          if(count.isConnected&&selected.scrollHeight>selected.clientHeight+2)count.textContent=handProgress+' · 可上下滑動';
        });
      }
    };
    if(s.phase==='loanDecision'){
      host.classList.add('loan-focus');
      const wrap=node('div','focus-loan');
      for(const item of pane.querySelectorAll(':scope > .loan-card, :scope > .loan-flow, :scope > .waiting-card'))wrap.append(item);
      host.append(wrap);
      const confirm=wrap.querySelector('.loan-confirm');
      if(compactOfferLayout.matches&&confirm){
        const actions=node('div','turn-panel-actions');
        actions.append(confirm);
        host.append(actions);
      }else if(compactOfferLayout.matches){
        const modes=wrap.querySelector('.loan-mode-row');
        if(modes){
          modes.classList.add('turn-panel-actions');
          host.append(modes);
        }
      }
      pane.dataset.cardFocus='true';
      this.prepareTurnReading(wrap);
      if(this.loanEntryRequested){
        const input=wrap.querySelector('.loan-entry input');
        if(compactOfferLayout.matches&&input){
          const summary=wrap.querySelector('.loan-confirm-summary');
          wrap.scrollTop=Math.max(0,summary.getBoundingClientRect().bottom-wrap.getBoundingClientRect().bottom+8);
        }
        if(this.loanEntryRequested==='keyboard')input?.focus({preventScroll:true});
        this.loanEntryRequested=null;
      }
      return;
    }
    if(s.phase==='investIdle'){
      host.classList.add('investment-focus');const current=s.players[s.turn],wrap=node('div','focus-invest-grid');wrap.append(node('strong','focus-invest-heading',`選擇投資 · ${current.investDraws}/3`));const remaining=new Set(unusedAssets(s.round,new Set(s.usedAssets)).map(card=>card.category));const grid=node('div','focus-invest-options');for(const [key,name] of Object.entries(categoryNames)){const locked=key==='crypto'&&s.round<4,used=current.investCategories.includes(key),limit=current.investDraws>=3,exhausted=!remaining.has(key);const tile=button(grid,'',()=>this.startAssetDraw(key),`focus-invest-choice ${key}`,!this.canAct()||locked||used||limit||exhausted||Boolean(this.assetDrawing));tile.append(assetIllustration({category:key}),node('strong','',name),node('small','',locked?'第 4 回合開放':used?'已抽':limit?'已抽滿':exhausted?'本局已抽完':'抽卡'));}wrap.append(grid);if(this.assetDrawing){wrap.classList.add('asset-drawing');const draw=node('div','asset-draw-stack');draw.setAttribute('role','status');draw.append(node('div','card-back',categoryNames[this.assetDrawing.category]),node('strong','','正在抽出投資卡…'));wrap.append(draw);}
      const owner=this.seat===this.actor,sale=pane.querySelector(':scope > .sale-actions');if(sale&&owner){const count=(current.holdings||[]).filter(h=>h.category!=='special'&&!h.recoverNext).length;button(wrap,this.salesExpanded?'返回投資選擇':`管理持有投資 · ${count}`,()=>{this.salesExpanded=!this.salesExpanded;this.sellSelection=null;this.render();},'focus-sale-toggle',!this.canAct());sale.hidden=!this.salesExpanded;grid.hidden=Boolean(this.salesExpanded);wrap.append(sale);if(this.salesExpanded){host.classList.add('holdings-focus');wrap.querySelector('.focus-invest-heading').textContent='持有投資';}}
      else sale?.remove();
      const end=pane.querySelector(':scope > .secondary-button');
      host.append(wrap);
      if(end&&owner){
        const footer=node('div','investment-exit');
        if(this.sellSelection)footer.append(node('small','','先確認或取消本筆出售'));
        end.disabled=!this.canAct()||Boolean(this.sellSelection);
        footer.append(end);
        if(compactOfferLayout.matches){
          footer.classList.add('turn-panel-actions');
          host.append(footer);
        }else wrap.append(footer);
      }else end?.remove();
      mountCardDelivery(host);pane.dataset.cardFocus='true';return;
    }
    if(s.phase==='deck'){
      const next=s.queue[0],kind=next?.kind||'general',wrap=node('div',`focus-draw-card ${kind}${this.cardDrawing?' drawing':''}`);
      const backs=node('div','focus-back-fan');for(const [index,item] of s.queue.entries()){const back=node('span',`focus-back-card ${item.kind}`,{general:'?',career:'▣',lucky:'✦'}[item.kind]);back.style.setProperty('--fan-position',String(index-(s.queue.length-1)/2));backs.append(back);}
      if(this.cardDrawing){
        const flight=node('span','draw-flight');
        flight.setAttribute('aria-hidden','true');
        flight.style.setProperty('--flight-time',this.cardDrawing.duration+'ms');
        flight.style.animationDelay=-(performance.now()-this.cardDrawing.started)+'ms';
        backs.append(flight);
      }
      wrap.append(node('small','focus-progress',`本格 ${s.queue.length} 張`),backs,node('strong','',`抽出全部卡牌`),node('span','',this.cardDrawing?'翻牌中…':this.canAct()?'點牌堆抽卡':'等待玩家抽牌'));
      if(this.canAct()&&!this.cardDrawing&&!this.scene?.motion&&!this.scene?.diceMotion){wrap.tabIndex=0;wrap.setAttribute('role','button');wrap.setAttribute('aria-label',`抽出 ${s.queue.length} 張卡`);wrap.onclick=()=>this.startCardDraw(false);wrap.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.startCardDraw(false);}};}
      host.append(wrap);if(this.canAct()&&worth(s.players[s.turn])>=5000000&&s.queue.some(item=>item.kind==='general'))button(host,'極限命運',()=>this.startCardDraw(true),'focus-extreme-button',Boolean(this.cardDrawing||this.scene?.motion||this.scene?.diceMotion));return;
    }
    const selector=s.phase==='revealGroup'?':scope > .fate-card-game':s.phase==='offer'?':scope > .fate-card-game.investment':['setup','careerResult'].includes(s.phase)?':scope > .role-reveal-card, :scope > .action-card':':scope > .action-card';
    const cards=[...pane.querySelectorAll(selector)];
    if(s.phase==='revealGroup'){const next=pane.querySelector(':scope > .primary-button');if(!cards.length){const empty=pane.querySelector(':scope > .empty-fate-card');if(empty){mount([empty]);if(next)host.append(next);}else{host.hidden=true;document.body.classList.remove('card-focus-active');}return;}mount(cards,{navigation:true});if(next)host.append(next);const waiting=pane.querySelector(':scope > .waiting-card');if(waiting){waiting.classList.add('hand-waiting-status');waiting.setAttribute('role','status');host.append(waiting);}return;}
    if(!cards.length){host.hidden=true;document.body.classList.remove('card-focus-active');return;}
    const item=cards.at(-1),externalAction=['careerResult','incomeResult'].includes(s.phase);if(item.classList.contains('role-reveal-card'))host.classList.add('career-focus');if(s.phase==='coInvestTarget'){host.classList.add('partner-focus');const options=pane.querySelector(':scope > .choice-list');if(options)item.append(options);}if(s.phase==='marketReveal'){const grid=pane.querySelector(':scope > .market-grid');if(grid)item.append(grid);}
    let cardFooter=null;
    if (['setup','income','offer','marketReady','marketReveal','coInvest','coInvestTarget'].includes(s.phase) && !externalAction) {
      const buttons = [...pane.querySelectorAll(':scope > .primary-button, :scope > .secondary-button')];
      if (s.phase === 'offer' && buttons.length) {
        const actions = node('div', 'offer-actions');
        buttons[0].dataset.audioCue='buy';
        buttons[1].dataset.audioCue='cancel';
        actions.append(...buttons);
        if(compactOfferLayout.matches)cardFooter=actions;
        else item.append(actions);
      } else if(compactOfferLayout.matches&&compactTurnActionPhases.has(s.phase)&&buttons.length){
        cardFooter=node('div','turn-panel-actions');
        cardFooter.append(...buttons);
      } else {
        item.append(...buttons);
      }
    }
    if(s.phase==='coInvest'){const waiting=pane.querySelector(':scope > .waiting-card');if(waiting){waiting.classList.add('invitation-waiting');waiting.setAttribute('role','status');item.append(waiting);}}
    mount([item],{footer:cardFooter});
    if(compactOfferLayout.matches){
      if(s.phase==='offer')this.prepareOfferReading(item,host,cardFooter);
      else this.prepareTurnReading(item);
    }
    if(externalAction)for(const action of pane.querySelectorAll(':scope > .primary-button, :scope > .secondary-button'))host.append(action);
  }
  renderPlayers(s){
    const strip=$('player-strip');strip.replaceChildren();
    if(s.phase==='lobby')return;
    for(const p of s.players){const item=node('div',`player-chip${p.seat===this.actor?' active':''}${p.seat===this.seat?' mine':''}`);item.append(node('b','',this.displayName(p.seat)),node('small','',`第 ${p.position} 格 · ${fmt(worth(p))}`));strip.append(item);}
    if(s.lastRoll&&this.lastShownRoll!==s.lastRoll.id)this.lastShownRoll=s.lastRoll.id;
  }
  renderLivePlayers(s){
    const panel=$('players-live'),scroll=panel.scrollLeft;panel.replaceChildren();$('finance-nav').hidden=s.phase==='lobby'||s.players.length<2;
    if(s.phase==='lobby'){this.prevFinanceBySeat=new Map();this.financeFlashes=new Map();return;}
    if(!this.prevFinanceBySeat)this.prevFinanceBySeat=new Map();
    if(!this.financeFlashes)this.financeFlashes=new Map();
    const now=Date.now();
    for(const p of s.players){
      const item=node('article',`live-player${p.seat===this.actor?' active':''}${p.seat===this.seat?' mine':''}${p.seat===this.scene?.viewSeat?' observed':''}`);item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label',`觀看 ${this.displayName(p.seat)} 的角色`);item.title=`觀看 ${this.displayName(p.seat)} 的角色`;item.onclick=()=>this.focusPlayer(p.seat);item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.focusPlayer(p.seat);}};
      const head=node('div','live-player-head');head.append(node('b','',this.displayName(p.seat)),node('span','',p.career?.name||'待抽職業'));item.append(head);
      const values=node('div','live-values'),holdings=p.holdings||[],assets=holdings.reduce((sum,asset)=>sum+(asset.price||0),0),decision=p.loanDecision?.round===s.round?p.loanDecision:null;
      const curWorth=worth(p);
      const prev=this.prevFinanceBySeat.get(p.seat);
      const nextSnapshot={worth:curWorth,cash:p.cash||0,assets,debt:p.debt||0};
      const metricDefs=[
        ['worth','淨資產',curWorth,'kpi-networth',false],
        ['cash','現金',p.cash||0,'',false],
        ['assets',holdings.length?`投資 (${holdings.length})`:'投資',assets,'',false],
        ['debt','負債',p.debt||0,'',true],
      ];
      for(const [key,label,value,extraClass,invertSign] of metricDefs){
        const flashKey=`${p.seat}:${key}`;
        if(prev&&Math.abs(value-prev[key])>0.001){
          const increased=value>prev[key];
          const isGood=invertSign?!increased:increased;
          this.financeFlashes.set(flashKey,{dir:isGood?'good':'bad',until:now+2200});
        }
        const activeFlash=this.financeFlashes.get(flashKey);
        const flashClass=activeFlash&&activeFlash.until>now?(activeFlash.dir==='good'?'stat-flash-good':'stat-flash-bad'):'';
        if(activeFlash&&activeFlash.until<=now)this.financeFlashes.delete(flashKey);
        const text=s.phase==='loanDecision'?formatLoanMoney(value):fmt(value);
        const cell=node('div',[extraClass,flashClass,text.length>14?'wide-money':''].filter(Boolean).join(' '));
        if(flashClass){
          const remaining=Math.max(200,activeFlash.until-now);
          setTimeout(()=>cell.classList.remove('stat-flash-good','stat-flash-bad'),remaining);
        }
        cell.append(node('small','',label),node('strong','',text));
        values.append(cell);
      }
      this.prevFinanceBySeat.set(p.seat,nextSnapshot);
      if(decision){const loan=node('div','loan-status');loan.append(node('small','',decision.kind==='borrow'?'本回合新借款':decision.kind==='repay'?'本回合提前還款':'本回合借貸'),node('strong','',decision.kind==='skip'?'未借款':fmt(decision.amount)));values.append(loan);}
      item.append(values);
      if(s.phase==='loanDecision'&&[p.cash,p.debt,assets].some(n=>!Number.isInteger(n)))item.append(node('small','finance-precision-note','餘額顯示至分（不進位）。'));
      if(holdings.length){
        const assetList=node('div','holding-list');
        for(const holding of holdings){
          const row=node('div','holding-row'),pair=node('div','holding-price-pair');
          row.append(node('span','',holding.name||'投資項目'));
          pair.append(node('b','',holding.category==='special'?`持有 ${fmt(holding.price)}`:`現值 ${fmt(holding.price)}`));
          row.append(pair);
          assetList.append(row);
        }
        item.append(assetList);
      }
      const details=node('details','live-more');
      details.onclick=event=>event.stopPropagation();
      details.onkeydown=event=>event.stopPropagation();
      details.append(node('summary','','收支與帳務明細'));
      const moreGrid=node('div','live-values live-values-secondary');
      for(const [label,value] of [['主動收入',p.income],['固定支出',p.career?.fixedExpense],['本回合被動收入',p.passiveIncome||0],['下回合預計被動',p.pendingPassive||0],['待結算管理收益',p.extraPassive||0],['起始負債',p.career?.initialDebt]]){
        const text=s.phase==='loanDecision'?formatLoanMoney(value):fmt(value),cell=node('div',text.length>15?'wide-money':'');
        cell.append(node('small','',label),node('strong','',text));
        moreGrid.append(cell);
      }
      details.append(moreGrid,node('strong','holding-formula',s.phase==='loanDecision'?financeFormula(p.cash,assets,p.debt):`${fmt(p.cash)} + ${fmt(assets)} − ${fmt(p.debt)} = ${fmt(worth(p))}`));
      item.append(details);
      panel.append(item);
    }
    if(s.phase==='loanDecision'){
      if(this.loanFinanceSeat!==s.turn){const active=panel.children[s.turn];if(active){const delta=active.getBoundingClientRect().left-panel.getBoundingClientRect().left+panel.scrollLeft;panel.scrollLeft=Math.max(0,delta);}this.loanFinanceSeat=s.turn;}
    }else{this.loanFinanceSeat=null;panel.scrollLeft=scroll;}
  }
  renderRoleCard(parent,draw){
    const role=CAREERS.find(item=>item.id===draw?.careerId);if(!role)return;
    const box=node('article','role-reveal-card crafted-career-card');box.dataset.career=role.id;const heading=node('header','career-card-heading');const owner=node('small','');const total=this.state?.players.length;
    const progress=Number.isInteger(draw.drawNumber)&&draw.drawNumber>=1&&draw.drawNumber<=total
      ? `職業揭曉 · ${draw.drawNumber}／${total}` : '職業揭曉';
    cardOwner(owner,this.displayName(draw.seat),progress,()=>this.showBoardInfo('玩家名稱',this.displayName(draw.seat),'本局玩家'));heading.append(owner,node('strong','',role.name));box.append(heading);
    const portrait=node('div','role-portrait'),img=node('img','career-portrait-image career-illustration');img.src=careerArt(role.id);img.alt=role.name;portrait.append(img);box.append(portrait);
    const income=node('div','career-income-band');income.append(node('small','',role.incomeReference.includes('–')?'浮動回合收入範圍':'固定每回合收入'),node('strong','',`$${role.incomeReference}`));box.append(income);
    const stats=node('div','role-card-stats');for(const [label,value] of [['起始現金',role.initialCash],['固定支出',role.fixedExpense],['原有貸款',role.initialDebt]]){const row=node('span','');row.append(node('small','',label),node('b','',fmt(value)));stats.append(row);}box.append(stats);parent.append(box);
  }
  showBoardInfo(title,message,detail,steps=[]){openBoardInfo(this,{title,message,detail,steps});}
  inspectTile(tile){
    const {name,location}=WORLD_STOPS[tile.n];
    const occupants=this.state?.players?.filter(player=>player.position===tile.n)||[];
    if(occupants.length){
      const note=tile.general?`一般 ${tile.general} 張・職業 ${tile.career||0} 張`:'開局隨機分邊';
      this.showBoardInfo(name,`${note} · 本格 ${occupants.length} 位玩家`,location ? location+' · 同格玩家' : '起點 · 同格玩家',occupants.map(player=>`${this.displayName(player.seat)} · ${player.career?.name||'待抽職業'}`));
      return;
    }
    if(!tile.general){this.showBoardInfo(name,'玩家開局時隨機分配到國際機場或環球郵輪港。','棋盤起點');return;}
    this.showBoardInfo(name,`抵達後，抽取一般命運 ${tile.general}\u00a0張、職業命運 ${tile.career||0}\u00a0張。${tile.type==='lucky'?'經過此角另得一張小確幸卡。':''}`,location);
  }
  inspectDistrict(zone,name){
    const rules={
      garden:['抵達後，抽取本格命運卡。','經過小確幸角：另得一張小確幸卡。'],
      finance:['所有玩家完成移動及投資。','翻出共同市場事件。','事件調整資產市價與收益。'],
      harbor:['開局隨機分配到國際機場或環球郵輪港。','玩家依序沿 20 格路線前進。']
    };
    this.showBoardInfo(name,'','城市街區 · 玩法提示',rules[zone]||[]);
  }
  inspectCrowd(){
    const players=this.state?.players||[],position=players.find(p=>p.seat===this.scene?.followSeat)?.position;
    const group=players.filter(p=>p.position===position);
    if(position===undefined||group.length<2)return;
    let dialog=$('crowd-names-dialog');if(!dialog){dialog=node('dialog','crowd-names-dialog');dialog.id='crowd-names-dialog';document.body.append(dialog);}dialog.replaceChildren();const heading=node('div','crowd-dialog-heading');heading.append(node('strong','',`同格 ${group.length} 位玩家`));button(heading,'關閉名單',()=>dialog.close(),'secondary-button');dialog.append(heading,node('p','','選擇玩家，在棋盤上辨識位置。'));const list=node('div','crowd-player-list');for(const p of group)button(list,`${p.seat} · ${this.displayName(p.seat)} · ${p.career?.name||'待抽職業'}`,()=>{this.focusPlayer(p.seat,{preserveView:true});dialog.close();$('world-stage').querySelector('.crowd-selection')?.remove();const selected=node('div','crowd-selection',`已選中 ${p.seat} · ${this.displayName(p.seat)} · ${p.career?.name||'待抽職業'}`);$('world-stage').append(selected);},'secondary-button');const mobile=innerWidth<=800;const bounds=group.map(p=>this.scene?.projectBounds(this.scene.pawns.get(p.seat)?.root)).filter(b=>b?.inFront);const safeTop=Math.max(72,...bounds.map(b=>b.bottom))+12;dialog.style.setProperty('--crowd-safe-top',`${safeTop}px`);dialog.append(list,pageItems([...list.children],mobile?3:6));dialog.showModal();
  }
  prepareTurnReading(surface){
    if(!compactOfferLayout.matches)return;
    const update=()=>{
      if(!surface.isConnected)return;
      if(surface.scrollHeight>surface.clientHeight+2)surface.tabIndex=0;
      else surface.removeAttribute('tabindex');
    };
    this.turnReadingObserver=new ResizeObserver(update);
    this.turnReadingObserver.observe(surface);
    update();
  }
  prepareOfferReading(card,host,actions){
    const hint=node('p','offer-reading-status','上下滑動查看完整投資條件');
    hint.id='offer-reading-status';
    hint.hidden=true;
    (actions||host).prepend(hint);
    const heading=card.querySelector('h3');
    heading.id='offer-reading-heading';
    const update=()=>{
      const scrollable=card.scrollHeight-card.clientHeight>2;
      hint.hidden=!scrollable;
      if(scrollable){
        card.tabIndex=0;
        card.setAttribute('aria-labelledby',heading.id);
        card.setAttribute('aria-describedby',hint.id);
      }else{
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-labelledby');
        card.removeAttribute('aria-describedby');
      }
    };
    this.offerReadingObserver=new ResizeObserver(update);
    this.offerReadingObserver.observe(card);
    update();
  }
  armOfferControls(host){
    const card=host.querySelector('.investment[data-offer-entry="entering"]');
    if(!card)return;
    requestAnimationFrame(async()=>{
      const entrance=card.getAnimations().filter(animation=>animation.animationName==='cardFlip');
      await Promise.all(entrance.map(animation=>animation.finished.catch(()=>{})));
      // Wait one frame after the final transform before exposing the controls.
      requestAnimationFrame(()=>{
        if(!card.isConnected||this.state?.phase!=='offer')return;
        card.dataset.offerEntry='ready';card.removeAttribute('aria-busy');
        for(const button of host.querySelectorAll('[data-offer-allowed]'))button.disabled=!this.canAct()||button.dataset.offerAllowed!=='true';
      });
    });
  }
  clearMarketFx(){
    this.scene?.gameAudio?.cancel('market');clearTimeout(this.marketIntroTimer);this.marketIntroActive=false;
    $('world-stage').querySelector('.market-fx')?.remove();$('world-stage').classList.remove('market-shock');
  }
  marketFx(event){
    this.clearMarketFx();
    const presentationKey=this.lastMarketPresentationKey,remaining=Math.max(0,Math.min(MARKET_INTRO_MS,this.deadline-MARKET_READING_MS-(Date.now()+this.serverOffset)));
    if(this.scene?.reducedMotion){this.scene.audioCue('market',presentationKey);return;}
    if(remaining<=0)return;
    this.marketIntroActive=true;
    const stage=$('world-stage'),fx=node('div','market-fx');fx.append(node('span','market-fx-symbol','↗'),node('small','','共同市場事件'),node('strong','',marketTitle(event)||'市場變動'));fx.dataset.cardId=event.id;
    const movers=[...event.assetEffect].map((effect,index)=>({index,change:Math.round(effect*100)})).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,3);
    const chips=node('div','market-fx-chips');for(const {index,change} of movers){chips.append(node('span',change>0?'up':change<0?'down':'flat',`${['股票','房地產','創業','貴金屬','加密貨幣','外匯'][index]} ${change>0?'+':''}${change}%`));}fx.append(chips);
    fx.style.animationDelay=`${remaining-MARKET_INTRO_MS}ms`;
    stage.querySelector('.market-fx')?.remove();stage.append(fx);stage.classList.add('market-shock');this.scene?.audioCue('market',presentationKey);this.marketIntroTimer=setTimeout(()=>{if(this.state?.phase!=='marketReveal'||this.lastMarketPresentationKey!==presentationKey)return;this.clearMarketFx();this.render();},remaining);
  }
  renderRanking(s){
    const list=$('ranking-list');list.replaceChildren();if(s.phase==='lobby'){list.append(node('p','empty-deck',`已加入 ${this.members.length}／${this.targetCount} 人`));return;}
    const sorted=roundStandings(s),leader=Math.max(1,sorted[0]?.amount??0);
    sorted.forEach(({player:p,cash,debt,investments,amount},i)=>{
      const mine=p.seat===this.seat;
      const tile=node('article',`rank-tile${mine?' mine':''}`),avatar=node('span','rank-avatar',p.career?.name?.slice(0,1)||'●');
      const copy=node('div','rank-copy'),head=node('div','rank-head');
      const name=node('strong','',`${i+1}. ${this.displayName(p.seat)}`);
      if(mine)name.append(node('span','result-seat','你'));
      head.append(name,node('b','',`淨資產 ${fmt(amount)}`));
      copy.append(head,node('small','rank-breakdown',`現金 ${fmt(cash)} · 投資現值 ${fmt(investments)} · 負債 ${fmt(debt)}`));
      const meter=node('div','rank-meter'),fill=node('i','');
      fill.style.width=`${Math.max(0,Math.min(100,amount/leader*100))}%`;
      meter.append(fill);copy.append(meter);tile.append(avatar,copy);list.append(tile);
    });
  }
  renderHistory(s){
    const list=$('history-list'),focusedRound=list.contains(document.activeElement)?document.activeElement?.dataset.historyRound:null;
    list.replaceChildren();const entries=s.history||[];
    if(!entries.length){list.append(node('p','empty-deck','開局後，重要決策與結果會記錄在這裡。'));return;}
    const epoch=gameKey(s,this.code);
    if(this.historyEpoch!==epoch){this.historyEpoch=epoch;this.historyRound=null;}
    const groups=historyByRound(entries);
    const rounds=[...groups.keys()].sort((a,b)=>a-b);
    const active=groups.has(this.historyRound)?this.historyRound:rounds.at(-1);
    const nav=node('div','history-rounds');
    nav.setAttribute('role','group');nav.setAttribute('aria-label','選擇回合');
    for(const round of rounds){
      const control=button(nav,`第 ${round} 回合`,()=>{
        this.historyRound=round;list.scrollTop=0;this.renderHistory(s);
      },'history-round');
      control.dataset.historyRound=String(round);control.setAttribute('aria-pressed',String(round===active));
    }
    list.append(nav);
    for(const entry of [...groups.get(active)].reverse()){
      const tile=node('article','history-tile');tile.dataset.rawDescription=entry.description;
      tile.append(node('span','history-marker',entry.seat==='系統'?'✦':this.displayName(entry.seat).slice(0,1)),
        node('small','',`第 ${entry.round} 回合 · ${entry.seat==='系統'?'系統結算':this.displayName(entry.seat)}`),
        node('div','',this.visibleText(entry.description)));
      list.append(tile);
    }
    if(focusedRound)nav.querySelector(`[data-history-round="${focusedRound}"]`)?.focus({preventScroll:true});
  }
  renderActions(s){
    const pane=$('action-panel'),viewKey=gameKey(s,s.round,s.turn,s.phase,s.lastCareerDraw?.drawNumber||0);
    pane.dataset.phase=s.phase;
    if(pane.dataset.viewKey!==viewKey){pane.dataset.viewKey=viewKey;requestAnimationFrame(()=>{if(pane.dataset.viewKey===viewKey)pane.scrollLeft=0;});}
    const invitation=$('copy-invite');if(pane.contains(invitation))document.querySelector('.panel-bottom').append(invitation);
    pane.replaceChildren();const act=this.canAct(),me=s.players.find(p=>p.seat===this.seat);
    const heading=node('div','tray-heading');heading.append(node('small','',`第 ${s.round}／5 回合`),node('strong','',phaseNames[s.phase]||'遊戲進行中'),node('span','tray-timer',''));heading.lastChild.id='action-timer';pane.append(heading);
    if((this.scene?.motion||this.landingPending)&&['roll','deck','revealGroup'].includes(s.phase)){
      const step=this.landingPending?'已抵達 · 骰子結果展示中':this.scene.motion.phase==='dice'?'骰子正在滾動':`正在前進 · ${this.scene.motion.step+1}／${this.scene.motion.path.length} 格`;
      card(pane,'擲骰前進',step,'角色抵達終點後才會出牌。','action-card gold motion-progress');
      return;
    }
    if(s.phase==='lobby'){
      const info=card(pane,'房間代碼',this.code,`已加入 ${this.members.length}／${this.targetCount} 人。全員到齊後，任何玩家都能開始。`,'action-card dark');info.classList.add('room-code-card');
      info.querySelector('h3').className='room-code';
      const names=node('p','',this.members.map(p=>p.nickname).join(' · '));info.append(names,invitation);
      button(pane,this.members.length===this.targetCount?'開始五回合對決':'等待其他玩家加入',()=>this.dispatch('start'),'primary-button',!act);
      return;
    }
    if(s.phase==='setup'){
      if(s.lastCareerDraw)this.renderRoleCard(pane,s.lastCareerDraw);
      if(!act){this.waiting(pane,`${this.actorName()} 正在抽職業卡`,'房間會同步揭曉每位玩家抽到的角色。');return;}
      const deck=card(pane,'職業牌庫','抽一張職業卡','每種職業最多 2 人。','action-card gold');
      const fan=node('div',`deck-fan${this.careerDrawing?' career-dealing':''}`);fan.setAttribute('aria-hidden','true');for(let index=0;index<4;index++)fan.append(node('span','deck-back','職業'));deck.append(fan);
      button(pane,this.careerDrawing?'抽牌中…':'抽職業',()=>this.startCareerDraw(),'primary-button big-roll',this.pending||Boolean(this.careerDrawing));
      return;
    }
    if(s.phase==='careerResult'){
      this.renderRoleCard(pane,s.lastCareerDraw);
      if(act)button(pane,'繼續',()=>this.dispatch('nextCareer'),'primary-button');
      else this.waiting(pane,`等待 ${this.actorName()} 確認職業`,'倒數結束後會自動繼續。');
      return;
    }
    if(s.phase==='income'){
      const current=s.players[s.incomeIndex],pool=current.activeIncomePool?null:INCOME_POOLS[current.career.id],variable=current.activeIncomePool||pool?.length>1;
      const drawing=act&&this.incomeCeremony?.seat===current.seat;
      const surface=card(pane,variable?'抽取職業收入':'領取固定薪資',current.activeIncomePool?'原職業：'+current.career.name:current.career.name,drawing?(variable?'洗牌中…':'入帳中…'):'',`action-card gold income-card ${variable?'variable':'fixed'}${drawing?' income-drawing':''}`);
      surface.dataset.career=current.career.id;cardOwner(surface.querySelector('small'),this.displayName(current.seat),variable?'抽取職業收入':'領取固定薪資',()=>this.showBoardInfo('玩家名稱',this.displayName(current.seat),'本局玩家'));
      if(!drawing){surface.append(setNativeCardArt(illustration('cash','職業收入'),incomeArt(current.career.id,Boolean(variable))));const amount=node('div','income-preview-amount');amount.append(node('small','',`${current.activeIncomePool?'自營商收入':variable?'浮動職業收入':'本回合應領固定薪資'} · 第 ${s.round} 回合`),node('strong','',variable?'翻牌揭曉':fmt(pool?.[0]??current.income)));surface.append(amount);const context=node('div','income-preview-context');for(const [label,value] of [['固定支出',current.career.fixedExpense],['目前現金',current.cash],['目前負債',current.debt]]){const line=node('div','');line.append(node('span','',label),node('b','',fmt(value)));context.append(line);}surface.append(context,node('p','income-preview-note',variable?'抽牌後結算本回合收入、支出與還款。':'領取後一併結算固定支出與貸款還款。'));}
      if(drawing){
        const motion=node('div',variable?'income-card-stack':'income-pay-slip');motion.style.setProperty('--income-duration',`${this.incomeCeremony.duration}ms`);motion.setAttribute('role','status');motion.setAttribute('aria-label',variable?'正在抽收入卡':'正在領取固定收入');
        if(variable)for(let index=0;index<3;index++)motion.append(node('span','income-card-back','收入'));
        else motion.append(node('span','income-stamp','入帳中'));
        surface.append(motion);
      }
      if(act){if(!drawing)button(pane,variable?'抽取收入卡':'領取固定薪資',()=>this.startIncomeCeremony(variable),'primary-button big-roll');}
      else this.waiting(pane,`等待 ${this.actorName()} ${variable?'抽收入':'領收入'}`,'倒數結束後系統會自動處理。');
      return;
    }
    if(s.phase==='incomeResult'){
      const result=s.incomeReveal,current=s.players[s.incomeIndex];
      const incomeType=current.activeIncomePool?'自營商收入':result.source==='固定'?'固定薪資':'抽取職業收入',revealKey=gameKey(s,'income',s.round,current.seat);if(!this.cardFlipSeen.has(revealKey))this.cardFlipSeen.set(revealKey,Date.now());const revealing=Date.now()-this.cardFlipSeen.get(revealKey)<650;
      const detail=card(pane,result.source==='固定'?'固定薪資已入帳':'職業收入卡已翻開',current.activeIncomePool?'原職業：'+current.career.name:current.career?.name||'職業','',`action-card gold income-card income-revealed ${result.source==='固定'?'fixed':'variable'}${revealing?' income-reveal-animating':''}`);const headline=node('div','career-income-band');detail.dataset.career=current.career.id;cardOwner(detail.querySelector('small'),this.displayName(current.seat),result.source==='固定'?'固定薪資已入帳':'職業收入卡已翻開',()=>this.showBoardInfo('玩家名稱',this.displayName(current.seat),'本局玩家'));headline.append(node('small','',`第 ${s.round} 回合 · ${incomeType}`),node('strong','',fmt(result.amount)));detail.append(setNativeCardArt(illustration('cash','職業收入'),incomeArt(current.career.id,result.source!=='固定')),headline);
      const metrics=node('div','decision-metrics');
      const incomeRows=[
        ['固定支出',result.fixedExpense],
        ['貸款還款',result.repayment],
        ...(result.passiveIncome?[['被動收入',result.passiveIncome]]:[]),
        ...(result.recovered?[['本金回收',result.recovered]]:[]),
        ...(result.futureNet||result.futureEffects?.length?[['卡片合計',result.futureNet]]:[]),
        ['目前現金',current.cash],
      ];
      for(const [label,value] of incomeRows){const line=node('span',''),labelNode=node('small','',label);if(label==='卡片合計'&&result.futureEffects?.length){labelNode.replaceChildren();const link=node('button','income-impact-link','卡片合計 ⓘ');link.type='button';link.setAttribute('aria-label','查看前回合卡片明細');link.onclick=()=>{const items=incomeImpactItems(result.futureEffects);this.showBoardInfo('前回合卡片明細','卡片合計 '+signedCardCash(result.futureNet,fmt),'依卡片原始收入與支出分類',incomeImpactLines(result.futureEffects,fmt));document.querySelectorAll('#board-info-dialog .board-info-list li').forEach((line,index)=>line.classList.add(items[index].beneficial?'card-impact-favorable':'card-impact-adverse'));};labelNode.append(link);}line.append(labelNode,node('b',label==='卡片合計'?(value>0?'card-impact-favorable':value<0?'card-impact-adverse':''):'',label==='卡片合計'?signedCardCash(value,fmt):fmt(value)));metrics.append(line);}detail.append(metrics);
      if(act)button(pane,'繼續',()=>this.dispatch('nextIncome'),'primary-button');
      else this.waiting(pane,`等待 ${this.actorName()} 確認`,'倒數結束後會自動繼續。');
      return;
    }
    if(s.phase==='roll'){
      if(!act){const status=node('div','waiting-card roll-waiting'),title=node('strong','');status.setAttribute('role','status');status.title='倒數結束後，系統會自動擲骰並繼續。';title.setAttribute('aria-label',`${this.actorName()} 準備擲骰`);title.append(node('span','roll-wait-player',this.actorName()),node('span','roll-wait-action','準備擲骰'));status.append(title);pane.append(status);return;}
      card(pane,'輪到你了',`${this.displayName(this.seat)}，擲骰前進`,`${me?.career?.name||''} · 第 ${me?.position} 格 · 淨資產 ${fmt(worth(me))}`,'action-card gold');
      button(pane,'擲骰',()=>this.dispatch('roll'),'primary-button big-roll',Boolean(this.scene?.motion||this.scene?.diceMotion));
      return;
    }
    if(s.phase==='deck'){
      const destination=BOARD_NAMES[s.players[s.turn]?.position]||'新格',kinds={general:0,career:0,lucky:0};for(const item of s.queue)kinds[item.kind]=(kinds[item.kind]||0)+1;
      const next=s.queue[0],nextName={general:'一般命運',career:'職業命運',lucky:'小確幸'}[next?.kind]||'命運';
      const deck=card(pane,'命運牌堆',`${destination} · 待抽 ${s.queue.length} 張`,`下一張：${nextName}`,'action-card gold landing-card');
      const counts=node('div','deck-draw-counts');for(const [kind,name] of [['general','● 一般'],['career','◆ 職業'],['lucky','✦ 小確幸']])if(kinds[kind])counts.append(node('span',`draw-${kind}`,`${name} ${kinds[kind]}`));deck.append(counts);
      const fan=node('div','deck-fan');fan.setAttribute('aria-hidden','true');for(let i=0;i<Math.min(5,Math.max(1,s.queue.length));i++)fan.append(node('span','deck-back','富負'));deck.append(fan);
      if(act){const travelling=Boolean(this.scene?.motion||this.scene?.diceMotion);button(pane,travelling?'前進中…':'抽卡',()=>this.startCardDraw(false),'primary-button',travelling||Boolean(this.cardDrawing));const current=s.players[s.turn];if(worth(current)>=5000000&&next?.kind==='general')button(pane,'極限命運',()=>this.startCardDraw(true),'secondary-button',travelling||Boolean(this.cardDrawing));}
      else this.waiting(pane,`${this.actorName()} 正在翻牌`,'牌面會同步顯示給所有玩家。');
      return;
    }
    if(s.phase==='revealGroup'){
      const pending=s.cards.filter(c=>c.status==='pending').length;
      if(!s.cards.length)card(pane,'平安落格','這一格沒有命運牌','直接前進到下一位玩家。','action-card empty-fate-card');
      s.cards.forEach((item,index)=>{
        const lead=item.rows.find(r=>r.description&&r.description!=='無')||item.rows[0];
        const title=fateTitle(lead);
        const flipKey=gameKey(s,s.round,s.turn,index,lead.id);
        if(!this.cardFlipSeen.has(flipKey))this.cardFlipSeen.set(flipKey,Date.now());
        const animate=Date.now()-this.cardFlipSeen.get(flipKey)<1100;
        const joint=root(lead.id)==='D002',fullDescription=cardDescription(lead),description=!joint&&item.status==='resolved'&&impactText(lead,s.players[s.turn])?'':joint?item.status==='resolved'?'':'選金額並指定一位其他玩家；由受邀者決定是否投資。成交才有收益。':item.status!=='resolved'&&item.rows.length===1&&impactText(lead,s.players[s.turn])?'':shortCardText(fullDescription);
        const selected=item.rows.find(row=>row.id===item.selectedId)||lead,tones=new Set(item.rows.map(row=>cardTone(row,s.players[s.turn]))),tone=item.status==='resolved'?cardTone(selected,s.players[s.turn]):tones.size===1?[...tones][0]:'mixed';
        const box=card(pane,`${fateKindLabel(item.kind,lead.id)}`,title,description,`action-card fate-card-game ${item.kind} ${tone}${item.status==='resolved'?' resolved':''}${joint?' co-invest-card':''}${animate?' flip-in':''}`);box.dataset.cardId=lead.id;
        const stamp=node('div','fate-card-stamp'),seal=node('span','fate-seal',item.kind==='lucky'?'✦':item.kind==='career'?'▣':'◆'),eyebrow=box.querySelector(':scope > small'),artRow=selected.title&&selected.title!=='無'?selected:lead;stamp.append(seal,eyebrow,node('span',`effect-badge ${tone}`,{positive:'＋ 有利',negative:'－ 不利',mixed:'± 有得有失',neutral:item.status==='pending'?'◇ 待選擇':'◇ 事件'}[tone]));box.prepend(setNativeCardArt(illustration(...fateArt(artRow,tone)),fateCardArt(artRow.id)));box.prepend(stamp);const heading=box.querySelector(':scope > h3');if(heading)stamp.after(heading);
        const mainImpact=impactText(selected,s.players[s.turn]);if(item.status!=='resolved'&&item.rows.length===1&&mainImpact)box.append(renderImpact(node('strong',`card-impact ${mainImpact.kind}`),mainImpact));
        if(joint||String(fullDescription||'').trim().length>description.length+5){button(stamp,'卡文',()=>{const old=document.getElementById('fate-original-dialog');old?.remove();const dialog=node('dialog','crowd-names-dialog fate-original-dialog'+(joint?' joint-original-dialog':''));if(joint){const pawn=this.scene?.projectBounds(this.scene.pawns.get(this.scene.followSeat)?.root);dialog.style.setProperty('--joint-safe-top',`${Math.max(72,(pawn?.bottom||180)+12)}px`);}dialog.id='fate-original-dialog';dialog.append(node('h3','',title));if(joint)dialog.append(node('p','joint-current-rule','本局規則：抽卡玩家指定一位其他玩家，由受邀者決定是否投資。'),node('small','source-card-name','原始卡文'));dialog.append(node('p','',fullDescription));if(['DA040','JF034','DB031'].includes(lead.id))dialog.append(node('small','source-card-name','原始卡名：'+lead.title));button(dialog,'關閉',()=>dialog.close(),'primary-button');document.body.append(dialog);dialog.showModal();},'card-original-button').setAttribute('aria-label','完整卡文');}
        box.append(node('span',`fate-state ${item.status==='resolved'?'done':'live'}`,item.status==='resolved'?'✓ 已結算':item.rows.length===1?'✦ 自動結算':'✦ 等待選擇'));
        box.style.animationDelay=animate?`${Math.min(index,6)*90}ms`:'';
        if(item.status==='resolved'){
          const result=resolvedCardImpact(selected,item,s.players[s.turn]),effect=node('div',`fate-effect ${result.kind}`);if(result.parts.length>=3)box.classList.add('many-effects');
          effect.append(node('small','','本張結果'),renderImpact(node('strong',''),result));
          box.append(effect,box.querySelector('.fate-state'));
          if(item.coInvestResponses)for(const response of item.coInvestResponses){const detail=node('div','co-invest-response');detail.append(node('strong','co-invest-player',this.displayName(response.seat)),node('span','co-invest-invested',response.agreed?`投入 ${fmt(response.cost)}`:'未投資'));if(response.agreed)detail.append(node('span','co-invest-return',`下回合收益 ${fmt(response.investorPassive)}`));box.append(detail);}
          return;
        }
        const choices=node('div','choice-list');box.append(choices);if(!joint&&item.rows.length===2)box.classList.add('two-choice-card');
        const addChoice=(row,parent,labelOverride)=>{const multi=s.cards.length>1,allowed=this.affordable(row,s),label=labelOverride||(impactText(row,s.players[s.turn])?choiceAction(row):(multi?compactChoiceLabel(row):choiceLabel(row))),option=button(parent,'',()=>this.dispatch('chooseCard',{cardIndex:index,id:row.id}),'choice-option',!act||!allowed||item.rows.length===1);option.append(node('span','choice-label',`${label}${allowed||multi?'':' · 資金不足'}`));option.dataset.cardId=row.id;option.title=!allowed&&multi?`資金不足：${choiceLabel(row)}`:choiceLabel(row);const impact=impactText(row,s.players[s.turn]);if(impact){option.classList.add('financial-choice');if(root(row.id)==='D001')option.classList.add('company-choice');option.append(renderImpact(node('small',`choice-impact ${impact.kind}`),impact,label,true));};return option;};
        if(joint){
          const special=item.rows.find(row=>row.id==='D002特殊事件');
          const labels={A:'A · 100萬 · 9.6%／1%',B:'B · 30萬 · 9%／1.3%',C:'C · 10萬 · 8.4%／1.8%'};
          for(const key of ['A','B','C']){const rows=item.rows.filter(row=>row.id.startsWith(`D002-${key}`));if(!rows.length)continue;const group=node('section','choice-pair-group');group.append(node('strong','choice-pair-heading',labels[key]));const pair=node('div','choice-pair-buttons');for(const row of rows)addChoice(row,pair,rows.length===1?'選此方案':row.id.endsWith('兼職')?'兼職方':'投資方');group.append(pair);choices.append(group);}
          const decline=item.rows.find(row=>row.id==='D002-不兼職');
          if(special||decline){const other=node('section','choice-pair-group');other.append(node('strong','choice-pair-heading','其他選擇'));const pair=node('div','choice-pair-buttons');if(special)addChoice(special,pair,'查看方案');if(decline)addChoice(decline,pair,'不投資');other.append(pair);choices.append(other);}
        }else for(const row of item.rows)addChoice(row,choices);
        if(item.rows.length===1)box.append(node('p','','效果由系統自動結算。'));
      });
      if(!pending){button(pane,'繼續',()=>this.dispatch('nextStep'),'primary-button',!act);}
      else if(!act)this.waiting(pane,`等待 ${this.actorName()} 做決定`,'卡牌選擇完成後才能繼續。');
      return;
    }
    if(s.phase==='coInvestTarget'){
      card(pane,'共同投資','指定一位夥伴',`這次需由另一位玩家投入 ${fmt(s.coInvest.cost)}，並由對方決定是否參與。`,'action-card gold');
      const options=node('div','choice-list');pane.append(options);
      for(const p of s.players.filter(p=>p.seat!==s.players[s.turn].seat))button(options,`${this.displayName(p.seat)} · 現金 ${fmt(p.cash)}`,()=>this.dispatch('chooseCoInvestor',{seat:p.seat}),'',!act||p.cash<s.coInvest.cost);
      return;
    }
    if(s.phase==='coInvest'){
      const invited=s.players[s.coInvest.targetIndex],invitation=card(pane,`共同投資 · 方案 ${s.coInvest.key}`,`${this.displayName(s.players[s.turn].seat)} 邀請${act?'你':''}投資`,'下回合收回本金並領取收益。','action-card gold joint-invitation');
      invitation.prepend(illustration('together','共同投資'));const metrics=node('div','decision-metrics');for(const [label,value] of [['本次支付',s.coInvest.cost],['投資人下回合收益',s.coInvest.investorPassive],['管理人下回合收益',s.coInvest.managerPassive]]){const metric=node('span','');metric.append(node('small','',label),node('b','',fmt(value)));metrics.append(metric);}invitation.append(metrics);
      const responses=node('div','co-invest-responses');for(const response of s.coInvest.responses)responses.append(node('span','',`${this.displayName(response.seat)}：${response.agreed?'已投資':'未投資'}`));if(s.coInvest.responses.length)invitation.append(responses);
      if(act){button(pane,'接受',()=>this.dispatch('resolveCoInvest',{agreed:true}),'primary-button',me.cash<s.coInvest.cost);button(pane,'不參與',()=>this.dispatch('resolveCoInvest',{agreed:false}),'secondary-button');}
      else this.waiting(pane,`等待 ${this.actorName()} 回覆`,'受邀玩家會自行決定是否投入。');
      return;
    }
    if(s.phase==='loanDecision'){
      const current=s.players[s.turn],futureIncome=(current.future||[]).reduce((sum,item)=>sum+(Number(String(item.income??'').replace(/[^\d.-]/g,''))||0),0),limit=Math.max(0,Math.floor(current.income+futureIncome));
      const maxRepay=maximumWholeRepayment(current.cash,current.debt),canBorrow=s.round<5&&limit>0,context=`${s.round}:${s.turn}:${current.seat}`;
      if(this.loanContext!==context){this.loanContext=context;this.loanMode=null;this.loanDraft='';}
      const panel=card(pane,'投資前借貸','管理現金','','action-card gold loan-card');panel.append(illustration('cash','現金管理'));
      const metrics=node('div','loan-metrics');for(const [label,value] of [['目前現金',formatLoanMoney(current.cash)],['目前負債',formatLoanMoney(current.debt)],['最高可借金額',canBorrow?limit:0],['最高可還整元',maxRepay],['原職業利率',`${Math.round(current.career.rate*100)}%`]]){const text=typeof value==='number'?fmt(value):value,line=node('span',text.length>15?'wide-money':'');line.append(node('small','',label),node('strong','',text));metrics.append(line);}panel.append(metrics);if(!Number.isInteger(current.debt)||!Number.isInteger(current.cash))panel.append(node('p','loan-precision-note',loanPrecisionNote));const help=button(panel,'?',()=>{let dialog=document.getElementById('loan-rules-dialog');if(!dialog){dialog=node('dialog','crowd-names-dialog');dialog.id='loan-rules-dialog';dialog.append(node('h3','','借還款規則'),node('p','','新舊負債合併，沿用原職業利率攤還。轉職不改固定支出與利率。'));button(dialog,'知道了',()=>dialog.close(),'primary-button');document.body.append(dialog);}dialog.showModal();},'loan-rule-button');help.setAttribute('aria-label','借還款規則');
      if(act){
        const flow=node('div','loan-flow');pane.append(flow);
        const modes=node('div','loan-mode-row');flow.append(modes);
        const chooseMode=(kind,event)=>{
          this.loanMode=kind;
          this.loanDraft='';
          this.loanEntryRequested=event.detail===0?'keyboard':'pointer';
          this.render();
        };
        if(canBorrow)button(modes,'借款',event=>chooseMode('borrow',event),`loan-mode-button borrow${this.loanMode==='borrow'?' selected':''}`);
        button(modes,'還款',event=>chooseMode('repay',event),`loan-mode-button repay${this.loanMode==='repay'?' selected':''}`,maxRepay<1);
        button(modes,'不借也不還',()=>this.dispatch('decideLoan',{kind:'skip'}),'loan-mode-button skip');
        if(this.loanMode){
          const kind=this.loanMode,borrowing=kind==='borrow',maximum=borrowing?limit:maxRepay;
          const field=node('label','loan-entry');field.append(node('span','',`${borrowing?'借款':'還款'}金額 · ${borrowing?'最高可借':'最高可還整元'} ${fmt(maximum)}`));const input=node('input','');input.type='text';input.inputMode='numeric';input.maxLength=12;input.autocomplete='off';input.placeholder='輸入金額';input.value=this.loanDraft;field.append(input);flow.append(field);
          const summary=node('div','loan-confirm-summary');summary.setAttribute('aria-live','polite');flow.append(summary);
          const confirm=button(flow,`確認${borrowing?'借款':'還款'}`,()=>{
            const raw=input.value.trim(),value=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(value)||value<1||value>maximum){summary.textContent=`請輸入 $1 至 ${fmt(maximum)}。`;return;}
            this.dispatch('decideLoan',{kind,amount:value});
          },'primary-button loan-confirm');
          confirm.dataset.audioCue='loan';
          const update=()=>{const raw=input.value.trim(),value=Number(raw),valid=/^\d+$/.test(raw)&&Number.isSafeInteger(value)&&value>=1&&value<=maximum;this.loanDraft=input.value;confirm.disabled=!valid;if(!valid){summary.textContent=raw?'金額超過可用上限':'輸入後可確認';return;}const cash=current.cash+(borrowing?value:-value),debt=current.debt+(borrowing?value:-value);summary.textContent=`確認後：現金 ${formatLoanMoney(cash)} · 負債 ${formatLoanMoney(debt)}`;};
          input.oninput=update;
          input.onkeydown=event=>{
            if(event.key==='Enter'&&!confirm.disabled){
              event.preventDefault();
              confirm.click();
            }
          };
          update();
        }
      }else this.waiting(pane,`等待 ${this.actorName()} 決定`,'完成借貸選擇後會進入投資階段。');
      return;
    }
    if(s.phase==='investIdle'){
      const current=s.players[s.turn];card(pane,'投資機會',`${this.displayName(current.seat)}，選擇投資`,`已抽 ${current.investDraws}/3 張 · 每類限一次`,'action-card gold');
      const remaining=new Set(unusedAssets(s.round,new Set(s.usedAssets)).map(card=>card.category));const grid=node('div','invest-grid');pane.append(grid);
      for(const [key,name] of Object.entries(categoryNames)){const used=current.investCategories.includes(key),exhausted=!remaining.has(key);const btn=node('button',`invest-button ${key}`);btn.type='button';btn.disabled=!act||used||exhausted||current.investDraws>=3||(key==='crypto'&&s.round<4);btn.append(node('span','invest-glyph',categoryIcons[key]),node('strong','',name),node('small','',used?'本回合已抽':key==='crypto'&&s.round<4?'第 4 回合開放':exhausted?'本局已抽完':'抽一張投資卡'));btn.onclick=()=>this.startAssetDraw(key);grid.append(btn);}
      const holdingContext=gameKey(s,'holdings',s.round,s.turn);
      if(this.holdingContext!==holdingContext){this.holdingContext=holdingContext;this.holdingIndex=0;this.sellSelection=null;this.salesExpanded=false;}
      const saleable=(current.holdings||[]).filter(h=>h.category!=='special'&&!h.recoverNext);
      if(saleable.length||this.salesExpanded)pane.append(this.renderHoldingManager(current,saleable,act));
      button(pane,'結束投資',()=>this.dispatch('nextStep'),'secondary-button',!act);
      if(this.seat!==this.actor)this.waiting(pane,`等待 ${this.actorName()} 投資`,'每位玩家都結束後進入共同市場。');
      return;
    }
    if(s.phase==='offer'){
      const offer=s.offer,offerKey=gameKey(s,'offer',s.round,s.turn,offer.id);if(!this.cardFlipSeen.has(offerKey))this.cardFlipSeen.set(offerKey,Date.now());const animate=Date.now()-this.cardFlipSeen.get(offerKey)<1100;const current=s.players[s.turn],offerCard=card(pane,`${categoryNames[offer.category]||'投資'}機會`,offer.name,'',`action-card gold fate-card-game investment${animate?' flip-in':''}`);offerCard.dataset.cardId=offer.id;offerCard.prepend(assetIllustration(offer));
      const metrics=node('div','offer-metrics');for(const [label,value] of [['買入價',fmt(offer.price)],['買入後現金',current.cash>=offer.price?fmt(current.cash-offer.price):'現金不足']]){const metric=node('span','offer-metric');metric.append(node('small','',label),node('strong','',value));metrics.append(metric);}offerCard.append(metrics);const facts=node('div','investment-facts');facts.setAttribute('aria-label','買入前投資資訊');for(const fact of investmentFacts(offer,s.round)){const row=node('div','investment-fact');const icon=node('span','investment-fact-icon',fact.icon);icon.setAttribute('aria-hidden','true');const copy=node('span','investment-fact-copy');copy.append(node('strong','',fact.label),node('small','',fact.detail));row.append(icon,copy);facts.append(row);}offerCard.append(facts);
      offerCard.dataset.offerEntry=animate?'entering':'ready';if(animate)offerCard.setAttribute('aria-busy','true');
      if(act){const buy=button(pane,'買入',()=>this.dispatch('resolveOffer',{buy:true}),'primary-button',animate||s.players[s.turn].cash<offer.price),decline=button(pane,'放棄',()=>this.dispatch('resolveOffer',{buy:false}),'secondary-button',animate);buy.dataset.offerAllowed=String(s.players[s.turn].cash>=offer.price);decline.dataset.offerAllowed='true';}
      else this.waiting(pane,`等待 ${this.actorName()} 決定`,'買入與放棄都由抽卡玩家親自選擇。');
      return;
    }
    if(s.phase==='marketReady'){
      card(pane,'共同市場','全城一起迎接市場變動',`本回合資產最高的 ${this.actorName()} 將翻出共同市場事件。`,'action-card gold').append(illustration('market','共同市場'));
      if(act)button(pane,'揭曉市場事件',()=>this.dispatch('drawMarket'),'primary-button');
      else this.waiting(pane,`等待 ${this.actorName()} 翻牌`,'所有玩家會看到同一市場結果。');
      return;
    }
    if(s.phase==='marketReveal'){
      if(this.marketIntroActive)return;
      const event=s.event;const eventCard=card(pane,'共同市場事件',marketTitle(event),`${event.region}市場 · 全員共同承受這次變動。`,'action-card gold market-event-card');eventCard.dataset.cardId=event.id;eventCard.setAttribute('aria-label',event.title);const heading=node('div','market-card-heading');const title=eventCard.querySelector('h3');title.replaceWith(heading);heading.append(title);button(heading,'卡文',()=>{document.getElementById('market-original-dialog')?.remove();const dialog=node('dialog','crowd-names-dialog');dialog.id='market-original-dialog';dialog.append(node('h3','',event.title),node('p','',`${event.region}市場 · 全員共同承受這次變動。`));for(let i=0;i<6;i++)dialog.append(node('p','',`${['股票','房地產','創業','貴金屬','加密貨幣','外匯'][i]}：市價 ${event.assetEffect[i]>0?'+':''}${marketPercent(event.assetEffect[i])}%；收益 ${event.yieldEffect[i]>0?'+':''}${marketPercent(event.yieldEffect[i])}%`));button(dialog,'關閉',()=>dialog.close(),'primary-button');document.body.append(dialog);dialog.showModal();},'card-original-button').setAttribute('aria-label','完整卡文');eventCard.prepend(setNativeCardArt(illustration('market','市場變動'),marketEventArt(event.id)));
      const grid=node('div','market-grid');pane.append(grid);
      ['股票','房地產','創業','貴金屬','加密貨幣','外匯'].forEach((name,index)=>{const price=event.assetEffect[index],yieldChange=event.yieldEffect[index];const tile=node('span',`market-metric ${price>0?'up':price<0?'down':'flat'}`);tile.append(node('small','',name),node('strong','',`市價 ${price>0?'+':''}${marketPercent(price)}%`),node('em','',`收益 ${yieldChange>0?'+':''}${marketPercent(yieldChange)}%`));grid.append(tile);});
      return;
    }
    if(s.phase==='summary'){
      const {receipt,standings}=displayRoundResults({state:s,seat:this.seat,displayName:id=>this.displayName(id),
        openHistory:()=>{this.historyRound=null;this.renderHistory(s);this.switchDeck('history');$('score-dialog').showModal();}});
      pane.append(receipt,standings);
      if(s.round===5){
        const entries=[...standings.querySelectorAll('.summary-place')];
        const perPage=this.awardCompactLayout.matches?2:this.awardNarrowLayout.matches?3:6;
        if(entries.length>perPage){
          pane.append(pageItems(entries,perPage,{
            anchor:this.awardStandingAnchor,
            onPageChange:offset=>{this.awardStandingAnchor=offset;standings.scrollTop=0;}
          }));
        }
      }
      if(s.round===5){const key=gameKey(s,this.code,s.round);if(this.celebrationKey!==key){this.celebrationKey=key;this.celebrationSkipped=false;document.body.classList.remove('celebration-skip');}const controls=node('div','award-controls');if(!this.scene?.reducedMotion){button(controls,'略過動畫',()=>{this.celebrationSkipped=true;document.body.classList.add('celebration-skip');this.scene?.skipCelebration();},'secondary-button');button(controls,'重播頒獎',()=>{this.celebrationSkipped=false;document.body.classList.remove('celebration-skip');this.scene?.replayCelebration();},'secondary-button');}button(controls,`音效：${this.scene?.soundOn?'開':'關'}`,()=>this.toggleSound(),'secondary-button').id='award-sound-button';pane.append(controls);if(this.seat==='A')button(pane,'再玩一局',()=>this.dispatch('restart'),'primary-button',this.pending);else pane.append(node('div','summary-wait',`等待 ${this.displayName('A')} 決定是否再玩`));}
      return;
    }
    if(s.phase==='hostReview')card(pane,'規則核對','需要核對轉職收入規則','此局已保留狀態，請查看紀錄。','action-card dark');
  }
  affordable(row,s){
    const p=s.players[s.turn],id=root(row.id),others=s.players.filter(q=>q!==p);
    if(id==='D001'&&/-[ABC]$/.test(row.id))return p.cash>={A:1000000,B:300000,C:100000}[row.id.at(-1)];
    if(id==='D002'&&/[ABC]兼職$/.test(row.id))return others.some(q=>q.cash>={A:1000000,B:300000,C:100000}[row.id.match(/[ABC](?=兼職$)/)[0]]);
    if(['DA003','DA004','DB003','DB004'].includes(id)&&!row.id.includes('不投資')){const amount=v=>Number(String(v??'').replace(/[^\d.-]/g,''))||0;return p.cash+amount(row.currentIncome)>=amount(row.currentExpense);}
    return true;
  }
  waiting(pane,title,description){const box=node('div','waiting-card');box.append(node('strong','',title),node('p','',description));pane.append(box);}
  tick(){
    $('automatic-follow-button').hidden=!this.scene?.overview||!this.state||this.state.phase==='lobby'||this.state.phase==='summary'&&this.state.round===5;
    const chip=$('timer-chip'),s=this.state;if(!s){chip.textContent='等待開局';return;}
    if(this.solo?.readingPaused || (this.solo&&!Number.isFinite(this.deadline))){
      chip.classList.remove('urgent');
      chip.textContent=this.solo.readingPaused?'單人暫停':s.phase==='summary'?'最終結果':this.actor===this.seat?'輪到你':'電腦對手回合';
      if($('action-timer'))$('action-timer').textContent=chip.textContent;
      $('stage-timer').hidden=true;
      for(const clock of document.querySelectorAll('.dialog-countdown'))clock.hidden=true;
      return;
    }
    const remaining=Math.max(0,Math.ceil((this.deadline-(Date.now()+this.serverOffset))/1000));
    if(this.audioClock?.deadline===this.deadline&&this.audioClock.remaining>10&&remaining<=10&&remaining>0&&this.actor===this.seat&&s.phase!=='lobby')this.scene?.audioCue('warning',gameKey(s,'warning',this.deadline,this.actor));
    this.audioClock={deadline:this.deadline,remaining};
    chip.classList.toggle('urgent',remaining<=10&&['income','incomeResult','roll','loanDecision','investIdle','offer','coInvest','coInvestTarget'].includes(s.phase));
    if(s.phase==='lobby')chip.textContent=this.members.length===this.targetCount?`${remaining} 秒開局`:'等待到齊';
    else if(s.phase==='summary'&&s.round===5)chip.textContent='最終結果';
    else if(s.phase==='revealGroup'&&s.cards.some(c=>c.status==='pending'))chip.textContent=remaining===0?'系統處理中':`選擇 ${remaining} 秒`;
    else if(['setup','careerResult','income','incomeResult','roll','deck','revealGroup','marketReady','marketReveal','summary','loanDecision','investIdle','offer','coInvest','coInvestTarget'].includes(s.phase))chip.textContent=remaining===0?'系統處理中':`${remaining} 秒`;
    else chip.textContent='等待操作';
    const trayTimer=$('action-timer');if(trayTimer)trayTimer.textContent=chip.textContent;
    const stageTimer=$('stage-timer');stageTimer.hidden=s.phase==='lobby'||s.phase==='summary'&&s.round===5;stageTimer.classList.toggle('urgent',remaining<=10);stageTimer.setAttribute('aria-label',chip.textContent);
    if(!stageTimer.querySelector('.timer-value'))stageTimer.replaceChildren(node('strong','timer-value'),node('span','timer-unit'));
    stageTimer.querySelector('.timer-value').textContent=remaining>0?String(remaining).padStart(2,'0'):'00';stageTimer.querySelector('.timer-unit').textContent=remaining===0?'系統\n處理中':remaining<=10?'秒後\n自動繼續':'秒\n剩餘';
    // Native dialogs occupy the browser top layer; repeat the same clock inside,
    // rather than trying to stack a floating timer over dialog controls.
    for(const dialog of document.querySelectorAll('dialog[open]')){let clock=dialog.querySelector('.dialog-countdown');if(!clock){clock=node('div','dialog-countdown');dialog.prepend(clock);}clock.hidden=stageTimer.hidden;const label=remaining===0?'系統處理中':`剩餘 ${remaining} 秒${remaining<=10?' · 即將自動繼續':''}`;clock.textContent=dialog.id==='board-info-dialog'?(remaining===0?'處理中':`${remaining} 秒`):label;clock.setAttribute('aria-label',label);clock.classList.toggle('urgent',remaining<=10);}
  }
}

new CityGame();
