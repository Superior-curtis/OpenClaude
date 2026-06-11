# OpenClaude

A friendly desktop app that lets anyone use **Claude Code** and **Claude Desktop** with third-party AI providers (OpenCode Zen, Z.AI, DeepSeek, or any Anthropic-compatible API) — no JSON editing required.

![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-blue)

## What it does

1. **Pick a provider** — OpenCode Zen, Z.AI, DeepSeek, or a custom URL
2. **Paste your API key** — and load the provider's live model list
3. **Test the connection** — sends a real tiny message to verify everything works
4. **Apply** — to Claude Code, Claude Desktop, or both
5. **Switch back** — one click restores official Anthropic for either app

### How it works

- **Claude Code** reads custom providers from environment variables in `~/.claude/settings.json` (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`). OpenClaude merges them in safely with an automatic backup before every change.
- **Claude Desktop** has a built-in Gateway mode (Developer → Configure Third-Party Inference). All of its third-party state lives in a separate data dir with a `-3p` suffix (`~/Library/Application Support/Claude-3p` on macOS, `%LOCALAPPDATA%\Claude-3p` on Windows):
  - `configLibrary/<uuid>.json` + `_meta.json` (`appliedId` selects the active config) with keys `inferenceProvider: "gateway"`, `inferenceGatewayBaseUrl`, `inferenceGatewayApiKey`, `inferenceGatewayAuthScheme`, `inferenceModels`
  - `claude_desktop_config.json` → `"deploymentMode": "3p"` — without this flag the app stays in Claude-account mode and silently ignores the gateway config

  OpenClaude writes the same format the official UI does — no admin rights needed. After applying, fully quit and reopen Claude Desktop.

> ⚠️ **Claude Desktop limitations**: gateway mode validates model IDs against the Anthropic catalog — only `claude-*` models are accepted (DeepSeek/GPT/Gemini models work with Claude Code only). The `configLibrary` format is an internal mechanism (verified against Claude Desktop 1.11847.5); an app update could change it, and an MDM-managed enterprise config always takes precedence.

## Development

Requires Node.js 20+.

```bash
npm install
npm start
```

## Building installers

```bash
npm run dist:mac     # .dmg + .zip          (build on macOS)
npm run dist:win     # NSIS installer + portable .exe   (build on Windows or via CI)
npm run dist:linux   # AppImage + .deb      (build on Linux or via CI)
```

Cross-platform note: electron-builder builds best on the target OS. The easiest way to ship all three is GitHub Actions with a matrix of `macos-latest`, `windows-latest`, `ubuntu-latest`.

## Safety

- Your API key is written only to `~/.claude/settings.json` on your own machine — never sent anywhere except your chosen provider.
- A timestamped backup (`settings.json.openclaude-backup-…`) is created before every change.
- "Switch back to official Anthropic" removes only the four keys OpenClaude manages; the rest of your settings are untouched.
