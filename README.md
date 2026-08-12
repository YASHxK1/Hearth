# Hearth Local Model Chat

Hearth is a persistent terminal chat interface for local models served by Ollama, LM Studio, or llama.cpp, plus the remote OpenRouter and OpenCode Zen APIs. It streams responses from the selected server or API, stores conversations as readable JSON, and presents chat in a bordered terminal UI.

## Requirements

- Node.js 20 or newer
- npm
- One supported model server or API with a chat model available:
  - Ollama
  - LM Studio
  - llama.cpp `llama-server`
  - OpenRouter
  - OpenCode Zen

## Install

```sh
npm install
npm run build
```

For local development, run `npm run dev`. To install globally from this checkout:

```sh
npm install -g .
hearth
```

## Choose A Provider

Hearth remembers the selected provider, its server URL, and its last-used model.

```sh
hearth --provider ollama
hearth --provider lmstudio
hearth --provider llamacpp
hearth --provider openrouter
hearth --provider opencodezen
```

Default server URLs are:

- Ollama: `http://localhost:11434`
- LM Studio: `http://localhost:1234`
- llama.cpp: `http://localhost:8080`
- OpenRouter: `https://openrouter.ai`
- OpenCode Zen: `https://opencode.ai`

To use another port or host, pass an absolute URL. It is remembered for that provider:

```sh
hearth --provider lmstudio --base-url http://localhost:4321
```

To configure every provider independently—useful when the servers are on different Tailscale machines—set all URLs in one command:

```sh
hearth \
  --ollama-base-url http://ollama-host.tailnet-name.ts.net:11434 \
  --lmstudio-base-url http://lmstudio-host.tailnet-name.ts.net:1234 \
  --llamacpp-base-url http://llamacpp-host.tailnet-name.ts.net:8080
```

These flags only save their provider's URL. Add `--provider lmstudio`, for example, to choose which provider starts active. `--base-url` remains a shorthand for overriding the selected provider.

Start the corresponding server before Hearth. The included `npm run ollama:start:unix` and `npm run ollama:start:windows` scripts only start Ollama. Start LM Studio from its Developer tab or with `lms server start`; start llama.cpp with, for example:

```sh
llama-server -m /path/to/model.gguf --port 8080
```

## API Keys

OpenRouter and OpenCode Zen require an API key. Keys are stored in your operating system keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux) and are never written to `preferences.json`.

```sh
hearth --openrouter-api-key sk-or-v1-...
hearth --opencodezen-api-key sk-zen-...
```

Inside the app, set or inspect a key with `/key`:

```text
/key openrouter
/key openrouter sk-or-v1-...
/key openrouter clear
```

If a key is missing, Hearth prints a hint pointing at `/key <provider> <key>`. Note that OpenCode Zen's GPT, Claude, Gemini, Grok, and Qwen models use dedicated API protocols and are not yet supported; the chat-completions models (DeepSeek, MiniMax, GLM, Kimi, and the free tier) work today.

## Usage

```sh
hearth
hearth --continue
hearth --resume <id-or-title>
hearth models --provider lmstudio
```

Inside the TUI:

- `/provider [name]`: Pick a provider or switch to `ollama`, `lmstudio`, `llamacpp`, `openrouter`, or `opencodezen`.
- `/models`: Pick a model exposed by the active provider.
- `/new [model]`: Start another conversation.
- `/list`: Pick a saved conversation.
- `/load <id-or-title>`: Load a saved conversation.
- `/model <name>`: Switch models on the active provider.
- `/system [prompt]`: Set or clear the system prompt.
- `/search <query>`: Search saved conversations.
- `/regen`: Regenerate the last assistant response.
- `/edit`: Edit and resubmit the last user message.
- `/save`, `/clear`, `/help`, `/exit`: Save, clear the view, show help, or leave.

Each conversation records its provider and model. Loading a saved conversation reconnects to that provider using the URL configured on the current machine. Conversations created before multi-provider support are treated as Ollama conversations.

## Storage

Conversation files and `preferences.json` remain in the backward-compatible data directory:

- Windows: `%USERPROFILE%\.ollama-cli-chat`
- macOS/Linux: `~/.ollama-cli-chat`

Set `OLLAMA_TERMINAL_CHAT_HOME` to use a different data directory. Despite its legacy name, it applies to every provider. API keys live in the system keychain, not in this directory.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

The automated suite mocks all server protocols and does not require Ollama, LM Studio, or llama.cpp to be installed. See [the user guide](./user-docs/README.md) for setup, usage, troubleshooting, and live QA instructions.
