/* ============================================================
   合成攻城 · Merge Siege —— 战斗系统
   ============================================================ */

/* ——— 常量 ——— */
const SOLDIER_SPEED = 95;
const SIEGE_SPEED = 118;
const ATTACK_RANGES = {
  bow: 120,
  sword: 18,
  spear: 22,
  shield: 16,
};
const WALL_ATTACK_INTERVAL = 0.85;

/* ——— 兵移动至战场 ——— */
function assignFieldTarget(s) {
  if (!s.targetY) {
    const margin = 24;
    if (s.side === 'player') {
      s.targetY = LAYOUT.fieldY + LAYOUT.fieldH * 0.58 + Math.random() * (LAYOUT.fieldH * 0.28);
      s.targetX = 40 + Math.random() * (W - 80);
    } else {
      s.targetY = LAYOUT.fieldY + margin + Math.random() * (LAYOUT.fieldH * 0.34);
      s.targetX = 40 + Math.random() * (W - 80);
    }
  }
}

function moveSoldierToField(s) {
  if (s.rallied || s.mode === 'siege') return false;
  assignFieldTarget(s);

  const dx = s.targetX - s.x;
  if (Math.abs(dx) > 4) s.x += Math.sign(dx) * SOLDIER_SPEED * 0.6 * dt_global;

  if (s.side === 'player') {
    if (s.y > s.targetY) {
      s.y -= SOLDIER_SPEED * dt_global;
      if (s.y <= s.targetY) {
        s.y = s.targetY;
        s.rallied = true;
      }
      return !s.rallied;
    }
  } else {
    if (s.y < s.targetY) {
      s.y += SOLDIER_SPEED * dt_global;
      if (s.y >= s.targetY) {
        s.y = s.targetY;
        s.rallied = true;
      }
      return !s.rallied;
    }
  }

  s.rallied = true;
  return false;
}

/* ——— 寻敌：克制优先 → 最近 ——— */
function findTarget(s, enemies) {
  const counterType = COUNTER[s.type];
  let best = null, bestDist = Infinity;
  let bestCounter = null, bestCounterDist = Infinity;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = s.x - e.x, dy = s.y - e.y;
    const dist = dx * dx + dy * dy;
    if (e.type === counterType && dist < bestCounterDist) {
      bestCounter = e;
      bestCounterDist = dist;
    }
    if (dist < bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return bestCounter || best;
}

/* ——— 移动至目标 ——— */
function moveToTarget(s, target, skipClamp = false, speed = SOLDIER_SPEED) {
  const dx = target.x - s.x;
  const dy = target.y - s.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return;
  const step = speed * dt_global;
  s.x += (dx / dist) * Math.min(step, dist);
  s.y += (dy / dist) * Math.min(step, dist);

  if (!skipClamp) {
    const fy = LAYOUT.fieldY, fh = LAYOUT.fieldH;
    if (s.side === 'player') s.y = Math.max(s.y, fy + 4);
    else s.y = Math.min(s.y, fy + fh - 4);
  }
}

function getWallTarget(s) {
  const wallY = s.side === 'player' ? LAYOUT.enemyWallY : LAYOUT.playerWallY;
  const wallH = LAYOUT.wallH;
  const y = s.side === 'player' ? wallY + wallH + 2 : wallY - 2;
  return { x: s.x, y, wallY, wallH };
}

function damageWall(s, wallY, wallH) {
  s.atkTimer -= dt_global;
  if (s.atkTimer > 0) return;

  if (s.side === 'player') {
    const dmg = Math.max(2, Math.round(s.level * 2.2 + s.atk * 0.16));
    state.enemyWallHp = Math.max(0, state.enemyWallHp - dmg);
    addFx(s.x, wallY - 8, `-${dmg}`, '#ffb15e', 13);
    addFx(s.x, wallY + wallH + 3, '破城!', '#ffe45a', 12);
  } else {
    const dmg = Math.max(2, Math.round(s.level * 1.8 + s.atk * 0.10));
    state.playerWallHp = Math.max(0, state.playerWallHp - dmg);
    addFx(s.x, wallY + wallH + 14, `-${dmg}`, '#ff6b4a', 13);
  }

  state.attackFx.push({
    x1: s.x - 7, y1: s.side === 'player' ? wallY + wallH + 2 : wallY - 2,
    x2: s.x + 7, y2: s.side === 'player' ? wallY + 2 : wallY + wallH - 2,
    life: 0.22, maxLife: 0.22,
  });
  state.rings.push({ x: s.x, y: s.side === 'player' ? wallY + wallH : wallY, r: 5, life: 0.25, maxLife: 0.25, color: '#ffe45a' });
  s.atkTimer = WALL_ATTACK_INTERVAL;
  state.shake = 0.35;
}

function siegeWall(s) {
  s.mode = 'siege';
  s.rallied = true;
  const target = getWallTarget(s);
  const atWall = s.side === 'player'
    ? s.y <= target.y + 1
    : s.y >= target.y - 1;

  if (!atWall) {
    moveToTarget(s, { x: s.x, y: target.y }, true, SIEGE_SPEED);
    return;
  }

  s.y = target.y;
  damageWall(s, target.wallY, target.wallH);
}

function killSoldier(target, killerSide, killerAtk, killerType) {
  target.alive = false;
  state.rings.push({ x: target.x, y: target.y, r: 4, life: 0.25, maxLife: 0.25, color: '#ff4a3a' });
  addFx(target.x, target.y - 6, '💀', '#ff6a4a', 12);
  if (killerSide === 'player') {
    state.sp = Math.min(state.sp + 1, SP_MAX);
    state.kills++;
    if (killerAtk > state.maxSoldierAtk) {
      state.maxSoldierAtk = killerAtk;
      state.maxSoldierType = killerType;
    }
  }
}

/* ——— 战斗 ——— */
function soldierCombat(s, enemies) {
  if (!s.alive) return;

  const target = findTarget(s, enemies);
  if (!target) {
    siegeWall(s);
    return;
  }

  s.mode = 'fight';
  const dx = s.x - target.x, dy = s.y - target.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const atkRange = ATTACK_RANGES[s.type] || 18;

  if (dist > atkRange) {
    moveToTarget(s, target);
    return;
  }

  s.atkTimer -= dt_global;
  if (s.atkTimer > 0) return;

  let dmg = s.atk;
  const counterHit = target.type === COUNTER[s.type];
  if (counterHit) dmg = Math.round(dmg * COUNTER_DMG);
  s.atkTimer = s.speed;

  if (s.type === 'bow') {
    playSfx('arrow');
    state.projectiles.push({
      x: s.x, y: s.y,
      targetX: target.x, targetY: target.y,
      targetId: target.id, dmg,
      speed: 230,
      color: TYPES[s.type]?.color || '#ff6b4a',
      life: 1.4,
      side: s.side,
      counterHit,
    });
  } else {
    playSfx('hit');
    target.hp -= dmg;
    target.hitFlash = 0.3;
    state.attackFx.push({ x1: s.x, y1: s.y, x2: target.x, y2: target.y, life: 0.25, maxLife: 0.25 });
    const midX = (s.x + target.x) / 2;
    const midY = (s.y + target.y) / 2 - 8;
    addFx(midX, midY, counterHit ? `克制 -${dmg}` : `-${dmg}`, counterHit ? THEME.gold : THEME.accent, counterHit ? 14 : 13);
    if (target.hp <= 0) killSoldier(target, s.side, s.atk, s.type);
  }
}

/* ——— 兵碰撞排斥 ——— */
function applySeparation(soldiers) {
  const sepDist = 15;
  for (let i = 0; i < soldiers.length; i++) {
    const a = soldiers[i];
    if (!a.alive) continue;
    let fx = 0, fy = 0;
    for (let j = 0; j < soldiers.length; j++) {
      if (i === j) continue;
      const b = soldiers[j];
      if (!b.alive) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < sepDist && dist > 0.1) {
        const force = (sepDist - dist) / sepDist;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }
    }
    if (fx !== 0 || fy !== 0) {
      const speed = 60 * dt_global;
      a.x += fx * speed;
      a.y += fy * speed;
      a.x = Math.max(24, Math.min(W - 24, a.x));
    }
  }
}

function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt_global;
    if (p.life <= 0) { state.projectiles.splice(i, 1); continue; }

    const enemies = p.side === 'player' ? state.enemySoldiers : state.playerSoldiers;
    const tgt = enemies.find(e => e.id === p.targetId && e.alive);
    if (tgt) {
      p.targetX = tgt.x;
      p.targetY = tgt.y;
      const pdx = tgt.x - p.x, pdy = tgt.y - p.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < 10) {
        tgt.hp -= p.dmg;
        tgt.hitFlash = 0.3;
        const midX = (p.x + tgt.x) / 2, midY = (p.y + tgt.y) / 2 - 8;
        addFx(midX, midY, p.counterHit ? `克制 -${p.dmg}` : `-${p.dmg}`, p.counterHit ? THEME.gold : THEME.accent, p.counterHit ? 14 : 13);
        for (let j = 0; j < 4; j++) {
          state.fx.push({
            x: tgt.x, y: tgt.y, text: '·', color: p.color,
            size: 6, life: 0.3, maxLife: 0.3,
            vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50,
          });
        }
        if (tgt.hp <= 0) killSoldier(tgt, p.side, p.dmg, 'bow');
        state.projectiles.splice(i, 1);
        continue;
      }
      if (pdist > 0.1) {
        p.x += (pdx / pdist) * p.speed * dt_global;
        p.y += (pdy / pdist) * p.speed * dt_global;
      }
    } else {
      const pdx = p.targetX - p.x, pdy = p.targetY - p.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < 5) { state.projectiles.splice(i, 1); continue; }
      p.x += (pdx / pdist) * p.speed * dt_global;
      p.y += (pdy / pdist) * p.speed * dt_global;
    }
  }
}

/* ——— 更新所有兵 ——— */
function updateCombat() {
  if (state.phase !== 'playing') return;

  state.playerSoldiers = state.playerSoldiers.filter(s => s.alive);
  state.enemySoldiers = state.enemySoldiers.filter(s => s.alive);

  for (const s of state.playerSoldiers) {
    if (!s.alive) continue;
    const moving = moveSoldierToField(s);
    if (!moving) soldierCombat(s, state.enemySoldiers);
  }

  for (const s of state.enemySoldiers) {
    if (!s.alive) continue;
    const moving = moveSoldierToField(s);
    if (!moving) soldierCombat(s, state.playerSoldiers);
  }

  state.playerSoldiers = state.playerSoldiers.filter(s => s.alive);
  state.enemySoldiers = state.enemySoldiers.filter(s => s.alive);

  applySeparation(state.playerSoldiers);
  applySeparation(state.enemySoldiers);

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt_global * 4);

  updateProjectiles();

  if (state.playerWallHp <= 0) {
    state.phase = 'lost';
    onGameOver(false);
  } else if (state.enemyWallHp <= 0) {
    state.phase = 'won';
    onGameOver(true);
  }
}
