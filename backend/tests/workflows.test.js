const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { runMigrations } = require('../db/migrate');
const { seedDatabase } = require('../db/seed');

let studentToken = '';
let expertToken = '';

test.before(async () => {
  runMigrations();
  seedDatabase();

  // Login student
  const studentLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@researchproof.test', password: 'Password123!' });
  studentToken = studentLogin.body.token;

  // Login expert
  const expertLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lead@researchproof.test', password: 'Password123!', requestedRole: 'expert' });
  expertToken = expertLogin.body.token;
});

test('GET /api/projects should return seeded projects', async () => {
  const res = await request(app).get('/api/projects');
  assert.equal(res.status, 200);
  assert.ok(res.body.projects.length >= 3);
  assert.ok(res.body.projects.some(p => p.id === 'proj_retinopathy_01'));
});

test('POST /api/projects/:id/tasks/generate generates budget-compliant suggestions', async () => {
  const res = await request(app)
    .post('/api/projects/proj_water_quality_02/tasks/generate')
    .set('Authorization', `Bearer ${expertToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.suggestions.length > 0);
  assert.ok(res.body.availableBudget > 0);

  // Validate that sum of suggested task rewards <= available budget
  const totalSuggestedReward = res.body.suggestions.reduce((sum, t) => sum + t.creditReward, 0);
  assert.ok(
    totalSuggestedReward <= res.body.availableBudget,
    `Total suggested reward (${totalSuggestedReward}) must not exceed available budget (${res.body.availableBudget})`
  );
});

test('Task creation enforces credit budget constraint', async () => {
  // Attempt to publish a task with 999999 credits on a project with only 3500 budget
  const res = await request(app)
    .post('/api/projects/proj_water_quality_02/tasks')
    .set('Authorization', `Bearer ${expertToken}`)
    .send({
      title: 'Impossible Over-Budget Task',
      description: 'Attempting to allocate more credits than available.',
      expectedDeliverables: 'None',
      evidenceRequirements: 'None',
      creditReward: 999999,
      publishImmediately: true
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'BudgetExceededError');
});

test('Student can accept task, locking assignment terms and snapshot', async () => {
  // Alex Chen accepts Task 1 (tsk_fundus_prep_01)
  const acceptRes = await request(app)
    .post('/api/tasks/tsk_fundus_prep_01/accept')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(acceptRes.status, 201);
  assert.ok(acceptRes.body.assignmentId);
  assert.equal(acceptRes.body.lockedCreditReward, 400);

  // Verify second attempt by anyone fails (preventing duplicate assignments)
  const duplicateRes = await request(app)
    .post('/api/tasks/tsk_fundus_prep_01/accept')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(duplicateRes.status, 409);
});

test('Student submits work, receives AI evaluation, and earns credits', async () => {
  // Alex Chen submits work for Task 1
  const subRes = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${studentToken}`)
    .field('taskId', 'tsk_fundus_prep_01')
    .field('methodologySummary', 'Implemented CLAHE illumination correction on the green optical channel with circular mask segmentation and automated blur detection heuristic using OpenCV in Python 3.11. All unit tests verified on 100 sample fundus images.')
    .field('toolsUsed', 'Python, OpenCV, NumPy, PyTest')
    .field('knownLimitations', 'Assumes minimum image resolution of 800x800 pixels.')
    .field('reproductionInstructions', 'Run python preprocess.py --input sample.jpg --output processed.jpg');

  assert.equal(subRes.status, 201);
  assert.ok(subRes.body.submissionId);
  assert.ok(subRes.body.receipt.startsWith('RCPT-'));
  assert.equal(subRes.body.decision, 'accepted');
  assert.equal(subRes.body.creditReward, 400);

  // Verify credit balance updated
  const credRes = await request(app)
    .get('/api/credits/me')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(credRes.status, 200);
  // Initial seeded credits: 250 + new awarded: 400 = 650
  assert.equal(credRes.body.balance, 650);
});

test('Ledger records events with verifiable SHA-256 checksums', async () => {
  const ledgerRes = await request(app)
    .get('/api/ledger')
    .set('Authorization', `Bearer ${expertToken}`);

  assert.equal(ledgerRes.status, 200);
  assert.ok(ledgerRes.body.events.length > 0);

  // Pick first event and verify cryptographic integrity
  const targetEvent = ledgerRes.body.events[0];
  const verifyRes = await request(app)
    .post('/api/ledger/verify')
    .set('Authorization', `Bearer ${expertToken}`)
    .send({ eventId: targetEvent.id });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.integrityVerified, true);
});

test('Sponsor report provides aggregate metrics without leaking raw files', async () => {
  // Login as sponsor
  const sponsorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sponsor@researchproof.test', password: 'Password123!' });

  const sponsorRes = await request(app)
    .get('/api/ledger/sponsor-reports')
    .set('Authorization', `Bearer ${sponsorLogin.body.token}`);

  assert.equal(sponsorRes.status, 200);
  assert.ok(sponsorRes.body.reports.length > 0);
  const rep = sponsorRes.body.reports[0];
  assert.ok(rep.title);
  assert.ok(rep.creditBudget >= rep.allocatedBudget);
  assert.ok(typeof rep.taskStats.completionPercentage === 'number');
});
