import React, { useState } from 'react';
import * as api from '../api';

export default function EntryModal({ entry, sectionType, onSave, onClose }) {
  const [data, setData] = useState({ ...entry });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const set = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(data);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const result = await api.uploadLogo(file);
      set('logo', result.filename);
    } catch (err) {
      alert('Logo upload failed: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const isNew = !entry.titleEn && !entry.title && !entry.labelEn && !entry.authors;

  const renderFields = () => {
    if (sectionType === 'projects') {
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={data.company || ''} onChange={e => set('company', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dates</label>
              <input className="form-input" value={data.dates || ''} onChange={e => set('dates', e.target.value)} placeholder="e.g., 10/2024 -- 02/2025" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title (EN)</label>
              <input className="form-input" value={data.titleEn || ''} onChange={e => set('titleEn', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Title (DE)</label>
              <input className="form-input" value={data.titleDe || ''} onChange={e => set('titleDe', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role (EN)</label>
              <input className="form-input" value={data.roleEn || ''} onChange={e => set('roleEn', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role (DE)</label>
              <input className="form-input" value={data.roleDe || ''} onChange={e => set('roleDe', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (EN)</label>
            <textarea className="form-textarea" value={data.descriptionEn || ''} onChange={e => set('descriptionEn', e.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Description (DE)</label>
            <textarea className="form-textarea" value={data.descriptionDe || ''} onChange={e => set('descriptionDe', e.target.value)} rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tech Stack</label>
              <input className="form-input" value={data.stack || ''} onChange={e => set('stack', e.target.value)} placeholder="e.g., React, Python, TensorFlow" />
            </div>
            <div className="form-group">
              <label className="form-label">Logo</label>
              <div className="flex gap-1 items-center">
                <span className="text-sm text-muted">{data.logo || 'none'}</span>
                <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                  {uploadingLogo ? 'Uploading...' : '📁 Upload Logo'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                Best ratio: ~3.3:1 (width:height). Fits 3cm × 0.9cm in PDF. Accepts PDF, PNG, JPG, SVG.
              </p>
            </div>
          </div>
        </>
      );
    }

    if (sectionType === 'publications') {
      return (
        <>
          <div className="form-group">
            <label className="form-label">Authors</label>
            <input className="form-input" value={data.authors || ''} onChange={e => set('authors', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" value={data.year || ''} onChange={e => set('year', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Journal</label>
              <input className="form-input" value={data.journal || ''} onChange={e => set('journal', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={data.title || ''} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">URL</label>
            <input className="form-input" value={data.url || ''} onChange={e => set('url', e.target.value)} />
          </div>
        </>
      );
    }

    if (sectionType === 'skills') {
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Label (EN)</label>
              <input className="form-input" value={data.labelEn || ''} onChange={e => set('labelEn', e.target.value)} placeholder="e.g., Programming" />
            </div>
            <div className="form-group">
              <label className="form-label">Label (DE)</label>
              <input className="form-input" value={data.labelDe || ''} onChange={e => set('labelDe', e.target.value)} placeholder="e.g., Programmierung" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Value (EN)</label>
            <textarea className="form-textarea" value={data.valueEn || ''} onChange={e => set('valueEn', e.target.value)} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Value (DE)</label>
            <textarea className="form-textarea" value={data.valueDe || ''} onChange={e => set('valueDe', e.target.value)} rows={2} />
          </div>
        </>
      );
    }

    // Default: entries type
    return (
      <>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Dates (EN)</label>
            <input className="form-input" value={data.datesEn || ''} onChange={e => set('datesEn', e.target.value)} placeholder="e.g., 01/2024 -- 06/2024" />
          </div>
          <div className="form-group">
            <label className="form-label">Dates (DE)</label>
            <input className="form-input" value={data.datesDe || ''} onChange={e => set('datesDe', e.target.value)} placeholder="e.g., 01/2024 -- 06/2024" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Title (EN)</label>
            <input className="form-input" value={data.titleEn || ''} onChange={e => set('titleEn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Title (DE)</label>
            <input className="form-input" value={data.titleDe || ''} onChange={e => set('titleDe', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subtitle (EN)</label>
            <input className="form-input" value={data.subtitleEn || ''} onChange={e => set('subtitleEn', e.target.value)} placeholder="e.g., Supervisor: Prof. ..." />
          </div>
          <div className="form-group">
            <label className="form-label">Subtitle (DE)</label>
            <input className="form-input" value={data.subtitleDe || ''} onChange={e => set('subtitleDe', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description (EN)</label>
          <textarea className="form-textarea" value={data.descriptionEn || ''} onChange={e => set('descriptionEn', e.target.value)} rows={3} />
        </div>
        <div className="form-group">
          <label className="form-label">Description (DE)</label>
          <textarea className="form-textarea" value={data.descriptionDe || ''} onChange={e => set('descriptionDe', e.target.value)} rows={3} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Link URL (optional)</label>
            <input className="form-input" value={data.linkUrl || ''} onChange={e => set('linkUrl', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Link Text (EN)</label>
            <input className="form-input" value={data.linkTextEn || ''} onChange={e => set('linkTextEn', e.target.value)} />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isNew ? 'Add Entry' : 'Edit Entry'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          {renderFields()}
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isNew ? 'Add' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
