# Build Plan: Ollama Terminal Chat Interface v1

Source PRD: `project-docs/v1-prd.md`

## Goal

Build a TypeScript + Node.js npm CLI that provides a persistent, multi-conversation terminal chat interface for local Ollama models. v1 covers Tier 1 core chat behavior plus Tier 2 quality-of-life features: streaming, Markdown rendering, syntax highlighting, search, system prompts, context usage estimates, regenerate, and last-message editing.

## Recommended Implementation Shape

Start with a simple REPL-style CLI, not a full TUI. The PRD explicitly leaves TUI open, and a line-based REPL is the fastest way to validate persistence, streaming, command behavior, and Ollama integration without locking the app into heavier UI architecture too early.

Suggested package choices:

- CLI entry/runtime: `commander`
- Interactive prompts: `@inquirer/prompts`
- Terminal Markdown rendering: `marked` plus `marked-terminal`
- Syntax highlighting: `highlight.js`
- Terminal colors: `chalk`
- Token estimation: lightweight local approximation first, optionally `gpt-tokenizer` later if useful
- Tests: `vitest`
- TypeScript execution/dev: `tsx`
- Build output: `tsup` or plain `tsc`

## Proposed Project Structure

```text
.
├── package.json
├── tsconfig.json
├── README.md
├── src
│   ├── index.ts
│   ├── cli
│   │   ├── commands.ts
│   │   ├── repl.ts
│   │   └── output.ts
│   ├── core
│   │   ├── app.ts
│   │   ├── conversation.ts
│   │   ├── context-usage.ts
│   │   └── ids.ts
│   ├── ollama
│   │   ├── client.ts
│   │   └── types.ts
│   ├── storage
│   │   ├── paths.ts
│   │   ├── repository.ts
│   │   └── schema.ts
│   └── search
│       └── search.ts
└── test
    ├── conversation.test.ts
    ├── storage.test.ts
    ├── commands.test.ts
    └── ollama-client.test.ts
```

## Data Model

Conversation JSON files should be stable, readable, and copyable between machines.

```ts
type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  systemPrompt?: string;
  messages: Message[];
};

type Message = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
};
```

Default storage:

- POSIX: `~/.ollama-cli-chat/conversations`
- Windows: `%USERPROFILE%\.ollama-cli-chat\conversations`

Use atomic writes: write to a temporary file in the same directory, then rename over the target JSON file. This directly protects the PRD's zero data-loss and force-kill recovery goals.

## Command Set

Implement these as slash commands inside the REPL:

- `/help`: Show documented commands.
- `/new [model]`: Start a new conversation, prompting for model if omitted.
- `/list`: Show saved conversations with ID, title, model, and updated timestamp.
- `/load <id>`: Load a saved conversation by ID.
- `/save`: Force-save current conversation.
- `/model <name>`: Validate model via Ollama tags, then switch current conversation model.
- `/system [prompt]`: Set, replace, or clear the current conversation system prompt.
- `/search <query>`: Search saved conversations and show matching snippets.
- `/regen`: Remove the last assistant message and re-run the previous user prompt.
- `/edit`: Open an edit prompt for the last user message, remove following assistant response, and resubmit.
- `/clear`: Clear terminal view only; do not delete history.
- `/exit`: Save and exit.

## Phase 0: Repository Bootstrap

Deliverables:

- Initialize npm project.
- Add TypeScript, lint/test/build scripts, and CLI bin entry.
- Create the source structure above.
- Add a minimal README with install/run/dev commands.

Acceptance checks:

- `npm run build` succeeds.
- `npm test` runs.
- `node dist/index.js --help` or equivalent CLI entry works.

## Phase 1: Ollama Client

Deliverables:

- Implement `GET /api/tags` for installed model listing and validation.
- Implement streamed `POST /api/chat`.
- Convert Ollama stream chunks into a simple async iterator of text deltas plus final metadata if available.
- Surface clear errors when Ollama is not running or a model is unavailable.

Acceptance checks:

- Unit tests cover model validation and stream parsing.
- Manual check against local Ollama can list installed models.
- Missing model produces a readable error.

## Phase 2: Conversation Core + Storage

Deliverables:

- Create conversation lifecycle helpers.
- Implement append user/assistant/system message behavior.
- Implement JSON save/load/list using the data model.
- Implement atomic writes and storage directory creation.
- Add basic title generation from first user message.

Acceptance checks:

- Conversations persist after each exchange.
- Loaded conversations preserve full message history.
- Conversation files are human-readable JSON.
- Tests cover save, load, list, corrupt JSON handling, and atomic write behavior where practical.

## Phase 3: REPL and Core Commands

Deliverables:

- Implement line-based REPL loop.
- Route slash commands separately from user messages.
- Implement `/new`, `/help`, `/save`, `/load`, `/list`, `/clear`, and `/exit`.
- Send normal user input to Ollama with full conversation history.
- Save automatically after each completed exchange.

Acceptance checks:

- User can start a chat, exchange multiple turns, exit, reload, and continue.
- `/list` shows title, timestamp, and model.
- `/clear` only clears screen; saved history remains intact.

## Phase 4: Streaming and Rendering

Deliverables:

- Stream assistant output as Ollama produces it.
- Buffer the full response while streaming so the final saved assistant message is exact.
- Render final Markdown cleanly after the stream completes.
- Add syntax highlighting for code blocks.

Implementation note:

During streaming, prefer simple live text output to avoid broken partial Markdown. After the response completes, optionally re-render the completed Markdown block. This handles the PRD's streaming requirement while avoiding fragile partial-Markdown rendering.

Acceptance checks:

- Long responses begin displaying before completion.
- Markdown lists, headings, emphasis, and code blocks are readable.
- Code blocks with declared languages highlight correctly where supported.

## Phase 5: Model Switching and System Prompts

Deliverables:

- Implement `/model <name>` using Ollama model validation.
- Include the system prompt in Ollama chat requests.
- Persist system prompt with the conversation.
- Implement `/system` command.

Acceptance checks:

- Switching models does not remove prior messages.
- Reloaded conversations retain their selected model and system prompt.
- Invalid model names produce clear errors.

## Phase 6: Search

Deliverables:

- Implement flat-file conversation search.
- Search titles, system prompts, and message content.
- Return conversation ID, title, timestamp, model, and short matching snippets.

Acceptance checks:

- `/search <query>` finds matches across saved conversations.
- Search handles multiple matches in one conversation without flooding the terminal.
- Empty or missing query gives usage help.

## Phase 7: Context Usage Indicator

Deliverables:

- Add approximate token counting for active conversation.
- Display context estimate after each user/assistant exchange.
- Keep the estimator intentionally labeled as approximate unless using a model-specific tokenizer.

Acceptance checks:

- Indicator updates as messages grow.
- System prompt and full message history are included in the estimate.
- No hard model-specific limit is claimed unless known.

## Phase 8: Regenerate and Edit Last Message

Deliverables:

- Implement `/regen` by removing the latest assistant message and resubmitting the previous user message.
- Implement `/edit` by prompting for a replacement for the latest user message, deleting any following assistant message, and resubmitting.
- Save after mutation and after regenerated response completes.

Acceptance checks:

- `/regen` works only when there is a previous user message.
- `/edit` works only when there is an editable last user message.
- Conversation history remains coherent after reload.

## Phase 9: README and Manual Test Script

Deliverables:

- Document install, dev, and global usage.
- Document Ollama prerequisites.
- Document every slash command.
- Add a manual QA script mapped to PRD acceptance criteria.

Acceptance checks:

- New user can install and start a working conversation from README alone.
- Manual test script covers persistence, load/list, model switching, search, system prompt, context estimate, edit, and regenerate.

## Testing Strategy

Automated tests should focus on deterministic behavior:

- Conversation state transitions.
- Command parsing and dispatch.
- Storage read/write/list/search behavior.
- Ollama stream parser with mocked chunks.
- Error handling for unreachable Ollama and unavailable models.

Manual tests should cover real terminal behavior:

- Streaming output.
- Markdown rendering.
- Syntax highlighting.
- Force-kill recovery.
- Cross-machine copy/load of conversation JSON.

## Initial Milestone Order

1. Bootstrap npm/TypeScript CLI.
2. Build Ollama client and model validation.
3. Build conversation persistence.
4. Wire the REPL with `/new`, `/list`, `/load`, `/save`, `/exit`, `/help`.
5. Add streaming chat path.
6. Add rendering, `/model`, `/system`, `/search`, context indicator.
7. Add `/regen` and `/edit`.
8. Polish README and run manual acceptance pass.

## Definition of Done for v1

- All PRD acceptance criteria are implemented.
- Conversation files persist reliably across restarts.
- CLI can be installed and run via npm.
- README is sufficient for a new technical user to start chatting within 5 minutes.
- Manual QA confirms the app works with local Ollama on at least one machine, with cross-machine testing documented when available.
