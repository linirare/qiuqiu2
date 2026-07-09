/* ============================================================
   合成塔防 · PvE —— AI 对手
   ============================================================ */

const AI_MERGE_INTERVAL = 4.0; // AI 每 4 秒尝试一次合成
let aiTimer = 0;

/* ——— 敌方棋盘自动产球（与玩家同步） ——— */
function updateEnemyBoard(dt) {
  // 产球（在 main.js 中已由 spawnEnemyBalls 处理）
  // 这里只做 AI 合成
}

/* ——— AI 合成策略：找棋盘上同品类同级中最高级的对子 ——— */
function aiMerge() {
  const slots = state.enemySlots;
  const pairs = {}; // key: "type_level" → [{r, c, level, type}, ...]

  // 按品类+等级分组
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ball = slots[r][c];
      if (!ball) continue;
      const key = ball.type + '_' + ball.level;
      if (!pairs[key]) pairs[key] = [];
      pairs[key].push({ r, c, level: ball.level, type: ball.type });
    }
  }

  // 找最高级的可合对子
  let bestKey = null, bestLevel = 0;
  for (const [key, list] of Object.entries(pairs)) {
    if (list.length >= 2 && list[0].level > bestLevel && list[0].level < MAX_LEVEL) {
      bestKey = key;
      bestLevel = list[0].level;
    }
  }

  if (!bestKey) return;

  // 执行合成
  const list = pairs[bestKey];
  const src = list[0];
  const dst = list[1];
  const result = tryMerge(slots, src.r, src.c, dst.r, dst.c);
  if (result && result.merged) {
    // AI 合成飞字（放特效）
    const center = slotCenter(dst.r, dst.c, true);
    addFx(center.x, center.y - 12,
      `${TYPES[result.type].icon} AI合成 Lv.${result.newLevel}`, '#ffb84a', 11);
    state.rings.push({ x: center.x, y: center.y, r: 6, life: 0.3, maxLife: 0.3, color: '#ff8a5a' });
  }
}

/* ——— AI 更新（由主循环调用） ——— */
function updateAI(dt) {
  if (state.phase !== 'playing') return;

  // AI 合成计时
  aiTimer += dt;
  if (aiTimer >= AI_MERGE_INTERVAL) {
    aiTimer -= AI_MERGE_INTERVAL;
    aiMerge();
  }

  // 敌方棋盘自动产球
  // （在 main.js 的 update 中由 spawnEnemyBalls 处理）
}

/* ——— 重置 AI 计时器 ——— */
function resetAI() {
  aiTimer = 1.0; // 开局 1 秒后 AI 开始合成
}
