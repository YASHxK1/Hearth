# Ollama Terminal Chat

A persistent terminal chat interface for local Ollama models. It talks directly to the local Ollama API, stores conversations as readable JSON files, and presents chat in a bordered terminal UI with a fixed input box and status line.

## Requirements

- Node.js 20 or newer
- npm
- Ollama installed
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

`hearth` starts Ollama if needed and opens a new chat using the remembered model when possible. To return to existing work:

```sh
hearth --continue
hearth --resume <id-or-title>
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
- `/models`: Open an arrow-key picker for installed Ollama models.
- `/new [model]`: Start another conversation. If no model is supplied, the remembered model is used first.
- `/list`: Open an arrow-key picker for saved conversations.
- `/load <id-or-title>`: Load a saved conversation by compact ID or title.
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

1. Run `hearth models` and confirm installed models are listed.
2. Run `hearth` and confirm a new chat starts automatically.
3. Run `/new <model>` and confirm another conversation starts.
4. Confirm the bordered output box, input box, and status line render.
5. Send a normal chat message and confirm the response streams inside the output box.
6. Resize the terminal and confirm the boxes remain intact.
7. Exit with `/exit`, restart `hearth`, and confirm a new chat uses the remembered model.
8. Run `hearth --continue` and confirm the latest conversation loads.
9. Run `hearth --resume <id-or-title>` and confirm the referenced conversation loads.
10. Run `/list`, select a conversation with arrow keys, and press Enter.
11. Confirm the previous messages are still present in the JSON file.
12. Run `/models`, select another model with arrow keys, and confirm the status line updates.
13. Run `/model <another-installed-model>` and confirm typed switching still works.
14. Run `/system You are concise.` and confirm the saved JSON includes the prompt.
15. Run `/search <word-from-earlier-message>` and confirm the conversation is returned.
16. Run `/regen` and confirm the last assistant response is replaced.
17. Run `/edit`, update the prefilled message, and confirm history reloads coherently.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
