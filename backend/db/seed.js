const { db, transaction } = require('./index');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function seedDatabase() {
  console.log('Seeding database with clearly labeled demonstration data...');

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  transaction(() => {
    // Clean existing records to allow repeatable seeding
    db.exec(`
      DELETE FROM notifications;
      DELETE FROM audit_events;
      DELETE FROM credit_transactions;
      DELETE FROM evaluation_criteria_results;
      DELETE FROM evaluations;
      DELETE FROM submission_files;
      DELETE FROM submissions;
      DELETE FROM task_assignments;
      DELETE FROM acceptance_criteria;
      DELETE FROM tasks;
      DELETE FROM project_milestones;
      DELETE FROM project_applications;
      DELETE FROM project_members;
      DELETE FROM projects;
      DELETE FROM user_roles;
      DELETE FROM users;
    `);

    // 1. Insert Demo Users
    const users = [
      {
        id: 'usr_student_01',
        email: 'student@researchproof.test',
        password_hash: passwordHash,
        full_name: 'Alex Chen (Demo Student)',
        institution: 'Institute of Biomedical Informatics',
        bio: 'Graduate student researcher focusing on medical data analysis, computer vision, and open science reproducibility.',
        skills: JSON.stringify(['Python', 'Data Analysis', 'Machine Learning', 'Documentation', 'Pandas']),
        interests: JSON.stringify(['Healthcare AI', 'Computer Vision', 'Open Data']),
        experience_level: 'intermediate',
        availability: '15-20h/week'
      },
      {
        id: 'usr_expert_01',
        email: 'lead@researchproof.test',
        password_hash: passwordHash,
        full_name: 'Dr. Sarah Mitchell (Demo Project Lead)',
        institution: 'Center for Computational Medicine',
        bio: 'Principal Investigator and domain expert in clinical imaging, retinal pathology screening, and algorithmic evaluation.',
        skills: JSON.stringify(['Biomedical Imaging', 'AI in Healthcare', 'Clinical Trials', 'Python', 'Grant Administration']),
        interests: JSON.stringify(['Ophthalmology AI', 'Diagnostic Precision', 'Research Ethics']),
        experience_level: 'expert',
        availability: 'Full-time'
      },
      {
        id: 'usr_sponsor_01',
        email: 'sponsor@researchproof.test',
        password_hash: passwordHash,
        full_name: 'Global Health Initiative (Demo Sponsor Rep: Marcus Vance)',
        institution: 'Global Health Initiative Foundation',
        bio: 'Program officer coordinating research grants and verified impact allocations for preventive health technology.',
        skills: JSON.stringify(['Research Funding', 'Grant Oversight', 'Impact Metrics']),
        interests: JSON.stringify(['Global Health', 'Accessible Diagnostics', 'Fund Stewardship']),
        experience_level: 'expert',
        availability: 'Full-time'
      },
      {
        id: 'usr_multirole_01',
        email: 'multirole@researchproof.test',
        password_hash: passwordHash,
        full_name: 'Jordan Lee (Multi-Role Demo User)',
        institution: 'Cross-Disciplinary Research Labs',
        bio: 'Senior researcher and active contributor eligible for expert project leadership, student contribution, and sponsor oversight.',
        skills: JSON.stringify(['Full-Stack Research', 'Data Engineering', 'Peer Review', 'Project Management']),
        interests: JSON.stringify(['Reproducibility', 'AI Governance', 'Open Access']),
        experience_level: 'advanced',
        availability: 'Flexible'
      }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, institution, bio, skills, interests, experience_level, availability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of users) {
      insertUser.run(u.id, u.email, u.password_hash, u.full_name, u.institution, u.bio, u.skills, u.interests, u.experience_level, u.availability);
    }

    // 2. Insert Roles
    const insertRole = db.prepare(`
      INSERT INTO user_roles (user_id, role, is_active) VALUES (?, ?, 1)
    `);

    // Alex Chen: student
    insertRole.run('usr_student_01', 'student');

    // Dr. Sarah Mitchell: expert and student
    insertRole.run('usr_expert_01', 'expert');
    insertRole.run('usr_expert_01', 'student');

    // Global Health Sponsor: sponsor
    insertRole.run('usr_sponsor_01', 'sponsor');

    // Jordan Lee: all 3 roles
    insertRole.run('usr_multirole_01', 'expert');
    insertRole.run('usr_multirole_01', 'student');
    insertRole.run('usr_multirole_01', 'sponsor');

    // 3. Insert Projects
    const projects = [
      {
        id: 'proj_retinopathy_01',
        title: 'AI for Diabetic Retinopathy Screening in Rural Clinics',
        short_summary: 'Developing reproducible computer vision pipelines to screen for microaneurysms and retinal lesions in low-resource environments.',
        description: 'Diabetic retinopathy remains a leading cause of preventable blindness worldwide. Early intervention can preserve vision in over 90% of cases, yet rural health clinics often lack trained retinal specialists. This project investigates lightweight, reproducible neural network architectures and standardized preprocessing pipelines to detect early stages of diabetic retinopathy from portable fundus camera captures without requiring costly server clusters.',
        category: 'Healthcare & Biomedical AI',
        objectives: '1. Build an open, benchmarked preprocessing module for fundus image illumination correction.\n2. Formulate reproducible acceptance rubrics for lesion segmentation.\n3. Benchmark interpretability heatmaps (Grad-CAM/SHAP) against clinical annotations.\n4. Protect patient data privacy by enforcing strict synthetic-only or sanitized datasets for remote contributors.',
        methodology: 'Standardized preprocessing with contrast-limited adaptive histogram equalization (CLAHE), artifact masking, and validation against public anonymized datasets (EyePACS/MESSIDOR-2 subsets).',
        required_skills: JSON.stringify(['Python', 'Computer Vision', 'PyTorch/TensorFlow', 'Data Preprocessing', 'Medical Imaging']),
        owner_id: 'usr_expert_01',
        sponsor_id: 'usr_sponsor_01',
        credit_budget: 5000,
        spent_credits: 650,
        visibility: 'public',
        confidentiality_level: 'standard',
        status: 'open',
        start_date: '2026-10-01',
        deadline: '2027-04-30'
      },
      {
        id: 'proj_water_quality_02',
        title: 'Sustainable Watershed Quality & Contaminant Flow Modeling',
        short_summary: 'Predictive geospatial and geochemical modeling of rural watershed contamination using sensor arrays and community science samples.',
        description: 'Safe drinking water in agricultural basins is threatened by seasonal nitrate runoff and industrial discharge. This project aggregates high-frequency telemetry from regional water monitoring stations with community water samples to build an open, auditable predictive model of pollutant propagation.',
        category: 'Environmental Science',
        objectives: '1. Standardize hydrological sensor ingestion workflows.\n2. Validate spatial interpolation algorithms against ground truth grab samples.\n3. Create open-source interactive contaminant risk maps.',
        methodology: 'Time-series forecasting with LSTM/XGBoost, Kriging geospatial interpolation, and geochemical equilibrium verification.',
        required_skills: JSON.stringify(['GIS', 'Python', 'Environmental Chemistry', 'Time-Series Analysis']),
        owner_id: 'usr_expert_01',
        sponsor_id: 'usr_sponsor_01',
        credit_budget: 3500,
        spent_credits: 0,
        visibility: 'public',
        confidentiality_level: 'standard',
        status: 'open',
        start_date: '2026-10-15',
        deadline: '2027-06-30'
      },
      {
        id: 'proj_learning_analytics_03',
        title: 'Adaptive Learning Analytics & Cognitive Load Assessment',
        short_summary: 'Evaluating multimodal telemetry from digital learning environments to personalize STEM educational pathways.',
        description: 'Analyzing real-time interactions, problem-solving pauses, and self-assessment surveys to identify cognitive bottlenecks in secondary mathematics education.',
        category: 'Education Technology',
        objectives: '1. Formulate ethical guidelines for educational telemetry retention.\n2. Build Bayesian knowledge tracing models.\n3. Publish open pedagogical benchmarks.',
        methodology: 'Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT) with strictly de-identified interaction logs.',
        required_skills: JSON.stringify(['Statistics', 'R/Python', 'Psychometrics', 'Data Ethics']),
        owner_id: 'usr_multirole_01',
        sponsor_id: null,
        credit_budget: 2000,
        spent_credits: 0,
        visibility: 'public',
        confidentiality_level: 'standard',
        status: 'open',
        start_date: '2026-11-01',
        deadline: '2027-03-31'
      }
    ];

    const insertProj = db.prepare(`
      INSERT INTO projects (id, title, short_summary, description, category, objectives, methodology, required_skills, owner_id, sponsor_id, credit_budget, spent_credits, visibility, confidentiality_level, status, start_date, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of projects) {
      insertProj.run(p.id, p.title, p.short_summary, p.description, p.category, p.objectives, p.methodology, p.required_skills, p.owner_id, p.sponsor_id, p.credit_budget, p.spent_credits, p.visibility, p.confidentiality_level, p.status, p.start_date, p.deadline);
    }

    // 4. Project Memberships
    const insertMember = db.prepare(`
      INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)
    `);
    insertMember.run('proj_retinopathy_01', 'usr_expert_01', 'owner');
    insertMember.run('proj_retinopathy_01', 'usr_sponsor_01', 'sponsor_observer');
    insertMember.run('proj_retinopathy_01', 'usr_student_01', 'contributor');

    insertMember.run('proj_water_quality_02', 'usr_expert_01', 'owner');
    insertMember.run('proj_learning_analytics_03', 'usr_multirole_01', 'owner');

    // 5. Project Milestones
    const insertMilestone = db.prepare(`
      INSERT INTO project_milestones (id, project_id, title, description, target_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertMilestone.run('ms_retino_01', 'proj_retinopathy_01', 'Preprocessing & Normalization Pipeline Complete', 'Automated illumination correction and artifact masking operational across sample dataset.', '2026-12-15', 'in_progress');
    insertMilestone.run('ms_retino_02', 'proj_retinopathy_01', 'Baseline Segmentation Benchmark Established', 'Evaluation of U-Net vs DeepLabV3+ with clinical sensitivity above 88%.', '2027-02-28', 'pending');
    insertMilestone.run('ms_retino_03', 'proj_retinopathy_01', 'Final Reproducibility Package & Clinical Summary', 'All reproducible code, artifacts, and peer-reviewed summary submitted for review.', '2027-04-30', 'pending');

    // 6. Tasks for Project 1
    const tasks = [
      {
        id: 'tsk_fundus_prep_01',
        project_id: 'proj_retinopathy_01',
        title: 'Preprocessing & Artifact Detection in Retinal Fundus Images',
        description: 'Construct a self-contained, reproducible Python pipeline using OpenCV and NumPy that takes raw fundus camera photographs and applies: (1) circular field-of-view masking, (2) illumination correction via Contrast-Limited Adaptive Histogram Equalization (CLAHE) on the green channel, and (3) automated detection of blur or eyelash occlusion artifacts.',
        required_skills: JSON.stringify(['Python', 'OpenCV', 'Image Processing', 'NumPy']),
        difficulty: 'intermediate',
        estimated_duration: '8-12 hours',
        expected_deliverables: 'A clean Python module (preprocess.py) or Jupyter notebook with executable reproduction commands, accompanying unit test, and sample processed outputs demonstrating contrast enhancement.',
        evidence_requirements: 'Source code, input/output comparison images (PNG/JPG), and an execution log demonstrating error handling on corrupt/blurred images.',
        credit_reward: 400,
        deadline: '2026-11-20',
        revision_policy: 'Contributors have up to 7 calendar days to revise and resubmit if acceptance criteria require remediation.',
        rubric_version: 1,
        is_ai_generated: 0,
        status: 'published'
      },
      {
        id: 'tsk_lit_review_02',
        project_id: 'proj_retinopathy_01',
        title: 'Literature Synthesis on Explainable AI for Retinal Microaneurysms',
        description: 'Conduct a systematic survey of peer-reviewed articles published between 2021 and 2026 comparing visual attribution techniques (Grad-CAM, Integrated Gradients, SHAP) applied to deep learning models for diabetic microaneurysm detection.',
        required_skills: JSON.stringify(['Literature Review', 'Scientific Writing', 'Explainable AI', 'Ophthalmology AI']),
        difficulty: 'beginner',
        estimated_duration: '6-8 hours',
        expected_deliverables: 'A 4-6 page structured synthesis report (PDF or Markdown) including a comparative matrix table analyzing computational overhead, localization precision, and clinical usability.',
        evidence_requirements: 'Synthesis report with complete bibliography (at least 8 distinct peer-reviewed papers) and structured evaluation table.',
        credit_reward: 250,
        deadline: '2026-11-30',
        revision_policy: 'One revision cycle permitted within 5 business days if citation depth or matrix completeness is insufficient.',
        rubric_version: 1,
        is_ai_generated: 0,
        status: 'published'
      },
      {
        id: 'tsk_synthetic_eval_03',
        project_id: 'proj_retinopathy_01',
        title: 'Benchmark Dataset Calibration & Split Validation',
        description: 'Verify cross-validation splits and class distribution balance for lesion severity grades (0: No DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative) to prevent demographic or device bias.',
        required_skills: JSON.stringify(['Data Science', 'Statistics', 'Pandas', 'Validation Design']),
        difficulty: 'advanced',
        estimated_duration: '10-14 hours',
        expected_deliverables: 'Statistical balance report, stratification script, and demographic parity diagnostic summary.',
        evidence_requirements: 'Python script, generated distribution charts (PNG), and summary markdown table.',
        credit_reward: 500,
        deadline: '2026-12-10',
        revision_policy: 'Revisions permitted within 7 days upon feedback.',
        rubric_version: 1,
        is_ai_generated: 0,
        status: 'published'
      }
    ];

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, required_skills, difficulty, estimated_duration, expected_deliverables, evidence_requirements, credit_reward, deadline, revision_policy, rubric_version, is_ai_generated, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of tasks) {
      insertTask.run(t.id, t.project_id, t.title, t.description, t.required_skills, t.difficulty, t.estimated_duration, t.expected_deliverables, t.evidence_requirements, t.credit_reward, t.deadline, t.revision_policy, t.rubric_version, t.is_ai_generated, t.status);
    }

    // 7. Acceptance Criteria for Task 1
    const criteriaTask1 = [
      {
        id: 'crit_prep_01',
        task_id: 'tsk_fundus_prep_01',
        criterion_order: 1,
        title: 'Circular Field-of-View Masking',
        description: 'Correctly segments and isolates the circular retinal area while eliminating black camera border noise.',
        is_mandatory: 1
      },
      {
        id: 'crit_prep_02',
        task_id: 'tsk_fundus_prep_01',
        criterion_order: 2,
        title: 'Illumination Equalization & Green Channel CLAHE',
        description: 'Implements CLAHE specifically emphasizing the green channel where retinal lesions exhibit highest optical contrast.',
        is_mandatory: 1
      },
      {
        id: 'crit_prep_03',
        task_id: 'tsk_fundus_prep_01',
        criterion_order: 3,
        title: 'Artifact Occlusion Detection & Warning',
        description: 'Implements automated heuristic or variance check to flag images obscured by overexposure or severe blur.',
        is_mandatory: 1
      },
      {
        id: 'crit_prep_04',
        task_id: 'tsk_fundus_prep_01',
        criterion_order: 4,
        title: 'Executable Reproduction Instructions & Evidence',
        description: 'Provides unambiguous instructions and sample before/after test image evidence demonstrating pipeline execution.',
        is_mandatory: 1
      }
    ];

    // Acceptance Criteria for Task 2
    const criteriaTask2 = [
      {
        id: 'crit_lit_01',
        task_id: 'tsk_lit_review_02',
        criterion_order: 1,
        title: 'Peer-Reviewed Source Coverage (>= 8 papers)',
        description: 'Includes a minimum of 8 recent peer-reviewed ophthalmology/AI publications from 2021-2026.',
        is_mandatory: 1
      },
      {
        id: 'crit_lit_02',
        task_id: 'tsk_lit_review_02',
        criterion_order: 2,
        title: 'Comparative Analysis Matrix Table',
        description: 'Presents a structured comparison matrix contrasting Grad-CAM, Integrated Gradients, and SHAP on resolution and clinical fidelity.',
        is_mandatory: 1
      },
      {
        id: 'crit_lit_03',
        task_id: 'tsk_lit_review_02',
        criterion_order: 3,
        title: 'Synthesis of Clinical Interpretability Limitations',
        description: 'Critically evaluates why naive saliency maps can mislead clinicians and suggests actionable validation safeguards.',
        is_mandatory: 1
      }
    ];

    const insertCriterion = db.prepare(`
      INSERT INTO acceptance_criteria (id, task_id, rubric_version, criterion_order, title, description, is_mandatory)
      VALUES (?, ?, 1, ?, ?, ?, ?)
    `);

    for (const c of [...criteriaTask1, ...criteriaTask2]) {
      insertCriterion.run(c.id, c.task_id, c.criterion_order, c.title, c.description, c.is_mandatory);
    }

    // 8. Seed a completed assignment and submission to demonstrate ledger and credit verification
    // Task 2 was previously completed by Alex Chen to demonstrate history & credits
    const assignmentId = 'asgn_alex_lit_01';
    const lockedCriteriaSnapshot = JSON.stringify(criteriaTask2);

    db.prepare(`
      INSERT INTO task_assignments (
        id, task_id, project_id, contributor_id, status,
        locked_title, locked_description, locked_credit_reward, locked_deadline,
        locked_deliverables, locked_evidence_requirements, locked_revision_policy,
        locked_criteria_json, rubric_version, accepted_at, completed_at
      ) VALUES (
        ?, 'tsk_lit_review_02', 'proj_retinopathy_01', 'usr_student_01', 'completed',
        'Literature Synthesis on Explainable AI for Retinal Microaneurysms',
        'Survey of peer-reviewed articles from 2021-2026 comparing visual attribution techniques.',
        250, '2026-11-30',
        'A 4-6 page structured synthesis report with comparative matrix table.',
        'Synthesis report with complete bibliography and structured evaluation table.',
        'One revision cycle permitted within 5 business days.',
        ?, 1, datetime('now', '-7 days'), datetime('now', '-2 days')
      )
    `).run(assignmentId, lockedCriteriaSnapshot);

    const submissionId = 'sub_alex_lit_01';
    const submissionReceipt = 'RCPT-2026-RET-0982-ALEX';

    db.prepare(`
      INSERT INTO submissions (
        id, task_id, assignment_id, contributor_id, version_number,
        methodology_summary, tools_used, known_limitations, reproduction_instructions,
        submission_receipt, status, created_at
      ) VALUES (
        ?, 'tsk_lit_review_02', ?, 'usr_student_01', 1,
        'Systematically queried PubMed, IEEE Xplore, and Google Scholar for queries combining Diabetic Retinopathy with Grad-CAM, Integrated Gradients, and SHAP. Synthesized 11 candidate papers into a comparative matrix assessing resolution and clinical diagnostic fidelity.',
        'Zotero, Markdown, LaTeX, Google Scholar, IEEE Xplore',
        'Survey was limited to English-language publications with open access or institutional availability.',
        'Refer to Section 2 of the attached report for exact query syntax and inclusion criteria.',
        ?, 'accepted', datetime('now', '-3 days')
      )
    `).run(submissionId, assignmentId, submissionReceipt);

    // Submission File
    const dummyHash = crypto.createHash('sha256').update('DEMO_LITERATURE_SURVEY_CONTENT_ALEX_CHEN').digest('hex');
    db.prepare(`
      INSERT INTO submission_files (
        id, submission_id, original_name, storage_path, storage_key,
        mime_type, file_size_bytes, sha256_hash, uploaded_by, uploaded_at
      ) VALUES (
        'fil_alex_lit_01', ?, 'Diabetic_Retinopathy_XAI_Survey_v1.pdf',
        'uploads/demo_xai_survey.pdf', 'demo_xai_survey_storage_key_01',
        'application/pdf', 412850, ?, 'usr_student_01', datetime('now', '-3 days')
      )
    `).run(submissionId, dummyHash);

    // Evaluation
    const evalId = 'eval_alex_lit_01';
    db.prepare(`
      INSERT INTO evaluations (
        id, submission_id, task_id, evaluator_type, evaluator_id,
        decision, rubric_version, model_info, overall_feedback,
        revision_instructions, confidence_notes, evaluated_at
      ) VALUES (
        ?, ?, 'tsk_lit_review_02', 'ai', NULL,
        'accepted', 1, 'gemini-1.5-flash-evaluation-engine',
        'The submission thoroughly satisfies all predefined acceptance criteria. Citations include 11 peer-reviewed papers spanning 2021-2025. The comparative matrix provides detailed analysis of computational latency and localization fidelity.',
        'None required. Submission accepted.',
        'High evaluation confidence; all evidence was verified against explicit criteria.',
        datetime('now', '-2 days')
      )
    `).run(evalId, submissionId);

    // Evaluation Criteria Findings
    const insertCritFinding = db.prepare(`
      INSERT INTO evaluation_criteria_results (id, evaluation_id, criterion_id, criterion_title, passed, evidence_found, missing_evidence, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCritFinding.run('ecr_01', evalId, 'crit_lit_01', 'Peer-Reviewed Source Coverage (>= 8 papers)', 1, '11 indexed papers cited in bibliography section', 'None', 'Criterion exceeded with 11 distinct high-impact citations.');
    insertCritFinding.run('ecr_02', evalId, 'crit_lit_02', 'Comparative Analysis Matrix Table', 1, 'Table 1 in section 3 comparing Grad-CAM, IG, and SHAP', 'None', 'Matrix covers all requested attribution methods.');
    insertCritFinding.run('ecr_03', evalId, 'crit_lit_03', 'Synthesis of Clinical Interpretability Limitations', 1, 'Section 4 explicitly details clinician false-positive traps', 'None', 'Clear, well-reasoned critique of visual saliency limits in ophthalmology.');

    // Credit Award (Authorized transaction)
    db.prepare(`
      INSERT INTO credit_transactions (
        id, contributor_id, project_id, task_id, assignment_id,
        amount, transaction_type, reason, idempotency_key, created_at
      ) VALUES (
        'tx_alex_lit_reward_01', 'usr_student_01', 'proj_retinopathy_01', 'tsk_lit_review_02', ?,
        250, 'task_completion_reward', 'Completed Task: Literature Synthesis on Explainable AI for Retinal Microaneurysms',
        'tx_idemp_tsk_lit_review_02_usr_student_01_v1', datetime('now', '-2 days')
      )
    `).run(assignmentId);

    // 9. Initial Audit Events (Ledger)
    const insertAudit = db.prepare(`
      INSERT INTO audit_events (id, actor_id, actor_role, event_type, entity_type, entity_id, project_id, task_id, submission_id, metadata, sha256_checksum, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

    insertAudit.run('aud_01', 'usr_expert_01', 'expert', 'PROJECT_CREATED', 'project', 'proj_retinopathy_01', 'proj_retinopathy_01', null, null, JSON.stringify({ title: 'AI for Diabetic Retinopathy Screening', budget: 5000 }), 'hash_proj_created_demo', daysAgo(14));
    insertAudit.run('aud_02', 'usr_expert_01', 'expert', 'TASK_PUBLISHED', 'task', 'tsk_lit_review_02', 'proj_retinopathy_01', 'tsk_lit_review_02', null, JSON.stringify({ title: 'Literature Synthesis', reward: 250 }), 'hash_task_pub_demo', daysAgo(10));
    insertAudit.run('aud_03', 'usr_student_01', 'student', 'TASK_ACCEPTED', 'task_assignment', assignmentId, 'proj_retinopathy_01', 'tsk_lit_review_02', null, JSON.stringify({ contributor: 'Alex Chen', reward: 250 }), 'hash_task_acc_demo', daysAgo(7));
    insertAudit.run('aud_04', 'usr_student_01', 'student', 'SUBMISSION_CREATED', 'submission', submissionId, 'proj_retinopathy_01', 'tsk_lit_review_02', submissionId, JSON.stringify({ receipt: submissionReceipt, files: 1 }), 'hash_sub_demo', daysAgo(3));
    insertAudit.run('aud_05', null, 'system_ai', 'EVALUATION_COMPLETED', 'evaluation', evalId, 'proj_retinopathy_01', 'tsk_lit_review_02', submissionId, JSON.stringify({ decision: 'accepted', evaluator: 'ai' }), 'hash_eval_demo', daysAgo(2));
    insertAudit.run('aud_06', 'usr_expert_01', 'expert', 'CREDIT_AWARDED', 'credit_transaction', 'tx_alex_lit_reward_01', 'proj_retinopathy_01', 'tsk_lit_review_02', null, JSON.stringify({ amount: 250, recipient: 'usr_student_01' }), 'hash_credit_demo', daysAgo(2));

    // 10. Initial Notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotif.run('notif_01', 'usr_student_01', 'Credits Awarded!', 'You received 250 credits for successfully completing: Literature Synthesis on Explainable AI for Retinal Microaneurysms.', 'credits', '/credits', 0, daysAgo(2));
    insertNotif.run('notif_02', 'usr_student_01', 'Evaluation Completed', 'Your submission for Task: Literature Synthesis on Explainable AI has been evaluated and Accepted.', 'evaluation', '/submissions/sub_alex_lit_01', 1, daysAgo(2));
    insertNotif.run('notif_03', 'usr_expert_01', 'Task Completed', 'Alex Chen successfully completed the task: Literature Synthesis on Explainable AI.', 'task_completed', '/projects/proj_retinopathy_01', 0, daysAgo(2));
    insertNotif.run('notif_04', 'usr_sponsor_01', 'Project Progress Update', 'Milestone in progress for sponsored project: AI for Diabetic Retinopathy Screening.', 'milestone', '/sponsor/reports', 0, daysAgo(1));
  });

  console.log('Database seeded successfully with verified demonstration data.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
