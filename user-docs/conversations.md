# Conversations

Conversations are saved automatically as local JSON files.

## Start A New Conversation

```text
/new llama3.2
```

You can omit the model:

```text
/new
```

The app picks the first model reported by Ollama.

## Automatic Saving

The app saves automatically:

- When a conversation is created.
- After you send a user message.
- After the assistant response completes.
- After model changes.
- After system prompt changes.
- After regenerate/edit operations.
- On `/exit`.

You do not need to manually save during normal use.

## Manual Save

```text
/save
```

Use this if you want to force a save after a command or before closing the terminal.

## List Conversations

```text
/list
```

The output includes:

- Compact conversation ID.
- Title.
- Model.
- Message count.
- Last updated time.

## Load A Conversation

```text
/load conv_6794fa16-
```

You can also load by a unique title or partial title:

```text
/load Explain recursion
```

The full message history loads into the output box, and the status line updates to the conversation's model and context estimate.

## Titles

The app generates a simple title from the first user message in a conversation.

## Internal Conversation IDs

Conversation files use full internal IDs on disk. The app shows only a compact ID prefix in the conversation list.

```text
conv_6794fa16-
```

If two conversations ever share the same compact prefix, the app will ask you for a longer ID instead of guessing.
