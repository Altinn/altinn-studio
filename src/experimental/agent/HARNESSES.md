# Harness compatibility

Treat harness installation version bumps as adapter changes: existing unit tests and transcript fixtures do not
establish compatibility with a new binary. Terminal behavior, transcript formats, hook semantics, authentication
and resume behavior all need live verification. Version verification checks identity, not compatibility.

Implementation: [adapters](src/harness), [terminal runtime](src/sessions/runtime/tmux.rs),
[Session service](src/sessions/service.rs), [self-dev image](examples/self-dev/Dockerfile).

## Upgrade test plan

Run against **every supported harness** in the rebuilt image. Install the current platform with `make user-install`
from `src/experimental`, restart `agentd`, and confirm the Agent is ready. Use fresh Session names and verify the
installed harness versions; testing an existing Sandbox does not prove the rebuilt image works.

| Check | Expected result |
| --- | --- |
| Create with an initial prompt | One submission and answer; a daemon restart does not replay the prompt. A failed launch may lose the initial prompt and recover with an empty conversation. |
| Create without a prompt, then immediately `prompt --wait` | Input submits without manual Enter. Repeat several times to expose startup races. |
| Short, long, multiline, XML-shaped and literal request-heading input | `turns` preserves the complete operator input. |
| Prompt again after completion, including identical text | Waits for one more completed turn, ignoring previous completions. |
| Prompt during an active tool call, including identical text | Input appears in `turns`; waiting follows work observed during settling, but does not demand an extra turn when input is absorbed into the current one. |
| Tool success, tool failure, permission request and permission resolution | STATE reflects activity and blocking; tool completion alone does not complete a turn. Exercise permissions with a configuration that permits prompting. |
| Supported interruption, then another prompt | The reported turn ending releases the wait; the next prompt remains usable. |
| Model error reported through `StopFailure` | The completion report ends the wait, but does not imply a successful model response; inspect `turns`. |
| Model error without a completion report | The wait times out; inspect the Session and recover manually. |
| Short completion timeout | Queuing, input readiness and delivery finish before the completion timeout starts. A timeout reports that the prompt was submitted; inspect turns before retrying. The next prompt contains no leftover draft. |
| Idle/resume, before and after the first turn | An untouched Session remains usable; an established conversation resumes with its history. |
| Transcript writes while the terminal is quiet | Recent transcript writes keep an unattached Session alive; missing or old transcripts do not prevent idle-stop. |
| Authentication and configuration | Mediated login/inference works without unexpected onboarding or authentication dialogs; configured instructions and skills are available. |

Completion waits poll local database activity every 250 ms and require identical completed, waiting activity
in two consecutive polls.

Inspect `get sessions` (including `-o json`) and `turns` alongside the terminal. Check user messages, assistant answers,
tool results and turn boundaries, including after compaction. A successful model response alone is insufficient.

Run the normal formatting, lint and test checks, plus `cargo test -p agent --lib -- --ignored` on a host with Node.js
and tmux for the terminal integration check. Record tested versions, commands and observed results in the PR;
update adapter fixtures when native output changes. Never publish credentials or authentication-bearing process arguments.
