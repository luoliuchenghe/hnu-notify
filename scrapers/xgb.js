const { httpGet } = require("../httpClient");
const cheerio = require('cheerio');

const SOURCE = {
  name: '学工部 - 通知公告',
  url: 'http://xgb.hnu.edu.cn/tzgg1.htm',
};

/**
 * 抓取学工部通知公告列表
 * @returns {Promise<Array<{title: string, link: string, date: string, source: string}>>}
 */
async function scrape() {
  const { data } = await httpGet(SOURCE.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });  // timeout});headers in httpGet

  const $ = cheerio.load(data);
  const items = [];

  // 学工部的通知列表在 <div class="article-list"> 下的 <div class="article-item"> 中
  $('.article-list .article-item').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a.item-title');
    const href = $a.attr('href');
    const title = $a.text().trim();
    const dateText = $el.find('.item-date').text().trim();

    if (!title || !href) return;

    // 构建完整链接
    let fullLink = href;
    if (href.startsWith('http')) {
      fullLink = href;
    } else if (href.startsWith('/')) {
      fullLink = `http://xgb.hnu.edu.cn${href}`;
    } else if (href.startsWith('../')) {
      fullLink = `http://xgb.hnu.edu.cn/${href.replace('../', '')}`;
    } else {
      fullLink = `http://xgb.hnu.edu.cn/${href}`;
    }

    items.push({
      title: title.trim(),
      link: fullLink,
      date: dateText,
      source: SOURCE.name,
    });  // timeout});headers in httpGet
  });  // timeout});headers in httpGet

  return items;
}

module.exports = { scrape, SOURCE };
