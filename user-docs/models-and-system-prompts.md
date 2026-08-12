# Providers, Models, And System Prompts

## Select A Provider

Hearth supports five providers:

- `ollama` (default, `http://localhost:11434`)
- `lmstudio` (`http://localhost:1234`)
- `llamacpp` (`http://localhost:8080`)
- `openrouter` (`https://openrouter.ai`, API key required)
- `opencodezen` (`https://opencode.ai`, API key required)

### Choose At Startup

Pass `--provider` when starting Hearth. The choice is remembered for next time:

```sh
hearth --provider openrouter
hearth --provider lmstudio
```

If the server uses a non-default address, pass `--base-url <absolute-url>`:

```sh
hearth --provider openrouter --base-url http://localhost:4321
```

### Switch Inside The App

Run `/provider` with no name to open the arrow-key provider picker:

```text
/provider
```

Or switch directly by name (aliases like `zen`, `open router`, and `opencode-zen` also work):

```text
/provider openrouter
/provider opencodezen
```

Hearth checks the target server before changing the current conversation. A successful switch uses that provider’s remembered model when available, otherwise its first reported model. History remains intact and the conversation saves the new provider and model.

### API Keys For Remote Providers

OpenRouter and OpenCode Zen need an API key. Set it with `/key` before switching:

```text
/key openrouter sk-or-v1-...
/key opencodezen sk-zen-...
```

Check whether a key is configured, or remove one:

```text
/key openrouter
/key openrouter clear
```

Keys are stored in your operating system keychain, never in `preferences.json`. Switching to a remote provider without a key shows a hint explaining how to add one.

## Select A Model

Run `/models` to choose from the models exposed by the active server, or use `/model <name>`. `/new` uses the active provider’s remembered model, falling back to its first model.

Ollama models can be installed with `ollama pull`. LM Studio models are managed in LM Studio. A normal single-model `llama-server` exposes its loaded GGUF model; router mode may expose multiple models. OpenRouter and OpenCode Zen expose their hosted catalog via `/models`.

Note: OpenCode Zen's GPT, Claude, Gemini, Grok, and Qwen models use dedicated API protocols that Hearth does not implement yet. Choose a chat-completions model (DeepSeek, MiniMax, GLM, Kimi, or the free tier) instead.

Some servers may include embedding or otherwise non-chat-capable entries in their model list. Selecting one can produce a clear server error when chat begins.

## System Prompts

```text
/system You are a concise programming tutor.
/system clear
```

System prompts are stored with the conversation and sent as the first message to every supported provider.
