# User Docs: Ollama Terminal Chat

Ollama Terminal Chat is a local terminal chat app for Ollama models. It lets you start conversations, save history automatically, reload old chats, switch models, search past conversations, and regenerate or edit your last prompt.

Everything stays local on your machine.

The app uses a terminal UI with a bordered output box, a bordered input box, and a status line that shows the active model and approximate context usage.

## Requirements

- Node.js 20 or newer
- npm
- Ollama installed
- Ollama running locally at `http://localhost:11434`
- At least one Ollama model installed

Install a model with:

```sh
ollama pull llama3.2
```

Start Ollama if it is not already running:

```sh
ollama serve
```

## Install

From this project folder:

```sh
npm install
npm run build
```

To use the CLI globally:

```sh
npm install -g .
```

After global install, run:

```sh
hearth
```

For development mode, run:

```sh
npm run dev
```

## Starting a Chat

Open the app:

```sh
hearth
```

Inside the input box, start a new conversation:

```text
/new llama3.2
```

If you omit the model name, the app uses the first model Ollama reports:

```text
/new
```

Then type normally:

```text
Explain closures in JavaScript with a short example.
```

The assistant response streams inside the output box and the conversation is saved automatically.

The status line under the input box shows the current model and approximate context size.

## Listing Installed Models

Inside the app:

```text
/models
```

Outside the app:

```sh
hearth models
```

## Saved Conversations

Every conversation is saved automatically after each user/assistant exchange.

List saved conversations:

```text
/list
```

Load a saved conversation:

```text
/load conv_your_conversation_id
```

Save manually:

```text
/save
```

Exit safely:

```text
/exit
```

## Switching Models

Switch the active conversation to another installed Ollama model:

```text
/model mistral
```

The existing conversation history stays intact. If the model is not installed, the app shows a clear error.

## System Prompts

Set a system prompt for the current conversation:

```text
/system You are concise and answer with examples.
```

Clear the system prompt:

```text
/system clear
```

System prompts are saved with the conversation.

## Search

Search across saved conversations:

```text
/search TypeScript
```

The app returns matching conversation IDs, titles, models, timestamps, and short snippets so you can choose what to load.

## Regenerate and Edit

Regenerate the last assistant response:

```text
/regen
```

Edit your last user message and resubmit:

```text
/edit
```

The input box switches into edit mode with your last message prefilled. Change it, press Enter, and the app removes the following assistant response if needed before sending the edited prompt again. Press Esc to cancel edit mode.

## Context Usage

The status line shows an approximate context usage indicator:

```text
Approx context: 1,240 tokens (4,830 chars)
```

This is an estimate, not an exact model-specific token count.

## Clearing the Screen

Clear the output view:

```text
/clear
```

This does not delete saved history.

## Full Command Reference

```text
/help                 Show command help.
/models               List installed Ollama models.
/new [model]          Start a new conversation.
/list                 List saved conversations.
/load <id>            Load a saved conversation.
/save                 Save the current conversation.
/model <name>         Switch the current conversation model.
/system [prompt]      Set the system prompt.
/system clear         Clear the system prompt.
/search <query>       Search saved conversations.
/regen                Regenerate the last assistant response.
/edit                 Edit the last user message and resubmit.
/clear                Clear the output view only.
/exit                 Save and exit.
```

## Where Conversations Are Stored

By default, conversations are saved as JSON files here:

Windows:

```text
%USERPROFILE%\.ollama-cli-chat\conversations
```

macOS/Linux:

```text
~/.ollama-cli-chat/conversations
```

To use a custom data folder, set:

```sh
OLLAMA_TERMINAL_CHAT_HOME=/path/to/folder
```

## Troubleshooting

If the app cannot reach Ollama:

```text
Could not reach Ollama at http://localhost:11434
```

Check that Ollama is running:

```sh
ollama serve
```

If a model is missing:

```text
Model "name" is not installed in Ollama.
```

Install it:

```sh
ollama pull name
```

If `hearth` is not recognized, rebuild and reinstall globally:

```sh
npm run build
npm install -g .
```

## Quick First Run Checklist

1. Install Ollama.
2. Run `ollama pull llama3.2`.
3. Run `npm install`.
4. Run `npm run build`.
5. Run `npm install -g .`.
6. Run `hearth`.
7. Type `/new llama3.2`.
8. Send your first message.
