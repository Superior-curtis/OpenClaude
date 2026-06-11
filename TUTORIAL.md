# OpenClaude Tutorial

Quick-start guide for using Claude Code & Claude Desktop with any AI provider.

---

## Step 1 — Pick a provider

Launch OpenClaude. Click a provider tile:

- **OpenCode Go** ($10/mo subscription)
- **OpenCode Zen** (pay-per-use)
- **OpenRouter** (280+ models, many free)
- **Anthropic** (official Claude API)
- **OpenAI** (GPT, o-series)
- **Google Gemini** (free tier available)
- **xAI Grok**, **DeepSeek**, **Mistral**, **Groq**, **Together**, **Fireworks**, **Cerebras**, **Perplexity**, **Z.AI**, **NVIDIA NIM**

Or choose **Custom** and enter any OpenAI/Anthropic-compatible endpoint.

## Step 2 — Enter your API key

Paste your key and click **Load models**. OpenClaude fetches the live model list from your provider and filters out non-chat models (embeddings, vision-only, speech, etc.).

## Step 3 — Pick models

- **Main model** — used for normal tasks
- **Fast model** — used for small/quick tasks (optional)

For Claude Desktop, you can check up to 4 models — they'll appear in the app's own model picker.

## Step 4 — Test and Apply

Click **Test connection** to verify your key and endpoint work with a real request.

Then apply:

| Button | What it does |
|--------|-------------|
| **Apply to Code** | Writes provider config to `~/.claude/settings.json` |
| **Apply to Desktop** | Configures Claude Desktop's gateway mode via configLibrary |

After applying, restart Claude Code (new terminal session) or Claude Desktop (fully quit + reopen).

> Tip: non-Claude models on Desktop run through OpenClaude's background proxy. Keep OpenClaude open (it minimizes to tray).

## Switching back to official Anthropic

Click **Reset** next to either Claude Code or Claude Desktop. One click. Your backup files are not touched.

---

## Provider-specific notes

### OpenCode Go
**How to get a key:** Get your key at [opencode.ai/zen](https://opencode.ai/zen). Same key as OpenCode Zen — needs an active OpenCode Go subscription ($10/mo).  
**Endpoint:** `https://opencode.ai/zen/go` (Anthropic protocol).  
**Models:** GLM, Kimi, DeepSeek, and more — loaded automatically.  
**Proxy:** No — native Anthropic protocol.

### OpenCode Zen
**How to get a key:** Register at [opencode.ai/zen](https://opencode.ai/zen), top up balance. Free models end in `-free`.  
**Endpoint:** `https://opencode.ai/zen` (Anthropic protocol).  
**Models:** Claude, GPT, Gemini, and more — loaded automatically.  
**Proxy:** No — native Anthropic protocol.

### OpenRouter
**How to get a key:** Create a key at [openrouter.ai/keys](https://openrouter.ai/keys). Pay-per-token, many free models available.  
**Endpoint:** `https://openrouter.ai/api/v1` (OpenAI protocol).  
**Models:** 280+ — loaded automatically. Model IDs include the provider prefix (e.g. `openai/gpt-5`, `anthropic/claude-sonnet-4-5`).  
**Proxy:** Yes — runs through local proxy.

### Anthropic
**How to get a key:** Get an API key at [console.anthropic.com](https://console.anthropic.com).  
**Endpoint:** `https://api.anthropic.com` (Anthropic protocol).  
**Models:** Claude models — loaded automatically.  
**Proxy:** No — native Anthropic protocol.

### OpenAI
**How to get a key:** Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (`sk-...`).  
**Endpoint:** `https://api.openai.com/v1` (OpenAI protocol).  
**Models:** GPT-5, o-series, GPT-4o — loaded automatically.  
**Proxy:** Yes — runs through local proxy.

### Google Gemini
**How to get a key:** Get a free API key at [aistudio.google.com](https://aistudio.google.com) (`AIza...`).  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/openai` (OpenAI protocol).  
**Models:** Gemini 2.x / 3.x — loaded automatically.  
**Proxy:** Yes — runs through local proxy.  
**Note:** Rate-limited but free.

### GitHub Copilot
**How to get a key:** No API key needed — uses GitHub device auth. Click **Login with GitHub** in OpenClaude.  
**Endpoint:** `https://api.github.com/copilot` (OpenAI protocol).  
**Models:** GPT-5, Claude, and more — loaded automatically.  
**Proxy:** Yes — runs through local proxy.

### xAI Grok
**How to get a key:** Get a key at [console.x.ai](https://console.x.ai) (`xai-...`).  
**Endpoint:** `https://api.x.ai` (OpenAI protocol).  
**Models:** Grok 4, Grok 3, Grok 2 — loaded automatically. Vision models filtered.  
**Proxy:** Yes — runs through local proxy.

### DeepSeek
**How to get a key:** Get a key at [platform.deepseek.com](https://platform.deepseek.com).  
**Endpoint:** `https://api.deepseek.com/anthropic` (Anthropic protocol).  
**Models:** DeepSeek-V3, DeepSeek-R1 — loaded automatically.  
**Proxy:** No — native Anthropic protocol.

### Mistral AI
**How to get a key:** Get a key at [console.mistral.ai](https://console.mistral.ai).  
**Endpoint:** `https://api.mistral.ai` (OpenAI protocol).  
**Models:** Mistral Large, Codestral, Ministral — loaded automatically. Embedding/OCR models filtered.  
**Proxy:** Yes — runs through local proxy.

### Groq
**How to get a key:** Get a key at [console.groq.com](https://console.groq.com). Free tier available.  
**Endpoint:** `https://api.groq.com/openai` (OpenAI protocol).  
**Models:** Ultra-fast LPU inference — loaded automatically. Audio models filtered.  
**Proxy:** Yes — runs through local proxy.

### Together AI
**How to get a key:** Get a key at [api.together.ai](https://api.together.ai).  
**Endpoint:** `https://api.together.xyz` (OpenAI protocol).  
**Models:** 200+ open models — loaded automatically. Non-chat models filtered.  
**Proxy:** Yes — runs through local proxy.

### Fireworks AI
**How to get a key:** Get a key at [fireworks.ai](https://fireworks.ai).  
**Endpoint:** `https://api.fireworks.ai/inference` (OpenAI protocol).  
**Models:** Fast serverless inference — loaded automatically. Vision/image models filtered.  
**Proxy:** Yes — runs through local proxy.

### Cerebras
**How to get a key:** Get a key at [cloud.cerebras.ai](https://cloud.cerebras.ai).  
**Endpoint:** `https://api.cerebras.ai` (OpenAI protocol).  
**Models:** Llama 4 and more — loaded automatically.  
**Proxy:** Yes — runs through local proxy.

### Perplexity
**How to get a key:** Get a key at [perplexity.ai/settings](https://perplexity.ai/settings).  
**Endpoint:** `https://api.perplexity.ai` (OpenAI protocol).  
**Models:** No public models endpoint. Curated list provided: Sonar Pro, Sonar, Sonar Reasoning, Sonar Deep Research. Pick from the dropdown.  
**Proxy:** Yes — runs through local proxy.

### Z.AI (智谱)
**How to get a key:** Get a key at [open.bigmodel.cn](https://open.bigmodel.cn).  
**Endpoint:** `https://api.z.ai/api/anthropic` (Anthropic protocol).  
**Models:** GLM-4.6, GLM-4.5, GLM-4.5-Air, GLM-4.5-Flash — loaded automatically.  
**Proxy:** No — native Anthropic protocol.

### NVIDIA NIM
**How to get a key:** Get a key at [build.nvidia.com](https://build.nvidia.com) (`nvapi-...`).  
**Endpoint:** `https://integrate.api.nvidia.com` (OpenAI protocol).  
**Models:** Llama, Nemotron — loaded automatically. Non-chat models (embeddings, rerankers, biology, speech, image generation) are automatically filtered.  
**Proxy:** Yes — runs through local proxy.

### Custom provider
**How to get a key:** Varies by provider.  
**Endpoint:** Enter any OpenAI or Anthropic-compatible base URL.  
**Protocol:** Pick OpenAI or Anthropic.  
**Examples:** Works with Ollama (`http://localhost:11434/v1`, protocol: OpenAI), vLLM, LiteLLM, and any self-hosted inference server.  
**Proxy:** Yes (OpenAI protocol) / No (Anthropic protocol) — detected automatically.

---

## Troubleshooting

**"Provider default" instead of my model?**  
Load models first (Step 2). If the models endpoint returns nothing, pick a model from the dropdown manually.

**Claude Desktop shows a blank model picker?**  
Keep OpenClaude running in the background (tray icon). The proxy handles protocol translation for non-Claude models.

**macOS says "unidentified developer"?**  
Right-click the app → Open. Or run:  
```bash
xattr -d com.apple.quarantine /Applications/OpenClaude.app
```

**Windows SmartScreen warning?**  
Click "More info" → "Run anyway". The builds are unsigned.

**Where are my API keys stored?**  
Only in `~/.claude/settings.json` on your machine. Never sent anywhere except your chosen provider.

**I need to restore Claude Code's settings?**  
A timestamped backup is created before every change. Look in `~/.claude/settings.json.openclaude-backup-*`.

---

## Building from source

```bash
git clone https://github.com/Superior-curtis/OpenClaude.git
cd OpenClaude
npm install
npm start
```

Cross-platform CI builds ship for macOS (Intel + Apple Silicon), Windows (x64 + ARM64), and Linux (x64 + ARM64) via GitHub Actions.
