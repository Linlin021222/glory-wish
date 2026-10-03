/* 荣耀祈愿 · 管理后台 */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const ICON_LABEL = {
    crystal: '水晶', legend: '传说之剑', coupon: '礼包', chest: '宝箱',
    'fragment-skin': '皮肤碎片', 'fragment-hero': '英雄碎片', diamond: '钻石',
    warcowry: '令牌', 'coupon-small': '点券', rose: '玫瑰', exp: '经验卡', gold: '金币', gift: '礼盒'
  };

  const S = { token: '', data: null, tab: 'dash', prizeDraft: null };

  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'err' ? ' err' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2000);
  }
  async function post(path, body) {
    try {
      const r = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': S.token },
        body: JSON.stringify(body || {})
      });
      const j = await r.json();
      if (j.code === 'NO_AUTH') { doLogout(true); }
      return j;
    } catch (e) { return { ok: false, msg: '网络异常' }; }
  }
  async function get(path) {
    try {
      const r = await fetch(path, { headers: { 'x-admin-token': S.token } });
      const j = await r.json();
      if (j.code === 'NO_AUTH') doLogout(true);
      return j;
    } catch (e) { return { ok: false, msg: '网络异常' }; }
  }
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ---------------- 登录 ---------------- */
  function bindLogin() {
    $('#loginMark').innerHTML = Icons.svg('lock', 34, '#3a2405');
    $('#headMark').innerHTML = Icons.svg('crystal', 24, '#3a2405');
    $('#pwInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    $('#loginBtn').onclick = doLogin;
    $('#logoutBtn').onclick = () => doLogout(false);
    $('#refreshBtn').onclick = () => { loadState(); toast('已刷新'); };
    $('#exportBtn').onclick = (e) => {
      e.preventDefault();
      if (!S.token) return toast('请先登录', 'err');
      window.open('/api/admin/export?token=' + encodeURIComponent(S.token), '_blank');
    };

    $$('#tabs .tab').forEach((t) => (t.onclick = () => {
      S.tab = t.dataset.tab;
      $$('#tabs .tab').forEach((x) => x.classList.toggle('active', x === t));
      $$('[data-sec]').forEach((s) => (s.style.display = s.dataset.sec === S.tab ? '' : 'none'));
    }));
  }

  async function doLogin() {
    const pw = $('#pwInput').value;
    if (!pw) return toast('请输入密码', 'err');
    const r = await post('/api/admin/login', { password: pw });
    if (!r.ok) return toast(r.msg || '登录失败', 'err');
    S.token = r.token;
    sessionStorage.setItem('glory_admin_token', r.token);
    $('#loginWrap').style.display = 'none';
    $('#adminMain').style.display = '';
    await loadState();
    toast('欢迎回来');
  }

  function doLogout(auto) {
    S.token = '';
    sessionStorage.removeItem('glory_admin_token');
    $('#loginWrap').style.display = '';
    $('#adminMain').style.display = 'none';
    if (auto) toast('登录已失效，请重新登录', 'err');
  }

  /* ---------------- 数据 ---------------- */
  async function loadState() {
    const r = await get('/api/admin/state');
    if (!r.ok) return toast(r.msg || '加载失败', 'err');
    S.data = r;
    S.prizeDraft = JSON.parse(JSON.stringify(r.prizes));
    renderAll();
  }

  function renderAll() {
    $('#headSite').textContent = S.data.settings.siteName;
    renderDash();
    renderPrizes();
    renderRules();
    renderPay();
    renderUsers();
    renderRecords();
    renderLogs();
  }

  function rarityMeta(k) { return (S.data.rarities.find((x) => x.key === k) || {}); }

  /* ---------------- 概览 ---------------- */
  function renderDash() {
    const st = S.data.stats;
    const cards = [
      ['用户总数', st.userCount, Icons.svg('wallet', 20, '#f3cf7a')],
      ['累计抽奖', st.drawCount, Icons.svg('dice', 20, '#f3cf7a')],
      ['待处理充值', st.payPending, Icons.svg('coin', 20, '#f3cf7a')],
      ['已确认收款', '¥' + fmt(st.payApproved || 0), Icons.svg('fire', 20, '#f3cf7a')]
    ];
    $('#statGrid').innerHTML = cards.map(([k, v, ic]) => `
      <div class="stat"><div class="row spread"><span class="k">${k}</span><span style="opacity:.6">${ic}</span></div>
      <div class="v">${v}</div></div>`).join('');

    const totalDraws = Object.values(st.rarityCount || {}).reduce((a, b) => a + b, 0) || 1;
    $('#rareDist').innerHTML = S.data.rarities.slice().sort((a, b) => b.sort - a.sort).map((r) => {
      const c = st.rarityCount[r.key] || 0;
      const pct = (c / totalDraws) * 100;
      return `<div class="row" style="gap:10px;margin-bottom:8px">
        <div style="width:64px;color:${r.color};font-weight:700">${r.name}</div>
        <div class="bar-mini" style="flex:1"><i style="width:${pct}%;background:${r.color}"></i></div>
        <div class="mono small" style="width:110px;text-align:right">${c} 件 / ${pct.toFixed(2)}%</div>
      </div>`;
    }).join('');
  }

  /* ---------------- 奖池编辑 ---------------- */
  function renderPrizes() {
    const body = $('#prizeBody');
    const list = S.prizeDraft;
    const totalW = list.reduce((s, p) => s + (Number(p.weight) || 0), 0) || 1;
    body.innerHTML = list.map((p, i) => {
      const meta = rarityMeta(p.rarity);
      const chance = (Number(p.weight) || 0) / totalW * 100;
      return `<tr data-i="${i}">
        <td class="ic-cell"><span class="ic-preview" style="color:${meta.color}">${Icons.svg(p.icon, 30)}</span></td>
        <td><input class="input" data-f="name" value="${esc(p.name)}" /></td>
        <td><input class="input" data-f="desc" value="${esc(p.desc)}" /></td>
        <td class="w-md"><select class="select" data-f="rarity">
          ${S.data.rarities.map((r) => `<option value="${r.key}" ${r.key === p.rarity ? 'selected' : ''}>${r.name} ${r.short}</option>`).join('')}
        </select></td>
        <td class="w-sm"><input class="input mono" data-f="weight" type="number" min="0" value="${p.weight}" /></td>
        <td><div class="row" style="gap:6px"><div class="bar-mini" style="flex:1"><i style="width:${Math.min(100, chance * 3)}%;background:${meta.color}"></i></div>
          <span class="mono small" style="width:52px;text-align:right;color:${meta.color}">${chance.toFixed(2)}%</span></div></td>
        <td class="w-sm"><input class="input mono" data-f="stock" type="number" value="${p.stock}" title="-1 不限量，0 下架" /></td>
        <td class="w-md">
          <div class="row" style="gap:4px">
            <select class="select" data-f="icon">${Icons.keys.map((k) => `<option value="${k}" ${k === p.icon ? 'selected' : ''}>${ICON_LABEL[k] || k}</option>`).join('')}</select>
          </div>
        </td>
        <td><input class="input mono" data-f="tag" value="${esc(p.tag)}" style="width:70px" placeholder="可选" /></td>
        <td><button class="btn sm danger" data-del="${i}">删</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="10"><div class="empty">奖池空空，点「新增奖品」开始配置</div></td></tr>';

    body.querySelectorAll('tr[data-i]').forEach((tr) => {
      const i = Number(tr.dataset.i);
      tr.querySelectorAll('[data-f]').forEach((inp) => {
        inp.onchange = () => {
          const f = inp.dataset.f;
          S.prizeDraft[i][f] = f === 'weight' || f === 'stock' ? Number(inp.value) : inp.value;
          renderPrizes();
        };
      });
    });
    body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      S.prizeDraft.splice(Number(b.dataset.del), 1);
      renderPrizes();
    }));

    $('#totalWeight').textContent = fmt(totalW);
    $('#prizeCount').textContent = list.length;
  }

  async function savePrizes() {
    const r = await post('/api/admin/prizes', { prizes: S.prizeDraft });
    if (!r.ok) return toast(r.msg || '保存失败', 'err');
    toast('奖池已保存，前台立即生效');
    $('#prizeTbl').classList.remove('saved-flash'); void $('#prizeTbl').offsetWidth; $('#prizeTbl').classList.add('saved-flash');
    loadState();
  }

  /* ---------------- 规则 ---------------- */
  function renderRules() {
    const s = S.data.settings;
    const set = (id, v) => ($(id).value = v === undefined || v === null ? '' : v);
    set('#f_siteName', s.siteName); set('#f_subtitle', s.subtitle); set('#f_notice', s.notice);
    set('#f_coinUnit', s.coinUnit); set('#f_exchangeRate', s.exchangeRate);
    set('#f_drawOnce', s.drawOnce); set('#f_drawFive', s.drawFive); set('#f_drawFiveDiscount', s.drawFiveDiscount);
    set('#f_welcomeCoins', s.welcomeCoins);
    set('#f_pitySSR', s.pitySSR); set('#f_pityUR', s.pityUR); set('#f_mtTip', s.maintenanceTip);
    set('#f_wechatId', s.wechatId); set('#f_payRemarkTip', s.payRemarkTip);
    $('#f_adminPassword').value = '';

    bindSwitch('#s_five', s.fiveGuaranteeSR);
    bindSwitch('#s_pity', s.pityVisible);
    bindSwitch('#s_pool', s.poolVisible);
    bindSwitch('#s_mt', s.maintenance);

    $('#qrPreview').innerHTML = s.paymentQR ? `<img src="${s.paymentQR}" style="width:150px;border-radius:10px;border:1px solid var(--line)" />` : '';
    $('#qrState').textContent = s.paymentQR ? '已设置' : '未上传（前台会提示联系管理员）';
  }

  function bindSwitch(sel, val) {
    const el = $(sel);
    el.classList.toggle('on', !!val);
    el.onclick = () => { el.classList.toggle('on'); };
  }

  async function saveRules() {
    const num = (sel) => Number($(sel).value);
    const payload = {
      siteName: $('#f_siteName').value,
      subtitle: $('#f_subtitle').value,
      notice: $('#f_notice').value,
      coinUnit: $('#f_coinUnit').value,
      exchangeRate: num('#f_exchangeRate'),
      drawOnce: num('#f_drawOnce'),
      drawFive: num('#f_drawFive'),
      drawFiveDiscount: num('#f_drawFiveDiscount'),
      welcomeCoins: num('#f_welcomeCoins'),
      pitySSR: num('#f_pitySSR'),
      pityUR: num('#f_pityUR'),
      maintenanceTip: $('#f_mtTip').value,
      wechatId: $('#f_wechatId').value,
      payRemarkTip: $('#f_payRemarkTip').value,
      paymentQR: S.data.settings.paymentQR,
      fiveGuaranteeSR: $('#s_five').classList.contains('on'),
      pityVisible: $('#s_pity').classList.contains('on'),
      poolVisible: $('#s_pool').classList.contains('on'),
      maintenance: $('#s_mt').classList.contains('on')
    };
    const pw = $('#f_adminPassword').value.trim();
    if (pw) payload.adminPassword = pw;
    const r = await post('/api/admin/settings', payload);
    if (!r.ok) return toast(r.msg || '保存失败', 'err');
    toast('规则已保存');
    loadState();
  }

  /* ---------------- 充值审核 ---------------- */
  function renderPay() {
    const list = S.data.payments;
    const pending = list.filter((p) => p.status === 'pending').length;
    const dot = $('#payDot');
    dot.style.display = pending ? '' : 'none';
    dot.textContent = pending;
    $('#payBody').innerHTML = list.length ? list.map((p) => `
      <tr>
        <td class="tiny mono">${new Date(p.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(p.nick)}</td>
        <td><b style="color:var(--gold-2)">¥${fmt(p.amount)}</b></td>
        <td class="mono">+${fmt(p.coins)}</td>
        <td class="mono tiny">${esc(p.remark || '未填备注')}</td>
        <td>${p.proof ? `<img class="proof-thumb" src="${p.proof}" data-proof="${p.proof}" />` : '<span class="faint tiny">无截图</span>'}</td>
        <td>${p.status === 'approved' ? '<span class="pill ok">已放行</span>' : p.status === 'rejected' ? '<span class="pill bad">已驳回</span>' : '<span class="pill warn">待核对</span>'}</td>
        <td>${p.status === 'pending'
          ? `<div class="row" style="gap:4px"><button class="btn sm solid" data-ap="${p.id}">放行</button><button class="btn sm danger" data-rj="${p.id}">驳回</button></div>`
          : `<span class="faint tiny">${p.handledAt ? new Date(p.handledAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>`}</td>
      </tr>`).join('') : '<tr><td colspan="8"><div class="empty">暂时没有充值申请</div></td></tr>';

    $('#payBody').querySelectorAll('[data-ap]').forEach((b) => (b.onclick = async () => {
      const r = await post('/api/admin/payment', { id: b.dataset.ap, action: 'approve' });
      if (!r.ok) return toast(r.msg, 'err');
      toast(`已放行，${r.user.nick} 到账 ${fmt(r.payment.coins)}`);
      FX.Sfx.coin();
      loadState();
    }));
    $('#payBody').querySelectorAll('[data-rj]').forEach((b) => (b.onclick = async () => {
      const r = await post('/api/admin/payment', { id: b.dataset.rj, action: 'reject' });
      if (!r.ok) return toast(r.msg, 'err');
      toast('已驳回');
      loadState();
    }));
    $('#payBody').querySelectorAll('[data-proof]').forEach((img) => (img.onclick = () => {
      $('#modalBody').innerHTML = `<div class="modal-head"><div class="modal-title">转账截图</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
        <div class="modal-content center"><img src="${img.dataset.proof}" style="max-width:100%;border-radius:10px" /></div>`;
      $('#modal').classList.add('on');
      $('#modalBody').querySelector('[data-close]').onclick = () => $('#modal').classList.remove('on');
    }));
  }

  /* ---------------- 用户 ---------------- */
  function renderUsers() {
    const list = Object.values(S.data.users || {});
    $('#userBody').innerHTML = list.length ? list.slice().sort((a, b) => b.totalDraws - a.totalDraws).map((u) => `
      <tr>
        <td>${esc(u.nick)}</td>
        <td class="mono tiny">${u.uid}</td>
        <td class="mono"><b style="color:var(--gold-2)">${fmt(u.coins)}</b></td>
        <td class="mono">${u.totalDraws}</td>
        <td class="mono">${u.pitySSR}</td>
        <td class="mono">${u.pityUR}</td>
        <td>${u.blocked ? '<span class="pill bad">已封禁</span>' : '<span class="pill ok">正常</span>'}</td>
        <td>
          <div class="row" style="gap:4px;flex-wrap:wrap">
            <input class="input mono" data-amt="${u.uid}" style="width:80px" placeholder="+100" />
            <button class="btn sm" data-aud="${u.uid}">发放</button>
            <button class="btn sm ghost" data-pity="${u.uid}">重置保底</button>
            <button class="btn sm ${u.blocked ? '' : 'danger'}" data-blk="${u.uid}">${u.blocked ? '解封' : '封禁'}</button>
          </div>
        </td>
      </tr>`).join('') : '<tr><td colspan="8"><div class="empty">还没有用户</div></td></tr>';

    $('#userBody').querySelectorAll('[data-aud]').forEach((b) => (b.onclick = async () => {
      const inp = $(`[data-amt="${b.dataset.aud}"]`);
      const delta = Number(inp.value);
      if (!delta) return toast('请输入要发放的数量（可填负数）', 'err');
      const r = await post('/api/admin/adjust', { uid: b.dataset.aud, delta });
      if (!r.ok) return toast(r.msg, 'err');
      toast(`已调整，当前余额 ${fmt(r.user.coins)}`);
      inp.value = '';
      loadState();
    }));
    $('#userBody').querySelectorAll('[data-pity]').forEach((b) => (b.onclick = async () => {
      const r = await post('/api/admin/user/resetpity', { uid: b.dataset.pity });
      if (r.ok) { toast('保底计数已重置'); loadState(); }
    }));
    $('#userBody').querySelectorAll('[data-blk]').forEach((b) => (b.onclick = async () => {
      const r = await post('/api/admin/user/block', { uid: b.dataset.blk });
      if (r.ok) { toast(r.user.blocked ? '已封禁' : '已解封'); loadState(); }
    }));
  }

  /* ---------------- 记录 & 日志 ---------------- */
  function renderRecords() {
    const list = S.data.records || [];
    $('#recBody').innerHTML = list.length ? list.map((r) => {
      const meta = rarityMeta(r.rarity);
      return `<tr>
        <td class="tiny mono">${new Date(r.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(r.nick)}</td>
        <td class="row" style="gap:6px"><span style="color:${meta.color}">${Icons.svg(r.icon, 22)}</span>${esc(r.name)}</td>
        <td><span class="rarity-pill" style="background:${meta.color}">${meta.short}</span></td>
      </tr>`;
    }).join('') : '<tr><td colspan="4"><div class="empty">暂无抽卡记录</div></td></tr>';
  }

  function renderLogs() {
    const list = S.data.logs || [];
    $('#logBody').innerHTML = list.length ? list.map((l) => `
      <tr><td class="tiny mono">${new Date(l.at).toLocaleString('zh-CN')}</td><td>${esc(l.action)}</td><td class="dim">${esc(l.detail)}</td></tr>`
    ).join('') : '<tr><td colspan="3"><div class="empty">暂无日志</div></td></tr>';
  }

  /* ---------------- 概率助手 ---------------- */
  function openRatio() {
    const rows = S.data.rarities.slice().sort((a, b) => b.sort - a.sort);
    const counts = {};
    S.prizeDraft.forEach((p) => (counts[p.rarity] = (counts[p.rarity] || 0) + 1));
    const totalW = S.prizeDraft.reduce((s, p) => s + (Number(p.weight) || 0), 0) || 1;
    $('#modalBody').innerHTML = `
      <div class="modal-head"><div class="modal-title">概 率 助 手</div><button class="x-btn" data-close>${Icons.svg('close', 14)}</button></div>
      <div class="modal-content">
        <div class="hint-box">填写每个稀有度的<b>目标出货百分比</b>，助手会自动把权重分配下去（同一稀有度内的奖品均分）。当前总权重 ${fmt(totalW)}。</div>
        <div class="mt12" id="ratioRows">
          ${rows.map((r) => {
            const cur = (S.prizeDraft.filter((p) => p.rarity === r.key).reduce((s, p) => s + (Number(p.weight) || 0), 0) / totalW * 100).toFixed(2);
            return `<div class="row" style="gap:10px;margin-bottom:8px">
              <div style="width:56px;color:${r.color};font-weight:700">${r.name}</div>
              <input class="input mono" data-r="${r.key}" style="width:90px" value="${cur}" />
              <span class="faint small">% · ${counts[r.key] || 0} 项奖品</span>
            </div>`;
          }).join('')}
        </div>
        <div class="center small"><b id="ratioSum">100.00</b>% 合计</div>
        <button class="btn solid mt12" id="applyRatio" style="width:100%">按目标分配权重</button>
      </div>`;
    $('#modal').classList.add('on');
    const inputs = Array.from($('#ratioRows').querySelectorAll('input'));
    const sumEl = $('#ratioSum');
    function upd() {
      const s = inputs.reduce((a, i) => a + (Number(i.value) || 0), 0);
      sumEl.textContent = s.toFixed(2);
      sumEl.style.color = Math.abs(s - 100) < 0.01 ? 'var(--gold-2)' : '#ff9aa8';
    }
    inputs.forEach((i) => (i.oninput = upd));
    upd();
    $('#modalBody').querySelector('[data-close]').onclick = () => $('#modal').classList.remove('on');
    $('#applyRatio').onclick = () => {
      const target = {};
      inputs.forEach((i) => (target[i.dataset.r] = Number(i.value) || 0));
      const BASE = 10000;
      S.prizeDraft.forEach((p) => {
        const list = S.prizeDraft.filter((x) => x.rarity === p.rarity);
        p.weight = Math.round(((target[p.rarity] || 0) / 100 * BASE) / list.length);
      });
      renderPrizes();
      $('#modal').classList.remove('on');
      toast('权重已重新分配，记得点「保存奖池」');
    };
  }

  /* ---------------- 绑定 ---------------- */
  function bindAdmin() {
    $('#savePrizes').onclick = savePrizes;
    $('#savePrizes2').onclick = savePrizes;
    $('#saveRules').onclick = saveRules;
    $('#openRatio').onclick = openRatio;
    $('#addPrize').onclick = () => {
      S.prizeDraft.push({ id: '', name: '新奖品', desc: '描述一下这个奖品', rarity: 'n', weight: 100, stock: -1, icon: 'gift', tag: '' });
      renderPrizes();
      toast('已添加，修改后记得保存');
    };
    $('#restockBtn').onclick = async () => {
      const v = window.confirm('把全部奖品库存设为「不限量(-1)」？');
      if (!v) return;
      const r = await post('/api/admin/restock', { value: -1 });
      if (r.ok) { toast('已全部补货'); loadState(); }
    };
    $('#clearRecords').onclick = async () => {
      if (!window.confirm('确定清空全部抽卡记录？该操作不可恢复。')) return;
      const r = await post('/api/admin/clearfeed', {});
      if (r.ok) { toast('记录已清空'); loadState(); }
    };
    $('#qrFile').onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          const max = 800;
          const scale = Math.min(1, max / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const b64 = c.toDataURL('image/png');
          $('#qrState').textContent = '上传中…';
          const r = await post('/api/admin/upload', { base64: b64, name: 'qr' });
          if (!r.ok) return toast(r.msg, 'err');
          S.data.settings.paymentQR = r.url;
          $('#qrPreview').innerHTML = `<img src="${r.url}" style="width:150px;border-radius:10px;border:1px solid var(--line)" />`;
          $('#qrState').textContent = '已上传，点「保存规则」生效';
          toast('收款码已就绪');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(f);
    };
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.remove('on'); });

    // 待处理充值轮询
    setInterval(async () => {
      if (!S.token || S.tab === 'prizes') return;
      const r = await get('/api/admin/state');
      if (!r.ok) return;
      const before = (S.data.payments || []).filter((p) => p.status === 'pending').length;
      const after = r.payments.filter((p) => p.status === 'pending').length;
      S.data = r;
      if (S.tab === 'prizes') return;
      renderDash(); renderPay(); renderUsers(); renderRecords(); renderLogs();
      if (after > before) { toast('收到新的充值申请'); FX.Sfx.coin(); }
    }, 15000);
  }

  /* ---------------- 启动 ---------------- */
  function initSceneAdmin() {
    const css = [];
    for (let i = 0; i < 60; i++) css.push(`${(Math.random() * 100).toFixed(2)}% ${(Math.random() * 70).toFixed(2)}% 0 rgba(255,255,255,${(Math.random() * 0.5 + 0.2).toFixed(2)})`);
    $('#stars').style.backgroundImage = 'radial-gradient(1.2px 1.2px at ' + css.join(',') + ')';
    $('#stars').style.backgroundSize = '100% 100%';
    const box = $('#motes');
    for (let i = 0; i < 16; i++) {
      const m = document.createElement('i');
      m.className = 'mote';
      m.style.left = Math.random() * 100 + '%';
      m.style.top = 70 + Math.random() * 32 + '%';
      m.style.animationDuration = 10 + Math.random() * 12 + 's';
      box.appendChild(m);
    }
  }

  initSceneAdmin();
  bindLogin();
  bindAdmin();

  const saved = sessionStorage.getItem('glory_admin_token');
  if (saved) { S.token = saved; $('#loginWrap').style.display = 'none'; $('#adminMain').style.display = ''; loadState(); }
})();
