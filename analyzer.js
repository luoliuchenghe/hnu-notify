const axios = require('axios');

/**
 * 用 DeepSeek AI 对通知进行分类和总结
 * @param {Array} items - 新通知列表
 * @returns {Promise<string>} 分析结果 HTML
 */
async function analyze(items) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('   ⚠ 未配置 DEEPSEEK_API_KEY，跳过 AI 分析');
    return '<p style="color:#999;">（AI 分析未启用）</p>';
  }

  // 构建要分析的通知文本（太长就截断）
  const itemsText = items.map((item, i) =>
    `${i + 1}. [${item.source}] ${item.title} (${item.date || '日期未知'})`
  ).join('\n');

  if (itemsText.length > 12000) {
    // 截断到前 5000 字符 + 后 5000 字符
    const head = itemsText.slice(0, 6000);
    const tail = itemsText.slice(-4000);
    itemsText.value = head + '\n...（中间省略）...\n' + tail;
  }

  const prompt = `你是一个湖南大学的通知分类助手。请对以下通知进行分类总结，按类别分组输出。

通知列表：
${itemsText}

请按以下格式输出（用 Markdown）：

**📊 今日概览**：共 X 条通知，涉及 N 个类别

**📚 教学教务**（选课、考试、毕业等）
- 标题（日期）

**🎓 学术科研**（讲座、竞赛、项目申报等）
- 标题（日期）

**💰 奖助学金**
- 标题（日期）

**👔 就业实习**
- 标题（日期）

**🏫 学生事务**（宿舍、资助、心理等）
- 标题（日期）

**📢 学校公告**（综合通知、公示等）
- 标题（日期）

**⭐ 重点关注**
列出你觉得对学生最重要的 1-3 条通知，并简单说明原因`;

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个简洁准确的分类助手。只输出分类结果，不要额外解释。如果某个类别没有通知，就不输出该类别。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const result = response.data.choices[0].message.content.trim();
    console.log(`   🤖 AI 分析完成 (${countTokens(result)} 字符)`);
    return formatAsHtml(result);
  } catch (err) {
    console.error(`   ❌ AI 分析失败: ${err.message}`);
    return '<p style="color:#999;">（AI 分析暂不可用）</p>';
  }
}

function countTokens(text) {
  return text.length;
}

/**
 * 将 AI 返回的 Markdown 转为 HTML
 */
function formatAsHtml(markdown) {
  let html = markdown
    // 标题
    .replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;color:#333;">$1</h3>')
    .replace(/^\*\*(.+)\*\*$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;color:#333;">$1</h3>')
    // 粗体行作为子标题
    .replace(/^\*\*(.+)\*\*(.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;color:#333;">$1$2</h3>')
    // 列表项
    .replace(/^- (.+)$/gm, '<li style="padding:2px 0;font-size:13px;color:#555;">$1</li>')
    // 把相邻的 <li> 包进 <ul>
    .replace(/(<li[^>]*>.*?<\/li>(\n|$))+/g, (match) => {
      return '<ul style="padding-left:20px;margin:4px 0;">' + match.trim() + '</ul>';
    })
    // 普通段落
    .replace(/^([^<\n].+)$/gm, '<p style="margin:6px 0;font-size:13px;color:#555;">$1</p>')
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return html;
}

module.exports = { analyze };
