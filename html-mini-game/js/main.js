// 太空閃躲者 - Canvas 小遊戲
// 特色：
// 1) 方向鍵 / WASD 移動；Space 暫停
// 2) 手機/觸控：在畫面拖曳飛船
// 3) 難度隨時間增加；能量球加分+短暫護盾
// 4) 最高分保存在 localStorage

(() => {
  'use strict';

  // ===== DOM =====
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const $score = document.getElementById('score');
  const $lives = document.getElementById('lives');
  const $best  = document.getElementById('best');

  const $overlay = document.getElementById('overlay');
  const $overlayTitle = document.getElementById('overlayTitle');
  const $overlayDesc  = document.getElementById('overlayDesc');

  const $btnStart = document.getElementById('btnStart');
  const $btnHow   = document.getElementById('btnHow');
  const $howto    = document.getElementById('howto');
  const $btnResetBest = document.getElementById('btnResetBest');

  // ===== 工具 =====
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand  = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx*dx + dy*dy;
  };

  // ===== 遊戲狀態 =====
  const W = canvas.width;
  const H = canvas.height;

  const STORAGE_KEY = 'space-dodger-best-v1';
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  $best.textContent = best.toString();

  const keys = new Set();

  let running = false;
  let paused = false;
  let gameOver = false;

  let tPrev = 0;

  const state = {
    score: 0,
    lives: 3,
    time: 0,
    difficulty: 1,
  };

  const ship = {
    x: W * 0.15,
    y: H * 0.5,
    r: 18,
    vx: 0,
    vy: 0,
    maxV: 420,
    shield: 0, // seconds
  };

  /** @type {Array<{x:number,y:number,r:number,vy:number,vx:number,spin:number,ang:number}>} */
  let meteors = [];
  /** @type {Array<{x:number,y:number,r:number,vy:number,phase:number}>} */
  let orbs = [];
  /** @type {Array<{x:number,y:number,life:number,kind:'hit'|'orb'}>} */
  let fx = [];

  // 生成器計時器
  let meteorTimer = 0;
  let orbTimer = 0;

  // ===== UI/Overlay =====
  function showOverlay(title, desc, startLabel='開始遊戲'){
    $overlayTitle.textContent = title;
    $overlayDesc.innerHTML = desc;
    $btnStart.textContent = startLabel;
    $overlay.classList.remove('hidden');
  }
  function hideOverlay(){
    $overlay.classList.add('hidden');
  }

  // ===== 遊戲流程 =====
  function resetGame(){
    state.score = 0;
    state.lives = 3;
    state.time = 0;
    state.difficulty = 1;

    ship.x = W * 0.15;
    ship.y = H * 0.5;
    ship.vx = 0;
    ship.vy = 0;
    ship.shield = 0;

    meteors = [];
    orbs = [];
    fx = [];

    meteorTimer = 0;
    orbTimer = 0;

    paused = false;
    gameOver = false;

    syncHud();
  }

  function syncHud(){
    $score.textContent = Math.floor(state.score).toString();
    $lives.textContent = state.lives.toString();
    $best.textContent  = best.toString();
  }

  function start(){
    resetGame();
    running = true;
    hideOverlay();
    requestAnimationFrame(loop);
  }

  function end(){
    gameOver = true;
    running = false;

    if (state.score > best){
      best = Math.floor(state.score);
      localStorage.setItem(STORAGE_KEY, String(best));
    }
    syncHud();

    showOverlay(
      '遊戲結束',
      `你撐了 <b>${state.time.toFixed(1)}</b> 秒，分數 <b>${Math.floor(state.score)}</b>。<br/>想再挑戰一次嗎？`,
      '再玩一次'
    );
  }

  function togglePause(){
    if (!running) return;
    paused = !paused;
    if (paused){
      showOverlay('已暫停', '按 <b>Space</b> 繼續，或點下面按鈕。', '繼續');
    } else {
      hideOverlay();
      // 讓 dt 不會因為暫停造成爆衝
      tPrev = performance.now();
      requestAnimationFrame(loop);
    }
  }

  // ===== 物件生成 =====
  function spawnMeteor(){
    const r = rand(14, 34);
    const x = rand(W * 0.35, W + 40);
    const y = rand(-60, -20);
    const vy = rand(180, 280) * (0.85 + state.difficulty * 0.18);
    const vx = rand(-30, 30) * (0.6 + state.difficulty * 0.05);
    meteors.push({
      x, y, r, vy, vx,
      spin: rand(-3.2, 3.2),
      ang: rand(0, Math.PI * 2),
    });
  }

  function spawnOrb(){
    const r = 14;
    const x = rand(W * 0.40, W + 30);
    const y = rand(H * 0.15, H * 0.85);
    const vy = rand(80, 130) * (0.85 + state.difficulty * 0.08);
    orbs.push({ x, y, r, vy, phase: rand(0, Math.PI * 2) });
  }

  // ===== 更新 =====
  function update(dt){
    state.time += dt;
    state.difficulty = 1 + state.time / 18; // 越久越難

    // 分數：以時間為主，難度越高加成越大
    state.score += dt * (20 + state.difficulty * 6);

    // 護盾倒數
    ship.shield = Math.max(0, ship.shield - dt);

    // 控制
    const ax = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) + (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0);
    const ay = (keys.has('ArrowDown')  || keys.has('KeyS') ? 1 : 0) + (keys.has('ArrowUp')   || keys.has('KeyW') ? -1 : 0);

    const accel = 1200; // px/s^2
    ship.vx += ax * accel * dt;
    ship.vy += ay * accel * dt;

    // 阻尼
    ship.vx *= Math.pow(0.00025, dt); // 平滑阻尼
    ship.vy *= Math.pow(0.00025, dt);

    // 限速
    const maxV = ship.maxV * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.05 : 1);
    ship.vx = clamp(ship.vx, -maxV, maxV);
    ship.vy = clamp(ship.vy, -maxV, maxV);

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = clamp(ship.x, ship.r + 8, W - ship.r - 8);
    ship.y = clamp(ship.y, ship.r + 8, H - ship.r - 8);

    // 生成頻率：難度越高越密
    meteorTimer -= dt;
    const meteorEvery = clamp(0.85 - state.difficulty * 0.06, 0.18, 0.85);
    if (meteorTimer <= 0){
      spawnMeteor();
      // 有機率一次生成 2 顆
      if (Math.random() < clamp(0.10 + state.difficulty * 0.02, 0.10, 0.35)) spawnMeteor();
      meteorTimer = meteorEvery;
    }

    orbTimer -= dt;
    const orbEvery = 6.5; // 平均 6.5 秒一顆
    if (orbTimer <= 0){
      if (Math.random() < 0.85) spawnOrb();
      orbTimer = orbEvery;
    }

    // 更新隕石
    for (const m of meteors){
      m.y += m.vy * dt;
      m.x += m.vx * dt;
      m.ang += m.spin * dt;
    }
    meteors = meteors.filter(m => m.y < H + 90 && m.x > -120 && m.x < W + 160);

    // 更新能量球
    for (const o of orbs){
      o.x -= (160 + state.difficulty * 20) * dt;
      o.y += Math.sin((state.time * 2.2) + o.phase) * 35 * dt;
    }
    orbs = orbs.filter(o => o.x > -60);

    // 更新特效
    for (const p of fx){
      p.life -= dt;
    }
    fx = fx.filter(p => p.life > 0);

    // 碰撞：隕石
    const rr = (ship.r + 2);
    const rr2 = rr * rr;
    for (let i=0; i<meteors.length; i++){
      const m = meteors[i];
      const hit = dist2(ship.x, ship.y, m.x, m.y) < (rr + m.r) * (rr + m.r);
      if (hit){
        if (ship.shield > 0){
          // 有護盾：只消掉隕石 + 小特效
          fx.push({ x: m.x, y: m.y, life: 0.35, kind: 'hit' });
          meteors.splice(i, 1);
          i--;
        } else {
          // 沒護盾：扣血
          state.lives -= 1;
          fx.push({ x: ship.x, y: ship.y, life: 0.55, kind: 'hit' });
          ship.shield = 1.1; // 受傷後短暫無敵避免連續撞
          meteors.splice(i, 1);
          i--;
          if (state.lives <= 0){
            syncHud();
            end();
            return;
          }
        }
      }
    }

    // 碰撞：能量球
    for (let i=0; i<orbs.length; i++){
      const o = orbs[i];
      const hit = dist2(ship.x, ship.y, o.x, o.y) < (ship.r + o.r + 6) * (ship.r + o.r + 6);
      if (hit){
        state.score += 220 + state.difficulty * 35;
        ship.shield = Math.max(ship.shield, 3.2);
        fx.push({ x: o.x, y: o.y, life: 0.7, kind: 'orb' });
        orbs.splice(i, 1);
        i--;
      }
    }

    syncHud();
  }

  // ===== 繪圖 =====
  function draw(){
    // 背景星星
    ctx.clearRect(0, 0, W, H);
    drawStars();

    // 物件
    for (const o of orbs) drawOrb(o);
    for (const m of meteors) drawMeteor(m);

    drawShip();

    // 特效
    for (const p of fx) drawFx(p);

    // 右下角提示
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, -apple-system, Segoe UI, Microsoft JhengHei, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Space 暫停 / WASD 或 方向鍵移動', W - 14, H - 14);
    ctx.restore();

    // 暫停暗幕（不走 overlay 時的備援）
    if (paused){
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,.88)';
      ctx.font = '700 28px system-ui, -apple-system, Segoe UI, Microsoft JhengHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暫停中', W/2, H/2);
      ctx.restore();
    }
  }

  // 星星：用時間做位移，營造飛行感
  const stars = (() => {
    const arr = [];
    for (let i=0; i<160; i++){
      arr.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: rand(0.7, 2.1),
        s: rand(40, 160),
        a: rand(0.25, 0.9),
      });
    }
    return arr;
  })();

  function drawStars(){
    ctx.save();
    ctx.fillStyle = '#fff';
    for (const s of stars){
      s.x -= s.s * (0.6 + state.difficulty * 0.08) * 0.016; // 以 60fps 估算
      if (s.x < -10) { s.x = W + 10; s.y = Math.random()*H; s.r = rand(0.7, 2.1); s.a = rand(0.25, 0.9); }
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShip(){
    // 飛船本體
    ctx.save();
    ctx.translate(ship.x, ship.y);

    // 尾焰
    const flame = 18 + Math.sin(state.time*12) * 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-ship.r - flame, 0);
    ctx.quadraticCurveTo(-ship.r - 6, -8, -ship.r + 4, 0);
    ctx.quadraticCurveTo(-ship.r - 6,  8, -ship.r + 4, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(-ship.r - flame, 0, -ship.r + 6, 0);
    g.addColorStop(0, 'rgba(255,122,138,.0)');
    g.addColorStop(0.45, 'rgba(255,122,138,.85)');
    g.addColorStop(1, 'rgba(141,208,255,.95)');
    ctx.fillStyle = g;
    ctx.fill();

    // 船身
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(ship.r, 0);
    ctx.quadraticCurveTo(6, -ship.r, -ship.r*0.9, -ship.r*0.62);
    ctx.quadraticCurveTo(-ship.r*0.62, 0, -ship.r*0.9, ship.r*0.62);
    ctx.quadraticCurveTo(6, ship.r, ship.r, 0);
    ctx.closePath();

    const body = ctx.createLinearGradient(-ship.r, -ship.r, ship.r, ship.r);
    body.addColorStop(0, 'rgba(255,255,255,.92)');
    body.addColorStop(0.55, 'rgba(141,208,255,.78)');
    body.addColorStop(1, 'rgba(118,247,197,.72)');
    ctx.fillStyle = body;
    ctx.fill();

    // 駕駛艙
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(4, 0, 9, 12, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(11,16,32,.55)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.stroke();

    // 護盾
    if (ship.shield > 0){
      const p = clamp(ship.shield / 3.2, 0, 1);
      ctx.globalAlpha = 0.15 + 0.18 * p + 0.06*Math.sin(state.time*6);
      ctx.beginPath();
      ctx.arc(0, 0, ship.r + 9, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(141,208,255,1)';
      ctx.fill();

      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(141,208,255,.65)';
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawMeteor(m){
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.ang);

    // 朦朧外圈
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, m.r + 10, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();

    // 本體：不規則石塊
    ctx.globalAlpha = 0.98;
    ctx.beginPath();
    const spikes = 8;
    for (let i=0; i<spikes; i++){
      const a = (i/spikes) * Math.PI*2;
      const rr = m.r * rand(0.78, 1.10);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i===0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const rock = ctx.createLinearGradient(-m.r, -m.r, m.r, m.r);
    rock.addColorStop(0, 'rgba(255,255,255,.86)');
    rock.addColorStop(0.5, 'rgba(255,122,138,.55)');
    rock.addColorStop(1, 'rgba(11,16,32,.55)');
    ctx.fillStyle = rock;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.stroke();

    ctx.restore();
  }

  function drawOrb(o){
    ctx.save();
    ctx.translate(o.x, o.y);

    const pulse = 1 + 0.08*Math.sin(state.time*5 + o.phase);
    const r = o.r * pulse;

    // 外圈光暈
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, r + 14, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(118,247,197,1)';
    ctx.fill();

    // 核心
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,.98)');
    g.addColorStop(0.55, 'rgba(118,247,197,.85)');
    g.addColorStop(1, 'rgba(141,208,255,.55)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.stroke();

    ctx.restore();
  }

  function drawFx(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    const a = clamp(p.life / 0.7, 0, 1);
    const r = (p.kind === 'orb' ? 36 : 42) * (1 - a*0.25);

    ctx.globalAlpha = 0.35 * a;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = p.kind === 'orb' ? 'rgba(118,247,197,1)' : 'rgba(255,122,138,1)';
    ctx.fill();

    ctx.globalAlpha = 0.65 * a;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.stroke();

    ctx.restore();
  }

  // ===== 迴圈 =====
  function loop(tNow){
    if (!running || paused) return;

    if (!tPrev) tPrev = tNow;
    const dt = clamp((tNow - tPrev) / 1000, 0, 0.033); // 上限 33ms
    tPrev = tNow;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ===== 輸入：鍵盤 =====
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space'){
      e.preventDefault();
      if (!running && gameOver){
        start();
      } else if (!running && !gameOver){
        // 起始畫面：Space 也可開始
        start();
      } else {
        togglePause();
      }
      return;
    }
    keys.add(e.code);
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  // ===== 輸入：觸控 / 滑鼠拖曳 =====
  let dragging = false;

  function canvasToWorld(clientX, clientY){
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (W / r.width);
    const y = (clientY - r.top)  * (H / r.height);
    return { x, y };
  }

  function onPointerDown(e){
    if ($overlay && !$overlay.classList.contains('hidden')) return;
    dragging = true;
    const p = canvasToWorld(e.clientX, e.clientY);
    ship.x = p.x; ship.y = p.y;
  }
  function onPointerMove(e){
    if (!dragging) return;
    const p = canvasToWorld(e.clientX, e.clientY);
    ship.x = clamp(p.x, ship.r + 8, W - ship.r - 8);
    ship.y = clamp(p.y, ship.r + 8, H - ship.r - 8);
  }
  function onPointerUp(){
    dragging = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // ===== 按鈕 =====
  $btnStart.addEventListener('click', () => {
    if (paused){
      togglePause();
      return;
    }
    start();
  });

  $btnHow.addEventListener('click', () => {
    $howto.open = !$howto.open;
  });

  $btnResetBest.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(STORAGE_KEY);
    best = 0;
    syncHud();
    alert('已清除最高分（此裝置/瀏覽器）');
  });

  // 初始畫面
  showOverlay(
    '太空閃躲者',
    '方向鍵 / WASD 移動。空白鍵暫停/繼續。<br/>手機可用手指在畫面拖曳角色。',
    '開始遊戲'
  );

  // 讓 overlay 一直能看見當前 best
  syncHud();
})();
