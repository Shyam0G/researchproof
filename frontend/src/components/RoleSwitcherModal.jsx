import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, Check, Sparkles, X, PlusCircle } from 'lucide-react';

export default function RoleSwitcherModal({ isOpen, onClose }) {
  const { user, activeRole, availableRoles, switchRole, requestRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const rolesConfig = [
    {
      id: 'student',
      title: 'Student / Researcher',
      description: 'Discover research projects, accept clearly scoped tasks, submit methodology & evidence, earn verified credits.',
      badgeClass: 'role-badge-student'
    },
    {
      id: 'expert',
      title: 'Project Lead / Domain Expert',
      description: 'Create research projects, formulate objectives, generate AI-assisted task suggestions, review submissions, and manage teams.',
      badgeClass: 'role-badge-expert'
    },
    {
      id: 'sponsor',
      title: 'Sponsor / Funding Organization',
      description: 'Track sponsored research progress, monitor milestone completion, and review verified contribution impact reports.',
      badgeClass: 'role-badge-sponsor'
    }
  ];

  const handleSwitch = async (roleId) => {
    if (roleId === activeRole) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await switchRole(roleId);
      setMessage(`Switched active profile to ${roleId.toUpperCase()}.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to switch role.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableRole = async (roleId) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await requestRole(roleId);
      setMessage(`Role '${roleId}' enabled! You may now activate it.`);
    } catch (err) {
      setError(err.message || 'Failed to enable role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck className="brand-icon" style={{ width: 22, height: 22 }} />
            <h3>Switch Active Role / Profile</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Your account can hold multiple authorized roles. Select an active role to update your dashboard, permissions, and available research actions:
          </p>

          {message && (
            <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <Check size={16} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {rolesConfig.map(r => {
              const isCurrent = activeRole === r.id;
              const isEnabled = availableRoles.includes(r.id);

              return (
                <div
                  key={r.id}
                  style={{
                    border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className={`role-badge-btn ${r.badgeClass}`} style={{ cursor: 'default' }}>
                        {r.title}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
                          (Active Now)
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      {r.description}
                    </p>
                  </div>

                  <div>
                    {isCurrent ? (
                      <button className="btn btn-sm btn-outline" disabled style={{ opacity: 0.8 }}>
                        <Check size={14} color="#10b981" /> Active
                      </button>
                    ) : isEnabled ? (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={loading}
                        onClick={() => handleSwitch(r.id)}
                      >
                        Switch Role
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={loading}
                        onClick={() => handleEnableRole(r.id)}
                        style={{ gap: '0.35rem' }}
                      >
                        <PlusCircle size={14} /> Enable Role
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
