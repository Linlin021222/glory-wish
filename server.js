'use strict';
/**
 * 荣耀祈愿 · 服务端
 * 只依赖 express，数据落 data/db.json
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const db = require('./lib/db');
const lottery = require('./lib/lottery');
const { uid: genUid } = require('./lib/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));

const data = db.get();

/* ---------------- 工具 ---------------- */

const NICK_PREFIX = ['峡谷', '荣耀', '深渊', '星辰', '逐风', '烈阳', '寒月', '青锋', '破晓', '孤影'];
const NICK_SUFFIX = ['旅人', '剑客', '法师', '游侠', '射手', '铁卫', '吟游者', '占星师', '守夜人', '裁决者'];

function randNick() {
  const a = NICK_PREFIX[Math.floor(Math.random() * NICK_PREFIX.length)];
  const b = NICK_SUFFIX[Math.floor(Math.random() * NICK_SUFFIX.length)];
  return a + b + Math.floor(Math.random() * 900 + 100);
}

function nowISO() {
  return new Date().toISOString();
}

function ok(res, payload = {}) {
  res.json({ ok: true, ...payload });
}

function fail(res, code, msg, status = 400) {
  res.status(status).json({ ok: false, code, msg });
}

function getUser(uid, sig) {
  const u = data.users[uid];
  if (!u) return null;
  if (sig && u.sig !== sig) return null;
  return u;
}

function publicUser(u) {
  return {
    uid: u.uid,
    nick: u.nick,
    coins: u.coins,
    totalDraws: u.totalDraws,
    pitySSR: u.pitySSR,
    pityUR: u.pityUR,
    inviteCode: u.uid,
    createdAt: u.createdAt
  };
}

function publicSettings(s) {
  return {
    siteName: s.siteName,
    subtitle: s.subtitle,
    notice: s.notice,
    exchangeRate: s.exchangeRate,
    coinUnit: s.coinUnit,
    drawOnce: s.drawOnce,
    drawFive: s.drawFive,
    drawFiveDiscount: s.drawFiveDiscount,
    pitySSR: s.pitySSR,
    pityUR: s.pityUR,
    fiveGuaranteeSR: s.fiveGuaranteeSR,
    pityVisible: s.pityVisible,
    poolVisible: s.poolVisible,
    maintenance: s.maintenance,
    maintenanceTip: s.maintenanceTip,
    wechatId: s.wechatId,
    payRemarkTip: s.payRemarkTip,
    paymentQR: s.paymentQR,
    welcomeCoins: s.welcomeCoins,
    themeScene: s.themeScene,
    bgmEnabled: s.bgmEnabled
  };
}

const rarityMap = () => {
  const m = {};
  data.rarities.forEach((r) => (m[r.key] = r));
  return m;
};

function decorateResult(r) {
  const rm = rarityMap();
  const meta = rm[r.prize.rarity] || rm.n;
  return {
    id: r.prize.id,
    name: r.prize.name,
    desc: r.prize.desc,
    icon: r.prize.icon,
    tag: r.prize.tag,
    rarity: r.prize.rarity,
    rarityName: meta.name,
    rarityShort: meta.short,
    color: meta.color,
    color2: meta.color2,
    glow: meta.glow,
    sort: meta.sort,
    reason: r.reason,
    pityType: r.pityType,
    newItem: true
  };
}

function logAdmin(action, detail) {
  data.logs.unshift({ id: genUid('L'), action, detail, at: nowISO() });
  if (data.logs.length > 300) data.logs.length = 300;
  db.touch();
}

/* ---------------- 后台鉴权 ---------------- */

const adminTokens = new Map(); // token -> expireAt

function checkToken(token) {
  if (!token || !adminTokens.has(token)) return false;
  if (adminTokens.get(token) < Date.now()) { adminTokens.delete(token); return false; }
  return true;
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || (req.body && req.body.token);
  if (!checkToken(token)) return fail(res, 'NO_AUTH', '登录已失效，请重新登录', 401);
  next();
}

/** 允许通过 ?token= 鉴权（用于浏览器直接下载导出文件） */
function requireAdminQuery(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!checkToken(token)) return fail(res, 'NO_AUTH', '登录已失效，请重新登录', 401);
  next();
}

/* ---------------- 用户接口 ---------------- */

app.post('/api/user/init', (req, res) => {
  const nick = (req.body && (req.body.nick || '')).toString().trim() || randNick();
  const uid = genUid('U');
  const user = {
    uid,
    nick: nick.slice(0, 16),
    sig: crypto.randomBytes(12).toString('hex'),
    coins: Number(data.settings.welcomeCoins) || 0,
    totalDraws: 0,
    pitySSR: 0,
    pityUR: 0,
    createdAt: nowISO(),
    blocked: false
  };
  data.users[uid] = user;
  db.touch();
  ok(res, { user: publicUser(user), sig: user.sig });
});

app.post('/api/user/login', (req, res) => {
  // 用邀请码（= uid）换设备 / 找回账号
  const code = ((req.body && req.body.code) || '').toString().trim().toUpperCase();
  const u = data.users[code];
  if (!u) return fail(res, 'NO_USER', '邀请码不存在，请检查是否输入正确');
  ok(res, { user: publicUser(u), sig: u.sig });
});

app.post('/api/user/rename', (req, res) => {
  const u = getUser(req.body.uid, req.body.sig);
  if (!u) return fail(res, 'NO_USER', '账号无效，请刷新页面重试');
  const nick = (req.body.nick || '').toString().trim().slice(0, 16);
  if (!nick) return fail(res, 'BAD_NICK', '昵称不能为空');
  u.nick = nick;
  db.touch();
  ok(res, { user: publicUser(u) });
});

app.get('/api/config', (req, res) => {
  const table = lottery.probabilityTable(data);
  ok(res, {
    settings: publicSettings(data.settings),
    rarities: table.rarities,
    prizes: table.prizes
  });
});

app.get('/api/my', (req, res) => {
  const u = getUser(req.query.uid, req.query.sig);
  if (!u) return fail(res, 'NO_USER', '账号无效');
  const records = data.records.filter((r) => r.uid === u.uid).slice(0, 60);
  const payments = data.payments.filter((p) => p.uid === u.uid).slice(0, 30);
  ok(res, { user: publicUser(u), records, payments });
});

app.get('/api/feed', (req, res) => {
  const rm = rarityMap();
  const feed = data.records
    .filter((r) => (rm[r.rarity] && rm[r.rarity].sort) >= 3)
    .slice(0, 24)
    .map((r) => ({
      nick: r.nick,
      name: r.name,
      rarity: r.rarity,
      rarityName: (rm[r.rarity] || {}).name,
      color: (rm[r.rarity] || {}).color,
      at: r.at
    }));
  ok(res, { feed });
});

const drawThrottle = new Map();

app.post('/api/draw', (req, res) => {
  const u = getUser(req.body.uid, req.body.sig);
  if (!u) return fail(res, 'NO_USER', '账号无效，请刷新页面重试');
  if (u.blocked) return fail(res, 'BLOCKED', '账号已被管理员暂停抽奖');

  const s = data.settings;
  if (s.maintenance) return fail(res, 'MAINTAIN', s.maintenanceTip || '奖池维护中');

  const count = req.body.count === 5 ? 5 : 1;
  const cost = count === 5 ? Math.max(0, Number(s.drawFive) - Number(s.drawFiveDiscount || 0)) : Number(s.drawOnce) * count;

  if (u.coins < cost) {
    return fail(res, 'NO_COIN', `余额不足，本次需要 ${cost} ${s.coinUnit}，当前 ${u.coins} ${s.coinUnit}`);
  }

  const last = drawThrottle.get(u.uid) || 0;
  if (Date.now() - last < 250) return fail(res, 'TOO_FAST', '手速太快啦，缓一缓');
  drawThrottle.set(u.uid, Date.now());

  let results;
  try {
    results = lottery.drawBatch(data, u, count);
  } catch (e) {
    return fail(res, e.code || 'ERR', e.message);
  }

  u.coins -= cost;

  const decorated = results.map(decorateResult);
  const stamp = nowISO();
  for (const r of decorated) {
    data.records.unshift({
      id: genUid('R'),
      uid: u.uid,
      nick: u.nick,
      prizeId: r.id,
      name: r.name,
      rarity: r.rarity,
      icon: r.icon,
      cost: Math.round(cost / count),
      at: stamp
    });
  }
  if (data.records.length > 5000) data.records.length = 5000;

  db.touch();

  ok(res, {
    results: decorated,
    coins: u.coins,
    cost,
    count,
    user: publicUser(u)
  });
});

app.post('/api/recharge', (req, res) => {
  const u = getUser(req.body.uid, req.body.sig);
  if (!u) return fail(res, 'NO_USER', '账号无效，请刷新页面重试');
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0 || amount > 5000) return fail(res, 'BAD_AMOUNT', '请填写 1 ~ 5000 之间的金额');

  let proof = '';
  if (req.body.proof && typeof req.body.proof === 'string' && req.body.proof.startsWith('data:image')) {
    const m = req.body.proof.match(/^data:image\/(\w+);base64,/);
    if (m) {
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const fname = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      try {
        fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(req.body.proof.split(',')[1], 'base64'));
        proof = `/uploads/${fname}`;
      } catch (e) {
        console.error('保存凭证失败', e.message);
      }
    }
  }

  const rate = Number(data.settings.exchangeRate) || 10;
  const pay = {
    id: genUid('P'),
    uid: u.uid,
    nick: u.nick,
    amount,
    coins: Math.round(amount * rate),
    remark: (req.body.remark || '').toString().slice(0, 40),
    proof,
    status: 'pending', // pending | approved | rejected
    at: nowISO(),
    handledAt: ''
  };
  data.payments.unshift(pay);
  db.touch();
  ok(res, { payment: pay, tip: '已提交，等待管理员核对后自动到账' });
});

/* ---------------- 后台接口 ---------------- */

app.post('/api/admin/login', (req, res) => {
  const pw = (req.body.password || '').toString();
  if (pw !== data.settings.adminPassword) return fail(res, 'BAD_PW', '管理员密码错误', 401);
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, Date.now() + 12 * 3600 * 1000);
  logAdmin('登录后台', '管理员登录');
  ok(res, { token, expiresIn: 12 * 3600 });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  adminTokens.delete(req.headers['x-admin-token']);
  ok(res, {});
});

app.get('/api/admin/state', requireAdmin, (req, res) => {
  const table = lottery.probabilityTable(data);
  const users = Object.values(data.users);
  const approved = data.payments.filter((p) => p.status === 'approved');
  const stats = {
    userCount: users.length,
    drawCount: data.records.length,
    coinsIssued: users.reduce((s, u) => s + Math.max(0, u.coins), 0),
    payApproved: approved.reduce((s, p) => s + p.amount, 0),
    payPending: data.payments.filter((p) => p.status === 'pending').length,
    rarityCount: data.records.reduce((acc, r) => {
      acc[r.rarity] = (acc[r.rarity] || 0) + 1;
      return acc;
    }, {})
  };
  ok(res, {
    settings: data.settings,
    rarities: table.rarities,
    prizes: data.prizes,
    users: users.map((u) => ({ ...publicUser(u), blocked: u.blocked })),
    records: data.records.slice(0, 200),
    payments: data.payments.slice(0, 200),
    logs: data.logs.slice(0, 60),
    stats
  });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const body = req.body.settings || req.body;
  const s = data.settings;
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);

  s.siteName = String(body.siteName || s.siteName).slice(0, 30);
  s.subtitle = String(body.subtitle || s.subtitle).slice(0, 40);
  s.notice = String(body.notice || s.notice).slice(0, 200);
  s.exchangeRate = Math.max(1, num(body.exchangeRate, s.exchangeRate));
  s.coinUnit = String(body.coinUnit || s.coinUnit).slice(0, 10);
  s.drawOnce = Math.max(1, num(body.drawOnce, s.drawOnce));
  s.drawFive = Math.max(1, num(body.drawFive, s.drawFive));
  s.drawFiveDiscount = Math.max(0, num(body.drawFiveDiscount, s.drawFiveDiscount));
  s.pitySSR = Math.max(0, num(body.pitySSR, s.pitySSR));
  s.pityUR = Math.max(0, num(body.pityUR, s.pityUR));
  s.fiveGuaranteeSR = bool(body.fiveGuaranteeSR, s.fiveGuaranteeSR);
  s.pityVisible = bool(body.pityVisible, s.pityVisible);
  s.poolVisible = bool(body.poolVisible, s.poolVisible);
  s.maintenance = bool(body.maintenance, s.maintenance);
  s.maintenanceTip = String(body.maintenanceTip || s.maintenanceTip).slice(0, 100);
  s.wechatId = String(body.wechatId || s.wechatId).slice(0, 40);
  s.payRemarkTip = String(body.payRemarkTip || s.payRemarkTip).slice(0, 100);
  if (body.paymentQR !== undefined) s.paymentQR = String(body.paymentQR).slice(0, 300);
  s.welcomeCoins = Math.max(0, num(body.welcomeCoins, s.welcomeCoins));
  s.themeScene = String(body.themeScene || s.themeScene);
  s.bgmEnabled = bool(body.bgmEnabled, s.bgmEnabled);
  if (body.adminPassword) s.adminPassword = String(body.adminPassword).slice(0, 60);

  db.touch();
  logAdmin('保存设置', '修改了站点 / 抽奖 / 概率规则');
  ok(res, { settings: publicSettings(s) });
});

app.post('/api/admin/prizes', requireAdmin, (req, res) => {
  const list = req.body.prizes;
  if (!Array.isArray(list)) return fail(res, 'BAD_DATA', '奖品列表格式错误');
  const validKeys = new Set(data.rarities.map((r) => r.key));
  const seen = new Set();
  const cleaned = list.map((p, i) => {
    let id = String(p.id || '').trim() || 'p_' + Date.now().toString(36) + i;
    while (seen.has(id)) id = id + '_' + i;
    seen.add(id);
    return {
      id,
      name: String(p.name || '未命名奖品').slice(0, 30),
      desc: String(p.desc || '').slice(0, 60),
      rarity: validKeys.has(p.rarity) ? p.rarity : 'n',
      weight: Math.max(0, Number(p.weight) || 0),
      stock: p.stock === -1 || p.stock === '-1' ? -1 : Math.max(0, Number(p.stock) || 0),
      icon: String(p.icon || 'gold').slice(0, 30),
      tag: String(p.tag || '').slice(0, 12)
    };
  });
  const totalWeight = cleaned.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return fail(res, 'BAD_WEIGHT', '至少需要一个权重大于 0 的奖品');

  data.prizes = cleaned;
  db.touch();
  logAdmin('保存奖池', `奖品 ${cleaned.length} 项，总权重 ${totalWeight}`);
  const table = lottery.probabilityTable(data);
  ok(res, { prizes: table.prizes, rarities: table.rarities });
});

app.post('/api/admin/payment', requireAdmin, (req, res) => {
  const { id, action } = req.body;
  const p = data.payments.find((x) => x.id === id);
  if (!p) return fail(res, 'NO_PAY', '订单不存在');
  if (p.status !== 'pending') return fail(res, 'DONE', '该订单已处理');

  if (action === 'approve') {
    const u = data.users[p.uid];
    if (!u) return fail(res, 'NO_USER', '下单账号不存在，无法发放');
    u.coins += p.coins;
    p.status = 'approved';
    p.handledAt = nowISO();
    logAdmin('充值放行', `${u.nick} +${p.coins}（¥${p.amount}）`);
  } else if (action === 'reject') {
    p.status = 'rejected';
    p.handledAt = nowISO();
    logAdmin('充值驳回', `${p.nick} ¥${p.amount}`);
  } else {
    return fail(res, 'BAD_ACTION', '未知操作');
  }
  db.touch();
  ok(res, { payment: p, user: data.users[p.uid] ? publicUser(data.users[p.uid]) : null });
});

app.post('/api/admin/adjust', requireAdmin, (req, res) => {
  const u = data.users[req.body.uid];
  if (!u) return fail(res, 'NO_USER', '用户不存在');
  const delta = Math.round(Number(req.body.delta) || 0);
  if (!delta) return fail(res, 'BAD_DELTA', '调整数量不能为 0');
  u.coins = Math.max(0, u.coins + delta);
  db.touch();
  logAdmin('调整代币', `${u.nick} ${delta > 0 ? '+' : ''}${delta} ${data.settings.coinUnit}`);
  ok(res, { user: publicUser(u) });
});

app.post('/api/admin/user/block', requireAdmin, (req, res) => {
  const u = data.users[req.body.uid];
  if (!u) return fail(res, 'NO_USER', '用户不存在');
  u.blocked = !u.blocked;
  db.touch();
  logAdmin(u.blocked ? '封禁用户' : '解封用户', u.nick);
  ok(res, { user: { ...publicUser(u), blocked: u.blocked } });
});

app.post('/api/admin/user/resetpity', requireAdmin, (req, res) => {
  const u = data.users[req.body.uid];
  if (!u) return fail(res, 'NO_USER', '用户不存在');
  u.pitySSR = 0;
  u.pityUR = 0;
  db.touch();
  logAdmin('重置保底', u.nick);
  ok(res, { user: publicUser(u) });
});

app.post('/api/admin/restock', requireAdmin, (req, res) => {
  // 一键把所有奖品恢复为不限量 / 指定数量
  const val = req.body.value === undefined ? -1 : Number(req.body.value);
  data.prizes.forEach((p) => (p.stock = val));
  db.touch();
  logAdmin('批量补货', `全部奖品库存 -> ${val}`);
  ok(res, { prizes: data.prizes });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  const { base64, name } = req.body;
  if (!base64 || !base64.startsWith('data:image')) return fail(res, 'BAD_FILE', '请选择图片文件');
  const m = base64.match(/^data:image\/(\w+);base64,/);
  const ext = (m ? m[1] : 'png').replace('jpeg', 'jpg');
  const fname = `${name || 'img'}_${Date.now()}.${ext}`;
  try {
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), Buffer.from(base64.split(',')[1], 'base64'));
  } catch (e) {
    return fail(res, 'ERR', '保存失败：' + e.message);
  }
  ok(res, { url: `/uploads/${fname}` });
});

app.get('/api/admin/export', requireAdminQuery, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename=glory-db-${new Date().toISOString().slice(0, 10)}.json`);
  res.json(data);
});

app.post('/api/admin/clearfeed', requireAdmin, (req, res) => {
  data.records = [];
  db.touch();
  logAdmin('清空抽卡记录', '');
  ok(res, {});
});

/* ---------------- 静态资源 ---------------- */

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});
app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return fail(res, 'NOT_FOUND', '接口不存在', 404);
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ ok: false, code: 'SERVER_ERR', msg: '服务器内部错误' });
});

if (require.main === module) {
  const bind = process.env.HOST || '0.0.0.0';
  app.listen(PORT, bind, () => {
    console.log(`\n  荣耀祈愿 已启动`);
    console.log(`  前台抽奖： http://localhost:${PORT}/`);
    console.log(`  管理后台： http://localhost:${PORT}/admin  （默认密码 admin888）\n`);
  });
}

module.exports = app;
