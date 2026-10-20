import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Hash,
  Database
} from 'lucide-react';

export default function ContributionLedger({ navigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [verificationResults, setVerificationResults] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const query = eventTypeFilter ? `?eventType=${eventTypeFilter}` : '';
      const res = await api.get(`/ledger${query}`);
      setEvents(res.events || []);
    } catch (err) {
      console.error('Ledger load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [eventTypeFilter]);

  const verifyIntegrity = async (eventId) => {
    setVerifyingId(eventId);
    try {
      const res = await api.post('/ledger/verify', { eventId });
      setVerificationResults(prev => ({
        ...prev,
        [eventId]: res
      }));
    } catch (err) {
      setVerificationResults(prev => ({
        ...prev,
        [eventId]: { integrityVerified: false, verdict: err.message }
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <ShieldCheck size={28} color="#60a5fa" />
            <h1>Contribution Provenance & Audit Ledger</h1>
          </div>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Tamper-evident event log recording research milestones, task acceptance snapshots, file uploads, evaluations, and credit rewards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select
            className="form-select"
            value={eventTypeFilter}
            onChange={e => setEventTypeFilter(e.target.value)}
            style={{ width: 220 }}
          >
            <option value="">All Event Types</option>
            <option value="PROJECT_CREATED">PROJECT_CREATED</option>
            <option value="TASK_PUBLISHED">TASK_PUBLISHED</option>
            <option value="TASK_ACCEPTED">TASK_ACCEPTED</option>
            <option value="SUBMISSION_CREATED">SUBMISSION_CREATED</option>
            <option value="EVALUATION_COMPLETED">EVALUATION_COMPLETED</option>
            <option value="CREDIT_AWARDED">CREDIT_AWARDED</option>
            <option value="ROLE_SWITCHED">ROLE_SWITCHED</option>
          </select>

          <button className="btn btn-secondary" onClick={loadLedger}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Ledger explanation alert */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <strong style={{ color: 'var(--text-main)' }}>Cryptographic Integrity Verification:</strong> Each ledger event contains a server-computed SHA-256 checksum over its canonical fields. Click <em>"Verify Hash"</em> on any record to independently recalculate and confirm tamper-free integrity.
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading audit ledger...</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <Database className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Ledger Events Found</div>
            <p style={{ fontSize: '0.875rem' }}>Events will appear as researchers accept tasks, submit artifacts, and receive credits.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Actor / Role</th>
                  <th>Entity / Scope</th>
                  <th>Cryptographic Checksum (SHA-256)</th>
                  <th>Timestamp</th>
                  <th>Integrity Check</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => {
                  const check = verificationResults[ev.id];
                  return (
                    <tr key={ev.id}>
                      <td>
                        <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {ev.eventType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ev.actorName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{ev.actorRole || 'System'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ev.projectTitle || ev.entityType}</div>
                        {ev.taskTitle && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Task: {ev.taskTitle}</div>
                        )}
                      </td>
                      <td>
                        <span className="hash-pill" title={ev.sha256Checksum}>
                          {ev.sha256Checksum ? ev.sha256Checksum.slice(0, 16) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                      <td>
                        {check ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: check.integrityVerified ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {check.integrityVerified ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                            <span>{check.integrityVerified ? 'Verified Intact' : 'Checksum Mismatch'}</span>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => verifyIntegrity(ev.id)}
                            disabled={verifyingId === ev.id}
                            style={{ gap: '0.35rem' }}
                          >
                            <ShieldCheck size={14} />
                            {verifyingId === ev.id ? 'Checking...' : 'Verify Hash'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
