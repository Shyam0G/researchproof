import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import {
  Award,
  TrendingUp,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function SponsorDashboard({ navigate }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSponsorReports() {
      try {
        setLoading(true);
        const res = await api.get('/ledger/sponsor-reports');
        setReports(res.reports || []);
      } catch (err) {
        console.error('Error loading sponsor reports:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSponsorReports();
  }, []);

  const totalCommitted = reports.reduce((sum, r) => sum + (r.creditBudget || 0), 0);
  const totalAwarded = reports.reduce((sum, r) => sum + (r.awardedCredits || 0), 0);
  const totalContributors = reports.reduce((sum, r) => sum + (r.activeContributorsCount || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Sponsor & Funder Oversight Dashboard</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {user?.fullName} &bull; Verified Research Impact & Grant Stewardship
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/sponsor/reports')}>
            Aggregate Reports
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/ledger')}>
            <ShieldCheck size={16} /> Audit Ledger
          </button>
        </div>
      </div>

      {/* Confidentiality Reminder Banner */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <Lock size={20} color="#60a5fa" />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>Confidentiality Safeguard Active:</strong> As a sponsor, you receive verified contribution statistics, aggregate milestones, and auditable credit distribution records without unauthenticated exposure to sensitive participant datasets or proprietary laboratory notes.
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="stat-val">{reports.length}</div>
            <div className="stat-lbl">Sponsored Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Coins size={24} />
          </div>
          <div>
            <div className="stat-val">{totalCommitted}</div>
            <div className="stat-lbl">Committed Credit Grants</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-val">{totalAwarded}</div>
            <div className="stat-lbl">Verified Distributed Credits</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-val">{totalContributors}</div>
            <div className="stat-lbl">Funded Researchers</div>
          </div>
        </div>
      </div>

      {/* Sponsored Project Progress */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Project Progress & Milestones</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {reports.map(r => (
            <div key={r.projectId} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {r.category}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem', marginBottom: '0.25rem' }}>{r.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Principal Investigator: {r.owner?.name} &bull; {r.owner?.institution}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
                    {r.taskStats?.completionPercentage}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks Completed</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 8, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ width: `${r.taskStats?.completionPercentage}%`, height: '100%', background: '#10b981', borderRadius: 4 }} />
              </div>

              {/* Milestone breakdown */}
              {r.milestones && r.milestones.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    PROJECT MILESTONES:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {r.milestones.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle2 size={16} color={m.status === 'completed' ? '#10b981' : 'var(--text-dim)'} />
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{m.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>{m.target_date}</span>
                          <Badge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-footer" style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Credit Budget: <strong>{r.creditBudget}</strong> &bull; Distributed: <strong>{r.awardedCredits}</strong>
                </span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/projects/${r.projectId}`)}>
                  View Permitted Overview
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
