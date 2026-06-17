const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 抓取通知页面的正文内容
 * @param {string} url - 通知页面链接
 * @returns {Promise<string>} 提取到的文本内容
 */
async function fetchContent(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    const $ = cheerio.load(data);

    // 尝试各种可能的内容容器选择器
    const selectors = [
      '.content', '.article-content', '.article-content2',
      '.main-content', '.text-content', '.article_text',
      '#content', '.text', 'article', '.article',
      '.detail-content', '.news-content', '.news_content',
      '.con_text', '.detail_text', '.details',
      // 通用：找最大的文本块
      '.list_li', '.div-li',
      // 教务处常见结构
      '.content-body', '.detail',
      // 学工部
      '.article-detail',
    ];

    let content = '';
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 50) {
        content = el.text().trim();
        break;
      }
    }

    // 如果都没找到，尝试用 body
    if (!content || content.length < 50) {
      content = $('body').text().trim();
    }

    // 清理：去除多余空白、脚本内容等
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\[(C|c)data\[.*?\]\]/g, '')
      .trim();

    // 截断过长的内容
    if (content.length > 3000) {
      content = content.slice(0, 3000) + '...';
    }

    return content || '(暂无正文内容)';
  } catch (err) {
    return `(抓取失败: ${err.message || '连接超时'})`;
  }
}

module.exports = { fetchContent };
