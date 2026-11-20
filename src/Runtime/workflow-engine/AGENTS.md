# AGENTS.md

- Keep a change to what apps read additive. A field or value that a released app reads keeps its meaning, and a new
  enum value must be safe for an app that reads it as unknown. Ask before you make any other change. Released app
  versions keep the models they shipped with while the engine deploys ahead of them, as
  [changing the wire contract](../workflow-engine-app/README.md#changing-the-wire-contract) explains.
- Some mailbox invariants look wrong and are deliberate. Read [Mailboxes](docs/technical-guide.md#mailboxes) before
  you change mailbox code, and do not fix one in passing.
- After you change markup that the dashboard generates, run the searches in [Escaping](docs/dashboard.md#escaping).
