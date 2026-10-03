/* 荣耀祈愿 · 前台主逻辑 */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const LS = { uid: 'glory_uid', sig: 'glory_sig', sound: 'glory_sound' };
  const state = {
    cfg: null,
    prizes: [],
    rarities: [],
    rmap: {},
    me: null,
    sig: '',
    busy: false,
    lastResults: [],
    poolFilter: 'all'
  };

  /* ---------------- 基础工具 ---------------- */
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function toast(msg, kind) {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'err' ? ' err' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(-8px)'; setTimeout(() => el.remove(), 320); }, 2200);
  }
  async function post(path, body) {
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      return await r.json();
    } catch (e) { return { ok: false, msg: '网络异常，请重试' }; }
  }
  async function get(path) {
    try { const r = await fetch(path); return await r.json(); } catch (e) { return { ok: false, msg: '网络异常' }; }
  }
  function cred(extra) { return Object.assign({ uid: state.me && state.me.uid, sig: state.sig }, extra || {}); }

  function openModal(html, onMount) {
    $('#modalBody').innerHTML = html;
    $('#modal').classList.add('on');
    if (onMount) onMount($('#modalBody'));
  }
  function closeModal() { $('#modal').classList.remove('on'); }

  /* ---------------- 场景背景 ---------------- */
  function initScene() {
    // 星尘背景（用 CSS 背景点阵生成，避免多余 DOM）
    const stars = $('#stars');
    let css = '';
    for (let i = 0; i < 90; i++) {
      const x = (Math.random() * 100).toFixed(2), y = (Math.random() * 70).toFixed(2);
      const s = (Math.random() * 1.6 + 0.5).toFixed(2);
      css += `${x}% ${y}% 0 rgba(255,255,255,${(Math.random() * 0.5 + 0.2).toFixed(2)}),`;
      void s;
    }
    stars.style.backgroundImage = `radial-gradient(1px 1px at ${css.slice(0, -1).replace(/,\s*$/, '')} )`;
    stars.style.backgroundImage = 'radial-gradient(1.2px 1.2px at ' + css.replace(/,$/, '') + ')';
    stars.style.backgroundSize = '100% 100%';

    // 漂浮光屑
    const box = $('#motes');
    for (let i = 0; i < 26; i++) {
      const m = document.createElement('i');
      m.className = 'mote';
      m.style.left = Math.random() * 100 + '%';
      m.style.top = 70 + Math.random() * 32 + '%';
      m.style.animationDuration = 9 + Math.random() * 12 + 's';
      m.style.animationDelay = (-Math.random() * 14) + 's';
      m.style.opacity = 0.2 + Math.random() * 0.6;
      box.appendChild(m);
    }
    $('#brandMark').innerHTML = Icons.svg('crystal', 24, '#3a2405');
    $('#coinIcon').innerHTML = Icons.svg('coin', 16, '#ffd77a');
    $('#crystal').innerHTML = Icons.crystalBig();
    $('#noticeIcon').innerHTML = Icons.svg('scroll', 16, '#f3cf7a');
  }

  /* ---------------- 数据加载 ---------------- */
  async function loadConfig() {
    const r = await get('/api/config');
    if (!r.ok) return toast(r.msg || '配置加载失败', 'err');
    state.cfg = r.settings;
    state.prizes = r.prizes;
    state.rarities = r.rarities;
    state.rmap = {};
    r.rarities.forEach((x) => (state.rmap[x.key] = x));
    renderMeta();
    renderPool();
    loadFeed();
  }

  async function ensureUser() {
    let uid = localStorage.getItem(LS.uid);
    let sig = localStorage.getItem(LS.sig);
    if (uid && sig) {
      const r = await get('/api/my?uid=' + encodeURIComponent(uid) + '&sig=' + encodeURIComponent(sig));
      if (r.ok) {
        state.me = r.user; state.sig = sig;
        applyUser();
        return;
      }
    }
    const c = await post('/api/user/init', {});
    if (!c.ok) return toast(c.msg || '初始化失败', 'err');
    localStorage.setItem(LS.uid, c.user.uid);
    localStorage.setItem(LS.sig, c.sig);
    state.me = c.user; state.sig = c.sig;
    applyUser();
  }

  function applyUser() {
    const m = state.me;
    $('#meNick').textContent = m.nick;
    $('#avatar').textContent = (m.nick || '?').slice(0, 1);
    $('#coinNum').textContent = fmt(m.coins);
    renderPity();
    renderStats();
  }

  async function refreshMe() {
    const r = await get('/api/my?uid=' + state.me.uid + '&sig=' + state.sig);
    if (r.ok) {
      state.me = r.user;
      applyUser();
      return r;
    }
    return null;
  }

  /* ---------------- 渲染 ---------------- */
  function renderMeta() {
    const s = state.cfg;
    document.title = s.siteName + ' · 峡谷许愿池';
    $('#siteName').textContent = s.siteName;
    $('#subtitle').textContent = s.subtitle;
    $('#stageTitle').textContent = s.siteName.split('').join(' ');

    const unit = s.coinUnit;
    $('#coinChip').title = `我的${unit}`;
    $('#drawOneSub').textContent = `消耗 ${fmt(s.drawOnce)} ${unit}`;
    const fiveCost = Math.max(0, s.drawFive - (s.drawFiveDiscount || 0));
    $('#drawFiveSub').textContent = `消耗 ${fmt(fiveCost)} ${unit}` + (s.fiveGuaranteeSR ? ' · 必出史诗' : '');
    if (s.drawFiveDiscount > 0) $('#drawFiveSub').textContent += `（省 ${s.drawFiveDiscount}）`;

    $('#pityWrap').style.display = s.pityVisible ? '' : 'none';
    $('#poolPanel').style.display = s.poolVisible ? '' : 'none';

    if (s.notice) {
      $('#noticeText').textContent = s.notice;
      $('#noticeBar').style.display = '';
    }
    $('#footerNote').textContent = `${s.siteName} · 奖品为虚拟道具，理性娱乐 · 1 元 = ${s.exchangeRate} ${unit}`;

    const crystal = $('#crystal');
    if (s.maintenance) {
      crystal.style.filter = 'grayscale(.7) brightness(.7)';
      $('#drawOne').disabled = true;
      $('#drawFive').disabled = true;
      toast(s.maintenanceTip || '维护中');
    }
    FX.Sfx.setEnabled(localStorage.getItem(LS.sound) !== 'off');
  }

  function renderPity() {
    const s = state.cfg, m = state.me;
    if (!s || !m) return;
    // 传说保底
    if (s.pitySSR > 0) {
      const left = Math.max(0, s.pitySSR - m.pitySSR);
      $('#pityLeft').textContent = left;
      $('#pityType').textContent = '传说及以上';
      $('#pityFill').style.width = Math.min(100, (m.pitySSR / s.pitySSR) * 100) + '%';
      $('#pityCount').textContent = `已祈愿 ${m.totalDraws} 次`;
    } else {
      $('#pityLeft').textContent = '∞';
      $('#pityFill').style.width = '0%';
    }
    if (s.pityUR > 0) {
      $('#urLine').style.display = '';
      $('#urFill').parentElement.style.display = '';
      $('#urLeft').textContent = `${m.pityUR} / ${s.pityUR}`;
      $('#urFill').style.width = Math.min(100, (m.pityUR / s.pityUR) * 100) + '%';
    } else {
      $('#urLine').style.display = 'none';
      $('#urFill').parentElement.style.display = 'none';
    }
  }

  function allTabActive() { return state.poolFilter; }

  function renderPool() {
    const list = $('#poolList');
    const f = state.poolFilter;
    const items = state.prizes.filter((p) => f === 'all' || p.rarity === f);
    list.innerHTML = items.map((p) => {
      const meta = state.rmap[p.rarity] || {};
      const stockTxt = p.stock === -1 ? '不限量' : (p.stock === 0 ? '已抽完' : `剩 ${p.stock}`);
      return `
      <div class="prize-row">
        <div class="prize-ic">${Icons.svg(p.icon, 30, meta.color)}</div>
        <div class="prize-meta">
          <div class="prize-name">${p.name}${p.tag ? ` <span class="faint small">·${p.tag}</span>` : ''}</div>
          <div class="prize-desc">${p.desc || meta.name} · ${stockTxt}</div>
          <div class="chance-bar"><i style="width:${Math.min(100, p.chance * 2.2)}%;background:${meta.color}"></i></div>
        </div>
        <div class="prize-pct" style="color:${meta.color}">${p.chance < 0.01 ? '<0.01' : p.chance.toFixed(2)}%</div>
      </div>`;
    }).join('');

    const totalW = state.prizes.reduce((s, p) => s + p.weight, 0);
    $('#poolFoot').textContent = `共 ${state.prizes.length} 项奖品，概率随库存实时变化；已抽完的奖品自动不参与抽取。`;

    $('#rarityTabs').innerHTML = [`<div class="rarity-tab" data-k="all" style="${f === 'all' ? 'color:#0f0d06;font-weight:700;background:linear-gradient(180deg,#ffe6ae,#d7a144);border-color:#ffe6ae' : ''}">全部</div>`]
      .concat(state.rarities.map((r) => {
        const on = f === r.key;
        return `<div class="rarity-tab" data-k="${r.key}" style="${on ? `color:#12100a;font-weight:700;background:${r.color};border-color:${r.color}` : `color:${r.color}`}">${r.name} ${(((state.prizes.filter((p) => p.rarity === r.key).reduce((s, p) => s + p.weight, 0)) / (totalW || 1)) * 100).toFixed(2)}%</div>`;
      })).join('');
    $$('#rarityTabs .rarity-tab').forEach((el) => el.onclick = () => { state.poolFilter = el.dataset.k; renderPool(); });
    void allTabActive;
  }

  async function loadFeed() {
    const r = await get('/api/feed');
    const box = $('#feedList');
    if (!r.ok || !r.feed || !r.feed.length) {
      box.innerHTML = '<div class="faint small">还没有人抽出好东西，来当第一个吧</div>';
      return;
    }
    box.innerHTML = r.feed.map((f) => `
      <div class="feed-item">
        <span class="avatar" style="width:20px;height:20px;font-size:10px;background:${f.color}">${(f.nick || '?').slice(0, 1)}</span>
        <span class="dim" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.nick}</span>
        <span style="color:${f.color};font-weight:700">${f.rarityName}</span>
        <span style="flex:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
      </div>`).join('');
  }

  async function renderStats() {
    const r = await get('/api/my?uid=' + state.me.uid + '&sig=' + state.sig);
    if (!r.ok) return;
    const m = r.user;
    const counts = {};
    r.records.forEach((rec) => (counts[rec.rarity] = (counts[rec.rarity] || 0) + 1));
    const ssr = (counts.ssr || 0), ur = (counts.ur || 0), sr = (counts.sr || 0);
    state.myRecords = r.records;
    $('#myStats').innerHTML = `
      <div class="row" style="gap:14px;flex-wrap:wrap">
        <span>祈愿 <b style="color:var(--gold-2)">${m.totalDraws}</b> 次</span>
        <span>史诗 <b style="color:var(--sr)">${sr}</b></span>
        <span>传说 <b style="color:var(--ssr)">${ssr}</b></span>
        <span>荣耀 <b style="color:var(--ur)">${ur}</b></span>
      </div>`;
  }

  /* ---------------- 抽奖流程 ---------------- */
  async function doDraw(count) {
    if (state.busy) return;
    if (!state.me) return toast('正在初始化，请稍候', 'err');
    const s = state.cfg;
    if (s.maintenance) return toast(s.maintenanceTip || '奖池维护中', 'err');

    const cost = count === 5 ? Math.max(0, s.drawFive - (s.drawFiveDiscount || 0)) : s.drawOnce * count;
    if (state.me.coins < cost) {
      FX.Sfx.error();
      const lack = cost - state.me.coins;
      toast(`余额不足 ${fmt(lack)} ${s.coinUnit}，请先充值`, 'err');
      openRecharge(lack);
      return;
    }

    state.busy = true;
    toggleButtons(false);
    FX.Sfx.unlock();
    FX.Sfx.click();

    // 蓄力阶段
    const crystal = $('#crystal');
    crystal.classList.add('charging');
    const rect = crystal.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    ['#ffe6ae', '#ffc93c', '#fff'].forEach((c, i) => setTimeout(() => FX.rise(cx, cy + 40, c, { count: 14, spread: 130 }), i * 160));
    FX.Sfx.charge();
    document.querySelectorAll('.draw-btn').forEach((b) => (b.style.transform = 'scale(.97)'));

    await sleep(1050);
    crystal.classList.remove('charging');
    document.querySelectorAll('.draw-btn').forEach((b) => (b.style.transform = ''));

    const r = await post('/api/draw', cred({ count }));
    if (!r.ok) {
      toast(r.msg || '抽奖失败', 'err');
      FX.Sfx.error();
      state.busy = false;
      toggleButtons(true);
      return;
    }

    state.me.coins = r.coins;
    $('#coinNum').textContent = fmt(r.coins);
    const chip = $('#coinChip');
    chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash');
    FX.Sfx.coin();
    if (r.user) { state.me = Object.assign(state.me, r.user); renderPity(); }
    void cost;

    await playRevealSequence(r.results, count === 5);

    state.busy = false;
    toggleButtons(true);
    $('#coinNum').textContent = fmt(state.me.coins);
    await Promise.all([refreshMe(), loadFeed()]);
    renderStats();
  }

  function toggleButtons(on) {
    $('#drawOne').disabled = !on;
    $('#drawFive').disabled = !on;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ---------------- 揭示动画 ---------------- */
  function playRevealSequence(results, isFive) {
    return new Promise((resolve) => {
      const layer = $('#reveal');
      const hand = $('#handArea');
      hand.innerHTML = '';
      layer.classList.add('on');

      // 光柱 + 冲击环
      const beam = $('#beam');
      beam.classList.remove('fire'); void beam.offsetWidth; beam.classList.add('fire');
      const shock = $('#shock');
      shock.classList.remove('go'); void shock.offsetWidth; shock.classList.add('go');
      FX.screenFlash('#ffd8a0', 0.16);
      FX.Sfx.beam();
      setTimeout(() => FX.burst(innerWidth / 2, innerHeight * 0.45, ['#ffe6ae', '#ffc93c', '#fff'], { count: 40, power: 6 }), 320);

      // 卡片入场
      const cards = results.map((res, i) => {
        const el = document.createElement('div');
        el.className = 'gacha-card';
        el.style.animationDelay = (260 + i * 105) + 'ms';
        const meta = state.rmap[res.rarity] || {};
        const level = meta.sort || 1;
        el.innerHTML = `
          <div class="card-back">
            <span class="back-emblem" style="display:block">${Icons.svg('crystal', 62, '#f3cf7a')}</span>
          </div>
          <div class="card-face ${res.rarity === 'ur' ? 'r-ur' : ''}" style="--cc:${res.color};--cg:${res.glow}">
            <div class="face-top">
              <span class="rarity-badge" style="background:${res.color}">${res.rarityShort}</span>
              ${res.pityType ? `<span class="face-pity">${res.pityType === 'ur' ? '荣耀保底' : '保底'}</span>` : ''}
            </div>
            <div class="face-art" style="color:${res.color}">${Icons.svg(res.icon, 78)}</div>
            <div>
              <div class="face-name">${res.name}</div>
              <div class="face-desc">${res.desc || res.rarityName}</div>
            </div>
          </div>`;
        el.addEventListener('click', () => flip(el, res, level, i, cards, resolve, isFive));
        hand.appendChild(el);
        return el;
      });

      state._pending = { cards, results, flipped: 0, resolve, isFive, done: false };

      if (!isFive) {
        $('#skipBtn').style.display = 'none';
        setTimeout(() => { if (!cards[0].classList.contains('flipped')) flip(cards[0], results[0], (state.rmap[results[0].rarity] || {}).sort || 1, 0, cards, resolve, false); }, 950);
      } else {
        $('#skipBtn').style.display = '';
        $('#skipBtn').onclick = () => {
          cards.forEach((c, i) => {
            if (!c.classList.contains('flipped')) {
              setTimeout(() => flip(c, results[i], (state.rmap[results[i].rarity] || {}).sort || 1, i, cards, resolve, true), i * 130);
            }
          });
        };
      }
      $('#revealHint').textContent = isFive ? '点击任意卡片揭晓，或点击「全部翻开」' : '命运的馈赠正在浮现…';
      $('#closeReveal').onclick = () => finishReveal(resolve);
    });
  }

  function flip(el, res, level, idx, cards, resolve, isFive) {
    if (el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    const face = el.querySelector('.card-face');
    setTimeout(() => face.classList.add('halo'), 120);
    FX.Sfx.reveal(level);

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    if (level >= 3) {
      FX.burst(cx, cy, [res.color, res.color2, '#ffffff'], { count: 26 + level * 10, power: 5 + level });
      FX.rise(cx, rect.bottom, res.color, { count: 14, spread: 120 });
    }
    if (level >= 4) {
      FX.screenFlash(res.color, level >= 5 ? 0.24 : 0.16);
      setTimeout(() => FX.fireworks([res.color, res.color2, '#ffffff']), 200);
      face.classList.add('r-ur');
    }
    if (level >= 5) {
      FX.Sfx.ur();
      document.body.animate(
        [{ transform: 'translate(0,0)' }, { transform: 'translate(2px,-2px)' }, { transform: 'translate(-2px,2px)' }, { transform: 'translate(0,0)' }],
        { duration: 260, iterations: 3 }
      );
    }

    const st = state._pending;
    st.flipped++;
    if (cards.every((c) => c.classList.contains('flipped'))) {
      setTimeout(() => finishReveal(resolve), isFive ? 900 : 1100);
    }
  }

  function finishReveal(resolve) {
    const st = state._pending;
    if (st.done) return;
    st.done = true;
    $('#reveal').classList.remove('on');
    $('#handArea').innerHTML = '';
    if (!st.cards.every((c) => c.classList.contains('flipped'))) {
      st.cards.forEach((c) => c.classList.add('flipped'));
    }
    showSummary(st.results);
    if (resolve) resolve();
  }

  function showSummary(results) {
    const s = state.cfg;
    const best = results.reduce((a, b) => (((state.rmap[b.rarity] || {}).sort || 0) > ((state.rmap[a.rarity] || {}).sort || 0) ? b : a), results[0]);
    const bestLevel = (state.rmap[best.rarity] || {}).sort || 1;
    openModal(`
      <div class="modal-head">
        <div class="modal-title">祈 愿 结 果</div>
        <button class="x-btn" data-close>${Icons.svg('close', 14)}</button>
      </div>
      <div class="modal-content">
        <div class="center small dim">本次消耗 ${fmt(results.length === 5 ? s.drawFive - (s.drawFiveDiscount || 0) : s.drawOnce * results.length)} ${s.coinUnit} · 余额 ${fmt(state.me.coins)} ${s.coinUnit}</div>
        <div class="summary-grid">
          ${results.map((r) => `
            <div class="mini-card" style="--cc:${r.color};--cg:${r.glow}">
              <span class="badge" style="background:${r.color}">${r.rarityShort}</span>
              <div style="color:${r.color}">${Icons.svg(r.icon, 42)}</div>
              <div class="mn">${r.name}</div>
            </div>`).join('')}
        </div>
        <div class="center mt16" id="summaryFlavor" style="color:${best.color};font-weight:700;letter-spacing:1px">
          ${bestLevel >= 5 ? '★ 荣耀水晶降临 ★' : bestLevel === 4 ? '传说品质！欧气爆棚' : bestLevel === 3 ? '史诗到手，稳' : '再接再厉，下次一定'}
        </div>
        <div class="row mt16" style="justify-content:center;gap:10px;flex-wrap:wrap">
          <button class="btn solid" data-again-one>祈愿一次</button>
          <button class="btn solid five-btn" data-again-five style="background:linear-gradient(180deg,#cbb2ff,#6f4bd0);border-color:#e2d2ff;color:#150a2c">五连祈愿</button>
          <button class="btn ghost" data-close>收下战利品</button>
        </div>
        <div class="center faint small mt8">奖品已存入战利品背包，请凭此界面联系管理员领取</div>
      </div>`,
      (root) => {
        root.querySelector('[data-again-one]').onclick = () => { closeModal(); setTimeout(() => doDraw(1), 220); };
        root.querySelector('[data-again-five]').onclick = () => { closeModal(); setTimeout(() => doDraw(5), 220); };
        root.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
      });
  }

  /* ---------------- 背包 / 记录 ---------------- */
  async function openBag() {
    const r = await get(`/api/my?uid=${state.me.uid}&sig=${state.sig}`);
    if (!r.ok) return toast(r.msg, 'err');
    const agg = {};
    r.records.forEach((rec) => {
      const k = rec.prizeId || rec.name;
      if (!agg[k]) agg[k] = { ...rec, count: 0 };
      agg[k].count++;
    });
    const arr = Object.values(agg).sort((a, b) => ((state.rmap[b.rarity] || {}).sort || 0) - ((state.rmap[a.rarity] || {}).sort || 0));
    if (!arr.length) {
      openModal(`
        <div class="modal-head"><div class="modal-title">战利品背包</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
        <div class="modal-content center dim">背包空空如也，去祈愿试试？</div>`,
        (root) => root.querySelector('[data-close]').onclick = closeModal);
      return;
    }
    openModal(`
      <div class="modal-head"><div class="modal-title">战利品背包</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
      <div class="modal-content">
        <div class="summary-grid">
          ${arr.map((it) => {
            const meta = state.rmap[it.rarity] || {};
            return `<div class="mini-card" style="--cc:${meta.color};--cg:${meta.glow}">
              <span class="badge" style="background:${meta.color}">${meta.short} ×${it.count}</span>
              <div style="color:${meta.color}">${Icons.svg(it.icon, 42)}</div>
              <div class="mn">${it.name}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="center faint small mt12">共 ${arr.length} 种、${Object.values(agg).reduce((s, x) => s + x.count, 0)} 件战利品</div>
      </div>`, (root) => root.querySelector('[data-close]').onclick = closeModal);
  }

  async function openRecords() {
    const r = await get(`/api/my?uid=${state.me.uid}&sig=${state.sig}`);
    if (!r.ok) return toast(r.msg, 'err');
    const recs = r.records;
    openModal(`
      <div class="modal-head"><div class="modal-title">抽卡记录</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
      <div class="modal-content">
        <div class="rec-list">
          ${recs.length ? recs.map((rec) => {
            const meta = state.rmap[rec.rarity] || {};
            return `<div class="rec-item">
              <span class="when">${new Date(rec.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span style="color:${meta.color};display:flex;align-items:center">${Icons.svg(rec.icon, 22)}</span>
              <span style="flex:1">${rec.name}</span>
              <span class="badge" style="background:${meta.color};color:#12100a;font-size:9px;padding:1px 6px;border-radius:3px;font-weight:800">${meta.short}</span>
            </div>`;
          }).join('') : '<div class="center dim">暂无记录</div>'}
        </div>
        <div class="center faint small mt12">仅展示最近 60 条</div>
      </div>`, (root) => root.querySelector('[data-close]').onclick = closeModal);
  }

  /* ---------------- 我的 / 充值 ---------------- */
  function openProfile() {
    const m = state.me, s = state.cfg;
    openModal(`
      <div class="modal-head"><div class="modal-title">我 的 账 号</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
      <div class="modal-content">
        <div class="field"><label>昵称</label><input class="input" id="nickInput" maxlength="16" value="${String(m.nick).replace(/"/g, '&quot;')}" /></div>
        <div class="field">
          <label>我的邀请码（也是你的账号 ID，换设备时用它找回）</label>
          <div class="copy-line" id="copyCode">${m.uid}</div>
        </div>
        <div class="grid2 small dim center">
          <div class="panel" style="padding:10px"><div class="faint">余额</div><b style="color:var(--gold-2);font-size:16px">${fmt(m.coins)}</b></div>
          <div class="panel" style="padding:10px"><div class="faint">累计祈愿</div><b style="color:var(--gold-2);font-size:16px">${m.totalDraws}</b></div>
        </div>
        <div class="row mt12" style="gap:8px;flex-wrap:wrap">
          <button class="btn sm ghost" id="soundBtn">音效：${localStorage.getItem(LS.sound) === 'off' ? '关' : '开'}</button>
          <button class="btn sm ghost" id="saveNick">保存昵称</button>
        </div>
        <hr style="border:none;border-top:1px solid var(--line);margin:14px 0" />
        <div class="field"><label>换设备登录：输入邀请码</label>
          <div class="row"><input class="input" id="loginCode" placeholder="例如 U4K9Q2" /><button class="btn sm" id="doLogin">登录</button></div>
        </div>
      </div>`, (root) => {
      root.querySelector('[data-close]').onclick = closeModal;
      root.querySelector('#copyCode').onclick = (e) => { copyText(m.uid); toast('邀请码已复制'); void e; };
      root.querySelector('#soundBtn').onclick = (e) => {
        const off = localStorage.getItem(LS.sound) === 'off';
        localStorage.setItem(LS.sound, off ? 'on' : 'off');
        FX.Sfx.setEnabled(off);
        e.target.textContent = '音效：' + (off ? '开' : '关');
      };
      root.querySelector('#saveNick').onclick = async () => {
        const nick = root.querySelector('#nickInput').value.trim();
        if (!nick) return toast('昵称不能为空', 'err');
        const r = await post('/api/user/rename', cred({ nick }));
        if (!r.ok) return toast(r.msg, 'err');
        state.me = Object.assign(state.me, r.user);
        applyUser();
        toast('已保存');
        closeModal();
      };
      root.querySelector('#doLogin').onclick = async () => {
        const code = root.querySelector('#loginCode').value.trim().toUpperCase();
        if (!code) return toast('请输入邀请码', 'err');
        const r = await post('/api/user/login', { code });
        if (!r.ok) return toast(r.msg, 'err');
        localStorage.setItem(LS.uid, r.user.uid);
        localStorage.setItem(LS.sig, r.sig);
        state.me = r.user; state.sig = r.sig;
        applyUser(); renderStats();
        toast('切换成功');
        closeModal();
      };
    });
    void s;
  }

  function copyText(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  function openRecharge(lack) {
    const s = state.cfg;
    const rate = s.exchangeRate;
    const suggest = lack ? Math.max(1, Math.ceil((lack / rate) * 10) / 10) : 10;
    openModal(`
      <div class="modal-head"><div class="modal-title">充 值 祈 愿 币</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
      <div class="modal-content">
        <div class="center small dim">微信转账 <b style="color:var(--gold-2)">1 元 = ${rate} ${s.coinUnit}</b> · 管理员核对后自动到账</div>
        <div class="field mt12">
          <label>选择金额（元）</label>
          <div class="row" style="flex-wrap:wrap;gap:6px" id="amtRow">
            ${[10, 30, 50, 100, 200].map((a) => `<button class="btn sm ${a === suggest ? 'solid' : 'ghost'}" data-amt="${a}">${a} 元</button>`).join('')}
          </div>
        </div>
        <div class="field"><label>转账金额（元）</label><input class="input" id="amtInput" type="number" min="1" step="1" value="${Math.max(1, Math.round(suggest))}" /></div>
        <div class="center faint small">到账：<b style="color:var(--gold-2);font-size:15px" id="willGet">${Math.round(Math.max(1, Math.round(suggest)) * rate)}</b> ${s.coinUnit}</div>

        <div class="field mt12"><label>请用微信扫描下方收款码转账</label>
          <div class="qr-box" id="qrBox">${s.paymentQR ? `<img src="${s.paymentQR}" alt="收款码" />` : (s.wechatId ? `<div class="center" style="padding:12px">微信号<br /><b style="color:var(--gold-2);font-size:16px">${s.wechatId}</b></div>` : '管理员还没有上传收款码<br/>请先联系管理员')}</div>
        </div>

        <div class="field">
          <label>转账备注里务必填写下方邀请码（大写）</label>
          <div class="copy-line" id="copyCode2">${state.me.uid}</div>
        </div>
        <div class="faint small center">${s.payRemarkTip || ''}</div>

        <div class="field mt12"><label>上传转账截图（可选，便于后台快速核对）</label>
          <input type="file" id="proofFile" accept="image/*" class="input" />
          <div id="proofHint" class="faint small mt8"></div>
        </div>

        <button class="btn solid" id="submitPay" style="width:100%;margin-top:6px">我已完成转账，提交核对</button>
        <div id="myPays" class="mt12"></div>
      </div>`, (root) => {
      root.querySelector('[data-close]').onclick = closeModal;
      let proof = '';
      const input = root.querySelector('#amtInput');
      root.querySelectorAll('[data-amt]').forEach((b) => (b.onclick = () => {
        input.value = b.dataset.amt;
        updateWill();
      }));
      input.oninput = updateWill;
      function updateWill() {
        const v = Number(input.value) || 0;
        root.querySelector('#willGet').textContent = fmt(Math.round(v * rate));
      }
      root.querySelector('#copyCode2').onclick = () => { copyText(state.me.uid); toast('邀请码已复制'); };
      root.querySelector('#proofFile').onchange = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 900;
            const scale = Math.min(1, max / img.width);
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            proof = c.toDataURL('image/jpeg', 0.72);
            root.querySelector('#proofHint').innerHTML = '<span style="color:var(--gold-2)">✓ 截图已就绪（已压缩）</span>';
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(f);
      };
      root.querySelector('#submitPay').onclick = async () => {
        const amount = Number(input.value);
        if (!amount || amount <= 0) return toast('请输入转账金额', 'err');
        const btn = root.querySelector('#submitPay');
        btn.disabled = true; btn.textContent = '提交中…';
        const r = await post('/api/recharge', cred({ amount, remark: state.me.uid, proof }));
        btn.disabled = false; btn.textContent = '我已完成转账，提交核对';
        if (!r.ok) return toast(r.msg, 'err');
        toast('已提交，管理员核对后立即到账');
        FX.Sfx.coin();
        renderMyPays(root);
      };
      renderMyPays(root);
    });

    async function renderMyPays(root) {
      const r = await get(`/api/my?uid=${state.me.uid}&sig=${state.sig}`);
      if (!r.ok) return;
      const list = (r.payments || []).slice(0, 6);
      const box = root.querySelector('#myPays');
      if (!list.length) return;
      box.innerHTML = `<div class="card-title" style="font-size:12px">我的充值申请</div>` + list.map((p) => `
        <div class="rec-item">
          <span class="when">¥${p.amount}</span>
          <span style="flex:1">+${fmt(p.coins)} ${s.coinUnit}</span>
          <span style="color:${p.status === 'approved' ? '#7ee08a' : p.status === 'rejected' ? '#ff9aa8' : '#ffd77a'}">
            ${p.status === 'approved' ? '已到账' : p.status === 'rejected' ? '已驳回' : '待核对'}
          </span>
        </div>`).join('');
    }
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    $('#drawOne').onclick = () => doDraw(1);
    $('#drawFive').onclick = () => doDraw(5);
    $('#crystal').onclick = () => { FX.Sfx.unlock(); FX.Sfx.click(); const r = $('#crystal').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffe6ae', '#ffc93c'], { count: 18, power: 3 }); };
    $('#btnRecharge').onclick = () => openRecharge();
    $('#btnQuick').onclick = () => openRecharge();
    $('#meChip').onclick = openProfile;
    $('#btnBag').onclick = openBag;
    $('#btnRecords').onclick = openRecords;
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('#reveal').classList.remove('on'); } });
  }

  /* ---------------- 启动 ---------------- */
  (async function boot() {
    initScene();
    await loadConfig();
    await ensureUser();
    bind();
    // 余额轮询（后台放行充值后自动到账）
    setInterval(async () => {
      if (!state.me || state.busy) return;
      const r = await get(`/api/my?uid=${state.me.uid}&sig=${state.sig}`);
      if (r.ok && r.user.coins !== state.me.coins) {
        const gained = r.user.coins - state.me.coins;
        state.me = r.user;
        $('#coinNum').textContent = fmt(r.user.coins);
        const chip = $('#coinChip');
        chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash');
        if (gained > 0) toast(`充值到账 +${fmt(gained)} ${state.cfg.coinUnit}`);
        FX.Sfx.coin();
        renderStats();
      }
    }, 6000);
  })();
})();
