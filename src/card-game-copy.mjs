// User decision, 2026-10-26: keep cash settlement and align these game texts.
// Original source rows remain untouched for provenance.
export const cashCardLabels={
  JA008:{title:'獲得注資',shortTitle:'注資'},
  JA009:{title:'收到合作款',shortTitle:'合作款'},
  JA022:{title:'退還投資款',shortTitle:'退款'}
};
const amount=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
export function gameCardCopy(row){
  const labels=cashCardLabels[row?.id];if(!labels)return null;
  const delta=amount(row.currentIncome)-amount(row.currentExpense),money=`$${Math.round(Math.abs(delta)).toLocaleString('zh-TW')}`;
  const description=row.id==='JA008'?`收到投資款 ${money}，計入本回合現金。`:row.id==='JA009'?`合作款 ${money} 入帳，計入本回合現金。`:`退還投資人 ${money}，由本回合現金支付。`;
  return{...labels,description,delta};
}
