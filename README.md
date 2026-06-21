# Ollama Terminal Chat

A persistent terminal chat interface for local Ollama models. It talks directly to the local Ollama API, stores conversations as readable JSON files, and presents chat in a bordered terminal UI with a fixed input box and status line.

## Requirements

- Node.js 20 or newer
- npm
- Ollama installed and running locally at `http://localhost:11434`
- At least one installed model, for example:

```sh
ollama pull llama3.2
```

## Install

For local development:

```sh
npm install
npm run build
npm run dev
```

To install globally from this checkout:

```sh
npm install -g .
hearth
```

## Usage

Start the TUI:

```sh
hearth
```

The screen is split into:

- A bordered output box for conversation history and streamed responses.
- A bordered input box anchored near the bottom.
- A status line showing the active model and approximate context usage.

Or in development:

```sh
npm run dev
```

Useful non-interactive commands:

```sh
hearth models
hearth list
hearth --help
```

## Slash Commands

- `/help`: Show available commands.
- `/models`: List installed Ollama models.
- `/new [model]`: Start a new conversation. If no model is supplied, the first installed Ollama model is used.
- `/list`: List saved conversations.
- `/load <id>`: Load a saved conversation.
- `/save`: Save the current conversation.
- `/model <name>`: Switch the active model after validating it exists in Ollama.
- `/system [prompt]`: Set the system prompt. Use `/system clear` to remove it.
- `/search <query>`: Search saved conversations.
- `/regen`: Regenerate the last assistant response.
- `/edit`: Edit the last user message and resubmit.
- `/clear`: Clear the output view only. Saved history is not deleted.
- `/exit`: Save and exit.

## Storage

Conversation files are saved as JSON in:

- Windows: `%USERPROFILE%\.ollama-cli-chat\conversations`
- macOS/Linux: `~/.ollama-cli-chat/conversations`

Set `OLLAMA_TERMINAL_CHAT_HOME` to use a different data directory.

## Manual QA Script

1. Run `ollama serve` if Ollama is not already running.
2. Run `hearth models` and confirm installed models are listed.
3. Run `hearth`, then `/new <model>`.
4. Confirm the bordered output box, input box, and status line render.
5. Send a normal chat message and confirm the response streams inside the output box.
6. Resize the terminal and confirm the boxes remain intact.
7. Exit with `/exit`, restart `hearth`, then `/list` and `/load <id>`.
8. Confirm the previous messages are still present in the JSON file.
9. Run `/model <another-installed-model>` and confirm the status line updates.
10. Run `/system You are concise.` and confirm the saved JSON includes the prompt.
11. Run `/search <word-from-earlier-message>` and confirm the conversation is returned.
12. Run `/regen` and confirm the last assistant response is replaced.
13. Run `/edit`, update the prefilled message, and confirm history reloads coherently.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
