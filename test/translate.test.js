const { test } = require('node:test');
const assert = require('node:assert');
const {
  displayRoute, parseRoute, resolveModel, sanitizeTools,
  anthropicToOpenAi, openAiToAnthropic, ZWSP
} = require('../src/translate');

test('displayRoute hides keywords from the claude-only validator', () => {
  const route = displayRoute('glm-5.1');
  // No visible keyword substring survives (zero-width spaces break "glm")
  assert.ok(!route.includes('glm'));
  // But it is still human-readable once the zero-width spaces are stripped
  assert.strictEqual(route.split(ZWSP).join('').replace(/ \(claude\)$/, ''), 'glm-5.1');
});

test('parseRoute is the inverse of displayRoute', () => {
  for (const m of ['glm-5.1', 'deepseek-v4-pro', 'kimi-k2.6', 'gpt-5.5']) {
    assert.strictEqual(parseRoute(displayRoute(m)), m);
  }
  assert.strictEqual(parseRoute('claude-sonnet-4-5'), null); // plain names aren't routes
});

test('resolveModel: display route wins', () => {
  const cfg = { mainModel: 'glm-5.1', fastModel: 'deepseek-v4-flash' };
  assert.strictEqual(resolveModel(displayRoute('kimi-k2.6'), cfg), 'kimi-k2.6');
});

test('resolveModel: claude aliases map to main/fast', () => {
  const cfg = { mainModel: 'glm-5.1', fastModel: 'deepseek-v4-flash' };
  assert.strictEqual(resolveModel('claude-sonnet-4-5', cfg), 'glm-5.1');
  assert.strictEqual(resolveModel('claude-haiku-4-5', cfg), 'deepseek-v4-flash');
});

test('resolveModel: modelMap and passthrough', () => {
  assert.strictEqual(resolveModel('claude-opus-4-8', { modelMap: { 'claude-opus-4-8': 'glm-5.1' } }), 'glm-5.1');
  assert.strictEqual(resolveModel('llama-3.3-70b', { mainModel: 'x' }), 'llama-3.3-70b');
});

test('sanitizeTools drops server-side tools, keeps custom ones', () => {
  const body = {
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      { name: 'get_time', description: 'time', input_schema: { type: 'object', properties: {} } }
    ],
    tool_choice: { type: 'auto' }
  };
  sanitizeTools(body);
  assert.strictEqual(body.tools.length, 1);
  assert.strictEqual(body.tools[0].name, 'get_time');
});

test('sanitizeTools removes empty tools entirely', () => {
  const body = { tools: [{ type: 'web_search_20250305', name: 'web_search' }], tool_choice: { type: 'any' } };
  sanitizeTools(body);
  assert.ok(!('tools' in body));
  assert.ok(!('tool_choice' in body));
});

test('anthropicToOpenAi: system + messages + tools', () => {
  const out = anthropicToOpenAi({
    model: 'x', max_tokens: 50, system: 'Be brief.',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    tools: [{ name: 'f', description: 'd', input_schema: { type: 'object' } }],
    tool_choice: { type: 'any' }
  });
  assert.strictEqual(out.messages[0].role, 'system');
  assert.strictEqual(out.messages[1].content, 'hi');
  assert.strictEqual(out.tools[0].function.name, 'f');
  assert.strictEqual(out.tool_choice, 'required');
});

test('anthropicToOpenAi: assistant tool_use -> tool_calls, tool_result -> tool role', () => {
  const out = anthropicToOpenAi({
    model: 'x', max_tokens: 10,
    messages: [
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'f', input: { a: 1 } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'done' }] }
    ]
  });
  assert.strictEqual(out.messages[0].tool_calls[0].function.name, 'f');
  assert.strictEqual(JSON.parse(out.messages[0].tool_calls[0].function.arguments).a, 1);
  assert.strictEqual(out.messages[1].role, 'tool');
  assert.strictEqual(out.messages[1].tool_call_id, 't1');
});

test('openAiToAnthropic: text response', () => {
  const out = openAiToAnthropic({
    id: 'c1', model: 'glm', choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 2 }
  }, 'claude-sonnet-4-5');
  assert.strictEqual(out.type, 'message');
  assert.strictEqual(out.content[0].text, 'hello');
  assert.strictEqual(out.stop_reason, 'end_turn');
  assert.strictEqual(out.usage.input_tokens, 5);
});

test('openAiToAnthropic: tool call -> tool_use + stop_reason', () => {
  const out = openAiToAnthropic({
    choices: [{ message: { tool_calls: [{ id: 'x', function: { name: 'f', arguments: '{"q":1}' } }] }, finish_reason: 'tool_calls' }]
  }, 'm');
  const block = out.content.find((b) => b.type === 'tool_use');
  assert.strictEqual(block.name, 'f');
  assert.deepStrictEqual(block.input, { q: 1 });
  assert.strictEqual(out.stop_reason, 'tool_use');
});

test('openAiToAnthropic: length finish -> max_tokens', () => {
  const out = openAiToAnthropic({ choices: [{ message: { content: 'x' }, finish_reason: 'length' }] }, 'm');
  assert.strictEqual(out.stop_reason, 'max_tokens');
});
