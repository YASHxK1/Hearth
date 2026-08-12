# Troubleshooting

## Hearth Cannot Reach The Server

Confirm that the status/error names the intended provider and URL. Start that server, then retry:

- Ollama: use the included platform startup script.
- LM Studio: enable the Developer server or run `lms server start`.
- llama.cpp: run `llama-server -m <model.gguf> --port 8080`.
- OpenRouter/OpenCode Zen: confirm the provider's API key is set with `/key <provider>`; on 401/403 errors, regenerate the key and run `/key <provider> <new-key>`.

If the server uses a different address, save it with:

```sh
hearth --provider lmstudio --base-url http://localhost:4321
```

For providers hosted on separate machines, use `--ollama-base-url`, `--lmstudio-base-url`, and `--llamacpp-base-url`. For remote providers, `--openrouter-base-url` and `--opencodezen-base-url` override their defaults. Tailscale DNS names and IP addresses are accepted when supplied as an absolute `http://` or `https://` origin.

## No Models Are Available

Load or install a chat model in the active provider, then use `/models`. For Ollama, run `ollama pull <model>`. For LM Studio, download/load it in the application. For llama.cpp, start the server with a model or configure router mode.

## A Saved Conversation Will Not Load

Saved conversations reconnect to their recorded provider. Start that provider and ensure its configured URL is correct. Older conversation files default to Ollama.

## A Model Is Rejected

The model must appear in the active server’s model endpoint. Run `/models` and choose an available chat model. A model exposed by one provider does not automatically exist in another.

## The TUI Looks Broken

Use a modern terminal and a practical minimum size of roughly 80 columns by 24 rows. Resize and restart Hearth if necessary.

## Automated Versus Live Testing

The automated tests mock all three APIs. A passing test suite does not prove that an external server is running or that a particular model has a compatible chat template.
