## Refactoring and chore list

### Data model / misc
- [x] Remove concurrency rules and associated stored procedure. Nested process/next is now disallowed, replaced by server-side "waiting" for async operations.
  - [x] Stored procedure can be removed: [check_active_workflow_constraint.sql](src/WorkflowEngine.Data/Sql/Functions/check_active_workflow_constraint.sql).
    - [x] Remove `EnginePgRepository.CheckActiveWorkflowConstraint` and all references to it.
  - [x] [WorkflowType](src/WorkflowEngine.Models/WorkflowType.cs) and [ConcurrencyPolicy](src/WorkflowEngine.Models/ConcurrencyPolicy.cs) can be removed.
- [x] Cascading failures will be handled by the engine organically, the stored procedure should be removed: [cascade_dependency_failures.sql](src/WorkflowEngine.Data/Sql/Functions/cascade_dependency_failures.sql)
  - [x] Remove `EnginePgRepository.CascadeDependencyFailures` and all references to it.
- [x] Remove [ConcurrentBuffer](src/WorkflowEngine.Api/ConcurrentBuffer.cs) and its usages.
  - [x] This includes removing the whole Engine.ShouldRun concept.
- [x] Remove the `Engine.HaveWork` check. This is now replaced by the result of the db query.
- [ ] Add a timestamp to the `Workflow`, which is used to determine if a workflow is "stuck" in a processing state (worker has crashed)
  - Worker will be required to update this column periodically.
  - The engine will consume stale workflows eventually, even if they are in a `processing` state.
    - Suggested timeout for stale workflows: 10 seconds. Eg. the worker needs a < 10 second update cycle back to the db.
- Remove most of the `ILogger` logging? We can use Grafana for almost all of this...
- [ ] Rename TraceContext to DistributedTraceId, to coexist with EngineTraceId.
- Use the EngineTraceId to rebuild the context in the event we're picking up a failed workflow.

- Update and improve Grafana dashboards.

### [Repository](src/WorkflowEngine.Data/Repository/EnginePgRepository.cs)
- [ ] It doesn't make sense that `GetFinishedWorkflows` takes a list of statuses to check. This method should know what the relevant statuses are.
- [ ] It doesn't make sense that `GetFinishedWorkflowsWithCount` takes a list of statuses to check. This method should know what the relevant statuses are.

#### Tests
- [x] `GetSuccessfulWorkflows` is currently not covered.
- [x] `ToDomainModel<Step>` is currently not covered.
- [x] `GetDistinctOrgsAndApps` is currently not covered.
- [x] `GetWorkflow by idempotency key` may or may not be required. If keeping it, it also needs testing.
- [x] `GetFinishedWorkflowsWithCount` is currently not covered.
- [x] `RetryErrorHandler` is currently not covered, because we never trigger a database communication failure during testing.

### [Telemetry and health collectors](src/WorkflowEngine.Api)
- [ ] `HealthEngineChecks` and `MetricsCollector` should use their own separate db-concurrency mechanism, disconnected from the API and workflow processing.

#### Tests
- [x] Add collection of telemetry during testing. We have good coverage, but are never checking that we emit events. This is probably best done in the `Integration.Tests` project.


### [Resilience](src/WorkflowEngine.Resilience)
#### Tests
- [x] Expand on [RetryStrategyExtensionsTests](tests/WorkflowEngine.Resilience.Tests/Extensions/RetryStrategyExtensionsTests.cs) to cover all possible failure scenarios in `Execute`.
