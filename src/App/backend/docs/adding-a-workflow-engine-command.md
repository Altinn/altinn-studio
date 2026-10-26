# Adding a workflow engine command

A command is one kind of workflow step. It follows the rules in [callbacks](workflow-engine-integration.md#callbacks)
and [in-flight workflows](workflow-engine-integration.md#in-flight-workflows). Paths below are relative to
[`Internal/WorkflowEngine`](../src/Altinn.App.Core/Internal/WorkflowEngine/README.md).

1. Create the command class under `Commands/`. A command without a payload implements `IWorkflowEngineCommand`. A
   command with a payload extends `WorkflowEngineCommandBase<TPayload>`, with a payload record that derives from
   `CommandRequestPayload`. A command that needs another timeout or retry strategy than the engine's sets
   `DefaultStepOptions`.
2. For a payload, register it in `Commands/_Base/CommandPayload.cs`: a `[JsonDerivedType]` with a type discriminator
   on `CommandRequestPayload`, and a `[JsonSerializable]` on `CommandPayloadJsonContext`.
3. Register the command with `services.AddTransient<IWorkflowEngineCommand, MyCommand>()` in
   `AddWorkflowEngineIntegration`, in `DependencyInjection/ServiceCollectionExtensions.cs`.
4. Add the command to the right sequence in `WorkflowCommandSet.cs`:
    - `AddCommand` for a task-end, abandon or task-start step.
    - `AddPrimaryPostCommitCommand` for work after the commit and the task start that the transition waits for, such
      as the process-end steps.
    - `AddAuxiliaryCommand` for work in an [auxiliary workflow](workflow-engine-integration.md#auxiliary-workflows),
      which never holds up the transition.
5. If the command adds a branch to `WorkflowCommandSet`, extend the plan shapes in
   [`WorkflowEngineCommandRegistrationTests`](../test/Altinn.App.Core.Tests/Internal/WorkflowEngine/DependencyInjection/WorkflowEngineCommandRegistrationTests.cs).
   The test fails when a plan can name a command that is not registered.
