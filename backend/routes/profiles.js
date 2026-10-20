const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateUser } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');

/**
 * GET /api/profiles/me
 * Get current user profile with role permissions
 */
router.get('/me', authenticateUser, (req, res) => {
  return res.json({
    profile: req.user
  });
});

/**
 * PATCH /api/profiles/me
 * Update personal profile information
 */
router.patch('/me', authenticateUser, (req, res) => {
  try {
    const { fullName, institution, bio, skills, interests, experienceLevel, availability } = req.body;

    const updates = [];
    const params = [];

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({ error: 'ValidationError', message: 'Full name cannot be blank.' });
      }
      updates.push('full_name = ?');
      params.push(fullName.trim());
    }

    if (institution !== undefined) {
      updates.push('institution = ?');
      params.push(institution.trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio.trim());
    }

    if (skills !== undefined) {
      updates.push('skills = ?');
      params.push(JSON.stringify(Array.isArray(skills) ? skills : []));
    }

    if (interests !== undefined) {
      updates.push('interests = ?');
      params.push(JSON.stringify(Array.isArray(interests) ? interests : []));
    }

    if (experienceLevel !== undefined) {
      updates.push('experience_level = ?');
      params.push(experienceLevel);
    }

    if (availability !== undefined) {
      updates.push('availability = ?');
      params.push(availability);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields provided to update.' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);

    db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'PROFILE_UPDATED',
      entityType: 'user',
      entityId: req.user.id,
      metadata: { fieldsUpdated: Object.keys(req.body) }
    });

    const updatedUser = db.prepare(`
      SELECT id, email, full_name, institution, bio, skills, interests, experience_level, availability
      FROM users WHERE id = ?
    `).get(req.user.id);

    return res.json({
      message: 'Profile updated successfully.',
      profile: {
        ...updatedUser,
        fullName: updatedUser.full_name,
        experienceLevel: updatedUser.experience_level,
        skills: JSON.parse(updatedUser.skills || '[]'),
        interests: JSON.parse(updatedUser.interests || '[]'),
        activeRole: req.user.activeRole,
        availableRoles: req.user.availableRoles
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update profile.' });
  }
});

/**
 * POST /api/profiles/request-role
 * Enable or request an additional role for the authenticated user
 */
router.post('/request-role', authenticateUser, (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['student', 'expert', 'sponsor'];

    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ error: 'ValidationError', message: `Role must be one of: ${allowed.join(', ')}` });
    }

    // Insert or activate role
    db.prepare(`
      INSERT INTO user_roles (user_id, role, is_active)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, role) DO UPDATE SET is_active = 1
    `).run(req.user.id, role);

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'ROLE_ENABLED',
      entityType: 'user_role',
      entityId: req.user.id,
      metadata: { roleEnabled: role }
    });

    const roles = db.prepare('SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1').all(req.user.id).map(r => r.role);

    return res.json({
      message: `Role '${role}' is now enabled for your account. You can switch to it from the profile menu.`,
      availableRoles: roles
    });
  } catch (err) {
    console.error('Request role error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user roles.' });
  }
});

/**
 * GET /api/profiles/:id
 * Get public profile of another researcher (omitting private secrets)
 */
router.get('/:id', authenticateUser, (req, res) => {
  const user = db.prepare(`
    SELECT id, full_name, institution, bio, skills, interests, experience_level, availability, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User profile not found.' });
  }

  const roles = db.prepare(`
    SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1
  `).all(user.id).map(r => r.role);

  return res.json({
    profile: {
      id: user.id,
      fullName: user.full_name,
      institution: user.institution,
      bio: user.bio,
      skills: JSON.parse(user.skills || '[]'),
      interests: JSON.parse(user.interests || '[]'),
      experienceLevel: user.experience_level,
      availability: user.availability,
      roles,
      createdAt: user.created_at
    }
  });
});

module.exports = router;
