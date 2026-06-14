const nodemailer = require('nodemailer');

/**
 * 发送邮件通知
 * @param {Array} items - 新的通知列表
 */
async function sendNotification(items) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM_NAME } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
    console.error('❌ 邮件配置不完整，请检查 .env 文件');
    console.error('   需要: SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_TO');
    return false;
  }

  // 按来源分组
  const grouped = {};
  for (const item of items) {
    const src = item.source || '未知来源';
    if (!grouped[src]) grouped[src] = [];
    grouped[src].push(item);
  }

  // 构建 HTML 邮件内容
  let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #B5121B; font-size: 22px; border-bottom: 2px solid #B5121B; padding-bottom: 10px; }
    .source-group { margin: 20px 0; }
    .source-title { font-size: 16px; font-weight: bold; color: #333; background: #f8f8f8; padding: 8px 12px; border-left: 4px solid #B5121B; margin-bottom: 10px; }
    .item { padding: 8px 12px; border-bottom: 1px solid #eee; }
    .item:last-child { border-bottom: none; }
    .item a { color: #2a6ebb; text-decoration: none; font-size: 14px; }
    .item a:hover { text-decoration: underline; }
    .item .date { color: #999; font-size: 12px; margin-left: 10px; white-space: nowrap; }
    .footer { margin-top: 20px; color: #999; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
    .count-badge { display: inline-block; background: #B5121B; color: #fff; border-radius: 10px; padding: 0 8px; font-size: 12px; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📢 湖南大学 - 今日新通知</h1>
    <p style="color: #666; font-size: 14px;">共发现 <strong>${items.length}</strong> 条新通知</p>
`;

  for (const [source, sourceItems] of Object.entries(grouped)) {
    htmlBody += `
    <div class="source-group">
      <div class="source-title">${source} <span class="count-badge">${sourceItems.length}</span></div>
`;
    for (const item of sourceItems) {
      const dateStr = item.date ? `<span class="date">${item.date}</span>` : '';
      htmlBody += `      <div class="item"><a href="${item.link}" target="_blank">${item.title}</a>${dateStr}</div>\n`;
    }
    htmlBody += `    </div>\n`;
  }

  htmlBody += `
    <div class="footer">
      此邮件由湖南大学通知助手自动发送 · ${new Date().toLocaleDateString('zh-CN')}
    </div>
  </div>
</body>
</html>`;

  // 纯文本备用内容
  let textBody = `湖南大学 - 今日新通知 (共${items.length}条)\n\n`;
  for (const [source, sourceItems] of Object.entries(grouped)) {
    textBody += `【${source}】\n`;
    for (const item of sourceItems) {
      textBody += `  · ${item.title} (${item.date || '日期未知'})\n    ${item.link}\n`;
    }
    textBody += '\n';
  }

  // 先解析 SMTP 服务器 IP（使用公共 DNS 避免代理劫持）
  const dns = require('dns');
  const origServers = dns.getServers();
  dns.setServers(['114.114.114.114', '8.8.8.8']);
  const smtpHost = await new Promise((resolve) => {
    dns.resolve4(SMTP_HOST, (err, addresses) => {
      dns.setServers(origServers); // 恢复原始 DNS
      if (err || !addresses || addresses.length === 0) {
        console.warn(`   ⚠ DNS 解析失败，使用原始域名: ${err ? err.message : '无地址'}`);
        resolve(SMTP_HOST);
      } else {
        console.log(`   📍 SMTP 服务器 IP: ${addresses[0]}`);
        resolve(addresses[0]);
      }
    });
  });

  // 创建 SMTP 传输器
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // 对于 QQ 邮箱，允许自签名/不匹配的证书
      rejectUnauthorized: false,
    },
    // 确保使用 SMTP 协议而非代理
    requireTLS: parseInt(SMTP_PORT, 10) === 587,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${MAIL_FROM_NAME || '湖南大学通知助手'}" <${SMTP_USER}>`,
      to: MAIL_TO,
      subject: `📢 湖南大学通知日报 - ${new Date().toLocaleDateString('zh-CN')}`,
      text: textBody,
      html: htmlBody,
    });

    console.log(`✅ 邮件发送成功 (${items.length}条新通知) -> ${MAIL_TO}`);
    console.log(`   邮件ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('❌ 邮件发送失败:', err.message);
    return false;
  }
}

module.exports = { sendNotification };
