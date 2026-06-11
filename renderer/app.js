// ── Non-chat model filter ──────────────────────────────────────────
// Models that are NOT chat/completions — embeddings, rerankers, speech,
// vision-only, image/video gen, biology, etc. Applied to all providers.
const NON_CHAT = /embed|rerank|retriev|reranking|\bocr\b|paddleocr|parakeet|canary|riva|\basr\b|\btts\b|\bstt\b|speech|codec|fastpitch|audio2face|maxine|nvclip|\bclip\b|dragon|table-structure|surya|deplot|\bsam[ -]?2?\b|segment|depth|\besm\b|diffdock|molmim|genmol|proteinmpnn|rfdiffusion|boltz|evo2|\bvad\b|imagen|\bveo\b|image-generation|text-to-image|stable-diffusion|sdxl|flux|cosmos|nemoretriever|aqa|guard|safety|content-safety|topic-control|jailbreak|nvidia/neva|nvidia/nemotron-mini|nvidia/nemotron-nano/i;

// ── Provider registry ─────────────────────────────────────────────
const PROVIDERS = [
  // --- Built-in aggregator services ---
  {
    id: 'go', name: 'OpenCode Go',
    desc: '$10/mo · GLM, Kimi, DeepSeek…',
    baseUrl: 'https://opencode.ai/zen/go', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Same key as OpenCode Zen — needs active OpenCode Go subscription.',
  },
  {
    id: 'zen', name: 'OpenCode Zen',
    desc: 'Pay-per-use · Claude, GPT, Gemini…',
    baseUrl: 'https://opencode.ai/zen', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Get your key at opencode.ai/zen. Paid models need balance; free models end in "-free".',
  },
  {
    id: 'openrouter', name: 'OpenRouter',
    desc: '280+ models · unified API',
    baseUrl: 'https://openrouter.ai/api', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Create a key at openrouter.ai/keys. Pay-per-token, many free models available.',
  },

  // --- Official first-party APIs ---
  {
    id: 'anthropic', name: 'Anthropic',
    desc: 'Official Claude API',
    baseUrl: 'https://api.anthropic.com', protocol: 'anthropic', modelsPath: '/v1/models',
    keyHint: 'Your own Anthropic key (console.anthropic.com). Billed by Anthropic.',
  },
  {
    id: 'openai', name: 'OpenAI',
    desc: 'GPT-5 · o-series · GPT-4o',
    baseUrl: 'https://api.openai.com', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Your OpenAI key (sk-…). Runs through local proxy for protocol translation.',
  },
  {
    id: 'gemini', name: 'Google Gemini',
    desc: 'Gemini 2.x · 3.x',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', protocol: 'openai', modelsPath: '/models', chatPath: '/chat/completions',
    exclude: /embedding|aqa|imagen|veo|\btts\b|image-generation/i,
    keyHint: 'Free tier: Google AI Studio key (aistudio.google.com). Runs through local proxy.',
  },
  {
    id: 'grok', name: 'xAI Grok',
    desc: 'Grok 4 · Grok 3',
    baseUrl: 'https://api.x.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: /image|vision-only/i,
    keyHint: 'Your xAI key (xai-…). console.x.ai. Runs through local proxy.',
  },
  {
    id: 'deepseek', name: 'DeepSeek',
    desc: 'V3 / R1 · cheap tokens',
    baseUrl: 'https://api.deepseek.com/anthropic', protocol: 'anthropic', modelsPath: '/v1/models',
    staticModels: ['deepseek-chat', 'deepseek-reasoner'],
    exclude: /embed/i,
    keyHint: 'Top up at platform.deepseek.com. Uses DeepSeek beta Anthropic-protocol endpoint.',
  },
  {
    id: 'mistral', name: 'Mistral AI',
    desc: 'Mistral · Codestral · Mixtral',
    baseUrl: 'https://api.mistral.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: /embed|ocr|moderation/i,
    keyHint: 'La Plateforme key (console.mistral.ai). Runs through local proxy.',
  },

  // --- Fast inference ---
  {
    id: 'groq', name: 'Groq',
    desc: 'Ultra-fast · LPU inference',
    baseUrl: 'https://api.groq.com/openai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: /whisper|audio|guard/i,
    keyHint: 'Free tier available. Create key at console.groq.com. Runs through local proxy.',
  },
  {
    id: 'together', name: 'Together AI',
    desc: '200+ open models · fast GPU',
    baseUrl: 'https://api.together.xyz', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: NON_CHAT,
    keyHint: 'Key at api.together.ai. Many free models. Runs through local proxy.',
  },
  {
    id: 'fireworks', name: 'Fireworks AI',
    desc: 'Fast serverless inference',
    baseUrl: 'https://api.fireworks.ai/inference', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: /embed|image|stabilityai|playground|fuyu|vision/i,
    keyHint: 'Key at fireworks.ai. Runs through local proxy.',
  },
  {
    id: 'cerebras', name: 'Cerebras',
    desc: 'Llama 4 · fastest tokens',
    baseUrl: 'https://api.cerebras.ai', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    keyHint: 'Key at cloud.cerebras.ai. Llama 4 Maverick/Scout. Runs through local proxy.',
  },

  // --- Specialized ---
  {
    id: 'perplexity', name: 'Perplexity',
    desc: 'Search-grounded · Sonar',
    baseUrl: 'https://api.perplexity.ai', protocol: 'openai', modelsPath: null, chatPath: '/chat/completions',
    staticModels: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning', 'sonar-deep-research'],
    keyHint: 'Key at perplexity.ai/settings. No models endpoint — a curated list is provided.',
  },

  // --- Regional / specialized ---
  {
    id: 'zai', name: 'Z.AI',
    desc: 'GLM models · China',
    baseUrl: 'https://api.z.ai/api/anthropic', protocol: 'anthropic', modelsPath: '/v1/models',
    staticModels: ['glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-flash'],
    keyHint: 'Key from z.ai developer console. Anthropic-protocol endpoint.',
  },
  {
    id: 'nim', name: 'NVIDIA NIM',
    desc: 'Llama Nemotron · NVIDIA GPU',
    baseUrl: 'https://integrate.api.nvidia.com', protocol: 'openai', modelsPath: '/v1/models', chatPath: '/v1/chat/completions',
    exclude: NON_CHAT,
    keyHint: 'Key at build.nvidia.com (nvapi-…). Non-chat models are auto-filtered. Runs through local proxy.',
  },

  // --- Custom ---
  {
    id: 'custom', name: 'Custom…',
    desc: 'Any OpenAI / Anthropic API',
    baseUrl: null,
    keyHint: 'Enter base URL, pick the protocol, and optionally override chat/models paths.',
  },
];

const ZWSP = '\u200b';
const $ = (id) => document.getElementById(id);

let selectedProvider = PROVIDERS[0];
let loadedModels = [];

// ── Provider helpers ──────────────────────────────────────────────
function isCustom() { return selectedProvider.id === 'custom'; }
function currentBaseUrl() { return isCustom() ? $('customUrl').value.trim() : selectedProvider.baseUrl; }
function currentProtocol() { return isCustom() ? $('customProtocol').value : (selectedProvider.protocol || 'anthropic'); }
function currentChatPath() {
  if (isCustom()) return $('customChatPath').value.trim() || '/v1/chat/completions';
  return selectedProvider.chatPath || '/v1/chat/completions';
}
function currentModelsPath() {
  if (isCustom()) return $('customModelsPath').value.trim() || '/v1/models';
  if (selectedProvider.modelsPath === null) return null;
  return selectedProvider.modelsPath || '/v1/models';
}

function providerCfg() {
  const cfg = {
    baseUrl: currentBaseUrl(),
    apiKey: $('apiKey').value.trim(),
    protocol: currentProtocol(),
    chatPath: currentChatPath(),
  };
  const mp = currentModelsPath();
  if (mp) cfg.modelsPath = mp;
  return cfg;
}

// ── Result banner ─────────────────────────────────────────────────
function showResult(ok, message, loading) {
  const el = $('result');
  el.classList.remove('hidden', 'ok', 'err', 'loading');
  if (loading) el.classList.add('loading');
  else if (ok) el.classList.add('ok');
  else el.classList.add('err');
  el.textContent = message;
}

function hideResult() { $('result').classList.add('hidden'); }

function setBusy(busy) {
  for (const id of ['testBtn', 'applyBtn', 'restoreBtn', 'applyDesktopBtn', 'restoreDesktopBtn', 'loadModelsBtn'])
    $(id).disabled = busy;
}

function validate() {
  const cfg = providerCfg();
  if (!cfg.baseUrl) { showResult(false, 'Choose a provider or enter a base URL.'); return null; }
  if (!/^https?:\/\//.test(cfg.baseUrl)) { showResult(false, 'The base URL must start with https://'); return null; }
  if (!cfg.apiKey) { showResult(false, 'Enter your API key.'); return null; }
  return cfg;
}

// ── Provider tile rendering ───────────────────────────────────────
function renderProviders() {
  const grid = $('providerGrid');
  grid.innerHTML = '';
  for (const p of PROVIDERS) {
    const btn = document.createElement('button');
    btn.className = 'ptile' + (p.id === selectedProvider.id ? ' selected' : '');
    btn.setAttribute('tabindex', '0');

    const protoLabel = p.id === 'custom' ? '' : (p.protocol === 'openai' ? 'OpenAI' : 'Anthropic');
    const protoBadge = protoLabel ? `<span class="proto-badge">${protoLabel}</span>` : '';

    btn.innerHTML = `${protoBadge}<span class="check-mark">\u2713</span><div class="pn">${p.name}</div><div class="pd">${p.desc}</div>`;

    btn.addEventListener('click', () => {
      selectedProvider = p;
      loadedModels = [];
      $('customRow').classList.toggle('hidden', p.id !== 'custom');
      $('desktopModelsWrap').classList.add('hidden');
      $('modelSelect').innerHTML = '<option value="">Provider default</option>';
      $('fastModelSelect').innerHTML = '<option value="">Provider default</option>';
      renderProviders();
      hideResult();
    });
    grid.appendChild(btn);
  }
  $('providerHint').textContent = selectedProvider.keyHint;
}

// ── Model selectors ───────────────────────────────────────────────
function fillSelect(select, models, preferred) {
  const prev = select.value;
  select.innerHTML = '<option value="">Provider default</option>';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
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
        showResult(false, "Claude Desktop's model menu holds up to 4 models.");
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

// ── Load models ───────────────────────────────────────────────────
async function loadModels() {
  const cfg = validate();
  if (!cfg) return;
  if (currentModelsPath() === null && selectedProvider.staticModels) {
    // Provider has no models endpoint — use static list
    let models = selectedProvider.staticModels.slice();
    if (selectedProvider.exclude) models = models.filter((m) => !selectedProvider.exclude.test(m));
    if (NON_CHAT) models = models.filter((m) => !NON_CHAT.test(m));
    models.sort();
    loadedModels = models;
    fillSelect($('modelSelect'), models, ['claude-sonnet-4-5', 'gpt-5.5', 'gemini-3-pro', 'grok-4', 'sonar-pro', 'deepseek-chat']);
    fillSelect($('fastModelSelect'), models, ['claude-haiku-4-5', 'gpt-5-nano', 'gemini-3-flash', 'sonar', 'deepseek-chat']);
    renderDesktopChecks(models);
    showResult(true, `Loaded ${models.length} models (curated list).`);
    return;
  }

  setBusy(true);
  showResult(true, 'Fetching model list…', true);
  const cfgWithModelsPath = { ...cfg, modelsPath: currentModelsPath() };
  const res = await window.openclaude.fetchModels(cfgWithModelsPath);
  setBusy(false);

  let models = res.ok ? res.models : [];
  if (selectedProvider.exclude) models = models.filter((m) => !selectedProvider.exclude.test(m));
  if (NON_CHAT) models = models.filter((m) => !NON_CHAT.test(m));
  if (models.length === 0 && selectedProvider.staticModels) models = selectedProvider.staticModels.slice();
  models.sort();

  if (models.length === 0) {
    showResult(false, res.ok
      ? 'No usable chat models returned. You can still apply with the provider default.'
      : `Could not load models: ${res.error}. You can still apply with the provider default.`);
    return;
  }
  loadedModels = models;
  fillSelect($('modelSelect'), models, ['claude-sonnet-4-5', 'gpt-5.5', 'gemini-3-pro', 'grok-4', 'sonar-pro', 'deepseek-chat']);
  fillSelect($('fastModelSelect'), models, ['claude-haiku-4-5', 'gpt-5-nano', 'gemini-3-flash', 'sonar', 'deepseek-chat']);
  renderDesktopChecks(models);
  showResult(true, `Loaded ${models.length} models.`);
}

// ── Status panel ──────────────────────────────────────────────────
function cleanRoute(m) { return m.split(ZWSP).join('').replace(/ \(claude\)$/, ''); }

async function refreshStatus() {
  const cfg = await window.openclaude.getConfig();
  const desktop = await window.openclaude.getDesktopConfig();
  const proxy = await window.openclaude.proxyStatus();
  $('settingsPath').textContent = cfg.settingsPath;

  // Top badge
  const badge = $('statusBadge');
  if (cfg.baseUrl || desktop.active) {
    badge.className = 'status-pill active';
    badge.textContent = 'Third-party active';
  } else {
    badge.className = 'status-pill inactive';
    badge.textContent = 'Official Anthropic';
  }

  // Claude Code status
  const rows = [];
  const ccEndpoint = cfg.baseUrl && cfg.baseUrl.includes('127.0.0.1')
    ? `${proxy.upstreamBase || '(unknown)'}<br><span class="k">via</span> local proxy`
    : (cfg.baseUrl || 'Official Anthropic');
  rows.push(`<div><span class="k">Endpoint</span><span class="v">${ccEndpoint}</span></div>`);
  rows.push(`<div><span class="k">API key</span><span class="v">${cfg.hasToken ? 'set' : 'not set'}</span></div>`);
  rows.push(`<div><span class="k">Main</span><span class="v">${cfg.model || 'default'}</span></div>`);
  rows.push(`<div><span class="k">Fast</span><span class="v">${cfg.smallFastModel || 'default'}</span></div>`);
  $('currentConfig').innerHTML = rows.join('');

  // Claude Desktop status
  const d = [];
  if (!desktop.installed) {
    d.push('<div class="v">Not installed</div>');
    $('applyDesktopBtn').disabled = true;
    $('restoreDesktopBtn').disabled = true;
  } else {
    $('applyDesktopBtn').disabled = false;
    $('restoreDesktopBtn').disabled = false;
    if (desktop.active) {
      const viaProxy = desktop.baseUrl && desktop.baseUrl.includes(`127.0.0.1:${proxy.port}`);
      if (viaProxy) {
        d.push(`<div><span class="k">Endpoint</span><span class="v">${proxy.upstreamBase || '?'}<br><span class="k">via</span> local proxy</span></div>`);
        const names = (desktop.models || []).map(cleanRoute);
        if (names.length) d.push(`<div><span class="k">Models</span><span class="v">${names.join(', ')}</span></div>`);
      } else {
        d.push(`<div><span class="k">Endpoint</span><span class="v">${desktop.baseUrl || '?'}</span></div>`);
        d.push(`<div><span class="k">Models</span><span class="v">${(desktop.models || []).join(', ') || 'default'}</span></div>`);
      }
    } else {
      d.push('<div class="v">Official Anthropic (Claude account)</div>');
    }
  }
  $('currentDesktopConfig').innerHTML = d.join('');

  // Proxy status block
  $('proxyBlock').classList.toggle('hidden', !proxy.enabled);
  if (proxy.enabled) {
    const ps = $('proxyStatus');
    ps.textContent = proxy.running ? '\u{1F7E2} Proxy running on port ' + proxy.port : '\u{1F534} Proxy stopped';
    ps.className = 'proxy-status ' + (proxy.running ? 'running' : 'stopped');
  }
}

// ── Actions ───────────────────────────────────────────────────────
async function testConnection() {
  const cfg = validate();
  if (!cfg) return;
  if (cfg.protocol === 'openai' && !$('modelSelect').value) {
    showResult(false, 'OpenAI-protocol providers need a model to test — load models and pick a main model first.');
    return;
  }
  setBusy(true);
  showResult(true, 'Testing… (sending a tiny message)', true);
  const res = await window.openclaude.testConnection({ ...cfg, model: $('modelSelect').value || undefined });
  setBusy(false);
  if (res.ok) showResult(true, `Works! Reply: "${res.reply.trim()}"`);
  else showResult(false, `Failed: ${res.error}`);
}

async function applyConfig() {
  const cfg = validate();
  if (!cfg) return;
  if (cfg.protocol === 'openai' && !$('modelSelect').value) {
    showResult(false, 'OpenAI-protocol providers need a main model — load models and pick one.');
    return;
  }
  setBusy(true);
  const res = await window.openclaude.applyConfig({
    ...cfg,
    model: $('modelSelect').value || null,
    smallFastModel: $('fastModelSelect').value || null,
  });
  setBusy(false);
  if (res.ok) {
    showResult(true, 'Applied to Claude Code. Open a new terminal (or restart your session).');
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
      ? `Applied via background proxy. Models: ${models.join(', ')}. Keep OpenClaude running (tray icon), then quit and reopen Claude Desktop.`
      : 'Applied to Claude Desktop. Quit and reopen it. Choose "Continue with Gateway" if prompted.');
    refreshStatus();
  } else {
    showResult(false, `Failed: ${res.error}`);
  }
}

async function restoreCode() {
  setBusy(true);
  const res = await window.openclaude.restoreOfficial();
  setBusy(false);
  if (res.ok) { showResult(true, 'Claude Code reset to official Anthropic. Restart your session.'); refreshStatus(); }
}

async function restoreDesktop() {
  setBusy(true);
  const res = await window.openclaude.restoreDesktopConfig();
  setBusy(false);
  if (res.ok) { showResult(true, 'Claude Desktop reset to official Anthropic. Quit and reopen it.'); refreshStatus(); }
  else showResult(false, res.error);
}

// ── Wire up ───────────────────────────────────────────────────────
$('toggleKey').addEventListener('click', () => {
  const i = $('apiKey');
  i.type = i.type === 'password' ? 'text' : 'password';
  $('toggleKey').textContent = i.type === 'password' ? '\u{1F441}' : '\u{1F576}';
});
$('loadModelsBtn').addEventListener('click', loadModels);
$('testBtn').addEventListener('click', testConnection);
$('applyBtn').addEventListener('click', applyConfig);
$('restoreBtn').addEventListener('click', restoreCode);
$('applyDesktopBtn').addEventListener('click', applyDesktop);
$('restoreDesktopBtn').addEventListener('click', restoreDesktop);

// Enter key in password field triggers load models
$('apiKey').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadModels();
});

renderProviders();
refreshStatus();
