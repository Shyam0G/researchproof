import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Alert from '../components/Alert';
import { User, Shield, Check, PlusCircle, Save } from 'lucide-react';

export default function UserProfile({ navigate }) {
  const { user, activeRole, availableRoles, switchRole, requestRole, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skillsString, setSkillsString] = useState(user?.skills?.join(', ') || '');
  const [interestsString, setInterestsString] = useState(user?.interests?.join(', ') || '');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'intermediate');
  const [availability, setAvailability] = useState(user?.availability || 'part-time');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setInstitution(user.institution || '');
      setBio(user.bio || '');
      setSkillsString(user.skills?.join(', ') || '');
      setInterestsString(user.interests?.join(', ') || '');
      setExperienceLevel(user.experienceLevel || 'intermediate');
      setAvailability(user.availability || 'part-time');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const skills = skillsString.split(',').map(s => s.trim()).filter(Boolean);
    const interests = interestsString.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await api.patch('/profiles/me', {
        fullName,
        institution,
        bio,
        skills,
        interests,
        experienceLevel,
        availability
      });

      await refreshUser();
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleAction = async (targetRole) => {
    setError(null);
    setSuccess(null);
    try {
      if (availableRoles.includes(targetRole)) {
        await switchRole(targetRole);
        setSuccess(`Switched active role to ${targetRole.toUpperCase()}.`);
      } else {
        await requestRole(targetRole);
        await switchRole(targetRole);
        setSuccess(`Role ${targetRole.toUpperCase()} enabled and activated!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to switch role.');
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Researcher Profile & Credentials</h1>
        <p className="subtitle">
          Manage your verified research credentials, skill sets, and authorized ecosystem roles.
        </p>
      </div>

      {success && <Alert type="success" message={success} />}
      {error && <Alert type="error" message={error} />}

      <div className="grid-3">
        {/* Profile Edit Form */}
        <div style={{ gridColumn: 'span 2' }}>
          <form onSubmit={handleSave} className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Personal Credentials</h3>

            <div className="form-group">
              <label className="form-label">Full Name & Academic Title</label>
              <input
                type="text"
                required
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Institution / Department</label>
              <input
                type="text"
                className="form-input"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select
                  className="form-select"
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value)}
                >
                  <option value="beginner">Beginner / Undergraduate</option>
                  <option value="intermediate">Intermediate / Graduate</option>
                  <option value="advanced">Advanced / Postdoc</option>
                  <option value="expert">Senior Expert / PI</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Research Availability</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 10-15h/week or Full-time"
                  value={availability}
                  onChange={e => setAvailability(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Research Skills (Comma Separated)</label>
              <input
                type="text"
                className="form-input"
                value={skillsString}
                onChange={e => setSkillsString(e.target.value)}
              />
              <div className="form-hint">Used by the recommendation engine to match open project tasks.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Research Interests & Domains</label>
              <input
                type="text"
                className="form-input"
                value={interestsString}
                onChange={e => setInterestsString(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Biography & Academic Summary</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 90 }}
                value={bio}
                onChange={e => setBio(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '0.4rem' }}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Roles & Account Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>Account Roles</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Click any role to switch your active profile immediately:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {['student', 'expert', 'sponsor'].map(r => {
                const isCurrent = activeRole === r;
                const isEnabled = availableRoles.includes(r);

                return (
                  <div
                    key={r}
                    style={{
                      border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {r}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isCurrent ? '#60a5fa' : isEnabled ? '#34d399' : 'var(--text-dim)' }}>
                        {isCurrent ? 'Active Profile' : isEnabled ? 'Authorized' : 'Click to Enable'}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-sm ${isCurrent ? 'btn-outline' : isEnabled ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={isCurrent}
                      onClick={() => handleRoleAction(r)}
                    >
                      {isCurrent ? 'Active' : isEnabled ? 'Switch' : 'Enable'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '0.5rem' }}>Security & ID</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>User ID: <code>{user?.id}</code></div>
              <div style={{ marginTop: '0.35rem' }}>Email: {user?.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
