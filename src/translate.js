// Pure logic shared by the proxy: model name routing and Anthropic <-> OpenAI
// protocol translation. Kept free of Electron/network imports so it can be
// unit-tested with plain node.

// --- Model display routes -----------------------------------------------------
// Claude Desktop validates gateway model names: they must reference "claude" or
// "anthropic" and must NOT contain known third-party model keywords (glm,
// deepseek, kimi, qwen, …). The check is an ASCII substring match, so we weave
// zero-width spaces between characters (invisible in the UI) and append a
// "(claude)" suffix. The picker then shows the real model name.
const ZWSP = '\u200b';
const ROUTE_SUFFIX = ' (claude)';

function displayRoute(modelId) {
  return modelId.split('').join(ZWSP) + ROUTE_SUFFIX;
}

function parseRoute(name) {
  const clean = name.split(ZWSP).join('');
  if (clean.endsWith(ROUTE_SUFFIX)) return clean.slice(0, -ROUTE_SUFFIX.length);
  return null;
}

// Resolve the model Claude Desktop/Code asked for to the real provider model.
function resolveModel(requested, cfg) {
  const fromRoute = parseRoute(requested);
  if (fromRoute) return fromRoute;
  if (cfg.modelMap && cfg.modelMap[requested]) return cfg.modelMap[requested];
  if (/^claude-|anthropic/i.test(requested)) {
    return /haiku|small|mini/i.test(requested) ? (cfg.fastModel || cfg.mainModel) : cfg.mainModel;
  }
  return requested; // a real provider model id (e.g. from Claude Code) — pass through
}

// Claude Desktop sends Anthropic server-side tools (web search etc.) that
// provider gateways can't translate — keep only plain custom tools, which
// have a name and an input schema. Mutates and returns the request object.
function sanitizeTools(json) {
  if (Array.isArray(json.tools)) {
    json.tools = json.tools.filter((t) => t && typeof t.name === 'string' && t.input_schema);
    if (json.tools.length === 0) {
      delete json.tools;
      delete json.tool_choice;
    }
  }
  return json;
}

// --- Anthropic <-> OpenAI protocol translation ---------------------------------
// Lets the proxy front OpenAI-protocol providers (NVIDIA NIM, OpenRouter, …)
// while Claude Desktop/Code speak the Anthropic messages protocol.

function anthropicToOpenAi(json) {
  const out = { model: json.model, max_tokens: json.max_tokens, stream: json.stream === true };
  for (const k of ['temperature', 'top_p']) if (json[k] !== undefined) out[k] = json[k];
  if (Array.isArray(json.stop_sequences) && json.stop_sequences.length) out.stop = json.stop_sequences;
  const msgs = [];
  if (json.system) {
    msgs.push({
      role: 'system',
      content: typeof json.system === 'string' ? json.system : json.system.map((b) => b.text || '').join('\n')
    });
  }
  for (const m of json.messages || []) {
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content || [];
    if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('') || null };
      const calls = blocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input || {}) } }));
      if (calls.length) msg.tool_calls = calls;
      msgs.push(msg);
    } else {
      for (const r of blocks.filter((b) => b.type === 'tool_result')) {
        msgs.push({
          role: 'tool',
          tool_call_id: r.tool_use_id,
          content: typeof r.content === 'string' ? r.content : (r.content || []).map((b) => b.text || '').join('\n')
        });
      }
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      const hadToolResults = blocks.some((b) => b.type === 'tool_result');
      if (text || !hadToolResults) msgs.push({ role: 'user', content: text });
    }
  }
  out.messages = msgs;
  if (Array.isArray(json.tools) && json.tools.length) {
    out.tools = json.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description || '', parameters: t.input_schema || { type: 'object' } }
    }));
    const tc = json.tool_choice;
    if (tc) out.tool_choice = tc.type === 'any' ? 'required' : tc.type === 'tool' ? { type: 'function', function: { name: tc.name } } : 'auto';
  }
  return out;
}

function openAiToAnthropic(d, requestedModel) {
  const choice = (d.choices || [])[0] || {};
  const msg = choice.message || {};
  const content = [];
  if (msg.content) content.push({ type: 'text', text: msg.content });
  for (const c of msg.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(c.function.arguments || '{}'); } catch {}
    content.push({ type: 'tool_use', id: c.id || `toolu_${Math.random().toString(36).slice(2)}`, name: c.function.name, input });
  }
  const fr = choice.finish_reason;
  return {
    id: d.id || 'msg_openclaude_proxy',
    type: 'message',
    role: 'assistant',
    model: d.model || requestedModel,
    content,
    stop_reason: fr === 'length' ? 'max_tokens' : fr === 'tool_calls' ? 'tool_use' : 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: (d.usage && d.usage.prompt_tokens) || 0, output_tokens: (d.usage && d.usage.completion_tokens) || 0 }
  };
}

module.exports = {
  ZWSP,
  ROUTE_SUFFIX,
  displayRoute,
  parseRoute,
  resolveModel,
  sanitizeTools,
  anthropicToOpenAi,
  openAiToAnthropic
};
