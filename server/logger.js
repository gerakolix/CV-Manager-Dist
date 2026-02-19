/**
 * Logger module – file-based logging with rotation and crash report support.
 *
 * Logs are written to  server/data/logs/  with one file per day.
 * Old log files beyond MAX_LOG_FILES are automatically pruned.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Configuration ────────────────────────────────────────────────────────────
const LOG_DIR = path.join(__dirname, 'data', 'logs');
const MAX_LOG_FILES = 14;          // keep ~2 weeks of daily logs
const MAX_REPORT_LINES = 500;      // max lines included in a crash report

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString();
}

function todayFileName() {
  return `cv-manager-${new Date().toISOString().slice(0, 10)}.log`;
}

function logFilePath() {
  return path.join(LOG_DIR, todayFileName());
}

/** Rotate: delete oldest files when we exceed MAX_LOG_FILES */
function rotate() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('cv-manager-') && f.endsWith('.log'))
      .sort();
    while (files.length > MAX_LOG_FILES) {
      fs.unlinkSync(path.join(LOG_DIR, files.shift()));
    }
  } catch { /* best-effort */ }
}

// ── Core write ───────────────────────────────────────────────────────────────
function write(level, message, extra) {
  const ts = timestamp();
  let line = `[${ts}] [${level}] ${message}`;
  if (extra !== undefined) {
    if (extra instanceof Error) {
      line += `\n  ${extra.stack || extra.message}`;
    } else if (typeof extra === 'object') {
      try { line += '\n  ' + JSON.stringify(extra); } catch { /* ignore */ }
    } else {
      line += `  ${extra}`;
    }
  }
  line += '\n';

  // Also write to original console for terminal visibility
  const consoleFn = level === 'ERROR' ? origConsole.error
    : level === 'WARN' ? origConsole.warn
    : origConsole.log;
  consoleFn(line.trimEnd());

  // Append to file
  try {
    fs.appendFileSync(logFilePath(), line, 'utf8');
  } catch { /* ignore write errors */ }
}

// ── Public API ───────────────────────────────────────────────────────────────
const logger = {
  info:  (msg, extra) => write('INFO',  msg, extra),
  warn:  (msg, extra) => write('WARN',  msg, extra),
  error: (msg, extra) => write('ERROR', msg, extra),
};

// ── Console override (capture third-party & uncaught) ────────────────────────
// Keep references to originals so we never recurse
const origConsole = {
  log:   console.log.bind(console),
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
};

console.log   = (...args) => write('INFO',  args.map(String).join(' '));
console.warn  = (...args) => write('WARN',  args.map(String).join(' '));
console.error = (...args) => write('ERROR', args.map(String).join(' '));

// ── Crash report helper ─────────────────────────────────────────────────────
/**
 * Build a crash report object with recent logs and system info.
 * @param {string} [errorMessage] - An optional immediate error message to include
 */
function buildCrashReport(errorMessage) {
  // Gather recent log lines (read the most recent log files)
  let logLines = [];
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('cv-manager-') && f.endsWith('.log'))
      .sort()
      .reverse();     // newest first
    for (const f of files) {
      if (logLines.length >= MAX_REPORT_LINES) break;
      const content = fs.readFileSync(path.join(LOG_DIR, f), 'utf8');
      const lines = content.split('\n').filter(Boolean);
      logLines = lines.concat(logLines); // prepend older lines
    }
    // Trim to the last N lines
    if (logLines.length > MAX_REPORT_LINES) {
      logLines = logLines.slice(-MAX_REPORT_LINES);
    }
  } catch { /* ignore */ }

  // Gather only the ERROR lines for a quick summary
  const errorLines = logLines.filter(l => l.includes('[ERROR]'));

  // System info
  let templateVersion = 'unknown';
  try {
    const { getTemplateVersion } = require('./latex');
    templateVersion = getTemplateVersion();
  } catch { /* ignore */ }

  let packageVersion = 'unknown';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    packageVersion = pkg.version || 'unknown';
  } catch { /* ignore */ }

  const systemInfo = {
    nodeVersion: process.version,
    platform: `${os.platform()} ${os.release()} (${os.arch()})`,
    templateVersion,
    packageVersion,
    uptime: `${Math.round(process.uptime())}s`,
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };

  return {
    timestamp: timestamp(),
    errorMessage: errorMessage || null,
    systemInfo,
    recentErrors: errorLines.slice(-20),
    recentLogs: logLines.slice(-MAX_REPORT_LINES),
  };
}

/**
 * Build a pre-filled GitHub issue URL from a crash report.
 * No auth token needed – the user just opens the URL in their browser.
 */
function buildGitHubIssueUrl(report) {
  const repo = 'gerakolix/CV-Manager-Dist';

  const title = report.errorMessage
    ? `Crash Report: ${report.errorMessage.substring(0, 80)}`
    : 'Crash Report (auto-generated)';

  const sysLines = Object.entries(report.systemInfo)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n');

  // Keep the body reasonably short for a URL (GitHub has a ~8000 char URL limit)
  const recentErrors = report.recentErrors.slice(-10).join('\n');
  const recentLogs = report.recentLogs.slice(-50).join('\n');

  const body = [
    '## System Information',
    sysLines,
    '',
    '## Error',
    '```',
    report.errorMessage || '(no specific error)',
    '```',
    '',
    '## Recent Errors',
    '```',
    recentErrors || '(none)',
    '```',
    '',
    '## Recent Log (last 50 lines)',
    '```',
    recentLogs || '(empty)',
    '```',
    '',
    '## Additional Context',
    '_Please describe what you were doing when this happened:_',
    '',
  ].join('\n');

  // Truncate body to stay within URL length limits (~8000 chars)
  const maxBodyLen = 6000;
  const truncatedBody = body.length > maxBodyLen
    ? body.substring(0, maxBodyLen) + '\n\n... (log truncated) ...'
    : body;

  const params = new URLSearchParams({
    title,
    body: truncatedBody,
    labels: 'bug,crash-report',
  });

  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}

// Run rotation on startup
rotate();

module.exports = {
  logger,
  buildCrashReport,
  buildGitHubIssueUrl,
  LOG_DIR,
};
