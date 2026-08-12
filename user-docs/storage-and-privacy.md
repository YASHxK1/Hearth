# Storage And Privacy

Hearth is local-first. It sends chat messages only to the configured model server URL. The defaults are localhost URLs for Ollama, LM Studio, and llama.cpp, or the OpenRouter/OpenCode Zen HTTPS endpoints; review any custom network URL before use.

Conversation JSON files remain in `%USERPROFILE%\.ollama-cli-chat\conversations` on Windows or `~/.ollama-cli-chat/conversations` on macOS/Linux. Preferences are stored beside them in `preferences.json`.

The legacy `OLLAMA_TERMINAL_CHAT_HOME` environment variable changes this data directory for every provider.

Preferences store the last provider plus each provider's independent base URL and remembered model. Conversations store their provider, model, optional system prompt, and complete message history. They do not embed machine-specific URLs.

API keys for OpenRouter and OpenCode Zen are stored in the operating system keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux) using the `@napi-rs/keyring` library. They are never written to `preferences.json`.

Older preferences containing only `lastModel` and conversations without `provider` are interpreted as Ollama data and upgraded when subsequently saved.

Back up the data directory to preserve conversations and preferences. There is no in-app delete command; deletion currently requires manually removing a conversation JSON file.
