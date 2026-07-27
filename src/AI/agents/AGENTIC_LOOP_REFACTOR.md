# Agentic Loop Refactor (branch: `refactor/agentic-loop`)

This document describes the in-progress refactor of the Altinity Agents
service from a hand-coded multi-phase pipeline to a single Claude-driven
tool-use loop, plus the supporting infrastructure changes that landed
alongside it.

Both `HEAD` and `main` currently point at the same upstream commit
(`03f6d10155`); everything in this document lives in the working tree
and has not been committed.

---

## Motivation

The legacy implementation routes every user request through a fixed
sequence of LangGraph nodes: intake → planner → actor → verifier →
committer. Each phase has its own prompt, its own LLM call, and its own
view of the world; cross-phase coordination is brittle, latency stacks
up because every phase is a serial round-trip, and behaviour that would
be one decision for a single agent is fragmented across multiple
specialised prompts.

The refactor replaces planner + actor + verifier with one agentic node
whose body is a tool-use loop modelled on Claude Code's architecture:

- One system prompt that teaches the model the Altinn anatomy, the
  hard constraints, and the final-answer contract.
- A first-class `Tool` abstraction and a registry that publishes those
  tools to the model.
- A loop that drives the conversation, dispatches tool calls (with
  safe-batch parallelism), and terminates on `COMPLETED`, `MAX_TURNS`,
  `CANCELLED`, `ERROR`, or `STUCK`.

The intake phase stays — it remains the security/parse boundary — but
its LLM call has been slimmed down so it no longer ferries large
attachment payloads.

---

## New module: `agents/core/`

A self-contained, network-free, framework-free implementation of the
agentic loop. Everything in this module is testable without touching
the LLM, MCP, or LangGraph.

### `tool.py`

`Tool` ABC plus three supporting dataclasses:

- `LoopContext` — runtime context passed to every tool: `session_id`,
  `repo_path`, `allow_app_changes`, optional `mcp_client`,
  `designer_api_key`, and an `extras` escape hatch for cross-tool state
  (the `read_set` and `changed_files` sets live there).
- `PermissionResult` — outcome of a per-call permission check.
- `ToolResult` — output of a tool execution. `content` is fed back to
  the model; `metadata` is telemetry-only.

`Tool` carries the safety contract the dispatcher relies on:

| Attribute / method            | Default    | Meaning                                                     |
| ----------------------------- | ---------- | ----------------------------------------------------------- |
| `is_concurrency_safe` (attr)  | `False`    | May run in parallel with other safe tools.                  |
| `is_read_only` (attr)         | `False`    | Does not mutate external state.                             |
| `concurrency_safe_for(args)`  | reads attr | Per-input classification, overridable for shell-like tools. |
| `read_only_for(args)`         | reads attr | Per-input read/write classification.                        |
| `check_permission(args, ctx)` | allow      | Gate execution per session (e.g. `allow_app_changes`).      |
| `run(args, ctx)`              | —          | Execute. Must not raise on user-visible failures.           |

Defaults are fail-closed: an unclassified tool is assumed to mutate
state and to conflict with others.

### `loop.py`

`run_loop()` drives one conversation to termination. Control flow:

1. Append user goal.
2. Optionally compact the message list for size.
3. Send to LLM, append assistant response.
4. If response has no `tool_use` blocks → `COMPLETED`.
5. Else validate and dispatch tools, then loop.

Notable behaviours:

- **Safe-batch parallelism.** Contiguous concurrency-safe tool calls
  run together via `asyncio.gather`, gated by an `asyncio.Semaphore`
  capped at `ALTINITY_MAX_TOOL_USE_CONCURRENCY` (default 10). Unsafe
  tools act as serialization barriers so order is preserved.
- **Per-input dispatch.** Safety is evaluated via
  `concurrency_safe_for(args)` so a tool can classify itself based on
  its input (a future shell tool can mark `ls` safe and `rm` unsafe).
- **Anti-thrash.** A sliding-window detector terminates the loop with
  `STUCK` when the same `(tool_name, input)` signature appears
  3× within the last 5 turns — the model is not making progress and
  burning more turns will not help.
- **Cancellation polling.** `is_cancelled()` is checked at the top of
  every turn so external session cancels take effect cleanly.
- **Telemetry.** Each tool call wraps a Langfuse span carrying tool
  name, args, and a truncated result.
- **Never raises on tool failures.** Validation errors, permission
  denials, and unhandled tool exceptions all collapse to
  `ToolResultBlock(is_error=True)` so the model sees them and can adapt.

### `llm_adapter.py`

`LLMAdapter` interface plus Anthropic and OpenAI implementations.

- `_DEFAULT_MAX_TOKENS = 16384` (up from 8192). The old 8k cap caused
  mid-stream `max_tokens` truncation on turns that batched many file
  writes — visible in trace `e907f37a` as a malformed `write_file` with
  missing `content`.
- `_warn_if_truncated()` logs a clear warning whenever the model hits
  `stop_reason == "max_tokens"` so the failure mode is obvious in logs.

### `registry.py`

`ToolRegistry` is the single source of truth for which tools exist this
session.

- `register(tool)` runs `_validate_tool()` at startup. Catches typos in
  `name`, missing `input_schema`, non-bool safety attrs, non-callable
  predicates — turns silent mis-wirings into loud startup errors.
- `to_schema()` emits the Anthropic tool-spec shape. The OpenAI adapter
  translates from this canonical form.
- `prepare_call(name, raw_input)` validates the model's args against
  the tool's pydantic schema and returns a `PreparedCall`. Raises
  `ToolNotFoundError` or `ToolArgsInvalidError`; the loop catches both
  and converts them to error tool_results.

### `compaction.py`

Char-based message-list compaction plus a per-tool-result cap. Default
budget is ~120k tokens (480k chars). When the conversation exceeds the
budget, the middle is replaced with a mechanical digest preserving
intent and recent context. Over-large tool results are truncated with a
marker so the model knows it did not get the whole thing.

### `messages.py`

`UserMessage` / `AssistantMessage` / `ToolUseBlock` / `ToolResultBlock`
dataclasses plus helpers (`extract_text`, `extract_tool_uses`). Pure
data — no I/O.

### `context.py`

`build_system_prompt(SessionContext)` — assembles the system prompt
from a stable set of sections in a documented order:

1. Identity (`Altinity`).
2. Operating principles — including the explicit batching rule:
   independent reads parallelise, and **writes to different files
   batch in the same turn**.
3. Altinn app anatomy — names the four file groups: Layouts, Data
   models, Text resources, Policy.
4. Critical rules — the gotchas the legacy prompts kept enforcing:
   the `-42` id-tail regex, `simpleBinding`, kebab-case file naming
   vs camelCase fields, array-based dynamic expressions.
5. Working with tools — read-parallel / write-serial guidance.
6. Session — repo path, user goal, mode (`WRITE` or `READ-ONLY`),
   today's date.
7. Repo facts (optional).
8. Form spec (optional).
9. Final-answer contract — Conventional Commit style for changes,
   `SOURCES` for Q&A, **no GFM tables** (the frontend's markdown
   renderer breaks on them), use bullet lists instead.

---

## New tool implementations: `agents/core/tools/`

### `file_tool.py`

CC-style file primitives modelled directly on Claude Code's
`read_file` / `edit_file` / `write_file`.

- `ReadFileTool` — concurrency-safe, read-only. Marks the path in
  `ctx.extras["read_set"]` so subsequent edits are gated by a
  read-before-write check. Truncates files over 60k chars with an
  inline marker. Rejects path traversal (`..`, absolute paths) with
  clear errors. Returns a recovery hint when called on a directory:
  _"Not a file: …is a directory. Call `scan_repo` …"_.
- `EditFileTool` — surgical literal-string replacement. Refuses to run
  if the file has not been read this session. Requires `old_string` to
  be unique; multiple matches are blocked unless `replace_all=true`.
  Rejects no-op edits.
- `WriteFileTool` — create or overwrite a file. Existing files require
  a prior read; new files do not. A successful write counts as a read
  so follow-up edits are safe.
- `DiscardFileChangesTool` — `git checkout HEAD -- <path>` for one
  file. Removes it from `changed_files` and `read_set`. Deliberately
  surgical: no whole-tree reset.

All three writers serialize via `is_concurrency_safe = False` so two
edits never race on the same file system.

### `repo_tool.py`

`ScanRepoTool` — single discovery call returning JSON with `layouts`,
`models`, `resources`, `available_locales`, `source_of_truth`,
`app_type`. Read-only, concurrency-safe.

### `verify_tool.py`

`VerifyChangesTool` — validates the change set tracked in
`ctx.extras["changed_files"]` before commit. Reads only. Blocks
`commit_session_branch` if any changed file has not been verified
since its last edit.

### `git_tool.py`

`CommitSessionBranchTool` — commits the session's changes with a
Conventional Commit message and creates the branch if needed.

### `mcp_tool.py` + `mcp_factory.py`

Wraps each MCP server tool descriptor as a `Tool` instance with the
MCP server's name, description, and JSON schema flowing through to the
LLM verbatim. `MCPTool` is concurrency-safe and read-only by default
because today every exposed MCP tool is an `altinn_*` inventory query;
a future writing MCP tool subclasses and overrides.

### Tool registration

| Tool                       | Concurrency-safe | Read-only |
| -------------------------- | ---------------- | --------- |
| `read_file`                | yes              | yes       |
| `scan_repo`                | yes              | yes       |
| `verify_changes`           | yes              | yes       |
| `edit_file`                | no               | no        |
| `write_file`               | no               | no        |
| `discard_file_changes`     | no               | no        |
| `commit_session_branch`    | no               | no        |
| `MCPTool` (any `altinn_*`) | yes              | yes       |

---

## New graph node: `agents/graph/nodes/agentic_loop_node.py`

Single LangGraph node replacing the legacy planner + actor + verifier
nodes. Responsibilities:

1. Build the `ToolRegistry` (CC-style file tools + MCP tools).
2. Assemble `SessionContext` and call `build_system_prompt`.
3. Construct `LoopContext` and the configured `LLMAdapter`.
4. Run `run_loop` with cancellation and event-callback wiring.
5. Map the `LoopResult` back onto `AgentState`.

---

## Modifications to existing files

| File                                  | Change                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `agents/graph/runner.py`              | Rewires the graph to route through `agentic_loop_node`.                                                                      |
| `agents/graph/state.py`               | `AgentState` extensions for loop-mode fields (final text, usage totals, termination reason).                                 |
| `agents/workflows/intake/pipeline.py` | Drops PDF/image attachments from the intake LLM call (~150k input tokens saved per request). Passes a filename-only summary. |
| `agents/services/llm/llm_client.py`   | Drops attachments from the `parse_intent_with_llm` security parser the same way.                                             |
| `agents/services/mcp/mcp_client.py`   | Call-tool interface used by `MCPTool`.                                                                                       |
| `agents/prompts/spec_extraction.md`   | Minor prompt tweak.                                                                                                          |
| `shared/models/attachments.py`        | Small additions to support the filename-only summary path.                                                                   |
| `shared/config/base_config.py`        | Config knobs (max-tokens, concurrency cap envs).                                                                             |
| `docker-compose.yaml`                 | Build wiring.                                                                                                                |
| `.python-version`                     | Local pin to 3.11.7 (kept out of commits).                                                                                   |

---

## Configuration

| Env var                             | Default | Effect                                                         |
| ----------------------------------- | ------- | -------------------------------------------------------------- |
| `ALTINITY_MAX_TOOL_USE_CONCURRENCY` | `10`    | Hard cap on the size of a safe-batch parallel dispatch. Min 1. |

`_DEFAULT_MAX_TOKENS = 16384` is currently a code constant in
`llm_adapter.py`; it should be promoted to a config knob if model
upgrades change the optimal value.

---

## Testing

New directory `tests/unit/core/` (~2.6k lines, 150 passing tests). All
tests use a `FakeAdapter` — no network, no real LLM.

| File                        | Lines | Coverage                                                                                                                                                       |
| --------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conftest.py`               | 153   | `EchoTool`, `CountingTool`, `BoomTool`, `DeniedTool`, `FakeAdapter`, `ctx` fixture.                                                                            |
| `test_loop.py`              | 637   | Termination, dispatch error paths, safe-parallel vs unsafe-barrier, concurrency cap, per-input predicate routing, result capping, anti-thrash, event emission. |
| `test_tool.py`              | 102   | Predicate defaults + per-input overrides.                                                                                                                      |
| `test_registry.py`          | 146   | Register/lookup, schema emission, `TestRegisterValidation` (7 mis-wiring cases).                                                                               |
| `test_file_tools.py`        | 318   | Read/edit/write/discard semantics including path traversal, read-before-write, truncation, directory-recovery hint.                                            |
| `test_write_tools.py`       | 418   | `verify_changes` + `commit_session_branch`.                                                                                                                    |
| `test_mcp_tool.py`          | 196   | MCP wrapper.                                                                                                                                                   |
| `test_repo_tool.py`         | 71    | `scan_repo`.                                                                                                                                                   |
| `test_compaction.py`        | 124   | Compaction config + truncation marker.                                                                                                                         |
| `test_context.py`           | 159   | System-prompt assembler (anatomy, critical rules, ordering, no-tables guidance).                                                                               |
| `test_agentic_loop_node.py` | 692   | Node integration.                                                                                                                                              |

Also new under `tests/unit/`:

- `test_anthropic_attachments.py` (98L) — attachment-handling regression coverage.
- `test_form_spec.py` (96L) — spec extraction coverage.

### Test results

| Suite                                              | Result                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tests/unit/core`                                  | 150 / 150 passing                                                                                                 |
| `tests/unit` (full)                                | 214 / 221 passing                                                                                                 |
| `tests/unit/test_verifier_fixer.py` (pre-existing) | 7 failures unrelated to this branch — `AgentState` requires `developer`/`org` fields the fixture does not supply. |

Run locally:

```sh
PYTHONPATH=. uv run --python 3.12 pytest tests/unit/core -q
```

---

## Performance changes

Measured across three runs of the same compound task:

| Change                                                     | Wall-clock |
| ---------------------------------------------------------- | ---------- |
| Baseline (legacy three-phase pipeline)                     | 6:30 min   |
| + Drop PDFs from intake + enable batched writes            | 5:49 min   |
| + Bump `max_tokens` 8k → 16k (fixes mid-stream truncation) | 5:58 min   |

Headline wins:

- **~150k input tokens per request** removed from intake by dropping
  attachment content (filename-only summary instead).
- **Round-trips collapsed** by encouraging the model to batch writes
  to different files in one turn. A 7-file form drop went from 7
  sequential LLM calls to 1 batched call (trace `ac2f4c77`).
- **Mid-stream truncation eliminated** by raising `max_tokens` and
  adding a warning log for future regressions.

Practical floor on these runs: turn 3 generates ~14.8k tokens at
~85 tok/s, so ~3 min of wall-clock is pure decode time the loop
cannot improve without coordinator-style parallelism (Phase 3, not in
scope yet).

---

## What this refactor explicitly does _not_ do

These were considered and deliberately left for follow-up phases:

- **Coordinator mode** with parallel research workers behind a
  feature flag. Spec exists; implementation deferred.
- **LLM-based auto-compaction** with a circuit breaker. The current
  compaction is a mechanical char-based digest with no
  summarization model.
- **Per-input safety classification for a real shell tool.** The
  abstraction is in place (`concurrency_safe_for(args)`,
  `read_only_for(args)`) but no Bash-like tool exists yet.

---

## Migration notes

- The legacy planner/actor/verifier nodes can be removed once the
  agentic loop has handled the full traffic mix in production for
  long enough to trust it. Until then, both paths can coexist via a
  router check in `runner.py`.
- All new tools live in `agents/core/tools/` and are registered in
  `agentic_loop_node.py`. Adding a tool is a one-file change plus
  registration plus a unit test.
- Tools that mutate state must explicitly set both
  `is_concurrency_safe = False` and `is_read_only = False` or
  override the per-input methods. The registry validator catches
  forgotten attributes at startup.
- The prompt's batching guidance is load-bearing for latency. Any
  edit to `context.py` that removes the "different files / same
  turn" phrasing will silently regress turn count on compound tasks
  (regression test in `test_context.py`).
