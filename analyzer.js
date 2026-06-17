const { fetchContent } = require('./contentFetcher');

/**
 * 读取通知正文并用 AI 总结关键信息
 * @param {Array} items - 新通知列表
 * @returns {Promise<string>} 总结 HTML
 */
async function analyze(items) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('   ⚠ 未配置 DEEPSEEK_API_KEY');
    return '';
  }

  // 1. 逐条抓取正文
  console.log(`   📄 正在读取 ${items.length} 条通知的正文...`);
  const contents = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    process.stdout.write(`   ⏳ [${i + 1}/${items.length}] ${item.title.slice(0, 30)}... `);
    const body = await fetchContent(item.link);
    contents.push({
      title: item.title,
      date: item.date,
      source: item.source,
      body: body.slice(0, 2000), // 每条最多 2000 字
    });
    console.log(`✓ (${body.length}字)`);
  }

  // 2. 交给 AI 总结
  console.log('   🤖 AI 正在总结关键信息...');

  const itemsText = contents.map((c, i) =>
    `【通知${i + 1}】\n标题: ${c.title}\n来源: ${c.source}\n日期: ${c.date || '未知'}\n正文: ${c.body}`
  ).join('\n\n');

  // 截断防止超过 token 限制
  const maxLen = 14000;
  const promptText = itemsText.length > maxLen
    ? itemsText.slice(0, maxLen) + '\n\n...(因篇幅限制，部分通知内容已省略)...'
    : itemsText;

  const prompt = `你是一个湖南大学的通知信息提取助手。请阅读以下通知内容，提取每一条的关键信息。

要求：
1. 对每条通知，用 1-3 句话概括：**谁**（面向对象）、**什么事**、**截止时间/注意事项**
2. 按重要性排序，最紧急/重要的放前面
3. 用简洁的中文，每条约 50-100 字
4. 如果正文无法获取，就根据标题合理推断

通知内容：
${promptText}

请按以下格式输出：

**⭐ 重点关注**
1. [标题] - 关键信息总结（截止时间/注意事项）

**📋 完整列表**
1. [标题]（来源）- 关键信息总结
2. ...`;

  try {
    const axios = require('axios');
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个简洁准确的信息提取助手。只输出要求的内容，不要额外解释。对于无法获取正文的通知，根据标题合理推断。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const result = response.data.choices[0].message.content.trim();
    console.log(`   ✅ AI 总结完成 (${result.length} 字符)`);
    return formatAsHtml(result);
  } catch (err) {
    console.error(`   ❌ AI 总结失败: ${err.message}`);
    return '';
  }
}

function formatAsHtml(markdown) {
  let html = markdown
    // 标题行（以 ** 开头）
    .replace(/^\*\*(.+)\*\*$/gm, '<h3 style="margin:14px 0 8px;font-size:15px;color:#B5121B;">$1</h3>')
    // 编号列表项
    .replace(/^(\d+)\.\s*\[(.+?)\]\s*-\s*(.+)$/gm,
      '<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;"><strong style="color:#333;">$1. $2</strong><br><span style="color:#555;font-size:13px;">$3</span></div>')
    // 普通列表项
    .replace(/^- (.+)$/gm, '<div style="padding:4px 0;font-size:13px;color:#555;">• $1</div>')
    // 未匹配的段落
    .replace(/^([^<\n].{10,})$/gm, '<p style="margin:6px 0;font-size:13px;color:#555;">$1</p>')
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return html;
}

module.exports = { analyze };
