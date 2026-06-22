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

The app uses your remembered model first. If there is no remembered model, it uses the first model returned by Ollama.

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
