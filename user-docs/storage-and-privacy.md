# Storage And Privacy

Ollama Terminal Chat is local-first.

## What Leaves Your Machine

The app sends chat requests only to your local Ollama API:

```text
http://localhost:11434
```

It does not call external AI APIs.

## Where Conversations Are Stored

Windows:

```text
%USERPROFILE%\.ollama-cli-chat\conversations
```

macOS/Linux:

```text
~/.ollama-cli-chat/conversations
```

Each conversation is one JSON file.

## Where Preferences Are Stored

The remembered model is stored in:

Windows:

```text
%USERPROFILE%\.ollama-cli-chat\preferences.json
```

macOS/Linux:

```text
~/.ollama-cli-chat/preferences.json
```

The preferences file currently stores:

```json
{
  "lastModel": "llama3.2"
}
```

## Custom Storage Location

Set:

```powershell
$env:OLLAMA_TERMINAL_CHAT_HOME = "E:\my-hearth-data"
```

Then run:

```powershell
hearth
```

On macOS/Linux:

```sh
export OLLAMA_TERMINAL_CHAT_HOME=/path/to/my-hearth-data
hearth
```

## File Format

Conversation files include:

- Conversation ID.
- Title.
- Created timestamp.
- Updated timestamp.
- Active model.
- Optional system prompt.
- Full message history.

## Backups

Because conversations are plain JSON files, you can back up the whole conversations directory.

To include your remembered model, also back up `preferences.json`.

You can also copy a conversation JSON file to another machine and load it there if the file is placed in that machine's conversations directory.

## Deleting Conversations

There is no in-app delete command yet.

To delete a conversation, remove its JSON file from the conversations directory.

Use care when deleting files manually.
