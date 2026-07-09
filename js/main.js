/* ============================================================
   合成塔防 · PvE —— 主入口
   ============================================================ */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let scale = 1;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.96;
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
initInput(canvas);

/* ——— 更新 ——— */
function update(dt) {
  dt_global = dt;
  if (state.phase !== 'playing') return;

  state.time += dt;

  // 产球计时（玩家）
  state.ballTimer += dt;
  if (state.ballTimer >= BALL_SPAWN_INTERVAL) {
    state.ballTimer -= BALL_SPAWN_INTERVAL;
    const added = autoSpawnBall(state.playerSlots);
    if (!added) {
      // 棋盘满了→入溢出队列
      pushOverflow(state.overflowQueue, randomType(), 1);
    }
    // 溢出队列→自动补位
    drainOverflow(state.playerSlots, state.overflowQueue);
  }

  // 敌方自动产球
  state.enemyBallTimer += dt;
  if (state.enemyBallTimer >= BALL_SPAWN_INTERVAL) {
    state.enemyBallTimer -= BALL_SPAWN_INTERVAL;
    const added = autoSpawnBall(state.enemySlots);
    if (!added) {
      state.enemyOverflow++;
    }
    // 敌方溢出补位（排空）
    if (state.enemyOverflow > 0) {
      const empties = emptySlots(state.enemySlots);
      let placed = 0;
      while (state.enemyOverflow > 0 && placed < empties.length) {
        const [r, c] = empties[placed];
        state.enemySlots[r][c] = createBall(randomType(), 1);
        state.enemyOverflow--;
        placed++;
      }
    }
  }

  // AI 决策
  updateAI(dt);

  // 产兵计时
  state.playerSpawnTimer += dt;
  if (state.playerSpawnTimer >= SOLDIER_SPAWN_INTERVAL) {
    state.playerSpawnTimer -= SOLDIER_SPAWN_INTERVAL;
    spawnPlayerSoldiers();
  }

  state.enemySpawnTimer += dt;
  const eInterval = state.levelConfig ? state.levelConfig.enemySpawnInterval : SOLDIER_SPAWN_INTERVAL;
  if (state.enemySpawnTimer >= eInterval) {
    state.enemySpawnTimer -= eInterval;
    spawnEnemySoldiers();
  }

  // 兵战斗系统
  updateCombat();

  // 球弹跳衰减
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const b = state.playerSlots[r][c];
      if (b && b.bounce > 0) b.bounce = Math.max(0, b.bounce - dt * 3);
    }

  // 受击闪白衰减（帧率无关，约~125ms）
  for (const s of state.playerSoldiers) {
    if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt * 1.2);
  }
  for (const s of state.enemySoldiers) {
    if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt * 1.2);
  }

  // 环特效更新
  for (let i = state.rings.length - 1; i >= 0; i--) {
    const ring = state.rings[i];
    ring.life -= dt;
    ring.r += 60 * dt;
    if (ring.life <= 0) state.rings.splice(i, 1);
  }

  // 特效衰减
  for (let i = state.fx.length - 1; i >= 0; i--) {
    state.fx[i].life -= dt;
    if (state.fx[i].life <= 0) state.fx.splice(i, 1);
  }
}

/* ——— 产兵（暂为 Phase 3 占位，先做简单行走） ——— */
function spawnPlayerSoldiers() {
  const fy = LAYOUT.fieldY + LAYOUT.fieldH / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ball = state.playerSlots[r][c];
      if (!ball) continue;
      const center = slotCenter(r, c, false);
      const s = createSoldier(ball.type, ball.level,
        getAtkMul(meta, ball.type), getHpMul(meta, ball.type));
      s.x = center.x;
      s.y = center.y;
      s.side = 'player';
      s.targetY = fy + (Math.random() - 0.5) * LAYOUT.fieldH * 0.6;
      s.targetX = 40 + Math.random() * (W - 80);
      state.playerSoldiers.push(s);
    }
  }
}

function spawnEnemySoldiers() {
  const fy = LAYOUT.fieldY + LAYOUT.fieldH / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ball = state.enemySlots[r][c];
      if (!ball) continue;
      const center = slotCenter(r, c, true);
      const s = createSoldier(ball.type, ball.level);
      s.x = center.x;
      s.y = center.y;
      s.side = 'enemy';
      s.targetY = fy + (Math.random() - 0.5) * LAYOUT.fieldH * 0.6;
      s.targetX = 40 + Math.random() * (W - 80);
      state.enemySoldiers.push(s);
    }
  }
}

/* ——— 游戏循环 ——— */
let dt_global = 0; // 全局 dt，供 combat.js 读取
let last = 0;

/* ——— 游戏结束 ——— */
function onGameOver(win) {
  const panel = document.getElementById('resultPanel');
  const title = document.getElementById('resultTitle');
  const detail = document.getElementById('resultDetail');
  const retry = document.getElementById('btnRetry');
  const nextBtn = document.getElementById('btnNext');
  const menuBtn = document.getElementById('btnMenu');

  panel.classList.remove('hide');
  if (win) {
    title.textContent = '🎉 胜利！';
    detail.textContent = `第 ${state.currentLevel} 关通关 · 获得 ${state.levelConfig.reward} 金币`;
    meta.gold += state.levelConfig.reward;
    meta.totalWins++;
    if (state.currentLevel >= meta.highestLevel) {
      meta.highestLevel = state.currentLevel + 1;
    }
    nextBtn.classList.remove('hide');
  } else {
    title.textContent = '💀 战败';
    detail.textContent = '城墙被攻破了...再试一次吧';
    nextBtn.classList.add('hide');
  }
  saveMeta();
}
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  update(dt * state.speed);
  draw();
  requestAnimationFrame(loop);
}

/* ——— 启动：加载存档，显示菜单 ——— */
loadMeta();
state.phase = 'menu';
requestAnimationFrame(loop);
