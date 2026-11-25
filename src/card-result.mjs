import {impactText} from './card-impact.mjs';

const amount=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
const money=value=>`$${Math.round(Math.abs(value)).toLocaleString('zh-TW')}`;
const pack=(parts,kind)=>({parts,kind,text:parts.map(p=>p.text).join(' · ')});

// Results use the actual settlement once; future effects remain separate.
// Engine receipt text and the full source description stay available unchanged.
export function resolvedCardImpact(row,item,player){
  const impact=impactText(row,player),delta=item.cashDelta;
  if(!Number.isFinite(delta))return impact||pack([{text:item.effect||'已結算',kind:'neutral'}],'neutral');
  const kind=delta>0?'positive':delta<0?'negative':'neutral';
  const cash={text:delta===0?'現金不變':`現金 ${delta>0?'+':'−'}${money(delta)}`,kind};
  if(!impact)return pack([cash],kind);
  const parts=impact.parts.slice();
  const immediate=parts.filter(p=>/^(?:收入|支出|投入|轉職費|現金) /u.test(p.text));
  const alreadyShowsCash=parts.some(p=>/^現金(?: |不變)/u.test(p.text));
  const shownChange=immediate.length===1?Math.abs(amount(immediate[0].text))*(immediate[0].kind==='positive'?1:immediate[0].kind==='negative'?-1:0):null;
  const singleImmediateMatches=shownChange!==null&&delta!==0&&Math.abs(delta-shownChange)<.5;
  const explicitlyNoEffect=delta===0&&parts.some(p=>p.text.includes('本張無金額效果'));
  if(!alreadyShowsCash&&!singleImmediateMatches&&!explicitlyNoEffect)parts.push(cash);
  return pack(parts,impact.kind);
}
