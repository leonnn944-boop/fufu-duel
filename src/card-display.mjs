import {gameCardCopy,cashCardLabels} from './card-game-copy.mjs';
import {CARD_SNAPSHOT} from '../cards-snapshot.mjs';
import {ASSET_CARDS,MARKET_EVENTS} from '../market-data.mjs';

const money=value=>`$${Math.round(value||0).toLocaleString('zh-TW')}`;
const compactMoney=value=>{const n=Math.round(amount(value));return n>=10000?`${(Math.round(n/1000)/10).toLocaleString('zh-TW')}萬`:money(n);};
const amount=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
const root=id=>String(id).match(/^(?:DA|DB|D|JA|JB|JC|JD|JE|JF|L)\d{3}/)?.[0]??id;
const generalCards=CARD_SNAPSHOT.general;
const careerCards=Object.values(CARD_SNAPSHOT.jobs).flat();
const displayTitleOverrides={JF034:'新政策調降薪資',DB031:'電費增加'};
const cardNames=new Map([...generalCards,...careerCards,...CARD_SNAPSHOT.lucky].map(row=>[row.id,displayTitleOverrides[row.id]||(row.id==='DA040'?'電費增加':gameCardCopy(row)?.title||row.title)]));
for(const asset of ASSET_CARDS)cardNames.set(asset.id,asset.name);
for(const event of MARKET_EVENTS)cardNames.set(event.id,event.title);

const companyInvest={
  'D001-A':{cost:1000000,rate:'10.6%'},'D001-B':{cost:300000,rate:'10.3%'},'D001-C':{cost:100000,rate:'10.2%'},
};
const jointInvest={
  'D002-A兼職':{cost:1000000,investor:'9.6%',manager:'1%'},
  'D002-B兼職':{cost:300000,investor:'9%',manager:'1.3%'},
  'D002-C兼職':{cost:100000,investor:'8.4%',manager:'1.8%'},
};

export function fateTitle(row){
  // Shared meaning of original title and description; source text remains traceable.
  if(row?.id==='DA040')return '電費增加';
  if(displayTitleOverrides[row?.id])return displayTitleOverrides[row.id];
  const revised=gameCardCopy(row);if(revised)return revised.title;
  if(!row||row.title==='無')return '命運牌';
  if(row.title==='團購日用品')return '團購省錢';
  if(row.title.startsWith('成為基金共同管理人'))return '基金共同管理人';
  return row.title.replace(/\((?:方案[A-C]|不投資|不兼職|接受|拒絕)\)(?:，兼職方|，投資方)?$/u,'').replace(/^轉職機會([12])$/u,'轉職機會');
}

export function choiceLabel(row){
  const id=String(row.id),kind=root(id);
  if(id==='D001-不投資')return '不投資';
  if(companyInvest[id]){const {cost,rate}=companyInvest[id];return `方案 ${id.at(-1)} · 投入 ${money(cost)} · 回合被動收益 ${rate}`;}
  if(id==='D002-不兼職')return '這次不兼職 · 不發起共同投資';
  if(jointInvest[id]){const {cost,investor,manager}=jointInvest[id],option=id.match(/[ABC](?=兼職$)/u)[0];return `方案 ${option}：邀請一人投入 ${money(cost)}；同意後對方得 ${investor}，你得 ${manager}`;}
  if(['DA003','DA004','DB003','DB004'].includes(kind)){
    if(id.endsWith('不投資'))return '不投資 · 保留現金';
    const option=id.match(/-([AB])$/u)?.[1],cost=amount(row.currentExpense),income=amount(row.passiveIncome);
    return `${option?`方案 ${option} · `:''}投入 ${money(cost)} · 回合被動收入 +${money(income)}`;
  }
  if(/^(?:JC|JD|JE|JF)0(?:19|20)$/u.test(kind)){
    const income=amount(row.currentIncome),gain=income?` · 本回合收入 +${money(income)}`:'';
    return id.endsWith('-1')?`接受轉職 · 支付 ${money(amount(row.currentExpense))} · 下回合改用新收入${gain}`:`拒絕轉職 · 保留現職${gain}`;
  }
  return row.title==='無'?'查看方案':row.title;
}

export function compactChoiceLabel(row){
  const id=String(row?.id||'');
  if(/^(?:JC|JD|JE|JF)0(?:19|20)-[12]$/u.test(id)){
    const income=amount(row.currentIncome),gain=income?` · 收入+${compactMoney(income)}`:'';
    return id.endsWith('-1')?`接受 · 付${compactMoney(amount(row.currentExpense))} · 下回合轉職${gain}`:`拒絕 · 留任${gain}`;
  }
  if(id==='D002特殊事件')return '查看方案';
  if(id==='D002-不兼職')return '不兼職';
  const joint=id.match(/^D002-([ABC])(兼職|投資)$/u);if(joint)return `${joint[1]} ${joint[2]==='兼職'?'兼職方':'投資方'}`;
  if(companyInvest[id]){const {cost}=companyInvest[id];return `${id.at(-1)} ${compactMoney(cost)}`;}
  if(jointInvest[id]){const {cost,investor,manager}=jointInvest[id],option=id.match(/[ABC](?=兼職$)/u)[0];return `${option} · 各${compactMoney(cost)} · 分潤 ${investor}/${manager}`;}
  if(['DA003','DA004','DB003','DB004'].includes(root(id))){
    if(id.endsWith('不投資'))return '不投資';
    const option=id.match(/-([AB])$/u)?.[1],cost=compactMoney(row.currentExpense);
    return `${option?`${option} `:''}投${cost}`;
  }
  return choiceLabel(row).replace('回合被動收益','收益/回合').replace('回合被動收入','收益/回合').replace('回合收益','收益/回合').replace('每人投 ','各投 ').replace('投入 ','投 ').replace('下回合改用新收入','下回合新職業收入').replace(' · ','　· ');
}

const codePattern=/(?<![A-Za-z0-9])(?:DA|DB|JA|JB|JC|JD|JE|JF|I[A-F]|D|L|M)\d{3}(?:-[A-Za-z0-9\u3400-\u9FFF]+)?/gu;
const revisedPlayerText=value=>{let text=String(value??'');for(const row of careerCards){const title=displayTitleOverrides[row.id]||cashCardLabels[row.id]?.title;if(title)text=text.replaceAll(row.id+' '+row.title,title).replaceAll(row.title,title);}return text;};
export const playerText=value=>revisedPlayerText(value).replace(codePattern,id=>{
  const title=cardNames.get(id);
  return title&&title!=='無'?title:'卡牌';
});

// Action labels contain no duplicate amounts; the effect column owns all amounts.
export function choiceAction(row){
 const id=String(row.id);
 if(/^(?:JC|JD|JE|JF)0(?:19|20)-[12]$/u.test(id))return id.endsWith('-1')?'接受轉職':'保留現職';
 if(id.endsWith('不投資'))return '不投資';
 if(companyInvest[id]||/^(?:DA|DB)003-[AB]$/u.test(id))return '方案 '+id.at(-1);
 if(/^(?:DA|DB)004$/u.test(id))return '投資';
 return compactChoiceLabel(row);
}
