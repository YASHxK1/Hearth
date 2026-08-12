# Hearth Local Model Chat User Guide

Hearth provides persistent terminal chat for models served locally by Ollama, LM Studio, or llama.cpp, plus the remote OpenRouter and OpenCode Zen APIs.

It includes a bordered streaming chat UI, automatic local conversation saving, provider and model selection, remembered server settings, conversation search/loading, system prompts, regeneration, and edit-last-message support.

## Documentation Map

1. [Install And Run](./install-and-run.md)
2. [First Chat](./first-chat.md)
3. [Using The TUI](./using-the-tui.md)
4. [Conversations](./conversations.md)
5. [Commands](./commands.md)

Reference pages:

- [Models And System Prompts](./models-and-system-prompts.md)
- [Search Edit And Regenerate](./search-edit-and-regenerate.md)
- [Storage And Privacy](./storage-and-privacy.md)
- [Troubleshooting](./troubleshooting.md)
- [First Run Checklist](./first-run-checklist.md)

The [previous single-page guide](./previous-user-doc.md) documents the earlier Ollama-only release.

## Fast Path

Start one supported model server, then run:

```sh
npm install
npm run build
npm run dev -- --provider lmstudio
```

For remote providers, set an API key first (stored in your OS keychain):

```sh
npm run dev -- --provider openrouter --openrouter-api-key sk-or-v1-...
```

Inside the app:

```text
/provider
/models
/new
```
