import {RETURN_POOLS} from '../official-five.mjs';
// Presentation only. Rates are drawn after investment, never read stale state.returns.
export function investmentFacts(offer,round){
 const pool=RETURN_POOLS[offer.category];if(!pool?.length)return [];
 const percent=n=>Number((n*100).toFixed(4)).toLocaleString('zh-TW');
 return [
  {icon:'↗',label:'基準抽籤 '+percent(Math.min(...pool))+'–'+percent(Math.max(...pool))+'%',detail:'市場會改變市值與收益'},
  round===5?{icon:'◷',label:'最後回合：不再領下輪收益',detail:'持有市值計入淨資產'}:{icon:'◷',label:'第 '+(round+1)+' 回合領收益',detail:'本輪市場結算後決定'},
  {icon:'⇄',label:'自己投資時按市價出售',detail:'無自動到期'},
 ];
}
