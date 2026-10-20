const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { runMigrations } = require('../db/migrate');
const { seedDatabase } = require('../db/seed');

test.before(() => {
  runMigrations();
  seedDatabase();
});

test('GET /api/health should return 200 and healthy status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.equal(res.body.database, 'connected');
});

test('POST /api/auth/login with valid student credentials', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'student@researchproof.test',
      password: 'Password123!'
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.token, 'Token should be returned');
  assert.equal(res.body.user.activeRole, 'student');
  assert.deepEqual(res.body.user.availableRoles, ['student']);
});

test('POST /api/auth/login with invalid password returns 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'student@researchproof.test',
      password: 'WrongPassword999!'
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'InvalidCredentials');
});

test('Role Switching: Multi-role user can switch to authorized role', async () => {
  // Login as multi-role user
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'multirole@researchproof.test',
      password: 'Password123!'
    });

  assert.equal(loginRes.status, 200);
  const token = loginRes.body.token;

  // Switch to sponsor role
  const switchRes = await request(app)
    .post('/api/auth/switch-role')
    .set('Authorization', `Bearer ${token}`)
    .send({ targetRole: 'sponsor' });

  assert.equal(switchRes.status, 200);
  assert.equal(switchRes.body.activeRole, 'sponsor');
  assert.ok(switchRes.body.token, 'New token issued for sponsor role');
});

test('Role Escalation Prevention: Student cannot switch to unauthorized expert role', async () => {
  // Login as pure student
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'student@researchproof.test',
      password: 'Password123!'
    });

  const token = loginRes.body.token;

  // Attempt unauthorized escalation to expert
  const switchRes = await request(app)
    .post('/api/auth/switch-role')
    .set('Authorization', `Bearer ${token}`)
    .send({ targetRole: 'expert' });

  assert.equal(switchRes.status, 403);
  assert.equal(switchRes.body.error, 'UnauthorizedRole');
});

test('POST /api/auth/register creates new account with student role', async () => {
  const uniqueEmail = `newstudent_${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: uniqueEmail,
      password: 'ValidPassword123!',
      fullName: 'New Test Researcher',
      role: 'student',
      skills: ['Python', 'Statistics']
    });

  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.activeRole, 'student');
});

test('POST /api/auth/register rejects duplicate email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'student@researchproof.test',
      password: 'Password123!',
      fullName: 'Duplicate Student'
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'ConflictError');
});
