import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { Search, Filter, Layers, Compass, ArrowRight, User } from 'lucide-react';

export default function ExploreProjects({ navigate }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [skill, setSkill] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (category) queryParams.set('category', category);
      if (skill) queryParams.set('skill', skill);
      if (status) queryParams.set('status', status);

      const res = await api.get(`/projects?${queryParams.toString()}`);
      setProjects(res.projects || []);
    } catch (err) {
      console.error('Fetch projects error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [category, skill, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Explore Research Projects</h1>
        <p className="subtitle">
          Discover open scientific investigations, transparent methodologies, and accredited contribution opportunities.
        </p>

        {/* Search & Filter Toolbar */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 220, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search title, objectives, or keywords..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, minWidth: 160 }}>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Healthcare & Biomedical AI">Healthcare & Biomedical AI</option>
                <option value="Environmental Science">Environmental Science</option>
                <option value="Education Technology">Education Technology</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Filter by skill..."
                value={skill}
                onChange={e => setSkill(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ gap: '0.4rem' }}>
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading research projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="card empty-state">
          <Compass className="empty-icon" />
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Projects Found</div>
          <p style={{ fontSize: '0.875rem' }}>Try clearing your search filters to view all available research initiatives.</p>
        </div>
      ) : (
        <div className="grid-2">
          {projects.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {p.category}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Badge status={p.status} />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{p.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                  <User size={14} />
                  <span>Lead: {p.owner?.fullName} &bull; {p.owner?.institution}</span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.shortSummary}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem' }}>
                  {p.requiredSkills?.map((s, idx) => (
                    <span key={idx} className="skill-pill">{s}</span>
                  ))}
                </div>
              </div>

              <div className="card-footer" style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  <strong>{p.availableTaskCount || 0}</strong> Tasks Available &bull; Budget: <strong>{p.creditBudget}</strong> Credits
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/projects/${p.id}`)}>
                  <span>View Project</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
