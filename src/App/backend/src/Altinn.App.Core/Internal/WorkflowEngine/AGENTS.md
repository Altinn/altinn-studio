# AGENTS.md

- Ask before you change the JSON of the callback state, a command's key or payload, or the shape of the steps a
  workflow is enqueued with. Workflows already in flight still carry what the previous version wrote, as
  [in-flight workflows](../../../../docs/workflow-engine-integration.md#in-flight-workflows) explains.
- Some types here and in `Features/Process` look redundant and are deliberate, such as the enums that come in pairs.
  Do not merge them in passing.
- Keep each step of a service task's pipeline the last step of its own workflow, with nothing before it but an
  external stage's `MintMailbox` step. Each step's completion enqueues the next workflow, so a step that shares a
  workflow with the next one runs that one twice.
- After you change the steps a transition plans, the callbacks or the mailbox relay, run the
  [integration tests](README.md).

## Mailboxes

A reply step names its external stage by index, like any step, so a pipeline reshaped while a workflow is in flight
can hand a reply to another stage's handler. We accept that hazard and leave it unguarded, as
[in-flight workflows](../../../../docs/workflow-engine-integration.md#in-flight-workflows) explains. Do not add a guard
for it in passing.
