const { httpGet } = require("../httpClient");
const cheerio = require('cheerio');

const SOURCE = {
  name: '研究生院 - 通知信息',
  url: 'http://gra.hnu.edu.cn/',
};

// 需要过滤掉的非通知项关键词
const FILTER_KEYWORDS = [
  '指示批示', '复试分数线', '文件材料', '与会交流', '相关综述',
  '他山之石', '贯彻落实', '首页', '下页', '上页', '尾页',
];

/**
 * 判断是否为真正的通知项
 */
function isValidItem(title, link) {
  if (!title || !link) return false;
  // 排除过短的标题
  if (title.length < 4) return false;
  // 排除导航/菜单项
  for (const kw of FILTER_KEYWORDS) {
    if (title.includes(kw)) return false;
  }
  // 只保留带有 info/ 或 content.jsp 的链接（内部通知页）
  if (!link.includes('info/') && !link.includes('content.jsp')) return false;
  return true;
}

/**
 * 抓取研究生院主页四大类通知（招生信息、培养信息、学位信息、综合信息）
 */
async function scrape() {
  const { data } = await httpGet(SOURCE.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });  // timeout});headers in httpGet

  const $ = cheerio.load(data);
  const items = [];

  // 研究生院主页的通知在 <li> 中，包含 info/ 链接
  $('li').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a');
    const href = $a.attr('href');
    if (!href) return;

    const title = $a.text().trim();
    if (!isValidItem(title, href)) return;

    // 提取日期 - 在 <i> 标签中，格式如 [2026-06-12]
    let dateText = '';
    const $i = $el.find('i');
    if ($i.length) {
      dateText = $i.text().trim().replace(/[\[\]]/g, '');
    }

    // 尝试确定类别
    const parentHtml = $el.parent().html() || '';
    let category = '';
    const sectionHeaders = $el.closest('div').prevAll('h3').first().text();
    if (sectionHeaders.includes('招生信息')) category = '招生信息';
    else if (sectionHeaders.includes('培养信息')) category = '培养信息';
    else if (sectionHeaders.includes('学位信息')) category = '学位信息';
    else if (sectionHeaders.includes('综合信息')) category = '综合信息';

    // 如果上面没找到，回退到关键词匹配
    if (!category) {
      if (parentHtml.includes('招生信息') || href.includes('zsxx')) category = '招生信息';
      else if (parentHtml.includes('培养信息') || href.includes('pyxx')) category = '培养信息';
      else if (parentHtml.includes('学位信息') || href.includes('xwxx')) category = '学位信息';
      else if (parentHtml.includes('综合信息') || href.includes('zhxx')) category = '综合信息';
    }

    // 构建完整链接
    let fullLink = href;
    if (href.startsWith('http')) {
      fullLink = href;
    } else if (href.startsWith('/')) {
      fullLink = `http://gra.hnu.edu.cn${href}`;
    } else {
      fullLink = `http://gra.hnu.edu.cn/${href}`;
    }

    const sourceName = category ? `${SOURCE.name}(${category})` : SOURCE.name;
    items.push({
      title: title.trim(),
      link: fullLink,
      date: dateText,
      source: sourceName,
    });  // timeout});headers in httpGet
  });  // timeout});headers in httpGet

  return items;
}

module.exports = { scrape, SOURCE };
