import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import {
  UploadCloud,
  CheckCircle,
  Clock,
  AlertTriangle,
  Compass,
  ArrowRight,
  BookOpen
} from 'lucide-react';

export default function MyWorkspace({ navigate }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspaceTasks() {
      try {
        setLoading(true);
        const pRes = await api.get('/projects');
        const userTasks = [];

        for (const proj of (pRes.projects || [])) {
          try {
            const tRes = await api.get(`/projects/${proj.id}/tasks`);
            for (const t of (tRes.tasks || [])) {
              if (t.assigned_to === user?.id) {
                userTasks.push({
                  ...t,
                  projectId: proj.id,
                  projectTitle: proj.title
                });
              }
            }
          } catch (e) {}
        }

        setTasks(userTasks);
      } catch (err) {
        console.error('Workspace load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceTasks();
  }, [user]);

  const inProgress = tasks.filter(t => ['accepted', 'in_progress', 'submitted', 'evaluating'].includes(t.status));
  const revisions = tasks.filter(t => t.status === 'revision_required');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>My Research Workspace</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Manage your active task assignments, prepare methodologies, and upload verifiable research deliverables.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          <Compass size={16} /> Explore New Tasks
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading workspace tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <BookOpen className="empty-icon" />
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Tasks in Workspace</div>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            You haven't accepted any research tasks yet. Browse open projects to claim tasks and earn verified credits.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Find Tasks
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Revisions Required */}
          {revisions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.75rem' }}>
                <AlertTriangle size={18} />
                <span>Revisions Required ({revisions.length})</span>
              </div>

              <div className="grid-2">
                {revisions.map(t => (
                  <div key={t.id} className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <Badge status="revision_required" />
                      <span style={{ fontWeight: 700, color: '#60a5fa' }}>+{t.credit_reward} Credits</span>
                    </div>
                    <h3>{t.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Project: {t.projectTitle}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Evaluation feedback indicates missing evidence or criteria adjustments are needed.
                    </p>
                    <div className="card-footer" style={{ marginTop: '0.5rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/tasks/${t.id}`)}>
                        View Rubric
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/submit/${t.id}`)}>
                        <UploadCloud size={14} /> Submit Revision
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tasks */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Active Assignments ({inProgress.length})</h3>
            {inProgress.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tasks currently in progress.</p>
            ) : (
              <div className="grid-2">
                {inProgress.map(t => (
                  <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <Badge status={t.status} />
                        <span style={{ fontWeight: 700, color: '#60a5fa' }}>+{t.credit_reward} Credits</span>
                      </div>
                      <h3>{t.title}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Project: {t.projectTitle}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {t.description}
                      </p>
                    </div>

                    <div className="card-footer" style={{ marginTop: '1rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/tasks/${t.id}`)}>
                        Inspect Terms
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/submit/${t.id}`)}>
                        <UploadCloud size={14} /> Submit My Work
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completed.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#34d399' }}>Verified Completed Tasks ({completed.length})</h3>
              <div className="grid-3">
                {completed.map(t => (
                  <div key={t.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <Badge status="completed" />
                      <span style={{ fontWeight: 700, color: '#34d399' }}>+{t.credit_reward} Credits</span>
                    </div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{t.title}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Project: {t.projectTitle}
                    </div>
                    <button className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={() => navigate(`/submissions/history`)}>
                      View Receipt & Ledger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
