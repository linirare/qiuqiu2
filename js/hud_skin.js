/* ============================================================
   合成攻城 · HUD 表现补丁
   ============================================================ */

function drawHUD() {
  if (state.phase !== 'playing' && state.phase !== 'paused') return;
  const pCount = state.playerSoldiers.filter(s => s.alive).length;
  const eCount = state.enemySoldiers.filter(s => s.alive).length;
  const total = pCount + eCount || 1;
  const elapsed = Math.floor(state.time);
  const spMax = typeof getSpMax === 'function' ? getSpMax(meta) : SP_MAX;
  const recoverCap = typeof getSpRecoverCap === 'function' ? getSpRecoverCap(meta) : 6;

  drawPanel(10, LAYOUT.fieldY + LAYOUT.fieldH - 38, 126, 30, 10, 'rgba(0,0,0,0.34)', null);
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = state.sp > 0 ? THEME.gold : '#695438';
  ctx.fillText(`士气 ⚡ ${state.sp}/${spMax}`, 20, LAYOUT.fieldY + LAYOUT.fieldH - 20);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = THEME.textDim;
  ctx.fillText(`自动回复至 ${recoverCap}`, 20, LAYOUT.fieldY + LAYOUT.fieldH - 10);

  drawPanel(W - 112, LAYOUT.fieldY + LAYOUT.fieldH - 34, 102, 26, 10, 'rgba(0,0,0,0.30)', null);
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = THEME.textDim;
  ctx.fillText(`⏱ ${elapsed}s`, W - 20, LAYOUT.fieldY + LAYOUT.fieldH - 16);

  const barW = 116, barH = 8;
  const bx = W / 2 - barW / 2, by = LAYOUT.fieldY + LAYOUT.fieldH - 28;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  roundRect(bx, by, barW, barH, 4);
  ctx.fill();
  ctx.fillStyle = THEME.safe;
  roundRect(bx, by, barW * (pCount / total), barH, 4);
  ctx.fill();
  ctx.fillStyle = THEME.accent;
  roundRect(bx + barW * (pCount / total), by, barW * (eCount / total), barH, 4);
  ctx.fill();

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = THEME.safe;
  ctx.fillText(`我方 ${pCount}`, bx, by - 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = THEME.accent;
  ctx.fillText(`${eCount} 敌方`, bx + barW, by - 4);
}
