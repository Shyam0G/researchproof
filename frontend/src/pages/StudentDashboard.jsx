import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import {
  Coins,
  CheckCircle,
  Clock,
  AlertTriangle,
  UploadCloud,
  Compass,
  ArrowRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function StudentDashboard({ navigate }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [activeTasks, setActiveTasks] = useState([]);
  const [revisionTasks, setRevisionTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      try {
        setLoading(true);
        // 1. Credits
        const credRes = await api.get('/credits/me');
        setCredits(credRes.balance || 0);

        // 2. Discover projects
        const projRes = await api.get('/projects');
        setRecommendedProjects(projRes.projects?.slice(0, 3) || []);

        // 3. User tasks from projects
        // Find tasks assigned to current student
        const tasksList = [];
        for (const proj of (projRes.projects || [])) {
          try {
            const taskRes = await api.get(`/projects/${proj.id}/tasks`);
            for (const t of (taskRes.tasks || [])) {
              if (t.assigned_to === user.id) {
                tasksList.push({ ...t, projectTitle: proj.title });
              }
            }
          } catch (e) {}
        }

        setActiveTasks(tasksList.filter(t => ['accepted', 'in_progress', 'submitted', 'evaluating'].includes(t.status)));
        setRevisionTasks(tasksList.filter(t => t.status === 'revision_required'));
        setCompletedTasks(tasksList.filter(t => t.status === 'completed'));
      } catch (err) {
        console.error('Error loading student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [user]);

  return (
    <div>
      {/* Welcome header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Researcher Dashboard</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Welcome back, <strong style={{ color: 'var(--text-main)' }}>{user?.fullName}</strong> &bull; {user?.institution || 'Independent Researcher'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/workspace')}>
            <UploadCloud size={16} /> My Workspace
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            <Compass size={16} /> Explore Projects
          </button>
        </div>
      </div>

      {/* Skills banner */}
      {user?.skills && user.skills.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Skills:</span>
          {user.skills.map((s, idx) => (
            <span key={idx} className="skill-pill">{s}</span>
          ))}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Coins size={24} />
          </div>
          <div>
            <div className="stat-val">{credits}</div>
            <div className="stat-lbl">Earned Research Credits</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-val">{activeTasks.length}</div>
            <div className="stat-lbl">Active Accepted Tasks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-val">{revisionTasks.length}</div>
            <div className="stat-lbl">Revisions Required</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-val">{completedTasks.length}</div>
            <div className="stat-lbl">Completed Contributions</div>
          </div>
        </div>
      </div>

      {/* Revision Required Alert Banner */}
      {revisionTasks.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <span>Action Required: Submissions Awaiting Revision</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            The following task submission did not fulfill all mandatory acceptance criteria. Review the rubric findings and submit your corrected version:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {revisionTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project: {t.projectTitle} &bull; Reward: {t.credit_reward} Credits</div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/submit/${t.id}`)}>
                  Submit Revision
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks in Progress */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Your Accepted Tasks</h2>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/workspace')}>
            View All in Workspace
          </button>
        </div>

        {activeTasks.length === 0 ? (
          <div className="card empty-state">
            <BookOpen className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Active Tasks</div>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>You have not accepted any pending research tasks. Explore open projects to find tasks matching your skills.</p>
            <button className="btn btn-primary" onClick={() => navigate('/projects')}>
              Explore Open Projects
            </button>
          </div>
        ) : (
          <div className="grid-2">
            {activeTasks.map(t => (
              <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <Badge status={t.status} />
                    <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.9rem' }}>
                      +{t.credit_reward} Credits
                    </span>
                  </div>
                  <h3>{t.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Project: {t.projectTitle}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description}
                  </p>
                </div>

                <div className="card-footer" style={{ marginTop: '1rem' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => navigate(`/tasks/${t.id}`)}>
                    View Criteria
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => navigate(`/submit/${t.id}`)}>
                    <UploadCloud size={14} /> Submit Work
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Projects based on profile */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Recommended Research Projects</h2>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/projects')}>
            Browse All ({recommendedProjects.length})
          </button>
        </div>

        <div className="grid-3">
          {recommendedProjects.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {p.category}
                  </span>
                  <Badge status={p.status} />
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{p.title}</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.85rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.shortSummary}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {p.requiredSkills?.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="skill-pill">{s}</span>
                  ))}
                </div>
              </div>

              <div className="card-footer" style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {p.availableTaskCount || 0} tasks available
                </span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/projects/${p.id}`)}>
                  View Project
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
