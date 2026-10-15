# Workflow engine integration

This namespace runs an app's process transitions as workflows in the
[workflow engine](../../../../../../Runtime/workflow-engine-app/README.md). The app enqueues the workflows, and the
engine calls back into the app to run each step.

- The [process engine](../Process/ProcessEngine.cs) uses it to start a process, to move to the next task, and to
  resume a failed transition. Process reads use it to report whether a transition is running or has failed.
- The engine calls the app's
  [callback endpoint](../../../Altinn.App.Api/Controllers/WorkflowEngineCallbackController.cs) for each step.
- Service tasks run as steps. The [authoring guide](../../../../docs/service-task-pipelines.md) describes them for
  app developers.
- Steps save instance data to [Storage](https://github.com/Altinn/altinn-storage) as the service owner. An app's
  policy must therefore give the service owner the rights that the
  [policy analyzer](../../../Altinn.App.Analyzers/Authorization/ServiceOwnerActions.cs) lists.
- The [operator](../../../../../../Runtime/operator/README.md) supplies the app codes that sign callback tokens and
  callback state.

[Workflow engine integration](../../../../docs/workflow-engine-integration.md) describes the design, its
guarantees, and how to operate it. [Adding a command](../../../../docs/adding-a-workflow-engine-command.md)
describes how to add a step type.
