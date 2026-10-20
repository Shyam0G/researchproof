const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, transaction } = require('../db');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { generateTaskSuggestions } = require('../services/aiService');

/**
 * GET /api/projects/:id/tasks
 * Retrieve tasks for a project
 */
router.get('/projects/:projectId/tasks', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = db.prepare('SELECT id, owner_id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    const tasks = db.prepare(`
      SELECT t.*, u.full_name as assignee_name, u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `).all(projectId);

    const tasksWithCriteria = tasks.map(t => {
      const criteria = db.prepare(`
        SELECT id, criterion_order, title, description, is_mandatory
        FROM acceptance_criteria
        WHERE task_id = ?
        ORDER BY criterion_order ASC
      `).all(t.id);

      return {
        ...t,
        requiredSkills: JSON.parse(t.required_skills || '[]'),
        criteria
      };
    });

    return res.json({ tasks: tasksWithCriteria });
  } catch (err) {
    console.error('Get project tasks error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve project tasks.' });
  }
});

/**
 * POST /api/projects/:projectId/tasks/generate
 * AI-assisted task breakdown (Returns suggestions for review before publication)
 */
router.post('/projects/:projectId/tasks/generate', authenticateUser, requireRole('expert'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    if (project.owner_id !== req.user.id && req.user.activeRole !== 'expert') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only authorized experts may generate tasks for this project.' });
    }

    const remainingBudget = Math.max(0, project.credit_budget - project.spent_credits);
    if (remainingBudget < 50) {
      return res.status(400).json({
        error: 'InsufficientBudget',
        message: `Project has insufficient unallocated credit budget (${remainingBudget} credits remaining). Please expand project credit budget to generate additional tasks.`
      });
    }

    const result = await generateTaskSuggestions({
      projectTitle: project.title,
      projectDescription: project.short_summary + '\n' + project.description,
      objectives: project.objectives,
      requiredSkills: JSON.parse(project.required_skills || '[]'),
      availableCreditBudget: remainingBudget,
      category: project.category
    });

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'AI_TASKS_SUGGESTED',
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      metadata: { suggestedCount: result.tasks.length, source: result.source }
    });

    return res.json({
      message: 'Task suggestions generated successfully for review.',
      availableBudget: remainingBudget,
      source: result.source,
      model: result.model,
      suggestions: result.tasks
    });
  } catch (err) {
    console.error('AI task generation error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to generate task suggestions.' });
  }
});

/**
 * POST /api/projects/:projectId/tasks
 * Create and optionally publish a task with acceptance criteria
 */
router.post('/projects/:projectId/tasks', authenticateUser, requireRole('expert'), (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      requiredSkills = [],
      difficulty = 'intermediate',
      estimatedDuration = '10 hours',
      expectedDeliverables,
      evidenceRequirements,
      creditReward,
      deadline,
      revisionPolicy = '7 calendar days permitted for revisions upon evaluation.',
      criteria = [],
      publishImmediately = false
    } = req.body;

    if (!title || !description || !expectedDeliverables || !evidenceRequirements || !creditReward) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Title, description, deliverables, evidence requirements, and creditReward are required.'
      });
    }

    const reward = Number(creditReward);
    if (isNaN(reward) || reward <= 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'creditReward must be a positive integer.'
      });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    if (project.owner_id !== req.user.id && req.user.activeRole !== 'expert') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only project leaders may create tasks for this project.' });
    }

    // Budget check if publishing immediately
    const remainingBudget = project.credit_budget - project.spent_credits;
    if (publishImmediately && reward > remainingBudget) {
      return res.status(400).json({
        error: 'BudgetExceededError',
        message: `Task credit reward (${reward}) exceeds remaining available project budget (${remainingBudget}).`
      });
    }

    const taskId = 'tsk_' + crypto.randomUUID();
    const taskStatus = publishImmediately ? 'published' : 'draft';

    transaction(() => {
      // 1. Insert task
      db.prepare(`
        INSERT INTO tasks (
          id, project_id, title, description, required_skills, difficulty,
          estimated_duration, expected_deliverables, evidence_requirements,
          credit_reward, deadline, revision_policy, rubric_version, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        taskId,
        projectId,
        title.trim(),
        description.trim(),
        JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : []),
        difficulty,
        estimatedDuration,
        expectedDeliverables.trim(),
        evidenceRequirements.trim(),
        reward,
        deadline || null,
        revisionPolicy.trim(),
        taskStatus
      );

      // 2. Insert acceptance criteria
      const insertCrit = db.prepare(`
        INSERT INTO acceptance_criteria (id, task_id, rubric_version, criterion_order, title, description, is_mandatory)
        VALUES (?, ?, 1, ?, ?, ?, ?)
      `);

      const validCriteria = Array.isArray(criteria) && criteria.length > 0 ? criteria : [
        { title: 'Deliverable Completeness', description: 'All stated deliverables are supplied in complete form.', isMandatory: true },
        { title: 'Methodology Documentation', description: 'Clear documentation of all techniques, scripts, and assumptions.', isMandatory: true }
      ];

      validCriteria.forEach((c, idx) => {
        insertCrit.run(
          'crit_' + crypto.randomUUID(),
          taskId,
          idx + 1,
          c.title || `Criterion ${idx + 1}`,
          c.description || 'Deliverable matches specification.',
          c.isMandatory !== false ? 1 : 0
        );
      });

      // 3. Update project spent budget if published
      if (publishImmediately) {
        db.prepare('UPDATE projects SET spent_credits = spent_credits + ? WHERE id = ?').run(reward, projectId);
      }

      // 4. Audit ledger event
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: publishImmediately ? 'TASK_PUBLISHED' : 'TASK_CREATED',
        entityType: 'task',
        entityId: taskId,
        projectId,
        taskId,
        metadata: { title, creditReward: reward, status: taskStatus }
      });
    });

    return res.status(201).json({
      message: `Task ${publishImmediately ? 'published' : 'created as draft'} successfully.`,
      taskId,
      status: taskStatus
    });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to create task.' });
  }
});

/**
 * GET /api/tasks/:id
 * Retrieve individual task with acceptance criteria and assignment snapshot
 */
router.get('/tasks/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, p.title as project_title, p.category as project_category,
             p.owner_id as project_owner_id, p.confidentiality_level,
             u.full_name as assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }

    const criteria = db.prepare(`
      SELECT id, criterion_order, title, description, is_mandatory
      FROM acceptance_criteria WHERE task_id = ? ORDER BY criterion_order ASC
    `).all(task.id);

    // Get active assignment snapshot if assigned
    let activeAssignment = null;
    if (task.assigned_to) {
      activeAssignment = db.prepare(`
        SELECT * FROM task_assignments WHERE task_id = ? AND status != 'cancelled'
        ORDER BY accepted_at DESC LIMIT 1
      `).get(task.id);
    }

    return res.json({
      task: {
        ...task,
        requiredSkills: JSON.parse(task.required_skills || '[]'),
        criteria,
        activeAssignment
      }
    });
  } catch (err) {
    console.error('Get task error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve task.' });
  }
});

/**
 * POST /api/tasks/:id/publish
 * Publish a draft task (Atomic budget check and status transition)
 */
router.post('/tasks/:id/publish', authenticateUser, requireRole('expert'), (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }

    if (task.status !== 'draft') {
      return res.status(400).json({
        error: 'InvalidState',
        message: `Task is already in '${task.status}' status and cannot be published.`
      });
    }

    const project = db.prepare('SELECT credit_budget, spent_credits, owner_id FROM projects WHERE id = ?').get(task.project_id);
    if (project.owner_id !== req.user.id && req.user.activeRole !== 'expert') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the project leader may publish this task.' });
    }

    const remainingBudget = project.credit_budget - project.spent_credits;
    if (task.credit_reward > remainingBudget) {
      return res.status(400).json({
        error: 'BudgetExceededError',
        message: `Task reward (${task.credit_reward}) exceeds remaining project budget (${remainingBudget}).`
      });
    }

    transaction(() => {
      // Transition status to published
      db.prepare(`UPDATE tasks SET status = 'published', updated_at = datetime('now') WHERE id = ?`).run(task.id);

      // Lock credits in project budget
      db.prepare('UPDATE projects SET spent_credits = spent_credits + ? WHERE id = ?').run(task.credit_reward, task.project_id);

      // Record audit event
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: 'TASK_PUBLISHED',
        entityType: 'task',
        entityId: task.id,
        projectId: task.project_id,
        taskId: task.id,
        metadata: { creditReward: task.credit_reward }
      });
    });

    return res.json({ message: 'Task published successfully and is now available for contributors.' });
  } catch (err) {
    console.error('Publish task error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to publish task.' });
  }
});

/**
 * POST /api/tasks/:id/accept
 * Contributor accepts task: Server locks terms and creates immutable AssignmentTermSnapshot
 */
router.post('/tasks/:id/accept', authenticateUser, requireRole('student'), (req, res) => {
  try {
    const taskId = req.params.id;

    // Check task status
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }

    if (task.status !== 'published') {
      return res.status(409).json({
        error: 'TaskUnavailable',
        message: `This task is not available for acceptance (Current status: '${task.status}').`
      });
    }

    // Load criteria for immutable snapshot
    const criteria = db.prepare(`
      SELECT id, criterion_order, title, description, is_mandatory
      FROM acceptance_criteria WHERE task_id = ? ORDER BY criterion_order ASC
    `).all(task.id);

    const assignmentId = 'asgn_' + crypto.randomUUID();
    const criteriaSnapshotJson = JSON.stringify(criteria);

    transaction(() => {
      // 1. Lock task to accepted by this contributor (atomic check prevents race condition)
      const updateResult = db.prepare(`
        UPDATE tasks
        SET status = 'accepted', assigned_to = ?, assigned_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND status = 'published'
      `).run(req.user.id, task.id);

      if (updateResult.changes === 0) {
        throw new Error('RaceCondition: Task was accepted by another contributor.');
      }

      // 2. Insert immutable AssignmentTermSnapshot in task_assignments
      db.prepare(`
        INSERT INTO task_assignments (
          id, task_id, project_id, contributor_id, status,
          locked_title, locked_description, locked_credit_reward, locked_deadline,
          locked_deliverables, locked_evidence_requirements, locked_revision_policy,
          locked_criteria_json, rubric_version
        ) VALUES (?, ?, ?, ?, 'accepted', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        assignmentId,
        task.id,
        task.project_id,
        req.user.id,
        task.title,
        task.description,
        task.credit_reward,
        task.deadline,
        task.expected_deliverables,
        task.evidence_requirements,
        task.revision_policy,
        criteriaSnapshotJson,
        task.rubric_version
      );

      // 3. Provenance audit event
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: 'TASK_ACCEPTED',
        entityType: 'task_assignment',
        entityId: assignmentId,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          contributorName: req.user.fullName,
          lockedCreditReward: task.credit_reward,
          assignmentId
        }
      });

      // 4. Notifications
      const project = db.prepare('SELECT title, owner_id FROM projects WHERE id = ?').get(task.project_id);
      createNotification({
        userId: project.owner_id,
        title: 'Task Accepted',
        message: `${req.user.fullName} accepted task '${task.title}'.`,
        type: 'task_accepted',
        linkUrl: `/projects/${task.project_id}`
      });

      createNotification({
        userId: req.user.id,
        title: 'Task Accepted Successfully',
        message: `You accepted '${task.title}'. Head to My Workspace to prepare your deliverables.`,
        type: 'task_accepted',
        linkUrl: '/workspace'
      });
    });

    return res.status(201).json({
      message: 'Task accepted successfully! Assignment terms and criteria have been locked.',
      assignmentId,
      lockedCreditReward: task.credit_reward
    });
  } catch (err) {
    console.error('Accept task error:', err);
    if (err.message.includes('RaceCondition')) {
      return res.status(409).json({ error: 'TaskUnavailable', message: 'Task was already accepted by another contributor.' });
    }
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to accept task.' });
  }
});

/**
 * POST /api/tasks/:id/cancel
 * Controlled cancellation or withdrawal of an accepted task
 */
router.post('/tasks/:id/cancel', authenticateUser, (req, res) => {
  try {
    const { reason } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }

    const assignment = db.prepare(`
      SELECT * FROM task_assignments WHERE task_id = ? AND status != 'cancelled'
      ORDER BY accepted_at DESC LIMIT 1
    `).get(task.id);

    if (!assignment) {
      return res.status(400).json({ error: 'InvalidState', message: 'No active assignment found for this task.' });
    }

    const isAssignee = assignment.contributor_id === req.user.id;
    const isOwner = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(task.project_id)?.owner_id === req.user.id;

    if (!isAssignee && !isOwner) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the assignee or project lead may cancel this assignment.' });
    }

    transaction(() => {
      // Cancel assignment snapshot
      db.prepare(`
        UPDATE task_assignments
        SET status = 'cancelled', cancelled_at = datetime('now'), cancellation_reason = ?
        WHERE id = ?
      `).run(reason || 'Withdrawn by contributor', assignment.id);

      // Reopen task as published
      db.prepare(`
        UPDATE tasks
        SET status = 'published', assigned_to = NULL, assigned_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(task.id);

      // Audit ledger
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: 'TASK_CANCELLED',
        entityType: 'task_assignment',
        entityId: assignment.id,
        projectId: task.project_id,
        taskId: task.id,
        metadata: { reason: reason || 'Withdrawn' }
      });
    });

    return res.json({ message: 'Assignment cancelled. Task is now reopened for contributors.' });
  } catch (err) {
    console.error('Cancel task error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to cancel assignment.' });
  }
});

module.exports = router;
