# Ollama Terminal Chat User Guide

This folder contains the user documentation for Ollama Terminal Chat, a local terminal chat app for Ollama models.

The app gives you a persistent chat experience in the terminal:

- A bordered output box for conversation history and streamed responses.
- A bordered input box where you type messages and slash commands.
- A status line showing the active model and approximate context usage.
- Automatic local conversation saving.
- Remembered last-used model across app restarts.
- Conversation list, compact-ID/title loading, search, model switching, system prompts, regenerate, and edit-last-message support.

Everything stays on your machine. The app talks to your local Ollama server and stores conversations as local JSON files.

## Documentation Map

Read these in order if you are setting the app up for the first time:

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

Legacy/reference copy:

- [Previous Single-Page User Doc](./previous-user-doc.md)

## Fast Path

From the project folder:

```powershell
npm install
npm run build
npm run dev
```

Inside the app:

```text
/models
/new
```

Then type a normal message.
