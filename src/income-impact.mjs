// Classify original income/expense fields before combining their cash effect.
export function incomeImpactItems(effects){
 const totals={incomeUp:0,incomeDown:0,expenseUp:0,expenseDown:0};
 for(const {income=0,expense=0}of effects){if(income>0)totals.incomeUp+=income;else totals.incomeDown-=income;if(expense>0)totals.expenseUp+=expense;else totals.expenseDown-=expense;}
 return [['收入增加',totals.incomeUp,true],['收入減少',totals.incomeDown,false],['支出增加',totals.expenseUp,false],['支出減少',totals.expenseDown,true]].filter(([,value])=>value>0).map(([label,value,beneficial])=>({label,value,beneficial}));
}
export function incomeImpactLines(effects,format){return incomeImpactItems(effects).map(({label,value,beneficial})=>(beneficial?'✓ 有利｜':'! 不利｜')+label+' '+format(value));}
export function signedCardCash(value,format){return(value<0?'−':value>0?'+':'')+format(Math.abs(value));}
