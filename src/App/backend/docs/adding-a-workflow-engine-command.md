# Adding a workflow engine command

A command is one kind of workflow step. [Workflow engine integration](workflow-engine-integration.md) describes
how steps run and what they may do. Paths below are relative to
[`Internal/WorkflowEngine`](../src/Altinn.App.Core/Internal/WorkflowEngine).

1. Create the command class in a suitable folder under `Commands/`. A command without a payload implements
   `IWorkflowEngineCommand`. A command with a payload extends `WorkflowEngineCommandBase<TPayload>`, with a payload
   record that derives from `CommandRequestPayload`.
2. For a payload, register it in `Commands/_Base/CommandPayload.cs`: a `[JsonDerivedType]` with a type
   discriminator on `CommandRequestPayload`, and a `[JsonSerializable]` on `CommandPayloadJsonContext`.
3. Register the command with `services.AddTransient<IWorkflowEngineCommand, MyCommand>()` in
   `AddWorkflowEngineIntegration`, in `DependencyInjection/ServiceCollectionExtensions.cs`.
4. Add the command to the right sequence in `WorkflowCommandSet.cs`:
    - `AddCommand` for a step before the commit.
    - `AddCriticalPostCommitCommand` for work after the commit that the transition waits for.
    - `AddSideEffectCommand` for work that runs in its own side-effects workflow. A side effect never holds up the
      transition. It can start before the `process/next` response is sent, and runs in parallel with other side
      effects. For a task transition it also runs in parallel with the main workflow's post-commit steps.
5. If the command adds a new branch to `WorkflowCommandSet`, extend the plan shapes in
   [`WorkflowEngineCommandRegistrationTests`](../test/Altinn.App.Core.Tests/Internal/WorkflowEngine/DependencyInjection/WorkflowEngineCommandRegistrationTests.cs).
   The test fails when a plan can name a command that is not registered.

A command must:

- be idempotent, because the engine retries steps
- report failures as results instead of throwing
- stage changes on the instance data unit of work, and never save to Storage itself
- acquire nothing itself, since the workflow already owns the instance

A command added with `AddCommand` gets the label for the BPMN element of its group, so the engine dashboard shows
it in the right place without changes. Post-commit and side-effect commands have no element label.
