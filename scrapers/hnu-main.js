const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE = {
  name: '湖南大学主页 - 通知公告',
  url: 'https://www.hnu.edu.cn/tzgg.htm',
};

/**
 * 抓取湖南大学主页通知公告列表
 * @returns {Promise<Array<{title: string, link: string, date: string, source: string}>>}
 */
async function scrape() {
  const { data } = await axios.get(SOURCE.url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  const $ = cheerio.load(data);
  const items = [];

  $('ul.list-liebiao li').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a');
    const href = $a.attr('href');
    const title = $a.attr('title');
    const dateText = $a.find('span').text().trim();

    if (!title || !href) return;

    // 构建完整链接
    let fullLink = href;
    if (href.startsWith('http')) {
      // 已经是完整链接（如微信文章）
    } else if (href.startsWith('/')) {
      fullLink = `https://www.hnu.edu.cn${href}`;
    } else {
      fullLink = `https://www.hnu.edu.cn/${href}`;
    }

    items.push({
      title: title.trim(),
      link: fullLink,
      date: dateText,
      source: SOURCE.name,
    });
  });

  return items;
}

module.exports = { scrape, SOURCE };
