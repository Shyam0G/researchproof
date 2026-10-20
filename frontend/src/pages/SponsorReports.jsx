import React, { useState, useEffect } from 'react';
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
  Download,
  Users
} from 'lucide-react';

export default function SponsorReports({ navigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.get('/ledger/sponsor-reports');
        setReports(res.reports || []);
      } catch (err) {
        console.error('Error loading reports:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Award size={28} color="#34d399" />
          <h1>Authorized Sponsor & Impact Reports</h1>
        </div>
        <p className="subtitle">
          Aggregate grant allocation analytics, milestone completion tracking, and verified contribution impact metrics.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading sponsor reports...</div>
      ) : reports.length === 0 ? (
        <div className="card empty-state">
          <Award className="empty-icon" />
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Reports Available</div>
          <p style={{ fontSize: '0.875rem' }}>No projects are currently linked to your sponsor account.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {reports.map(r => (
            <div key={r.projectId} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {r.category}
                  </span>
                  <h2 style={{ fontSize: '1.35rem', marginTop: '0.25rem', marginBottom: '0.35rem' }}>{r.title}</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Lead Investigator: <strong style={{ color: 'var(--text-main)' }}>{r.owner?.name}</strong> &bull; {r.owner?.institution}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
                    {r.taskStats?.completionPercentage}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Milestone Progress
                  </div>
                </div>
              </div>

              {/* Progress metrics grid */}
              <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TOTAL CREDIT GRANT</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {r.creditBudget}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ALLOCATED IN TASKS</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.2rem' }}>
                    {r.allocatedBudget}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>VERIFIED AWARDED</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
                    {r.awardedCredits}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SUPPORTED RESEARCHERS</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.2rem' }}>
                    {r.activeContributorsCount}
                  </div>
                </div>
              </div>

              {/* Milestones list */}
              {r.milestones && r.milestones.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    GRANT MILESTONE MONITORING:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {r.milestones.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle2 size={16} color={m.status === 'completed' ? '#10b981' : 'var(--text-dim)'} />
                          <span style={{ fontWeight: 500 }}>{m.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{m.target_date}</span>
                          <Badge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-footer" style={{ marginTop: '1.25rem' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                  Confidential raw research files remain isolated under project access policy.
                </span>
                <button className="btn btn-sm btn-outline" onClick={() => navigate(`/ledger?projectId=${r.projectId}`)}>
                  View Audit Provenance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
