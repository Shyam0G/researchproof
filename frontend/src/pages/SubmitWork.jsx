import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import ReceiptCard from '../components/ReceiptCard';
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Lock,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';

export default function SubmitWork({ taskId, navigate }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form inputs
  const [methodologySummary, setMethodologySummary] = useState('');
  const [toolsUsed, setToolsUsed] = useState('');
  const [knownLimitations, setKnownLimitations] = useState('');
  const [reproductionInstructions, setReproductionInstructions] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Result state
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    async function loadTaskData() {
      try {
        setLoading(true);
        const res = await api.get(`/tasks/${taskId}`);
        setTask(res.task);
      } catch (err) {
        setError(err.message || 'Failed to load task details.');
      } finally {
        setLoading(false);
      }
    }

    if (taskId) loadTaskData();
  }, [taskId]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const maxFiles = 5;
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    for (const file of files) {
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        setError(`Maximum of ${maxFiles} files allowed per submission.`);
        break;
      }
      if (file.size > maxSizeBytes) {
        setError(`File '${file.name}' exceeds maximum size of 10 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!methodologySummary.trim()) {
      setError('Please provide a complete methodology and work summary.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('taskId', taskId);
      formData.append('methodologySummary', methodologySummary.trim());
      formData.append('toolsUsed', toolsUsed.trim());
      formData.append('knownLimitations', knownLimitations.trim());
      formData.append('reproductionInstructions', reproductionInstructions.trim());

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await api.upload('/submissions', formData);
      setSubmissionResult(res);
    } catch (err) {
      setError(err.message || 'Failed to submit work.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading submission interface...</div>;
  }

  if (!task) {
    return (
      <div style={{ maxWidth: 600, margin: '2rem auto' }}>
        <Alert type="error" message={error || 'Task not found.'} />
        <button className="btn btn-secondary" onClick={() => navigate('/workspace')}>Back to Workspace</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 940, margin: '1.5rem auto' }}>
      <button className="btn btn-sm btn-outline" onClick={() => navigate('/workspace')} style={{ marginBottom: '1rem' }}>
        &larr; Back to Workspace
      </button>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Submit My Work</h1>
        <p className="subtitle">
          Submit methodology, code, reproduction steps, and supporting artifacts for automated peer evaluation.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Submission Success & Evaluation Findings */}
      {submissionResult && (
        <div style={{ marginBottom: '2.5rem' }}>
          <Alert
            type={submissionResult.decision === 'accepted' ? 'success' : 'warning'}
            title={submissionResult.decision === 'accepted' ? 'Submission Accepted & Verified!' : 'Evaluation Completed: Revision Required'}
            message={submissionResult.message}
          />

          {/* Cryptographic Receipt */}
          <ReceiptCard
            receipt={submissionResult.receipt}
            submissionId={submissionResult.submissionId}
            version={submissionResult.versionNumber}
            files={submissionResult.filesUploaded}
          />

          {/* Criterion Findings Breakdown */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Criterion-by-Criterion Evaluation Findings</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Overall Evaluation Feedback: <em>{submissionResult.overallFeedback}</em>
            </p>

            {submissionResult.revisionInstructions && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>Revision Guidance:</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                  {submissionResult.revisionInstructions}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {submissionResult.criteriaFindings?.map((cf, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {cf.criterionTitle}
                    </div>
                    <Badge status={cf.passed ? 'accepted' : 'revision_required'} text={cf.passed ? 'Passed' : 'Needs Work'} />
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {cf.explanation}
                  </div>
                  {cf.missingEvidence && cf.missingEvidence !== 'None' && (
                    <div style={{ fontSize: '0.775rem', color: '#f87171' }}>
                      Missing Evidence: {cf.missingEvidence}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/workspace')}>
                Return to Workspace
              </button>
              {submissionResult.decision !== 'accepted' && (
                <button className="btn btn-primary" onClick={() => setSubmissionResult(null)}>
                  Prepare Revised Resubmission
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Submission Form (when not showing result) */}
      {!submissionResult && (
        <div className="grid-3">
          {/* Left Form (2 cols) */}
          <div style={{ gridColumn: 'span 2' }}>
            <form onSubmit={handleSubmit} className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Methodology & Supporting Evidence</h3>

              <div className="form-group">
                <label className="form-label">Methodology & Work Summary (Required)</label>
                <textarea
                  required
                  className="form-textarea"
                  style={{ minHeight: 140 }}
                  placeholder="Detail the exact methods, algorithmic steps, assumptions, data cleansing steps, or experiments performed..."
                  value={methodologySummary}
                  onChange={e => setMethodologySummary(e.target.value)}
                />
                <div className="form-hint">
                  Explain: (1) what work was completed, (2) which methods were applied, and (3) which findings or outputs are included.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tools & Frameworks Used</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Python 3.11, PyTorch 2.1, OpenCV, Pandas, LaTeX"
                  value={toolsUsed}
                  onChange={e => setToolsUsed(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Known Limitations & Assumptions</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 75 }}
                  placeholder="Disclose any sample constraints, edge cases, or environment requirements..."
                  value={knownLimitations}
                  onChange={e => setKnownLimitations(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reproduction Instructions</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 75 }}
                  placeholder="Commands or instructions for another researcher to independently replicate your outputs..."
                  value={reproductionInstructions}
                  onChange={e => setReproductionInstructions(e.target.value)}
                />
              </div>

              {/* File Upload Zone */}
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Attach Supporting Artifacts (Max 5 files, 10MB each)</label>
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-input)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    multiple
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.zip"
                  />
                  <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <UploadCloud size={32} color="#60a5fa" />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      Click to Browse Files or Drag & Drop Here
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Accepted formats: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG, ZIP
                    </span>
                  </label>
                </div>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    FILES READY FOR SUBMISSION ({selectedFiles.length}/5):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedFiles.map((file, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-surface)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="#60a5fa" />
                          <span style={{ fontWeight: 500 }}>{file.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/workspace')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <UploadCloud size={16} />
                  {submitting ? 'Verifying & Evaluating...' : 'Submit Work for Evaluation'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Locked Terms Snapshot */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '5.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <Lock size={16} />
                <span>Locked Assignment Snapshot</span>
              </div>

              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{task.title}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                Reward: <strong style={{ color: '#60a5fa' }}>+{task.credit_reward} Credits</strong> &bull; {task.difficulty}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>EXPECTED DELIVERABLES:</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {task.expected_deliverables}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>EVIDENCE REQUIREMENTS:</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {task.evidence_requirements}
                </div>
              </div>

              {/* Predefined Rubric Criteria */}
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                  EVALUATION CRITERIA CHECKLIST:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {task.criteria?.map((c, idx) => (
                    <div key={idx} style={{ fontSize: '0.775rem', color: 'var(--text-main)' }}>
                      &bull; <strong>{c.title}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
