import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import {
  Briefcase,
  Layers,
  Users,
  Coins,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export default function ExpertDashboard({ navigate }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    publishedTasks: 0,
    totalBudget: 0,
    allocatedCredits: 0
  });

  useEffect(() => {
    async function loadExpertData() {
      try {
        setLoading(true);
        const res = await api.get('/projects');
        const allProjects = res.projects || [];
        // Projects owned or managed by current expert
        const myProjects = allProjects.filter(p => p.owner?.id === user.id);
        setProjects(myProjects);

        let pubTasks = 0;
        let totBudget = 0;
        let spent = 0;

        for (const p of myProjects) {
          totBudget += p.creditBudget || 0;
          spent += p.spentCredits || 0;
          try {
            const taskRes = await api.get(`/projects/${p.id}/tasks`);
            pubTasks += (taskRes.tasks || []).length;
          } catch (e) {}
        }

        setStats({
          totalProjects: myProjects.length,
          publishedTasks: pubTasks,
          totalBudget: totBudget,
          allocatedCredits: spent
        });
      } catch (err) {
        console.error('Error loading expert dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadExpertData();
  }, [user]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Project Lead & Expert Dashboard</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {user?.fullName} &bull; Principal Investigator & Domain Expert
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
            Browse Ecosystem
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
            <PlusCircle size={16} /> New Research Project
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalProjects}</div>
            <div className="stat-lbl">Managed Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.publishedTasks}</div>
            <div className="stat-lbl">Published Tasks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Coins size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalBudget}</div>
            <div className="stat-lbl">Total Credit Budget</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.allocatedCredits}</div>
            <div className="stat-lbl">Allocated Credits</div>
          </div>
        </div>
      </div>

      {/* Managed Projects List */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Your Active Research Projects</h2>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/projects/new')}>
            <PlusCircle size={14} /> Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="card empty-state">
            <Briefcase className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Projects Created Yet</div>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>Create your first research project to begin formulating tasks, setting rubrics, and receiving contributions.</p>
            <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
              Launch New Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projects.map(p => {
              const remaining = Math.max(0, p.creditBudget - p.spentCredits);
              const percentSpent = p.creditBudget > 0 ? Math.round((p.spentCredits / p.creditBudget) * 100) : 0;

              return (
                <div key={p.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {p.category}
                        </span>
                        <Badge status={p.status} />
                        <span className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>
                          {p.visibility}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{p.title}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {p.shortSummary}
                      </p>

                      {/* Budget progress bar */}
                      <div style={{ maxWidth: 360, marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <span>Credit Allocation: {p.spentCredits} / {p.creditBudget}</span>
                          <span style={{ color: remaining > 0 ? '#60a5fa' : '#f87171' }}>{remaining} remaining</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${percentSpent}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'center' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/projects/${p.id}/tasks`)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Sparkles size={14} /> Task Breakdown & AI
                      </button>

                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => navigate(`/projects/${p.id}`)}
                      >
                        Project Overview
                      </button>

                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate(`/projects/${p.id}/access`)}
                      >
                        <Sliders size={14} /> Access Policy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
