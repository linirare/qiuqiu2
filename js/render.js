/* ============================================================
   合成塔防 · PvE —— Canvas 渲染
   ============================================================ */

/* ——— 工具 ——— */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ——— 背景 ——— */
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1410');
  sky.addColorStop(0.5, '#2a2218');
  sky.addColorStop(1, '#1a1410');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

/* ——— 棋盘 ——— */
function drawBoard(slots, isEnemy, dragHint = null) {
  const by = isEnemy ? LAYOUT.enemyBoardY : LAYOUT.playerBoardY;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = BOARD_X + c * (CELL + GAP);
      const y = by + r * (CELL + GAP);
      const ball = slots[r][c];

      // 格子背景
      const isMergeHint = dragHint && ball && dragHint.type === ball.type && dragHint.level === ball.level;
      ctx.fillStyle = isMergeHint
        ? 'rgba(255,228,90,0.15)'
        : (r + c) % 2 === 0 ? 'rgba(255,235,180,0.05)' : 'rgba(255,235,180,0.09)';
      roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();

      // 可合成高亮框
      if (isMergeHint) {
        ctx.strokeStyle = '#ffe45a';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ffe45a';
        ctx.shadowBlur = 12;
        roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (ball) {
        ctx.save();
        if (isEnemy) ctx.globalAlpha = 0.7;
        drawBall(ball, x + CELL / 2, y + CELL / 2, CELL * 0.38);
        ctx.restore();
      }
    }
  }
}

/* ——— 球 ——— */
function drawBall(ball, cx, cy, radius, extraY = 0) {
  const t = TYPES[ball.type];
  const bounceOff = ball.bounce ? -Math.sin(ball.bounce * Math.PI) * 12 : 0;
  const r = radius * (1 + (ball.level - 1) * 0.03); // 等级越高略大
  const drawY = cy - bounceOff + extraY;

  // 外发光
  ctx.shadowColor = t.color;
  ctx.shadowBlur = 8 + ball.level * 3;

  // 圆盘
  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.arc(cx, drawY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 内圈高光
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, drawY - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 等级数字
  ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2.5;
  ctx.strokeText(ball.level, cx, drawY);
  ctx.fillStyle = '#fff';
  ctx.fillText(ball.level, cx, drawY);

  // 品类图标（右下小角标）
  ctx.font = `${Math.round(r * 0.55)}px sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const iconR = r * 0.55;
  ctx.beginPath();
  ctx.arc(cx + r * 0.6, drawY + r * 0.6, iconR * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${Math.round(r * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(t.icon, cx + r * 0.6, drawY + r * 0.6);
  ctx.textBaseline = 'alphabetic';
}

/* ——— 城墙 ——— */
function drawWall(hp, maxHp, isEnemy) {
  const y = isEnemy ? LAYOUT.enemyWallY : LAYOUT.playerWallY;
  const w = W * 0.7;
  const h = LAYOUT.wallH;
  const x = (W - w) / 2;

  // 城墙基底
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#5a4832');
  g.addColorStop(1, '#3a2e1e');
  ctx.fillStyle = g;
  roundRect(x, y, w, h, 4);
  ctx.fill();

  // 垛口
  ctx.fillStyle = '#6a563c';
  for (let i = 0; i < 12; i++)
    ctx.fillRect(x + 4 + i * (w - 8) / 11, y - 6, (w - 8) / 12 - 2, 6);

  // HP 条
  const barW = w - 12, barH = 8;
  const barX = x + 6, barY = y + h - barH - 4;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(barX, barY, barW, barH, 3);
  ctx.fill();
  const frac = hp / maxHp;
  ctx.fillStyle = frac > 0.5 ? '#7aff5a' : frac > 0.25 ? '#ffd24a' : '#ff5a3a';
  roundRect(barX + 1, barY + 1, (barW - 2) * frac, barH - 2, 2);
  ctx.fill();

  // HP 文字
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd8a0';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 2;
  const txt = `🏰 ${hp}/${maxHp}`;
  ctx.strokeText(txt, W / 2, y - 10);
  ctx.fillText(txt, W / 2, y - 10);
}

/* ——— 战场区域 ——— */
function drawField() {
  const fy = LAYOUT.fieldY;
  const fh = LAYOUT.fieldH;

  // 战场底色
  ctx.fillStyle = 'rgba(60,44,28,0.4)';
  roundRect(20, fy, W - 40, fh, 8);
  ctx.fill();

  // 中线
  ctx.strokeStyle = 'rgba(255,200,100,0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(20, fy + fh / 2);
  ctx.lineTo(W - 20, fy + fh / 2);
  ctx.stroke();
  ctx.setLineDash([]);

}

/* ——— 兵 ——— */
function drawSoldier(s) {
  const t = TYPES[s.type];
  const r = 8 + s.level * 1.5;

  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + r + 2, r * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 受击闪白
  if (s.hitFlash > 0) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 兵的身体
    ctx.fillStyle = s.side === 'enemy' ? t.color + '99' : t.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 边框
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.stroke();

  // 品类图标
  ctx.font = `${Math.round(r * 0.8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.icon, s.x, s.y + 1);

  // 血条
  if (s.hp < s.maxHp) {
    const bw = r * 2.2, bh = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(s.x - bw / 2, s.y - r - 6, bw, bh);
    ctx.fillStyle = s.hp / s.maxHp > 0.5 ? '#7aff5a' : s.hp / s.maxHp > 0.25 ? '#ffd24a' : '#ff5a3a';
    ctx.fillRect(s.x - bw / 2, s.y - r - 6, bw * (s.hp / s.maxHp), bh);
  }
  ctx.textBaseline = 'alphabetic';
}

/* ——— 合成环特效 ——— */
function drawRings() {
  for (const ring of state.rings) {
    const alpha = ring.life / ring.maxLife;
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = ring.color || '#ffe45a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ——— 特效文字 ——— */
function drawFx() {
  for (const f of state.fx) {
    const alpha = f.life / f.maxLife;
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${f.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - (1 - alpha) * 30);
  }
  ctx.globalAlpha = 1;
}

/* ——— 帮助按钮 ——— */
const HELP_RECT = { x: W - 116, y: 4, w: 28, h: 26 };

function drawHelpBtn() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(HELP_RECT.x, HELP_RECT.y, HELP_RECT.w, HELP_RECT.h, 8);
  ctx.fill();
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9b69a';
  ctx.fillText('?', HELP_RECT.x + HELP_RECT.w / 2, HELP_RECT.y + 19);
}

/* ——— 速度控制按钮 ——— */
const SPEED_RECT = { x: W - 80, y: 4, w: 72, h: 26 };

function drawSpeedBtn() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(SPEED_RECT.x, SPEED_RECT.y, SPEED_RECT.w, SPEED_RECT.h, 8);
  ctx.fill();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9b69a';
  ctx.fillText(`⏩ ×${state.speed}`, SPEED_RECT.x + SPEED_RECT.w / 2, SPEED_RECT.y + 18);
}

/* ——— 溢出队列指示（可点击区域） ——— */
const OVERFLOW_RECT = { x: W / 2 - 56, y: LAYOUT.bottomY + 4, w: 112, h: 30 };

function drawOverflowIndicator() {
  if (state.overflowQueue.length === 0) return;
  const txt = `📦 ×${state.overflowQueue.length}`;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(OVERFLOW_RECT.x, OVERFLOW_RECT.y, OVERFLOW_RECT.w, OVERFLOW_RECT.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,228,90,0.3)';
  ctx.lineWidth = 1;
  roundRect(OVERFLOW_RECT.x, OVERFLOW_RECT.y, OVERFLOW_RECT.w, OVERFLOW_RECT.h, 10);
  ctx.stroke();
  ctx.fillStyle = '#ffe45a';
  ctx.fillText(txt, W / 2, OVERFLOW_RECT.y + 21);
}

/* ——— 信息 ——— */
function drawInfo() {
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c9b69a';
  if (state.levelConfig) {
    ctx.fillText(`第 ${state.currentLevel} 关`, 12, LAYOUT.enemyInfoY + 13);
    ctx.fillStyle = '#a89a76';
    ctx.font = '11px sans-serif';
    ctx.fillText(state.levelConfig.desc, 12, LAYOUT.enemyInfoY + 28);
  } else {
    ctx.fillText('合成塔防', 12, LAYOUT.enemyInfoY + 13);
  }
}

/* ——— HUD / 对战状态 ——— */
function drawHUD() {
  if (state.phase !== 'playing') return;

  // 兵数量对比
  const pCount = state.playerSoldiers.filter(s => s.alive).length;
  const eCount = state.enemySoldiers.filter(s => s.alive).length;
  const elapsed = Math.floor(state.time);

  // 右上：时间 + 兵数
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8a7a5a';
  ctx.fillText(`⏱ ${elapsed}s`, W - 12, LAYOUT.enemyInfoY + 13);

  // 兵数标签（放在战场两侧）
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6fd44e';
  ctx.fillText(`⚔️ ${pCount}`, 28, LAYOUT.fieldY + LAYOUT.fieldH - 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff6b4a';
  ctx.fillText(`${eCount} ⚔️`, W - 28, LAYOUT.fieldY + 14);

  // 中间"战场"标签改为动态
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(200,180,140,0.4)';
  ctx.fillText(`⚔️ 第 ${state.currentLevel} 关 ⚔️`, W / 2, LAYOUT.fieldY + LAYOUT.fieldH - 4);
}

/* ——— 主绘制 ——— */
function draw() {
  ctx.save();
  if (state.shake > 0.05) ctx.translate(
    (Math.random() - 0.5) * state.shake * 12,
    (Math.random() - 0.5) * state.shake * 12
  );

  drawBackground();
  drawInfo();

  // 敌方棋盘
  drawBoard(state.enemySlots, true);
  // 敌方城墙
  drawWall(state.enemyWallHp, state.enemyWallMax, true);

  // 战场
  drawField();

  // 我方城墙
  drawWall(state.playerWallHp, state.playerWallMax, false);
  // 拖拽提示（可合成的目标）
  let dragHint = null;
  if (state.drag && state.drag.moved) {
    const du = state.drag.unit;
    dragHint = { type: du.type, level: du.level };
  }

  // 我方棋盘（拖拽中时高亮可合成目标）
  drawBoard(state.playerSlots, false, dragHint);

  // 兵（画在棋盘之后，避免被格子遮盖）
  for (const s of state.playerSoldiers) drawSoldier(s);
  for (const s of state.enemySoldiers) drawSoldier(s);

  // 拖拽中的球
  if (state.drag) {
    const ball = state.drag.unit;
    const p = { x: state.drag.x, y: state.drag.y };
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 20;
    drawBall(ball, p.x, p.y, CELL * 0.42, 0);
    ctx.restore();
  }

  drawOverflowIndicator();
  drawHUD();
  drawRings();
  drawSpeedBtn();
  drawHelpBtn();
  drawFx();
  ctx.restore();
}
