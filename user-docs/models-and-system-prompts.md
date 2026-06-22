# Models And System Prompts

## Select Or List Installed Models

Inside the app:

```text
/models
```

This opens an arrow-key picker. Use Up/Down to move, Enter to select, and Esc to cancel.

If a conversation is active, selecting a model switches that conversation. If no conversation is active, selecting a model saves it as the remembered default for future `/new` chats.

Outside the app:

```powershell
ollama list
```

## Install A Model

Use Ollama directly:

```powershell
ollama pull llama3.2
```

Then use it in the app:

```text
/new llama3.2
```

After you use or select a model, the app remembers it across restarts. Running `/new` without a model uses the remembered model first.

## Switch Models Mid-Conversation

```text
/model mistral
```

The conversation history stays intact.

The status line updates immediately after the switch.

If the model is not installed, the app shows an error and keeps the current model.

## System Prompts

A system prompt changes how the model should behave for the current conversation.

Set one:

```text
/system You are a concise programming tutor. Use short examples.
```

Clear it:

```text
/system clear
```

System prompts are saved with the conversation file.

## Practical Examples

For coding help:

```text
/system You are a senior TypeScript engineer. Be direct and include runnable examples.
```

For writing:

```text
/system You are a careful editor. Preserve my voice and explain changes briefly.
```

For study:

```text
/system Teach step by step. Ask one check-for-understanding question at the end.
```
