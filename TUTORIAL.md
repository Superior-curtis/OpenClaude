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

### OpenRouter
Create a key at [openrouter.ai/keys](https://openrouter.ai/keys). Many models are free. Model IDs include the provider prefix (e.g. `openai/gpt-5`, `anthropic/claude-sonnet-4-5`).

### Google Gemini
Use a free [AI Studio](https://aistudio.google.com) key (`AIza...`). The endpoint is rate-limited but free.

### NVIDIA NIM
Key from [build.nvidia.com](https://build.nvidia.com) (`nvapi-...`). Non-chat models (embeddings, rerankers, biology, speech, image generation) are automatically filtered out.

### Perplexity
No public models endpoint. A curated list is provided: Sonar Pro, Sonar, Sonar Reasoning, Sonar Deep Research.

### Custom provider
Enter any OpenAI or Anthropic-compatible base URL. Works with Ollama (`http://localhost:11434/v1`, protocol: OpenAI), vLLM, LiteLLM, and any self-hosted inference server.

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
