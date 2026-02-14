import React, { useState } from 'react';

export default function ConfigsPage({ configs, sections, onEdit, onDelete, onSave, onGenerate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLang, setNewLang] = useState('en');
  const [generating, setGenerating] = useState(null);
  const [genModal, setGenModal] = useState(null);
  const [genMeta, setGenMeta] = useState({ company: '', position: '', notes: '', tags: '' });
  const [genResult, setGenResult] = useState(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const enabledEntries = {};
    for (const [key, section] of Object.entries(sections)) {
      enabledEntries[key] = section.items.map(i => i.id);
    }
    const config = {
      id: 'config-' + Date.now(),
      name: newName.trim(),
      language: newLang,
      useLogos: false,
      citationStyle: 'apa',
      sectionOrder: Object.keys(sections),
      enabledEntries,
      overrides: {},
    };
    onSave(config);
    setNewName('');
    setNewLang('en');
    setShowCreate(false);
  };

  const handleDuplicate = (config) => {
    const dup = {
      ...config,
      id: 'config-' + Date.now(),
      name: config.name + ' (Copy)',
    };
    onSave(dup);
  };

  const handleGenerate = async () => {
    if (!genModal) return;
    setGenerating(genModal);
    setGenResult(null);
    try {
      const result = await onGenerate(genModal, {
        company: genMeta.company,
        position: genMeta.position,
        notes: genMeta.notes,
        tags: genMeta.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setGenResult(result);
    } catch (err) {
      // Toast handles the error
    } finally {
      setGenerating(null);
    }
  };

  const countEntries = (config) => {
    let total = 0;
    for (const ids of Object.values(config.enabledEntries || {})) {
      total += ids.length;
    }
    return total;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Configurations</h2>
        <p>Create tailored CV configurations for different positions. Each configuration selects which entries to include and allows custom descriptions.</p>
      </div>

      <div className="mb-2">
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          + New Configuration
        </button>
      </div>

      {showCreate && (
        <div className="card mb-2">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Configuration Name</label>
              <input
                className="form-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Google SWE Application"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-select" value={newLang} onChange={e => setNewLang(e.target.value)}>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {configs.length === 0 ? (
        <div className="empty-state">
          <span className="icon">⚙️</span>
          <p>No configurations yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="config-grid">
          {configs.map(config => (
            <div className="config-card" key={config.id}>
              <h3>{config.name}</h3>
              <div className="config-meta">
                <span className={`lang-badge lang-${config.language}`}>{config.language === 'de' ? 'DE' : 'EN'}</span>
                {config.language === 'de' ? ' Deutsch' : ' English'}
                {config.useLogos && ' • Logos enabled'}
                {config.citationStyle && config.citationStyle !== 'apa' && ` • ${config.citationStyle.toUpperCase()} citations`}
              </div>
              <div className="config-stats">
                <span className="config-stat">{countEntries(config)} entries</span>
                <span className="config-stat">{(config.sectionOrder || []).length} sections</span>
                <span className="config-stat">{Object.keys(config.overrides || {}).length} overrides</span>
              </div>
              <div className="config-actions">
                <button className="btn btn-sm btn-primary" onClick={() => onEdit(config)}>Edit</button>
                <button className="btn btn-sm btn-success" onClick={() => { setGenModal(config.id); setGenMeta({ company: '', position: '', notes: '', tags: '' }); setGenResult(null); }}>
                  Generate PDF
                </button>
                <button className="btn btn-sm" onClick={() => handleDuplicate(config)}>Duplicate</button>
                <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Delete this configuration?')) onDelete(config.id); }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate PDF Modal */}
      {genModal && (
        <div className="modal-overlay" onClick={() => { setGenModal(null); setGenResult(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate PDF</h3>
              <button className="modal-close" onClick={() => { setGenModal(null); setGenResult(null); }}>&times;</button>
            </div>

            {genResult ? (
              <div className="generate-status">
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
                <p><strong>PDF generated successfully!</strong></p>
                <p className="text-muted text-sm mt-1">{genResult.filename}</p>
                <div className="mt-2">
                  <a
                    href={`/api/pdfs/${encodeURIComponent(genResult.filename)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Open PDF
                  </a>
                </div>
              </div>
            ) : generating ? (
              <div className="generate-status">
                <div className="spinner" />
                <p>Generating PDF with pdflatex...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted mb-2">
                  Fill in the details below to label this PDF in your archive.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input className="form-input" value={genMeta.company} onChange={e => setGenMeta(m => ({ ...m, company: e.target.value }))} placeholder="e.g., Google" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input className="form-input" value={genMeta.position} onChange={e => setGenMeta(m => ({ ...m, position: e.target.value }))} placeholder="e.g., Software Engineer" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={genMeta.notes} onChange={e => setGenMeta(m => ({ ...m, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input className="form-input" value={genMeta.tags} onChange={e => setGenMeta(m => ({ ...m, tags: e.target.value }))} placeholder="e.g., tech, ai, startup" />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setGenModal(null)}>Cancel</button>
                  <button className="btn btn-success" onClick={handleGenerate}>Generate PDF</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
