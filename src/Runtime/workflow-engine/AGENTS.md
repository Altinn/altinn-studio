# AGENTS.md

- Several mailbox invariants look wrong at first sight and are deliberate. Before you change mailbox code, read
  [Mailboxes](docs/technical-guide.md#mailboxes) in the technical guide, and do not "fix" an invariant in passing. The
  app-side relay saga lives in
  [the app-lib's `Internal/WorkflowEngine/AGENTS.md`](../../App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md).
- Do not describe the batched mailbox writes as an unconditional saving. They save statements only once batches form,
  as [the guide](docs/technical-guide.md#the-saving-arrives-with-the-batches) shows.
- After you change markup that the dashboard generates, run the searches in
  [Escaping](docs/dashboard.md#escaping) and report any hits.
