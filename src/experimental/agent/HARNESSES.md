# Harness compatibility

Treat harness installation version bumps as adapter changes: existing unit tests and transcript fixtures do not
establish compatibility with a new binary. Terminal behavior, transcript formats, hook semantics, authentication
and resume behavior all need live verification. Version verification checks identity, not compatibility.

An existing Agent keeps the image it was created with, but `agentctl self update` gives it the new `agentd` at once.
Adapter changes that accompany a bump must therefore also work with the previous pin.

Implementation: [adapters](src/harness), [terminal runtime](src/sessions/runtime/tmux.rs),
[Session service](src/sessions/service.rs). Harness pins: [self-dev](examples/self-dev/Dockerfile),
[minimal](examples/minimal/Dockerfile) (Claude Code only) and [worktree](../sandbox/examples/worktree/Dockerfile);
update them together.

## Upgrade test plan

Install the current platform with `make user-install` from `src/experimental`; it replaces and restarts `agentd`,
and refuses while any Session reports `Working` (#20871, #20872), so archive or delete earlier test Sessions first.
Test the self-dev image built from the branch: from `agent/examples/self-dev`, `agentctl apply --variant nested
--env-file <file> --wait` builds it with both harnesses and fits inside another Agent. Keep the env file outside the
checkout. Use fresh Session names and confirm `claude --version` and `codex --version` in the Sandbox; testing an
existing Sandbox does not prove the rebuilt image works.

Run each check against both harnesses unless the table names one. A low-cost model is enough, but Sessions on each
installation's manifest `defaults` must work at least once. Before attributing a failure to the bump, repeat the check
on an Agent built with the previous pin.

`agentctl` has no command for some of the steps:

- Keys without attaching: `agentctl exec agent/<agent> -- tmux send-keys -t '=agent-session-<id>:' Escape`, with the
  Session `id` from `agentctl get sessions -o json`. `tmux capture-pane -p -t '=agent-session-<id>:'` prints the screen.
- Idle without waiting 30 minutes: `agentctl archive`, then `agentctl unarchive`; `agentctl create` or `attach` then
  resumes the Session. Run the real idle-stop once, in the background.
- A long foreground tool call: ask for `timeout 90 tail -f /dev/null`. Claude Code refuses a bare `sleep` and may run a
  command in the background instead.
- A Claude Code permission prompt: add `"permissions": {"ask": ["Bash(touch:*)"]}` to `~/.claude/settings.json` in the
  Sandbox, start a new Session and ask it to run `touch`; ask rules prompt despite `--dangerously-skip-permissions`.
  Restore the file afterwards. The `AskUserQuestion` tool blocks on the operator without any configuration.
- A daemon restart: `pkill -x agentd`; the next `agentctl` command starts it again.

| Check                                                                | Harness     | Expected result                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create with an initial prompt                                        | Both        | One submission and answer; a daemon restart does not replay the prompt. A failed launch may lose the initial prompt and recover with an empty conversation.                                                               |
| Create without a prompt, then immediately `prompt --wait`            | Both        | Input submits without manual Enter. Repeat several times to expose startup races. Codex readiness depends on its `› ` composer and the truncated session-ID pane title.                                                   |
| Short, long, multiline, XML-shaped and literal request-heading input | Both        | `turns` preserves the complete operator input and shows no harness-injected text as operator input (#20870).                                                                                                              |
| Prompt again after completion, including identical text              | Both        | Waits for one more completed turn, ignoring previous completions.                                                                                                                                                         |
| Prompt during an active tool call, including identical text          | Both        | Input appears in `turns`; waiting follows work observed during settling, but does not demand an extra turn when input is absorbed into the current one.                                                                   |
| Prompt while a background command runs, until it finishes            | Claude Code | The wait ends with the operator's turn; the completion notification's own turn does not end a later wait early.                                                                                                           |
| Tool success and tool failure                                        | Both        | STATE reflects activity; tool completion alone does not complete a turn; `turns` marks only the failed call.                                                                                                              |
| Permission prompt and `AskUserQuestion`, approved and denied         | Claude Code | While blocked, STATE is `WaitingForInput` and `activity.turns` does not advance; answering or approving completes the turn. A denial is an interruption (#20869). Not tested for Codex, which launches without approvals. |
| Interruption during a tool call, then another prompt                 | Both        | Codex reports `Interrupt`, which releases the wait. Known gap (#20869): Claude Code has no interrupt hook, so STATE stays `Working` and a wait times out. The next prompt works in both.                                  |
| Model error reported through `StopFailure`                           | Claude Code | Create with an unknown `--model`. The completion report ends the wait, but does not imply a successful model response; inspect `turns`.                                                                                   |
| Model error without a completion report                              | Codex       | Create with an unknown `--model`. Codex shows the API error without a turn ending, so the wait times out and STATE stays `Working` (#20872); inspect the Session and recover manually.                                    |
| Short completion timeout                                             | Both        | Queuing, input readiness and delivery finish before the completion timeout starts. A timeout reports that the prompt was submitted; inspect turns before retrying. The next prompt contains no leftover draft.            |
| Idle-stop and resume, before and after the first turn                | Both        | After 30 unattached, quiet minutes the Session is Idle. An untouched Session remains usable; an established conversation resumes with its history.                                                                        |
| Archive mid-turn, then unarchive and resume                          | Both        | The harness stops once the turn ends; `create` or `attach` after unarchive resumes the conversation.                                                                                                                      |
| Idle Session whose transcript is older than 30 days                  | Claude Code | After a prompt in another Session of the Agent, it still resumes with its history. Backdate the transcript with `touch -d`.                                                                                               |
| Codex rollout compression                                            | Codex       | `local_thread_store_compression` is still off by default. Otherwise, check that `turns` and resume work for an Idle Session whose rollout is older than 7 days.                                                           |
| Create with `--model`/`--effort`, and with only manifest `defaults`  | Both        | `get sessions` shows the resolved selection and the harness reports the same model and effort, also after idle-stop and resume; an unknown value fails visibly in the terminal.                                           |
| Transcript location                                                  | Both        | `get sessions -o json` reports a `harnessTranscriptPath` that exists and grows with each turn, also after resume.                                                                                                         |
| Authentication and configuration                                     | Both        | Mediated login/inference works without unexpected onboarding or authentication dialogs; startup shows no new warnings; the status line renders; configured instructions and skills are available.                         |
| Nested Agent                                                         | Both        | Inside a Session, `agentctl claude login --from-stdin` with `$AGENT_CLAUDE_ACCESS_TOKEN` and `agentctl codex login --from-stdin < ~/.codex/auth.json` let a nested Agent run both harnesses.                              |
| New `agentd` with the previous pin                                   | Both        | When the change touches adapter code, an Agent on the previous image still creates, prompts, reads turns and resumes.                                                                                                     |

A completion wait counts a completed turn once the harness waits for input and no activity has arrived for 250 ms.

Inspect `get sessions` (including `-o json`) and `turns` alongside the terminal. Check user messages, assistant answers,
tool results and turn boundaries, including after compaction. A successful model response alone is insufficient.

Run the normal formatting, lint and test checks, plus `cargo test -p agent --lib -- --ignored` on a host with Node.js
and tmux. Those tests drive tmux with a synthetic program, not the harnesses, so they do not replace a live check; the
scrollback and Ctrl-Z checks also require Linux and util-linux `script`. Record in the PR, for each check and harness,
the result or why it was not run, with the tested versions and commands. Update adapter fixtures when native output
changes, and add a changelog entry. Never publish credentials or authentication-bearing process arguments.
