import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EntryModal from '../components/EntryModal';
import * as api from '../api';

const DEFAULT_SECTION_META = {
  experience:       { icon: '💼', addLabel: 'Add Position' },
  education:        { icon: '🎓', addLabel: 'Add Education' },
  publications:     { icon: '📄', addLabel: 'Add Publication' },
  softwareProjects: { icon: '💻', addLabel: 'Add Project' },
  volunteering:     { icon: '🤝', addLabel: 'Add Activity' },
  skills:           { icon: '🛠️', addLabel: 'Add Skill' },
  awards:           { icon: '🏆', addLabel: 'Add Award' },
};

const SECTION_TYPE_ICONS = {
  entries: '📋',
  projects: '💻',
  publications: '📄',
  skills: '🛠️',
};

function SortableEntryCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="sortable-entry">
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

export default function EntriesPage({ sections, profile, onSaveSections, onSaveProfile }) {
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [profileDraft, setProfileDraft] = useState(null);
  const [uploading, setUploading] = useState(false);
  // Reorder mode state
  const [reorderSection, setReorderSection] = useState(null);
  const [reorderItems, setReorderItems] = useState([]);
  // Section management
  const [renamingSection, setRenamingSection] = useState(null);
  const [renameEn, setRenameEn] = useState('');
  const [renameDe, setRenameDe] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionKey, setNewSectionKey] = useState('');
  const [newSectionLabelEn, setNewSectionLabelEn] = useState('');
  const [newSectionLabelDe, setNewSectionLabelDe] = useState('');
  const [newSectionType, setNewSectionType] = useState('entries');

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Profile editing
  const startEditProfile = () => setProfileDraft({ ...profile });
  const cancelEditProfile = () => setProfileDraft(null);
  const saveProfile = () => { onSaveProfile(profileDraft); setProfileDraft(null); };
  const pf = (field, value) => setProfileDraft(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadPhoto(file);
      if (profileDraft) {
        pf('photo', result.filename);
      } else {
        onSaveProfile({ ...profile, photo: result.filename });
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Reorder mode ──────────────────────────────────────────────────────
  const startReorder = (sectionKey) => {
    setReorderSection(sectionKey);
    setReorderItems([...sections[sectionKey].items]);
  };

  const handleReorderDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setReorderItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const applyReorder = () => {
    const newSections = { ...sections };
    newSections[reorderSection] = { ...newSections[reorderSection], items: [...reorderItems] };
    onSaveSections(newSections);
    setReorderSection(null);
    setReorderItems([]);
  };

  const cancelReorder = () => {
    setReorderSection(null);
    setReorderItems([]);
  };

  // ── Section rename ──────────────────────────────────────────────────────
  const startRename = (key) => {
    setRenamingSection(key);
    setRenameEn(sections[key].labelEn);
    setRenameDe(sections[key].labelDe);
  };

  const saveRename = () => {
    if (!renameEn.trim()) return;
    const newSections = { ...sections };
    newSections[renamingSection] = { ...newSections[renamingSection], labelEn: renameEn.trim(), labelDe: renameDe.trim() || renameEn.trim() };
    onSaveSections(newSections);
    setRenamingSection(null);
  };

  // ── Add custom section ──────────────────────────────────────────────────
  const addSection = () => {
    const key = newSectionKey.trim().replace(/[^a-zA-Z0-9]/g, '') || ('custom' + Date.now());
    if (sections[key]) { alert('A section with this key already exists.'); return; }
    if (!newSectionLabelEn.trim()) { alert('Please set at least the English label.'); return; }
    const newSections = { ...sections };
    newSections[key] = {
      labelEn: newSectionLabelEn.trim(),
      labelDe: newSectionLabelDe.trim() || newSectionLabelEn.trim(),
      type: newSectionType,
      items: [],
    };
    onSaveSections(newSections);
    setShowAddSection(false);
    setNewSectionKey('');
    setNewSectionLabelEn('');
    setNewSectionLabelDe('');
    setNewSectionType('entries');
  };

  const deleteSection = (key) => {
    if (!confirm(`Delete section "${sections[key].labelEn}" and all its entries?`)) return;
    const newSections = { ...sections };
    delete newSections[key];
    onSaveSections(newSections);
  };

  const handleAddEntry = (sectionKey) => {
    const section = sections[sectionKey];
    const newId = sectionKey.slice(0, 4) + '-' + Date.now();
    let template;
    if (section.type === 'projects') {
      template = { id: newId, dates: '', company: '', logo: '', titleEn: '', titleDe: '', roleEn: '', roleDe: '', descriptionEn: '', descriptionDe: '', stack: '' };
    } else if (section.type === 'publications') {
      template = { id: newId, authors: '', year: '', title: '', journal: '', url: '' };
    } else if (section.type === 'skills') {
      template = { id: newId, labelEn: '', labelDe: '', valueEn: '', valueDe: '' };
    } else {
      template = { id: newId, datesEn: '', datesDe: '', titleEn: '', titleDe: '', subtitleEn: '', subtitleDe: '', descriptionEn: '', descriptionDe: '' };
    }
    setEditingEntry(template);
    setEditingSection(sectionKey);
  };

  const handleEditEntry = (sectionKey, entry) => {
    setEditingEntry({ ...entry });
    setEditingSection(sectionKey);
  };

  const handleDeleteEntry = (sectionKey, entryId) => {
    if (!confirm('Delete this entry?')) return;
    const newSections = { ...sections };
    newSections[sectionKey] = {
      ...newSections[sectionKey],
      items: newSections[sectionKey].items.filter(e => e.id !== entryId),
    };
    onSaveSections(newSections);
  };

  const handleSaveEntry = (entry) => {
    const newSections = { ...sections };
    const section = newSections[editingSection];
    const idx = section.items.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      section.items[idx] = entry;
    } else {
      section.items.push(entry);
    }
    newSections[editingSection] = { ...section, items: [...section.items] };
    onSaveSections(newSections);
    setEditingEntry(null);
    setEditingSection(null);
  };

  const renderEntry = (sectionKey, entry, sectionType) => {
    if (sectionType === 'projects') {
      return (
        <div className="entry-card" key={entry.id}>
          <div className="entry-dates">{entry.dates}</div>
          <div className="entry-body">
            <div className="entry-title">{entry.titleEn || entry.titleDe}</div>
            <div className="entry-subtitle">{entry.company} — {entry.roleEn || entry.roleDe}</div>
            <div className="entry-desc">{entry.descriptionEn || entry.descriptionDe}</div>
            {entry.stack && <span className="entry-stack">{entry.stack}</span>}
          </div>
          <div className="entry-actions">
            <button className="btn btn-sm" onClick={() => handleEditEntry(sectionKey, entry)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEntry(sectionKey, entry.id)}>✕</button>
          </div>
        </div>
      );
    }
    if (sectionType === 'publications') {
      return (
        <div className="entry-card" key={entry.id}>
          <div className="entry-dates">{entry.year}</div>
          <div className="entry-body">
            <div className="entry-title">{entry.title}</div>
            <div className="entry-subtitle">{entry.authors}</div>
            <div className="entry-desc">{entry.journal}</div>
          </div>
          <div className="entry-actions">
            <button className="btn btn-sm" onClick={() => handleEditEntry(sectionKey, entry)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEntry(sectionKey, entry.id)}>✕</button>
          </div>
        </div>
      );
    }
    if (sectionType === 'skills') {
      return (
        <div className="entry-card" key={entry.id}>
          <div className="entry-dates">{entry.labelEn || entry.labelDe}</div>
          <div className="entry-body">
            <div className="entry-desc">{entry.valueEn || entry.valueDe}</div>
          </div>
          <div className="entry-actions">
            <button className="btn btn-sm" onClick={() => handleEditEntry(sectionKey, entry)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEntry(sectionKey, entry.id)}>✕</button>
          </div>
        </div>
      );
    }
    // Default: entries type
    return (
      <div className="entry-card" key={entry.id}>
        <div className="entry-dates">{entry.datesEn || entry.datesDe}</div>
        <div className="entry-body">
          <div className="entry-title">{entry.titleEn || entry.titleDe}</div>
          {(entry.subtitleEn || entry.subtitleDe) && (
            <div className="entry-subtitle">{entry.subtitleEn || entry.subtitleDe}</div>
          )}
          {(entry.descriptionEn || entry.descriptionDe) && (
            <div className="entry-desc">{entry.descriptionEn || entry.descriptionDe}</div>
          )}
        </div>
        <div className="entry-actions">
          <button className="btn btn-sm" onClick={() => handleEditEntry(sectionKey, entry)}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEntry(sectionKey, entry.id)}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>CV Entries</h2>
        <p>Manage your profile and all the entries in your CV. These are the base entries used across all configurations.</p>
      </div>

      {/* Profile Section */}
      <div className="section-card">
        <div className="section-title">
          <span>👤 Profile</span>
          {!profileDraft ? (
            <button className="btn btn-sm btn-primary" onClick={startEditProfile}>Edit Profile</button>
          ) : (
            <div className="btn-group">
              <button className="btn btn-sm btn-primary" onClick={saveProfile}>Save</button>
              <button className="btn btn-sm" onClick={cancelEditProfile}>Cancel</button>
            </div>
          )}
        </div>

        {!profileDraft ? (
          <div className="profile-display">
            <div className="profile-row"><strong>Name:</strong> {profile.name}</div>
            <div className="profile-row"><strong>Email:</strong> {profile.email}</div>
            <div className="profile-row"><strong>Phone:</strong> {profile.phone || <span className="text-muted">not set</span>}</div>
            <div className="profile-row"><strong>Location:</strong> {profile.locationEn}</div>
            <div className="profile-row">
              <strong>Photo:</strong> {profile.photo || <span className="text-muted">not set</span>}
              <label className="btn btn-sm" style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>
                {uploading ? 'Uploading...' : '📷 Upload Photo'}
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>
            <div className="profile-row"><strong>CV Date (EN):</strong> {profile.cvDateEn || <span className="text-muted">auto (\\today)</span>}</div>
            <div className="profile-row"><strong>CV Date (DE):</strong> {profile.cvDateDe || <span className="text-muted">auto (\\today)</span>}</div>
          </div>
        ) : (
          <div className="profile-edit">
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={profileDraft.name} onChange={e => pf('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={profileDraft.email} onChange={e => pf('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={profileDraft.phone || ''} onChange={e => pf('phone', e.target.value)} placeholder="+49 ..." />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Location (EN)</label>
                <input className="form-input" value={profileDraft.locationEn} onChange={e => pf('locationEn', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Location (DE)</label>
                <input className="form-input" value={profileDraft.locationDe} onChange={e => pf('locationDe', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nationality (EN / DE)</label>
                <div className="form-row" style={{ gap: '0.5rem' }}>
                  <input className="form-input" value={profileDraft.nationalityEn} onChange={e => pf('nationalityEn', e.target.value)} placeholder="EN" />
                  <input className="form-input" value={profileDraft.nationalityDe} onChange={e => pf('nationalityDe', e.target.value)} placeholder="DE" />
                </div>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">CV Date (EN)</label>
                <input className="form-input" value={profileDraft.cvDateEn || ''} onChange={e => pf('cvDateEn', e.target.value)} placeholder="Leave empty for auto (\\today)" />
              </div>
              <div className="form-group">
                <label className="form-label">CV Date (DE)</label>
                <input className="form-input" value={profileDraft.cvDateDe || ''} onChange={e => pf('cvDateDe', e.target.value)} placeholder="Leave empty for auto (\\today)" />
              </div>
              <div className="form-group">
                <label className="form-label">Photo</label>
                <div className="flex gap-1 items-center">
                  <span className="text-sm text-muted">{profileDraft.photo}</span>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Uploading...' : 'Upload New'}
                    <input type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Section button */}
      <div className="mb-2">
        {!showAddSection ? (
          <button className="btn btn-primary" onClick={() => setShowAddSection(true)}>+ Add Section</button>
        ) : (
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>New Section</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Label (EN)</label>
                <input className="form-input" value={newSectionLabelEn} onChange={e => setNewSectionLabelEn(e.target.value)} placeholder="e.g., Certifications" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Label (DE)</label>
                <input className="form-input" value={newSectionLabelDe} onChange={e => setNewSectionLabelDe(e.target.value)} placeholder="e.g., Zertifikate" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Section Key</label>
                <input className="form-input" value={newSectionKey} onChange={e => setNewSectionKey(e.target.value)} placeholder="e.g., certifications (auto-generated if empty)" />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={newSectionType} onChange={e => setNewSectionType(e.target.value)}>
                  <option value="entries">Standard Entries (dates, title, subtitle, description)</option>
                  <option value="projects">Projects (company, role, tech stack, logo)</option>
                  <option value="publications">Publications (authors, year, journal, URL)</option>
                  <option value="skills">Skills (label → value table)</option>
                </select>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={addSection}>Create Section</button>
              <button className="btn" onClick={() => setShowAddSection(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {Object.entries(sections).map(([key, section]) => {
        const meta = DEFAULT_SECTION_META[key] || { icon: SECTION_TYPE_ICONS[section.type] || '📋', addLabel: 'Add Entry' };
        const isReordering = reorderSection === key;
        const isRenaming = renamingSection === key;

        return (
          <div className="section-card" key={key}>
            <div className="section-title">
              {isRenaming ? (
                <div className="flex gap-1 items-center" style={{ flex: 1 }}>
                  <input className="form-input form-input-sm" value={renameEn} onChange={e => setRenameEn(e.target.value)} placeholder="Label (EN)" style={{ maxWidth: '180px' }} />
                  <input className="form-input form-input-sm" value={renameDe} onChange={e => setRenameDe(e.target.value)} placeholder="Label (DE)" style={{ maxWidth: '180px' }} />
                  <button className="btn btn-sm btn-primary" onClick={saveRename}>Save</button>
                  <button className="btn btn-sm" onClick={() => setRenamingSection(null)}>Cancel</button>
                </div>
              ) : (
                <span>{meta.icon} {section.labelEn}</span>
              )}
              {!isRenaming && (
                <div className="btn-group">
                  {section.items.length > 1 && !isReordering && (
                    <button className="btn btn-sm" onClick={() => startReorder(key)}>↕ Reorder</button>
                  )}
                  <button className="btn btn-sm" onClick={() => startRename(key)} title="Rename section">✏️</button>
                  <button className="btn btn-sm btn-primary" onClick={() => handleAddEntry(key)}>
                    + {meta.addLabel}
                  </button>
                  {!DEFAULT_SECTION_META[key] && (
                    <button className="btn btn-sm btn-danger" onClick={() => deleteSection(key)} title="Delete section">🗑</button>
                  )}
                </div>
              )}
            </div>

            {/* Reorder mode */}
            {isReordering ? (
              <div>
                <div className="flex gap-1 mb-1">
                  <span className="text-sm text-muted">Drag entries to reorder, then click Apply.</span>
                  <div style={{ marginLeft: 'auto' }} className="btn-group">
                    <button className="btn btn-sm btn-primary" onClick={applyReorder}>✓ Apply</button>
                    <button className="btn btn-sm" onClick={cancelReorder}>Cancel</button>
                  </div>
                </div>
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleReorderDragEnd}>
                  <SortableContext items={reorderItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {reorderItems.map(entry => (
                      <SortableEntryCard key={entry.id} id={entry.id}>
                        {({ dragHandleProps }) => (
                          <div className="entry-card" style={{ cursor: 'grab' }}>
                            <span className="drag-handle" {...dragHandleProps} style={{ marginRight: '0.5rem' }}>⠿</span>
                            <div className="entry-body">
                              <div className="entry-title">
                                {section.type === 'skills' ? (entry.labelEn || entry.labelDe) :
                                 section.type === 'publications' ? entry.title :
                                 (entry.titleEn || entry.titleDe)}
                              </div>
                            </div>
                          </div>
                        )}
                      </SortableEntryCard>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            ) : section.items.length === 0 ? (
              <p className="text-muted text-sm">No entries yet.</p>
            ) : (
              section.items.map(entry => renderEntry(key, entry, section.type))
            )}
          </div>
        );
      })}

      {editingEntry && (
        <EntryModal
          entry={editingEntry}
          sectionType={sections[editingSection]?.type || 'entries'}
          onSave={handleSaveEntry}
          onClose={() => { setEditingEntry(null); setEditingSection(null); }}
        />
      )}
    </div>
  );
}
