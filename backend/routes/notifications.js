const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Retrieve notifications for authenticated user
 */
router.get('/', authenticateUser, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id)?.count || 0;

    return res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve notifications.' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', authenticateUser, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update notification.' });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', authenticateUser, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE user_id = ?
    `).run(req.user.id);

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update notifications.' });
  }
});

module.exports = router;
