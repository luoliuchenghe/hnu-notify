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

  // 1. 抓取所有来源（失败自动重试1次）
  for (const scraper of scrapers) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`\n🔍 正在抓取: ${scraper.SOURCE.name}${attempt > 1 ? ` (第${attempt}次重试)` : ''}`);
        const items = await scraper.scrape();
        console.log(`   ✔ 获取到 ${items.length} 条通知`);
        allItems.push(...items);
        break; // 成功则跳出重试循环
      } catch (err) {
        if (attempt < 2) {
          console.warn(`   ⚠ 第${attempt}次失败: ${err.message}，1秒后重试...`);
          await new Promise(r => setTimeout(r, 1000));
        } else {
          console.error(`   ❌ 抓取失败: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n📊 共抓取到 ${allItems.length} 条通知（全部来源）`);

  // 2. 过滤出新通知
  const { newItems, allSeen } = store.filterNew(allItems);

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

  // 3. AI 分析分类
  console.log('\n🤖 AI 分析中...');
  const aiHtml = await analyze(newItems);

  // 4. 发送邮件通知
  console.log('\n📧 正在发送邮件...');
  const sent = await sendNotification(newItems, aiHtml);

  if (sent) {
    // 5. 标记为已见
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
