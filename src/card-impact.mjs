import {gameCardCopy} from './card-game-copy.mjs';
const fmt=value=>`$${Math.round(value||0).toLocaleString('zh-TW')}`;
const shortFmt=value=>{const n=Math.round(Math.abs(value||0));return n>=10000?`${(Math.round(n/1000)/10).toLocaleString('zh-TW')}萬`:fmt(n);};
const root=id=>String(id).match(/^(?:DA|DB|D|JA|JB|JC|JD|JE|JF|L)\d{3}/)?.[0]??id;
const cardAmount=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
export const cardDescription=row=>gameCardCopy(row)?.description??row?.description;
const part=(text,value=0)=>({text,kind:value>0?'positive':value<0?'negative':'neutral'});
const pack=(parts,kind)=>({kind,text:parts.map(p=>p.text).join(' · '),parts});
export const impactText=(row,player)=>{
  const copy=gameCardCopy(row);if(copy)return pack([part(`現金 ${copy.delta>0?'+':'−'}${fmt(Math.abs(copy.delta))}`,copy.delta)],copy.delta>0?'positive':copy.delta<0?'negative':'neutral');
  if(player&&(player.activeIncomePool||['founder','freelancer'].includes(player.career?.id))&&String(row.description||'').includes('此卡無效於自營商'))return pack([part('自營商不適用 · 本張無金額效果')],'neutral');

  if(root(row.id)==='D002')return null;
  if(root(row.id)==='D001'){const choice=String(row.id).match(/-([ABC])$/u)?.[1],rates={A:'10.6%',B:'10.3%',C:'10.2%'},costs={A:1000000,B:300000,C:100000};return choice?pack([part(`投入 ${fmt(costs[choice])}`,-1),part(`下回合收回本金與 ${rates[choice]} 收益`,1)],'neutral'):null;}
  if(['DA003','DA004','DB003','DB004'].includes(root(row.id))&&!String(row.id).endsWith('不投資')){const passive=cardAmount(row.passiveIncome),cost=cardAmount(row.currentExpense);return passive?pack([part(`投入 ${fmt(cost)}`,-1),part(`下回合收回本金與 ${fmt(passive)} 收益`,1)],'neutral'):null;}
  if(String(row.currentIncome||'').includes('本回合無收入')){const expense=cardAmount(row.currentExpense);return pack([part('本回合收入歸零',-1),...(expense?[part(`支出 +${fmt(expense)}`,-expense)]:[])],'negative');}
  let income=cardAmount(row.currentIncome),expense=cardAmount(row.currentExpense);const description=String(cardDescription(row)||'');
  if(income<0&&!expense&&/當回合支出\s*\+/u.test(description)){expense=-income;income=0;}
  else if(income>0&&!expense&&/當回合支出\s*[-−]/u.test(description)){expense=-income;income=0;}
  const futureIncome=cardAmount(row.futureIncome),futureExpense=cardAmount(row.futureExpense),passive=cardAmount(row.passiveIncome);
  const now=income-expense;
  const transition=/^(?:JC|JD|JE|JF)0(?:19|20)-1$/u.test(row.id),declined=/^(?:JC|JD|JE|JF)0(?:19|20)-2$/u.test(row.id);
  const signed=(label,value)=>`${label} ${value>0?'+':'−'}${fmt(Math.abs(value))}`;
  const parts=[];
  if(income)parts.push(part(signed('收入',income),income));
  if(expense)parts.push(part(row.id==='DB023'&&expense<0?`節省支出 ${fmt(-expense)}`:signed('支出',expense),-expense));
  if(now&&income&&expense&&!transition)parts.push(part(signed('現金',now),now));
  if(futureIncome)parts.push(part(signed('下回合收入',futureIncome),futureIncome));
  if(futureExpense)parts.push(part(signed('下回合支出',futureExpense),-futureExpense));
  if(passive)parts.push(part(signed('下回合被動收益',passive),passive));
  if(transition)parts.push(part('下回合轉為自營商'));
  if(declined)parts.push(part('保留現職'));
  const effects=[income,-expense,futureIncome,-futureExpense,passive],positive=effects.some(v=>v>0),negative=effects.some(v=>v<0);
  if(transition)return pack([...(income?[part(signed('收入',income),income)]:[]),part(`轉職費 ${fmt(expense)}`,-expense),part('下回合轉為自營商')],'neutral');
  return parts.length?pack(parts,positive&&negative?'mixed':negative?'negative':positive?'positive':'neutral'):null;
};
export const cardTone=(row,player)=>impactText(row,player)?.kind||'neutral';

export const marketPercent=value=>Number((Number(value)*100).toFixed(6)).toLocaleString('zh-TW',{maximumFractionDigits:6});
