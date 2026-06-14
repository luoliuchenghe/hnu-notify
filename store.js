const fs = require('fs');
const path = require('path');

const SEEN_FILE = path.join(__dirname, 'seen.json');

/**
 * 加载已见过的通知 ID 集合
 */
function loadSeen() {
  try {
    if (fs.existsSync(SEEN_FILE)) {
      const raw = fs.readFileSync(SEEN_FILE, 'utf-8');
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.error('读取 seen.json 失败:', err.message);
  }
  return new Set();
}

/**
 * 保存已见过的通知 ID 集合
 */
function saveSeen(seenSet) {
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenSet], null, 2), 'utf-8');
  } catch (err) {
    console.error('写入 seen.json 失败:', err.message);
  }
}

/**
 * 为一条通知生成唯一 ID（基于链接去重）
 */
function getItemId(item) {
  return item.link;
}

/**
 * 过滤出新的（未曾见过的）通知
 * @param {Array} items - 当前抓取到的通知列表
 * @returns {{ newItems: Array, allSeen: Set }}
 */
function filterNew(items) {
  const seen = loadSeen();
  const newItems = [];

  for (const item of items) {
    const id = getItemId(item);
    if (!seen.has(id)) {
      newItems.push(item);
      seen.add(id);
    }
  }

  return { newItems, allSeen: seen };
}

/**
 * 更新 seen.json（将本次所有抓取到的通知标记为已见）
 */
function markAllSeen(items) {
  const seen = loadSeen();
  for (const item of items) {
    seen.add(getItemId(item));
  }
  saveSeen(seen);
}

module.exports = { loadSeen, saveSeen, filterNew, markAllSeen, getItemId };
