/* ============================================================
   合成攻城 · 战斗表现补丁
   让画面与五路推进机制一致。
   ============================================================ */

function drawField() {
  const fy = LAYOUT.fieldY;
  const fh = LAYOUT.fieldH;
  const x = 22;
  const w = W - 44;
  const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
  g.addColorStop(0, 'rgba(102,52,34,0.44)');
  g.addColorStop(0.48, 'rgba(54,40,28,0.38)');
  g.addColorStop(1, 'rgba(42,80,44,0.40)');
  drawPanel(x, fy, w, fh, 16, g, 'rgba(255,228,125,0.14)');

  // 五条纵向推进线，对应棋盘五列兵营。
  for (let c = 0; c < COLS; c++) {
    const lx = BOARD_X + c * (CELL + GAP) + CELL / 2;
    ctx.strokeStyle = 'rgba(255,225,150,0.16)';
    ctx.lineWidth = c === 2 ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(lx, fy + 14);
    ctx.lineTo(lx, fy + fh - 14);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,228,90,0.12)';
    ctx.beginPath();
    ctx.arc(lx, fy + fh / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 中央接战线。
  ctx.strokeStyle = 'rgba(255,228,90,0.32)';
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 18, fy + fh / 2);
  ctx.lineTo(x + w - 18, fy + fh / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 推进方向箭头，强化读法。
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,116,92,0.90)';
  ctx.fillText('敌军向下推进', W / 2, fy + 18);
  ctx.fillStyle = 'rgba(105,236,118,0.90)';
  ctx.fillText('我方向上攻城', W / 2, fy + fh - 8);

  ctx.fillStyle = 'rgba(255,116,92,0.70)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, fy + 30);
  ctx.lineTo(W / 2 + 7, fy + 30);
  ctx.lineTo(W / 2, fy + 42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(105,236,118,0.70)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, fy + fh - 30);
  ctx.lineTo(W / 2 + 7, fy + fh - 30);
  ctx.lineTo(W / 2, fy + fh - 42);
  ctx.closePath();
  ctx.fill();
}

function drawSoldier(s) {
  const t = TYPES[s.type];
  const fy = LAYOUT.fieldY, fh = LAYOUT.fieldH;
  const depthFactor = 0.78 + 0.25 * ((s.y - fy) / fh);
  const r = (9 + s.level * 1.6) * depthFactor;
  const body = s.side === 'enemy' ? '#a53c33' : '#2f9b55';
  const facing = s.side === 'player' ? -1 : 1;

  ctx.save();

  // 行军/战斗状态底圈。
  if (s.mode === 'fight') {
    ctx.strokeStyle = s.side === 'player' ? 'rgba(105,236,118,0.65)' : 'rgba(255,116,92,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y + r * 0.12, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.mode === 'siege') {
    ctx.strokeStyle = 'rgba(255,228,90,0.78)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y + r * 0.12, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + r + 4, r * 0.9, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.hitFlash > 0) {
    ctx.fillStyle = '#ff2f1f';
    ctx.shadowColor = '#ff2f1f';
    ctx.shadowBlur = 8;
  } else {
    ctx.fillStyle = body;
  }
  roundRect(s.x - r * 0.62, s.y - r * 0.10, r * 1.24, r * 1.25, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y - r * 0.35, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = s.side === 'enemy' ? '#ff8a75' : '#98ff9f';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `${Math.round(r * 0.86)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(t.icon, s.x, s.y - r * 0.36);

  // 小箭头表示行军方向。
  ctx.fillStyle = s.side === 'player' ? 'rgba(130,255,140,0.85)' : 'rgba(255,140,112,0.85)';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + facing * r * 1.35);
  ctx.lineTo(s.x - 4, s.y + facing * r * 0.95);
  ctx.lineTo(s.x + 4, s.y + facing * r * 0.95);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.arc(s.x + r * 0.72, s.y + r * 0.20, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `bold ${Math.round(r * 0.48)}px sans-serif`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText(s.level, s.x + r * 0.72, s.y + r * 0.21);

  if (s.hp < s.maxHp) {
    const bw = r * 2.25, bh = 4;
    const bx = s.x - bw / 2, by = s.y - r - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(bx, by, bw, bh, 2);
    ctx.fill();
    ctx.fillStyle = s.hp / s.maxHp > 0.5 ? THEME.safe : s.hp / s.maxHp > 0.25 ? '#ffd24a' : '#ff5a3a';
    roundRect(bx, by, bw * clamp01(s.hp / s.maxHp), bh, 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}
