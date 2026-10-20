const crypto = require('crypto');
const { db } = require('../db');

function createNotification({
  userId,
  title,
  message,
  type = 'milestone',
  linkUrl = null
}) {
  const notifId = 'notif_' + crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  stmt.run(notifId, userId, title, message, type, linkUrl);
  return notifId;
}

module.exports = {
  createNotification
};
