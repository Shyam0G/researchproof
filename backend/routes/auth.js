const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, transaction } = require('../db');
const { generateToken, authenticateUser } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');

// Allowed primary roles
const VALID_ROLES = ['student', 'expert', 'sponsor'];

/**
 * POST /api/auth/register
 * Register a new user account with initial role(s)
 */
router.post('/register', (req, res) => {
  try {
    const { email, password, fullName, institution, bio, role, skills, interests } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email, password, and full name are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 8 characters long.'
      });
    }

    const assignedRole = role && VALID_ROLES.includes(role) ? role : 'student';

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'An account with this email address already exists.'
      });
    }

    const userId = 'usr_' + crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    const skillsJson = JSON.stringify(Array.isArray(skills) ? skills : []);
    const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);

    transaction(() => {
      // Create user record
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, institution, bio, skills, interests)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        trimmedEmail,
        passwordHash,
        fullName.trim(),
        institution || null,
        bio || null,
        skillsJson,
        interestsJson
      );

      // Assign initial role
      db.prepare(`
        INSERT INTO user_roles (user_id, role, is_active)
        VALUES (?, ?, 1)
      `).run(userId, assignedRole);

      // Record audit event
      recordAuditEvent({
        actorId: userId,
        actorRole: assignedRole,
        eventType: 'USER_REGISTERED',
        entityType: 'user',
        entityId: userId,
        metadata: { email: trimmedEmail, role: assignedRole }
      });
    });

    const token = generateToken({
      id: userId,
      email: trimmedEmail,
      activeRole: assignedRole
    });

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        email: trimmedEmail,
        fullName: fullName.trim(),
        institution: institution || null,
        bio: bio || null,
        skills: Array.isArray(skills) ? skills : [],
        interests: Array.isArray(interests) ? interests : [],
        activeRole: assignedRole,
        availableRoles: [assignedRole]
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'An error occurred during registration.'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email & password, returning token and authorized roles
 */
router.post('/login', (req, res) => {
  try {
    const { email, password, requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, email, password_hash, full_name, institution, bio, skills, interests, experience_level, availability
      FROM users WHERE email = ?
    `).get(trimmedEmail);

    if (!user) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid email or password.'
      });
    }

    // Retrieve verified active roles from DB
    const roleRows = db.prepare(`
      SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1
    `).all(user.id);

    const availableRoles = roleRows.map(r => r.role);

    if (availableRoles.length === 0) {
      return res.status(403).json({
        error: 'NoActiveRoles',
        message: 'This account has no active roles configured.'
      });
    }

    // Select active role (either requested if permitted, or the user's primary role)
    let activeRole = availableRoles[0];
    if (requestedRole && availableRoles.includes(requestedRole)) {
      activeRole = requestedRole;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      activeRole
    });

    let skills = [];
    let interests = [];
    try { skills = JSON.parse(user.skills || '[]'); } catch (e) { skills = []; }
    try { interests = JSON.parse(user.interests || '[]'); } catch (e) { interests = []; }

    recordAuditEvent({
      actorId: user.id,
      actorRole: activeRole,
      eventType: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      metadata: { activeRole }
    });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        institution: user.institution,
        bio: user.bio,
        skills,
        interests,
        experienceLevel: user.experience_level,
        availability: user.availability,
        activeRole,
        availableRoles
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'An error occurred during login.'
    });
  }
});

/**
 * POST /api/auth/switch-role
 * Secure role switching: Server verifies user is authorized for targetRole
 */
router.post('/switch-role', authenticateUser, (req, res) => {
  try {
    const { targetRole } = req.body;

    if (!targetRole || !VALID_ROLES.includes(targetRole)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `targetRole must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    // Check if target role is authorized for this user in DB
    const roleRecord = db.prepare(`
      SELECT id FROM user_roles WHERE user_id = ? AND role = ? AND is_active = 1
    `).get(req.user.id, targetRole);

    if (!roleRecord) {
      return res.status(403).json({
        error: 'UnauthorizedRole',
        message: `Your account is not authorized for the '${targetRole}' role. Please request authorization or switch to an authorized role.`
      });
    }

    // Issue updated token with the newly activated role
    const newToken = generateToken({
      id: req.user.id,
      email: req.user.email,
      activeRole: targetRole
    });

    recordAuditEvent({
      actorId: req.user.id,
      actorRole: targetRole,
      eventType: 'ROLE_SWITCHED',
      entityType: 'user',
      entityId: req.user.id,
      metadata: { fromRole: req.user.activeRole, toRole: targetRole }
    });

    return res.json({
      message: `Switched active role to ${targetRole}.`,
      token: newToken,
      activeRole: targetRole,
      availableRoles: req.user.availableRoles
    });
  } catch (err) {
    console.error('Switch role error:', err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to switch active role.'
    });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user profile and roles
 */
router.get('/me', authenticateUser, (req, res) => {
  return res.json({
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Acknowledge logout and record audit trail
 */
router.post('/logout', authenticateUser, (req, res) => {
  recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.activeRole,
    eventType: 'USER_LOGOUT',
    entityType: 'user',
    entityId: req.user.id,
    metadata: {}
  });

  return res.json({
    message: 'Logged out successfully.'
  });
});

module.exports = router;
