# Workflow engine integration

This namespace runs an app's process transitions as workflows in the
[workflow engine](../../../../../../Runtime/workflow-engine/README.md), which the
[Workflow Engine App](../../../../../../Runtime/workflow-engine-app/README.md) hosts for apps. The app enqueues the
workflows, and the engine calls back into the app to run each step.
[Workflow engine integration](../../../../docs/workflow-engine-integration.md) describes the design and its
guarantees, and [adding a workflow engine command](../../../../docs/adding-a-workflow-engine-command.md) how to add a
kind of step.

- The [process engine](../Process/ProcessEngine.cs) uses it to start a process, to move to the next task, to resume a
  failed transition, and to go on after a service task. [Process reads](../Process/ProcessStateEnricher.cs) use it to
  report whether a transition is running or has failed.
- The engine calls the [callback endpoint](../../../Altinn.App.Api/Controllers/WorkflowEngineCallbackController.cs)
  in Altinn.App.Api for each step, and the
  [callback authentication](../../../Altinn.App.Api/Infrastructure/Authentication/WorkflowEngineCallbackAuthenticationHandler.cs)
  checks the token it sends.
- Service tasks run as steps. The [authoring guide](../../../../docs/service-task-pipelines.md) describes them for app
  developers. A channel that receives an external system's answer hands it to
  [`IServiceTaskReplyForwarder`](../../Features/Process/IServiceTaskReplyForwarder.cs), which delivers it to the
  mailbox the service task waits on.
- The models in `Models/` are the app's copies of the engine's wire contract.
  [The contract tests](../../../../../../Runtime/workflow-engine-app/tests/WorkflowEngine.App.Tests/Contract/README.md)
  keep them from drifting. App code reads its own twins of them in `Features/Process`, such as
  `MailboxClosedReason`, so that the app's vocabulary does not become part of a contract the engine owns.
- Locking a task's data types belongs to the workflow, so it is not on the public `IInstanceDataMutator`. A command
  that locks data uses the `InstanceDataUnitOfWork` that the callback restores.

The [integration tests](../../../../test/Altinn.App.Integration.Tests/WorkflowEngine) run the callbacks against a real
engine. Run them with `make ti filter=WorkflowEngine` from the backend folder.
