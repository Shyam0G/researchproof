import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import {
  Shield,
  Users,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  Sliders,
  UserPlus
} from 'lucide-react';

export default function ProjectAccessManagement({ projectId, navigate }) {
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Policy form
  const [visibility, setVisibility] = useState('public');
  const [confidentialityLevel, setConfidentialityLevel] = useState('standard');
  const [updatingPolicy, setUpdatingPolicy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const pRes = await api.get(`/projects/${projectId}`);
      setProject(pRes.project);
      setMembers(pRes.members || []);
      setVisibility(pRes.project.visibility);
      setConfidentialityLevel(pRes.project.confidentialityLevel);

      // Fetch applications from audit events / applications table
      const auditRes = await api.get(`/ledger?projectId=${projectId}&eventType=APPLICATION_SUBMITTED`);
      setApplications(auditRes.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load project access settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    setUpdatingPolicy(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/projects/${projectId}`, {
        visibility,
        confidentialityLevel
      });
      setSuccess('Project confidentiality and access policy updated successfully.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update access policy.');
    } finally {
      setUpdatingPolicy(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading access management...</div>;
  }

  return (
    <div style={{ maxWidth: 860, margin: '1.5rem auto' }}>
      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/projects/${projectId}`)} style={{ marginBottom: '1rem' }}>
        &larr; Back to Project Overview
      </button>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Project Access & Confidentiality Controls</h1>
        <p className="subtitle">
          Configure confidentiality classifications, manage team roles, and review contributor access applications.
        </p>
      </div>

      {success && <Alert type="success" message={success} />}
      {error && <Alert type="error" message={error} />}

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        {/* Left: Policy Settings (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <form onSubmit={handleUpdatePolicy} className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} color="#60a5fa" />
              <span>Confidentiality & Ecosystem Visibility</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Ecosystem Visibility</label>
              <select
                className="form-select"
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
              >
                <option value="public">Public - Searchable in Explore Projects</option>
                <option value="restricted">Restricted - Authenticated Researchers Only</option>
                <option value="confidential">Confidential - Invited Members & Sponsor Observers Only</option>
              </select>
              <div className="form-hint">
                Controls whether non-team members can view project metadata and published tasks.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Research Confidentiality Classification</label>
              <select
                className="form-select"
                value={confidentialityLevel}
                onChange={e => setConfidentialityLevel(e.target.value)}
              >
                <option value="standard">Standard - Open science methodology</option>
                <option value="restricted">Restricted - Sanitized outputs only, protected raw data</option>
                <option value="strictly_confidential">Strictly Confidential - No external AI processing or unconsented data sharing</option>
              </select>
              <div className="form-hint">
                Enforces backend restrictions preventing raw file transmission to external AI providers.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingPolicy}>
              {updatingPolicy ? 'Updating Policy...' : 'Save Policy Settings'}
            </button>
          </form>
        </div>

        {/* Right: Security summary */}
        <div>
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} color="#34d399" />
              <span>Ethics Safeguards</span>
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Student contributors only see the specific instructions and evidence files required for their accepted task. Sponsors receive aggregate milestone reports without unauthenticated access to internal laboratory notes.
            </p>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Authorized Team Members ({members.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {members.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.fullName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {m.email} &bull; {m.institution}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                  {m.role}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Joined {new Date(m.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contributor Applications Log */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Contributor Applications Audit</h3>
        {applications.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No recent external applications submitted for this project.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {applications.map(app => (
              <div
                key={app.id}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{app.actorName || 'Applicant'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Applied on {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <span className="badge badge-warning">Application Logged</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
