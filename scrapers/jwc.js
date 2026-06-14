const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE = {
  name: '教务处 - 通知公告',
  url: 'http://jwc.hnu.edu.cn/list.jsp?urltype=tree.TreeTempUrl&wbtreeid=1256',
};

/**
 * 抓取教务处通知公告列表
 */
async function scrape() {
  const { data } = await axios.get(SOURCE.url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  const $ = cheerio.load(data);
  const items = [];

  // 通知列表结构：
  // <li id="line_u13_X">
  //   <a href="info/XXXX/XXXX.htm">
  //     <div class="time"><span class="dd">12</span><span class="yy">2026-06</span></div>
  //     <div class="list_li" title="TITLE">TITLE</div>
  //   </a>
  // </li>
  $('li[id^="line_u"]').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a');
    const href = $a.attr('href');
    if (!href) return;

    // 标题：优先取 title 属性，其次取文本
    const $titleDiv = $el.find('.list_li');
    let title = $titleDiv.attr('title');
    if (!title) {
      title = $titleDiv.text().trim();
    }
    if (!title) return;

    // 日期：拼接 .dd + .yy
    const $time = $el.find('.time');
    let dateText = '';
    if ($time.length) {
      const dd = $time.find('.dd').text().trim();
      const yy = $time.find('.yy').text().trim();
      if (dd && yy) {
        dateText = `${yy}-${dd}`; // e.g. 2026-06-12
      }
    }

    // 构建完整链接
    let fullLink = href;
    if (href.startsWith('http')) {
      fullLink = href;
    } else if (href.startsWith('/')) {
      fullLink = `http://jwc.hnu.edu.cn${href}`;
    } else {
      fullLink = `http://jwc.hnu.edu.cn/${href}`;
    }

    items.push({
      title: title.trim(),
      link: fullLink,
      date: dateText,
      source: SOURCE.name,
    });
  });

  // 如果上面的选择器没抓到，尝试首页结构（通知在首页右侧）
  if (items.length === 0) {
    $('.part1_li li a').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href');
      const title = $a.attr('title');
      if (!title || !href) return;

      let fullLink = href;
      if (href.startsWith('http')) fullLink = href;
      else if (href.startsWith('/')) fullLink = `http://jwc.hnu.edu.cn${href}`;
      else fullLink = `http://jwc.hnu.edu.cn/${href}`;

      let dateText = '';
      const dateEl = $a.closest('li').find('.p1_b .date');
      if (dateEl.length) dateText = dateEl.first().text().trim();

      items.push({
        title: title.trim(),
        link: fullLink,
        date: dateText,
        source: SOURCE.name,
      });
    });
  }

  return items;
}

module.exports = { scrape, SOURCE };
