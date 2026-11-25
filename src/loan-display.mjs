// Only presentation and the existing whole-dollar manual repayment limit.
// Stored balances and automatic amortization retain their full precision.
const cents=new Intl.NumberFormat('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2,roundingMode:'trunc'});
// Display only: remove at most two scaled-cent ULPs of binary arithmetic noise.
// Genuine fractions still truncate; stored balances and repayment limits are untouched.
const displayCentBoundary=value=>{
  const scaled=value*100;
  if(!Number.isFinite(scaled)||Math.abs(scaled)>Number.MAX_SAFE_INTEGER)return value;
  const nearest=Math.round(scaled),ulp=2**(Math.floor(Math.log2(Math.max(1,Math.abs(scaled))))-52);
  return nearest!==0&&Math.abs(scaled-nearest)<=2*ulp?nearest/100:value;
};
export function formatLoanMoney(value){
  const n=displayCentBoundary(Number(value)||0);
  if(Number.isInteger(n))return `$${n.toLocaleString('zh-TW')}`;
  if(Math.abs(n)<.01)return `${n<0?'−':''}未滿 $0.01`;
  return `$${cents.format(n)}`;
}
export const loanPrecisionNote='餘額顯示至分，不進位。\n還款限整元；小數留待攤還。';
export function financeFormula(cash,assets,debt){
  const values=[cash,assets,debt,cash+assets-debt];
  const approximate=values.some(n=>Number(cents.format(n).replaceAll(',',''))!==n);
  return `${formatLoanMoney(cash)} + ${formatLoanMoney(assets)} − ${formatLoanMoney(debt)} ${approximate?'≈':'='} ${formatLoanMoney(values[3])}`;
}
export const maximumWholeRepayment=(cash,debt)=>Math.max(0,Math.floor(Math.min(cash,debt)));
