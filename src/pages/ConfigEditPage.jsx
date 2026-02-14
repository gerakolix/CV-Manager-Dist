import React, { useState, useRef } from 'react';
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
import * as apiClient from '../api';

const SECTION_ICONS = {
  experience: '💼', education: '🎓', publications: '📄',
  softwareProjects: '💻', volunteering: '🤝', skills: '🛠️', awards: '🏆',
};

const SECTION_TYPE_ICONS = {
  entries: '📋', projects: '💻', publications: '📄', skills: '🛠️',
};

function SortableSection({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

function SortableEntry({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="sortable-entry">
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

export default function ConfigEditPage({ config, sections, profile, onSave, onCancel }) {
  const [name, setName] = useState(config.name);
  const [language, setLanguage] = useState(config.language || 'en');
  const [useLogos, setUseLogos] = useState(config.useLogos || false);
  const [citationStyle, setCitationStyle] = useState(config.citationStyle || 'apa');
  const [sectionOrder, setSectionOrder] = useState(config.sectionOrder || Object.keys(sections));
  const [enabledEntries, setEnabledEntries] = useState(config.enabledEntries || {});
  const [entryOrder, setEntryOrder] = useState(config.entryOrder || {});
  const [overrides, setOverrides] = useState(config.overrides || {});
  const [customEntries, setCustomEntries] = useState(config.customEntries || {});
  const [profileOverrides, setProfileOverrides] = useState(config.profileOverrides || {});
  const [expandedSection, setExpandedSection] = useState(null);
  const [editingOverride, setEditingOverride] = useState(null);
  const [showAiPrompt, setShowAiPrompt] = useState(null);
  const [addingCustom, setAddingCustom] = useState(null);
  const [showProfileOverrides, setShowProfileOverrides] = useState(Object.keys(config.profileOverrides || {}).length > 0);
  const [uploadingConfigPhoto, setUploadingConfigPhoto] = useState(false);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [positionDesc, setPositionDesc] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [aiParseError, setAiParseError] = useState('');
  const photoInputRef = useRef(null);

  const isDE = language === 'de';

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getSectionIcon = (sectionKey) => SECTION_ICONS[sectionKey] || SECTION_TYPE_ICONS[sections[sectionKey]?.type] || '📋';

  const getOrderedItems = (sectionKey) => {
    const section = sections[sectionKey];
    if (!section) return [];
    const allItems = [...(section.items || []), ...(customEntries[sectionKey] || [])];
    const order = entryOrder[sectionKey];
    if (!order || order.length === 0) return allItems;
    const ordered = [];
    for (const id of order) { const item = allItems.find(i => i.id === id); if (item) ordered.push(item); }
    for (const item of allItems) { if (!order.includes(item.id)) ordered.push(item); }
    return ordered;
  };

  const handleSectionDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) setSectionOrder(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
  };

  const handleEntryDragEnd = (sectionKey) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = getOrderedItems(sectionKey).map(i => i.id);
    setEntryOrder(prev => ({ ...prev, [sectionKey]: arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)) }));
  };

  const toggleEntry = (sectionKey, entryId) => {
    setEnabledEntries(prev => {
      const cur = prev[sectionKey] || [];
      return { ...prev, [sectionKey]: cur.includes(entryId) ? cur.filter(id => id !== entryId) : [...cur, entryId] };
    });
  };

  const toggleAllEntries = (sectionKey, enable) => {
    const items = getOrderedItems(sectionKey);
    setEnabledEntries(prev => ({ ...prev, [sectionKey]: enable ? items.map(i => i.id) : [] }));
  };

  const setOverrideField = (entryId, field, value) => {
    setOverrides(prev => {
      const e = { ...(prev[entryId] || {}) };
      e[field] = value;
      return { ...prev, [entryId]: e };
    });
  };

  const clearOverrideField = (entryId, field) => {
    setOverrides(prev => {
      const e = { ...(prev[entryId] || {}) };
      delete e[field];
      if (Object.keys(e).length === 0) { const n = { ...prev }; delete n[entryId]; return n; }
      return { ...prev, [entryId]: e };
    });
  };

  const addCustomEntry = (sectionKey, entry) => {
    setCustomEntries(prev => ({ ...prev, [sectionKey]: [...(prev[sectionKey] || []), entry] }));
    setEnabledEntries(prev => ({ ...prev, [sectionKey]: [...(prev[sectionKey] || []), entry.id] }));
    setAddingCustom(null);
  };

  const deleteCustomEntry = (sectionKey, entryId) => {
    setCustomEntries(prev => ({ ...prev, [sectionKey]: (prev[sectionKey] || []).filter(e => e.id !== entryId) }));
    setEnabledEntries(prev => ({ ...prev, [sectionKey]: (prev[sectionKey] || []).filter(id => id !== entryId) }));
    setEntryOrder(prev => prev[sectionKey] ? { ...prev, [sectionKey]: prev[sectionKey].filter(id => id !== entryId) } : prev);
  };

  const handleSave = () => {
    const cleanProfileOverrides = {};
    for (const [k, v] of Object.entries(profileOverrides)) {
      if (v !== '' && v !== undefined) cleanProfileOverrides[k] = v;
    }
    onSave({ ...config, name, language, useLogos, citationStyle, sectionOrder, enabledEntries, entryOrder, overrides, customEntries, profileOverrides: cleanProfileOverrides });
  };

  const setProfileOverride = (field, value) => {
    setProfileOverrides(prev => {
      const next = { ...prev };
      if (value === '' || value === undefined) { delete next[field]; } else { next[field] = value; }
      return next;
    });
  };

  const handleConfigPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingConfigPhoto(true);
    try {
      const result = await apiClient.uploadPhoto(file);
      setProfileOverride('photo', result.filename);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingConfigPhoto(false);
    }
  };

  // ── AI Tailor-to-Position ─────────────────────────────────────────────────
  const buildTailorPrompt = () => {
    const allEntries = {};
    for (const sKey of sectionOrder) {
      const section = sections[sKey];
      if (!section) continue;
      const items = [...(section.items || []), ...(customEntries[sKey] || [])];
      allEntries[sKey] = items.map(item => ({
        id: item.id,
        label: getEntryLabel(item, section.type),
        dates: getEntryDates(item, section.type),
        description: isDE
          ? (item.descriptionDe || item.descriptionEn || item.valueDe || item.valueEn || '')
          : (item.descriptionEn || item.descriptionDe || item.valueEn || item.valueDe || ''),
        type: section.type,
        sectionLabel: isDE ? section.labelDe : section.labelEn,
      }));
    }

    return `You are helping tailor a CV/resume for a specific job position. The CV is in ${isDE ? 'German' : 'English'}.

## Job Position Description:
${positionDesc}

## Available CV Entries (by section):
${Object.entries(allEntries).map(([sKey, items]) => {
  const sLabel = sections[sKey] ? (isDE ? sections[sKey].labelDe : sections[sKey].labelEn) : sKey;
  return `### ${sLabel} (key: "${sKey}")
${items.map(i => `- id: "${i.id}" | ${i.label}${i.dates ? ' (' + i.dates + ')' : ''}${i.description ? '\n  Description: ' + i.description.slice(0, 200) : ''}`).join('\n')}`;
}).join('\n\n')}

## Current section order:
${JSON.stringify(sectionOrder)}

## Instructions:
Based on the job position, please respond with a JSON object (and ONLY the JSON, no markdown fences):
{
  "sectionOrder": ["experience", "education", ...],
  "enabledEntries": {
    "experience": ["id1", "id2", ...],
    "education": ["id1", ...],
    ...
  },
  "overrides": {
    "entry-id": {
      "${isDE ? 'descriptionDe' : 'descriptionEn'}": "Tailored description highlighting relevant experience for this position..."
    }
  },
  "reasoning": "Brief explanation of why these entries and descriptions were chosen"
}

Rules:
1. Select the most relevant entries for the position
2. Reorder sections to put the most relevant first
3. For key entries, provide tailored description overrides that emphasize skills matching the job
4. Keep descriptions concise (1-3 sentences)
5. Only override descriptions where tailoring adds clear value
6. Include ALL section keys that should appear (omit irrelevant ones)`;
  };

  const handleApplyAiResponse = () => {
    setAiParseError('');
    try {
      let jsonStr = aiResponseText.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();

      const result = JSON.parse(jsonStr);

      if (result.sectionOrder && Array.isArray(result.sectionOrder)) {
        const newOrder = [...result.sectionOrder];
        for (const s of sectionOrder) {
          if (!newOrder.includes(s)) newOrder.push(s);
        }
        setSectionOrder(newOrder);
      }

      if (result.enabledEntries && typeof result.enabledEntries === 'object') {
        setEnabledEntries(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(result.enabledEntries)) {
            if (Array.isArray(v)) next[k] = v;
          }
          for (const s of sectionOrder) {
            if (!result.enabledEntries[s] && !result.sectionOrder?.includes(s)) {
              next[s] = [];
            }
          }
          return next;
        });
      }

      if (result.overrides && typeof result.overrides === 'object') {
        setOverrides(prev => {
          const next = { ...prev };
          for (const [entryId, fields] of Object.entries(result.overrides)) {
            next[entryId] = { ...(next[entryId] || {}), ...fields };
          }
          return next;
        });
      }

      setShowTailorModal(false);
      setAiResponseText('');
      setPositionDesc('');
    } catch (err) {
      setAiParseError('Failed to parse AI response: ' + err.message + '. Make sure the response is valid JSON.');
    }
  };

  const getEntryLabel = (entry, type) => {
    if (type === 'projects') return entry.titleEn || entry.titleDe || entry.company;
    if (type === 'publications') return entry.title || 'Publication';
    if (type === 'skills') return entry.labelEn || entry.labelDe;
    return entry.titleEn || entry.titleDe || '';
  };

  const getEntryDates = (entry, type) => {
    if (type === 'projects') return entry.dates || '';
    if (type === 'publications') return entry.year || '';
    if (type === 'skills') return '';
    return entry.datesEn || entry.datesDe || '';
  };

  const isCustom = (sectionKey, entryId) => (customEntries[sectionKey] || []).some(e => e.id === entryId);

  const getOverrideFields = (sectionType) => {
    if (sectionType === 'projects') return [
      { key: isDE ? 'descriptionDe' : 'descriptionEn', label: 'Description', type: 'textarea' },
      { key: 'dates', label: 'Dates', type: 'input' },
      { key: isDE ? 'roleDe' : 'roleEn', label: 'Role', type: 'input' },
    ];
    if (sectionType === 'publications' || sectionType === 'skills') return [];
    return [
      { key: isDE ? 'descriptionDe' : 'descriptionEn', label: 'Description', type: 'textarea' },
      { key: isDE ? 'datesDe' : 'datesEn', label: 'Dates', type: 'input' },
      { key: isDE ? 'subtitleDe' : 'subtitleEn', label: 'Subtitle', type: 'input' },
    ];
  };

  const getAiPrompt = (entry, section) => {
    const descField = isDE ? 'descriptionDe' : 'descriptionEn';
    const currentDesc = overrides[entry.id]?.[descField] || entry[descField] || '';
    return `Please rewrite the following CV entry description to be more impactful and professional. Keep it concise (1-3 sentences).\n\nEntry: ${getEntryLabel(entry, section.type)}\nCurrent description: "${currentDesc}"\n\nPlease provide an improved version that highlights achievements and uses strong action verbs.`;
  };

  const getNewEntryTemplate = (sectionType) => {
    const id = 'custom-' + Date.now();
    if (sectionType === 'projects') return { id, dates: '', company: '', logo: '', titleEn: '', titleDe: '', roleEn: '', roleDe: '', descriptionEn: '', descriptionDe: '', stack: '' };
    if (sectionType === 'publications') return { id, authors: '', year: '', title: '', journal: '', url: '' };
    if (sectionType === 'skills') return { id, labelEn: '', labelDe: '', valueEn: '', valueDe: '' };
    return { id, datesEn: '', datesDe: '', titleEn: '', titleDe: '', subtitleEn: '', subtitleDe: '', descriptionEn: '', descriptionDe: '' };
  };

  // Check if any section is type 'publications'
  const hasPublications = sectionOrder.some(k => sections[k]?.type === 'publications');

  return (
    <div>
      <div className="config-editor-header">
        <button className="btn" onClick={onCancel}>← Back</button>
        <h2 style={{ flex: 1, color: 'var(--primary)' }}>Edit: {config.name}</h2>
        <button className="btn" onClick={() => setShowTailorModal(true)}>✨ Tailor to Position</button>
        <button className="btn btn-primary" onClick={handleSave}>Save Configuration</button>
      </div>

      {/* Settings */}
      <div className="card mb-2">
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Configuration Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Company Logos</label>
            <div className="flex items-center gap-1" style={{ marginTop: '0.35rem' }}>
              <label className="toggle-switch">
                <input type="checkbox" checked={useLogos} onChange={e => setUseLogos(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span className="text-sm">{useLogos ? 'Show logos' : 'Show text'}</span>
            </div>
          </div>
        </div>
        {hasPublications && (
          <div className="form-row" style={{ maxWidth: '400px' }}>
            <div className="form-group">
              <label className="form-label">Citation Style</label>
              <select className="form-select" value={citationStyle} onChange={e => setCitationStyle(e.target.value)}>
                <option value="apa">APA (Author-Year)</option>
                <option value="ieee">IEEE (Numbered)</option>
                <option value="chicago">Chicago</option>
                <option value="mla">MLA</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Profile Overrides */}
      <div className="card mb-2">
        <div className="flex items-center gap-1" style={{ cursor: 'pointer' }} onClick={() => setShowProfileOverrides(!showProfileOverrides)}>
          <h3 style={{ flex: 1, color: 'var(--primary)', margin: 0 }}>
            👤 Profile Overrides
            {Object.keys(profileOverrides).length > 0 && (
              <span className="override-badge" style={{ marginLeft: '0.5rem' }}>{Object.keys(profileOverrides).length} customized</span>
            )}
          </h3>
          <span className="text-sm text-muted">Override email, phone, photo, etc. for this config only</span>
          <button className="btn btn-sm">{showProfileOverrides ? '▲' : '▼'}</button>
        </div>

        {showProfileOverrides && profile && (
          <div style={{ marginTop: '1rem' }}>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">
                  Email
                  {profileOverrides.email && <span className="override-badge">customized</span>}
                </label>
                <input
                  className={`form-input form-input-sm ${profileOverrides.email ? 'is-overridden' : ''}`}
                  value={profileOverrides.email || profile.email || ''}
                  onChange={e => setProfileOverride('email', e.target.value === profile.email ? '' : e.target.value)}
                />
                {profileOverrides.email && (
                  <button className="btn btn-sm" style={{ marginTop: '0.25rem' }} onClick={() => setProfileOverride('email', '')}>↩ Reset</button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Phone
                  {profileOverrides.phone && <span className="override-badge">customized</span>}
                </label>
                <input
                  className={`form-input form-input-sm ${profileOverrides.phone ? 'is-overridden' : ''}`}
                  value={profileOverrides.phone || profile.phone || ''}
                  onChange={e => setProfileOverride('phone', e.target.value === profile.phone ? '' : e.target.value)}
                />
                {profileOverrides.phone && (
                  <button className="btn btn-sm" style={{ marginTop: '0.25rem' }} onClick={() => setProfileOverride('phone', '')}>↩ Reset</button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Photo
                  {profileOverrides.photo && <span className="override-badge">customized</span>}
                </label>
                <div className="flex gap-1 items-center">
                  <span className="text-sm text-muted">{profileOverrides.photo || profile.photo || 'none'}</span>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    {uploadingConfigPhoto ? 'Uploading...' : 'Upload'}
                    <input type="file" ref={photoInputRef} accept=".jpg,.jpeg,.png" onChange={handleConfigPhotoUpload} style={{ display: 'none' }} />
                  </label>
                  {profileOverrides.photo && (
                    <button className="btn btn-sm" onClick={() => setProfileOverride('photo', '')}>↩ Reset</button>
                  )}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  CV Date ({isDE ? 'DE' : 'EN'})
                  {profileOverrides[isDE ? 'cvDateDe' : 'cvDateEn'] && <span className="override-badge">customized</span>}
                </label>
                <input
                  className={`form-input form-input-sm ${profileOverrides[isDE ? 'cvDateDe' : 'cvDateEn'] ? 'is-overridden' : ''}`}
                  value={profileOverrides[isDE ? 'cvDateDe' : 'cvDateEn'] || profile[isDE ? 'cvDateDe' : 'cvDateEn'] || ''}
                  onChange={e => setProfileOverride(isDE ? 'cvDateDe' : 'cvDateEn', e.target.value)}
                  placeholder="Leave empty for auto (\today)"
                />
                {profileOverrides[isDE ? 'cvDateDe' : 'cvDateEn'] && (
                  <button className="btn btn-sm" style={{ marginTop: '0.25rem' }} onClick={() => setProfileOverride(isDE ? 'cvDateDe' : 'cvDateEn', '')}>↩ Reset</button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Location ({isDE ? 'DE' : 'EN'})
                  {profileOverrides[isDE ? 'locationDe' : 'locationEn'] && <span className="override-badge">customized</span>}
                </label>
                <input
                  className={`form-input form-input-sm ${profileOverrides[isDE ? 'locationDe' : 'locationEn'] ? 'is-overridden' : ''}`}
                  value={profileOverrides[isDE ? 'locationDe' : 'locationEn'] || profile[isDE ? 'locationDe' : 'locationEn'] || ''}
                  onChange={e => setProfileOverride(isDE ? 'locationDe' : 'locationEn', e.target.value)}
                />
                {profileOverrides[isDE ? 'locationDe' : 'locationEn'] && (
                  <button className="btn btn-sm" style={{ marginTop: '0.25rem' }} onClick={() => setProfileOverride(isDE ? 'locationDe' : 'locationEn', '')}>↩ Reset</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Order + Entry Selection */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)' }}>
          Sections & Entries
          <span className="text-sm text-muted" style={{ fontWeight: 400, marginLeft: '0.75rem' }}>
            Drag to reorder sections and entries. Click ✏️ Edit to customize text inline.
          </span>
        </h3>

        <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            {sectionOrder.map(sectionKey => {
              const section = sections[sectionKey];
              if (!section) return null;
              const enabled = enabledEntries[sectionKey] || [];
              const isExpanded = expandedSection === sectionKey;
              const label = isDE ? section.labelDe : section.labelEn;
              const orderedItems = getOrderedItems(sectionKey);
              const overrideFieldDefs = getOverrideFields(section.type);

              return (
                <SortableSection key={sectionKey} id={sectionKey}>
                  {({ dragHandleProps }) => (
                    <div>
                      <div className="section-toggle">
                        <span className="drag-handle" {...dragHandleProps}>⠿</span>
                        <span style={{ fontSize: '1.1rem' }}>{getSectionIcon(sectionKey)}</span>
                        <span className="section-name" style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}>
                          {label}
                        </span>
                        <span className="entry-count">
                          {enabled.length}/{orderedItems.length} entries
                        </span>
                        <button className="btn btn-sm"
                          onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="section-entries-panel">
                          <div className="flex gap-1 mb-1">
                            <button className="btn btn-sm" onClick={() => toggleAllEntries(sectionKey, true)}>Select All</button>
                            <button className="btn btn-sm" onClick={() => toggleAllEntries(sectionKey, false)}>Deselect All</button>
                            <button className="btn btn-sm btn-primary" onClick={() => setAddingCustom(sectionKey)}>
                              + Custom Entry
                            </button>
                          </div>

                          <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleEntryDragEnd(sectionKey)}>
                            <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                              {orderedItems.map(entry => {
                                const isEnabled = enabled.includes(entry.id);
                                const isCustomEntry = isCustom(sectionKey, entry.id);
                                const isEditing = editingOverride === entry.id;
                                const hasOverrides = overrides[entry.id] && Object.keys(overrides[entry.id]).length > 0;

                                return (
                                  <SortableEntry key={entry.id} id={entry.id}>
                                    {({ dragHandleProps: entryDragProps }) => (
                                      <div className={`config-entry-item ${isEnabled ? '' : 'disabled'}`}>
                                        <div className="entry-toggle">
                                          <span className="drag-handle-sm" {...entryDragProps}>⠿</span>
                                          <input type="checkbox" checked={isEnabled}
                                            onChange={() => toggleEntry(sectionKey, entry.id)} />
                                          <div className="entry-toggle-info" style={{ flex: 1, cursor: 'pointer' }}
                                            onClick={() => toggleEntry(sectionKey, entry.id)}>
                                            <strong>{getEntryLabel(entry, section.type)}</strong>
                                            {getEntryDates(entry, section.type) && (
                                              <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>
                                                {overrides[entry.id]?.[isDE ? 'datesDe' : 'datesEn'] || overrides[entry.id]?.dates || getEntryDates(entry, section.type)}
                                              </span>
                                            )}
                                            {isCustomEntry && <span className="tag tag-custom">config only</span>}
                                            {hasOverrides && !isCustomEntry && <span className="tag">customized</span>}
                                          </div>
                                          <div className="entry-toggle-actions">
                                            {isEnabled && overrideFieldDefs.length > 0 && (
                                              <button className="btn btn-sm"
                                                onClick={() => setEditingOverride(isEditing ? null : entry.id)}>
                                                {isEditing ? '▲ Close' : '✏️ Edit'}
                                              </button>
                                            )}
                                            {isEnabled && section.type !== 'skills' && (
                                              <button className="ai-assist-btn"
                                                onClick={() => setShowAiPrompt(showAiPrompt === entry.id ? null : entry.id)}>
                                                ✨ AI
                                              </button>
                                            )}
                                            {isCustomEntry && (
                                              <button className="btn btn-sm btn-danger"
                                                onClick={() => { if (confirm('Delete this custom entry?')) deleteCustomEntry(sectionKey, entry.id); }}>
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Inline override editing */}
                                        {isEditing && isEnabled && (
                                          <div className="override-panel">
                                            {overrideFieldDefs.map(f => {
                                              const rawOverride = overrides[entry.id]?.[f.key];
                                              const defaultVal = entry[f.key] || '';
                                              const hasOverride = rawOverride !== undefined;
                                              const displayVal = hasOverride ? rawOverride : defaultVal;
                                              return (
                                                <div className="override-row" key={f.key}>
                                                  <label className="form-label">
                                                    {f.label}
                                                    {hasOverride && <span className="override-badge">customized</span>}
                                                  </label>
                                                  {f.type === 'textarea' ? (
                                                    <textarea
                                                      className={`override-input ${hasOverride ? 'is-overridden' : ''}`}
                                                      value={displayVal}
                                                      onChange={e => setOverrideField(entry.id, f.key, e.target.value)}
                                                      rows={3}
                                                    />
                                                  ) : (
                                                    <input
                                                      className={`form-input form-input-sm ${hasOverride ? 'is-overridden' : ''}`}
                                                      value={displayVal}
                                                      onChange={e => setOverrideField(entry.id, f.key, e.target.value)}
                                                    />
                                                  )}
                                                  {hasOverride && (
                                                    <button className="btn btn-sm" style={{ marginTop: '0.25rem' }}
                                                      onClick={() => clearOverrideField(entry.id, f.key)}>
                                                      ↩ Reset to default
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* AI Assist */}
                                        {showAiPrompt === entry.id && (
                                          <div className="ai-prompt-box">
                                            <strong>Copy this prompt into Copilot Chat:</strong>
                                            <code>{getAiPrompt(entry, section)}</code>
                                            <button className="btn btn-sm mt-1"
                                              onClick={() => navigator.clipboard.writeText(getAiPrompt(entry, section))}>
                                              📋 Copy to Clipboard
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </SortableEntry>
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  )}
                </SortableSection>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Custom Entry Modal */}
      {addingCustom && (
        <EntryModal
          entry={getNewEntryTemplate(sections[addingCustom]?.type || 'entries')}
          sectionType={sections[addingCustom]?.type || 'entries'}
          onSave={(entry) => addCustomEntry(addingCustom, entry)}
          onClose={() => setAddingCustom(null)}
        />
      )}

      {/* AI Tailor-to-Position Modal */}
      {showTailorModal && (
        <div className="modal-overlay" onClick={() => setShowTailorModal(false)}>
          <div className="modal" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ Tailor CV to Position</h3>
              <button className="modal-close" onClick={() => setShowTailorModal(false)}>&times;</button>
            </div>

            {!aiResponseText && !positionDesc && (
              <p className="text-sm text-muted mb-2">
                Paste a job description below. The tool will generate a prompt you can send to GitHub Copilot Chat (or any AI).
                The AI will recommend which entries to include and suggest tailored descriptions.
              </p>
            )}

            <div className="form-group">
              <label className="form-label">Job Description / Position Requirements</label>
              <textarea
                className="form-textarea"
                value={positionDesc}
                onChange={e => setPositionDesc(e.target.value)}
                rows={6}
                placeholder="Paste the job posting text here..."
              />
            </div>

            {positionDesc.trim() && !aiResponseText && (
              <>
                <div className="form-group">
                  <label className="form-label">Generated Prompt</label>
                  <div className="ai-prompt-box" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <code style={{ fontSize: '0.72rem' }}>{buildTailorPrompt()}</code>
                  </div>
                </div>
                <div className="btn-group mb-2">
                  <button className="btn btn-primary" onClick={() => {
                    navigator.clipboard.writeText(buildTailorPrompt());
                  }}>
                    📋 Copy Prompt to Clipboard
                  </button>
                  <button className="btn" onClick={() => setAiResponseText(' ')}>
                    I have the AI response →
                  </button>
                </div>
              </>
            )}

            {aiResponseText !== '' && (
              <>
                <div className="form-group">
                  <label className="form-label">Paste AI Response (JSON)</label>
                  <textarea
                    className="form-textarea"
                    value={aiResponseText.trim()}
                    onChange={e => { setAiResponseText(e.target.value); setAiParseError(''); }}
                    rows={8}
                    placeholder='Paste the JSON response from Copilot Chat here...'
                  />
                </div>
                {aiParseError && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{aiParseError}</p>
                )}
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setAiResponseText(''); setAiParseError(''); }}>← Back</button>
                  <button className="btn btn-success" onClick={handleApplyAiResponse} disabled={aiResponseText.trim().length < 5}>
                    Apply AI Recommendations
                  </button>
                </div>
              </>
            )}

            {!positionDesc.trim() && !aiResponseText && (
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowTailorModal(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
