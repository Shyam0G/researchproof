const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_researchproof_987654321_secure_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a signed JWT containing user ID, email, and the active role.
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware: Verifies the JWT token and attaches the authenticated user
 * with authoritative database-verified roles.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Authorization token is required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Authoritative DB lookup: Verify user still exists
    const user = db.prepare(`
      SELECT id, email, full_name, institution, bio, skills, interests, experience_level, availability
      FROM users WHERE id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'InvalidSession',
        message: 'The account associated with this session no longer exists.'
      });
    }

    // Authoritative DB lookup: Get all enabled roles for this user
    const roleRows = db.prepare(`
      SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1
    `).all(user.id);

    const availableRoles = roleRows.map(r => r.role);

    if (availableRoles.length === 0) {
      return res.status(403).json({
        error: 'NoAssignedRoles',
        message: 'This account has no active authorized roles.'
      });
    }

    // Determine active role: Verify requested active role is genuinely authorized in DB
    let activeRole = decoded.activeRole;
    if (!activeRole || !availableRoles.includes(activeRole)) {
      activeRole = availableRoles[0]; // Default to user's first valid role
    }

    // Parse JSON skills and interests safely
    let skills = [];
    let interests = [];
    try { skills = JSON.parse(user.skills || '[]'); } catch (e) { skills = []; }
    try { interests = JSON.parse(user.interests || '[]'); } catch (e) { interests = []; }

    req.user = {
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
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Invalid or malformed authentication token.'
    });
  }
}

/**
 * Middleware factory: Enforce that the active user possesses one of the allowed roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'AuthenticationRequired',
        message: 'User must be authenticated.'
      });
    }

    if (!allowedRoles.includes(req.user.activeRole)) {
      return res.status(403).json({
        error: 'UnauthorizedRole',
        message: `Action requires one of the following active roles: ${allowedRoles.join(', ')}. Your active role is '${req.user.activeRole}'. Switch your role if your account is authorized.`
      });
    }

    next();
  };
}

module.exports = {
  generateToken,
  authenticateUser,
  requireRole
};
