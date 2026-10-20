const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, transaction } = require('../db');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { recommendTeamLeader } = require('../services/recommendationService');

/**
 * Helper: Check if user is authorized to view a project based on confidentiality
 */
function canUserAccessProject(project, user) {
  if (project.visibility === 'public') return true;
  if (!user) return false;
  if (project.owner_id === user.id) return true;
  if (project.sponsor_id === user.id) return true;

  const membership = db.prepare(`
    SELECT id FROM project_members WHERE project_id = ? AND user_id = ?
  `).get(project.id, user.id);

  return Boolean(membership);
}

/**
 * GET /api/projects
 * Discover projects with search, category, skill, and status filters
 */
router.get('/', (req, res) => {
  try {
    const { search, category, status, skill } = req.query;

    let query = `
      SELECT p.id, p.title, p.short_summary, p.category, p.required_skills,
             p.credit_budget, p.spent_credits, p.visibility, p.confidentiality_level,
             p.status, p.start_date, p.deadline, p.created_at,
             u.id as owner_id, u.full_name as owner_name, u.institution as owner_institution,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'published') as available_task_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter out confidential projects for public listing
    query += ` AND p.visibility != 'confidential'`;

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (p.title LIKE ? OR p.short_summary LIKE ? OR p.description LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY p.created_at DESC`;

    let rows = db.prepare(query).all(...params);

    if (skill) {
      const targetSkill = skill.toLowerCase();
      rows = rows.filter(r => {
        try {
          const skills = JSON.parse(r.required_skills || '[]');
          return skills.some(s => s.toLowerCase().includes(targetSkill));
        } catch (e) {
          return false;
        }
      });
    }

    const projects = rows.map(r => ({
      id: r.id,
      title: r.title,
      shortSummary: r.short_summary,
      category: r.category,
      requiredSkills: JSON.parse(r.required_skills || '[]'),
      creditBudget: r.credit_budget,
      spentCredits: r.spent_credits,
      remainingBudget: Math.max(0, r.credit_budget - r.spent_credits),
      visibility: r.visibility,
      confidentialityLevel: r.confidentiality_level,
      status: r.status,
      startDate: r.start_date,
      deadline: r.deadline,
      availableTaskCount: r.available_task_count,
      createdAt: r.created_at,
      owner: {
        id: r.owner_id,
        fullName: r.owner_name,
        institution: r.owner_institution
      }
    }));

    return res.json({ projects, count: projects.length });
  } catch (err) {
    console.error('List projects error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve projects.' });
  }
});

/**
 * POST /api/projects
 * Create a new research project (requires expert role)
 */
router.post('/', authenticateUser, requireRole('expert'), (req, res) => {
  try {
    const {
      title,
      shortSummary,
      description,
      category,
      objectives,
      methodology,
      requiredSkills = [],
      creditBudget = 1000,
      visibility = 'public',
      confidentialityLevel = 'standard',
      startDate,
      deadline
    } = req.body;

    if (!title || !shortSummary || !description || !category || !objectives) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Title, short summary, description, category, and objectives are required.'
      });
    }

    const budget = Number(creditBudget);
    if (isNaN(budget) || budget < 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'creditBudget must be a non-negative number.'
      });
    }

    const projectId = 'proj_' + crypto.randomUUID();
    const skillsJson = JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : []);

    transaction(() => {
      // Insert project
      db.prepare(`
        INSERT INTO projects (
          id, title, short_summary, description, category, objectives, methodology,
          required_skills, owner_id, credit_budget, spent_credits, visibility,
          confidentiality_level, status, start_date, deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'open', ?, ?)
      `).run(
        projectId,
        title.trim(),
        shortSummary.trim(),
        description.trim(),
        category.trim(),
        objectives.trim(),
        methodology ? methodology.trim() : null,
        skillsJson,
        req.user.id,
        budget,
        visibility,
        confidentialityLevel,
        startDate || null,
        deadline || null
      );

      // Add owner to members table
      db.prepare(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES (?, ?, 'owner')
      `).run(projectId, req.user.id);

      // Provenance audit event
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: 'PROJECT_CREATED',
        entityType: 'project',
        entityId: projectId,
        projectId,
        metadata: { title, category, creditBudget: budget, visibility }
      });
    });

    return res.status(201).json({
      message: 'Research project created successfully.',
      projectId
    });
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to create project.' });
  }
});

/**
 * GET /api/projects/:id
 * Retrieve detailed project information, team, milestones, and published tasks
 */
router.get('/:id', authenticateUser, (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*,
             u.id as owner_id, u.full_name as owner_name, u.institution as owner_institution, u.email as owner_email,
             s.id as sponsor_id, s.full_name as sponsor_name, s.institution as sponsor_institution
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN users s ON p.sponsor_id = s.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    if (!canUserAccessProject(project, req.user)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This project is restricted. Only authorized project members or sponsors may view it.'
      });
    }

    // Members
    const members = db.prepare(`
      SELECT m.id, m.role, m.joined_at, u.id as user_id, u.full_name, u.email, u.institution, u.experience_level
      FROM project_members m
      JOIN users u ON m.user_id = u.id
      WHERE m.project_id = ?
    `).all(project.id);

    // Milestones
    const milestones = db.prepare(`
      SELECT id, title, description, target_date, status, created_at
      FROM project_milestones WHERE project_id = ? ORDER BY target_date ASC
    `).all(project.id);

    // Tasks: Filter based on viewer role (drafts only visible to owner/expert)
    const isOwnerOrExpert = project.owner_id === req.user.id || req.user.activeRole === 'expert';
    let taskQuery = `SELECT * FROM tasks WHERE project_id = ?`;
    if (!isOwnerOrExpert) {
      taskQuery += ` AND status IN ('published', 'accepted', 'in_progress', 'completed')`;
    }
    taskQuery += ` ORDER BY created_at DESC`;

    const tasks = db.prepare(taskQuery).all(project.id).map(t => ({
      ...t,
      requiredSkills: JSON.parse(t.required_skills || '[]')
    }));

    return res.json({
      project: {
        id: project.id,
        title: project.title,
        shortSummary: project.short_summary,
        description: project.description,
        category: project.category,
        objectives: project.objectives,
        methodology: project.methodology,
        requiredSkills: JSON.parse(project.required_skills || '[]'),
        creditBudget: project.credit_budget,
        spentCredits: project.spent_credits,
        remainingBudget: Math.max(0, project.credit_budget - project.spent_credits),
        visibility: project.visibility,
        confidentialityLevel: project.confidentiality_level,
        status: project.status,
        startDate: project.start_date,
        deadline: project.deadline,
        createdAt: project.created_at,
        owner: {
          id: project.owner_id,
          fullName: project.owner_name,
          institution: project.owner_institution,
          email: project.owner_email
        },
        sponsor: project.sponsor_id ? {
          id: project.sponsor_id,
          fullName: project.sponsor_name,
          institution: project.sponsor_institution
        } : null
      },
      members: members.map(m => ({
        id: m.id,
        userId: m.user_id,
        fullName: m.full_name,
        email: m.email,
        institution: m.institution,
        experienceLevel: m.experience_level,
        role: m.role,
        joinedAt: m.joined_at
      })),
      milestones,
      tasks
    });
  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve project details.' });
  }
});

/**
 * PATCH /api/projects/:id
 * Update project details (owner or collaborator)
 */
router.patch('/:id', authenticateUser, (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the project owner may edit project terms.' });
    }

    const { title, shortSummary, description, category, objectives, methodology, requiredSkills, creditBudget, status, visibility } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (shortSummary !== undefined) { updates.push('short_summary = ?'); params.push(shortSummary.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category.trim()); }
    if (objectives !== undefined) { updates.push('objectives = ?'); params.push(objectives.trim()); }
    if (methodology !== undefined) { updates.push('methodology = ?'); params.push(methodology ? methodology.trim() : null); }
    if (requiredSkills !== undefined) { updates.push('required_skills = ?'); params.push(JSON.stringify(requiredSkills)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (visibility !== undefined) { updates.push('visibility = ?'); params.push(visibility); }

    if (creditBudget !== undefined) {
      const budget = Number(creditBudget);
      if (isNaN(budget) || budget < project.spent_credits) {
        return res.status(400).json({
          error: 'BudgetConstraintError',
          message: `creditBudget cannot be set lower than already spent credits (${project.spent_credits}).`
        });
      }
      updates.push('credit_budget = ?');
      params.push(budget);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields provided to update.' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(project.id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'PROJECT_UPDATED',
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      metadata: { fieldsUpdated: Object.keys(req.body) }
    });

    return res.json({ message: 'Project updated successfully.' });
  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update project.' });
  }
});

/**
 * POST /api/projects/:id/apply
 * Contributor applies to join a research project
 */
router.post('/:id/apply', authenticateUser, (req, res) => {
  try {
    const { statement, skillsSummary } = req.body;
    if (!statement || !statement.trim()) {
      return res.status(400).json({ error: 'ValidationError', message: 'A statement of interest is required.' });
    }

    const project = db.prepare('SELECT id, title, owner_id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
    }

    // Check if already applied or member
    const existing = db.prepare(`
      SELECT id, status FROM project_applications WHERE project_id = ? AND user_id = ?
    `).get(project.id, req.user.id);

    if (existing) {
      return res.status(409).json({
        error: 'ConflictError',
        message: `You have already submitted an application for this project (Status: ${existing.status}).`
      });
    }

    const appId = 'app_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO project_applications (id, project_id, user_id, statement, skills_summary, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(appId, project.id, req.user.id, statement.trim(), skillsSummary ? skillsSummary.trim() : null);

    // Notify project lead
    createNotification({
      userId: project.owner_id,
      title: 'New Contributor Application',
      message: `${req.user.fullName} applied to join project '${project.title}'.`,
      type: 'application',
      linkUrl: `/projects/${project.id}`
    });

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'APPLICATION_SUBMITTED',
      entityType: 'project_application',
      entityId: appId,
      projectId: project.id,
      metadata: { applicantName: req.user.fullName }
    });

    return res.status(201).json({
      message: 'Application submitted successfully. The project lead has been notified.',
      applicationId: appId
    });
  } catch (err) {
    console.error('Apply to project error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to apply to project.' });
  }
});

/**
 * GET /api/projects/:id/recommend-leader
 * Transparent rule-based Team Leader Recommendation algorithm
 */
router.get('/:id/recommend-leader', authenticateUser, (req, res) => {
  try {
    const result = recommendTeamLeader(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error('Recommend leader error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: err.message });
  }
});

module.exports = router;
