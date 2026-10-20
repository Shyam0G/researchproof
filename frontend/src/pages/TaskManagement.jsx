import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import {
  Sparkles,
  PlusCircle,
  Coins,
  CheckCircle,
  Clock,
  ArrowRight,
  Trash2,
  Edit3,
  Layers,
  ShieldCheck
} from 'lucide-react';

export default function TaskManagement({ projectId, navigate }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // AI Generator Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSource, setAiSource] = useState('');

  // Manual Task Modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    requiredSkills: 'Python, Documentation',
    difficulty: 'intermediate',
    estimatedDuration: '10 hours',
    expectedDeliverables: '',
    evidenceRequirements: '',
    creditReward: 300,
    deadline: '',
    publishImmediately: true,
    criteria: [
      { title: 'Core Deliverable Completeness', description: 'Deliverable complies with all technical specifications.', isMandatory: true },
      { title: 'Methodology Documentation', description: 'Documentation of methods, parameters, and tools used.', isMandatory: true }
    ]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const pRes = await api.get(`/projects/${projectId}`);
      setProject(pRes.project);

      const tRes = await api.get(`/projects/${projectId}/tasks`);
      setTasks(tRes.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to load project tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  // Request AI task breakdown suggestions
  const handleGenerateAiTasks = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/generate`, {});
      setAiSuggestions(res.suggestions || []);
      setAiSource(res.source || 'gemini-ai');
      setAiModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to generate task suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  // Publish an AI suggested task
  const handleApproveSuggestion = async (suggestionIndex) => {
    const s = aiSuggestions[suggestionIndex];
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: s.title,
        description: s.description,
        requiredSkills: s.requiredSkills,
        difficulty: s.difficulty,
        estimatedDuration: s.estimatedDuration,
        expectedDeliverables: s.expectedDeliverables,
        evidenceRequirements: s.evidenceRequirements,
        creditReward: s.creditReward,
        deadline: '',
        revisionPolicy: s.revisionPolicy,
        criteria: s.criteria,
        publishImmediately: true
      });

      // Remove from suggestions list
      setAiSuggestions(prev => prev.filter((_, idx) => idx !== suggestionIndex));
      setSuccess(`Task '${s.title}' approved and published to the ecosystem!`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to approve task.');
    }
  };

  // Submit manual task
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        ...taskForm,
        requiredSkills: taskForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        creditReward: Number(taskForm.creditReward)
      });

      setManualModalOpen(false);
      setSuccess('Task created and published successfully!');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading task management...</div>;
  }

  const remainingBudget = project ? Math.max(0, project.creditBudget - project.spentCredits) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/projects/${projectId}`)} style={{ marginBottom: '0.75rem' }}>
            &larr; Back to Project Overview
          </button>
          <h1>Project Task Management</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {project?.title} &bull; Budget Remaining: <strong style={{ color: remainingBudget > 0 ? '#34d399' : '#f87171' }}>{remainingBudget} Credits</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerateAiTasks}
            disabled={aiLoading || remainingBudget < 50}
            style={{ gap: '0.4rem' }}
          >
            <Sparkles size={16} />
            {aiLoading ? 'Generating AI Tasks...' : 'Generate Tasks with AI'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setManualModalOpen(true)}
            disabled={remainingBudget < 50}
          >
            <PlusCircle size={16} /> Manual Task Creation
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Task List */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3>Published & Draft Research Tasks ({tasks.length})</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Allocated: <strong>{project?.spentCredits}</strong> / {project?.creditBudget} Credits
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <Layers className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Tasks Published Yet</div>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Use the AI generator or manual task creation to establish clear tasks and criteria.</p>
            <button className="btn btn-primary" onClick={handleGenerateAiTasks} disabled={remainingBudget < 50}>
              <Sparkles size={16} /> Generate Task Suggestions
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map(t => (
              <div
                key={t.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  background: 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>{t.title}</span>
                      <Badge status={t.status} />
                      {t.is_ai_generated === 1 && (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>AI Assisted</span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      <span>Difficulty: <strong style={{ color: 'var(--text-main)' }}>{t.difficulty}</strong></span>
                      &bull;
                      <span>Duration: <strong style={{ color: 'var(--text-main)' }}>{t.estimated_duration}</strong></span>
                      &bull;
                      <span>Criteria: <strong style={{ color: 'var(--text-main)' }}>{t.criteria?.length || 0} items</strong></span>
                      {t.assignee_name && (
                        <>
                          &bull;
                          <span>Assigned to: <strong style={{ color: '#60a5fa' }}>{t.assignee_name}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      +{t.credit_reward} Credits
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => navigate(`/tasks/${t.id}`)}>
                      Inspect Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Task Suggestions Modal */}
      {aiModalOpen && (
        <div className="modal-overlay" onClick={() => setAiModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 840 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="#60a5fa" />
                <h3>AI Task Breakdown Suggestions</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                <strong>Review Before Publication:</strong> These tasks were generated by <code>{aiSource}</code> based strictly on your project's non-confidential objectives and available credit budget ({remainingBudget} credits remaining). You may approve and publish them individually:
              </div>

              {aiSuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>All suggestions have been approved or dismissed.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {aiSuggestions.map((s, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{s.title}</h4>
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.775rem' }}>
                            <span className="badge badge-primary">{s.difficulty}</span>
                            <span style={{ color: 'var(--text-dim)' }}>Est: {s.estimatedDuration}</span>
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.1rem' }}>
                          {s.creditReward} Credits
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {s.description}
                      </p>

                      <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.25rem' }}>DELIVERABLES & EVIDENCE:</div>
                        <div style={{ color: 'var(--text-muted)' }}>{s.expectedDeliverables}</div>
                      </div>

                      {/* Criteria */}
                      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.35rem' }}>PREDEFINED ACCEPTANCE CRITERIA:</div>
                        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          {s.criteria?.map((c, cIdx) => (
                            <li key={cIdx} style={{ marginBottom: '0.25rem' }}>
                              <strong>{c.title}:</strong> {c.description}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setAiSuggestions(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Discard
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApproveSuggestion(idx)}
                        >
                          <CheckCircle size={14} /> Approve & Publish Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAiModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Task Creation Modal */}
      {manualModalOpen && (
        <div className="modal-overlay" onClick={() => setManualModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Research Task Manually</h3>
              <button onClick={() => setManualModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Task Description & Scope</label>
                  <textarea
                    required
                    className="form-textarea"
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Credit Reward (Budget Left: {remainingBudget})</label>
                    <input
                      type="number"
                      required
                      min={50}
                      max={remainingBudget}
                      className="form-input"
                      value={taskForm.creditReward}
                      onChange={e => setTaskForm({ ...taskForm, creditReward: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-select"
                      value={taskForm.difficulty}
                      onChange={e => setTaskForm({ ...taskForm, difficulty: e.target.value })}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Deliverables</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={taskForm.expectedDeliverables}
                    onChange={e => setTaskForm({ ...taskForm, expectedDeliverables: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Required Supporting Evidence</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={taskForm.evidenceRequirements}
                    onChange={e => setTaskForm({ ...taskForm, evidenceRequirements: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setManualModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create & Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
