// Persisted UI state: selected provider, per-provider API keys (encrypted with
// the OS keychain via Electron safeStorage when available), model choices,
// custom provider presets, and named config profiles.
const fs = require('fs');
const path = require('path');

let electron = null;
try { electron = require('electron'); } catch {}

function statePath() {
  return path.join(electron.app.getPath('userData'), 'ui-state.json');
}

function canEncrypt() {
  try {
    return electron.safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function encryptKey(plain) {
  if (!plain) return null;
  if (canEncrypt()) {
    return { enc: 'safeStorage', value: electron.safeStorage.encryptString(plain).toString('base64') };
  }
  // Fallback: still better than nothing — keeps the key out of casual greps.
  return { enc: 'base64', value: Buffer.from(plain, 'utf8').toString('base64') };
}

function decryptKey(stored) {
  if (!stored || !stored.value) return '';
  try {
    if (stored.enc === 'safeStorage') {
      return electron.safeStorage.decryptString(Buffer.from(stored.value, 'base64'));
    }
    return Buffer.from(stored.value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

const DEFAULTS = {
  selectedProviderId: null,
  keys: {},            // providerId -> {enc, value}
  models: {},          // providerId -> { main, fast, desktop: [] }
  customProviders: [], // [{id, name, baseUrl, protocol}]
  profiles: [],        // [{name, providerId, baseUrl, protocol, chatPath, modelsPath, main, fast, desktop: []}]
  autoLaunch: false
};

function readState() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(statePath(), 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeState(state) {
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2) + '\n');
}

// Returns state with keys decrypted, for the renderer.
function getStateForRenderer() {
  const s = readState();
  const keys = {};
  for (const [pid, stored] of Object.entries(s.keys)) keys[pid] = decryptKey(stored);
  return { ...s, keys };
}

// Merges a renderer update; plaintext keys get encrypted on the way in.
function updateStateFromRenderer(patch) {
  const s = readState();
  if (patch.keys) {
    for (const [pid, plain] of Object.entries(patch.keys)) {
      if (plain) s.keys[pid] = encryptKey(plain);
      else delete s.keys[pid];
    }
    delete patch.keys;
  }
  Object.assign(s, patch);
  writeState(s);
  return true;
}

module.exports = { readState, writeState, getStateForRenderer, updateStateFromRenderer, encryptKey, decryptKey };
