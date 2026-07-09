/* ============================================================
   水果突击 · Squad Mode v1
   目标：保留出兵与PVP对推，但把“高频小兵海”改为“低频兵团派遣 + 同路合流”。
   Loaded after tutorial_balance.js, before fruit_mechanics.js and juice.js.
   ============================================================ */

(function installSquadMode() {
  patchSquadSpawn();
  patchSquadDraw();
  patchSquadAssistUpdate();
})();

const SQUAD_BUILD_VERSION = 'squad-v1';

function squadInterval(level) {
  // 星级主要提升质量，不主要提升频率：9s -> 6.8s。
  const table = [0, 9.0, 8.6, 8.15, 7.75, 7.35, 7.05, 6.8];
  return table[Math.max(1, Math.min(MAX_LEVEL, level))] || 9;
}
function squadInitialCount(type, level) {
  const role = TYPES[type]?.role;
  let base = 1;
  if (role === 'back') base = 2;
  if (role === 'rush') base = 2;
  if (type === 'grape_archer') base = 3;
  if (type === 'orange_cannon' || type === 'peach_medic' || TYPES[type]?.role === 'merge') base = 1;
  if (level >= 5) base += 1;
  return base;
}
function squadMaxStack(type, level) {
  const role = TYPES[type]?.role;
  if (role === 'tank' || role === 'front') return 3 + Math.floor(level / 3);
  if (role === 'back' || role === 'rush') return 5 + Math.floor(level / 3);
  if (role === 'siege') return 2 + Math.floor(level / 4);
  if (role === 'support' || role === 'control') return 2 + Math.floor(level / 4);
  return 1;
}
function squadRoleSlot(type) {
  const role = TYPES[type]?.role;
  if (role === 'tank' || role === 'front' || role === 'rush') return 'front';
  if (role === 'siege') return 'siege';
  if (role === 'support' || role === 'control' || role === 'back') return 'back';
  return 'engine';
}
function liveSquads(side, lane = null) {
  const group = side === 'player' ? state.playerSoldiers : state.enemySoldiers;
  return group.filter(s => s.alive && s.squadMode && (lane == null || s.laneIndex === lane));
}
function findSameSquad(side, type, lane) {
  const candidates = liveSquads(side, lane).filter(s => s.type === type && (s.squadCount || 1) < (s.squadMax || 3));
  candidates.sort((a, b) => (b.level - a.level) || ((b.squadCount || 1) - (a.squadCount || 1)));
  return candidates[0] || null;
}
function findSlotSquad(side, type, lane) {
  const slot = squadRoleSlot(type);
  const candidates = liveSquads(side, lane).filter(s => s.squadSlot === slot && (s.squadCount || 1) < (s.squadMax || 3));
  candidates.sort((a, b) => (b.level - a.level) || ((b.squadCount || 1) - (a.squadCount || 1)));
  return candidates[0] || null;
}
function laneSquadLimit(side, lane) {
  // 每路每方最多 2 个主要兵团 + 1 个攻城/支援，保证接战清楚。
  const k = state.currentLevel || 1;
  return k <= 3 ? 2 : 3;
}
function applySquadStats(s, addCount = 0) {
  const level = s.level || 1;
  const count = Math.max(1, s.squadCount || 1);
  const type = s.type;
  const role = TYPES[type]?.role;
  const countHpMul = 1 + (count - 1) * 0.78;
  const countAtkMul = 1 + (count - 1) * 0.42;
  const qualityHp = 1 + Math.max(0, level - 1) * 0.16;
  const qualityAtk = 1 + Math.max(0, level - 1) * 0.18;
  const oldRatio = s.maxHp > 0 ? clamp01(s.hp / s.maxHp) : 1;
  const base = TYPES[type] || TYPES[DEFAULT_DECK[0]];
  const mul = LEVEL_MUL[level] || 1;
  s.maxHp = Math.round(base.hp * mul * countHpMul * qualityHp * (role === 'tank' ? 1.15 : 1));
  s.hp = Math.max(1, Math.round(s.maxHp * Math.max(oldRatio, addCount ? 0.55 : oldRatio)));
  s.atk = Math.round(base.atk * mul * countAtkMul * qualityAtk);
  s.siege = base.siege || 1;
  s.armor = base.armor || 0;
  s.squadLabel = `${base.name} x${count}`;
}
function reinforceSquad(target, ball, center, forced = false) {
  const add = squadInitialCount(ball.type, ball.level);
  const before = target.squadCount || 1;
  target.squadCount = Math.min(target.squadMax || 3, before + add);
  target.level = Math.max(target.level, ball.level);
  applySquadStats(target, add);
  target.hitFlash = 0.18;
  target.protected = false;
  target.battleReady = true;
  target.mode = target.mode === 'siege' ? 'siege' : 'fight';
  addFx(target.x, target.y - 28, `合流 x${target.squadCount}`, TYPES[target.type]?.color || THEME.gold, 12);
  state.rings.push({ x: target.x, y: target.y, r: 9, life: 0.26, maxLife: 0.26, color: TYPES[target.type]?.color || THEME.gold });
  if (forced) state.shake = Math.max(state.shake, 0.28);
  return target;
}
function refundSquadCost(side) {
  if (side === 'player') state.sp = Math.min(getSpMax(meta), state.sp + 1);
}
function setNextSquadTimer(ball) {
  ball.spawnTimer = Math.max(ball.spawnTimer || 0, squadInterval(ball.level));
}

function patchSquadSpawn() {
  if (typeof spawnSoldierFromBall !== 'function' || spawnSoldierFromBall._squadModePatched) return;
  const oldSpawn = spawnSoldierFromBall;
  spawnSoldierFromBall = function squadSpawn(ball, r, c, side, forced = false) {
    if (!ball) return null;
    ball.type = normalizeTypeId(ball.type);
    const center = slotCenter(r, c, side === 'enemy');
    const lane = c;
    const group = side === 'player' ? state.playerSoldiers : state.enemySoldiers;

    // 合成引擎球不直接出兵，避免“辅助球也吐小兵”的噪音。
    const role = TYPES[ball.type]?.role;
    if (role === 'merge') {
      setNextSquadTimer(ball);
      if (side === 'player') refundSquadCost(side);
      if (side === 'player') addFx(center.x, center.y - 22, '合成引擎不出兵', '#8bd34e', 10);
      return null;
    }

    // 同路同类优先合流，不增加新单位。
    const same = findSameSquad(side, ball.type, lane);
    if (same) {
      setNextSquadTimer(ball);
      return reinforceSquad(same, ball, center, forced);
    }

    // 每路超上限时，按角色位合流；如果还是没有可合流目标，则延后派遣并退还果汁。
    const laneList = liveSquads(side, lane);
    if (laneList.length >= laneSquadLimit(side, lane)) {
      const slotMate = findSlotSquad(side, ball.type, lane);
      setNextSquadTimer(ball);
      if (slotMate) return reinforceSquad(slotMate, ball, center, forced);
      refundSquadCost(side);
      if (side === 'player') addFx(center.x, center.y - 22, '本路兵团已满', THEME.info, 10);
      return null;
    }

    const alive = group.filter(s => s.alive).length;
    const globalLimit = side === 'player' ? 10 : 10;
    if (alive >= globalLimit && !forced) {
      setNextSquadTimer(ball);
      refundSquadCost(side);
      return null;
    }

    const s = oldSpawn(ball, r, c, side, forced);
    if (!s) {
      setNextSquadTimer(ball);
      refundSquadCost(side);
      return null;
    }
    s.squadMode = true;
    s.squadCount = squadInitialCount(ball.type, ball.level);
    s.squadMax = squadMaxStack(ball.type, ball.level);
    s.squadSlot = squadRoleSlot(ball.type);
    s.mode = 'deploy';
    s.protected = true;
    s.battleReady = false;
    applySquadStats(s, 0);
    setNextSquadTimer(ball);
    addFx(center.x, center.y - 24, `派遣 ${TYPES[ball.type].name}`, TYPES[ball.type].color, 11);
    return s;
  };
  spawnSoldierFromBall._squadModePatched = true;
}

function patchSquadDraw() {
  if (typeof drawSoldier !== 'function' || drawSoldier._squadModePatched) return;
  const oldDrawSoldier = drawSoldier;
  drawSoldier = function squadDrawSoldier(s) {
    oldDrawSoldier(s);
    if (!s.squadMode || !s.alive) return;
    const t = TYPES[s.type] || {};
    const count = s.squadCount || 1;
    const fy = LAYOUT.fieldY, fh = LAYOUT.fieldH;
    const depthFactor = 0.78 + 0.25 * ((s.y - fy) / fh);
    const r = (12 + s.level * 1.8 + Math.min(4, count * 0.55)) * depthFactor;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 10px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(s.x - 23, s.y + r + 6, 46, 15, 7);
    ctx.fill();
    ctx.fillStyle = s.side === 'player' ? '#eaffc3' : '#ffd7cc';
    ctx.fillText(`兵团x${count}`, s.x, s.y + r + 17);

    const role = ({ tank:'前排', front:'枪线', rush:'突击', back:'后排', siege:'攻城', support:'支援', control:'控制' })[t.role] || '兵团';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = t.color || THEME.gold;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeText(role, s.x, s.y - r - 12);
    ctx.fillText(role, s.x, s.y - r - 12);
    ctx.restore();
  };
  drawSoldier._squadModePatched = true;
}

function patchSquadAssistUpdate() {
  if (typeof update !== 'function' || update._squadModePatched) return;
  const oldUpdate = update;
  update = function squadUpdate(dt) {
    oldUpdate(dt);
    if (state.phase !== 'playing') return;
    if (!state._squadModeToastShown && state.time > 1.2) {
      state._squadModeToastShown = true;
      addFx(W / 2, LAYOUT.fieldY + 30, '兵团模式：同路同类会合流，星级提升兵团质量', THEME.gold, 12);
    }
    // 清理死亡兵团，避免尸体占合流位太久。
    state.playerSoldiers = state.playerSoldiers.filter(s => s.alive || (s.mode === 'dead' && s._deadKeep));
    state.enemySoldiers = state.enemySoldiers.filter(s => s.alive || (s.mode === 'dead' && s._deadKeep));
  };
  update._squadModePatched = true;
}
