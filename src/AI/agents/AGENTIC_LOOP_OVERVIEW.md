# Altinity Agents — Architecture Overview

A short, non-code-heavy explanation of how the new agentic-loop
architecture works and why it exists. For the detailed file-by-file
breakdown, see [`AGENTIC_LOOP_REFACTOR.md`](./AGENTIC_LOOP_REFACTOR.md).

---

## What Altinity does

Altinity turns natural-language requests from app developers into
real changes to an Altinn app — adding a date field, building a form,
fixing a layout, answering a question about the repo. The user types
a goal; the service plans, edits the right files, verifies the
result, and commits it back to git.

---

## The old way

The legacy implementation used a fixed pipeline of specialist phases:

```
intake -> planner -> actor -> verifier -> committer
```

Each phase was a separate LLM call with its own prompt and its own
narrow view of the world. The planner decided what to do, the actor
did it, the verifier checked the result, and so on.

This worked but had three persistent problems:

- **Latency stacks up.** Every phase is a serial round-trip to the
  model, and they can't share context cheaply.
- **Coordination is brittle.** When the actor discovered something
  the planner missed, there was no clean way to revise the plan
  mid-execution.
- **Prompts drift.** Each phase had its own list of Altinn-specific
  rules, and keeping them consistent across prompts was a constant
  chore.

---

## The new way: one agent, one loop

The new architecture replaces planner + actor + verifier with **a
single agent driven by a tool-use loop**, modelled on how Claude
Code works.

```
                +----------------------------+
   user goal -> |   intake (security/parse)  |
                +----------------------------+
                              |
                              v
                +----------------------------+
                |   agentic loop             |
                |                            |
                |   - one system prompt      |
                |   - one set of tools       |
                |   - many turns             |
                +----------------------------+
                              |
                              v
                          committed
                           changes
```

In each turn the model decides what to do next — read a file, look up
the data model, edit a layout, run verification, commit — by calling
**tools**. The loop runs the tools, hands the results back to the
model, and asks for the next decision. The conversation ends when the
model has nothing more to do.

This is the same pattern as Claude Code: a single agent making
decisions one turn at a time, grounded by tools that let it actually
touch the world.

### What the model sees

The agent gets one system prompt that teaches it everything it needs
to behave well in this domain:

- **Altinn anatomy** — the four file groups it can edit (layouts,
  data models, text resources, policy), and how they relate.
- **Critical rules** — the gotchas the old prompts kept enforcing
  (component ID conventions, binding shapes, file-naming case rules,
  expression syntax).
- **Working with tools** — when to parallelise reads and when to
  serialise writes, how to recover from common errors.
- **Final-answer contract** — Conventional Commit style for changes,
  plain bullet lists instead of tables (because the frontend's
  markdown renderer can't render tables).

It also gets the session-specific context: the user's goal, the repo
path, whether write access is allowed, today's date, and (optionally)
pre-computed repo facts.

### What the model can do

The tools the agent can call:

- **`read_file`, `scan_repo`** — look at the repo.
- **`edit_file`, `write_file`, `discard_file_changes`** — change
  files. `edit_file` is the surgical "find this exact text, replace
  it" primitive; `write_file` creates or overwrites; `discard_file_changes`
  rolls one file back to HEAD.
- **`verify_changes`** — validate everything the agent has touched
  in this session against the Altinn rules.
- **`commit_session_branch`** — commit the work to a session branch
  in git.
- **`altinn_*` tools (via MCP)** — domain lookups from the MCP
  server (list layouts, look up data-model paths, find text
  resources, etc.).

The agent always reads before it writes — `edit_file` and `write_file`
refuse to touch a file the agent hasn't read this session. That keeps
edits grounded in the file's actual current state instead of the
model's guess at it.

---

## What the loop actually does

For each turn:

1. Optionally compact the conversation if it's grown too long.
2. Send the conversation to the model along with the tool catalog.
3. Read the response.
4. If the model produced text only, the agent is done — return.
5. Otherwise, run the tools the model asked for and append the
   results to the conversation.
6. Go to 1.

The loop terminates when one of these happens:

- **Completed** — the model has no more tool calls to make.
- **Max turns** — a safety limit; should be rare in practice.
- **Cancelled** — the user (or session controller) asked it to stop.
- **Error** — the LLM call itself failed (network, auth).
- **Stuck** — the model has called the same tool with the same
  input three times without making progress. Better to bail with
  a clear message than to burn turns on a known dead end.

### Parallelism

Tools are classified as either **safe to run in parallel** (reads,
inventory lookups) or **must be serialized** (writes). When the
model fires multiple safe tool calls in one turn, the loop runs them
together — a 7-file form drop that used to take 7 sequential model
round-trips now takes one. A hard cap stops a single turn from
spiking host load (configurable via `ALTINITY_MAX_TOOL_USE_CONCURRENCY`).

Writes are serialized by default so two edits can never race on the
same file system.

### Safety and failure handling

- **Read-only mode.** A session flag (`allow_app_changes=False`) is
  enforced by the tools themselves — write tools refuse to run.
- **Tool errors stay in the conversation.** When a tool fails —
  validation error, missing file, permission denied, unhandled
  exception — the failure is fed back to the model as an error
  result, not raised. The model can read it and adapt.
- **No silent mis-wirings.** Tools are validated at startup, so
  typos in tool definitions fail loud immediately instead of crashing
  at runtime during a user session.
- **Per-tool tracing.** Every tool call is wrapped in a Langfuse
  span so each step shows up in traces with its input, output, and
  duration.

---

## What changed alongside the loop

Two smaller but high-impact changes shipped together with the new
architecture:

- **Intake no longer ships attachments to the LLM.** PDFs and images
  used to be sent inline to the intake/security call, costing about
  150,000 input tokens per request. They're now summarised by
  filename only at intake; the spec-extraction step picks them up
  later if it actually needs to read them.
- **Larger output budget.** The model's per-turn output budget was
  raised from 8k to 16k tokens. The old cap was clipping turns that
  batched many file writes mid-stream, producing malformed tool
  calls. A warning log fires if a future regression hits the cap
  again.

---

## What this buys us

Across three runs of the same compound task:

| Change                                           | Wall-clock |
| ------------------------------------------------ | ---------- |
| Baseline (legacy three-phase pipeline)           | 6:30       |
| + drop attachments from intake, batch writes     | 5:49       |
| + raise output budget, fix mid-stream truncation | 5:58       |

Beyond the numbers:

- **Fewer prompts to maintain.** One system prompt instead of five,
  with the Altinn rules in one place.
- **Cleaner observability.** One trace per session shows the whole
  agent's thinking, not five disjoint phase traces.
- **Composable.** Adding a new capability is one file (a `Tool`
  subclass) plus one line of registration plus a unit test — no
  graph rewiring, no phase coordination.
- **Closer to how good agents are built today.** Claude Code, the
  Anthropic SDK examples, and most production agent stacks use the
  same one-loop-many-tools pattern; staying close to it makes
  borrowing improvements easier.

---

## What this does _not_ do (yet)

A few capabilities are explicitly out of scope for this phase:

- **Coordinator / sub-agent parallelism.** Spawning research workers
  in parallel for complex tasks is sketched but not built.
- **LLM-based context compaction.** Today's compaction is a
  mechanical char-based digest; a smarter LLM-driven summary with a
  circuit breaker is on the roadmap.
- **Per-input safety classification for shell-style tools.** The
  abstraction is in place, but no Bash-like tool actually uses it
  yet.

---

## Where to dig deeper

- [`AGENTIC_LOOP_REFACTOR.md`](./AGENTIC_LOOP_REFACTOR.md) — full
  file-by-file breakdown and the new module layout.
- `agents/core/loop.py` — the loop itself, well-commented.
- `agents/core/context.py` — the system prompt, including the
  Altinn-specific rules.
- `tests/unit/core/` — the behaviour, exhaustively pinned down. The
  test names alone are a good reading list.
