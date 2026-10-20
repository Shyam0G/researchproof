import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, UserCheck, Shield } from 'lucide-react';
import Alert from '../components/Alert';

export default function Register({ navigate }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('student');
  const [skillsString, setSkillsString] = useState('Python, Data Analysis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const skills = skillsString.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const user = await register({
        fullName,
        email,
        password,
        institution,
        bio,
        role,
        skills
      });

      if (user.activeRole === 'expert') navigate('/dashboard/expert');
      else if (user.activeRole === 'sponsor') navigate('/dashboard/sponsor');
      else navigate('/dashboard/student');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '2rem auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', marginBottom: '0.75rem' }}>
          <Compass size={36} />
        </div>
        <h1>Create Researcher Account</h1>
        <p className="subtitle">Join the Collaborative Research Ecosystem</p>
      </div>

      <div className="card">
        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name & Academic Title</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Dr. Jane Doe or Alex Chen"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Institutional Email</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="jane.doe@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password (min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Initial Role</label>
            <select
              className="form-select"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="student">Student / Researcher (Accept tasks & contribute)</option>
              <option value="expert">Project Lead / Domain Expert (Create & manage projects)</option>
              <option value="sponsor">Sponsor / Funder (Oversight & funding verification)</option>
            </select>
            <div className="form-hint">You can enable and switch between additional roles at any time.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Institution / Organization</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Stanford University / Research Institute"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Research Skills (Comma Separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Python, Statistics, Computer Vision, Machine Learning"
              value={skillsString}
              onChange={e => setSkillsString(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Brief Bio & Research Interests</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 80 }}
              placeholder="Brief summary of research focus and availability..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="card-footer" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already registered?</span>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
          >
            Sign In Instead
          </button>
        </div>
      </div>
    </div>
  );
}
