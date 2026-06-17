const axios = require('axios');
const dns = require('dns');
const https = require('https');

// 使用国内 DNS 确保能正确解析国内网站
const CHINA_DNS = ['114.114.114.114', '223.5.5.5'];

/**
 * 用国内 DNS 解析域名后发起 HTTP 请求
 * @param {string} url - 请求地址
 * @param {object} [options] - axios 额外配置
 * @returns {Promise<object>} axios response
 */
async function httpGet(url, options = {}) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  // 用国内 DNS 解析域名
  const origServers = dns.getServers();
  dns.setServers(CHINA_DNS);

  const ip = await new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      dns.setServers(origServers);
      if (err || !addresses || addresses.length === 0) {
        resolve(null); // DNS 失败，使用默认
      } else {
        resolve(addresses[0]);
      }
    });
  });

  const config = {
    url: ip ? url.replace(hostname, ip) : url,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(ip ? { Host: hostname } : {}),
    },
    ...options,
  };

  // HTTPS 请求需要特殊处理
  if (ip && url.startsWith('https')) {
    config.httpsAgent = new https.Agent({
      servername: hostname, // SNI
      rejectUnauthorized: false,
    });
  }

  try {
    const response = await axios(config);
    return response;
  } catch (err) {
    // DNS 方式失败后，回退到直接请求（可能走代理）
    if (ip) {
      console.warn(`   ⚡ 直连 ${ip} 失败，回退到默认 DNS`);
      delete config.url;
      config.url = url;
      delete config.httpsAgent;
      return await axios(config);
    }
    throw err;
  }
}

module.exports = { httpGet };
