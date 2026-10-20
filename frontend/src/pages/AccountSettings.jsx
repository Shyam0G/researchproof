import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { Shield, Key, Server, CheckCircle2, UserCheck, Lock } from 'lucide-react';

export default function AccountSettings({ navigate }) {
  const { user, activeRole, availableRoles } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await api.get('/health');
        setHealth(res);
      } catch (e) {}
    }
    loadHealth();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Account & Security Settings</h1>
        <p className="subtitle">
          Identity authentication, session verification, active roles, and backend health status.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Identity & Session Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#60a5fa" />
            <span>Authentication & Identity Security</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>AUTHENTICATED EMAIL</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{user?.email}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>DATABASE USER ID</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: '2px' }}>{user?.id}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>ACTIVE SESSION ROLE</div>
              <div style={{ marginTop: '2px' }}>
                <span className="badge badge-primary">{activeRole}</span>
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>AUTHORIZED ROLES</div>
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '2px' }}>
                {availableRoles.map(r => (
                  <span key={r} className="badge badge-neutral">{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Backend Infrastructure Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} color="#34d399" />
            <span>Backend Diagnostic Health</span>
          </h3>

          {health ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>API SERVICE</div>
                <div style={{ fontWeight: 600, color: '#34d399', marginTop: '2px' }}>{health.status?.toUpperCase()}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>RELATIONAL DATABASE</div>
                <div style={{ fontWeight: 600, color: health.database === 'connected' ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  SQLite (WAL Mode, Foreign Keys Active)
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>AI ENGINE STATUS</div>
                <div style={{ marginTop: '2px' }}>
                  {health.aiConfigured ? (
                    <span className="badge badge-success">Gemini API Active</span>
                  ) : (
                    <span className="badge badge-primary">Deterministic Rule Engine Active</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>NODE RUNTIME</div>
                <div style={{ fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{health.nodeVersion}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Checking backend health status...</p>
          )}
        </div>

        {/* Security & Provenance Policy */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} color="#c084fc" />
            <span>Cryptographic & Privacy Principles</span>
          </h3>

          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <li>Pass/fail submission decisions are evaluated strictly against locked predefined rubrics.</li>
            <li>Assignment terms and credit rewards are immutable once accepted by a contributor.</li>
            <li>Every file upload is verified, hashed via SHA-256, and recorded in the append-only ledger.</li>
            <li>Confidential research materials are never transmitted to external AI providers without policy clearance.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
