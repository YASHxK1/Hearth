# Commands

All commands are typed into the input box.

## Help

```text
/help
```

Shows the command reference inside the output box.

## Models

```text
/models
```

Opens an arrow-key picker for installed Ollama models.

Use Up/Down to move, Enter to select, and Esc to cancel.

If a conversation is active, selecting a model switches that conversation. If no conversation is active, selecting a model saves it as the remembered default for the next `/new`.

## New Conversation

```text
/new [model]
```

Examples:

```text
/new llama3.2
/new mistral
/new
```

If you omit the model, the app uses the remembered model first. If the remembered model is unavailable, it falls back to the first model reported by Ollama.

## List Conversations

```text
/list
```

Opens an arrow-key picker for saved conversations.

Use Up/Down to move, Enter to load, and Esc to cancel.

## Load Conversation

```text
/load <id-or-title>
```

Example:

```text
/load conv_6794fa16-
```

You can also load by a unique title or partial title:

```text
/load Explain recursion
```

## Save

```text
/save
```

Forces a save of the current conversation.

## Switch Model

```text
/model <name>
```

Example:

```text
/model qwen3:0.6b
```

The model must already be installed in Ollama.

## System Prompt

Set:

```text
/system You are concise and practical.
```

Clear:

```text
/system clear
```

## Search

```text
/search <query>
```

Example:

```text
/search recursion
```

## Regenerate

```text
/regen
```

Removes the last assistant response and generates a new one from the previous user message.

## Edit Last User Message

```text
/edit
```

The input box switches to edit mode with your last user message prefilled.

Press Enter to submit the edited message.

Press Esc to cancel edit mode.

## Clear Output

```text
/clear
```

Clears the output view only. Saved history remains on disk.

## Exit

```text
/exit
```

Saves the current conversation and exits.

`/quit` also exits.
