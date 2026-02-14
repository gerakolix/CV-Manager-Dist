const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { generateLatex, getTemplateVersion } = require('./latex');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, 'output');
const ASSETS_DIR = path.join(__dirname, 'assets');

// Ensure output & assets dirs exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Helpers
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');

// ── Image Upload ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ASSETS_DIR),
    filename: (_req, file, cb) => cb(null, file.originalname),
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|pdf|svg)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const profile = readJson('profile.json');
  profile.photo = req.file.originalname;
  writeJson('profile.json', profile);
  res.json({ ok: true, filename: req.file.originalname });
});

app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    ok: true,
    filename: req.file.originalname,
    tip: 'For best results, use a logo with ~3.3:1 width:height ratio (e.g., 330×100px). Supported: PDF, PNG, JPG, SVG.',
  });
});

// ── Profile ──────────────────────────────────────────────────────────────────
app.get('/api/profile', (_req, res) => res.json(readJson('profile.json')));
app.put('/api/profile', (req, res) => { writeJson('profile.json', req.body); res.json({ ok: true }); });

// ── Sections ─────────────────────────────────────────────────────────────────
app.get('/api/sections', (_req, res) => res.json(readJson('sections.json')));
app.put('/api/sections', (req, res) => { writeJson('sections.json', req.body); res.json({ ok: true }); });

// ── Configurations ───────────────────────────────────────────────────────────
app.get('/api/configs', (_req, res) => res.json(readJson('configs.json')));

app.post('/api/configs', (req, res) => {
  const configs = readJson('configs.json');
  const newConfig = { ...req.body, id: 'config-' + Date.now() };
  configs.push(newConfig);
  writeJson('configs.json', configs);
  res.json(newConfig);
});

app.put('/api/configs/:id', (req, res) => {
  let configs = readJson('configs.json');
  configs = configs.map(c => c.id === req.params.id ? { ...req.body, id: req.params.id } : c);
  writeJson('configs.json', configs);
  res.json({ ok: true });
});

app.delete('/api/configs/:id', (req, res) => {
  let configs = readJson('configs.json');
  configs = configs.filter(c => c.id !== req.params.id);
  writeJson('configs.json', configs);
  res.json({ ok: true });
});

// ── Archive ──────────────────────────────────────────────────────────────────
app.get('/api/archive', (_req, res) => res.json(readJson('archive.json')));

app.post('/api/archive', (req, res) => {
  const archive = readJson('archive.json');
  const entry = { ...req.body, id: 'arch-' + Date.now(), createdAt: new Date().toISOString() };
  archive.push(entry);
  writeJson('archive.json', archive);
  res.json(entry);
});

app.put('/api/archive/:id', (req, res) => {
  let archive = readJson('archive.json');
  archive = archive.map(a => a.id === req.params.id ? { ...req.body, id: req.params.id } : a);
  writeJson('archive.json', archive);
  res.json({ ok: true });
});

app.delete('/api/archive/:id', (req, res) => {
  let archive = readJson('archive.json');
  const entry = archive.find(a => a.id === req.params.id);
  if (entry && entry.filename) {
    const pdfPath = path.join(OUTPUT_DIR, entry.filename);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }
  archive = archive.filter(a => a.id !== req.params.id);
  writeJson('archive.json', archive);
  res.json({ ok: true });
});

// ── Generate PDF ─────────────────────────────────────────────────────────────
app.post('/api/generate', (req, res) => {
  try {
    const { configId, company, position, notes, tags } = req.body;
    const profile = readJson('profile.json');
    const sections = readJson('sections.json');
    const configs = readJson('configs.json');
    const config = configs.find(c => c.id === configId);
    if (!config) return res.status(404).json({ error: 'Configuration not found' });

    const latex = generateLatex(profile, sections, config);

    // Create temp dir
    const tempDir = path.join(OUTPUT_DIR, 'temp-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    // Write tex file
    fs.writeFileSync(path.join(tempDir, 'cv.tex'), latex, 'utf8');

    // Copy assets (image + logos)
    if (fs.existsSync(ASSETS_DIR)) {
      fs.readdirSync(ASSETS_DIR).forEach(f => {
        const src = path.join(ASSETS_DIR, f);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, path.join(tempDir, f));
        }
      });
    }

    // Run pdflatex twice (for references)
    try {
      execSync('pdflatex -interaction=nonstopmode cv.tex', { cwd: tempDir, timeout: 30000, stdio: 'pipe' });
      execSync('pdflatex -interaction=nonstopmode cv.tex', { cwd: tempDir, timeout: 30000, stdio: 'pipe' });
    } catch (latexErr) {
      const pdfExists = fs.existsSync(path.join(tempDir, 'cv.pdf'));
      if (!pdfExists) {
        const logFile = path.join(tempDir, 'cv.log');
        const logContent = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').slice(-2000) : '';
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(500).json({ error: 'LaTeX compilation failed', log: logContent });
      }
    }

    // Generate filename from profile name (dynamic)
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = (company || config.name || 'cv').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
    const profileName = (profile.name || 'CV').replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, '').replace(/\s+/g, '_');
    const filename = `CV_${profileName}_${safeName}_${timestamp}.pdf`;

    // Move PDF
    fs.copyFileSync(path.join(tempDir, 'cv.pdf'), path.join(OUTPUT_DIR, filename));

    // Cleanup temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Add to archive
    const archive = readJson('archive.json');
    const archiveEntry = {
      id: 'arch-' + Date.now(),
      configId,
      configName: config.name,
      filename,
      company: company || '',
      position: position || '',
      notes: notes || '',
      tags: tags || [],
      language: config.language,
      templateVersion: getTemplateVersion(),
      createdAt: new Date().toISOString()
    };
    archive.push(archiveEntry);
    writeJson('archive.json', archive);

    res.json({ ok: true, filename, archiveEntry });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve generated PDFs ─────────────────────────────────────────────────────
app.get('/api/pdfs/:filename', (req, res) => {
  const pdfPath = path.join(OUTPUT_DIR, req.params.filename);
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(pdfPath);
  } else {
    res.status(404).json({ error: 'PDF not found' });
  }
});

// ── Template Version ─────────────────────────────────────────────────────────
app.get('/api/template-version', (_req, res) => res.json({ version: getTemplateVersion() }));

// ── List available PDFs ──────────────────────────────────────────────────────
app.get('/api/pdfs', (_req, res) => {
  if (!fs.existsSync(OUTPUT_DIR)) return res.json([]);
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.pdf'));
  res.json(files);
});

// ── Auto-update ─────────────────────────────────────────────────────────────
const UPDATE_REPO = 'https://github.com/gerakolix/CV-Manager.git';
const ROOT_DIR = path.join(__dirname, '..');
const UPDATE_STATE_FILE = path.join(DATA_DIR, '.update-state.json');

// Directories containing user data that must be preserved during updates
const USER_DATA_DIRS = ['server/data', 'server/assets', 'server/output'];

function getUpdateState() {
  try { return JSON.parse(fs.readFileSync(UPDATE_STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveUpdateState(state) {
  fs.writeFileSync(UPDATE_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function isGitAvailable() {
  try { execSync('git --version', { timeout: 5000, stdio: 'pipe' }); return true; }
  catch { return false; }
}

// Fetch latest commit SHA from GitHub API (works without git or .git)
function getRemoteLatestSha(repoUrl) {
  return new Promise((resolve, reject) => {
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) return reject(new Error('Cannot parse repo URL'));
    const [, owner, repo] = match;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/commits?per_page=1&sha=main`,
      headers: { 'User-Agent': 'CV-Manager' },
    };
    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const commits = JSON.parse(data);
          if (Array.isArray(commits) && commits.length > 0) {
            resolve(commits[0].sha);
          } else {
            reject(new Error(commits.message || 'No commits found'));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

app.get('/api/check-update', async (_req, res) => {
  try {
    const state = getUpdateState();
    const remoteSha = await getRemoteLatestSha(UPDATE_REPO);

    // Initialize stored SHA on first check
    if (!state.lastCommitSha) {
      const isGitRepo = fs.existsSync(path.join(ROOT_DIR, '.git'));
      if (isGitRepo) {
        try {
          state.lastCommitSha = execSync('git rev-parse HEAD', { cwd: ROOT_DIR, timeout: 5000, stdio: 'pipe' }).toString().trim();
        } catch {
          state.lastCommitSha = remoteSha; // fallback: assume up-to-date
        }
      }
      // For non-git dirs: leave lastCommitSha unset — we can't determine the local version
      state.lastCheckTime = new Date().toISOString();
      saveUpdateState(state);
    }

    // If no local SHA is known (non-git copy), always show update available
    const available = !state.lastCommitSha || remoteSha !== state.lastCommitSha;
    res.json({
      available,
      message: available
        ? (state.lastCommitSha ? 'An update is available!' : 'Version unknown — click Update to set up auto-updates.')
        : 'You are up to date.',
      currentSha: state.lastCommitSha?.substring(0, 7) || 'unknown',
      remoteSha: remoteSha?.substring(0, 7),
    });
  } catch (err) {
    res.json({ available: false, message: 'Could not check for updates: ' + err.message });
  }
});

app.post('/api/update', async (_req, res) => {
  try {
    if (!isGitAvailable()) {
      return res.status(400).json({ error: 'Git is not installed. Please install Git and try again.' });
    }

    const isGitRepo = fs.existsSync(path.join(ROOT_DIR, '.git'));

    if (!isGitRepo) {
      // ── Non-git directory: initialize git, backup user data, pull, restore ──
      const backupDir = path.join(ROOT_DIR, '.update-backup-' + Date.now());
      fs.mkdirSync(backupDir, { recursive: true });

      // Backup user data
      for (const dir of USER_DATA_DIRS) {
        const srcDir = path.join(ROOT_DIR, dir);
        if (fs.existsSync(srcDir)) {
          copyDirSync(srcDir, path.join(backupDir, dir));
        }
      }

      // Initialize git and pull
      execSync('git init', { cwd: ROOT_DIR, timeout: 10000, stdio: 'pipe' });
      execSync(`git remote add origin ${UPDATE_REPO}`, { cwd: ROOT_DIR, timeout: 10000, stdio: 'pipe' });
      execSync('git fetch origin main', { cwd: ROOT_DIR, timeout: 30000, stdio: 'pipe' });
      execSync('git checkout -f -B main origin/main', { cwd: ROOT_DIR, timeout: 15000, stdio: 'pipe' });

      // Restore user data
      for (const dir of USER_DATA_DIRS) {
        const backupSrc = path.join(backupDir, dir);
        const destDir = path.join(ROOT_DIR, dir);
        if (fs.existsSync(backupSrc)) {
          if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
          copyDirSync(backupSrc, destDir);
        }
      }

      // Clean up backup
      fs.rmSync(backupDir, { recursive: true, force: true });
    } else {
      // ── Existing git repo: stash and pull ──
      execSync('git stash', { cwd: ROOT_DIR, timeout: 10000, stdio: 'pipe' });
      execSync('git pull origin main', { cwd: ROOT_DIR, timeout: 30000, stdio: 'pipe' });
      try { execSync('git stash pop', { cwd: ROOT_DIR, timeout: 10000, stdio: 'pipe' }); } catch (_e) { /* no stash */ }
    }

    // Save new commit SHA
    const newSha = execSync('git rev-parse HEAD', { cwd: ROOT_DIR, timeout: 5000, stdio: 'pipe' }).toString().trim();
    saveUpdateState({ lastCommitSha: newSha, lastUpdateTime: new Date().toISOString() });

    // Reinstall dependencies in case package.json changed
    try { execSync('npm install', { cwd: ROOT_DIR, timeout: 60000, stdio: 'pipe' }); } catch (_e) { /* best effort */ }

    res.json({ ok: true, message: 'Updated successfully! Please restart CV Manager.' });
  } catch (err) {
    // Try to restore stash on failure for git repos
    try { execSync('git stash pop', { cwd: ROOT_DIR, timeout: 10000, stdio: 'pipe' }); } catch (_e) { /* ignore */ }
    res.status(500).json({ error: 'Update failed: ' + err.message });
  }
});

// ── Shutdown endpoint ───────────────────────────────────────────────────────
app.post('/api/shutdown', (_req, res) => {
  console.log('\n⚠️  Shutdown requested via API');
  res.json({ ok: true, message: 'Server shutting down...' });
  setTimeout(() => {
    console.log('👋 CV Manager stopped\n');
    process.exit(0);
  }, 500);
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`\n  CV Manager API running on http://localhost:${PORT}`);
  console.log(`  Frontend at http://localhost:5173\n`);
});
