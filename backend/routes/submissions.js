const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, transaction } = require('../db');
const { authenticateUser } = require('../middleware/auth');
const { recordAuditEvent } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { evaluateSubmissionWithAi } = require('../services/aiService');

// Upload directory configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage: Secure random filename, no path traversal, outside public web root
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeKey = 'fil_' + crypto.randomUUID() + ext;
    cb(null, safeKey);
  }
});

// File filter: Allowed prototype research extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.zip'];

const upload = multer({
  storage,
  limits: {
    fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024, // 10 MB default
    files: Number(process.env.MAX_FILES_PER_SUBMISSION) || 5
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${ext}' is not permitted. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

/**
 * POST /api/submissions
 * Submit work with methodology, tools, and supporting evidence files.
 * Automatically evaluates against locked rubric and handles revision / completion atomically.
 */
router.post('/', authenticateUser, upload.array('files', 5), async (req, res) => {
  try {
    const {
      taskId,
      methodologySummary,
      toolsUsed,
      knownLimitations,
      reproductionInstructions
    } = req.body;

    if (!taskId || !methodologySummary || !methodologySummary.trim()) {
      // Remove any uploaded files on validation failure
      if (req.files) {
        req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      }
      return res.status(400).json({
        error: 'ValidationError',
        message: 'taskId and methodologySummary are required.'
      });
    }

    // 1. Verify task assignment
    const assignment = db.prepare(`
      SELECT * FROM task_assignments
      WHERE task_id = ? AND contributor_id = ? AND status != 'cancelled'
      ORDER BY accepted_at DESC LIMIT 1
    `).get(taskId, req.user.id);

    if (!assignment) {
      if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(403).json({
        error: 'AssignmentNotFound',
        message: 'You have not accepted this task or your assignment is not active.'
      });
    }

    // Determine version number (incremental)
    const prevSubmissionCount = db.prepare(`
      SELECT COUNT(*) as count FROM submissions WHERE assignment_id = ?
    `).get(assignment.id)?.count || 0;
    const versionNumber = prevSubmissionCount + 1;

    const submissionId = 'sub_' + crypto.randomUUID();
    const submissionReceipt = `RCPT-${new Date().getFullYear()}-${taskId.slice(-6).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-V${versionNumber}`;

    // Process files and calculate SHA-256 hashes
    const processedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileBuffer = fs.readFileSync(file.path);
        const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        processedFiles.push({
          id: 'sfile_' + crypto.randomUUID(),
          originalName: file.originalname,
          storagePath: file.path,
          storageKey: file.filename,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSizeBytes: file.size,
          sha256Hash
        });
      }
    }

    // 2. Perform AI / Rubric Evaluation against the LOCKED criteria
    const lockedCriteria = JSON.parse(assignment.locked_criteria_json || '[]');

    const evalResult = await evaluateSubmissionWithAi({
      taskTitle: assignment.locked_title,
      taskDescription: assignment.locked_description,
      lockedCriteria,
      methodologySummary,
      toolsUsed,
      knownLimitations,
      reproductionInstructions,
      uploadedFiles: processedFiles
    });

    const isAccepted = evalResult.overallDecision === 'accepted';
    const submissionStatus = isAccepted ? 'accepted' : 'revision_required';
    const evaluationId = 'eval_' + crypto.randomUUID();

    // 3. Persist submission, files, evaluation, and credit award inside atomic transaction
    transaction(() => {
      // A. Insert submission
      db.prepare(`
        INSERT INTO submissions (
          id, task_id, assignment_id, contributor_id, version_number,
          methodology_summary, tools_used, known_limitations, reproduction_instructions,
          submission_receipt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        submissionId,
        taskId,
        assignment.id,
        req.user.id,
        versionNumber,
        methodologySummary.trim(),
        toolsUsed ? toolsUsed.trim() : null,
        knownLimitations ? knownLimitations.trim() : null,
        reproductionInstructions ? reproductionInstructions.trim() : null,
        submissionReceipt,
        submissionStatus
      );

      // B. Insert files
      const insertFile = db.prepare(`
        INSERT INTO submission_files (
          id, submission_id, original_name, storage_path, storage_key,
          mime_type, file_size_bytes, sha256_hash, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pf of processedFiles) {
        insertFile.run(
          pf.id,
          submissionId,
          pf.originalName,
          pf.storagePath,
          pf.storageKey,
          pf.mimeType,
          pf.fileSizeBytes,
          pf.sha256Hash,
          req.user.id
        );
      }

      // C. Insert Evaluation record
      db.prepare(`
        INSERT INTO evaluations (
          id, submission_id, task_id, evaluator_type, evaluator_id,
          decision, rubric_version, model_info, overall_feedback,
          revision_instructions, confidence_notes
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        evaluationId,
        submissionId,
        taskId,
        evalResult.evaluatorType || 'ai',
        evalResult.overallDecision,
        assignment.rubric_version,
        evalResult.modelInfo || 'standard-evaluator',
        evalResult.overallFeedback,
        evalResult.revisionInstructions || null,
        evalResult.confidenceNotes || null
      );

      // D. Insert Criteria Findings
      const insertFinding = db.prepare(`
        INSERT INTO evaluation_criteria_results (
          id, evaluation_id, criterion_id, criterion_title, passed, evidence_found, missing_evidence, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (Array.isArray(evalResult.criteriaFindings)) {
        for (const cf of evalResult.criteriaFindings) {
          insertFinding.run(
            'ecr_' + crypto.randomUUID(),
            evaluationId,
            cf.criterionId || null,
            cf.criterionTitle,
            cf.passed ? 1 : 0,
            cf.evidenceFound || null,
            cf.missingEvidence || null,
            cf.explanation
          );
        }
      }

      // E. Update task and assignment status
      const nextTaskStatus = isAccepted ? 'completed' : 'revision_required';
      db.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(nextTaskStatus, taskId);
      db.prepare(`UPDATE task_assignments SET status = ?, completed_at = ? WHERE id = ?`).run(
        nextTaskStatus,
        isAccepted ? new Date().toISOString() : null,
        assignment.id
      );

      // F. If accepted: Award credits with unique idempotency key
      let creditTransactionId = null;
      if (isAccepted) {
        creditTransactionId = 'tx_' + crypto.randomUUID();
        const idempotencyKey = `tx_complete_${assignment.id}_v${versionNumber}`;

        db.prepare(`
          INSERT INTO credit_transactions (
            id, contributor_id, project_id, task_id, assignment_id,
            amount, transaction_type, reason, idempotency_key
          ) VALUES (?, ?, ?, ?, ?, ?, 'task_completion_reward', ?, ?)
        `).run(
          creditTransactionId,
          req.user.id,
          assignment.project_id,
          taskId,
          assignment.id,
          assignment.locked_credit_reward,
          `Verified completion of task: ${assignment.locked_title}`,
          idempotencyKey
        );

        // Record credit audit event
        recordAuditEvent({
          actorId: req.user.id,
          actorRole: req.user.activeRole,
          eventType: 'CREDIT_AWARDED',
          entityType: 'credit_transaction',
          entityId: creditTransactionId,
          projectId: assignment.project_id,
          taskId,
          submissionId,
          metadata: { amount: assignment.locked_credit_reward, recipient: req.user.id }
        });
      }

      // G. Record submission and evaluation audit events
      recordAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.activeRole,
        eventType: versionNumber === 1 ? 'SUBMISSION_CREATED' : 'RESUBMISSION_CREATED',
        entityType: 'submission',
        entityId: submissionId,
        projectId: assignment.project_id,
        taskId,
        submissionId,
        metadata: { version: versionNumber, fileCount: processedFiles.length, receipt: submissionReceipt }
      });

      recordAuditEvent({
        actorId: null,
        actorRole: 'ai_evaluator',
        eventType: 'EVALUATION_COMPLETED',
        entityType: 'evaluation',
        entityId: evaluationId,
        projectId: assignment.project_id,
        taskId,
        submissionId,
        metadata: { decision: evalResult.overallDecision, isAccepted }
      });

      // H. In-app notifications
      const notifTitle = isAccepted ? 'Task Accepted & Credits Awarded!' : 'Submission Evaluated - Revision Required';
      const notifMsg = isAccepted
        ? `Congratulations! Your submission for '${assignment.locked_title}' met all criteria. ${assignment.locked_credit_reward} credits have been deposited in your ledger.`
        : `Your submission for '${assignment.locked_title}' requires revisions. Review the criterion-level feedback to resubmit.`;

      createNotification({
        userId: req.user.id,
        title: notifTitle,
        message: notifMsg,
        type: isAccepted ? 'credits' : 'revision',
        linkUrl: `/submissions/${submissionId}`
      });
    });

    return res.status(201).json({
      message: isAccepted
        ? 'Submission passed evaluation! Credits awarded successfully.'
        : 'Submission evaluated: revisions are required.',
      submissionId,
      receipt: submissionReceipt,
      versionNumber,
      decision: evalResult.overallDecision,
      overallFeedback: evalResult.overallFeedback,
      revisionInstructions: evalResult.revisionInstructions,
      criteriaFindings: evalResult.criteriaFindings,
      creditReward: isAccepted ? assignment.locked_credit_reward : 0,
      filesUploaded: processedFiles.map(f => ({
        id: f.id,
        name: f.originalName,
        size: f.fileSizeBytes,
        sha256: f.sha256Hash
      }))
    });
  } catch (err) {
    console.error('Submit work error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to process submission.' });
  }
});

/**
 * GET /api/submissions/:id
 * Retrieve submission details, files, and evaluation feedback
 */
router.get('/:id', authenticateUser, (req, res) => {
  try {
    const submission = db.prepare(`
      SELECT s.*, t.title as task_title, t.project_id, p.title as project_title,
             p.owner_id as project_owner_id, u.full_name as contributor_name, u.email as contributor_email
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON s.contributor_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'NotFound', message: 'Submission not found.' });
    }

    // Access control: Only contributor, project owner, or domain expert can view submission details
    const isContributor = submission.contributor_id === req.user.id;
    const isProjectOwner = submission.project_owner_id === req.user.id;
    const isExpertReviewer = req.user.activeRole === 'expert';

    if (!isContributor && !isProjectOwner && !isExpertReviewer) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not authorized to view this private research submission.'
      });
    }

    // Fetch files
    const files = db.prepare(`
      SELECT id, original_name, mime_type, file_size_bytes, sha256_hash, uploaded_at
      FROM submission_files WHERE submission_id = ?
    `).all(submission.id);

    // Fetch evaluation
    const evaluation = db.prepare(`
      SELECT * FROM evaluations WHERE submission_id = ? ORDER BY evaluated_at DESC LIMIT 1
    `).get(submission.id);

    let criteriaFindings = [];
    if (evaluation) {
      criteriaFindings = db.prepare(`
        SELECT id, criterion_id, criterion_title, passed, evidence_found, missing_evidence, explanation
        FROM evaluation_criteria_results WHERE evaluation_id = ?
      `).all(evaluation.id);
    }

    return res.json({
      submission: {
        id: submission.id,
        taskId: submission.task_id,
        taskTitle: submission.task_title,
        projectId: submission.project_id,
        projectTitle: submission.project_title,
        contributorId: submission.contributor_id,
        contributorName: submission.contributor_name,
        versionNumber: submission.version_number,
        receipt: submission.submission_receipt,
        status: submission.status,
        methodologySummary: submission.methodology_summary,
        toolsUsed: submission.tools_used,
        knownLimitations: submission.known_limitations,
        reproductionInstructions: submission.reproduction_instructions,
        createdAt: submission.created_at
      },
      files,
      evaluation: evaluation ? {
        id: evaluation.id,
        decision: evaluation.decision,
        overallFeedback: evaluation.overall_feedback,
        revisionInstructions: evaluation.revision_instructions,
        confidenceNotes: evaluation.confidence_notes,
        evaluatorType: evaluation.evaluator_type,
        modelInfo: evaluation.model_info,
        evaluatedAt: evaluation.evaluated_at,
        criteriaFindings
      } : null
    });
  } catch (err) {
    console.error('Get submission error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve submission.' });
  }
});

/**
 * GET /api/submissions/files/:fileId/download
 * Secure, access-controlled download endpoint for submitted evidence files
 */
router.get('/files/:fileId/download', authenticateUser, (req, res) => {
  try {
    const file = db.prepare(`
      SELECT sf.*, s.contributor_id, t.project_id, p.owner_id as project_owner_id
      FROM submission_files sf
      JOIN submissions s ON sf.submission_id = s.id
      JOIN tasks t ON s.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE sf.id = ?
    `).get(req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'NotFound', message: 'File not found.' });
    }

    // Access control: uploader, project owner, or expert reviewer
    const isUploader = file.contributor_id === req.user.id;
    const isOwner = file.project_owner_id === req.user.id;
    const isExpert = req.user.activeRole === 'expert';

    if (!isUploader && !isOwner && !isExpert) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to download this research evidence file.'
      });
    }

    if (!fs.existsSync(file.storage_path)) {
      return res.status(404).json({ error: 'NotFound', message: 'File asset does not exist on storage.' });
    }

    // Record audit event for sensitive file access
    recordAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.activeRole,
      eventType: 'FILE_DOWNLOADED',
      entityType: 'submission_file',
      entityId: file.id,
      metadata: { originalName: file.original_name, sha256: file.sha256_hash }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('X-Content-Sha256', file.sha256_hash);

    const fileStream = fs.createReadStream(file.storage_path);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download file error:', err);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to download file.' });
  }
});

module.exports = router;
