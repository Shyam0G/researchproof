import React, { useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import { PlusCircle, Sparkles, Shield, ArrowRight } from 'lucide-react';

export default function CreateProject({ navigate }) {
  const [title, setTitle] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Healthcare & Biomedical AI');
  const [objectives, setObjectives] = useState('');
  const [methodology, setMethodology] = useState('');
  const [skillsString, setSkillsString] = useState('Python, Data Analysis, Machine Learning');
  const [creditBudget, setCreditBudget] = useState(3000);
  const [visibility, setVisibility] = useState('public');
  const [confidentialityLevel, setConfidentialityLevel] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const requiredSkills = skillsString.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await api.post('/projects', {
        title,
        shortSummary,
        description,
        category,
        objectives,
        methodology,
        requiredSkills,
        creditBudget: Number(creditBudget),
        visibility,
        confidentialityLevel
      });

      navigate(`/projects/${res.projectId}`);
    } catch (err) {
      setError(err.message || 'Failed to create research project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Launch New Research Project</h1>
        <p className="subtitle">
          Define your research objectives, scope, credit grant budget, and confidentiality protections.
        </p>
      </div>

      <div className="card">
        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Robust Multimodal Sepsis Prediction in Critical Care"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Research Category</label>
            <select
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="Healthcare & Biomedical AI">Healthcare & Biomedical AI</option>
              <option value="Environmental Science">Environmental Science</option>
              <option value="Education Technology">Education Technology</option>
              <option value="Computational Social Science">Computational Social Science</option>
              <option value="Open Science Reproducibility">Open Science Reproducibility</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Short Summary (1-2 sentences for exploration cards)</label>
            <textarea
              required
              className="form-textarea"
              style={{ minHeight: 70 }}
              placeholder="Brief summary describing the core objective of the research..."
              value={shortSummary}
              onChange={e => setShortSummary(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Scope & Scientific Background</label>
            <textarea
              required
              className="form-textarea"
              style={{ minHeight: 140 }}
              placeholder="Comprehensive description of the research hypothesis, background, and clinical or environmental context..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Research Objectives (Numbered or Bulleted)</label>
            <textarea
              required
              className="form-textarea"
              style={{ minHeight: 100 }}
              placeholder="1. Build an open, benchmarked preprocessing module.&#10;2. Formulate reproducible acceptance rubrics.&#10;3. Benchmark interpretability against clinical ground truth."
              value={objectives}
              onChange={e => setObjectives(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Methodology & Tools</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 80 }}
              placeholder="e.g. PyTorch, Cross-validation, Contrast-limited adaptive histogram equalization (CLAHE)..."
              value={methodology}
              onChange={e => setMethodology(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Total Credit Grant Budget</label>
              <input
                type="number"
                required
                min={100}
                className="form-input"
                value={creditBudget}
                onChange={e => setCreditBudget(e.target.value)}
              />
              <div className="form-hint">Must cover rewards across all child research tasks.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Required Research Skills</label>
              <input
                type="text"
                className="form-input"
                placeholder="Python, Statistics, PyTorch, Writing"
                value={skillsString}
                onChange={e => setSkillsString(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Ecosystem Visibility</label>
              <select
                className="form-select"
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
              >
                <option value="public">Public (Visible in Explore Projects)</option>
                <option value="restricted">Restricted (Visible to authenticated researchers)</option>
                <option value="confidential">Confidential (Invited members & sponsors only)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Confidentiality Classification</label>
              <select
                className="form-select"
                value={confidentialityLevel}
                onChange={e => setConfidentialityLevel(e.target.value)}
              >
                <option value="standard">Standard Open Research</option>
                <option value="restricted">Restricted (Sanitized evidence only)</option>
                <option value="strictly_confidential">Strictly Confidential (No raw data sharing)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/projects')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Project...' : 'Publish Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
