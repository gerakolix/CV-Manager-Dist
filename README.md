# CV Manager

A visual tool for managing and generating professional LaTeX CVs. No programming knowledge needed.

## Features

- **Visual CV editing** — Add, edit, reorder, and delete entries via a web interface
- **Multiple configurations** — Create tailored CVs for different positions
- **Bilingual support** — English and German CV generation
- **AI-assisted tailoring** — Generate prompts for AI to optimize your CV for specific positions
- **Drag & drop** — Reorder entries and sections with drag-and-drop
- **Custom sections** — Create your own sections with different types (entries, projects, publications, skills)
- **Publication citation styles** — Choose between APA, IEEE, Chicago, or MLA for publications
- **Logo support** — Upload company logos for project entries
- **Profile photo** — Upload and manage your CV photo
- **PDF generation** — One-click PDF output via pdflatex
- **Archive** — Track all generated CVs with tags and notes
- **Auto-update** — Check for updates from your Git repository

## Requirements

- **Node.js** (v16 or newer) — [Download](https://nodejs.org/)
- **MiKTeX** or **TeX Live** (LaTeX distribution) — [MiKTeX Download](https://miktex.org/download)

## Quick Start

### Windows (Easiest)

1. Double-click **`Start CV Manager.bat`**
   - On first run, it installs dependencies automatically
2. Your browser opens to `http://localhost:5173`
3. Start editing your CV

### Manual Start

```bash
# Install dependencies (first time only)
npm install

# Start the app
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Silent Mode (No Console Window)

Double-click **`Start CV Manager (Silent).vbs`** to run without a visible terminal window.

## How It Works

1. **CV Entries** tab — Manage your profile info and all CV entries (experience, education, skills, etc.)
2. **Configurations** tab — Create named configurations that select which entries to include, with optional custom descriptions
3. **Archive** tab — View history of all generated PDFs

### Workflow

1. Fill in your **Profile** information (name, email, photo, etc.)
2. Add your **CV entries** across sections (experience, education, projects, publications, skills, etc.)
3. Create a **Configuration** for a target position
4. In the config editor, **select entries**, **reorder sections**, and optionally **customize descriptions**
5. Click **Generate PDF** to create your CV

### AI Tailoring

In the configuration editor, click **"✨ Tailor to Position"** to:
1. Paste a job description
2. Get a generated prompt for any AI (ChatGPT, Copilot, etc.)
3. Paste the AI's JSON response to automatically optimize your entry selection and descriptions

## File Structure

```
cv-manager-dist/
├── server/
│   ├── index.js          # Express API server
│   ├── latex.js           # LaTeX template generator
│   ├── data/              # Your data (profile, sections, configs, archive)
│   ├── assets/            # Photos and logos
│   └── output/            # Generated PDFs
├── src/                   # React frontend
├── package.json
└── vite.config.js
```

## Your Data

All your data is stored as JSON files in `server/data/`:
- `profile.json` — Your personal information
- `sections.json` — All CV sections and entries
- `configs.json` — Your CV configurations
- `archive.json` — History of generated PDFs

**Back up the `server/data/` and `server/assets/` folders** to preserve your CV data.

## Updating

CV Manager automatically checks for updates on startup via the GitHub API — no `.git` directory required.

- The last known commit SHA is stored in `server/data/.update-state.json`
- When a new version is available, the **"🔄 Update Available"** button appears in the sidebar
- Click it to pull the latest changes (requires Git to be installed)
- If the directory is not yet a Git repository, it will be initialized automatically
- Your data in `server/data/`, `server/assets/`, and `server/output/` is backed up and restored during updates

## Stopping the Server

- Click the **"⏻ Stop Server"** button in the sidebar, or
- Close the terminal window, or
- Double-click **`stop-cv-manager.ps1`**

## Troubleshooting

- **PDF generation fails**: Ensure MiKTeX/TeX Live is installed and `pdflatex` is in your PATH
- **Photos not showing**: Place photo files in `server/assets/` and use the Upload button
- **Port already in use**: Kill existing Node processes or change the port in `server/index.js`
