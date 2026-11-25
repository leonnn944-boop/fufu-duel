// Presentation only: DB is the existing extreme pool; stored kind remains general.
export function fateKindLabel(kind,id,short=false){
 const display=kind==='general'&&/^DB\d{3}/u.test(String(id||''))?'extreme':kind;
 const labels=short?{career:'職業',general:'一般',extreme:'極限',lucky:'小幸'}:{career:'▣ 職業命運',general:'◆ 一般命運',extreme:'◆ 極限命運',lucky:'✦ 小確幸'};
 return labels[display]||kind;
}
