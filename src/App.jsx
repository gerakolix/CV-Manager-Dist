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
  const [crashReportOpen, setCrashReportOpen] = useState(false);
  const [crashReport, setCrashReport] = useState(null);
  const [crashReportLoading, setCrashReportLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (type === 'error') setLastError(message);
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

  const [serverStopped, setServerStopped] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleOpenCrashReport = async () => {
    setCrashReportLoading(true);
    setCrashReportOpen(true);
    try {
      const data = await api.getCrashReport(lastError || undefined);
      setCrashReport(data);
    } catch (err) {
      setCrashReport({ error: err.message });
    } finally {
      setCrashReportLoading(false);
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('Stop the CV Manager server?\n\nYou will need to restart it manually.')) return;
    try {
      await api.shutdownServer();
      showToast('Server shutting down...', 'info');
      setTimeout(() => setServerStopped(true), 1000);
    } catch (err) {
      showToast('Shutdown initiated', 'info');
      setTimeout(() => setServerStopped(true), 1000);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await api.getProfile();
        // Server is back!
        setServerStopped(false);
        setReconnecting(false);
        loadData();
        showToast('Reconnected to server!', 'success');
        return;
      } catch {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    setReconnecting(false);
    showToast('Could not reconnect. Make sure the server is running.', 'error');
  };

  if (serverStopped) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⏻</span>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>CV Manager Stopped</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The server has been shut down.</p>
          <button
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem', marginBottom: '1rem' }}
            onClick={handleReconnect}
            disabled={reconnecting}
          >
            {reconnecting ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} /> Reconnecting...</>
            ) : '🔄 Reconnect to Server'}
          </button>
          <div className="card" style={{ textAlign: 'left', marginTop: '1rem', padding: '1rem 1.25rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>To restart the server:</p>
            <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>Run <code style={{ background: 'var(--bg)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Start CV Manager.bat</code> from the project folder</li>
              <li>Wait a moment for the server to start</li>
              <li>Click <strong>Reconnect to Server</strong> above</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

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
            className="report-btn"
            onClick={handleOpenCrashReport}
            title="View logs & report an issue"
          >
            🐛 Report Issue
          </button>
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

      {/* Crash Report Modal */}
      {crashReportOpen && (
        <div className="modal-overlay" onClick={() => setCrashReportOpen(false)}>
          <div className="modal crash-report-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>🐛 Report Issue / View Logs</h3>
              <button className="modal-close" onClick={() => setCrashReportOpen(false)}>&times;</button>
            </div>

            {crashReportLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" />
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading logs…</p>
              </div>
            )}

            {crashReport && !crashReportLoading && (
              <>
                {crashReport.error ? (
                  <div className="crash-report-error">
                    <p>Could not load crash report: {crashReport.error}</p>
                  </div>
                ) : (
                  <>
                    {/* System Info */}
                    <div className="crash-report-section">
                      <h4>System Information</h4>
                      <div className="crash-report-info-grid">
                        {Object.entries(crashReport.report.systemInfo).map(([key, val]) => (
                          <div key={key} className="crash-report-info-item">
                            <span className="crash-report-info-label">{key}</span>
                            <span className="crash-report-info-value">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Errors */}
                    {crashReport.report.recentErrors.length > 0 && (
                      <div className="crash-report-section">
                        <h4>Recent Errors ({crashReport.report.recentErrors.length})</h4>
                        <pre className="crash-report-log crash-report-errors">
                          {crashReport.report.recentErrors.slice(-10).join('\n')}
                        </pre>
                      </div>
                    )}

                    {/* Full Log */}
                    <div className="crash-report-section">
                      <h4>Recent Log</h4>
                      <pre className="crash-report-log">
                        {crashReport.report.recentLogs.slice(-80).join('\n')}
                      </pre>
                    </div>
                  </>
                )}

                <div className="modal-footer">
                  {crashReport.issueUrl && (
                    <a
                      href={crashReport.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                    >
                      🐙 Open GitHub Issue
                    </a>
                  )}
                  <button className="btn" onClick={() => setCrashReportOpen(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
