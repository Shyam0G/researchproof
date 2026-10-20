const { db } = require('./index');

function runMigrations() {
  console.log('Running database migrations...');

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      institution TEXT,
      bio TEXT,
      skills TEXT DEFAULT '[]', -- JSON array
      interests TEXT DEFAULT '[]', -- JSON array
      experience_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
      availability TEXT DEFAULT 'part-time',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- User roles table
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('student', 'expert', 'sponsor')),
      is_active INTEGER DEFAULT 1,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, role)
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      short_summary TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      objectives TEXT NOT NULL,
      methodology TEXT,
      required_skills TEXT DEFAULT '[]', -- JSON array
      owner_id TEXT NOT NULL REFERENCES users(id),
      sponsor_id TEXT REFERENCES users(id),
      credit_budget INTEGER NOT NULL DEFAULT 0 CHECK(credit_budget >= 0),
      spent_credits INTEGER NOT NULL DEFAULT 0 CHECK(spent_credits >= 0),
      visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'restricted', 'confidential')),
      confidentiality_level TEXT NOT NULL DEFAULT 'standard' CHECK(confidentiality_level IN ('standard', 'restricted', 'strictly_confidential')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('draft', 'open', 'active', 'paused', 'completed', 'archived')),
      start_date TEXT,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Project members
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'contributor' CHECK(role IN ('owner', 'collaborator', 'contributor', 'sponsor_observer')),
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    );

    -- Project applications
    CREATE TABLE IF NOT EXISTS project_applications (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      statement TEXT NOT NULL,
      skills_summary TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Project Milestones
    CREATE TABLE IF NOT EXISTS project_milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'delayed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_skills TEXT DEFAULT '[]', -- JSON array
      difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
      estimated_duration TEXT NOT NULL,
      expected_deliverables TEXT NOT NULL,
      evidence_requirements TEXT NOT NULL,
      credit_reward INTEGER NOT NULL CHECK(credit_reward > 0),
      deadline TEXT,
      revision_policy TEXT NOT NULL,
      rubric_version INTEGER NOT NULL DEFAULT 1,
      is_ai_generated INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'accepted', 'in_progress', 'submitted', 'evaluating', 'revision_required', 'completed', 'cancelled')),
      assigned_to TEXT REFERENCES users(id),
      assigned_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Acceptance Criteria for Tasks
    CREATE TABLE IF NOT EXISTS acceptance_criteria (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      rubric_version INTEGER NOT NULL DEFAULT 1,
      criterion_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Task Assignments (Immutable snapshot of terms upon acceptance)
    CREATE TABLE IF NOT EXISTS task_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contributor_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted', 'in_progress', 'submitted', 'evaluating', 'revision_required', 'completed', 'cancelled')),
      locked_title TEXT NOT NULL,
      locked_description TEXT NOT NULL,
      locked_credit_reward INTEGER NOT NULL,
      locked_deadline TEXT,
      locked_deliverables TEXT NOT NULL,
      locked_evidence_requirements TEXT NOT NULL,
      locked_revision_policy TEXT NOT NULL,
      locked_criteria_json TEXT NOT NULL,
      rubric_version INTEGER NOT NULL,
      accepted_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      cancelled_at TEXT,
      cancellation_reason TEXT
    );

    -- Submissions
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      assignment_id TEXT NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
      contributor_id TEXT NOT NULL REFERENCES users(id),
      version_number INTEGER NOT NULL DEFAULT 1,
      methodology_summary TEXT NOT NULL,
      tools_used TEXT,
      known_limitations TEXT,
      reproduction_instructions TEXT,
      submission_receipt TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'evaluating', 'revision_required', 'accepted', 'needs_independent_review')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Submission Files (Protected, hashed storage)
    CREATE TABLE IF NOT EXISTS submission_files (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    -- Evaluations
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      evaluator_type TEXT NOT NULL CHECK(evaluator_type IN ('ai', 'human_expert', 'appeals_officer')),
      evaluator_id TEXT REFERENCES users(id),
      decision TEXT NOT NULL CHECK(decision IN ('accepted', 'revision_required', 'needs_independent_review')),
      rubric_version INTEGER NOT NULL,
      model_info TEXT,
      overall_feedback TEXT NOT NULL,
      revision_instructions TEXT,
      confidence_notes TEXT,
      evaluated_at TEXT DEFAULT (datetime('now'))
    );

    -- Evaluation Criteria Findings
    CREATE TABLE IF NOT EXISTS evaluation_criteria_results (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      criterion_id TEXT,
      criterion_title TEXT NOT NULL,
      passed INTEGER NOT NULL, -- 1 = passed, 0 = failed
      evidence_found TEXT,
      missing_evidence TEXT,
      explanation TEXT NOT NULL
    );

    -- Credit Transactions
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      contributor_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      assignment_id TEXT NOT NULL REFERENCES task_assignments(id),
      amount INTEGER NOT NULL CHECK(amount > 0),
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('task_completion_reward', 'bonus', 'adjustment')),
      reason TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL, -- Strictly prevents duplicate reward processing
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Audit Events (The Provenance & Integrity Ledger)
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_role TEXT,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      project_id TEXT,
      task_id TEXT,
      submission_id TEXT,
      metadata TEXT DEFAULT '{}',
      sha256_checksum TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('application', 'task_accepted', 'submission', 'evaluation', 'revision', 'task_completed', 'credits', 'milestone', 'access')),
      link_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for query optimization and constraint enforcement
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_contributor ON task_assignments(contributor_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_contributor ON submissions(contributor_id);
    CREATE INDEX IF NOT EXISTS idx_submission_files_sub ON submission_files(submission_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(contributor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_project ON audit_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_task ON audit_events(task_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  console.log('Database migrations completed successfully.');
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
