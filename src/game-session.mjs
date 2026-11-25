// A room's game generation is server-owned and serialized with the game state.
// Snapshots written before this field existed belong to the imported generation 1.
export const gameEpoch=state=>state?.gameEpoch??1;
export const gameKey=(state,...parts)=>[gameEpoch(state),...parts].join(':');
export const isNewGame=(previous,next)=>Boolean(previous)&&gameEpoch(previous)!==gameEpoch(next);
export const motionKey=(room,state)=>`city-motion:${room}:${gameEpoch(state)}`;
