// Models that NVIDIA NIM (and some OpenAI-compatible hosts) list but that are
// NOT chat/completions models — embeddings, rerankers, speech, vision-OCR,
// image/video generation, biology, etc. Excluded from the picker.
const NON_CHAT = /embed|rerank|retriev|reranking|\bocr\b|paddleocr|parakeet|canary|riva|\basr\b|\btts\b|\bstt\b|speech|codec|fastpitch|audio2face|maxine|nvclip|\bclip\b|dragon|table-structure|surya|deplot|\bsam[- ]?2?\b|segment|depth|\besm\b|diffdock|molmim|genmol|proteinmpnn|rfdiffusion|boltz|evo2|\bvad\b|imagen|\bveo\b|image-generation|text-to-image|stable-diffusion|sdxl|flux|cosmos|nemoretriever|aqa|guard|safety|content-safety|topic-control|jailbreak|nvidia.neva|nvidia.nemotron.mini|nvidia.nemotron.nano/i;

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
  { id: 'perplexity', name: 'Perplexity', desc: 'Search-grounded', baseUrl: 'https://api.perplexity.ai', protocol: 'openai', modelsPath: null, chatPath: '/chat/completions',
    staticModels: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning', 'sonar-deep-research'],
    keyHint: 'Your Perplexity key (perplexity.ai/settings). Curated model list — no models endpoint.' },

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

function isCustom() { return selectedProvider.id === 'custom'; }
function currentBaseUrl() { return isCustom() ? $('customUrl').value.trim() : selectedProvider.baseUrl; }
function currentProtocol() { return isCustom() ? $('customProtocol').value : (selectedProvider.protocol || 'anthropic'); }
function currentChatPath() { return isCustom() ? '/v1/chat/completions' : (selectedProvider.chatPath || '/v1/chat/completions'); }
function currentModelsPath() { return isCustom() ? '/v1/models' : (selectedProvider.modelsPath || '/v1/models'); }

function providerCfg() {
  const cfg = {
    baseUrl: currentBaseUrl(),
    apiKey: $('apiKey').value.trim(),
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

function setBusy(busy) {
  for (const id of ['testBtn', 'applyBtn', 'restoreBtn', 'applyDesktopBtn', 'restoreDesktopBtn', 'loadModelsBtn']) $(id).disabled = busy;
}

function validate() {
  const cfg = providerCfg();
  if (!cfg.baseUrl) { showResult(false, 'Choose a provider or enter a base URL.'); return null; }
  if (!/^https?:\/\//.test(cfg.baseUrl)) { showResult(false, 'The base URL must start with https://'); return null; }
  if (!cfg.apiKey) { showResult(false, 'Enter your API key.'); return null; }
  return cfg;
}

// --- Provider tiles ----------------------------------------------------------

function renderProviders() {
  const grid = $('providerGrid');
  grid.innerHTML = '';
  for (const p of PROVIDERS) {
    const btn = document.createElement('button');
    btn.className = 'ptile' + (p.id === selectedProvider.id ? ' sel' : '');
    const proto = p.id === 'custom' ? '' : `<span class="proto">${p.protocol === 'openai' ? 'OpenAI' : 'Anthropic'}</span>`;
    btn.innerHTML = `${proto}<div class="pn">${p.name}</div><div class="pd">${p.desc}</div>`;
    btn.addEventListener('click', () => {
      selectedProvider = p;
      $('customRow').classList.toggle('hidden', p.id !== 'custom');
      renderProviders();
    });
    grid.appendChild(btn);
  }
  $('providerHint').textContent = selectedProvider.keyHint;
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
  showResult(true, `Loaded ${models.length} models.`);
}

// --- Status ------------------------------------------------------------------

function cleanRoute(m) { return m.split(ZWSP).join('').replace(/ \(claude\)$/, ''); }

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
  if (res.ok) { showResult(true, '✓ Claude Desktop reset to official Anthropic. Quit and reopen it.'); refreshStatus(); }
  else showResult(false, res.error);
}

// --- Wire up -----------------------------------------------------------------

$('toggleKey').addEventListener('click', () => {
  const i = $('apiKey'); i.type = i.type === 'password' ? 'text' : 'password';
});
$('loadModelsBtn').addEventListener('click', loadModels);
$('testBtn').addEventListener('click', testConnection);
$('applyBtn').addEventListener('click', applyConfig);
$('restoreBtn').addEventListener('click', restoreCode);
$('applyDesktopBtn').addEventListener('click', applyDesktop);
$('restoreDesktopBtn').addEventListener('click', restoreDesktop);

renderProviders();
refreshStatus();
