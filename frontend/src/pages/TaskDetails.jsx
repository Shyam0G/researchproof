import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import {
  Compass,
  CheckCircle,
  Clock,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  ArrowRight,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function TaskDetails({ taskId, navigate }) {
  const { user, activeRole } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(null);

  useEffect(() => {
    async function loadTask() {
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

    if (taskId) loadTask();
  }, [taskId]);

  const handleAcceptTask = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await api.post(`/tasks/${taskId}/accept`, {});
      setAcceptSuccess(`Task terms locked! You have accepted this task for ${res.lockedCreditReward} credits.`);
      // Reload task to reflect accepted status
      const updated = await api.get(`/tasks/${taskId}`);
      setTask(updated.task);
    } catch (err) {
      setError(err.message || 'Failed to accept task.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading task specifications...</div>;
  }

  if (error || !task) {
    return (
      <div style={{ maxWidth: 600, margin: '2rem auto' }}>
        <Alert type="error" message={error || 'Task not found.'} />
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>Back to Projects</button>
      </div>
    );
  }

  const isAssignedToMe = task.assigned_to === user?.id;
  const isAvailable = task.status === 'published';

  return (
    <div style={{ maxWidth: 900, margin: '1.5rem auto' }}>
      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/projects/${task.project_id}`)} style={{ marginBottom: '1rem' }}>
        &larr; Back to Project: {task.project_title}
      </button>

      {acceptSuccess && <Alert type="success" message={acceptSuccess} />}
      {error && <Alert type="error" message={error} />}

      {/* Task Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <Badge status={task.status} />
              <span className="badge badge-primary">{task.difficulty}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Est: {task.estimated_duration}</span>
            </div>
            <h1>{task.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Project: <strong style={{ color: 'var(--text-main)' }}>{task.project_title}</strong> &bull; Category: {task.project_category}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
              +{task.credit_reward}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Credit Reward
            </div>
          </div>
        </div>

        {/* Action button bar */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            {isAvailable && (
              <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={16} /> Open for Acceptance by Eligible Researchers
              </span>
            )}
            {isAssignedToMe && (
              <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={16} /> You have accepted this assignment terms snapshot
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isAvailable && activeRole === 'student' && (
              <button
                className="btn btn-primary"
                onClick={handleAcceptTask}
                disabled={accepting}
                style={{ gap: '0.4rem' }}
              >
                <ShieldCheck size={16} />
                {accepting ? 'Locking Terms...' : 'Accept Task Terms & Reward'}
              </button>
            )}

            {isAssignedToMe && ['accepted', 'in_progress', 'revision_required'].includes(task.status) && (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/submit/${task.id}`)}
                style={{ gap: '0.4rem' }}
              >
                <UploadCloud size={16} /> Submit My Work
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scope & Terms */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Description */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Task Description & Instructions</h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '0.925rem' }}>
              {task.description}
            </p>
          </div>

          {/* Expected Deliverables */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Expected Deliverables</h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.6, fontSize: '0.9rem' }}>
              {task.expected_deliverables}
            </p>
          </div>

          {/* Evidence Requirements */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Required Supporting Evidence</h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.6, fontSize: '0.9rem' }}>
              {task.evidence_requirements}
            </p>
          </div>

          {/* Acceptance Criteria (Rubric) */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Lock size={18} color="#60a5fa" />
              <h3>Predefined Acceptance Criteria (Rubric v{task.rubric_version})</h3>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              These terms are locked upon acceptance. The AI evaluator checks submissions strictly against these criteria:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {task.criteria?.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {i + 1}. {c.title}
                    </div>
                    {c.is_mandatory !== 0 && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Mandatory</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>Revision & Policy Rules</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {task.revision_policy}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>Required Skills</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {task.requiredSkills?.map((s, idx) => (
                <span key={idx} className="skill-pill">{s}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>Confidentiality Safeguards</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              This research task operates under <strong>{task.confidentiality_level}</strong> standards. Contributors should submit sanitized outputs, code scripts, and methodology notes. Never upload unconsented personal data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
