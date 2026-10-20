const crypto = require('crypto');
const { db } = require('../db');

/**
 * Record an append-oriented event in the contribution & provenance ledger.
 * Calculates a SHA-256 checksum over the event content for tamper detection.
 */
function recordAuditEvent({
  actorId = null,
  actorRole = null,
  eventType,
  entityType,
  entityId,
  projectId = null,
  taskId = null,
  submissionId = null,
  metadata = {}
}) {
  const eventId = 'aud_' + crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const metadataString = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

  // Compute cryptographic checksum over the canonical event fields
  const contentToHash = `${eventId}|${actorId || ''}|${actorRole || ''}|${eventType}|${entityType}|${entityId}|${projectId || ''}|${taskId || ''}|${submissionId || ''}|${metadataString}|${timestamp}`;
  const sha256Checksum = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const stmt = db.prepare(`
    INSERT INTO audit_events (
      id, actor_id, actor_role, event_type, entity_type, entity_id,
      project_id, task_id, submission_id, metadata, sha256_checksum, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    eventId,
    actorId,
    actorRole,
    eventType,
    entityType,
    entityId,
    projectId,
    taskId,
    submissionId,
    metadataString,
    sha256Checksum,
    timestamp
  );

  return {
    eventId,
    sha256Checksum,
    timestamp
  };
}

module.exports = {
  recordAuditEvent
};
