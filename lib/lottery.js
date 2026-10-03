'use strict';
/**
 * 抽奖核心
 * 规则：
 *  1. 按 weight 加权随机（库存为 -1 表示不限量，为 0 表示已抽完）
 *  2. 保底：累计 pitySSR 抽必出传说(SSR)及以上；累计 pityUR 抽必出荣耀(UR)
 *  3. 五连抽保底：若 5 张里没有史诗(SR)及以上，随机替换其中一张
 *  4. 某稀有度全部抽光时自动降级到更低的稀有度池，所有奖品都抽光则拒绝抽奖
 */

const RARITY_ORDER = { ur: 5, ssr: 4, sr: 3, r: 2, n: 1 };

function inStock(p) {
  return p && typeof p.stock === 'number' ? p.stock !== 0 : true;
}

function usable(p) {
  return p && p.weight > 0 && inStock(p);
}

function pickWeighted(list) {
  const total = list.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const p of list) {
    roll -= p.weight;
    if (roll < 0) return p;
  }
  return list[list.length - 1];
}

/** 取某组稀有度中还有货的奖品 */
function poolOf(data, keys) {
  return data.prizes.filter((p) => keys.includes(p.rarity) && usable(p));
}

/** 奖池是否彻底空了 */
function poolEmpty(data) {
  return data.prizes.filter(usable).length === 0;
}

/** 前台公示用的概率表（含 CSS 展示所需的稀有度信息） */
function probabilityTable(data) {
  const all = data.prizes.filter(usable);
  const total = all.reduce((s, p) => s + p.weight, 0) || 1;
  const byRarity = {};
  for (const p of all) {
    byRarity[p.rarity] = (byRarity[p.rarity] || 0) + p.weight;
  }
  const rarities = data.rarities.map((r) => ({
    ...r,
    chance: (((byRarity[r.key] || 0) / total) * 100)
  }));
  const prizes = all.map((p) => ({
    ...p,
    chance: (p.weight / total) * 100,
    soldOut: p.stock === 0
  }));
  return { rarities, prizes, total };
}

/**
 * 单抽
 * @returns {{prize, pityType: string|null, reason: string}}
 */
function drawOnce(data, user, opts = {}) {
  if (poolEmpty(data)) {
    const e = new Error('当前奖池已全部抽完，请等待管理员补充库存');
    e.code = 'EMPTY_POOL';
    throw e;
  }

  const settings = data.settings;
  const nextSSR = user.pitySSR + 1;
  const nextUR = user.pityUR + 1;

  let pool = null;
  let pityType = null;
  let reason = 'normal';

  let urPool = poolOf(data, ['ur']);
  let ssrPool = poolOf(data, ['ssr', 'ur']);

  if (settings.pityUR > 0 && nextUR >= settings.pityUR && urPool.length && !opts.ignorePity) {
    // 只有真的中了 UR 才算消耗，这里直接给
    pool = urPool;
    pityType = 'ur';
    reason = 'pity_ur';
  } else if (settings.pitySSR > 0 && nextSSR >= settings.pitySSR && ssrPool.length && !opts.ignorePity) {
    pool = ssrPool;
    pityType = 'ssr';
    reason = 'pity_ssr';
  } else {
    const all = data.prizes.filter(usable);
    pool = all;
  }

  const prize = pickWeighted(pool);
  if (!prize) {
    const e = new Error('奖品抽取失败，请重试');
    e.code = 'EMPTY_POOL';
    throw e;
  }

  return { prize, pityType, reason };
}

/** 结算：扣库存 + 更新保底计数 */
function settle(data, user, picked) {
  const prize = picked.prize;
  const level = RARITY_ORDER[prize.rarity] || 1;

  if (typeof prize.stock === 'number' && prize.stock > 0) {
    prize.stock -= 1;
  }

  user.totalDraws += 1;
  user.pitySSR += 1;
  user.pityUR += 1;
  if (level >= 4) user.pitySSR = 0; // 出了 SSR/UR 重置
  if (level >= 5) user.pityUR = 0;
  user.lastDrawAt = new Date().toISOString();

  return {
    prize,
    pityType: picked.pityType,
    reason: picked.reason,
    // 本次结果相对传播的辅助信息
    isHigh: level >= 3
  };
}

/**
 * 连抽
 * @param {number} count 1 或 5
 */
function drawBatch(data, user, count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const picked = drawOnce(data, user);
    const r = settle(data, user, picked);
    results.push(r);
  }

  // 五连保底：至少一张 SR 及以上
  if (count >= 5 && data.settings.fiveGuaranteeSR) {
    const hasRare = results.some((r) => (RARITY_ORDER[r.prize.rarity] || 1) >= 3);
    if (!hasRare) {
      const upgradePool = poolOf(data, ['sr', 'ssr', 'ur']);
      if (upgradePool.length) {
        // 把最后一张升级，保留悬念
        const idx = results.length - 1;
        const old = results[idx].prize;
        const upgraded = pickWeighted(upgradePool);
        // 退回旧奖品库存（视为这张没发出去）
        if (typeof old.stock === 'number' && old.stock >= 0) old.stock += 1;
        if (typeof upgraded.stock === 'number' && upgraded.stock > 0) upgraded.stock -= 1;
        const level = RARITY_ORDER[upgraded.rarity] || 1;
        if (level >= 4) user.pitySSR = 0;
        if (level >= 5) user.pityUR = 0;
        results[idx] = {
          prize: upgraded,
          pityType: null,
          reason: 'five_guarantee',
          isHigh: true
        };
      }
    }
  }
  return results;
}

module.exports = {
  drawBatch,
  drawOnce,
  settle,
  probabilityTable,
  poolEmpty,
  RARITY_ORDER
};
