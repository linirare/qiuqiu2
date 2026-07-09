# SP 经济驱动的合并循环 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Build 环节从"零代价纯收益"改为 SP 驱动的多向权衡——召唤球、合并、产兵共用 SP 资源池。

**Architecture:** 改动集中在游戏逻辑层（config/state/main/input/board），不涉及渲染层。核心思路：移除自动补球 → 手动 SP 召唤；合并消耗 SP；SP 经济参数微调；高级球战力差距拉大。

**Tech Stack:** Vanilla JS, Canvas 2D, 无框架

---

## 文件结构

| 文件 | 职责 | 改动类型 |
|------|------|---------|
| `js/config.js` | 参数常量：等级倍率、出兵冷却、SP 回复 | 数值调整 |
| `js/state.js` | getSpRecoverCap() 上限提升 | 1 行改动 |
| `js/main.js` | 主循环：移除自动补球逻辑 | 删除 ~12 行 |
| `js/input.js` | 输入：空格召唤 + 合并 SP 检查 | 新增 ~40 行 |
| `js/board.js` | 不修改（合并逻辑不变，SP 检查放在 input 层） | 无改动 |

---

### Task 1: 调整 config.js 数值参数

**Files:**
- Modify: `js/config.js:117-127`

- [ ] **Step 1: 更新 LEVEL_MUL 数组**

将 `js/config.js` 第 117 行：
```js
const LEVEL_MUL = [0, 1.0, 1.58, 2.34, 3.32, 4.62, 6.3, 8.5];
```
替换为：
```js
const LEVEL_MUL = [0, 1.0, 1.65, 2.60, 4.00, 6.00, 8.50, 12.00];
```

- [ ] **Step 2: 更新 SPAWN_COOLDOWNS 数组**

将 `js/config.js` 第 123 行：
```js
const SPAWN_COOLDOWNS = [0, 5.6, 4.9, 4.25, 3.65, 3.15, 2.7, 2.35];
```
替换为：
```js
const SPAWN_COOLDOWNS = [0, 6.5, 5.5, 4.5, 3.5, 2.8, 2.2, 1.8];
```

- [ ] **Step 3: 更新 SP_PASSIVE 常量**

将 `js/config.js` 第 127 行：
```js
const SP_PASSIVE = 3.6;
```
替换为：
```js
const SP_PASSIVE = 3.0;
```

- [ ] **Step 4: 确认文件语法正确**

```bash
node -e "try { eval(require('fs').readFileSync('js/config.js','utf8')); console.log('config.js OK'); } catch(e) { console.log('ERROR:', e.message); }"
```
Expected: `config.js OK`（"require is not defined" 或类似 Node 环境错误可忽略，只要不是语法错误）

- [ ] **Step 5: 提交**

```bash
git add js/config.js
git commit -m "feat: tune LEVEL_MUL, SPAWN_COOLDOWNS, SP_PASSIVE for SP economy"
```

---

### Task 2: 调整 SP 回复上限

**Files:**
- Modify: `js/state.js:153-155`

- [ ] **Step 1: 更新 getSpRecoverCap 函数**

将 `js/state.js` 第 153-155 行：
```js
function getSpRecoverCap(meta) {
  return 6 + Math.floor((meta.spLv || 0) / 2);
}
```
替换为：
```js
function getSpRecoverCap(meta) {
  return 8 + Math.floor((meta.spLv || 0) / 2);
}
```

- [ ] **Step 2: 确认语法正确**

```bash
node -e "const fs=require('fs'); try { new Function(fs.readFileSync('js/config.js','utf8') + ';' + fs.readFileSync('js/state.js','utf8')); console.log('state.js OK'); } catch(e) { console.log('ERROR:', e.message.match(/^[^\n]+/)?.[0] || e.message); }"
```
Expected: `state.js OK`（若报 "require is not defined" 等 Node 环境问题可忽略）

- [ ] **Step 3: 提交**

```bash
git add js/state.js
git commit -m "feat: increase SP recover cap from 6 to 8"
```

---

### Task 3: 移除自动补球，新增手动 SP 召唤

**Files:**
- Modify: `js/main.js:82-94`（删除）
- Modify: `js/input.js:48-52`（修改空位点击逻辑）

- [ ] **Step 1: 删除 main.js 中的玩家自动补球逻辑**

在 `js/main.js` 中，删除第 82-94 行（玩家自动补充水果营整块）：

要删除的代码：
```js
  // 玩家自动补充水果营
  state.ballTimer += dt;
  if (state.ballTimer >= BALL_SPAWN_INTERVAL) {
    state.ballTimer -= BALL_SPAWN_INTERVAL;
    const added = autoSpawnBall(state.playerSlots);
    if (added) {
      const center = slotCenter(added[0], added[1], false);
      state.rings.push({ x: center.x, y: center.y, r: 6, life: 0.25, maxLife: 0.25, color: 'rgba(255,228,90,0.65)' });
    } else {
      pushOverflow(state.overflowQueue, randomType(), 1);
    }
    drainOverflow(state.playerSlots, state.overflowQueue);
  }
```

替换为（保留注释但逻辑清空，敌方自动补球紧随其后不受影响）：
```js
  // 玩家不再自动补球 —— 手动点击空格消耗 SP 召唤（见 input.js）
```

确保紧随其后的敌方自动补球逻辑（第 96-113 行，以 `// 敌方自动补充水果营` 开头）完整保留。

- [ ] **Step 2: 在 input.js 的 onDown 中添加空位召唤逻辑**

找到 `js/input.js` 第 48-52 行：
```js
  const s = slotAt(p.x, p.y, false);
  if (!s) { lastTap.time = 0; return; }
  const [r, c] = s;
  const ball = state.playerSlots[r][c];
  if (!ball) { lastTap.time = 0; return; }
```

替换为：
```js
  const s = slotAt(p.x, p.y, false);
  if (!s) { lastTap.time = 0; return; }
  const [r, c] = s;
  const ball = state.playerSlots[r][c];
  if (!ball) {
    // 手动 SP 召唤：点击空格消耗 1 SP 随机从卡组抽球
    if (state.phase === 'playing' && state.sp > 0) {
      state.sp -= 1;
      const type = randomType(activeDeck());
      state.playerSlots[r][c] = createBall(type, 1);
      const center = slotCenter(r, c, false);
      state.rings.push({ x: center.x, y: center.y, r: 7, life: 0.32, maxLife: 0.32, color: THEME.gold });
      addFx(center.x, center.y - 24, `${TYPES[type].icon} 召唤 -1 SP`, THEME.gold, 13);
      playSfx('merge');
    } else if (state.phase === 'playing') {
      const center = slotCenter(r, c, false);
      addFx(center.x, center.y - 22, '果汁不足', THEME.accent, 12);
    }
    lastTap.time = 0;
    return;
  }
```

- [ ] **Step 3: 确认两个文件的语法正确**

```bash
node -e "const fs=require('fs'); const files=['js/config.js','js/state.js','js/board.js','js/combat.js','js/ai.js','js/render.js','js/input.js','js/audio.js','js/main.js']; for(const f of files) { try { new Function(fs.readFileSync(f,'utf8')); console.log(f + ' OK'); } catch(e) { console.log(f + ' ERROR: ' + (e.message.match(/^[^\n]+/)?.[0]||e.message)); } }"
```
Expected: 所有文件输出 `OK`

- [ ] **Step 4: 提交**

```bash
git add js/main.js js/input.js
git commit -m "feat: replace auto ball spawn with manual SP summon on empty slot"
```

---

### Task 4: 合并消耗 SP

**Files:**
- Modify: `js/input.js:161-186`（onUp 中合并分支）

- [ ] **Step 1: 在 input.js 顶部（onDown 之前）添加合并 SP 判断辅助函数**

在 `js/input.js` 第 14 行（`/* ——— 双击强制出兵 ——— */` 注释行）之后插入：

```js
/* ——— 合并 SP 判断 ——— */
function mergeWouldCostSP(src, dst) {
  if (!src || !dst) return false;
  if (src.level !== dst.level) return false;
  if (src.level >= MAX_LEVEL) return false;
  if (isMergeSupport(src) && isMergeSupport(dst)) return false;
  return true;
}
```

- [ ] **Step 2: 在 onUp 的合并分支中，调用 tryMerge 前检查 SP**

找到 `js/input.js` 中 onUp 函数的 tryMerge 调用块（当前约第 161-186 行）。在 `const result = tryMerge(...)` 之前插入 SP 检查：

当前代码：
```js
  } else {
    const result = tryMerge(state.playerSlots, d.fromR, d.fromC, toR, toC);
    if (result && result.merged) {
      state.merges++;
      playSfx('merge');
      // ... 合并成功反馈 ...
    }
```

修改为：
```js
  } else {
    // 合并消耗 SP：检查是否付得起
    if (mergeWouldCostSP(d.unit, targetBall) && state.sp < 1) {
      const center = slotCenter(toR, toC, false);
      addFx(center.x, center.y - 24, '果汁不足 · 无法合成', THEME.accent, 13);
      state.drag = null;
      return;
    }
    const result = tryMerge(state.playerSlots, d.fromR, d.fromC, toR, toC);
    if (result && result.merged) {
      state.sp = Math.max(0, state.sp - 1);  // 合并消耗 1 SP
      state.merges++;
      playSfx('merge');
      // ... 合并成功反馈（后续代码不变）...
```

确保 `state.sp = Math.max(0, state.sp - 1);` 插入在 `state.merges++;` 之前，合并反馈（特效、音效、粒子）之前。

完整的合并成功块应该是：
```js
    if (result && result.merged) {
      state.sp = Math.max(0, state.sp - 1);
      state.merges++;
      playSfx('merge');
      const ct = TYPES[result.type];
      const center = slotCenter(toR, toC, false);
      addFx(center.x, center.y - 24, `${ct.icon} ${ct.name} Lv.${result.newLevel}`, THEME.gold, 14);
      if (result.newLevel >= 3) addFx(center.x, center.y + 26, '产兵速度提升', '#fff2be', 11);
      state.rings.push({ x: center.x, y: center.y, r: 10, life: 0.55, maxLife: 0.55, color: THEME.gold });
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        const speed = 48 + Math.random() * 70;
        state.fx.push({
          x: center.x, y: center.y, text: '✦', color: ct.color,
          size: 5 + Math.random() * 4, life: 0.55, maxLife: 0.55,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        });
      }
      state.shake = Math.min(0.35 + result.newLevel * 0.13, 1.7);
      drainOverflow(state.playerSlots, state.overflowQueue);
    }
```

- [ ] **Step 3: 确认语法正确**

```bash
node -e "const fs=require('fs'); const files=['js/config.js','js/state.js','js/board.js','js/combat.js','js/ai.js','js/render.js','js/input.js','js/audio.js','js/main.js']; for(const f of files) { try { new Function(fs.readFileSync(f,'utf8')); console.log(f + ' OK'); } catch(e) { console.log(f + ' ERROR: ' + (e.message.match(/^[^\n]+/)?.[0]||e.message)); } }"
```
Expected: 所有文件输出 `OK`

- [ ] **Step 4: 提交**

```bash
git add js/input.js
git commit -m "feat: merge costs 1 SP, reject merge when SP insufficient"
```

---

### Task 5: 验证完整流程

- [ ] **Step 1: 打开游戏确认无 JS 报错**

在浏览器中打开 `index.html`，打开开发者工具 Console：
- Expected: 无红色报错
- 检查菜单面板正常显示

- [ ] **Step 2: 测试手动召唤**

点击"开始突击"进入游戏后：
- 点击棋盘上的空位 → 应出现新球 + SP 减 1 + 飘字「🍉 召唤 -1 SP」
- SP 为 0 时点击空位 → 飘字「果汁不足」
- 确认棋盘空位不再自动出现新球

- [ ] **Step 3: 测试合并消耗 SP**

- 拖两个同类型同等级球到彼此 → 合并成功，SP 减 1
- SP 为 0 时拖两个可合并的球 → 飘字「果汁不足 · 无法合成」
- 交换不同球的格子 → 不消耗 SP，正常交换

- [ ] **Step 4: 测试 SP 回复**

- 等待 3 秒 → SP +1
- 击杀敌人 → SP +1

- [ ] **Step 5: 测试高级球战力**

- 合成一个 Lv5 球并观察出兵 → 冷却应明显快于 Lv1（约 2.8s vs 6.5s）
- 战场上的 Lv5 兵 → HP/ATK 应明显高于 Lv1（约 6x）

- [ ] **Step 6: 提交（如有微调）**

```bash
git add -A
git commit -m "chore: final verification tweaks for SP economy merge loop"
```

---

## 自审清单

**1. Spec coverage:**
- 改动一（手动召唤）：Task 3 Step 1-2 ✅
- 改动二（合并耗 SP）：Task 4 Step 1-2 ✅
- 改动三（SP 经济微调）：Task 1 Step 3 + Task 2 ✅
- 改动四（等级倍率拉大）：Task 1 Step 1 ✅
- 改动五（冷却差异化）：Task 1 Step 2 ✅

**2. Placeholder scan:** 无 TBD/TODO，所有代码完整。✅

**3. Type consistency:** `mergeWouldCostSP(src, dst)` 在 Task 4 Step 1 定义，Step 2 使用。`randomType(activeDeck())` 遵循 board.js 已有函数签名。`state.sp` 遵循 state.js 定义的属性。所有引用一致。✅
