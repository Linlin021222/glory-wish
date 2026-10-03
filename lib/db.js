'use strict';
/**
 * 极简 JSON 持久化层
 * - 全部数据常驻内存，读写都走这个模块
 * - 写入做了节流 + 临时文件 rename，避免多人同时抽奖时写坏 db.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const { seed } = require('./seed');

let data = null;
let flushTimer = null;
let writing = false;
let dirty = false;

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function load() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(raw);
      // 补齐历史版本缺失字段，保证升级不炸
      data = Object.assign({}, seed(), data);
      if (!data.prizes) data.prizes = seed().prizes;
      if (!data.rarities) data.rarities = seed().rarities;
      if (!data.settings) data.settings = seed().settings;
      if (!data.users) data.users = {};
      if (!data.records) data.records = [];
      if (!data.payments) data.payments = [];
      if (!data.logs) data.logs = [];
      return data;
    } catch (e) {
      console.error('[db] 读取失败，使用种子数据并备份损坏文件：', e.message);
      try {
        fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, `broken-${Date.now()}.json`));
      } catch (_) {}
    }
  }
  data = seed();
  saveNow();
  return data;
}

function get() {
  if (!data) load();
  return data;
}

function saveNow() {
  try {
    const tmp = path.join(DATA_DIR, `.db.${process.pid}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
    dirty = false;
  } catch (e) {
    console.error('[db] 写入失败：', e.message);
  }
}

/** 节流保存：300ms 内的多次修改合并成一次写盘 */
function touch() {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (dirty && !writing) saveNow();
  }, 300);
}

process.on('SIGINT', () => {
  if (dirty) saveNow();
  process.exit(0);
});

module.exports = { get: get, touch: touch, load: load, saveNow: saveNow, clone: deepClone };
