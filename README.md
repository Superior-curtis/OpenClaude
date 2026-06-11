# OpenClaude

Use **Claude Code** and **Claude Desktop** with any AI provider. Pick a provider, paste your key, click apply. No JSON editing, no config hunting, no terminal tricks.

Built by Curtis. MIT License.

[Download](#download) · [Tutorial](TUTORIAL.md) · [Supported Providers](#supported-providers) · [Development](#development)

---

## Download

**[Latest release →](https://github.com/Superior-curtis/OpenClaude/releases/latest)**

| Platform | Architectures | Package |
|----------|--------------|---------|
| macOS | Intel + Apple Silicon | `.dmg` / `.zip` |
| Windows | x64 + ARM64 | NSIS installer / portable `.exe` |
| Linux | x64 + ARM64 | `.AppImage` / `.deb` |

Cross-platform CI builds run via GitHub Actions. If your arch is missing, [trigger a workflow run](https://github.com/Superior-curtis/OpenClaude/actions/workflows/build.yml).

**macOS note:** the app is unsigned. Right-click → Open to launch, or run:
```bash
xattr -d com.apple.quarantine /Applications/OpenClaude.app
```

---

## What it does

OpenClaude configures two apps to talk to the AI provider of your choice instead of Anthropic's API:

### Claude Code (terminal)

Writes four environment variables into `~/.claude/settings.json`:

- `ANTHROPIC_BASE_URL` — your provider's API endpoint
- `ANTHROPIC_AUTH_TOKEN` — your API key
- `ANTHROPIC_MODEL` — main model
- `ANTHROPIC_SMALL_FAST_MODEL` — smaller/faster model for quick tasks

A timestamped backup (`settings.json.openclaude-backup-*`) is saved before every change. Your key never leaves your machine and is only sent to your chosen provider.

### Claude Desktop (chat app)

Writes into Claude Desktop's internal Gateway config system — the same format the official Settings UI uses. The config lives in a separate `Claude-3p` data directory alongside your regular Claude data.

Non-Claude models on Desktop route through OpenClaude's local proxy (port 41100), which handles Anthropic and OpenAI protocol translation in both directions. Keep OpenClaude running in the background (it minimizes to the system tray) while using Desktop with a third-party provider.

### Switching back

Click **Reset** next to either app. One click restores official Anthropic. Your backup files are untouched.

---

## Supported providers

16 providers with live model-list fetching and auto-filtering of unusable models.

### Aggregators

| Provider | Endpoint | Protocol | Notes |
|----------|----------|----------|-------|
| OpenCode Go | `opencode.ai/zen/go` | Anthropic | $10/mo subscription, same key as Zen |
| OpenCode Zen | `opencode.ai/zen` | Anthropic | Pay-per-use, free models end in `-free` |
| OpenRouter | `openrouter.ai/api` | OpenAI | 280+ models, many free, unified billing |

### Official APIs

| Provider | Endpoint | Protocol | Notes |
|----------|----------|----------|-------|
| Anthropic | `api.anthropic.com` | Anthropic | Official Claude API, direct billing |
| OpenAI | `api.openai.com` | OpenAI | GPT, o-series; via local proxy |
| Google Gemini | `generativelanguage.googleapis.com` | OpenAI | Free tier via AI Studio key |
| xAI Grok | `api.x.ai` | OpenAI | Grok 4 / 3; via local proxy |
| DeepSeek | `api.deepseek.com/anthropic` | Anthropic | V3 / R1, Anthropic-protocol endpoint |
| Mistral AI | `api.mistral.ai` | OpenAI | Mistral, Codestral, Mixtral; via local proxy |

### Fast inference

| Provider | Endpoint | Protocol | Notes |
|----------|----------|----------|-------|
| Groq | `api.groq.com/openai` | OpenAI | LPU inference, free tier |
| Together AI | `api.together.xyz` | OpenAI | 200+ open models, many free |
| Fireworks AI | `api.fireworks.ai/inference` | OpenAI | Serverless, fast cold starts |
| Cerebras | `api.cerebras.ai` | OpenAI | Llama 4, fastest throughput |

### Specialized

| Provider | Endpoint | Protocol | Notes |
|----------|----------|----------|-------|
| Perplexity | `api.perplexity.ai` | OpenAI | Search-grounded Sonar models |
| Z.AI | `api.z.ai/api/anthropic` | Anthropic | GLM models, Anthropic-protocol |
| NVIDIA NIM | `integrate.api.nvidia.com` | OpenAI | Llama Nemotron; non-chat models auto-filtered |

### Custom

Enter any OpenAI or Anthropic-compatible base URL. Works with Ollama (`localhost:11434/v1`), vLLM, LiteLLM, and any self-hosted inference server.

---

## How the proxy works

OpenClaude runs a local HTTP proxy on `127.0.0.1:41100`. When Claude Desktop sends an Anthropic-format request, the proxy:

1. Intercepts the request and identifies the protocol of your upstream provider
2. If the provider speaks Anthropic: forwards the request directly
3. If the provider speaks OpenAI: translates the request into `/v1/chat/completions` format, then translates the response back into Anthropic events
4. Handles streaming SSE normalization for providers that emit non-standard event formats

The proxy also filters server-side tools (web search, etc.) that provider gateways cannot translate, keeping only plain custom tools with a name and input schema. On a 400 error, it strips optional fields (extended thinking, tools) and retries once.

### Model name routing

Claude Desktop validates model names against a Claude/Anthropic allowlist and blocks known third-party model keywords (GLM, DeepSeek, Kimi, Qwen, etc.). OpenClaude works around this by inserting zero-width spaces between characters in display names and appending `(claude)`. The model picker shows the real model name while passing validation.

---

## Development

Requires Node.js 20 or later.

```bash
git clone https://github.com/Superior-curtis/OpenClaude.git
cd OpenClaude
npm install
npm start
```

### Build installers locally

```bash
npm run dist:mac      # .dmg + .zip
npm run dist:win      # NSIS + portable .exe
npm run dist:linux    # .AppImage + .deb
```

### Project structure

```
src/
  main.js       Electron main process, proxy server, IPC handlers
  preload.js    Context bridge exposing APIs to renderer
renderer/
  app.js        Provider registry, model loading, UI logic
  style.css     Styling
  index.html    Layout
build/
  icon.icns     macOS app icon
  icon.png      Windows/Linux app icon
```

---

## Security

- API keys are written only to local config files your machine already uses (nothing new gets installed, no telemetry)
- Keys are never sent anywhere except to the provider endpoint you select
- A timestamped backup of `settings.json` is created before every write
- The Reset function removes only the four environment variables OpenClaude manages; all other settings stay intact
- The proxy listens exclusively on `127.0.0.1` — not reachable from other machines on your network

---

## License

MIT
