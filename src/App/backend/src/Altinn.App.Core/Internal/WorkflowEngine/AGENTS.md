# AGENTS.md

- Ask before you change the JSON of the callback state, a command's key or payload, or the shape of the steps a
  workflow is enqueued with. Workflows already in flight still carry what the previous version wrote, as
  [in-flight workflows](../../../../docs/workflow-engine-integration.md#in-flight-workflows) explains.
- Some types here and in `Features/Process` look redundant and are deliberate, such as the enums that come in pairs.
  Do not merge them in passing.
- After you change a command sequence, the callbacks or the mailbox relay, run the
  [integration tests](README.md).

## Mailboxes

`MailboxRelay` reads the index of the stage that opened an exchange from the pipeline at each hop, instead of
carrying it. A pipeline reshaped while a workflow is in flight can therefore point a handler at the wrong stage. We
accept that hazard and leave it unguarded, as
[in-flight workflows](../../../../docs/workflow-engine-integration.md#in-flight-workflows) explains. Do not add a guard
for it in passing.
