# First Chat

This page walks through your first conversation.

## Start The App

From the project folder:

```powershell
npm run dev
```

Or, if globally installed:

```powershell
hearth
```

You should see a terminal UI with:

- A large bordered output box.
- A bordered input box near the bottom.
- A status line under the input box.

## Choose A Provider

If the active provider is not the one you want, open the provider picker:

```text
/provider
```

Or switch directly by name:

```text
/provider openrouter
```

For the remote OpenRouter and OpenCode Zen providers, set an API key first:

```text
/key openrouter sk-or-v1-...
```

See [Providers, Models, And System Prompts](./models-and-system-prompts.md) for the full provider list and key details.

## Check Available Models

Type this into the input box:

```text
/models
```

The app opens a model picker. Use Up/Down to move, Enter to select, and Esc to cancel.

## Start A Conversation

Use one of your installed models:

```text
/new llama3.2
```

If you do not pass a model name:

```text
/new
```

The app uses the active provider's remembered model first. If there is none, it uses the first model returned by that provider.

## Send A Message

Type normally:

```text
Explain recursion in simple terms with one JavaScript example.
```

The assistant response streams inside the output box.

## Exit Safely

```text
/exit
```

The current conversation is saved before the app exits.

## Resume Later

Start the app again:

```powershell
hearth
```

List saved conversations:

```text
/list
```

Select a conversation with Up/Down and press Enter to load it.
