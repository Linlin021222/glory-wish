'use strict';
/**
 * 默认业务数据（首次运行写入 data/db.json）
 * 所有内容后台均可修改，这里只是初始值
 */

const RARITIES = [
  { key: 'ur',  name: '荣耀', short: 'UR',  color: '#ff4d6d', color2: '#ffd76a', glow: '#ff2d55', sort: 5, shard: 'shard-ur' },
  { key: 'ssr', name: '传说', short: 'SSR', color: '#ffc93c', color2: '#ff8a00', glow: '#ff9d00', sort: 4, shard: 'shard-ssr' },
  { key: 'sr',  name: '史诗', short: 'SR',  color: '#b07dff', color2: '#7b5cff', glow: '#8b5cf6', sort: 3, shard: 'shard-sr' },
  { key: 'r',   name: '稀有', short: 'R',   color: '#5ab6ff', color2: '#2b7fff', glow: '#3b82f6', sort: 2, shard: 'shard-r' },
  { key: 'n',   name: '普通', short: 'N',   color: '#9fb0bd', color2: '#6b7b88', glow: '#7d8b96', sort: 1, shard: 'shard-n' }
];

// stock = -1 表示不限量
const PRIZES = [
  { id: 'p_crystal',    name: '荣耀水晶',       desc: '王者峡谷最珍贵的结晶，可兑换典藏皮肤', rarity: 'ur',  weight: 15,   stock: 3,    icon: 'crystal',       tag: '' },
  { id: 'p_legend_skin', name: '传说皮肤自选券', desc: '任选一款传说品质皮肤，永久有效',     rarity: 'ssr', weight: 45,   stock: 8,    icon: 'legend',        tag: '' },
  { id: 'p_coupon_488',  name: '488 点券礼包',   desc: '点券直接到账，够买一套好皮肤',       rarity: 'ssr', weight: 60,   stock: 30,   icon: 'coupon',        tag: '' },
  { id: 'p_epic_box',    name: '史诗皮肤宝箱',   desc: '随机开出一款史诗品质皮肤',           rarity: 'sr',  weight: 120,  stock: 40,   icon: 'chest',         tag: '' },
  { id: 'p_skin_frag',   name: '皮肤碎片 ×20',   desc: '集齐即可兑换心仪皮肤',               rarity: 'sr',  weight: 300,  stock: -1,   icon: 'fragment-skin', tag: '' },
  { id: 'p_hero_frag',   name: '英雄碎片 ×30',   desc: '解锁新英雄的关键材料',               rarity: 'sr',  weight: 380,  stock: -1,   icon: 'fragment-hero', tag: '' },
  { id: 'p_diamond',     name: '钻石 ×100',      desc: '峡谷硬通货，随手可用',               rarity: 'r',   weight: 900,  stock: -1,   icon: 'diamond',       tag: '' },
  { id: 'p_warcowry',    name: '战令币 ×200',    desc: '战令兑换专属道具',                   rarity: 'r',   weight: 800,  stock: -1,   icon: 'warcowry',      tag: '' },
  { id: 'p_coupon_88',   name: '88 点券',        desc: '零花钱虽小，也能凑出惊喜',           rarity: 'r',   weight: 800,  stock: -1,   icon: 'coupon-small',  tag: '' },
  { id: 'p_rose',        name: '亲密玫瑰 ×5',    desc: '送给队友，感情+5',                   rarity: 'n',   weight: 1600, stock: -1,   icon: 'rose',          tag: '' },
  { id: 'p_exp_card',    name: '双倍经验卡',     desc: '三日内经验翻倍，冲分必备',           rarity: 'n',   weight: 1800, stock: -1,   icon: 'exp',           tag: '' },
  { id: 'p_gold',        name: '金币 ×2000',     desc: '最朴实的补给',                       rarity: 'n',   weight: 2180, stock: -1,   icon: 'gold',          tag: '' }
];

const SETTINGS = {
  siteName: '荣耀祈愿',
  subtitle: 'GLORY WISH · 峡谷许愿池',
  notice: '本站为娱乐向抽奖，奖品为虚拟道具，请理性消费。未成年人不参与。',
  exchangeRate: 10,        // 1 元 = 10 代币
  coinUnit: '祈愿币',
  drawOnce: 100,           // 单抽消耗代币 = 10 元
  drawFive: 500,           // 五连抽消耗代币 = 50 元
  drawFiveDiscount: 0,     // 五连额外优惠代币数
  pitySSR: 60,             // 累计 N 抽必出传说及以上
  pityUR: 360,             // 累计 N 抽必出荣耀
  fiveGuaranteeSR: true,   // 五连抽保底至少一张史诗及以上
  pityVisible: true,       // 前台显示保底进度
  poolVisible: true,       // 前台显示奖品概率公示
  maintenance: false,
  maintenanceTip: '奖池正在调整中，稍后开放，请稍候。',
  wechatId: '',            // 微信号，方便用户搜索转账
  payRemarkTip: '转账时请在备注里填写你的邀请码，管理员核对后 1 分钟内到账',
  paymentQR: '',           // 收款码图片 URL，后台上传
  adminPassword: 'admin888',
  welcomeCoins: 0,         // 新用户赠送代币
  // 视觉
  themeScene: 'night',     // night | dusk
  bgmEnabled: true
};

function uid(prefix = 'U') {
  return prefix + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function seed() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    settings: JSON.parse(JSON.stringify(SETTINGS)),
    rarities: JSON.parse(JSON.stringify(RARITIES)),
    prizes: JSON.parse(JSON.stringify(PRIZES)),
    users: {},      // uid -> user
    records: [],    // 抽卡流水
    payments: [],   // 充值订单
    logs: []        // 后台操作日志
  };
}

module.exports = { seed: seed, uid: uid, RARITIES: RARITIES };
