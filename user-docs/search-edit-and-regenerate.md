# Search Edit And Regenerate

## Search Past Conversations

Use:

```text
/search <query>
```

Example:

```text
/search docker compose
```

Search scans saved conversation titles, system prompts, and message content.

Results include:

- Conversation ID.
- Title.
- Model.
- Last updated time.
- Matching snippets.

Load a result with:

```text
/load conv_6794fa16-
```

## Regenerate The Last Assistant Response

Use:

```text
/regen
```

This removes the most recent assistant message and asks Ollama to answer the previous user message again.

Use this when:

- The response was incomplete.
- You want a different answer.
- The model drifted from your preferred style.

## Edit Your Last Message

Use:

```text
/edit
```

The input box enters edit mode and preloads your last user message.

Change the message, then press Enter.

The app:

1. Replaces your last user message.
2. Removes any assistant response that followed it.
3. Sends the edited message to Ollama.
4. Saves the updated conversation.

Cancel edit mode with Esc.

## When Edit Is Better Than Regenerate

Use `/regen` when your prompt was fine but you want a different answer.

Use `/edit` when your prompt had a typo, missing detail, wrong instruction, or unclear wording.
