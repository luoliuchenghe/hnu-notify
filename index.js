/**
 * 湖南大学通知推送程序
 * 
 * 每天定时抓取4个通知源，发现新通知后通过邮件推送。
 * 
 * 使用方式：
 *   手动运行： node index.js
 *   定时运行： 通过 Windows 任务计划程序每天执行一次
 */

require('dotenv').config();

const store = require('./store');
const { sendNotification } = require('./notifier');
const { analyze } = require('./analyzer');

// 日期过滤：只保留 2026年6月15日 之后的通知
const MIN_DATE = new Date('2026-06-15');

function parseDate(dateStr) {
  if (!dateStr) return null;
  // 支持格式: 2025/07/18, 2026-06-12, 2026/06/09
  const cleaned = dateStr.replace(/\//g, '-');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function filterByDate(items) {
  return items.filter(item => {
    const d = parseDate(item.date);
    if (!d) return true; // 无日期的保留（可能是当天新发的）
    return d >= MIN_DATE;
  });
}

// 所有抓取器
const scrapers = [
  require('./scrapers/hnu-main'),
  require('./scrapers/jwc'),
  require('./scrapers/gra'),
  require('./scrapers/xgb'),
];

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(50));
  console.log('📡 湖南大学通知抓取程序');
  console.log(`🕐 ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(50));

  const allItems = [];

  // 1. 抓取所有来源（失败自动重试2次，共3次机会）
  for (const scraper of scrapers) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`\n🔍 正在抓取: ${scraper.SOURCE.name}${attempt > 1 ? ` (第${attempt}次重试)` : ''}`);
        const items = await scraper.scrape();
        console.log(`   ✔ 获取到 ${items.length} 条通知`);
        allItems.push(...items);
        break;
      } catch (err) {
        const errDetail = err.code ? ` (${err.code})` : err.message ? '' : ' (无响应)';
        if (attempt < 3) {
          console.warn(`   ⚠ 第${attempt}次失败: ${err.message || '连接超时'}${errDetail}，2秒后重试...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.error(`   ❌ 抓取失败: ${err.message || '连接超时'}${errDetail}`);
        }
      }
    }
  }

  console.log(`\n📊 共抓取到 ${allItems.length} 条通知（全部来源）`);

  // 2. 按日期过滤：只保留 2026年6月15日 之后的通知
  const filteredByDate = filterByDate(allItems);
  const filteredCount = allItems.length - filteredByDate.length;
  console.log(`📅 日期过滤: 移除 ${filteredCount} 条旧通知，保留 ${filteredByDate.length} 条`);

  // 3. 过滤出新通知（去重）
  const { newItems, allSeen } = store.filterNew(filteredByDate);

  if (newItems.length === 0) {
    console.log('\n✅ 没有新通知，无需发送邮件');
    // 仍然保存所有通知到 seen.json，避免重复检查
    store.markAllSeen(allItems);
    console.log('💾 已更新 seen.json');
    return;
  }

  console.log(`\n🆕 发现 ${newItems.length} 条新通知:`);
  for (const item of newItems) {
    console.log(`   · [${item.source}] ${item.title} (${item.date || '日期未知'})`);
  }

  // 4. AI 读取正文并总结关键信息
  console.log('\n🤖 AI 正在读取通知内容并总结...');
  const aiHtml = await analyze(newItems);

  // 5. 发送邮件通知
  console.log('\n📧 正在发送邮件...');
  const sent = await sendNotification(newItems, aiHtml);

  if (sent) {
    // 6. 标记为已见
    store.markAllSeen(allItems);
    console.log('💾 已更新 seen.json');
    console.log('\n✅ 任务完成！');
  } else {
    console.log('\n⚠️  邮件发送失败，通知将在下次运行时重新尝试');
  }
}

main().catch((err) => {
  console.error('❌ 程序异常:', err);
  process.exit(1);
});
