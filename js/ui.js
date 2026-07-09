/* ============================================================
   水果突击 · Fruit Assault —— DOM 界面管理
   ============================================================ */

/* ===== 底部导航 Tab 切换 ===== */
function switchTab(name) {
  // Don't switch tabs during active battle (guard: playing + canvas visible)
  const canvasWrap = document.getElementById('wrap');
  const inBattle = state.phase === 'playing' && canvasWrap && canvasWrap.style.display !== 'none';
  if (inBattle && name !== 'stages') return;

  // Safety: reset phase if we're not actually in battle
  if (state.phase === 'playing' && canvasWrap && canvasWrap.style.display === 'none') {
    state.phase = 'menu';
  }

  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  // Show target tab
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });

  // Special handling per tab
  if (name === 'home') {
    refreshHomeStats();
  } else if (name === 'stages') {
    if (state.phase !== 'playing') renderStageSelect();
  } else if (name === 'characters') {
    renderDeckBar();
    renderCharGrid();
  } else if (name === 'shop') {
    renderShop();
  } else if (name === 'leaderboard') {
    renderLeaderboard();
  }
}

function showBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (nav) nav.style.display = 'flex';
}

function hideBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (nav) nav.style.display = 'none';
}

/* Placeholder render functions (filled in later phases) */
function refreshHomeStats() {
  // Update gold display
  const goldEl = document.getElementById('menuGold');
  if (goldEl) goldEl.textContent = meta.gold || 0;

  // Update stage display
  const stageEl = document.getElementById('menuStage');
  if (stageEl) stageEl.textContent = meta.highestLevel || 1;

  // Update stats card if exists
  const totalStarsEl = document.getElementById('homeTotalStars');
  if (totalStarsEl) {
    const totalStars = Object.values(meta.stars || {}).reduce((a,b) => a + b, 0);
    totalStarsEl.textContent = totalStars;
  }
  const totalWinsEl = document.getElementById('homeTotalWins');
  if (totalWinsEl) totalWinsEl.textContent = meta.totalWins || 0;
  const highestLevelEl = document.getElementById('homeHighestLevel');
  if (highestLevelEl) highestLevelEl.textContent = meta.highestLevel || 1;

  // Update deck preview in home
  var previewEl = document.getElementById('menuDeckPreview');
  if (previewEl) {
    var deck = activeDeck();
    previewEl.innerHTML = deck.map(function(id) {
      var t = TYPES[id];
      return t ? '<span style="font-size:28px" title="' + t.name + '">' + t.icon + '</span>' : '';
    }).join('');
  }

  // Refresh deck preview in home tab
  if (typeof refreshDeckPreview === 'function') refreshDeckPreview();
}

/* Handle "开始突击" button click - switch to stages tab and start game */
function startBattle() {
  var level = meta.highestLevel || 1;
  // Switch to stages tab first
  switchTab('stages');
  // Short delay to let tab render, then start the stage
  setTimeout(function() {
    hideBottomNav();
    document.getElementById('stageSelectArea').style.display = 'none';
    document.getElementById('wrap').style.display = 'block';
    initLevel(level);
  }, 150);
}

function renderStageSelect() {
  const container = document.getElementById('stageSelectArea');
  if (!container) return;

  const maxStage = 20;
  const unlocked = meta.highestLevel || 1;
  const stars = meta.stars || {};

  let html = '<div class="stage-header"><h2>🚩 选择关卡</h2><p class="sub">共 ' + maxStage + ' 关 · 当前进度：第 ' + unlocked + ' 关</p></div>';
  html += '<div class="stage-grid">';

  for (let k = 1; k <= maxStage; k++) {
    const lv = generateLevel(k);
    const locked = k > unlocked;
    const starCount = stars[k] || 0;
    const starsStr = locked ? '🔒' : ('⭐'.repeat(starCount) + '☆'.repeat(3 - starCount));
    const cls = locked ? 'stage-card locked' : (starCount === 3 ? 'stage-card cleared' : 'stage-card');

    html += '<div class="' + cls + '" data-stage="' + k + '">' +
      '<div class="stage-num">' + (lv.isBoss ? '👑' : '') + '第' + k + '关</div>' +
      '<div class="stage-stars">' + starsStr + '</div>' +
      '<div class="stage-info">' + (lv.isBoss ? 'BOSS' : '敌军 Lv' + lv.enemyInitLevel.toFixed(1)) + '</div>' +
      '<div class="stage-reward">🍋 +' + lv.reward + '</div>' +
    '</div>';
  }

  html += '</div>';
  container.innerHTML = html;

  // Bind click handlers
  container.querySelectorAll('.stage-card:not(.locked)').forEach(card => {
    card.addEventListener('click', function() {
      const stage = parseInt(this.dataset.stage);
      startStage(stage);
    });
  });
}

function startStage(k) {
  hideBottomNav();
  // Hide stage select, show canvas
  document.getElementById('stageSelectArea').style.display = 'none';
  document.getElementById('wrap').style.display = 'block';
  initLevel(k);
}

function showStageSelect() {
  state.phase = 'menu';
  showBottomNav();
  document.getElementById('stageSelectArea').style.display = 'block';
  document.getElementById('wrap').style.display = 'none';
  renderStageSelect();
  switchTab('stages');
}

/* ——— 科技项配置：按 12 个水果球动态生成 ——— */
function buildUpgradeGroups() {
  const groups = UNIT_POOL.map(id => {
    const t = TYPES[id];
    return {
      title: `${t.icon} ${t.name} · ${roleLabel(t.role)}`,
      items: [
        { key: id + '_atk', label: `${t.name}攻击`, type: id, stat: 'atk', maxLv: UPGRADE_MAX, wall: false },
        { key: id + '_hp',  label: `${t.name}韧性`, type: id, stat: 'hp',  maxLv: UPGRADE_MAX, wall: false },
      ],
    };
  });
  groups.push({
    title: '🍹 果园战略科技',
    items: [
      { key: 'wall', label: '我方果堡', type: null, stat: null, maxLv: WALL_UPGRADE_MAX, wall: true },
      { key: 'sp',   label: '果汁泵', type: null, stat: null, maxLv: SP_UPGRADE_MAX, sp: true },
    ],
  });
  return groups;
}
function roleLabel(role) {
  return ({ tank:'前排', back:'输出', rush:'突击', front:'枪线', siege:'攻城', control:'控制', support:'辅助', merge:'合成引擎' })[role] || role;
}
const UPGRADE_GROUPS = buildUpgradeGroups();

function getItemLv(item) {
  if (item.wall) return meta.wallLv || 0;
  if (item.sp) return meta.spLv || 0;
  return getUpgradeLv(meta, item.type, item.stat);
}
function addItemLv(item) {
  if (item.wall) meta.wallLv++;
  else if (item.sp) meta.spLv = (meta.spLv || 0) + 1;
  else {
    const key = upgradeKey(item.type, item.stat);
    meta.upgrades[key] = (meta.upgrades[key] || 0) + 1;
  }
}
function itemEffectText(item) {
  if (item.wall) return `+${WALL_PER_LV}耐久/级`;
  if (item.sp) return '开局果汁能量/上限提升';
  return `+${Math.round(UPGRADE_PER_LV * 100)}%/级`;
}
function milestoneText(item, lv) {
  const m = TECH_MILESTONES[item.key];
  if (!m) return '';
  if (lv >= m.at) return `已解锁：${m.title} · ${m.desc}`;
  return `节点 Lv.${m.at}：${m.title}`;
}
function renderUpgrades() {
  const list = document.getElementById('upgradeList');
  const goldSpan = document.getElementById('upGold');
  goldSpan.textContent = meta.gold;
  list.innerHTML = '';

  for (const group of UPGRADE_GROUPS) {
    const section = document.createElement('div');
    section.className = 'upgrade-section';
    section.innerHTML = `<h3>${group.title}</h3>`;
    for (const item of group.items) {
      const el = document.createElement('div');
      const lv = getItemLv(item);
      const maxed = lv >= item.maxLv;
      const cost = upgradeCost(lv + 1);
      const canAfford = meta.gold >= cost && !maxed;
      el.className = 'upgrade-item' + (canAfford ? '' : ' disabled');
      const node = milestoneText(item, lv);
      el.innerHTML = `
        <span class="uilabel">${item.label} <span class="uilevel">Lv.${lv}</span><br>
          <small>${itemEffectText(item)}${node ? ' · ' + node : ''}</small>
        </span>
        <span class="uicost ${maxed ? 'maxed' : canAfford ? 'can-afford' : ''}">${maxed ? 'MAX' : cost + '🍋'}</span>
      `;
      if (canAfford) {
        el.addEventListener('click', () => {
          addItemLv(item);
          meta.gold -= cost;
          saveMeta();
          renderUpgrades();
          refreshGold();
        });
      }
      section.appendChild(el);
    }
    list.appendChild(section);
  }
}

/* ——— 溢出队列弹窗 ——— */
function showOverflowPopup() {
  const popup = document.getElementById('overflowPopup');
  const list = document.getElementById('overflowList');
  list.innerHTML = '';
  if (state.overflowQueue.length === 0) {
    list.innerHTML = '<p style="color:#8a7a5a;font-size:13px;">队列为空</p>';
  } else {
    for (let i = 0; i < state.overflowQueue.length; i++) {
      const item = state.overflowQueue[i];
      const t = TYPES[normalizeTypeId(item.type)] || TYPES[DEFAULT_DECK[0]];
      const el = document.createElement('div');
      el.style.cssText = `display:flex;align-items:center;gap:5px;padding:8px 11px;background:rgba(255,255,255,0.42);border:1px solid rgba(72,174,70,0.16);border-radius:10px;cursor:pointer;color:#416329;font-size:13px;`;
      el.innerHTML = `${t.icon} ${t.name} Lv.${item.level}`;
      el.title = '点击后选择棋盘空格放置';
      const pick = (e) => {
        e.stopPropagation();
        document.getElementById('overflowPopup').classList.add('hide');
        state.pendingPlace = { type: normalizeTypeId(item.type), level: item.level, queueIndex: i };
      };
      el.addEventListener('mousedown', pick);
      el.addEventListener('touchstart', pick, { passive: true });
      list.appendChild(el);
    }
  }
  popup.classList.remove('hide');
}

document.getElementById('btnOverflowClose').addEventListener('click', () => document.getElementById('overflowPopup').classList.add('hide'));

/* ——— 保存/读取 meta ——— */
const META_KEY = 'merge_td_meta_v1';
function saveMeta() {
  meta.deck = normalizeDeck(meta.deck || DEFAULT_DECK);
  meta.unlocked = Array.isArray(meta.unlocked) && meta.unlocked.length ? meta.unlocked.map(normalizeTypeId).filter(id => TYPES[id]) : UNIT_POOL.slice();
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
}
function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      meta.gold = saved.gold || 0;
      meta.upgrades = saved.upgrades || {};
      meta.wallLv = saved.wallLv || 0;
      meta.spLv = saved.spLv || 0;
      meta.highestLevel = Math.max(1, saved.highestLevel || 1);
      meta.totalWins = saved.totalWins || 0;
      meta.stars = saved.stars || {};
      meta.deck = normalizeDeck(saved.deck || saved.activeDeck || DEFAULT_DECK);
      meta.unlocked = Array.isArray(saved.unlocked) && saved.unlocked.length ? saved.unlocked.map(normalizeTypeId).filter(id => TYPES[id]) : UNIT_POOL.slice();
    } else {
      meta.deck = normalizeDeck(DEFAULT_DECK);
      meta.unlocked = UNIT_POOL.slice();
    }
  } catch (e) {
    meta.deck = normalizeDeck(DEFAULT_DECK);
    meta.unlocked = UNIT_POOL.slice();
  }
  refreshGold();
}
function refreshGold() {
  const g = meta.gold || 0;
  const menuEl = document.getElementById('menuGold');
  if (menuEl) menuEl.textContent = g;
  const upEl = document.getElementById('upGold');
  if (upEl) upEl.textContent = g;
  const stageEl = document.getElementById('menuStage');
  if (stageEl) stageEl.textContent = meta.highestLevel || 1;
  const deckEl = document.getElementById('menuDeck');
  if (deckEl) deckEl.innerHTML = normalizeDeck(meta.deck).map(id => `<span title="${TYPES[id].name}">${TYPES[id].icon}</span>`).join('');
}

/* ——— 按钮事件绑定 ——— */
document.addEventListener('DOMContentLoaded', () => {
  loadMeta();
  document.getElementById('btnStart').addEventListener('click', () => {
    meta.deck = normalizeDeck(meta.deck);
    saveMeta();
    startBattle();
  });
  document.getElementById('btnDeck').addEventListener('click', () => {
    switchTab('characters');
  });
  document.getElementById('btnUpgrade').addEventListener('click', () => {
    switchTab('characters');
  });
  document.getElementById('btnUpClose').addEventListener('click', () => document.getElementById('upgradePanel').classList.add('hide'));
  document.getElementById('btnHelpClose').addEventListener('click', () => document.getElementById('helpPanel').classList.add('hide'));
  // Result panel buttons
  document.getElementById('btnRetry').addEventListener('click', function() {
    document.getElementById('resultPanel').classList.add('hide');
    const currentLevel = state.currentLevel || 1;
    startStage(currentLevel);
  });
  document.getElementById('btnNext').addEventListener('click', function() {
    document.getElementById('resultPanel').classList.add('hide');
    var nextLevel = (state.currentLevel || 1) + 1;
    if (nextLevel <= 20) startStage(nextLevel);
    else {
      // All stages cleared!
      meta.highestLevel = 21; // Mark as fully cleared
      saveMeta();
      showStageSelect();
    }
  });

  document.getElementById('btnMenu').addEventListener('click', function() {
    document.getElementById('resultPanel').classList.add('hide');
    showStageSelect();
  });
  const simBtn = document.getElementById('btnSim');
  if (simBtn) {
    simBtn.addEventListener('click', () => {
      const panel = document.getElementById('simPanel');
      const result = document.getElementById('simResult');
      panel.classList.remove('hide');
      if (typeof renderBalanceSim === 'function') renderBalanceSim(20, 80);
      else result.innerHTML = '模拟器未加载。';
    });
  }
  const simClose = document.getElementById('btnSimClose');
  if (simClose) simClose.addEventListener('click', () => document.getElementById('simPanel').classList.add('hide'));

  const resetBtn = document.getElementById('btnReset');
  let resetTimer = null;
  const resetStart = (e) => {
    if (e) e.preventDefault();
    resetTimer = setTimeout(() => { localStorage.removeItem(META_KEY); location.reload(); }, 1500);
    resetBtn.textContent = '继续按住以确认...';
  };
  const resetCancel = () => { clearTimeout(resetTimer); resetBtn.textContent = '长按重置数据'; };
  resetBtn.addEventListener('mousedown', resetStart);
  resetBtn.addEventListener('mouseup', resetCancel);
  resetBtn.addEventListener('mouseleave', resetCancel);
  resetBtn.addEventListener('touchstart', resetStart, { passive: false });
  resetBtn.addEventListener('touchend', resetCancel);

  /* ===== 初始化底部导航 ===== */
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      switchTab(this.dataset.tab);
    });
  });

  // Default to home tab
  initLeaderboardTab();
  switchTab('home');
});

/* ===== Characters Tab ===== */

const ROLE_NAMES = { tank:'坦克', front:'前线', rush:'突击', back:'后排', siege:'攻城', control:'控制', support:'支援', merge:'合成' };
const RARITY_NAMES = { normal:'普通', rare:'稀有', epic:'史诗' };

function renderDeckBar() {
  const container = document.getElementById('deckBar');
  if (!container) return;
  const deck = activeDeck();
  let html = '';
  for (let i = 0; i < 5; i++) {
    const typeId = deck[i];
    const t = TYPES[typeId];
    if (t) {
      html += '<div class="deck-slot" title="' + t.name + '">' +
        t.icon + '<span class="slot-badge">' + (i + 1) + '</span></div>';
    }
  }
  html += '<button class="deck-edit-btn" id="btnEditDeck">✏️ 编辑编队</button>';
  container.innerHTML = html;

  var editDeckBtn = document.getElementById('btnEditDeck');
  if (editDeckBtn) {
    editDeckBtn.addEventListener('click', function() {
      var deckPanel = document.getElementById('deckPanel');
      if (deckPanel) {
        deckPanel.classList.remove('hide');
        if (typeof renderDeckPanel === 'function') renderDeckPanel();
      }
    });
  }
}

function renderCharGrid() {
  const container = document.getElementById('charGrid');
  if (!container) return;
  const deck = activeDeck();
  let selectedId = container.dataset.selected || '';

  let html = '';
  for (const typeId of UNIT_POOL) {
    const t = TYPES[typeId];
    if (!t) continue;
    const inDeck = deck.includes(typeId);
    const sel = typeId === selectedId ? ' selected' : '';
    const epic = t.rarity === 'epic' ? ' epic' : '';

    html += '<div class="char-card' + sel + epic + '" data-type="' + typeId + '">' +
      '<div class="char-icon">' + t.icon + '</div>' +
      '<div class="char-name">' + (inDeck ? '✅ ' : '') + t.name + '</div>' +
      '<div class="char-role">' + (ROLE_NAMES[t.role] || t.role) + ' · ' + (RARITY_NAMES[t.rarity] || t.rarity) + '</div>' +
      '<div class="char-rarity ' + t.rarity + '">⚔' + t.atk + ' ❤' + t.hp + '</div>' +
    '</div>';
  }
  container.innerHTML = html;

  container.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', function() {
      showCharDetail(this.dataset.type);
    });
  });
}

function showCharDetail(typeId) {
  const container = document.getElementById('charDetail');
  if (!container) return;
  const t = TYPES[typeId];
  if (!t) return;

  const atkLv = getUpgradeLv(meta, typeId, 'atk');
  const hpLv = getUpgradeLv(meta, typeId, 'hp');
  const atkCost = upgradeCost(atkLv);
  const hpCost = upgradeCost(hpLv);
  const deck = activeDeck();
  const inDeck = deck.includes(typeId);

  container.innerHTML =
    '<button class="detail-close" id="btnCharDetailClose">✕</button>' +
    '<div class="detail-header">' +
      '<div class="detail-icon">' + t.icon + '</div>' +
      '<div>' +
        '<div class="detail-name">' + t.name + '</div>' +
        '<div class="char-rarity ' + t.rarity + '">' + (RARITY_NAMES[t.rarity] || t.rarity) + ' · ' + (ROLE_NAMES[t.role] || t.role) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="detail-desc">' + (t.desc || '') + '</div>' +
    '<div class="detail-stats">' +
      '<div class="detail-stat"><div class="ds-val">' + t.atk + '</div><div class="ds-label">基础攻击</div></div>' +
      '<div class="detail-stat"><div class="ds-val">' + t.hp + '</div><div class="ds-label">基础生命</div></div>' +
      '<div class="detail-stat"><div class="ds-val">' + (t.armor || 0) + '</div><div class="ds-label">护甲</div></div>' +
      '<div class="detail-stat"><div class="ds-val">' + t.speed.toFixed(2) + '</div><div class="ds-label">攻速</div></div>' +
    '</div>' +
    '<div class="upgrade-row">' +
      '<span class="up-label">⚔ 攻击升级</span>' +
      '<span class="up-lv">Lv.' + atkLv + '</span>' +
      (atkLv >= UPGRADE_MAX
        ? '<button class="maxed">已满</button>'
        : '<button onclick="doUpgrade(\'' + typeId + '\',\'atk\')">🍋 ' + atkCost + '</button>') +
    '</div>' +
    '<div class="upgrade-row">' +
      '<span class="up-label">❤ 生命升级</span>' +
      '<span class="up-lv">Lv.' + hpLv + '</span>' +
      (hpLv >= UPGRADE_MAX
        ? '<button class="maxed">已满</button>'
        : '<button onclick="doUpgrade(\'' + typeId + '\',\'hp\')">🍋 ' + hpCost + '</button>') +
    '</div>' +
    '<div class="deck-toggle' + (inDeck ? ' in-deck' : '') + '" onclick="toggleDeckCard(\'' + typeId + '\')">' +
      (inDeck ? '✅ 已上阵 · 点击移除' : '📥 加入编队') +
    '</div>';

  container.style.display = 'block';

  // Bind close button
  var closeBtn = container.querySelector('.detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      container.style.display = 'none';
    });
  }
}

function doUpgrade(typeId, stat) {
  const lv = getUpgradeLv(meta, typeId, stat);
  const cost = upgradeCost(lv);
  if (meta.gold < cost) {
    alert('金币不足！需要 🍋' + cost);
    return;
  }
  meta.gold -= cost;
  const key = upgradeKey(typeId, stat);
  meta.upgrades[key] = (meta.upgrades[key] || 0) + 1;
  saveMeta();
  refreshHomeStats();
  showCharDetail(typeId); // Refresh detail view
}

function toggleDeckCard(typeId) {
  let deck = activeDeck().slice();
  const idx = deck.indexOf(typeId);
  if (idx >= 0) {
    // Remove from deck
    deck.splice(idx, 1);
  } else {
    // Add to deck (replace last slot if full)
    if (deck.length >= 5) deck.pop();
    deck.push(typeId);
  }
  // Ensure at least 1 card
  if (deck.length === 0) deck = [typeId];
  meta.deck = normalizeDeck(deck);
  saveMeta();
  renderDeckBar();
  renderCharGrid();
  showCharDetail(typeId); // Refresh detail
}

/* ===== Shop Tab ===== */

function renderShop() {
  // Update gold display
  var goldEl = document.getElementById('shopGold');
  if (goldEl) goldEl.textContent = meta.gold || 0;
  // Also refresh home stats
  refreshHomeStats();

  const container = document.getElementById('shopItems');
  if (!container) return;

  const wallLv = meta.wallLv || 0;
  const spLv = meta.spLv || 0;
  const wallCost = 20 + wallLv * 5;
  const spMaxCost = 15 + spLv * 3;
  const spStartCost = 10 + spLv * 2;

  const items = [
    {
      icon: '🏰', name: '城墙加固', effect: '城墙HP +' + WALL_PER_LV + '（当前 +' + getWallBonus(meta) + '）',
      lv: wallLv, max: WALL_UPGRADE_MAX, cost: wallCost
    },
    {
      icon: '⚡', name: '果汁扩容', effect: 'SP上限 +1（当前 ' + getSpMax(meta) + '）',
      lv: spLv, max: SP_UPGRADE_MAX, cost: spMaxCost
    },
    {
      icon: '🔋', name: '果汁号角', effect: '开局SP +1（当前 ' + getSpStart(meta) + '）',
      lv: spLv, max: SP_UPGRADE_MAX, cost: spStartCost
    }
  ];

  let html = '';
  for (const item of items) {
    const maxed = item.lv >= item.max;
    const canAfford = meta.gold >= item.cost;
    let btnCls = maxed ? 'maxed' : (canAfford ? '' : 'cant-afford');
    let btnText = maxed ? '已满级' : ('🍋 ' + item.cost);

    html += '<div class="shop-item">' +
      '<div class="shop-icon">' + item.icon + '</div>' +
      '<div class="shop-info">' +
        '<div class="shop-name">' + item.name + ' <small>Lv.' + item.lv + '/' + item.max + '</small></div>' +
        '<div class="shop-effect">' + item.effect + '</div>' +
      '</div>' +
      '<button class="shop-price ' + btnCls + '" data-action="' + item.icon + '" ' + (maxed || !canAfford ? 'disabled' : '') + '>' + btnText + '</button>' +
    '</div>';
  }
  container.innerHTML = html;

  // Bind buy buttons
  container.querySelectorAll('.shop-price:not([disabled])').forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.dataset.action;
      handleShopBuy(action);
    });
  });
}

function handleShopBuy(action) {
  if (action === '🏰') {
    const lv = meta.wallLv || 0;
    if (lv >= WALL_UPGRADE_MAX) return;
    const cost = 20 + lv * 5;
    if (meta.gold < cost) return;
    meta.gold -= cost;
    meta.wallLv = lv + 1;
  } else if (action === '⚡' || action === '🔋') {
    const lv = meta.spLv || 0;
    if (lv >= SP_UPGRADE_MAX) return;
    const cost = action === '⚡' ? (15 + lv * 3) : (10 + lv * 2);
    if (meta.gold < cost) return;
    meta.gold -= cost;
    meta.spLv = lv + 1;
  }
  saveMeta();
  refreshHomeStats();
  renderShop();
}

/* ===== Leaderboard Tab ===== */
const LB_KEY = 'fruit_assault_leaderboard';
let lbPlayerName = localStorage.getItem('fruit_assault_player_name') || '';

function getTotalStars() {
  return Object.values(meta.stars || {}).reduce(function(a, b) { return a + b; }, 0);
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY) || '[]');
  } catch(e) { return []; }
}

function saveLeaderboard(data) {
  localStorage.setItem(LB_KEY, JSON.stringify(data));
}

function updateLeaderboard() {
  if (!lbPlayerName) return;

  var list = loadLeaderboard();
  var totalStars = getTotalStars();

  // Find existing entry for this player
  var entry = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].name === lbPlayerName) { entry = list[i]; break; }
  }

  if (!entry) {
    entry = { name: lbPlayerName, level: 0, stars: 0, wins: 0 };
    list.push(entry);
  }

  // Only update if better
  if (meta.highestLevel > entry.level) entry.level = meta.highestLevel;
  if (totalStars > entry.stars) entry.stars = totalStars;
  if (meta.totalWins > entry.wins) entry.wins = meta.totalWins;

  // Sort: level desc, stars desc, wins desc
  list.sort(function(a, b) {
    if (b.level !== a.level) return b.level - a.level;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return b.wins - a.wins;
  });

  saveLeaderboard(list);
}

function renderLeaderboard() {
  var nameDiv = document.getElementById('lbPlayerName');
  var listDiv = document.getElementById('lbList');
  if (!listDiv) return;

  // Show/hide name input
  if (!lbPlayerName) {
    if (nameDiv) nameDiv.style.display = 'flex';
  } else {
    if (nameDiv) nameDiv.style.display = 'none';
  }

  var list = loadLeaderboard();
  var totalStars = getTotalStars();

  if (list.length === 0 && !lbPlayerName) {
    listDiv.innerHTML = '<div class="lb-empty">🏆<br>输入昵称加入天梯排行</div>';
    return;
  }

  if (list.length === 0) {
    // Player has name but no records yet
    listDiv.innerHTML = '<div class="lb-empty">📋<br>通关关卡后出现在排行榜</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    var rank = i + 1;
    var rankCls = rank === 1 ? ' r1' : (rank === 2 ? ' r2' : (rank === 3 ? ' r3' : ''));
    var isMe = lbPlayerName && entry.name === lbPlayerName;
    var medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : rank));

    html += '<div class="lb-row' + (isMe ? ' me' : '') + '">' +
      '<div class="lb-rank' + rankCls + '">' + medal + '</div>' +
      '<div class="lb-info">' +
        '<div class="lb-name">' + entry.name + (isMe ? ' ⭐' : '') + '</div>' +
        '<div class="lb-stats">🚩' + entry.level + '关 · ⭐' + entry.stars + '星 · 🏆' + entry.wins + '胜</div>' +
      '</div>' +
      '<div class="lb-score">#' + rank + '</div>' +
    '</div>';
  }
  listDiv.innerHTML = html;
}

function initLeaderboardTab() {
  var saveBtn = document.getElementById('lbNameSave');
  var nameInput = document.getElementById('lbNameInput');

  if (saveBtn) {
    saveBtn.addEventListener('click', savePlayerName);
  }
  if (nameInput) {
    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') savePlayerName();
    });
  }

  function savePlayerName() {
    var input = document.getElementById('lbNameInput');
    var name = (input.value || '').trim();
    if (name) {
      lbPlayerName = name;
      localStorage.setItem('fruit_assault_player_name', name);
      updateLeaderboard();
      renderLeaderboard();
    }
  }
}
/* Global deck editor access */
function showDeckEditor() {
  var deckPanel = document.getElementById('deckPanel');
  if (deckPanel) {
    deckPanel.classList.remove('hide');
    if (typeof renderDeckPanel === 'function') renderDeckPanel();
  }
}

