import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import ReceiptCard from '../components/ReceiptCard';
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  Lock
} from 'lucide-react';

export default function SubmissionDetails({ submissionId, navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSubmission() {
      try {
        setLoading(true);
        const res = await api.get(`/submissions/${submissionId}`);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load submission details.');
      } finally {
        setLoading(false);
      }
    }

    if (submissionId) loadSubmission();
  }, [submissionId]);

  const handleDownload = (fileId, fileName) => {
    // Authenticated download via browser fetch
    const token = localStorage.getItem('cre_token');
    fetch(`/api/submissions/files/${fileId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('File download unauthorized or file missing.');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert(err.message));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading submission details...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 600, margin: '2rem auto' }}>
        <Alert type="error" message={error || 'Submission not found or unauthorized.'} />
        <button className="btn btn-secondary" onClick={() => navigate('/workspace')}>Back to Workspace</button>
      </div>
    );
  }

  const { submission, files, evaluation } = data;
  const isContributor = submission.contributorId === user?.id;

  return (
    <div style={{ maxWidth: 940, margin: '1.5rem auto' }}>
      <button className="btn btn-sm btn-outline" onClick={() => navigate('/submissions/history')} style={{ marginBottom: '1rem' }}>
        &larr; Back to Submission History
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Badge status={submission.status} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Version {submission.versionNumber}</span>
          </div>
          <h1>Submission: {submission.taskTitle}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Project: <strong style={{ color: 'var(--text-main)' }}>{submission.projectTitle}</strong> &bull; Contributor: {submission.contributorName}
          </p>
        </div>

        {isContributor && submission.status === 'revision_required' && (
          <button className="btn btn-primary" onClick={() => navigate(`/submit/${submission.taskId}`)}>
            <UploadCloud size={16} /> Submit Revision
          </button>
        )}
      </div>

      {/* Cryptographic Receipt Card */}
      <ReceiptCard
        receipt={submission.receipt}
        submissionId={submission.id}
        version={submission.versionNumber}
        timestamp={submission.createdAt}
        files={files}
      />

      <div className="grid-3" style={{ marginTop: '1.5rem' }}>
        {/* Left Column: Methodology & Files */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Methodology */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Methodology & Work Summary</h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '0.925rem', whiteSpace: 'pre-line' }}>
              {submission.methodologySummary}
            </p>

            {submission.toolsUsed && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>TOOLS & FRAMEWORKS:</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {submission.toolsUsed}
                </div>
              </div>
            )}

            {submission.knownLimitations && (
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>KNOWN LIMITATIONS:</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {submission.knownLimitations}
                </div>
              </div>
            )}

            {submission.reproductionInstructions && (
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>REPRODUCTION INSTRUCTIONS:</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {submission.reproductionInstructions}
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Files */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Supporting Artifacts & Evidence ({files.length})</h3>
            {files.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No individual files attached to this submission version.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {files.map(f => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        <FileText size={16} color="#60a5fa" />
                        <span>{f.original_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          ({(f.file_size_bytes / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <div className="hash-pill" style={{ marginTop: '0.35rem', display: 'inline-block' }}>
                        SHA-256: {f.sha256_hash}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDownload(f.id, f.original_name)}
                      style={{ gap: '0.35rem' }}
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Evaluation Feedback */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>AI Evaluation Feedback</h3>

            {evaluation ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>DECISION:</span>
                  <Badge status={evaluation.decision} />
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {evaluation.overallFeedback}
                </div>

                {evaluation.revisionInstructions && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.825rem' }}>
                    <strong style={{ color: '#fbbf24' }}>Revision Guidance:</strong>
                    <p style={{ marginTop: '0.25rem', color: 'var(--text-main)' }}>{evaluation.revisionInstructions}</p>
                  </div>
                )}

                {/* Criteria findings */}
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                  CRITERIA VERIFICATION FINDINGS:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {evaluation.criteriaFindings?.map((cf, idx) => (
                    <div key={idx} style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600 }}>{cf.criterion_title}</span>
                        <span style={{ color: cf.passed ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {cf.passed ? '✓ Met' : '✗ Unmet'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>{cf.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No evaluation recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
