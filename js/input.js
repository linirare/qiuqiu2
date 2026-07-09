/* ============================================================
   合成塔防 · PvE —— 输入处理
   ============================================================ */

function toGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

function onDown(ev) {
  if (state.phase !== 'playing') return;
  ev.preventDefault();
  const p = toGame(ev.clientX || ev.touches[0].clientX, ev.clientY || ev.touches[0].clientY);

  // 检测帮助按钮
  if (p.x >= HELP_RECT.x && p.x <= HELP_RECT.x + HELP_RECT.w
    && p.y >= HELP_RECT.y && p.y <= HELP_RECT.y + HELP_RECT.h) {
    document.getElementById('helpPanel').classList.remove('hide');
    return;
  }

  // 检测速度按钮
  if (p.x >= SPEED_RECT.x && p.x <= SPEED_RECT.x + SPEED_RECT.w
    && p.y >= SPEED_RECT.y && p.y <= SPEED_RECT.y + SPEED_RECT.h) {
    state.speed = state.speed >= 3 ? 1 : state.speed + 1;
    return;
  }

  // 检测溢出队列按钮
  if (state.overflowQueue.length > 0
    && p.x >= OVERFLOW_RECT.x && p.x <= OVERFLOW_RECT.x + OVERFLOW_RECT.w
    && p.y >= OVERFLOW_RECT.y && p.y <= OVERFLOW_RECT.y + OVERFLOW_RECT.h) {
    showOverflowPopup();
    return;
  }

  // 检测是否点中我方棋盘上的球
  const s = slotAt(p.x, p.y, false);
  if (!s) return;
  const [r, c] = s;
  const ball = state.playerSlots[r][c];
  if (!ball) return;

  state.drag = {
    unit: ball,
    fromR: r,
    fromC: c,
    x: p.x,
    y: p.y,
    sx: p.x,
    sy: p.y,
    moved: false,
  };
}

function onMove(ev) {
  if (!state.drag) return;
  ev.preventDefault();
  const p = toGame(ev.clientX || ev.touches[0].clientX, ev.clientY || ev.touches[0].clientY);
  state.drag.x = p.x;
  state.drag.y = p.y;
  const dx = p.x - state.drag.sx;
  const dy = p.y - state.drag.sy;
  if (dx * dx + dy * dy > 12 * 12) state.drag.moved = true;
}

function onUp(ev) {
  if (!state.drag) return;
  const d = state.drag;
  state.drag = null;

  // 没移动 = 原地点击，不做任何事
  if (!d.moved) return;

  // 检测松手落在哪一格
  const s = slotAt(d.x, d.y, false);
  if (!s) {
    // 拖出棋盘区域 = 放回原位
    return;
  }
  const [toR, toC] = s;

  // 拖到自己原来的格子
  if (toR === d.fromR && toC === d.fromC) return;

  // 尝试合成/交换
  const result = tryMerge(state.playerSlots, d.fromR, d.fromC, toR, toC);
  if (result && result.merged) {
    const ct = TYPES[result.type];
    const center = slotCenter(toR, toC, false);
    addFx(center.x, center.y - 20, `合成 ${ct.icon} Lv.${result.newLevel}`, '#ffe45a', 14);
    // 爆炸环
    state.rings.push({ x: center.x, y: center.y, r: 10, life: 0.5, maxLife: 0.5, color: '#ffe45a' });
    // 合并后可能有空位，溢出队列补上
    drainOverflow(state.playerSlots, state.overflowQueue);
  }
}

/* ——— 视觉特效 ——— */
function addFx(x, y, text, color, size) {
  state.fx.push({ x, y, text, color, size, life: 1, maxLife: 1 });
}

function initInput(cvs) {
  cvs.addEventListener('mousedown', onDown);
  cvs.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cvs.addEventListener('touchstart', onDown, { passive: false });
  cvs.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
}
