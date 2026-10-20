const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/credits/me
 * Retrieve contributor's authoritative earned credit balance and transaction history
 */
router.get('/me', authenticateUser, (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT ct.*, p.title as project_title, t.title as task_title
      FROM credit_transactions ct
      JOIN projects p ON ct.project_id = p.id
      JOIN tasks t ON ct.task_id = t.id
      WHERE ct.contributor_id = ?
      ORDER BY ct.created_at DESC
    `).all(req.user.id);

    // Authoritative balance calculation from verified transaction ledger
    const balanceResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM credit_transactions WHERE contributor_id = ?
    `).get(req.user.id);

    const balance = balanceResult ? balanceResult.balance : 0;

    return res.json({
      balance,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        projectTitle: t.project_title,
        taskTitle: t.task_title,
        transactionType: t.transaction_type,
        reason: t.reason,
        idempotencyKey: t.idempotency_key,
        createdAt: t.created_at
      }))
    });
  } catch (err) {
    console.error('Get credits error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve credit balance.' });
  }
});

/**
 * GET /api/credits/projects/:projectId
 * Retrieve project credit budget and spent allocation ledger
 */
router.get('/projects/:projectId', authenticateUser, (req, res) => {
  try {
    const project = db.prepare(`
      SELECT id, title, credit_budget, spent_credits, owner_id
      FROM projects WHERE id = ?
    `).get(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    const transactions = db.prepare(`
      SELECT ct.*, u.full_name as contributor_name, t.title as task_title
      FROM credit_transactions ct
      JOIN users u ON ct.contributor_id = u.id
      JOIN tasks t ON ct.task_id = t.id
      WHERE ct.project_id = ?
      ORDER BY ct.created_at DESC
    `).all(project.id);

    const totalAwarded = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as awarded
      FROM credit_transactions WHERE project_id = ?
    `).get(project.id)?.awarded || 0;

    return res.json({
      projectId: project.id,
      projectTitle: project.title,
      creditBudget: project.credit_budget,
      allocatedBudget: project.spent_credits,
      awardedCredits: totalAwarded,
      unallocatedBudget: Math.max(0, project.credit_budget - project.spent_credits),
      transactions
    });
  } catch (err) {
    console.error('Get project credits error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve project credit allocation.' });
  }
});

module.exports = router;
