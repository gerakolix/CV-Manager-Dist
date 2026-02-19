import React, { useState } from 'react';
import { getPDFUrl, getTexUrl } from '../api';

export default function ArchivePage({ archive, onDelete }) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Collect all unique tags
  const allTags = [...new Set(archive.flatMap(a => a.tags || []))].sort();

  const filtered = archive
    .filter(a => {
      const s = search.toLowerCase();
      const matchesSearch = !s ||
        (a.company || '').toLowerCase().includes(s) ||
        (a.position || '').toLowerCase().includes(s) ||
        (a.notes || '').toLowerCase().includes(s) ||
        (a.configName || '').toLowerCase().includes(s) ||
        (a.filename || '').toLowerCase().includes(s);
      const matchesTag = !tagFilter || (a.tags || []).includes(tagFilter);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="page-header">
        <h2>PDF Archive</h2>
        <p>All generated CVs with labels and metadata. Never forget what you sent to whom.</p>
      </div>

      {archive.length === 0 ? (
        <div className="empty-state">
          <span className="icon">📁</span>
          <p>No PDFs generated yet. Go to Configurations to generate your first CV.</p>
        </div>
      ) : (
        <>
          <div className="archive-filters">
            <input
              className="form-input"
              placeholder="Search by company, position, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {allTags.length > 0 && (
              <select
                className="form-select"
                style={{ maxWidth: 180 }}
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              >
                <option value="">All tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <span className="text-muted text-sm">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Position</th>
                  <th>Config</th>
                  <th>Tags</th>
                  <th>Notes</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(entry.createdAt)}</td>
                    <td><strong>{entry.company || '—'}</strong></td>
                    <td>{entry.position || '—'}</td>
                    <td>
                      <span className="config-stat">
                        <span className={`lang-badge lang-${entry.language}`}>{entry.language === 'de' ? 'DE' : 'EN'}</span> {entry.configName || '—'}
                      </span>
                    </td>
                    <td>
                      {(entry.tags || []).map(t => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </td>
                    <td className="text-muted text-sm">{entry.notes || ''}</td>
                    <td>
                      <div className="btn-group">
                        <a
                          href={getPDFUrl(entry.filename)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          title="Open PDF"
                        >
                          PDF
                        </a>
                        <a
                          href={getTexUrl(entry.filename.replace(/\.pdf$/, '.tex'))}
                          download
                          className="btn btn-sm"
                          title="Download LaTeX source"
                          style={{ opacity: 0.8 }}
                        >
                          TeX
                        </a>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => { if (confirm('Delete this PDF and archive entry?')) onDelete(entry.id); }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
