// Models that NVIDIA NIM (and some OpenAI-compatible hosts) list but that are
// NOT chat/completions models — embeddings, rerankers, speech, vision-OCR,
// image/video generation, biology, etc. Excluded from the picker.
// Source of truth lives in src/model-filter.js (also unit-tested); this is a
// preload-injected copy so the renderer needs no module loader.
const NON_CHAT = (window.openclaude && window.openclaude.NON_CHAT)
  || /embed|rerank|retriev|reranking|\bocr\b|paddleocr|parakeet|canary|riva|\basr\b|\btts\b|\bstt\b|speech|codec|fastpitch|audio2face|maxine|nvclip|\bclip\b|dragon|table-structure|surya|deplot|\bsam[- ]?2?\b|segment|depth|\besm\b|diffdock|molmim|genmol|proteinmpnn|rfdiffusion|boltz|evo2|\bvad\b|imagen|\bveo\b|image-generation|text-to-image|stable-diffusion|sdxl|flux|cosmos|nemoretriever|aqa|guard|safety|content-safety|topic-control|jailbreak/i;

const PROVIDERS = [
  // --- Built-in services ---
  { id: 'go', name: 'OpenCode Go', desc: '$10/mo · GLM, Kimi, DeepSeek…', baseUrl: 'https://opencode.ai/zen/go', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Same key as OpenCode Zen — needs an active OpenCode Go subscription.' },
  { id: 'zen', name: 'OpenCode Zen', desc: 'Pay-per-use · Claude, GPT, Gemini…', baseUrl: 'https://opencode.ai/zen', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Get your key at opencode.ai/zen. Paid models need balance; free models end in "-free".' },
  { id: 'openrouter', name: 'OpenRouter', desc: '280+ models · unified API', baseUrl: 'https://openrouter.ai/api', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Create a key at openrouter.ai/keys. Pay-per-token, many free models available.' },

  // --- Official APIs ---
  { id: 'anthropic', name: 'Anthropic', desc: 'Official Claude API', baseUrl: 'https://api.anthropic.com', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Your own Anthropic API key (console.anthropic.com). Billed by Anthropic.' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-5, o-series…', baseUrl: 'https://api.openai.com', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Your OpenAI key (sk-…). Runs through local proxy for protocol translation.' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Gemini 2.x / 3.x', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', protocol: 'openai', modelsPath: '/models', chatPath: '/chat/completions', exclude: /embedding|aqa|imagen|veo|\btts\b|image-generation/i,
    keyHint: 'Your Google AI Studio key (AIza…). Free tier available. Via local proxy.' },
  { id: 'grok', name: 'xAI Grok', desc: 'Grok 4 / 3…', baseUrl: 'https://api.x.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: /image|vision-only/i,
    keyHint: 'Your xAI key (xai-…). console.x.ai. Via local proxy.' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'V3 / R1', baseUrl: 'https://api.deepseek.com/anthropic', protocol: 'anthropic', modelsPath: '/v1/models', staticModels: ['deepseek-chat', 'deepseek-reasoner'],
    keyHint: 'Your DeepSeek key (platform.deepseek.com). Anthropic-protocol endpoint.' },
  { id: 'mistral', name: 'Mistral AI', desc: 'Mistral / Codestral', baseUrl: 'https://api.mistral.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: /embed|ocr|moderation/i,
    keyHint: 'Your Mistral key (console.mistral.ai). Via local proxy.' },

  // --- Fast inference ---
  { id: 'groq', name: 'Groq', desc: 'Ultra-fast · LPU inference', baseUrl: 'https://api.groq.com/openai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: /whisper|audio|guard/i,
    keyHint: 'Your Groq key (console.groq.com). Free tier available. Via local proxy.' },
  { id: 'together', name: 'Together AI', desc: '200+ open models', baseUrl: 'https://api.together.xyz', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: NON_CHAT,
    keyHint: 'Your Together key (api.together.ai). Via local proxy.' },
  { id: 'fireworks', name: 'Fireworks AI', desc: 'Fast serverless', baseUrl: 'https://api.fireworks.ai/inference', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: /embed|image|stabilityai|fuyu|vision/i,
    keyHint: 'Your Fireworks key (fireworks.ai). Via local proxy.' },
  { id: 'cerebras', name: 'Cerebras', desc: 'Llama 4 · fastest', baseUrl: 'https://api.cerebras.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Your Cerebras key (cloud.cerebras.ai). Via local proxy.' },
  // --- Specialized ---
  { id: 'perplexity', name: 'Perplexity',
    desc: 'Search-grounded',
    baseUrl: 'https://api.perplexity.ai', protocol: 'openai', modelsPath: null, chatPath: '/chat/completions',
    staticModels: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning', 'sonar-deep-research'],
    keyHint: 'Your Perplexity key (perplexity.ai/settings). Curated model list — no models endpoint.' },
  { id: 'copilot', name: 'GitHub Copilot',
    desc: 'Device auth · GPT-5, Claude…',
    baseUrl: 'https://api.github.com/copilot', protocol: 'openai', modelsPath: '/models', chatPath: '/chat/completions',
    auth: 'device',
    keyHint: 'Uses GitHub device auth. Click "Login with GitHub" — no API key needed.' },
  // --- Regional ---
  { id: 'zai', name: 'Z.AI', desc: 'GLM models', baseUrl: 'https://api.z.ai/api/anthropic', protocol: 'anthropic', modelsPath: '/v1/models', staticModels: ['glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-flash'],
    keyHint: 'Your Z.AI key (z.ai developer console). Anthropic-protocol endpoint.' },
  { id: 'nim', name: 'NVIDIA NIM', desc: 'Llama, Nemotron…', baseUrl: 'https://integrate.api.nvidia.com', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions', exclude: NON_CHAT,
    keyHint: 'Your NVIDIA key (nvapi-…, build.nvidia.com). Non-chat models are auto-filtered. Via local proxy.' },
  { id: 'custom', name: 'Custom…', desc: 'Any Anthropic / OpenAI API', baseUrl: null,
    keyHint: 'Enter the base URL and pick the protocol your provider speaks.' }
];

const ZWSP = '\u200b';
const $ = (id) => document.getElementById(id);
let selectedProvider = PROVIDERS[0];
let loadedModels = [];
let uiState = { keys: {}, models: {}, customProviders: [], profiles: [] };
let providerFilter = '';

// Error boundary: any uncaught renderer error shows a reload overlay instead of
// a blank window.
window.addEventListener('error', (e) => showErrorOverlay(e.message || 'Unknown error'));
window.addEventListener('unhandledrejection', (e) => showErrorOverlay((e.reason && e.reason.message) || 'Unhandled promise rejection'));
function showErrorOverlay(msg) {
  const el = document.getElementById('errorOverlay');
  if (!el) return;
  document.getElementById('errorOverlayMsg').textContent = msg;
  el.classList.remove('hidden');
}

function allProviders() {
  // Saved custom presets appear right before the "Custom\u2026" tile.
  const customTile = PROVIDERS[PROVIDERS.length - 1];
  const builtins = PROVIDERS.slice(0, -1);
  return [...builtins, ...uiState.customProviders, customTile];
}

function isCustom() { return selectedProvider.id === 'custom'; }
function currentBaseUrl() { return isCustom() ? $('customUrl').value.trim() : selectedProvider.baseUrl; }
function currentProtocol() { return isCustom() ? $('customProtocol').value : (selectedProvider.protocol || 'anthropic'); }
function currentChatPath() { return isCustom() ? '/v1/chat/completions' : (selectedProvider.chatPath || '/v1/chat/completions'); }
function currentModelsPath() { return isCustom() ? '/v1/models' : (selectedProvider.modelsPath || '/v1/models'); }

function providerCfg() {
  const cfg = {
    baseUrl: currentBaseUrl(),
    apiKey: selectedProvider.auth === 'device' ? '__copilot_token__' : $('apiKey').value.trim(),
    protocol: currentProtocol(),
    chatPath: currentChatPath(),
  };
  if (selectedProvider.modelsPath !== null) cfg.modelsPath = currentModelsPath();
  return cfg;
}

function showResult(ok, message) {
  const el = $('result');
  el.classList.remove('hidden');
  el.className = `result ${ok ? 'result-ok' : 'result-err'}`;
  el.textContent = message;
}

function hideResult() {
  $('result').classList.add('hidden');
}

function setBusy(busy) {
  for (const id of ['testBtn', 'applyBtn', 'restoreBtn', 'applyDesktopBtn', 'restoreDesktopBtn', 'loadModelsBtn']) $(id).disabled = busy;
}

function validate() {
  const cfg = providerCfg();
  if (!cfg.baseUrl) { showResult(false, 'Choose a provider or enter a base URL.'); return null; }
  if (!/^https?:\/\//.test(cfg.baseUrl)) { showResult(false, 'The base URL must start with https://'); return null; }
  if (selectedProvider.auth === 'device') return cfg; // Copilot: no API key field
  if (!cfg.apiKey) { showResult(false, 'Enter your API key.'); return null; }
  return cfg;
}

// --- Provider tiles ----------------------------------------------------------

function selectProvider(p) {
  selectedProvider = p;
  loadedModels = [];
  $('customRow').classList.toggle('hidden', p.id !== 'custom');
  const isCopilot = p.auth === 'device';
  $('apiKeyRow').classList.toggle('hidden', isCopilot);
  $('copilotAuthRow').classList.toggle('hidden', !isCopilot);
  $('desktopModelsWrap').classList.add('hidden');
  $('modelSelect').innerHTML = '<option value="">Provider default</option>';
  $('fastModelSelect').innerHTML = '<option value="">Provider default</option>';
  // Restore the saved key + model choices for this provider, if any.
  $('apiKey').value = uiState.keys[p.id] || '';
  const saved = uiState.models[p.id];
  if (saved && (loadedModels.length || saved.main)) restoreSavedModels(saved);
  persistSelection();
  renderProviders();
  hideResult();
}

function renderProviders() {
  const grid = $('providerGrid');
  grid.innerHTML = '';
  const f = providerFilter.toLowerCase();
  for (const p of allProviders()) {
    if (f && !(`${p.name} ${p.desc || ''}`.toLowerCase().includes(f))) continue;
    const btn = document.createElement('button');
    btn.className = 'ptile' + (p.id === selectedProvider.id ? ' sel' : '');
    const proto = p.id === 'custom' ? '' : `<span class="proto">${p.protocol === 'openai' ? 'OpenAI' : 'Anthropic'}</span>`;
    const removable = p.custom ? `<span class="x" title="Remove preset" data-remove="${p.id}">✕</span>` : '';
    btn.innerHTML = `${proto}<div class="pn">${p.name} ${removable}</div><div class="pd">${p.desc || p.baseUrl || ''}</div>`;
    btn.addEventListener('click', (e) => {
      if (e.target.dataset && e.target.dataset.remove) {
        uiState.customProviders = uiState.customProviders.filter((c) => c.id !== e.target.dataset.remove);
        window.openclaude.setState({ customProviders: uiState.customProviders });
        renderProviders();
        return;
      }
      selectProvider(p);
    });
    grid.appendChild(btn);
  }
  $('providerHint').textContent = selectedProvider.keyHint || `Custom ${selectedProvider.protocol} provider.`;
}

// --- Models ------------------------------------------------------------------

function fillSelect(select, models, preferred) {
  const prev = select.value;
  select.innerHTML = '<option value="">Provider default</option>';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  }
  const pref = preferred.find((p) => models.includes(p));
  select.value = models.includes(prev) ? prev : (pref || '');
}

function renderDesktopChecks(models) {
  const wrap = $('desktopModels');
  wrap.innerHTML = '';
  for (const m of models) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = m;
    cb.addEventListener('change', () => {
      if (wrap.querySelectorAll('input:checked').length > 4) {
        cb.checked = false;
        showResult(false, "Claude Desktop's menu holds up to 4 models.");
      }
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(m));
    wrap.appendChild(label);
  }
  $('desktopModelsWrap').classList.remove('hidden');
}

function checkedDesktopModels() {
  return [...$('desktopModels').querySelectorAll('input:checked')].map((c) => c.value);
}

async function loadModels() {
  if (selectedProvider.auth === 'device') { await copilotLoadModels(); return; }
  const cfg = validate();
  if (!cfg) return;

  // Provider with no models endpoint — use static list
  if (selectedProvider.modelsPath === null && selectedProvider.staticModels) {
    let models = selectedProvider.staticModels.slice();
    if (selectedProvider.exclude) models = models.filter((m) => !selectedProvider.exclude.test(m));
    models = models.filter((m) => !NON_CHAT.test(m));
    models.sort();
    loadedModels = models;
    fillSelect($('modelSelect'), models, ['claude-sonnet-4-5', 'gpt-5.5', 'gemini-3-pro', 'grok-4', 'sonar-pro', 'deepseek-chat']);
    fillSelect($('fastModelSelect'), models, ['claude-haiku-4-5', 'gpt-5-nano', 'gemini-3-flash', 'sonar', 'deepseek-chat']);
    renderDesktopChecks(models);
    showResult(true, `Loaded ${models.length} models (curated list).`);
    return;
  }

  setBusy(true);
  showResult(true, 'Loading models…');
  const res = await window.openclaude.fetchModels(cfg);
  setBusy(false);

  let models = res.ok ? res.models : [];
  if (selectedProvider.exclude) models = models.filter((m) => !selectedProvider.exclude.test(m));
  models = models.filter((m) => !NON_CHAT.test(m));
  if (models.length === 0 && selectedProvider.staticModels) models = selectedProvider.staticModels.slice();
  models.sort();

  if (models.length === 0) {
    showResult(false, res.ok ? 'No usable models returned. You can still apply with the provider default.' : `Could not load models: ${res.error}. You can still apply with the provider default.`);
    return;
  }
  loadedModels = models;
  fillSelect($('modelSelect'), models, ['claude-sonnet-4-5', 'gpt-5.5', 'gemini-3-pro', 'grok-4', 'sonar-pro', 'deepseek-chat']);
  fillSelect($('fastModelSelect'), models, ['claude-haiku-4-5', 'gpt-5-nano', 'gemini-3-flash', 'sonar', 'deepseek-chat']);
  renderDesktopChecks(models);
  persistModels();
  showResult(true, `Loaded ${models.length} models.`);
}

// --- Status ------------------------------------------------------------------

function cleanRoute(m) { return m.split(ZWSP).join('').replace(/ \(claude\)$/, ''); }

async function detectInstall() {
  try {
    const d = await window.openclaude.detectInstall();
    const lines = [];

    // Claude Code
    const cc = d.code;
    if (cc.installed) {
      lines.push(`<div class="detect-ok">Claude Code found &mdash; <code>${cc.settingsPath}</code></div>`);
    } else {
      lines.push(`<div class="detect-miss">Claude Code not detected. Install it first, then restart OpenClaude.</div>`);
      lines.push(`<div style="font-size:11px;color:var(--text-faint)">Expected at: <code>${cc.settingsPath}</code></div>`);
    }

    // Claude Desktop
    const cd = d.desktop;
    if (cd.installed) {
      const pathInfo = cd.appPath ? `<code>${cd.appPath}</code>` : `data at <code>${cd.dataDir}</code>`;
      lines.push(`<div class="detect-ok">Claude Desktop found &mdash; ${pathInfo}</div>`);
      $('applyDesktopBtn').disabled = false;
      $('restoreDesktopBtn').disabled = false;
    } else {
      lines.push(`<div class="detect-miss">Claude Desktop not found.</div>`);
      lines.push(`<div style="font-size:11px;color:var(--text-faint)">Searched standard install paths. If you installed Claude Desktop elsewhere, locate it manually:</div>`);
      lines.push(`<button id="browseDesktopBtn" class="btn btn-soft" style="margin-top:6px">Browse for Claude Desktop...</button>`);
      $('applyDesktopBtn').disabled = true;
      $('restoreDesktopBtn').disabled = true;
    }

    $('detectResult').innerHTML = lines.join('');
    $('desktopDataPath').textContent = cd.dataDir || '—';

    // Wire up browse button if present
    const browseBtn = document.getElementById('browseDesktopBtn');
    if (browseBtn) {
      browseBtn.addEventListener('click', async () => {
        const p = await window.openclaude.browseDesktop();
        if (p) {
          // Re-run detection after manual selection
          detectInstall();
        }
      });
    }
  } catch (e) {
    $('detectResult').innerHTML = '<div>Detection unavailable</div>';
  }
}

async function refreshStatus() {
  const cfg = await window.openclaude.getConfig();
  const desktop = await window.openclaude.getDesktopConfig();
  $('settingsPath').textContent = cfg.settingsPath;

  const badge = $('statusBadge');
  if (cfg.baseUrl || desktop.active) {
    badge.className = 'badge badge-on';
    badge.textContent = '● Third-party provider active';
  } else {
    badge.className = 'badge badge-off';
    badge.textContent = '○ Official Anthropic';
  }

  const rows = [];
  const ccEndpoint = cfg.baseUrl && cfg.baseUrl.includes('127.0.0.1') ? `${(await window.openclaude.proxyStatus()).upstreamBase} (via proxy)` : (cfg.baseUrl || 'Official Anthropic');
  rows.push(`<div><span class="k">Endpoint</span>${ccEndpoint}</div>`);
  rows.push(`<div><span class="k">API key</span>${cfg.hasToken ? 'set' : 'not set'}</div>`);
  rows.push(`<div><span class="k">Main</span>${cfg.model || 'default'}</div>`);
  rows.push(`<div><span class="k">Fast</span>${cfg.smallFastModel || 'default'}</div>`);
  $('currentConfig').innerHTML = rows.join('');

  const d = [];
  if (!desktop.installed) {
    d.push('<div>Not installed on this computer.</div>');
    $('applyDesktopBtn').disabled = true;
    $('restoreDesktopBtn').disabled = true;
  } else if (desktop.active) {
    const proxy = await window.openclaude.proxyStatus();
    const viaProxy = desktop.baseUrl && desktop.baseUrl.includes(`127.0.0.1:${proxy.port}`);
    if (viaProxy) {
      d.push(`<div><span class="k">Endpoint</span>${proxy.upstreamBase} (proxy)</div>`);
      d.push(`<div><span class="k">Proxy</span>${proxy.running ? '🟢 running' : '🔴 stopped — open OpenClaude'}</div>`);
      const names = (desktop.models || []).map(cleanRoute);
      if (names.length) d.push(`<div><span class="k">Models</span>${names.join(', ')}</div>`);
    } else {
      d.push(`<div><span class="k">Endpoint</span>${desktop.baseUrl || '?'}</div>`);
      d.push(`<div><span class="k">Models</span>${(desktop.models || []).join(', ') || 'default'}</div>`);
    }
  } else {
    d.push('<div>Official Anthropic (your Claude account)</div>');
  }
  $('currentDesktopConfig').innerHTML = d.join('');
}

// --- Actions -----------------------------------------------------------------

async function testConnection() {
  const cfg = validate();
  if (!cfg) return;
  if (cfg.protocol === 'openai' && !$('modelSelect').value) {
    showResult(false, 'OpenAI-protocol providers need a model to test — Load models and pick a main model first.');
    return;
  }
  setBusy(true);
  showResult(true, 'Testing… (sending a tiny message)');
  const res = await window.openclaude.testConnection({ ...cfg, model: $('modelSelect').value || undefined });
  setBusy(false);
  if (res.ok) showResult(true, `✓ Works! The model replied: "${res.reply.trim()}"`);
  else showResult(false, `✗ Failed: ${res.error}`);
}

async function applyConfig() {
  const cfg = validate();
  if (!cfg) return;
  if (cfg.protocol === 'openai' && !$('modelSelect').value) {
    showResult(false, 'OpenAI-protocol providers need a main model — Load models and pick one first.');
    return;
  }
  setBusy(true);
  const res = await window.openclaude.applyConfig({
    ...cfg,
    model: $('modelSelect').value || null,
    smallFastModel: $('fastModelSelect').value || null
  });
  setBusy(false);
  if (res.ok) {
    showResult(true, '✓ Applied to Claude Code. Open a new terminal (or restart your Claude Code session) to use it.');
    refreshStatus();
  } else {
    showResult(false, `Failed: ${res.error}`);
  }
}

async function applyDesktop() {
  const cfg = validate();
  if (!cfg) return;
  let models = checkedDesktopModels();
  if (models.length === 0) models = [...new Set([$('modelSelect').value, $('fastModelSelect').value].filter(Boolean))];
  if (models.length === 0) {
    showResult(false, 'Pick at least one model (step 3) for Claude Desktop.');
    return;
  }
  const viaProxy = cfg.protocol === 'openai' || models.some((m) => !/(^|\/)claude-/.test(m));
  setBusy(true);
  const res = await window.openclaude.applyDesktopConfig(
    viaProxy
      ? { ...cfg, viaProxy: true, models, mainModel: models[0], fastModel: $('fastModelSelect').value || null }
      : { ...cfg, models }
  );
  setBusy(false);
  if (res.ok) {
    showResult(true, viaProxy
      ? `✓ Applied via OpenClaude's background proxy. These appear in Claude Desktop's own model menu: ${models.join(', ')}. Keep OpenClaude running (tray icon), then fully quit and reopen Claude Desktop.`
      : '✓ Applied to Claude Desktop. Fully quit and reopen it. Choose "Continue with Gateway" if prompted.');
    refreshStatus();
  } else {
    showResult(false, `Failed: ${res.error}`);
  }
}

async function restoreCode() {
  setBusy(true);
  const res = await window.openclaude.restoreOfficial();
  setBusy(false);
  if (res.ok) { showResult(true, '✓ Claude Code reset to official Anthropic. Restart your session.'); refreshStatus(); }
}

async function restoreDesktop() {
  setBusy(true);
  const res = await window.openclaude.restoreDesktopConfig();
  setBusy(false);
  if (res.ok) { showResult(true, 'Claude Desktop reset to official Anthropic. Quit and reopen it.'); refreshStatus(); }
  else showResult(false, res.error);
}

async function uninstallApp() {
  if (!confirm('This will restore Claude Code and Claude Desktop to official Anthropic and remove OpenClaude\'s configuration.\n\nContinue?')) return;
  setBusy(true);
  const res = await window.openclaude.uninstall();
  setBusy(false);
  if (res.ok) {
    const cleanupMsg = res.platform === 'darwin'
      ? 'All settings restored. Drag OpenClaude from /Applications to the Trash to finish.'
      : res.platform === 'win32'
        ? 'All settings restored. Use "Add or Remove Programs" in Windows Settings to uninstall OpenClaude.'
        : 'All settings restored. Remove the OpenClaude AppImage/deb to finish.';
    showResult(true, 'Cleanup complete. ' + cleanupMsg);
    refreshStatus();
  } else {
    showResult(false, `Cleanup failed: ${res.error}`);
  }
}

// ── Copilot device auth ────────────────────────────────────────
async function copilotLogin() {
  setBusy(true);
  const res = await window.openclaude.copilotAuthStart();
  setBusy(false);
  if (!res.ok) { showResult(false, `Auth failed: ${res.error}`); return; }
  $('copilotStatus').textContent = `Open ${res.verification_uri} and enter code: ${res.user_code}`;
  $('copilotLoginBtn').classList.add('hidden');
  let waitMs = (res.interval || 5) * 1000;
  const poll = async () => {
    const p = await window.openclaude.copilotAuthPoll();
    if (p.ok && p.done) {
      $('copilotStatus').textContent = 'Logged in to GitHub Copilot.';
      $('copilotLogoutBtn').classList.remove('hidden');
      $('copilotLoginBtn').classList.add('hidden');
      setBusy(false);
      copilotLoadModels();
      return;
    }
    if (!p.ok) {
      $('copilotStatus').textContent = `Auth failed: ${p.error}`;
      $('copilotLoginBtn').classList.remove('hidden');
      setBusy(false);
      return;
    }
    if (p.slowDown) waitMs += 5000;
    setTimeout(poll, waitMs);
  };
  setTimeout(poll, waitMs);
}

async function copilotLogout() {
  await window.openclaude.copilotAuthClear();
  $('copilotStatus').textContent = '';
  $('copilotLoginBtn').classList.remove('hidden');
  $('copilotLogoutBtn').classList.add('hidden');
}

async function copilotLoadModels() {
  const status = await window.openclaude.copilotAuthStatus();
  if (!status.hasToken) { showResult(false, 'Login with GitHub first.'); return; }
  const cfg = {
    baseUrl: selectedProvider.baseUrl,
    apiKey: '__copilot_token__', // main.js knows to use stored token
    protocol: 'openai',
    chatPath: '/chat/completions',
    modelsPath: '/models'
  };
  setBusy(true);
  showResult(true, 'Loading models…');
  const res = await window.openclaude.fetchModels(cfg);
  setBusy(false);
  if (!res.ok) { showResult(false, `Copilot error: ${res.error}`); return; }
  let models = res.ok ? res.models : [];
  models = models.filter((m) => !NON_CHAT.test(m));
  models.sort();
  if (models.length === 0) {
    showResult(false, 'No models returned.');
    return;
  }
  loadedModels = models;
  fillSelect($('modelSelect'), models, ['gpt-5', 'claude-sonnet-4-5', 'gemini-3-flash']);
  fillSelect($('fastModelSelect'), models, ['gpt-5-nano', 'claude-haiku-4-5']);
  renderDesktopChecks(models);
  persistModels();
  showResult(true, `Loaded ${models.length} models.`);
}

// --- Persistence -------------------------------------------------------------

function persistSelection() {
  window.openclaude.setState({ selectedProviderId: selectedProvider.id });
}

// Persist the current API key under the active provider (debounced on input).
function persistKey() {
  if (selectedProvider.auth === 'device') return;
  const key = $('apiKey').value.trim();
  uiState.keys[selectedProvider.id] = key;
  window.openclaude.setState({ keys: { [selectedProvider.id]: key } });
}

function persistModels() {
  uiState.models[selectedProvider.id] = {
    main: $('modelSelect').value || '',
    fast: $('fastModelSelect').value || '',
    desktop: checkedDesktopModels()
  };
  window.openclaude.setState({ models: uiState.models });
}

function restoreSavedModels(saved) {
  if (!saved) return;
  const opts = new Set([saved.main, saved.fast, ...(saved.desktop || [])].filter(Boolean));
  if (opts.size === 0) return;
  // Seed the selects/checks from the saved set so a relaunch shows the choice
  // even before the user re-loads the live model list.
  fillSelect($('modelSelect'), [...opts], [saved.main]);
  fillSelect($('fastModelSelect'), [...opts], [saved.fast]);
  $('modelSelect').value = saved.main || '';
  $('fastModelSelect').value = saved.fast || '';
}

async function loadPersistedState() {
  uiState = await window.openclaude.getState();
  uiState.keys = uiState.keys || {};
  uiState.models = uiState.models || {};
  uiState.customProviders = (uiState.customProviders || []).map((c) => ({ ...c, custom: true }));
  uiState.profiles = uiState.profiles || [];
  const all = allProviders();
  const last = all.find((p) => p.id === uiState.selectedProviderId);
  renderProviders();
  renderProfiles();
  if (last) selectProvider(last);
}

// --- Custom presets ----------------------------------------------------------

function saveCustomPreset() {
  const name = $('customPresetName').value.trim();
  const baseUrl = $('customUrl').value.trim();
  if (!name || !baseUrl) { showResult(false, 'Enter a preset name and base URL first.'); return; }
  const preset = {
    id: 'custom-' + Date.now().toString(36),
    name,
    baseUrl,
    protocol: $('customProtocol').value,
    desc: baseUrl,
    custom: true,
    keyHint: 'Saved custom provider.'
  };
  uiState.customProviders.push(preset);
  window.openclaude.setState({ customProviders: uiState.customProviders.map(({ custom, ...c }) => c) });
  $('customPresetName').value = '';
  renderProviders();
  selectProvider(preset);
  showResult(true, `Saved preset "${name}".`);
}

// --- Config profiles ---------------------------------------------------------

function renderProfiles() {
  const row = $('profilesRow');
  if (!uiState.profiles.length) { row.classList.add('hidden'); return; }
  row.classList.remove('hidden');
  row.innerHTML = '';
  uiState.profiles.forEach((p, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `<span data-apply="${i}">${p.name}</span><span class="x" data-del="${i}" title="Delete">✕</span>`;
    chip.addEventListener('click', async (e) => {
      if (e.target.dataset.del !== undefined) {
        uiState.profiles.splice(Number(e.target.dataset.del), 1);
        window.openclaude.setState({ profiles: uiState.profiles });
        renderProfiles();
        return;
      }
      setBusy(true);
      const res = await window.openclaude.applyProfile(p);
      setBusy(false);
      showResult(res.ok, res.ok ? `✓ Applied profile "${p.name}". Restart Claude Code / Desktop.` : `Failed: ${res.error}`);
      refreshStatus();
    });
    row.appendChild(chip);
  });
}

function saveProfile() {
  const name = prompt('Profile name (e.g. "Go GLM", "OpenAI GPT-5"):');
  if (!name) return;
  const cfg = providerCfg();
  const desktop = checkedDesktopModels();
  const profile = {
    name,
    providerId: selectedProvider.id,
    baseUrl: cfg.baseUrl,
    protocol: cfg.protocol,
    chatPath: cfg.chatPath,
    main: $('modelSelect').value || '',
    fast: $('fastModelSelect').value || '',
    desktop: desktop.length ? desktop : [$('modelSelect').value].filter(Boolean)
  };
  uiState.profiles.push(profile);
  window.openclaude.setState({ profiles: uiState.profiles });
  renderProfiles();
  showResult(true, `Saved profile "${name}". Apply it any time from here or the menu-bar icon.`);
}

// --- Proxy log ---------------------------------------------------------------

async function refreshLog() {
  const log = await window.openclaude.proxyLog();
  const body = $('proxyLogBody');
  if (!log.length) { body.textContent = 'No requests yet. The log fills up while Claude Desktop / Code use the local proxy.'; return; }
  body.innerHTML = log.slice(0, 60).map((e) => {
    const t = new Date(e.ts).toLocaleTimeString();
    const cls = e.status >= 400 ? 'err' : 'ok';
    const route = e.modelIn && e.modelIn !== e.modelOut ? `${e.modelIn} → ${e.modelOut}` : (e.modelOut || e.path);
    return `<div><span class="${cls}">${e.status}</span> ${t} · ${route} · ${e.ms}ms${e.stream ? ' · stream' : ''}</div>`;
  }).join('');
}

// --- Update check & auto-update ------------------------------------------------

async function checkUpdate() {
  const u = await window.openclaude.checkUpdate();
  if (u.ok && u.newer) {
    const b = $('updateBanner');
    b.className = 'result result-ok';
    b.innerHTML = `v${u.latest} available (you have v${u.current}). ` +
      `<a href="#" id="updateDownloadBtn" style="color:inherit;font-weight:bold">Download &amp; Install</a>`;
    $('updateDownloadBtn').addEventListener('click', (e) => {
      e.preventDefault();
      startAutoUpdate();
    });
  }
}

async function startAutoUpdate() {
  const b = $('updateBanner');
  b.className = 'result result-ok';
  b.textContent = 'Checking for update…';
  $('updateProgress').classList.remove('hidden');
  await window.openclaude.autoUpdate();
}

// Listen for auto-update status from main process
window.openclaude.onAutoUpdateStatus((status, data) => {
  const b = $('updateBanner');
  b.className = 'result result-ok';
  switch (status) {
    case 'checking': b.textContent = 'Checking for update…'; break;
    case 'available': b.textContent = `v${data} available — downloading…`; window.openclaude.autoDownload(); break;
    case 'not-available': b.textContent = 'You have the latest version.'; break;
    case 'downloaded': {
      b.textContent = `v${data} downloaded.`;
      $('updateProgress').classList.add('hidden');
      const btn = document.createElement('a');
      btn.href = '#';
      btn.textContent = ' Restart to install';
      btn.style.cssText = 'color:inherit;font-weight:bold;text-decoration:underline';
      btn.addEventListener('click', (e) => { e.preventDefault(); window.openclaude.autoInstall(); });
      b.appendChild(btn);
      break;
    }
    case 'error':
      b.className = 'result result-err';
      b.textContent = `Update failed: ${data}`;
      $('updateProgress').classList.add('hidden');
      break;
  }
});

window.openclaude.onAutoUpdateProgress((pct) => {
  $('updateBar').style.width = `${pct}%`;
  $('updatePct').textContent = `${Math.round(pct)}%`;
});

// --- Wire up -----------------------------------------------------------------

$('toggleKey').addEventListener('click', () => {
  const i = $('apiKey'); i.type = i.type === 'password' ? 'text' : 'password';
});
$('apiKey').addEventListener('input', persistKey);
$('modelSelect').addEventListener('change', persistModels);
$('fastModelSelect').addEventListener('change', persistModels);
$('loadModelsBtn').addEventListener('click', loadModels);
$('testBtn').addEventListener('click', testConnection);
$('applyBtn').addEventListener('click', applyConfig);
$('restoreBtn').addEventListener('click', restoreCode);
$('applyDesktopBtn').addEventListener('click', applyDesktop);
$('restoreDesktopBtn').addEventListener('click', restoreDesktop);
$('uninstallBtn').addEventListener('click', uninstallApp);
$('copilotLoginBtn').addEventListener('click', copilotLogin);
$('copilotLogoutBtn').addEventListener('click', copilotLogout);
$('loadModelsBtn2').addEventListener('click', copilotLoadModels);
$('providerSearch').addEventListener('input', (e) => { providerFilter = e.target.value; renderProviders(); });
$('saveCustomBtn').addEventListener('click', saveCustomPreset);
$('saveProfileBtn').addEventListener('click', saveProfile);
$('logRefreshBtn').addEventListener('click', refreshLog);

// Auto-launch toggle
(async () => { $('autoLaunchToggle').checked = await window.openclaude.getAutoLaunch(); })();
$('autoLaunchToggle').addEventListener('change', (e) => window.openclaude.setAutoLaunch(e.target.checked));

// Tray profile-switch tells the renderer to refresh
window.openclaude.onStateChanged(() => { refreshStatus(); });

// Persist desktop-model checkboxes whenever they change (event delegation)
$('desktopModels').addEventListener('change', persistModels);

detectInstall();

// Check Copilot auth status on startup
(async () => {
  const s = await window.openclaude.copilotAuthStatus();
  if (s.hasToken) {
    $('copilotStatus').textContent = 'Logged in to GitHub Copilot.';
    $('copilotLoginBtn').classList.add('hidden');
    $('copilotLogoutBtn').classList.remove('hidden');
  }
})();

loadPersistedState();
refreshStatus();
refreshLog();
checkUpdate();
setInterval(refreshLog, 5000);
