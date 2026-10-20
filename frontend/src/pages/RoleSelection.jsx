import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, BookOpen, Briefcase, Award, CheckCircle, ArrowRight } from 'lucide-react';
import Alert from '../components/Alert';

export default function RoleSelection({ navigate }) {
  const { user, activeRole, availableRoles, switchRole, requestRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const roles = [
    {
      id: 'student',
      title: 'Student / Researcher',
      icon: <BookOpen size={28} color="#60a5fa" />,
      dashboard: '/dashboard/student',
      description: 'Discover active scientific investigations, accept clearly scoped tasks, submit verifiable methodology and evidence, and build verified attribution ledger records.'
    },
    {
      id: 'expert',
      title: 'Project Lead / Domain Expert',
      icon: <Briefcase size={28} color="#c084fc" />,
      dashboard: '/dashboard/expert',
      description: 'Create and lead research projects, formulate objectives, utilize AI assistance to formulate task rubrics and acceptance criteria, and conduct expert reviews.'
    },
    {
      id: 'sponsor',
      title: 'Sponsor / Funding Partner',
      icon: <Award size={28} color="#34d399" />,
      dashboard: '/dashboard/sponsor',
      description: 'Fund innovative projects, monitor milestones and credit allocations, and inspect aggregate research impact reports without accessing confidential data.'
    }
  ];

  const handleSelectRole = async (roleId, dashboardPath) => {
    setLoading(true);
    setError(null);
    try {
      if (!availableRoles.includes(roleId)) {
        await requestRole(roleId);
      }
      await switchRole(roleId);
      navigate(dashboardPath);
    } catch (err) {
      setError(err.message || 'Failed to switch profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1>Select Your Active Research Profile</h1>
        <p className="subtitle">
          Your account ({user?.email}) is authorized to operate across multiple scientific roles. Choose your active workspace:
        </p>
      </div>

      {message && <Alert type="success" message={message} />}
      {error && <Alert type="error" message={error} />}

      <div className="grid-3">
        {roles.map(r => {
          const isCurrent = activeRole === r.id;
          const isEnabled = availableRoles.includes(r.id);

          return (
            <div
              key={r.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: isCurrent ? 'var(--primary)' : undefined,
                background: isCurrent ? 'rgba(59, 130, 246, 0.05)' : undefined
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    {r.icon}
                  </div>
                  {isCurrent && <span className="badge badge-primary">Active Now</span>}
                  {!isCurrent && isEnabled && <span className="badge badge-success">Authorized</span>}
                </div>

                <h3>{r.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
                  {r.description}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  className={`btn ${isCurrent ? 'btn-primary' : isEnabled ? 'btn-secondary' : 'btn-outline'}`}
                  style={{ width: '100%', gap: '0.5rem' }}
                  disabled={loading}
                  onClick={() => handleSelectRole(r.id, r.dashboard)}
                >
                  <span>{isCurrent ? 'Enter Dashboard' : isEnabled ? 'Switch to this Role' : 'Enable & Enter'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
