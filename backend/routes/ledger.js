const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/ledger
 * Query the contribution provenance & audit ledger
 */
router.get('/', authenticateUser, (req, res) => {
  try {
    const { projectId, eventType, limit = 50 } = req.query;

    let query = `
      SELECT a.*, u.full_name as actor_name, p.title as project_title, t.title as task_title
      FROM audit_events a
      LEFT JOIN users u ON a.actor_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN tasks t ON a.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      query += ` AND a.project_id = ?`;
      params.push(projectId);
    }

    if (eventType) {
      query += ` AND a.event_type = ?`;
      params.push(eventType);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(Number(limit) || 50);

    const rows = db.prepare(query).all(...params);

    const events = rows.map(r => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name || (r.actor_role === 'ai_evaluator' ? 'Automated AI Evaluator' : 'System Engine'),
      actorRole: r.actor_role,
      eventType: r.event_type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      projectId: r.project_id,
      projectTitle: r.project_title,
      taskId: r.task_id,
      taskTitle: r.task_title,
      submissionId: r.submission_id,
      metadata: JSON.parse(r.metadata || '{}'),
      sha256Checksum: r.sha256_checksum,
      createdAt: r.created_at
    }));

    return res.json({ events, count: events.length });
  } catch (err) {
    console.error('Get ledger error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve ledger events.' });
  }
});

/**
 * POST /api/ledger/verify
 * Cryptographically verifies an audit event record against its stored SHA-256 checksum
 */
router.post('/verify', authenticateUser, (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'ValidationError', message: 'eventId is required.' });
    }

    const event = db.prepare('SELECT * FROM audit_events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'NotFound', message: 'Audit event not found.' });
    }

    const contentToHash = `${event.id}|${event.actor_id || ''}|${event.actor_role || ''}|${event.event_type}|${event.entity_type}|${event.entity_id}|${event.project_id || ''}|${event.task_id || ''}|${event.submission_id || ''}|${event.metadata || ''}|${event.created_at}`;
    const recomputedHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    const isIntact = recomputedHash === event.sha256_checksum;

    return res.json({
      eventId: event.id,
      storedChecksum: event.sha256_checksum,
      recomputedChecksum: recomputedHash,
      integrityVerified: isIntact,
      verdict: isIntact ? 'Audit record integrity cryptographically verified.' : 'Integrity warning: Stored checksum mismatch!'
    });
  } catch (err) {
    console.error('Verify ledger event error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to verify audit event.' });
  }
});

/**
 * GET /api/ledger/sponsor-reports
 * Authorized aggregate reports and impact metrics for sponsors
 */
router.get('/sponsor-reports', authenticateUser, (req, res) => {
  try {
    // Projects sponsored by current user or all visible projects if general sponsor overview
    const sponsoredProjects = db.prepare(`
      SELECT p.*, u.full_name as owner_name, u.institution as owner_institution
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE (p.sponsor_id = ? OR p.visibility = 'public')
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    const reports = sponsoredProjects.map(proj => {
      // Aggregate task stats
      const taskStats = db.prepare(`
        SELECT
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as available_tasks,
          SUM(CASE WHEN status IN ('accepted', 'in_progress', 'submitted', 'evaluating') THEN 1 ELSE 0 END) as in_progress_tasks
        FROM tasks WHERE project_id = ?
      `).get(proj.id);

      // Milestone progress
      const milestones = db.prepare(`
        SELECT id, title, target_date, status FROM project_milestones WHERE project_id = ?
      `).all(proj.id);

      // Verified credits awarded
      const creditAwarded = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_awarded, COUNT(DISTINCT contributor_id) as contributor_count
        FROM credit_transactions WHERE project_id = ?
      `).get(proj.id);

      return {
        projectId: proj.id,
        title: proj.title,
        category: proj.category,
        owner: {
          name: proj.owner_name,
          institution: proj.owner_institution
        },
        creditBudget: proj.credit_budget,
        allocatedBudget: proj.spent_credits,
        awardedCredits: creditAwarded?.total_awarded || 0,
        activeContributorsCount: creditAwarded?.contributor_count || 0,
        taskStats: {
          total: taskStats.total_tasks || 0,
          completed: taskStats.completed_tasks || 0,
          inProgress: taskStats.in_progress_tasks || 0,
          available: taskStats.available_tasks || 0,
          completionPercentage: taskStats.total_tasks > 0
            ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100)
            : 0
        },
        milestones
      };
    });

    return res.json({ reports });
  } catch (err) {
    console.error('Sponsor reports error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve sponsor reports.' });
  }
});

module.exports = router;
