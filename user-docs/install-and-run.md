# Install And Run

## Requirements

- Node.js 20 or newer
- npm
- Ollama, LM Studio, llama.cpp, OpenRouter, or OpenCode Zen with a chat model available

Install and build from the project folder:

```sh
npm install
npm run build
```

## Start A Model Server

Ollama can be started with the included scripts:

```powershell
.\scripts\start-ollama-hidden.ps1
```

```sh
./scripts/start-ollama-background.sh
```

For LM Studio, enable the server in the Developer tab or run:

```sh
lms server start --port 1234
```

For llama.cpp, run the `llama-server` executable with a GGUF model:

```sh
llama-server -m /path/to/model.gguf --port 8080
```

## Run Hearth

```sh
npm run dev -- --provider ollama
npm run dev -- --provider lmstudio
npm run dev -- --provider llamacpp
npm run dev -- --provider openrouter
npm run dev -- --provider opencodezen
```

The local defaults are ports 11434, 1234, and 8080 respectively. A custom URL is validated and remembered:

```sh
npm run dev -- --provider lmstudio --base-url http://localhost:4321
```

OpenRouter and OpenCode Zen need an API key, which is stored in your system keychain:

```sh
npm run dev -- --provider openrouter --openrouter-api-key sk-or-v1-...
npm run dev -- --provider opencodezen --opencodezen-api-key sk-zen-...
```

You can also set or clear keys from inside the app with `/key <provider> [key]`.

Configure separate remote or Tailscale endpoints together:

```sh
hearth \
  --ollama-base-url http://ollama-host.tailnet-name.ts.net:11434 \
  --lmstudio-base-url http://lmstudio-host.tailnet-name.ts.net:1234 \
  --llamacpp-base-url http://llamacpp-host.tailnet-name.ts.net:8080 \
  --provider lmstudio
```

Provider-specific URL flags save their settings independently. The final `--provider` controls which provider starts active.

Install globally with `npm install -g .`, then use `hearth`, `hearth --continue`, or `hearth --resume <id-or-title>`. Run `hearth models --provider <name>` to list models from a specific provider.
