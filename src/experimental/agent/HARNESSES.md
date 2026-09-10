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
| Create with an initial prompt | One submission and answer; a daemon restart does not replay the prompt. |
| Create without a prompt, then immediately `prompt --wait` | Input submits without manual Enter. Repeat several times to expose startup races. |
| Short, long, multiline, XML-shaped and literal request-heading input | `turns` preserves the complete operator input. |
| Prompt again after completion, including identical text | Waits for one more completed turn, ignoring previous completions. |
| Prompt during an active tool call, including identical text | Input appears in `turns`; waiting follows work observed during settling, but does not demand an extra turn when input is absorbed into the current one. |
| Tool success, tool failure, permission request and permission resolution | STATE reflects activity and blocking; tool completion alone does not complete a turn. Exercise permissions with a configuration that permits prompting. |
| Short timeout during startup, delivery and turn-completion waiting | Caller returns within its budget. Expired queued input is not delivered later; uncertain delivery is reported without automatic resubmission. |
| Idle/resume, before and after the first turn | An untouched Session remains usable; an established conversation resumes with its history. |
| Authentication and configuration | Mediated login/inference works without unexpected onboarding or authentication dialogs; configured instructions and skills are available. |

Inspect `get sessions` (including `-o json`) and `turns` alongside the terminal. Check user messages, assistant answers,
tool results and turn boundaries, including after compaction. A successful model response alone is insufficient.

Run the normal formatting, lint and test checks. Record tested versions, commands and observed results in the PR;
update adapter fixtures when native output changes. Never publish credentials or authentication-bearing process arguments.
