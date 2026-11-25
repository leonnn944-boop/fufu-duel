// Current-stage guidance, independent of the engine's last-action note.
// Preserve authoritative result notes and error/connection notices.
export function phaseDescription(state, actor) {
  if (!state) return '建立房間，邀請朋友一起踏上五回合的財富旅程。';
  const who = actor || state.players?.[state.turn]?.seat || '目前玩家';
  switch (state.phase) {
    case 'roll': return `輪到 ${who} 擲骰前進。`;
    case 'deck': return '依落點與沿途格子翻開命運牌。';
    case 'revealGroup': {
      const pending = (state.cards || []).filter(card => card.status === 'pending').length;
      return pending ? `還有 ${pending} 張卡需要選擇，請逐張完成。` : '本格卡牌已結算，請按「繼續」。';
    }
    case 'coInvestTarget': return `${who} 請指定一位共同投資夥伴。`;
    case 'coInvest': return `${who} 請決定是否參與共同投資。`;
    case 'loanDecision': return `${who} 請完成本回合的借貸選擇。`;
    case 'investIdle': return `${who} 可選擇投資、查看持有資產，或結束投資。`;
    case 'offer': return `${who} 請決定是否買入這項投資。`;
    case 'marketReady': return '全員投資已結束，準備揭曉本回合市場事件。';
    case 'marketReveal': return '市場事件揭曉中，接著自動結算本回合。';
    case 'summary': return state.round === 5 ? '五回合已完成，查看最終淨資產排名。' : `第 ${state.round} 回合結算完成，接著進入下一回合。`;
    default: return state.note || '依畫面提示完成目前步驟。';
  }
}
