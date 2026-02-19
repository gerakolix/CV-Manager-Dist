const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Profile
export const getProfile = () => request('/profile');
export const updateProfile = (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) });

// Sections
export const getSections = () => request('/sections');
export const updateSections = (data) => request('/sections', { method: 'PUT', body: JSON.stringify(data) });

// Configs
export const getConfigs = () => request('/configs');
export const createConfig = (data) => request('/configs', { method: 'POST', body: JSON.stringify(data) });
export const updateConfig = (id, data) => request(`/configs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteConfig = (id) => request(`/configs/${id}`, { method: 'DELETE' });

// Archive
export const getArchive = () => request('/archive');
export const createArchiveEntry = (data) => request('/archive', { method: 'POST', body: JSON.stringify(data) });
export const updateArchiveEntry = (id, data) => request(`/archive/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteArchiveEntry = (id) => request(`/archive/${id}`, { method: 'DELETE' });

// Generate PDF
export const generatePDF = (data) => request('/generate', { method: 'POST', body: JSON.stringify(data) });

// PDF URL helper
export const getPDFUrl = (filename) => `${BASE}/pdfs/${encodeURIComponent(filename)}`;

// TeX source URL helper
export const getTexUrl = (filename) => `${BASE}/tex/${encodeURIComponent(filename)}`;

// Upload photo (multipart form)
export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(BASE + '/upload-photo', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
};

// Upload logo (multipart form)
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(BASE + '/upload-logo', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
};

// Auto-update
export const checkUpdate = () => request('/check-update');
export const applyUpdate = () => request('/update', { method: 'POST' });

// Shutdown server
export const shutdownServer = () => request('/shutdown', { method: 'POST' });
