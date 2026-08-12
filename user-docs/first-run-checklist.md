# First Run Checklist

1. Install Node.js 20 or newer and npm.
2. Run `npm install` and `npm run build`.
3. Start Ollama, LM Studio, or `llama-server` with a chat model available. For OpenRouter or OpenCode Zen, create an API key and run `hearth --provider openrouter --openrouter-api-key <key>` (or `/key` in the app).
4. Run `hearth --provider <ollama|lmstudio|llamacpp|openrouter|opencodezen>`.
5. For a non-default address, also pass `--base-url <absolute-url>`.
6. Run `/provider` and confirm the expected provider.
7. Run `/models`, select a model, and start a chat with `/new`.
8. Send a message and confirm that the response streams.
9. Restart Hearth and confirm the provider, URL, and model are remembered.
10. Use `/continue` or `/resume` and confirm the conversation's provider is restored.
