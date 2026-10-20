import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, Key, Mail, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import Alert from '../components/Alert';

export default function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.activeRole === 'expert') navigate('/dashboard/expert');
      else if (user.activeRole === 'sponsor') navigate('/dashboard/sponsor');
      else navigate('/dashboard/student');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, requestedRole) => {
    setError(null);
    setLoading(true);
    try {
      const user = await login(demoEmail, 'Password123!', requestedRole);
      if (user.activeRole === 'expert') navigate('/dashboard/expert');
      else if (user.activeRole === 'sponsor') navigate('/dashboard/sponsor');
      else navigate('/dashboard/student');
    } catch (err) {
      setError(err.message || 'Failed to authenticate demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '2.5rem auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
          <Compass size={40} />
        </div>
        <h1>Welcome Back</h1>
        <p className="subtitle">Collaborative Research Ecosystem</p>
      </div>

      <div className="card">
        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@institution.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Platform'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border)', position: 'relative', textAlign: 'center' }}>
          <span style={{ position: 'relative', top: '-11px', background: 'var(--bg-card)', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Or Use One-Click Demo Accounts
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ justifyContent: 'space-between' }}
            onClick={() => handleDemoLogin('student@researchproof.test', 'student')}
            disabled={loading}
          >
            <span>Alex Chen (Student / Researcher)</span>
            <span className="badge badge-primary">Student</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ justifyContent: 'space-between' }}
            onClick={() => handleDemoLogin('lead@researchproof.test', 'expert')}
            disabled={loading}
          >
            <span>Dr. Sarah Mitchell (Domain Expert / Lead)</span>
            <span className="badge badge-warning">Expert</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ justifyContent: 'space-between' }}
            onClick={() => handleDemoLogin('sponsor@researchproof.test', 'sponsor')}
            disabled={loading}
          >
            <span>Global Health Foundation (Sponsor)</span>
            <span className="badge badge-success">Sponsor</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ justifyContent: 'space-between' }}
            onClick={() => handleDemoLogin('multirole@researchproof.test', 'expert')}
            disabled={loading}
          >
            <span>Jordan Lee (Multi-Role Account)</span>
            <span className="badge badge-neutral">All 3 Roles</span>
          </button>
        </div>

        <div className="card-footer" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account yet?</span>
          <button
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
          >
            Register Now
          </button>
        </div>
      </div>
    </div>
  );
}
