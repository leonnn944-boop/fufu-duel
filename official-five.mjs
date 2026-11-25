// Read-only snapshot of the host workbook on 2026-10-23. See 來源與公式對照.md.
export const OFFICIAL_SOURCE = Object.freeze({
  spreadsheetId: "143pmXGXVrj_IZp73Uilk-MVfIomeRGbNuLwRabh0Mss",
  modifiedAt: "2026-10-22T14:41:11.423Z",
  revision: null,
  hostAppBlob: "bfd10288cdd9fab095e8c707f349d17ada511785",
  hostGameBlob: "73fdd7d0e760e487be2d2b642877d6594e9e19d0",
});

export const CAREERS = Object.freeze([
  { id: "founder", name: "創業家", row: 2, initialDebt: 1000000, initialCash: 1300000, fixedExpense: 1000000, rate: 0.06, incomeReference: "1,000,000–3,000,000" },
  { id: "freelancer", name: "自由業者", row: 3, initialDebt: 800000, initialCash: 1200000, fixedExpense: 900000, rate: 0.08, incomeReference: "1,200,000–2,500,000" },
  { id: "engineer", name: "軟體工程師", row: 4, initialDebt: 600000, initialCash: 1100000, fixedExpense: 800000, rate: 0.02, incomeReference: "1,800,000" },
  { id: "doctor", name: "醫生", row: 5, initialDebt: 1100000, initialCash: 1400000, fixedExpense: 1200000, rate: 0.03, incomeReference: "2,300,000" },
  { id: "sales", name: "公司業務", row: 6, initialDebt: 300000, initialCash: 900000, fixedExpense: 800000, rate: 0.04, incomeReference: "800,000–1,500,000" },
  { id: "assistant", name: "公司助理", row: 7, initialDebt: 200000, initialCash: 700000, fixedExpense: 600000, rate: 0.04, incomeReference: "1,000,000" },
]);

export function getCareer(id) { return CAREERS.find(c => c.id === id) ?? null; }

const range = (first, last, step) => Array.from({ length: Math.round((last - first) / step) + 1 }, (_, i) => first + i * step);
// The six primary-career source ranges from 回合收入抽籤!M3:AC23.
export const INCOME_POOLS = Object.freeze({
  founder: Object.freeze(range(1000000, 3000000, 100000)),
  freelancer: Object.freeze(range(1200000, 2500000, 100000)),
  engineer: Object.freeze([1800000]),
  doctor: Object.freeze([2300000]),
  sales: Object.freeze(range(800000, 1500000, 100000)),
  assistant: Object.freeze([1000000]),
});

// The repeats are intentional: HostApp.gs samples each numeric cell uniformly.
// Values are the original effective numbers in 投資項目-I!V3:AA30.
export const RETURN_POOLS = Object.freeze({
  stock: Object.freeze([.04,.04,.04,.05,.05,.05,.06,.06,.06,.06,.07,.07,.07,.08,.08,.08,.08,.09,.09,.09,.10,.10,.11,.12,.13,.14,.15,.16]),
  property: Object.freeze([.03,.03,.03,.04,.04,.05,.05,.06,.06,.06,.07,.07,.08,.08,.08,.08,.09,.09,.10,.10,.10,.11,.11,.12,.12,.13,.13,.13]),
  venture: Object.freeze([.05,.05,.05,.08,.08,.08,.10,.10,.10,.15,.15,.15,.15,.20,.20,.20,.25,.25,.25,.30,.35,.50,.60,.70,.80]),
  metal: Object.freeze([.03,.05,.05,.05,.06,.06,.06,.08,.08,.08,.10,.10,.10,.15,.20]),
  crypto: Object.freeze([0,0,0,.01,.01,.01,.03,.03,.03,.05,.10,.10,.50,1,2,3,4,5]),
  forex: Object.freeze([.08,.08,.08,.08,.08,.08,.08,.08,.10,.10,.12,.12,.15,.15,.18]),
});
export const RETURN_LABELS = Object.freeze({ stock: "股票", property: "房地產", venture: "創業", metal: "貴金屬", crypto: "加密貨幣", forex: "外匯" });

export function drawCandidate(pool, random = Math.random) {
  const n = random();
  if (!Array.isArray(pool) || !pool.length || !Number.isFinite(n) || n < 0 || n >= 1) throw new Error("抽籤來源無效");
  return pool[Math.floor(n * pool.length)];
}
export function drawRoundIncome(career, random = Math.random) {
  const pool = career && INCOME_POOLS[career.id];
  if (!pool) throw new Error("請先選擇職業");
  return drawCandidate(pool, random);
}
export function drawBaseReturns(round, random = Math.random) {
  if (!Number.isInteger(round) || round < 1 || round > 5) throw new Error("回合錯誤");
  return Object.fromEntries(Object.entries(RETURN_POOLS).map(([key, pool]) => [key, key === "crypto" && round < 4 ? 0 : drawCandidate(pool, random)]));
}

// The workbook's no-new-loan principal-amortization path: each round pays
// remaining debt / (8 - round) + remaining debt * career rate, then subtracts
// the full payment from debt. This matches 設定_職業參數!P2:T7 effective values.
export function getBaseRepayment(career, round) {
  if (!career || !Number.isInteger(round) || round < 1 || round > 5) return null;
  let debt = career.initialDebt;
  let payment = 0;
  for (let r = 1; r <= round; r++) {
    payment = debt / (8 - r) + debt * career.rate;
    debt -= payment;
  }
  return { payment, debtAfter: debt };
}

export const RR_WEIGHTS = Object.freeze({ personality: 0.15, riskCapacity: 0.35, gameBehavior: 0.5 });
