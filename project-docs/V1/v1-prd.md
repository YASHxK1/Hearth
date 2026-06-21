# PRD: Ollama Terminal Chat Interface (v1 — Tier 1 + Tier 2)

**Status:** Draft
**Scope:** Tier 1 (Core) + Tier 2 (Quality of Life)
**Tech Stack:** TypeScript + Node.js (npm)
**Out of scope for this doc:** Tier 3 (Power User), Tier 4 (Agentic Layer) — to be covered in a separate PRD

---

## 1. Executive Summary

**Problem Statement:** Ollama's built-in chat mode (`ollama run <model>`) is a raw, stateless interface. It has no conversation history, no session persistence, no formatting, and no way to manage multiple ongoing conversations. Anyone who wants a genuine chat experience with locally hosted models is forced into either a bare-bones terminal loop or a full third-party agent tool that brings far more complexity than needed.

**Proposed Solution:** A standalone CLI application that connects directly to the Ollama local API and provides a structured, persistent, multi-conversation chat experience inside the terminal — closer to what a web chat UI offers, without the overhead of an agentic framework.

**Success Criteria:**

- Tool is used in place of a web chat UI for day-to-day model interaction.
- Zero data-loss bugs across saved conversations over a sustained period of personal use.
- Tool runs without modification across at least two different machines with different hardware profiles.
- A new user (not the builder) can install and hold a working multi-turn conversation within 5 minutes, using only the README.
- Conversation history correctly persists and reloads across 100% of session restarts during testing.

---

## 2. User Experience & Functionality

### User Personas

- **Primary: The Builder (Yash)** — runs models locally across multiple machines (ASUS TUF A15, Dell Inspiron 3505), wants a daily-driver terminal chat tool that replaces switching to a browser tab.
- **Secondary: Other technical users** — developers comfortable with a terminal who want a lightweight, no-frills alternative to full agentic CLI tools like Claude Code or Codex App, without needing tool-calling or file access.

### User Stories

1. As a user, I want to start a new conversation with a chosen model, so that I can begin chatting without manual setup each time.
2. As a user, I want my conversation history saved automatically, so that I don't lose context if I close the terminal.
3. As a user, I want to list and reload previous conversations, so that I can pick up where I left off.
4. As a user, I want to switch models mid-session, so that I can compare responses without restarting the tool.
5. As a user, I want responses to stream in as they're generated, so that the experience feels responsive rather than frozen.
6. As a user, I want code blocks and formatting to render properly in the terminal, so that responses are actually readable.
7. As a user, I want to set a custom system prompt per conversation, so that I can tailor the model's behavior to the task.
8. As a user, I want to search across my past conversations, so that I can find something I discussed previously without scrolling through files manually.
9. As a user, I want to see how much context I'm using, so that I know when I'm approaching a model's context limit.
10. As a user, I want to regenerate or edit my last message, so that I can correct a mistake without retyping the whole conversation.

### Acceptance Criteria

**Conversation lifecycle**
- `/new` starts a fresh conversation and prompts for (or defaults) a model.
- Every conversation is saved to disk automatically after each message exchange — no manual save step required.
- `/load <id>` or an interactive picker reloads a past conversation with full message history intact.
- `/list` shows all saved conversations with a title (auto-generated or user-set), timestamp, and model used.

**Model handling**
- `/model <name>` switches the active model for the current conversation without losing prior message history.
- If a requested model isn't installed locally, the tool gives a clear error rather than failing silently.

**Core commands**
- `/new`, `/save`, `/load`, `/clear`, `/exit` all behave as documented in a `/help` command.
- `/clear` clears the current session view but does not delete saved history from disk unless explicitly confirmed.

**Streaming and rendering**
- Responses stream token-by-token as Ollama returns them, not as a single blocking dump.
- Markdown in responses (bold, italics, lists, headers, code blocks) renders correctly in the terminal.
- Code blocks display with syntax highlighting matched to the declared language where detectable.

**System prompts**
- A system prompt can be set per conversation via a command or config, and persists with that conversation's saved file.

**Search**
- A search command scans saved conversation files for a keyword/phrase and returns matching conversations with enough context to identify the right one.

**Context usage**
- The tool displays an estimated token/context usage indicator for the active conversation, updated as the conversation grows.

**Message editing**
- The user can regenerate the last assistant response, or edit their own last message and resubmit, without manually retyping prior turns.

### Non-Goals (explicitly out of scope for this PRD)

- No tool calling, file system access, or shell execution by the model.
- No multi-step planning, task execution, or subagents.
- No RAG / folder-as-context ingestion.
- No file attachment or piping support (`cat file | tool ask ...`).
- No persona/system-prompt library or preset management beyond a single prompt per conversation.
- No cost tracking or cloud-model comparison features.
- No GUI or TUI dashboard — this PRD assumes a REPL-style terminal interface, not a full visual TUI (that decision is open, see Technical Specifications).
- No listing in Ollama's "Launch" directory — this is a later distribution concern, not a v1 build requirement.
- No authentication, multi-user accounts, or remote sync between machines in this version. "Multiple machines" here means the tool runs independently and identically on each machine — not that conversations sync between them.

---

## 3. AI System Requirements

**Tool Requirements:**

- Ollama installed and running locally on each machine, exposing its REST API at `http://localhost:11434`.
- Direct integration with:
  - `POST /api/chat` — primary conversational endpoint, used with streaming enabled.
  - `GET /api/tags` — to list installed models for selection and validation.
- No external AI APIs or cloud model calls in this scope — purely local Ollama-served models.

**Evaluation Strategy:**

- **Functional testing:** manually script through every user story above and confirm acceptance criteria pass, across both target machines (ASUS TUF A15, Dell Inspiron 3505) to catch hardware/performance differences.
- **History integrity testing:** force-kill the process mid-conversation and confirm no corruption or loss on next load.
- **Cross-machine testing:** confirm a conversation file created on one machine opens correctly when copied to the other (validates the storage format isn't accidentally machine-specific).
- **New-user test:** have someone unfamiliar with the project install and use it from README instructions alone, timed, to validate the 5-minute onboarding success criterion.
- **Streaming reliability:** confirm streamed output doesn't break formatting mid-stream (e.g., a code block split across stream chunks should still render correctly once complete).

---

## 4. Technical Specifications

### Architecture Overview

- **Language/runtime:** TypeScript on Node.js. Finalized stack decision.
- **Package management:** npm, with the tool distributed as an npm package (global install via `npm i -g`).
- **Interface style:** REPL-style command loop in the terminal. Whether this becomes a richer TUI (e.g., using a library like `ink`) versus a simpler line-based REPL is an open decision — recommend starting with the simpler REPL for v1 and revisiting if the UX feels too limited.
- **Data flow:**
  1. User input captured in terminal loop.
  2. Message appended to in-memory conversation state.
  3. Request sent to local Ollama `/api/chat` with full message history and selected model.
  4. Streamed response tokens rendered live to terminal as they arrive.
  5. Completed response appended to conversation state and persisted to disk.

### Integration Points

- **Ollama local API** (`localhost:11434`) — sole external dependency. No other APIs, databases, or auth providers involved in this scope.
- **File system** — conversations stored as flat JSON files, one per conversation, in a dedicated app data directory (path convention TBD, e.g., `~/.ollama-cli-chat/conversations/`).

### Data Storage

- **Format:** Flat JSON files (per user decision) — one file per conversation.
- **Required fields per conversation file:** conversation ID, title, created/updated timestamps, model used, system prompt (if set), full message array (role + content + timestamp per message).
- **Rationale for flat files over SQLite:** simpler to inspect, copy between machines, and back up manually; acceptable tradeoff given expected scale (personal/small-group use, not high-volume concurrent access).
- **Known limitation to flag:** flat-file search and listing will not scale as gracefully as a database if conversation count grows very large. Acceptable for v1; worth revisiting if usage grows substantially.

### Security & Privacy

- All data stays local — no conversation content leaves the machine, since both the model (Ollama) and storage (local JSON files) are local-only.
- No authentication required in this version since there's no remote access or shared backend.
- Since this is intended to eventually run across multiple machines and potentially be shared with others, file permissions on the conversation storage directory should be restricted to the owning user by default.

---

## 5. Risks & Roadmap

### Phased Rollout

- **MVP (Tier 1):** conversation persistence, multi-turn context, conversation list/load/save, model switching, basic slash commands.
- **v1 (Tier 1 + Tier 2 — this PRD):** adds streaming, Markdown rendering, syntax highlighting, message edit/regenerate, conversation search, per-conversation system prompts, context usage indicator.
- **v1.1+ (separate PRD):** Tier 3 power-user features — file piping, RAG-lite folder context, persona presets, export, cost/speed stats.
- **v2.0+ (separate PRD):** Tier 4 agentic layer — tool calling, file read/write, planning, subagents, approval gates.

### Technical Risks

- **Streaming + Markdown rendering conflict:** rendering partial Markdown (e.g., an unclosed code block) mid-stream can visually break formatting until the block completes. Needs a buffering strategy, not naive token-by-token rendering of raw Markdown.
- **Cross-machine consistency:** different hardware (e.g., the RTX 3050 4GB machine vs. the integrated-graphics Dell) will see different model response speeds. The tool itself must behave identically; only raw inference speed should differ. Worth explicit testing rather than assuming Node.js code behaves the same regardless of underlying model performance.
- **Flat-file storage scaling:** as noted above, conversation search and listing performance will degrade as file count grows. Low risk at current expected scale, but worth a documented threshold to revisit storage approach.
- **"Shared with others" ambiguity:** the long-term intent to share this with other users isn't fully scoped here (no auth, no sync, no multi-user concerns addressed). This PRD treats "shared" as "others can install and run their own independent instance," not a collaborative or networked feature. If true multi-user sharing is intended, that needs its own discovery pass before being added to a roadmap.
- **Node.js runtime dependency:** TypeScript/Node.js is the finalized stack. The tradeoff to track: every machine running this tool needs Node.js installed, which is fine for the builder's own machines but adds friction for the "shared with others" goal compared to a single-binary language like Go. Mitigate via clear install docs and, if needed, an `npm i -g` distribution path to keep setup to one command.

---

*End of PRD — Tier 1 and Tier 2 scope only. Tier 3 (Power User) and Tier 4 (Agentic Layer) to be scoped in a follow-up PRD once this version is built and validated.*