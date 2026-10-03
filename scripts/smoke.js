/* 冒烟测试：创建用户 -> 后台加币 -> 单抽/五连抽 -> 充值审核 -> 概率校验 */
const BASE = process.env.BASE || 'http://localhost:3111';

async function api(path, body, token) {
  const opt = { headers: { 'Content-Type': 'application/json' } };
  if (body) { opt.method = 'POST'; opt.body = JSON.stringify(body); }
  if (token) opt.headers['x-admin-token'] = token;
  const r = await fetch(BASE + path, opt);
  return r.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; } else { console.log('  ✓ ' + msg); }
}

(async () => {
  console.log('\n[1] 创建用户');
  const u = await api('/api/user/init', { nick: '测试员' });
  assert(u.ok && u.user.uid, '用户创建成功 ' + (u.user || {}).uid);

  console.log('\n[2] 后台登录');
  const login = await api('/api/admin/login', { password: 'wrong' });
  assert(!login.ok, '错误密码被拒绝');
  const admin = await api('/api/admin/login', { password: 'admin888' });
  assert(admin.ok && admin.token, '正确密码登录成功');

  console.log('\n[3] 后台发放代币');
  const adj = await api('/api/admin/adjust', { uid: u.user.uid, delta: 15000 }, admin.token);
  assert(adj.ok && adj.user.coins === 10000, '代币发放 -> ' + adj.user.coins);

  console.log('\n[4] 单抽 x 1');
  const d1 = await api('/api/draw', { uid: u.user.uid, sig: u.sig, count: 1 });
  assert(d1.ok && d1.results.length === 1, '返回 1 个结果：' + d1.results.map((r) => r.rarityShort + ' ' + r.name).join(', '));
  assert(d1.ok && d1.coins === 10000 - d1.cost, `扣费正确 cost=${d1.cost} 余额=${d1.coins}`);

  console.log('\n[5] 五连抽 x 20 轮（校验保底与库存扣减）');
  let urSeen = 0, fiveNoSR = 0, total = 0;
  for (let i = 0; i < 20; i++) {
    await sleep(300); // 服务端有防连点节流
    const r = await api('/api/draw', { uid: u.user.uid, sig: u.sig, count: 5 });
    if (!r.ok) { console.error('  ✗ 第' + (i + 1) + '轮失败: ' + r.msg); process.exitCode = 1; break; }
    const rates = r.results.map((x) => x.rarityShort);
    if (r.results.some((x) => x.rarity === 'ur')) urSeen++;
    if (!r.results.some((x) => ['sr', 'ssr', 'ur'].includes(x.rarity))) fiveNoSR++;
    total += 5;
    if (i < 3) console.log(`     第${i + 1}轮：` + rates.join(' '));
  }
  assert(fiveNoSR === 0, '每轮五连都至少有一张 SR+');
  console.log(`     共 ${total} 抽，荣耀水晶出现于 ${urSeen} 轮`);

  console.log('\n[6] 余额不足保护');
  const poor = await api('/api/user/init', { nick: '穷光蛋' });
  const nobal = await api('/api/draw', { uid: poor.user.uid, sig: poor.sig, count: 1 });
  assert(!nobal.ok && nobal.code === 'NO_COIN', '无余额抽奖被拦截：' + nobal.msg);

  console.log('\n[7] 充值 -> 后台放行');
  const pay = await api('/api/recharge', { uid: poor.user.uid, sig: poor.sig, amount: 50 });
  assert(pay.ok && pay.payment.status === 'pending', '充值申请已提交，获得 ' + pay.payment.coins + ' 币待放行');
  const app = await api('/api/admin/payment', { id: pay.payment.id, action: 'approve' }, admin.token);
  assert(app.ok && app.user.coins === pay.payment.coins, '放行后余额 = ' + app.user.coins);
  const dup = await api('/api/admin/payment', { id: pay.payment.id, action: 'approve' }, admin.token);
  assert(!dup.ok, '重复放行被拒绝');

  console.log('\n[8] 用充值来的币抽奖');
  const d2 = await api('/api/draw', { uid: poor.user.uid, sig: poor.sig, count: 5 });
  assert(d2.ok && d2.coins === pay.payment.coins - d2.cost, '扣除正确，余额 ' + d2.coins);

  console.log('\n[9] 概率与库存');
  const cfg = await api('/api/config');
  const sum2 = cfg.prizes.reduce((s, p) => s + p.chance, 0);
  assert(Math.abs(sum2 - 100) < 0.01, '概率总和 = ' + sum2.toFixed(2) + '%');
  const crystal = cfg.prizes.find((p) => p.id === 'p_crystal');
  assert(crystal && crystal.name === '荣耀水晶', '库存：荣耀水晶 ' + (crystal.stock === 0 ? '已抽完' : '剩 ' + crystal.stock));

  console.log('\n[10] 伪造身份防护');
  const fake = await api('/api/draw', { uid: u.user.uid, sig: 'hacker', count: 1 });
  assert(!fake.ok && fake.code === 'NO_USER', '伪造签名被拒绝');

  console.log('\n[11] 未授权访问后台');
  const noAuth = await api('/api/admin/state', null, 'bad-token');
  assert(!noAuth.ok && noAuth.code === 'NO_AUTH', '无效 token 被拒绝');
  const st = await api('/api/admin/state', null, admin.token);
  assert(st.ok && st.prizes.length === 12 && st.stats.userCount >= 2, `后台可读取：${st.prizes.length} 个奖品 / ${st.stats.userCount} 位用户 / ${st.stats.drawCount} 条记录`);

  console.log('\n[12] 保底机制（连续单抽，检查是否永远不超过保底阈值）');
  const pityUser = await api('/api/user/init', { nick: '保底测试' });
  await api('/api/admin/adjust', { uid: pityUser.user.uid, delta: 20000 }, admin.token);
  let streak = 0, maxStreak = 0, ssrCount = 0;
  for (let i = 0; i < 100; i++) {
    await sleep(260);
    const r = await api('/api/draw', { uid: pityUser.user.uid, sig: pityUser.sig, count: 1 });
    if (!r.ok) { console.log('     预算用完，在 ' + i + ' 抽停止'); break; }
    const lvl = { n: 1, r: 2, sr: 3, ssr: 4, ur: 5 }[r.results[0].rarity];
    if (lvl >= 4) { ssrCount++; streak = 0; } else { streak++; maxStreak = Math.max(maxStreak, streak); }
  }
  console.log(`     100 抽内传说+ ${ssrCount} 次，最长未出传说连续 ${maxStreak} 抽`);
  assert(ssrCount > 0, '保底/概率至少产出过传说及以上');
  assert(maxStreak < 60, '未出传说的连续抽数始终小于 60（保底阈值）');

  console.log('\n全部测试跑完\n');
})();
