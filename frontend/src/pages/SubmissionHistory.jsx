import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { FileText, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function SubmissionHistory({ navigate }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        // Load audit events for submissions by user or tasks
        const res = await api.get('/ledger?limit=100');
        const subEvents = (res.events || []).filter(e =>
          (e.eventType === 'SUBMISSION_CREATED' || e.eventType === 'RESUBMISSION_CREATED') &&
          e.actorId === user?.id
        );

        // Fetch detailed submission records
        const list = [];
        for (const ev of subEvents) {
          if (ev.submissionId) {
            try {
              const subDetail = await api.get(`/submissions/${ev.submissionId}`);
              list.push(subDetail.submission);
            } catch (e) {}
          }
        }

        // Deduplicate by ID
        const unique = Array.from(new Map(list.map(s => [s.id, s])).values());
        setSubmissions(unique);
      } catch (err) {
        console.error('Error loading submission history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Submission History & Provenance</h1>
        <p className="subtitle">
          Auditable record of all submitted deliverables, versions, receipts, and evaluation findings.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            Loading submission history...
          </div>
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Submissions Found</div>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              You have not submitted work for any research tasks yet.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/workspace')}>
              Go to My Workspace
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt / Identifier</th>
                  <th>Task Title</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="hash-pill">{s.receipt}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.taskTitle}</td>
                    <td>Version {s.versionNumber}</td>
                    <td><Badge status={s.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate(`/submissions/${s.id}`)}
                      >
                        Inspect Feedback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
