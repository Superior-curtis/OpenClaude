# OpenClaude

A desktop app that lets you use **Claude Code** and **Claude Desktop** with any AI provider — no JSON editing required. Built by Curtis.

![platforms](https://img.shields.io/badge/platforms-macOS%20(Intel%20%26%20Apple%20Silicon)%20%7C%20Windows%20%7C%20Linux-blue)

## Download

**[⬇ Download the latest release](https://github.com/Superior-curtis/OpenClaude/releases/latest)** · **[📖 Tutorial](TUTORIAL.md)**

| Platform | Package |
|----------|---------|
| macOS (Intel + Apple Silicon) | `.dmg` or `.zip` |
| Windows (x64 + ARM64) | NSIS installer or portable `.exe` |
| Linux (x64 + ARM64) | `.AppImage` or `.deb` |

> Unsigned builds — macOS: right-click → Open to bypass Gatekeeper. Windows: SmartScreen may show a warning.

## Supported Providers (16)

**Aggregators:** OpenCode Go, OpenCode Zen, OpenRouter  
**Official APIs:** Anthropic, OpenAI, Google Gemini, xAI Grok, DeepSeek, Mistral AI  
**Fast Inference:** Groq, Together AI, Fireworks AI, Cerebras  
**Specialized:** Perplexity, Z.AI (GLM), NVIDIA NIM  
**Custom:** Any Anthropic or OpenAI-compatible endpoint

## What it does

1. **Pick a provider** — 16 presets or enter a custom URL
2. **Paste your API key** — load the provider's live model list
3. **Test the connection** — sends a real tiny message to verify
4. **Apply** — to Claude Code, Claude Desktop, or both
5. **Switch back** — one click restores official Anthropic

### How it works

- **Claude Code** reads custom providers from environment variables in `~/.claude/settings.json`. OpenClaude merges them in safely with automatic backup.
- **Claude Desktop** uses the built-in Gateway mode. OpenClaude writes the same config format the official UI does. After applying, quit and reopen Claude Desktop.
- **Non-Claude models** on Claude Desktop run through OpenClaude's background proxy with Anthropic ↔ OpenAI protocol translation. Real model names appear in Claude Desktop's own model picker.

## Development

Requires Node.js 20+.

```bash
npm install
npm start
```

## Building

```bash
npm run dist:mac     # .dmg + .zip
npm run dist:win     # NSIS installer + portable .exe
npm run dist:linux   # AppImage + .deb
```

Cross-platform CI builds run via GitHub Actions on tag push.

## Safety

- Your API key is written only to config files on your own machine — never sent anywhere except your chosen provider.
- A timestamped backup is created before every change.
- "Reset" removes only the keys OpenClaude manages; the rest of your settings are untouched.

## License

MIT
