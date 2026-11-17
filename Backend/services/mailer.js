function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function frontendLink(page, token) {
  const base = (process.env.APP_BASE_URL || 'http://127.0.0.1:5500/pages').replace(/\/+$/, '');
  return `${base}/${page}?token=${encodeURIComponent(token)}`;
}

async function sendAccountLink({ to, name, subject, intro, page, token, actionLabel }) {
  const url = frontendLink(page, token);
  const text = `${intro}\n\n${url}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Electra</h2><p>Hello ${escapeHtml(name || 'there')},</p><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 18px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(actionLabel)}</a></p><p>Or copy this link into your browser:</p><p>${escapeHtml(url)}</p><p>If you did not request this, you can ignore this email.</p></body></html>`;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.MAIL_FROM;
  if (!host || !from) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured. Set SMTP_HOST and MAIL_FROM in Backend/.env.');
    console.log(`\n[Electra development email]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return 'console';
  }

  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined
  });
  await transport.sendMail({ from, to, subject, text, html });
  return 'smtp';
}

module.exports = { sendAccountLink };
