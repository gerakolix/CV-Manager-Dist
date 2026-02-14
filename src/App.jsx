import React, { useState, useEffect, useCallback } from 'react';
import EntriesPage from './pages/EntriesPage';
import ConfigsPage from './pages/ConfigsPage';
import ConfigEditPage from './pages/ConfigEditPage';
import ArchivePage from './pages/ArchivePage';
import * as api from './api';

const TABS = [
  { id: 'entries', label: 'CV Entries', icon: '📝' },
  { id: 'configs', label: 'Configurations', icon: '⚙️' },
  { id: 'archive', label: 'Archive', icon: '📁' },
];

export default function App() {
  const [tab, setTab] = useState('entries');
  const [sections, setSections] = useState(null);
  const [profile, setProfile] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [archive, setArchive] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [p, s, c, a] = await Promise.all([
        api.getProfile(),
        api.getSections(),
        api.getConfigs(),
        api.getArchive(),
      ]);
      setProfile(p);
      setSections(s);
      setConfigs(c);
      setArchive(a);
    } catch (err) {
      showToast('Failed to load data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Check for updates on load (silently)
  useEffect(() => {
    api.checkUpdate()
      .then(res => { if (res.available) setUpdateAvailable(true); })
      .catch(() => { /* silently ignore */ });
  }, []);

  const handleSaveSections = async (newSections) => {
    try {
      await api.updateSections(newSections);
      setSections(newSections);
      showToast('Entries saved');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  };

  const handleSaveProfile = async (newProfile) => {
    try {
      await api.updateProfile(newProfile);
      setProfile(newProfile);
      showToast('Profile saved');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  };

  const handleSaveConfig = async (config) => {
    try {
      if (configs.find(c => c.id === config.id)) {
        await api.updateConfig(config.id, config);
        setConfigs(prev => prev.map(c => c.id === config.id ? config : c));
      } else {
        const created = await api.createConfig(config);
        setConfigs(prev => [...prev, created]);
      }
      showToast('Configuration saved');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  };

  const handleDeleteConfig = async (id) => {
    try {
      await api.deleteConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
      if (editingConfig?.id === id) setEditingConfig(null);
      showToast('Configuration deleted');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const handleGenerate = async (configId, meta) => {
    try {
      const result = await api.generatePDF({ configId, ...meta });
      setArchive(prev => [...prev, result.archiveEntry]);
      showToast('PDF generated successfully!');
      return result;
    } catch (err) {
      showToast('Generation failed: ' + err.message, 'error');
      throw err;
    }
  };

  const handleDeleteArchive = async (id) => {
    try {
      await api.deleteArchiveEntry(id);
      setArchive(prev => prev.filter(a => a.id !== id));
      showToast('Archive entry deleted');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const handleUpdate = async () => {
    if (!window.confirm('Download and install the latest update?\n\nYour data (profile, sections, configs, archive) will be preserved.\nThe server will need to be restarted afterwards.')) return;
    setUpdating(true);
    try {
      const result = await api.applyUpdate();
      showToast(result.message || 'Update applied! Please restart.');
      setUpdateAvailable(false);
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('Stop the CV Manager server?\n\nYou will need to restart it manually.')) return;
    try {
      await api.shutdownServer();
      showToast('Server shutting down...', 'info');
      setTimeout(() => {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;flex-direction:column;gap:1rem;"><h1>CV Manager Stopped</h1><p>Close this tab or <a href="/" onclick="location.reload()">reload</a> to reconnect.</p></div>';
      }, 1000);
    } catch (err) {
      showToast('Shutdown initiated', 'info');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading CV Manager...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>CV Manager</h1>
          <span className="subtitle">{profile?.name || 'Your Name'}</span>
        </div>
        <ul className="nav-list">
          {TABS.map(t => (
            <li key={t.id}>
              <button
                className={`nav-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setEditingConfig(null); }}
              >
                <span className="nav-icon">{t.icon}</span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          {updateAvailable && (
            <button
              className="update-btn"
              onClick={handleUpdate}
              disabled={updating}
              title="An update is available"
            >
              {updating ? '⏳ Updating...' : '🔄 Update Available'}
            </button>
          )}
          <small>LaTeX CV Generator</small>
          <button
            className="kill-btn"
            onClick={handleShutdown}
            title="Stop CV Manager"
          >
            ⏻ Stop Server
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        {tab === 'entries' && sections && (
          <EntriesPage
            sections={sections}
            profile={profile}
            onSaveSections={handleSaveSections}
            onSaveProfile={handleSaveProfile}
          />
        )}

        {tab === 'configs' && !editingConfig && (
          <ConfigsPage
            configs={configs}
            sections={sections}
            onEdit={(config) => setEditingConfig(config)}
            onDelete={handleDeleteConfig}
            onSave={handleSaveConfig}
            onGenerate={handleGenerate}
          />
        )}

        {tab === 'configs' && editingConfig && (
          <ConfigEditPage
            config={editingConfig}
            sections={sections}
            profile={profile}
            onSave={(config) => { handleSaveConfig(config); setEditingConfig(null); }}
            onCancel={() => setEditingConfig(null)}
            onGenerate={handleGenerate}
          />
        )}

        {tab === 'archive' && (
          <ArchivePage
            archive={archive}
            onDelete={handleDeleteArchive}
          />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
