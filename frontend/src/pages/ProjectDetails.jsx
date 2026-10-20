import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import {
  Compass,
  UserCheck,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Send,
  Users,
  Award,
  Layers,
  Sliders
} from 'lucide-react';

export default function ProjectDetails({ projectId, navigate }) {
  const { user, activeRole } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Application modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [skillsSummary, setSkillsSummary] = useState('');
  const [applySuccess, setApplySuccess] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        const res = await api.get(`/projects/${projectId}`);
        setProject(res.project);
        setMembers(res.members || []);
        setMilestones(res.milestones || []);
        setTasks(res.tasks || []);

        // Fetch transparent team leader recommendation
        try {
          const recRes = await api.get(`/projects/${projectId}/recommend-leader`);
          setRecommendation(recRes);
        } catch (e) {}
      } catch (err) {
        setError(err.message || 'Failed to load project details.');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) fetchProject();
  }, [projectId]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    try {
      await api.post(`/projects/${projectId}/apply`, {
        statement,
        skillsSummary
      });
      setApplySuccess('Application submitted successfully! The project lead will review your submission.');
      setStatement('');
      setSkillsSummary('');
    } catch (err) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading project details...</div>;
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: 600, margin: '2rem auto' }}>
        <Alert type="error" title="Access Notice" message={error || 'Project not found or restricted.'} />
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>Back to Projects</button>
      </div>
    );
  }

  const isOwner = project.owner?.id === user?.id;

  return (
    <div>
      {/* Top Banner / Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              {project.category}
            </span>
            <Badge status={project.status} />
            <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.725rem' }}>
              Confidentiality: {project.confidentialityLevel}
            </span>
          </div>

          <h1>{project.title}</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Lead: <strong style={{ color: 'var(--text-main)' }}>{project.owner?.fullName}</strong> &bull; {project.owner?.institution}
            {project.sponsor && (
              <span> &bull; Sponsored by: <strong style={{ color: '#34d399' }}>{project.sponsor.fullName}</strong></span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => navigate(`/projects/${project.id}/tasks`)}>
              <Sparkles size={16} /> Manage Tasks & AI Breakdown
            </button>
          )}

          {!isOwner && activeRole === 'student' && (
            <button className="btn btn-primary" onClick={() => setApplyModalOpen(true)}>
              <Send size={16} /> Apply to Project
            </button>
          )}

          {isOwner && (
            <button className="btn btn-secondary" onClick={() => navigate(`/projects/${project.id}/access`)}>
              <Sliders size={16} /> Team & Permissions
            </button>
          )}
        </div>
      </div>

      {applySuccess && <Alert type="success" message={applySuccess} />}

      {/* Main Grid: Overview & Metadata */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Detailed Scope */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Project Scope & Background</h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '0.925rem', whiteSpace: 'pre-line' }}>
              {project.description}
            </p>
          </div>

          {/* Research Objectives */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Research Objectives & Methodology</h3>
            <div style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '0.925rem', whiteSpace: 'pre-line', marginBottom: '1rem' }}>
              {project.objectives}
            </div>

            {project.methodology && (
              <>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Scientific Methodology:</h4>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {project.methodology}
                </p>
              </>
            )}
          </div>

          {/* Published Tasks */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Research Tasks ({tasks.length})</h3>
              {isOwner && (
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/projects/${project.id}/tasks`)}>
                  <Sparkles size={14} /> Add / Generate Tasks
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No published tasks are currently available for this project.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {tasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</span>
                        <Badge status={t.status} />
                      </div>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-dim)' }}>
                        <span>Difficulty: <strong>{t.difficulty}</strong></span>
                        &bull;
                        <span>Est: <strong>{t.estimated_duration}</strong></span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                        +{t.credit_reward} <span style={{ fontSize: '0.75rem' }}>CREDITS</span>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/tasks/${t.id}`)}
                      >
                        Inspect Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Team, Budget, Leader Recommendation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Budget & Timeline card */}
          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Project Parameters</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Credit Budget:</span>
                <span style={{ fontWeight: 700 }}>{project.creditBudget}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Spent / Allocated:</span>
                <span style={{ fontWeight: 600, color: '#60a5fa' }}>{project.spentCredits}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Remaining Budget:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{project.remainingBudget}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Deadline:</span>
                <span>{project.deadline || 'Open-ended'}</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>REQUIRED SKILLS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {project.requiredSkills?.map((s, idx) => (
                  <span key={idx} className="skill-pill">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Team Leader Recommendation Panel (Specification Section 16) */}
          {recommendation && recommendation.recommendedLeader && (
            <div className="card" style={{ background: 'rgba(139, 92, 246, 0.06)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <Award size={18} />
                <span>Transparent Leader Recommendation</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
                {recommendation.tier === 'EXPERT_PRIORITY' ? 'Tier 1 Priority: Qualified Domain Expert' : 'Tier 2: Experienced Researcher Fallback'}
              </div>

              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {recommendation.recommendedLeader.fullName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {recommendation.recommendedLeader.institution} &bull; Score: <strong>{recommendation.recommendedLeader.scores?.totalScore}/100</strong>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {recommendation.explanation}
              </p>
            </div>
          )}

          {/* Authorized Team Members */}
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>Authorized Team ({members.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{m.institution}</div>
                  </div>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {applyModalOpen && (
        <div className="modal-overlay" onClick={() => setApplyModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply to Join Research Team</h3>
              <button onClick={() => setApplyModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Submit your research interest statement to project lead <strong>{project.owner?.fullName}</strong>.
                </p>

                <div className="form-group">
                  <label className="form-label">Statement of Interest & Relevant Experience</label>
                  <textarea
                    required
                    className="form-textarea"
                    placeholder="Describe your background and why you wish to contribute to this research..."
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Key Relevant Skills</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Python, Computer Vision, Documentation"
                    value={skillsSummary}
                    onChange={e => setSkillsSummary(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setApplyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={applyLoading}>
                  {applyLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
