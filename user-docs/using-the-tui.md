# Using The TUI

The v1.1 interface is a terminal UI, not a plain scrolling prompt.

## Layout

The screen has three main areas:

```text
Output box
Input box
Status line
```

## Output Box

The output box shows:

- Welcome and status notices.
- Your messages.
- Assistant responses.
- Command results.
- Search results.
- Errors.

Assistant responses stream into this box as Ollama generates them.

## Input Box

Use the input box for:

- Normal chat messages.
- Slash commands like `/new`, `/list`, and `/search`.
- Edited messages when `/edit` mode is active.

When the input is empty, it shows placeholder text.

## Status Line

The status line shows:

- Current mode: `Chat` or `Edit`.
- Picker modes: `Select model` or `Select conversation`.
- Active model name.
- Approximate context usage.
- Streaming state when a response is being generated.
- A `/help` reminder.

Example:

```text
Chat | Model: llama3.2 | Approx context: 1,240 tokens (4,830 chars) | /help
```

## Pickers

`/models` and `/list` open picker panels.

- Up/Down moves through choices.
- Enter selects the highlighted item.
- Esc cancels and returns to chat mode.

## Resize Behavior

If you resize the terminal:

- The output box recomputes its height.
- The input box remains visible.
- The status line remains under the input.
- The latest visible output stays near the bottom.

## Clearing The View

Use:

```text
/clear
```

This clears the output view only. It does not delete saved conversation files.
