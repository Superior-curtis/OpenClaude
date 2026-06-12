const { test } = require('node:test');
const assert = require('node:assert');
const { isChatModel } = require('../src/model-filter');

test('keeps real chat models', () => {
  for (const m of [
    'meta/llama-3.3-70b-instruct', 'glm-5.1', 'deepseek-v4-pro', 'gpt-5.5',
    'gemini-3-pro', 'grok-4', 'qwen3.7-plus', 'kimi-k2.6', 'mistral-large-latest',
    'nvidia/llama-3.1-nemotron-70b-instruct'
  ]) {
    assert.strictEqual(isChatModel(m), true, `${m} should be a chat model`);
  }
});

test('drops non-chat models', () => {
  for (const m of [
    'nvidia/nv-embedqa-e5-v5', 'baai/bge-m3', 'nvidia/llama-3.2-nv-rerankqa-1b-v2',
    'nvidia/parakeet-ctc-1.1b-asr', 'black-forest-labs/flux.1-dev', 'stabilityai/sdxl',
    'nvidia/maxine-studio-voice', 'google/deplot', 'microsoft/table-structure',
    'meta/llama-guard-4-12b', 'nvidia/nemoretriever-parse', 'text-embedding-3-large',
    'whisper-large-v3', 'imagen-3.0', 'veo-2.0'
  ]) {
    assert.strictEqual(isChatModel(m), false, `${m} should be filtered out`);
  }
});
