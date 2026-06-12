const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const crypto = require('crypto');
const { ZWSP, displayRoute, parseRoute, resolveModel, sanitizeTools, anthropicToOpenAi, openAiToAnthropic } = require('./translate');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');

// Claude Desktop app-data directory per platform
function desktopDataDir() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude');
  return path.join(os.homedir(), '.config', 'Claude');
}

// Claude Desktop keeps all third-party-inference state in a SEPARATE data dir
// with a "-3p" suffix: configLibrary/ lives there, and claude_desktop_config.json
// there holds the "deploymentMode" ("1p" = Claude account, "3p" = gateway) that
// gates whether gateway config is honored at all.
function desktop3pDataDir() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Claude-3p');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Claude-3p');
  return path.join(os.homedir(), '.config', 'Claude-3p');
}
const CONFIG_LIBRARY_DIR = path.join(desktop3pDataDir(), 'configLibrary');
const CONFIG_META_PATH = path.join(CONFIG_LIBRARY_DIR, '_meta.json');
const DESKTOP_3P_CONFIG_PATH = path.join(desktop3pDataDir(), 'claude_desktop_config.json');
const OPENCLAUDE_ENTRY_NAME = 'OpenClaude Gateway';

function readDeploymentMode() {
  try {
    const v = JSON.parse(fs.readFileSync(DESKTOP_3P_CONFIG_PATH, 'utf8')).deploymentMode;
    return v === '3p' || v === '1p' ? v : null;
  } catch {
    return null;
  }
}

function writeDeploymentMode(mode) {
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(DESKTOP_3P_CONFIG_PATH, 'utf8'));
  } catch {}
  cfg.deploymentMode = mode;
  fs.mkdirSync(desktop3pDataDir(), { recursive: true });
  fs.writeFileSync(DESKTOP_3P_CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

// Env keys this app manages inside ~/.claude/settings.json
const MANAGED_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL'
];

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  // Backup current file once per change
  if (fs.existsSync(SETTINGS_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(SETTINGS_PATH, path.join(CLAUDE_DIR, `settings.json.openclaude-backup-${stamp}`));
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 880,
    height: 720,
    minWidth: 720,
    minHeight: 600,
    title: 'OpenClaude',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- Local proxy gateway ------------------------------------------------------
// Claude Desktop's gateway mode only accepts claude-* model IDs, but providers
// like OpenCode Go serve non-Claude models over the same Anthropic /v1/messages
// protocol. This proxy listens on loopback, rewrites the "model" field to the
// user's chosen provider model, and forwards everything else untouched.

const PROXY_PORT = 41100;
const PROXY_ALIAS_MODEL = 'claude-sonnet-4-5'; // what Claude Desktop believes it's using
const PROXY_CONFIG_PATH = () => path.join(app.getPath('userData'), 'proxy.json');

let proxyServer = null;
let tray = null;

function readProxyConfig() {
  try {
    return JSON.parse(fs.readFileSync(PROXY_CONFIG_PATH(), 'utf8'));
  } catch {
    return { enabled: false };
  }
}

function writeProxyConfig(cfg) {
  fs.writeFileSync(PROXY_CONFIG_PATH(), JSON.stringify(cfg, null, 2) + '\n');
}

function proxyStatus() {
  const cfg = readProxyConfig();
  return {
    enabled: Boolean(cfg.enabled),
    running: Boolean(proxyServer),
    port: PROXY_PORT,
    upstreamBase: cfg.upstreamBase || null,
    mainModel: cfg.mainModel || null,
    fastModel: cfg.fastModel || null,
    modelMap: cfg.modelMap || null
  };
}

function startProxy() {
  if (proxyServer) return true;
  if (!readProxyConfig().enabled) return false;

  proxyServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      // Re-read per request so model/provider changes apply without a restart
      const cfg = readProxyConfig();
      if (!cfg.upstreamBase || !cfg.apiKey) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'OpenClaude proxy is not configured' } }));
        return;
      }
      const upstream = new URL(cfg.upstreamBase.replace(/\/+$/, ''));
      let json = null;
      let isStream = false;

      if (chunks.length > 0 && /\/v1\/messages/.test(req.url)) {
        try {
          json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {}
      }
      const useOpenAi = cfg.upstreamProtocol === 'openai';
      let requestedModel = null;
      if (json) {
        isStream = json.stream === true;
        if (typeof json.model === 'string') {
          requestedModel = json.model;
          json.model = resolveModel(json.model, cfg);
        }
        sanitizeTools(json);
      }

      const t0 = Date.now();
      res.on('finish', () => {
        pushProxyLog({
          path: req.url,
          modelIn: requestedModel ? requestedModel.split(ZWSP).join('') : null,
          modelOut: json ? json.model : null,
          stream: isStream,
          status: res.statusCode,
          ms: Date.now() - t0
        });
      });

      // OpenAI upstreams have no token-counting endpoint — return an estimate.
      if (useOpenAi && /count_tokens/.test(req.url)) {
        const approx = Math.ceil(Buffer.concat(chunks).length / 4);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ input_tokens: approx }));
        return;
      }

      const send = (payload, attempt) => {
        let outPayload = payload;
        let outPath = `${upstream.pathname.replace(/\/$/, '')}${req.url}`;
        if (useOpenAi && payload && /\/v1\/messages/.test(req.url)) {
          outPayload = anthropicToOpenAi(payload);
          // chatPath defaults to /v1/chat/completions; providers whose base
          // already carries the version (e.g. Gemini's /v1beta/openai) set it
          // to /chat/completions.
          outPath = `${upstream.pathname.replace(/\/$/, '')}${cfg.chatPath || '/v1/chat/completions'}`;
        }
        const body = outPayload ? Buffer.from(JSON.stringify(outPayload)) : Buffer.concat(chunks);
        const options = {
          hostname: upstream.hostname,
          port: upstream.port || 443,
          path: outPath,
          method: req.method,
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
            'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
            // The upstream only emits well-formed SSE when this is explicit
            accept: isStream ? 'text/event-stream' : (req.headers.accept || 'application/json'),
            'x-api-key': cfg.apiKey,
            authorization: `Bearer ${cfg.apiKey}`
          }
        };

        const upReq = https.request(options, (upRes) => {
          // On a 400, check whether an optional field (extended thinking,
          // remaining tools) caused it; strip and retry once.
          if (upRes.statusCode === 400 && attempt === 0 && payload) {
            const errChunks = [];
            upRes.on('data', (c) => errChunks.push(c));
            upRes.on('end', () => {
              const errText = Buffer.concat(errChunks).toString('utf8');
              const retry = { ...payload };
              let changed = false;
              if (/thinking|reasoning/i.test(errText) && retry.thinking) { delete retry.thinking; changed = true; }
              if (/tool/i.test(errText) && retry.tools) { delete retry.tools; delete retry.tool_choice; changed = true; }
              if (changed) { send(retry, 1); return; }
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(errText);
            });
            return;
          }
          const ct = upRes.headers['content-type'] || '';
          if (useOpenAi && payload && /\/v1\/messages/.test(req.url) && upRes.statusCode < 400) {
            // Translate OpenAI responses back into Anthropic shape
            if (isStream && ct.includes('event-stream')) {
              res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
              pipeOpenAiSseToAnthropic(upRes, res, requestedModel || payload.model);
            } else {
              const parts = [];
              upRes.on('data', (c) => parts.push(c));
              upRes.on('end', () => {
                res.writeHead(200, { 'content-type': 'application/json' });
                try {
                  const d = JSON.parse(Buffer.concat(parts).toString('utf8'));
                  res.end(JSON.stringify(openAiToAnthropic(d, requestedModel || payload.model)));
                } catch {
                  res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'OpenClaude proxy: bad upstream response' } }));
                }
              });
            }
            return;
          }
          res.writeHead(upRes.statusCode, {
            'content-type': upRes.headers['content-type'] || 'application/json',
            'cache-control': 'no-cache'
          });
          if (isStream && ct.includes('event-stream')) {
            pipeNormalizedSse(upRes, res);
          } else {
            upRes.pipe(res);
          }
        });
        upReq.on('error', (err) => {
          res.writeHead(502, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: `OpenClaude proxy: upstream error: ${err.message}` } }));
        });
        upReq.end(body);
      };

      send(json, 0);
    });
  });

  proxyServer.listen(PROXY_PORT, '127.0.0.1');
  proxyServer.on('error', (err) => {
    console.error('proxy listen error', err);
    proxyServer = null;
  });
  updateTray();
  return true;
}

// Converts an OpenAI chat-completions SSE stream into Anthropic messages events.
function pipeOpenAiSseToAnthropic(upRes, res, requestedModel) {
  let buf = '';
  let started = false;
  let blockIndex = -1;
  let blockType = null; // 'text' | 'tool'
  let finishReason = null;
  let usage = null;
  let done = false;

  const emit = (obj) => res.write(`event: ${obj.type}\ndata: ${JSON.stringify(obj)}\n\n`);
  const start = () => {
    if (started) return;
    started = true;
    emit({
      type: 'message_start',
      message: {
        id: 'msg_openclaude_proxy', type: 'message', role: 'assistant', model: requestedModel,
        content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 }
      }
    });
  };
  const closeBlock = () => {
    if (blockIndex >= 0 && blockType) emit({ type: 'content_block_stop', index: blockIndex });
    blockType = null;
  };
  const openBlock = (type, blockInit) => {
    closeBlock();
    blockIndex += 1;
    blockType = type;
    emit({ type: 'content_block_start', index: blockIndex, content_block: blockInit });
  };
  const finalize = () => {
    if (done) return;
    done = true;
    start();
    closeBlock();
    const stop = finishReason === 'length' ? 'max_tokens' : finishReason === 'tool_calls' ? 'tool_use' : 'end_turn';
    emit({ type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: (usage && usage.completion_tokens) || 0 } });
    emit({ type: 'message_stop' });
  };

  const handleChunk = (d) => {
    if (d.usage) usage = d.usage;
    const choice = (d.choices || [])[0];
    if (!choice) return;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    const delta = choice.delta || {};
    if (delta.content) {
      start();
      if (blockType !== 'text') openBlock('text', { type: 'text', text: '' });
      emit({ type: 'content_block_delta', index: blockIndex, delta: { type: 'text_delta', text: delta.content } });
    }
    for (const tc of delta.tool_calls || []) {
      start();
      if (tc.id || (tc.function && tc.function.name)) {
        openBlock('tool', {
          type: 'tool_use',
          id: tc.id || `toolu_${Math.random().toString(36).slice(2)}`,
          name: (tc.function && tc.function.name) || '',
          input: {}
        });
      }
      if (tc.function && tc.function.arguments) {
        emit({ type: 'content_block_delta', index: blockIndex, delta: { type: 'input_json_delta', partial_json: tc.function.arguments } });
      }
    }
  };

  upRes.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith(':') || t.startsWith('event:')) continue;
      const payload = t.startsWith('data:') ? t.slice(5).trim() : t;
      if (payload === '[DONE]') { finalize(); continue; }
      try { handleChunk(JSON.parse(payload)); } catch {}
    }
  });
  upRes.on('end', () => { finalize(); res.end(); });
  upRes.on('error', () => { finalize(); res.end(); });
}

// Some upstream model routes emit broken SSE: bare JSON lines with no
// "data:" prefix, "{}" placeholders for hidden reasoning tokens, and no
// message_start / content_block_start envelope. Anthropic SDK clients
// (like Claude Desktop) need a well-formed stream, so this rebuilds one.
// Streams that are already well-formed pass through untouched.
function pipeNormalizedSse(upRes, res) {
  let buf = '';
  let mode = 'unknown'; // unknown | passthrough | fix
  let pending = ''; // raw bytes held while mode is unknown
  let sawMessageStart = false;
  let sawMessageDelta = false;
  let openBlockIndex = null;
  let done = false;

  const emit = (obj) => res.write(`event: ${obj.type}\ndata: ${JSON.stringify(obj)}\n\n`);

  const ensureEnvelope = (forIndex) => {
    if (!sawMessageStart) {
      sawMessageStart = true;
      emit({
        type: 'message_start',
        message: {
          id: 'msg_openclaude_proxy',
          type: 'message',
          role: 'assistant',
          model: 'openclaude-proxy',
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        }
      });
    }
    if (forIndex !== null && openBlockIndex === null) {
      openBlockIndex = forIndex;
      emit({ type: 'content_block_start', index: forIndex, content_block: { type: 'text', text: '' } });
    }
  };

  const closeBlock = () => {
    if (openBlockIndex !== null) {
      emit({ type: 'content_block_stop', index: openBlockIndex });
      openBlockIndex = null;
    }
  };

  const finalize = () => {
    if (done || mode !== 'fix') return;
    done = true;
    closeBlock();
    if (!sawMessageDelta) {
      ensureEnvelope(null);
      emit({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } });
    }
    if (sawMessageStart) emit({ type: 'message_stop' });
  };

  const handleObject = (obj) => {
    if (!obj || typeof obj.type !== 'string') return; // "{}" reasoning placeholders
    switch (obj.type) {
      case 'message_start':
        sawMessageStart = true;
        emit(obj);
        break;
      case 'content_block_start':
        ensureEnvelope(null);
        closeBlock();
        openBlockIndex = obj.index ?? 0;
        emit(obj);
        break;
      case 'content_block_delta':
        ensureEnvelope(obj.index ?? 0);
        emit(obj);
        break;
      case 'content_block_stop':
        if (openBlockIndex !== null) closeBlock();
        break;
      case 'message_delta':
        ensureEnvelope(null);
        closeBlock();
        sawMessageDelta = true;
        emit(obj);
        break;
      case 'message_stop':
        finalize();
        break;
      default:
        emit(obj); // ping etc.
    }
  };

  const handleLine = (line) => {
    const t = line.trim();
    if (mode === 'unknown') {
      if (t === '' || t.startsWith(':')) return; // comments/keepalives don't decide
      if (/^(event|data|id|retry):/.test(t) && !t.startsWith('data: [DONE]') && !t.startsWith('data:[DONE]')) {
        mode = 'passthrough';
        res.write(pending);
        pending = '';
        return; // this line is re-written by the raw chunk flow below
      }
      mode = 'fix';
    }
    if (mode !== 'fix') return;
    if (t === '' || t.startsWith(':')) return;
    if (/^data:\s*\[DONE\]$/.test(t)) { finalize(); return; }
    if (t.startsWith('event:')) return; // regenerated from the data payload's type
    const payload = t.startsWith('data:') ? t.slice(5).trim() : t;
    try {
      handleObject(JSON.parse(payload));
    } catch {}
  };

  upRes.on('data', (chunk) => {
    const raw = chunk.toString('utf8');
    if (mode === 'passthrough') { res.write(chunk); return; }
    if (mode === 'unknown') pending += raw;
    buf += raw;
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      handleLine(line);
      if (mode === 'passthrough') {
        // Decision just flipped; handleLine already replayed all raw bytes
        // received so far (`pending`), so just stop parsing.
        buf = '';
        return;
      }
    }
  });
  upRes.on('end', () => {
    if (mode === 'passthrough') { res.end(); return; }
    if (buf) handleLine(buf);
    finalize();
    res.end();
  });
  upRes.on('error', () => { finalize(); res.end(); });
}

function stopProxy() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
  }
  updateTray();
}

// Menu-bar mini mode: the tray is always present, shows proxy state, and lets
// the user switch between saved config profiles without opening the window.
function updateTray() {
  if (!tray) {
    let icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png'));
    if (!icon.isEmpty()) icon = icon.resize({ width: 18, height: 18 });
    tray = new Tray(icon);
  }
  tray.setToolTip(proxyServer ? 'OpenClaude — proxy running' : 'OpenClaude');

  let profiles = [];
  try { profiles = require('./state').readState().profiles || []; } catch {}
  const profileItems = profiles.length
    ? profiles.map((p) => ({
        label: `${p.name} (${p.main || 'default'})`,
        click: () => {
          const r = applyProfile(p);
          tray.setToolTip(r.ok ? `OpenClaude — applied "${p.name}"` : `OpenClaude — failed: ${r.error}`);
          for (const w of BrowserWindow.getAllWindows()) w.webContents.send('state:changed');
        }
      }))
    : [{ label: 'No saved profiles yet', enabled: false }];

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open OpenClaude', click: () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else BrowserWindow.getAllWindows()[0].focus(); } },
    { type: 'separator' },
    { label: proxyServer ? `Proxy: running on port ${PROXY_PORT}` : 'Proxy: stopped', enabled: false },
    { type: 'separator' },
    { label: 'Switch profile', enabled: false },
    ...profileItems,
    { type: 'separator' },
    { label: 'Quit (stops Claude Desktop proxy)', click: () => { stopProxy(); app.quit(); } }
  ]));
}

// --- Claude Desktop (configLibrary) ------------------------------------------
// Claude Desktop reads third-party inference settings from
// <appData>/Claude/configLibrary/<uuid>.json, selected by "appliedId" in
// _meta.json. This is the same store its own Developer → Configure
// Third-Party Inference UI writes to, and it is plain user-writable JSON.
// Note: an MDM/registry managed config, if present, takes precedence.

function readDesktopMeta() {
  try {
    const meta = JSON.parse(fs.readFileSync(CONFIG_META_PATH, 'utf8'));
    if (meta && typeof meta === 'object') return { appliedId: meta.appliedId || '', entries: meta.entries || [] };
  } catch {}
  return { appliedId: '', entries: [] };
}

function desktopInstalled() {
  return fs.existsSync(desktopDataDir());
}

// ── Claude Code & Claude Desktop installation detection ───

function detectClaudeCode() {
  const result = { installed: false, settingsPath: SETTINGS_PATH, hasSettings: false, hasEnv: false };
  try {
    result.hasSettings = fs.existsSync(SETTINGS_PATH);
    if (result.hasSettings) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      result.hasEnv = Boolean(s.env && Object.keys(s.env).length > 0);
      result.installed = true;
    } else {
      // settings.json doesn't exist yet, but Claude Code might still be installed
      // — check for the .claude directory or the claude binary
      result.installed = fs.existsSync(CLAUDE_DIR);
    }
  } catch {}
  return result;
}

function detectClaudeDesktop() {
  const result = { installed: false, appPath: null, dataDir: desktopDataDir(), thirdPartyDir: desktop3pDataDir() };
  if (process.platform === 'darwin') {
    const paths = [
      '/Applications/Claude.app',
      path.join(os.homedir(), 'Applications', 'Claude.app'),
      path.join(os.homedir(), 'Desktop', 'Claude.app'),
    ];
    for (const p of paths) { if (fs.existsSync(p)) { result.appPath = p; break; } }
    // Also search /Applications for any Claude*.app
    if (!result.appPath) {
      try {
        const apps = fs.readdirSync('/Applications').filter(f => f.startsWith('Claude') && f.endsWith('.app'));
        if (apps.length) result.appPath = path.join('/Applications', apps[0]);
      } catch {}
    }
  } else if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    const programs = process.env.ProgramFiles || 'C:\\Program Files';
    const programsX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const possible = [
      // Standard installs
      path.join(programs, 'Claude', 'Claude.exe'),
      path.join(programsX86, 'Claude', 'Claude.exe'),
      // Per-user installs (squirrel/electron-builder)
      path.join(local, 'Programs', 'Claude', 'Claude.exe'),
      path.join(local, 'Claude', 'Claude.exe'),
      path.join(local, 'claude-desktop', 'Claude.exe'),
      // Microsoft Store style
      path.join(programs, 'WindowsApps', 'Anthropic.Claude_*', 'Claude.exe'),
      // Common custom paths  
      path.join(os.homedir(), 'AppData', 'Local', 'Claude', 'Claude.exe'),
    ];
    for (const p of possible) {
      if (p.includes('*')) {
        // Glob pattern — check parent dir
        const parent = path.dirname(p);
        try {
          const entries = fs.readdirSync(parent, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && e.name.startsWith('Anthropic')) {
              const exe = path.join(parent, e.name, 'Claude.exe');
              if (fs.existsSync(exe)) { result.appPath = exe; break; }
            }
          }
        } catch {}
        if (result.appPath) break;
      } else if (fs.existsSync(p)) {
        result.appPath = p;
        break;
      }
    }
    // Even without exe, check if data dir exists (Claude was run once)
    if (!result.appPath && fs.existsSync(desktopDataDir())) {
      result.installed = true;
    }
  } else {
    const possible = [
      '/usr/bin/claude-desktop', '/usr/local/bin/claude-desktop',
      '/opt/Claude/claude-desktop', '/opt/claude-desktop/claude-desktop',
      path.join(os.homedir(), '.local/bin/claude-desktop'),
      path.join(os.homedir(), 'bin/claude-desktop'),
    ];
    for (const p of possible) { if (fs.existsSync(p)) { result.appPath = p; break; } }
    // Also check common Linux app directories
    if (!result.appPath) {
      try {
        const desktopFiles = ['/usr/share/applications/claude-desktop.desktop',
          path.join(os.homedir(), '.local/share/applications/claude-desktop.desktop')];
        for (const df of desktopFiles) {
          if (fs.existsSync(df)) {
            try {
              const content = fs.readFileSync(df, 'utf8');
              const exec = content.match(/^Exec=(.+)$/m);
              if (exec) result.appPath = exec[1].split(' ')[0];
            } catch {}
            break;
          }
        }
      } catch {}
    }
  }
  result.installed = Boolean(result.appPath) || fs.existsSync(desktopDataDir());
  result.hasDataDir = fs.existsSync(desktopDataDir());
  result.hasThirdPartyDir = fs.existsSync(desktop3pDataDir());
  return result;
}

function readDesktopConfig() {
  const meta = readDesktopMeta();
  if (!meta.appliedId) return { active: false };
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIG_LIBRARY_DIR, `${meta.appliedId}.json`), 'utf8'));
    const entry = meta.entries.find((e) => e.id === meta.appliedId);
    return {
      active: cfg.inferenceProvider === 'gateway' && readDeploymentMode() === '3p',
      entryName: entry ? entry.name : null,
      baseUrl: cfg.inferenceGatewayBaseUrl || null,
      hasToken: Boolean(cfg.inferenceGatewayApiKey),
      models: cfg.inferenceModels || []
    };
  } catch {
    return { active: false };
  }
}

function applyDesktopConfig({ baseUrl, apiKey, models }) {
  fs.mkdirSync(CONFIG_LIBRARY_DIR, { recursive: true });
  const meta = readDesktopMeta();

  // Reuse our existing entry if present, otherwise create a new one
  let entry = meta.entries.find((e) => e.name === OPENCLAUDE_ENTRY_NAME);
  if (!entry) {
    entry = { id: crypto.randomUUID(), name: OPENCLAUDE_ENTRY_NAME, provider: 'gateway' };
    meta.entries.push(entry);
  }

  const config = {
    inferenceProvider: 'gateway',
    inferenceGatewayBaseUrl: baseUrl,
    inferenceGatewayApiKey: apiKey,
    inferenceGatewayAuthScheme: 'auto',
    inferenceModels: models && models.length > 0 ? models : undefined
  };
  if (!config.inferenceModels) delete config.inferenceModels;

  fs.writeFileSync(path.join(CONFIG_LIBRARY_DIR, `${entry.id}.json`), JSON.stringify(config, null, 2) + '\n');
  meta.appliedId = entry.id;
  fs.writeFileSync(CONFIG_META_PATH, JSON.stringify(meta, null, 2) + '\n');
  // Without this the app stays in "1p" (Claude account) mode and silently
  // ignores the gateway config.
  writeDeploymentMode('3p');
}

function restoreDesktopConfig() {
  const meta = readDesktopMeta();
  const entry = meta.entries.find((e) => e.name === OPENCLAUDE_ENTRY_NAME);
  // Only detach if the applied config is ours — don't clobber a config the
  // user set up through Claude Desktop's own UI.
  if (entry && meta.appliedId === entry.id) {
    meta.appliedId = '';
    fs.writeFileSync(CONFIG_META_PATH, JSON.stringify(meta, null, 2) + '\n');
    writeDeploymentMode('1p');
    return { ok: true };
  }
  if (!meta.appliedId) {
    if (readDeploymentMode() === '3p') writeDeploymentMode('1p');
    return { ok: true };
  }
  return { ok: false, error: 'The active Claude Desktop config was not created by OpenClaude. Change it in Claude Desktop: Developer → Configure Third-Party Inference.' };
}

// --- Sync official Claude Desktop data into gateway (3p) mode -----------------
// Claude Desktop's gateway mode runs from a separate "-3p" data dir, so MCP
// servers, extensions, local sessions, and preferences configured in the
// official app are missing there. Copy them over (without overwriting anything
// the 3p side already has). Note: claude.ai conversations live on Anthropic's
// servers and cannot be carried over.
const SYNC_ITEMS = [
  'local-agent-mode-sessions',
  'claude-code-sessions',
  'Claude Extensions',
  'Claude Extensions Settings',
  'claude-code-vm',
  'vm_bundles',
  'blob_storage',
  'extensions-installations.json'
];

// Merge a directory from → to, keeping the NEWER version of each file
// (based on mtime). Directories are merged recursively.
function mergeDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const dstPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      mergeDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      const srcMtime = fs.statSync(srcPath).mtimeMs;
      let dstMtime = 0;
      try { dstMtime = fs.statSync(dstPath).mtimeMs; } catch {}
      if (srcMtime > dstMtime) {
        try {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
          fs.copyFileSync(srcPath, dstPath);
        } catch (err) {
          logError(`mergeDir copy failed ${srcPath} -> ${dstPath}: ${err.message}`);
        }
      }
    }
  }
}

function syncDesktopBothWays() {
  const d1 = desktopDataDir();
  const d3 = desktop3pDataDir();
  if (!fs.existsSync(d1)) return;
  fs.mkdirSync(d3, { recursive: true });
  // Sync sessions and extensions both ways (newer file wins).
  // Items may be files (extensions-installations.json) or directories
  // (local-agent-mode-sessions, claude-code-sessions, …).
  const syncPath = (src, dst) => {
    try {
      if (!fs.existsSync(src)) return;
      if (fs.statSync(src).isFile()) {
        let dstMtime = 0;
        try { dstMtime = fs.statSync(dst).mtimeMs; } catch {}
        if (fs.statSync(src).mtimeMs > dstMtime) {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
        }
      } else {
        mergeDir(src, dst);
      }
    } catch (err) {
      logError(`syncPath failed ${src} -> ${dst}: ${err.message}`);
    }
  };
  for (const item of SYNC_ITEMS) {
    syncPath(path.join(d1, item), path.join(d3, item));
    syncPath(path.join(d3, item), path.join(d1, item));
  }
  // Merge config: mcpServers, preferences, coworkUserFilesPath both ways
  try {
    const cfg1Path = path.join(d1, 'claude_desktop_config.json');
    const cfg3Path = DESKTOP_3P_CONFIG_PATH;
    if (fs.existsSync(cfg1Path)) {
      const cfg1 = JSON.parse(fs.readFileSync(cfg1Path, 'utf8'));
      let cfg3 = {};
      try { cfg3 = JSON.parse(fs.readFileSync(cfg3Path, 'utf8')); } catch {}
      let changed = false;
      for (const key of ['mcpServers', 'coworkUserFilesPath', 'preferences']) {
        if (cfg1[key] !== undefined && cfg3[key] === undefined) { cfg3[key] = cfg1[key]; changed = true; }
        if (cfg3[key] !== undefined && cfg1[key] === undefined) { cfg1[key] = cfg3[key]; changed = true; }
      }
      if (changed) {
        fs.writeFileSync(cfg3Path, JSON.stringify(cfg3, null, 2) + '\n');
        fs.writeFileSync(cfg1Path, JSON.stringify(cfg1, null, 2) + '\n');
      }
    }
  } catch (err) {
    logError(`sync config merge failed: ${err.message}`);
  }
}

// --- Proxy request log ---------------------------------------------------------
const PROXY_LOG_MAX = 300;
const proxyLog = [];

function pushProxyLog(entry) {
  proxyLog.push({ ts: Date.now(), ...entry });
  if (proxyLog.length > PROXY_LOG_MAX) proxyLog.shift();
}

// --- Error logging --------------------------------------------------------------
function logError(message) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'error.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {}
}

process.on('uncaughtException', (err) => {
  logError(`uncaught: ${err.stack || err.message}`);
});

// --- IPC handlers -----------------------------------------------------------

ipcMain.handle('claude:detect', () => ({
  platform: process.platform,
  homeDir: os.homedir(),
  code: detectClaudeCode(),
  desktop: detectClaudeDesktop()
}));

ipcMain.handle('claude:browse-desktop', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const filters = [];
  if (process.platform === 'darwin') filters.push({ name: 'Applications', extensions: ['app'] });
  else if (process.platform === 'win32') filters.push({ name: 'Executables', extensions: ['exe'] });
  const result = await dialog.showOpenDialog(win, {
    title: 'Locate Claude Desktop',
    properties: ['openFile'],
    filters
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('config:get', () => {
  const settings = readSettings();
  const env = settings.env || {};
  return {
    settingsPath: SETTINGS_PATH,
    settingsExists: fs.existsSync(SETTINGS_PATH),
    baseUrl: env.ANTHROPIC_BASE_URL || null,
    hasToken: Boolean(env.ANTHROPIC_AUTH_TOKEN),
    model: env.ANTHROPIC_MODEL || null,
    smallFastModel: env.ANTHROPIC_SMALL_FAST_MODEL || null
  };
});

function doApplyCode(cfg) {
  cfg.apiKey = resolveApiKey(cfg.apiKey);
  const settings = readSettings();
  settings.env = settings.env || {};
  if (cfg.protocol === 'openai') {
    // Claude Code only speaks the Anthropic protocol — route OpenAI-protocol
    // providers (NVIDIA NIM etc.) through the local translating proxy.
    const existing = readProxyConfig();
    writeProxyConfig({
      ...existing,
      enabled: true,
      upstreamBase: cfg.baseUrl,
      upstreamProtocol: 'openai',
      chatPath: cfg.chatPath || '/v1/chat/completions',
      apiKey: cfg.apiKey,
      mainModel: cfg.model || existing.mainModel,
      fastModel: cfg.smallFastModel || cfg.model || existing.fastModel
    });
    if (!startProxy()) return { ok: false, error: 'Could not start the local proxy.' };
    app.setLoginItemSettings({ openAtLogin: true });
    settings.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${PROXY_PORT}`;
    settings.env.ANTHROPIC_AUTH_TOKEN = 'openclaude-proxy';
    if (cfg.model) settings.env.ANTHROPIC_MODEL = cfg.model;
    else delete settings.env.ANTHROPIC_MODEL;
    if (cfg.smallFastModel) settings.env.ANTHROPIC_SMALL_FAST_MODEL = cfg.smallFastModel;
    else delete settings.env.ANTHROPIC_SMALL_FAST_MODEL;
    writeSettings(settings);
    return { ok: true };
  }
  settings.env.ANTHROPIC_BASE_URL = cfg.baseUrl;
  settings.env.ANTHROPIC_AUTH_TOKEN = cfg.apiKey;
  if (cfg.model) settings.env.ANTHROPIC_MODEL = cfg.model;
  else delete settings.env.ANTHROPIC_MODEL;
  if (cfg.smallFastModel) settings.env.ANTHROPIC_SMALL_FAST_MODEL = cfg.smallFastModel;
  else delete settings.env.ANTHROPIC_SMALL_FAST_MODEL;
  writeSettings(settings);
  return { ok: true };
}

ipcMain.handle('config:apply', (_evt, cfg) => doApplyCode(cfg));

ipcMain.handle('desktop:get', () => ({
  installed: desktopInstalled(),
  ...readDesktopConfig()
}));

function doApplyDesktop(cfg) {
  cfg.apiKey = resolveApiKey(cfg.apiKey);
  try {
    syncDesktopBothWays();
    if (cfg.viaProxy) {
      // Point Claude Desktop at the local proxy and route real provider models
      // through it. Each model is exposed under a "display route" name so
      // Claude Desktop's own model picker shows the real model name (the
      // zero-width spaces keep it past the claude-only name validation).
      const providerModels = [...new Set(cfg.models || [cfg.mainModel])].filter(Boolean);
      const fast = cfg.fastModel || providerModels[providerModels.length - 1];
      writeProxyConfig({
        enabled: true,
        upstreamBase: cfg.baseUrl,
        upstreamProtocol: cfg.protocol === 'openai' ? 'openai' : 'anthropic',
        chatPath: cfg.chatPath || '/v1/chat/completions',
        apiKey: cfg.apiKey,
        mainModel: providerModels[0],
        fastModel: fast
      });
      if (!startProxy()) return { ok: false, error: 'Could not start the local proxy.' };
      app.setLoginItemSettings({ openAtLogin: true });
      applyDesktopConfig({
        baseUrl: `http://127.0.0.1:${PROXY_PORT}`,
        apiKey: 'openclaude-proxy', // proxy injects the real key upstream
        models: providerModels.map(displayRoute)
      });
    } else {
      applyDesktopConfig(cfg);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

ipcMain.handle('desktop:apply', (_evt, cfg) => doApplyDesktop(cfg));

ipcMain.handle('desktop:restore', () => {
  try {
    const res = restoreDesktopConfig();
    if (res.ok) {
      syncDesktopBothWays();
      stopProxy();
      const cfg = readProxyConfig();
      if (cfg.enabled) writeProxyConfig({ ...cfg, enabled: false });
      app.setLoginItemSettings({ openAtLogin: false });
    }
    return res;
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Uninstall: reset both apps, remove proxy + login item ──
ipcMain.handle('app:uninstall', () => {
  try {
    // 1. Restore Claude Code
    const settings = readSettings();
    if (settings.env) {
      for (const key of MANAGED_KEYS) delete settings.env[key];
      if (Object.keys(settings.env).length === 0) delete settings.env;
    }
    writeSettings(settings);

    // 2. Restore Claude Desktop
    restoreDesktopConfig();

    // 3. Stop proxy + disable
    stopProxy();
    const pcfg = readProxyConfig();
    writeProxyConfig({ enabled: false });

    // 4. Remove login item
    app.setLoginItemSettings({ openAtLogin: false });

    // 5. Remove proxy config file
    try { fs.unlinkSync(PROXY_CONFIG_PATH()); } catch {}

    return {
      ok: true,
      platform: process.platform,
      claudeCodeSettings: SETTINGS_PATH,
      claudeDesktopData: desktop3pDataDir()
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('proxy:status', () => proxyStatus());

ipcMain.handle('proxy:log', () => proxyLog.slice().reverse());

// --- UI state persistence ---
const uiState = require('./state');

ipcMain.handle('state:get', () => uiState.getStateForRenderer());
ipcMain.handle('state:set', (_evt, patch) => {
  uiState.updateStateFromRenderer(patch);
  updateTray();
  return true;
});

// --- Auto-launch at login ---
ipcMain.handle('app:get-autolaunch', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('app:set-autolaunch', (_evt, on) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(on) });
  uiState.updateStateFromRenderer({ autoLaunch: Boolean(on) });
  return true;
});

// --- Update check & auto-update (electron-updater) ---------------------------
const REPO_SLUG = 'Superior-curtis/OpenClaude';

// Configure autoUpdater to use the GitHub release feed
autoUpdater.autoDownload = false; // we download on user confirmation
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:status', 'checking'));
});
autoUpdater.on('update-available', (info) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:status', 'available', info.version));
});
autoUpdater.on('update-not-available', () => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:status', 'not-available'));
});
autoUpdater.on('download-progress', (p) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:progress', p.percent));
});
autoUpdater.on('update-downloaded', (info) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:status', 'downloaded', info.version));
});
autoUpdater.on('error', (err) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update:status', 'error', err.message));
});

ipcMain.handle('app:check-update', async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'OpenClaude' }
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    const latest = String(data.tag_name || '').replace(/^v/, '');
    const current = app.getVersion();
    const newer = latest && latest.localeCompare(current, undefined, { numeric: true }) > 0;
    return { ok: true, current, latest, newer, url: data.html_url };
  } catch {
    return { ok: false };
  }
});

ipcMain.handle('app:auto-update', async () => {
  try {
    autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:auto-download', async () => {
  try {
    autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:auto-install', () => {
  setImmediate(() => autoUpdater.quitAndInstall());
  return { ok: true };
});

// --- Config profiles ---
// A profile bundles provider + key reference + model choices. Applying one
// re-runs the same code paths as the Apply buttons.
function applyProfile(profile) {
  const keys = uiState.getStateForRenderer().keys;
  const apiKey = profile.providerId === 'copilot' ? '__copilot_token__' : keys[profile.providerId];
  if (!apiKey) return { ok: false, error: `No saved API key for provider "${profile.providerId}".` };
  const base = {
    baseUrl: profile.baseUrl,
    apiKey,
    protocol: profile.protocol,
    chatPath: profile.chatPath
  };
  const results = [];
  if (profile.targets?.code !== false) {
    results.push(doApplyCode({ ...base, model: profile.main || null, smallFastModel: profile.fast || null }));
  }
  if (profile.targets?.desktop !== false && (profile.desktop || []).length > 0) {
    const models = profile.desktop;
    const viaProxy = profile.protocol === 'openai' || models.some((m) => !/(^|\/)claude-/.test(m));
    results.push(doApplyDesktop(
      viaProxy
        ? { ...base, viaProxy: true, models, mainModel: models[0], fastModel: profile.fast || null }
        : { ...base, models }
    ));
  }
  const failed = results.find((r) => !r.ok);
  return failed || { ok: true };
}

ipcMain.handle('profile:apply', (_evt, profile) => applyProfile(profile));

ipcMain.handle('config:restore', () => {
  const settings = readSettings();
  if (settings.env) {
    for (const key of MANAGED_KEYS) delete settings.env[key];
    if (Object.keys(settings.env).length === 0) delete settings.env;
  }
  writeSettings(settings);
  return { ok: true };
});

// Helper: resolve API key (may be stored Copilot token)
function resolveApiKey(key) {
  if (key === '__copilot_token__') return readCopilotToken() || key;
  return key;
}

// Fetch model list from the provider (done in main process: no CORS).
ipcMain.handle('provider:models', async (_evt, { baseUrl, apiKey, modelsPath }) => {
  const key = resolveApiKey(apiKey);
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const url = modelsPath ? `${base}${modelsPath}` : `${base}/v1/models`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        'x-api-key': key,
        'x-goog-api-key': key,
        Accept: 'application/json',
        'User-Agent': 'OpenClaude/0.1.6'
      }
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    // OpenAI/Anthropic shape: {data:[{id}]}. Gemini native: {models:[{name}]}.
    // Copilot: {data:[{id}]} or {models:[{id}]}
    const list = data.data || data.models || [];
    const models = list
      .map((m) => (m.id || m.name || m.slug || '').replace(/^models\//, ''))
      .filter(Boolean);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Send a tiny real message to verify key + endpoint end-to-end.
ipcMain.handle('provider:test', async (_evt, { baseUrl, apiKey, model, protocol, chatPath }) => {
  const key = resolveApiKey(apiKey);
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const headers = {
      'content-type': 'application/json',
      'x-api-key': key,
      Authorization: `Bearer ${key}`,
      'anthropic-version': '2023-06-01'
    };
    let res, reply;
    if (protocol === 'openai') {
      res = await fetch(`${base}${chatPath || '/v1/chat/completions'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Reply with the single word: ok' }]
        })
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
      const data = await res.json();
      reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '(empty)';
    } else {
      res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'claude-haiku-4-5',
          max_tokens: 16,
          // Content blocks (not a plain string): some gateways (e.g. Zen → DeepSeek)
          // drop string-form content during protocol translation.
          messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with the single word: ok' }] }]
        })
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
      const data = await res.json();
      reply = (data.content && data.content[0] && data.content[0].text) || '(empty)';
    }
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── GitHub Copilot device auth ─────────────────────────────────
const COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const COPILOT_TOKEN_PATH = () => path.join(app.getPath('userData'), 'copilot-token.json');

let copilotDeviceCode = null;
let copilotPollInterval = null;

function readCopilotToken() {
  try { return JSON.parse(fs.readFileSync(COPILOT_TOKEN_PATH(), 'utf8')).token || null; }
  catch { return null; }
}

function writeCopilotToken(token) {
  try { fs.mkdirSync(path.dirname(COPILOT_TOKEN_PATH()), { recursive: true }); } catch {}
  fs.writeFileSync(COPILOT_TOKEN_PATH(), JSON.stringify({ token }), 'utf8');
}

function clearCopilotToken() {
  try { fs.unlinkSync(COPILOT_TOKEN_PATH()); } catch {}
}

ipcMain.handle('copilot:auth-start', async () => {
  try {
    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: COPILOT_CLIENT_ID, scope: 'read:user' })
    });
    const data = await res.json();
    if (!data.device_code) return { ok: false, error: data.error_description || 'Failed to start device auth' };
    copilotDeviceCode = data.device_code;
    copilotPollInterval = data.interval || 5;
    return { ok: true, verification_uri: data.verification_uri, user_code: data.user_code, interval: copilotPollInterval };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('copilot:auth-poll', async () => {
  if (!copilotDeviceCode) return { ok: false, error: 'No pending auth. Start device auth first.' };
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        device_code: copilotDeviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });
    const data = await res.json();
    if (data.access_token) {
      writeCopilotToken(data.access_token);
      copilotDeviceCode = null;
      return { ok: true, done: true };
    }
    if (data.error === 'authorization_pending') return { ok: true, done: false };
    if (data.error === 'slow_down') return { ok: true, done: false, slowDown: true };
    return { ok: false, error: data.error_description || data.error || 'Auth failed' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('copilot:auth-status', () => ({
  hasToken: Boolean(readCopilotToken())
}));

ipcMain.handle('copilot:auth-clear', () => {
  copilotDeviceCode = null;
  clearCopilotToken();
  return { ok: true };
});

app.whenReady().then(() => {
  // Resume the Claude Desktop proxy after a reboot or app restart
  startProxy();
  updateTray(); // menu-bar mini mode is always available
  // When launched at login purely to serve the proxy, stay in the background
  const loginLaunch = app.getLoginItemSettings().wasOpenedAtLogin;
  if (!(loginLaunch && proxyServer)) createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep running headless while the Claude Desktop proxy is active
  if (proxyServer) return;
  if (process.platform !== 'darwin') app.quit();
});
