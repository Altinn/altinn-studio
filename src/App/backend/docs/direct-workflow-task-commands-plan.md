# Direct workflow commands from process tasks

This document records the ordinary-command refactor preserved on `feat/robust-signee-initialization`.
The experimental branch changes signing orchestration as described in
[Per-signee signing initialization](per-signee-signing-experiment.md).

Implementation plan and record, 2026-09-08. Starting point:
`feat/robust-signee-initialization` at `1f40300a3c`. The direct-command refactor is implemented on
this branch. The original implementation sequence is retained below, followed by verification results.

The remaining sections are the historical bulk-branch plan and its verification record, not a current-main
port checklist. References to instance leases, `SaveProcessStateToStorage`, bulk `NotifySignees`, and
the old instance-lock test scenario describe that earlier baseline. The experimental branch uses
`AcquireProcessingStatus`/`CommitProcessState`, sequential per-recipient notifications, and the
`ProcessNextConcurrencyTests` scenario; its validation results must be reported separately.

## Recommended API for this change

The priority is robust signing initialization with transparent retries and a small implementation
change. Keep the existing six signing command classes and the lifecycle declaration methods. Make
their references address ordinary workflow commands directly. Do not introduce a lifecycle pipeline
builder, method discovery, or a replacement service-pipeline implementation in this change.

The method-based builder discussed as an alternative has a real authoring benefit: the handlers can
live on the task class. However, a conditional `.Step(key, handler, payload)` declaration cannot also
be the only source of command registration. An already queued command must remain resolvable when
configuration changes and the current lifecycle definition would omit it. A sound method API needs
separate unconditional bindings and callback-scoped task resolution. Ordinary command classes
already provide this separation through DI, without another adapter or discovery mechanism.

The public reference remains a small value:

```csharp
public sealed record WorkflowCommandRef(string Key, string? Payload = null);
```

`IProcessTask` keeps `Type`, configuration validation, and these declarations, with empty defaults:

```csharp
IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) => [];
IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) => [];
IReadOnlyList<WorkflowCommandRef> GetAbandonCommands(string taskId) => [];
```

Use the existing ordinary `IWorkflowEngineCommand` execution contract and DI collection. Make its
context and result usable by app implementations, while keeping callback credentials, internal
state carry, and service coordination inaccessible through the public surface. Preserve the current
command defaults and ordinary callback machinery. The reference payload is opaque serialized input;
apps can use their own JSON DTOs and serialization metadata without registering types in Core.

Separate registration from workflow selection:

- Registration is independent of whether delegation is currently enabled. It maps a stable key to
  an executable command in the callback scope.
- Lifecycle selection uses normal conditionals, carries the explicit BPMN task ID in input, and
  fixes the ordered key/payload references when the workflow is enqueued.
- Retry/resume executes the persisted command. It never rebuilds the lifecycle list to find a
  handler, and does not infer task identity from a newly mutated current-task value.

Business commands retain their current files and implementations, grouped with the task type.
Command granularity follows useful persistence/retry boundaries, not individual helper methods.
No engine protocol, database, dashboard rendering, service-pipeline, or mailbox redesign is required.
Set both the actual app command key and the operation ID to the declared key so the normal dashboard
shows the operation's name. Repeated references still have separate engine step IDs.

A future explicitly registered method adapter or a thin fluent list builder can target the same
key/payload contract without changing persisted workflow shapes. Neither is a prerequisite for
this signing change. The implementation follows this target; the public API snapshot was reviewed
and updated for the intended command-contract changes.

## Intended behavior

`IProcessTask` keeps `GetStartCommands(taskId)`, `GetEndCommands(taskId)`, and
`GetAbandonCommands(taskId)`. Each returns an ordered list of ordinary workflow command keys and
payloads. The workflow builder appends those commands directly, using the existing command execution,
callback, data-save, retry, and resume machinery.

For delegated signing, the actual engine command keys become `ResolveSignees`,
`DelegateSigneeRights`, and `NotifySignees`. There is no outer `ExecuteProcessTaskCommand`, nested
command key, method-discovery mechanism, or lifecycle step index. The same command interface and DI
registration mechanism serve framework commands and commands implemented by service owners.

The engine service's app-command protocol already accepts a command key and opaque payload. Its
protocol and database schema should not need changes.

## Scope and compatibility

- Continue in the existing isolated worktree and `feat/robust-signee-initialization` branch. Keep
  the current commits as the reviewable starting point; do not rewrite the pushed branch history.
- Replace the lifecycle-command abstraction added by this branch. Preserve the signing recovery
  fixes and integration app already delivered.
- Existing service-task execution remains supported: simple `IServiceTask.Execute`, pipeline
  stages, deferral, mailboxes, and auto-advance retain their existing behavior.
- Service pipelines already use item indexes on the base branch. This plan introduces no new
  indexes and removes no existing service-pipeline indexes. Eliminating that separate mechanism
  would require a distinct design covering mailbox state, reply routing, and continuations.
- Do not preserve old workflow callback formats solely for preproduction workflows. Preserve
  compatibility with instances created before the workflow engine, including untagged signing
  state, signatures, and payment data.
- Customer source/API compatibility is separate from persisted workflow compatibility. Review
  the published API snapshot and identify which contracts have shipped before removing any
  customer-facing member. Do not add an alternate executor as a compatibility shortcut.

## Task inventory and required behavior

| Task type | Start | End | Abandon | Required behavior |
| --- | --- | --- | --- | --- |
| Data | Empty | Empty | Empty | Common initialization/finalization, hooks, and locking still run. |
| Confirmation | Empty | Empty | Empty | Preserve ordinary transition behavior and app task overrides. |
| Feedback | Empty | Empty | Empty | Empty declarations introduce no extra steps. |
| NullType | Empty | Empty | Empty | Preserve fallback for tasks without an Altinn type. |
| Payment | `CleanupPayment` | `CompletePayment` | `CleanupPayment` | Reuse one registered cleanup command in both phases; carry the correct BPMN task ID for every occurrence. |
| Signing | Conditional `ResolveSignees`, `DelegateSigneeRights`, `NotifySignees` | Conditional `GenerateSigningPdf`, then conditional `RevokeSigneeRights` | Always `AbortRuntimeDelegatedSigning` | Preserve delegated versus non-delegated behavior, command order, failure classification, and saved progress. |
| PDF service task | Inherited empty lifecycle | Inherited empty lifecycle | Inherited empty lifecycle | Existing service body generates/stores PDFs and auto-advances after successful persistence. |
| Subform PDF service task | Inherited empty lifecycle | Inherited empty lifecycle | Inherited empty lifecycle | Existing single service operation generates the configured subform PDFs. |
| eFormidling service task | Inherited empty lifecycle | Inherited empty lifecycle | Inherited empty lifecycle | Send and polling remain separate; polling owns its wait budget and cannot rerun a completed send. |
| Fiks Arkiv service task | Inherited empty lifecycle | Inherited empty lifecycle | Inherited empty lifecycle | Preserve mailbox minting, sending, acknowledgement handling, final replies, closure, and continuation workflows. |
| Customer task/service task | Customer command references | Customer command references | Customer command references | Discover registrations under `IProcessTask`, `IServiceTask`, and `IPipelineServiceTask` as appropriate; service tasks must not require an additional `IProcessTask` registration. |

Payment details that must survive conversion:

- Cleanup with no payment data succeeds. Paid payment data is retained. Skipped payment data is
  removed without contacting the processor. Other statuses call the configured processor before
  removing data; failed termination must not discard payment information.
- Completion requires payment data. Paid payments generate/update a task-tagged receipt. Skipped
  payments complete without a receipt. Missing data or an unfinished payment fails permanently.
- Payment commands currently inherit the engine defaults. Signing resolve has a two-minute
  execution timeout; delegation and notification have five-minute timeouts. Their exponential
  retry policy starts at two seconds, is capped at five minutes, and allows 50 retries.

Source audit anchors, relative to `src/App/backend`:

- `src/Altinn.App.Core/Internal/Process/ProcessTasks/PaymentProcessTask.cs`
- `src/Altinn.App.Core/Internal/Process/ProcessTasks/Payment/`
- `src/Altinn.App.Core/Internal/Process/ProcessTasks/SigningProcessTask.cs`
- `src/Altinn.App.Core/Internal/Process/ProcessTasks/Signing/`
- `src/Altinn.App.Core/Internal/Process/ProcessTasks/ServiceTasks/`
- `src/Altinn.App.Clients.Fiks/FiksArkiv/FiksArkivServiceTask.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/WorkflowCommandSet.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/ProcessNextRequestFactory.cs`

## Implementation sequence

### 1. Establish the common public command contract

Owner: primary model. This is the prerequisite for all mechanical conversion work.

Promote/refine the existing `IWorkflowEngineCommand` contract for app implementations. Use one
command interface, one command execution context, and one command result model. Keep changes to
existing names and internal command implementations small. A new public generic command hierarchy
is not required.

The public execution surface needs instance-data access, the explicit task ID where applicable,
workflow/step IDs, cancellation, and the command's declared payload. Internal callback credentials,
lock bookkeeping, state signing, and mailbox continuation details remain internal members or
internal collaborators. Lifecycle success/failure must not accidentally acquire service-task
auto-advance or mailbox continuation behavior.

Introduce `WorkflowCommandRef(string Key, string? Payload = null)` and pass its serialized input
through unchanged. The existing serializer's closed list of internal payload types can remain
internal; customer payloads do not need to derive from its base type or enter Core's source-generated
JSON context. Customers can serialize their own DTOs with `JsonSerializer` and their own metadata.
A small serialization convenience helper is optional; do not build a global payload type registry.
Commands deserialize input using their expected DTO, never a CLR type name supplied in the payload.
For built-in commands, centralize decoding of the small task-ID payload and return a permanent
invalid-input result before doing any business work. Apply the same rule in the customer example:
malformed payloads and missing required input must fail permanently, and valid optional/null payloads
need an explicit test too. Preserve existing internal command serialization behavior.

For signing/payment, initially carry the BPMN task ID and let the command read the current task
configuration, as it does today. Do not accidentally freeze all configuration into the payload:
correcting configuration and resuming a failed workflow must remain useful. Explicit customer
payload values are persisted and remain unchanged across retries/resume.

Prove the contract with a small app-assembly implementation, registered through the normal command
interface, using its own serialized payload DTO and a scoped dependency. Test invocation, payload round trip,
data save, retryable/permanent results, and scope disposal. Freeze the signatures and provide one
working converted command as the reference before delegating conversions.

Primary files: `Commands/_Base/IWorkflowEngineCommand.cs`, command context/result/base and payload
serialization files, `Features/Process/ProcessTaskCommandRef.cs`, and public API tests.

### 2. Use ordinary command resolution safely

Owner: primary model, independently reviewed.

- Resolve app commands through `AppImplementationFactory` in the callback/request scope. Mark the
  common interface as app-implementable and satisfy the existing internal analyzer's resolution rules.
- Fix `ProcessStepOptionsResolver`: it is currently a singleton whose constructor consumes every
  `IWorkflowEngineCommand`. That assumes internal command dependencies can be resolved there and
  is unsuitable for arbitrary scoped customer commands. Resolve command defaults in the proper
  scope; its current consumers are transient, so prefer a scoped resolver over a new metadata cache.
- Validate registrations after the application's full DI configuration is available. The current
  command validator runs while library services are registered and inspects static `Key` properties;
  it cannot be the sole validation mechanism for later customer/factory registrations.
- Reject conflicting registrations, empty keys, and unresolved declared references. Preserve task
  override precedence. One registered command may be referenced repeatedly, across multiple
  phases and BPMN tasks; those occurrences are separate workflow steps, not duplicate registrations.
- Mark internal coordination commands unavailable for task lifecycle declarations and validate
  their placement. Commands such as `SaveProcessStateToStorage`, `MutateProcessState`,
  `ExecuteServiceTask`, `MintMailbox`, and `EnqueueSideEffectsWorkflow` belong in framework-controlled
  positions. A resolving key alone must not allow a lifecycle declaration to commit or advance the
  process out of order. Enforce this within the ordinary command model, without another interface
  or executor. Test rejection of a reserved coordination key and acceptance of `CleanupPayment`
  reused on start and abandon. This prevents invalid composition; it is not a sandbox for app code.
- Preserve cancellation propagation, exception classification, and service-owner authorization
  diagnostics. Do not lose the wrapper executor's behavior when deleting it.

Use the existing DI command model; no task-method discovery or automatic registry population is
needed for this design.

### 3. Flatten lifecycle references directly into workflow steps

Owner: primary model.

- Update `IProcessTask` lifecycle declaration return types and the factory/context plumbing.
- Change `WorkflowCommandSet.AddTaskCommands` to create a normal command from each returned key
  and payload. Both the wire `commandKey` and normal operation identity should identify the real
  command. Preserve explicit per-command options without nested-key routing.
- Remove `StepRequest.TaskCommandKey` and its special branch in the options resolver.
- Carry the explicit BPMN task ID to the command. Do not depend on an incidental current-task
  value when a transition includes work for both the leaving and entering task.
- Preserve ordering: source end/abandon work; in-memory process mutation; target start work;
  process-state save; critical service-body execution. Start work remains after unlock, generated
  data cleanup, starting hooks, and common initialization. End work remains before common
  finalization, ending hooks, and locking. Abandon work remains before the abandon hook.
- Add extraction tests for every task type, empty declarations, multiple configured tasks of the
  same type, and repeated command keys with different payloads. Assert actual serialized command
  keys, not only display names or mocked invocation counts.
- Add a regression where a command was selected before a configuration change and the new lifecycle
  list would omit it. The saved key must still resolve and execute its handler under the current
  configuration. Resume must not reconstruct the list to dispatch the saved step.

### 4. Convert the eight signing/payment commands

Owner: cheaper model for mechanical edits after phases 1-3; primary model reviews semantics.

Convert the six signing commands and two payment commands to the ordinary command contract.
Move their registrations to the normal command collection, translating their result/context and
default-option usage according to the reference conversion. Update declaration and focused command
tests. Keep business behavior, error messages/classification, task tags, and retry policies intact.

Preserve the existing signing fixes: saved-signee adoption after a lost response, independent
delegation/notification checkpoints, notification idempotency, task-reference preservation during
Storage updates, abort metadata refresh, and successful completion responses after access revocation.

Payment needs more than a rename to establish retry safety. Current cleanup reads payment data
from the incoming state, and receipt upsert checks that state's metadata. A response lost after
Storage deletion/insertion can replay older state. Add reproductions for those windows before
claiming payment replay is safe. If they fail, apply narrowly scoped metadata reconciliation and
receipt adoption, preserving already-paid data and the ordering of processor calls and deletion.
Do not replace the entire callback state with a fresh Storage instance: the workflow may carry an
in-memory process transition that Storage has not committed yet.

Repeated external payment termination is a separate boundary. The Nets client currently reports
HTTP success as a boolean. Test the app's handling of response loss and processor failure; do not
assume every provider treats repeated termination identically or reinterpret arbitrary failures as
successful cancellation.

### 5. Update fixtures and add missing integration coverage

Owners: cheaper model for fixture/scenario scaffolding; primary model for fault injection and assertions.

Adapt the delegated-signing app's retry decorator and callback observations to actual ordinary
command keys. Preserve all eight initialization cases and four pre-engine instance cases. Adapt
shared tracing commands and the instance-lock scenario to the common public contract.

Add a payment scenario/app using the current `AppFixture` approach, real workflow execution and
localtest Storage, with controlled payment-processor responses. Cover start cleanup, abandon
cleanup, skipped/paid/unpaid states, failed termination retaining data, permanent completion failure,
receipt generation, and the two lost-response windows above. Do not contact a real payment provider.

Add customer extension coverage using classes compiled in the test app assembly:

- Custom `IProcessTask` with ordinary commands, app-owned typed payload, and a scoped dependency.
- Custom `IServiceTask` declaring lifecycle commands and using its existing `Execute` body.
- Custom `IPipelineServiceTask` declaring lifecycle commands and using a multi-stage body.
- Lifecycle order, per-step data visibility, independent retries, preserved payloads, and service body
  execution after commit. Include task registration solely under each supported service interface.

Keep PDF, Subform PDF, eFormidling, Fiks, pipeline, and mailbox implementations on their current
execution path. Run their existing tests to verify that public context/result and command-resolution
changes have not altered deferral, continuation state, reply correlation, or auto-advance.

### 6. Remove the superseded layer and update documentation

Owners: cheaper model for bounded removals and documentation; primary model approves snapshots.

Delete `IProcessTaskCommand` and its context/result types, `ProcessTaskCommandExecutor`,
`ExecuteProcessTaskCommand` and its payload/serialization registration, obsolete registrations,
and the nested task-command options plumbing. Replace `ProcessTaskCommandRef` with the common
reference type. Search all consumers, including shared integration sources and documentation.

Update workflow guidance, customer command authoring examples, integration-test instructions,
API snapshots, and any affected telemetry snapshots. Review generated diffs explicitly; never accept
all received snapshots merely to make tests pass. Keep user-visible signing failure codes stable.

Document command names as persisted identifiers, small payload requirements, retry idempotency,
and the separate requirement for service-owner write access during callbacks.

### 7. Verify and deliver

Owner: primary model coordinates one test run per required suite after changes settle.

- Build `solutions/All.slnx` with `TF_BUILD=true` so formatting/snapshot behavior matches CI.
- Run Core, API, Fiks client, and affected analyzer/source-generator tests. Include the public API
  snapshot with CI behavior enabled.
- Run the signing, new payment/customer-extension, instance-lock, and existing workflow integration
  scenarios (PDF, eFormidling, pipelines, hooks, failure/resume, generated-data cleanup, side effects,
  single/multiple mailbox exchanges, and manual advancement).
- Use an isolated studioctl runtime with current images. The user's default runtime must remain
  untouched. The harness supports an external studioctl command and localtest/PDF host-port
  overrides; unique containers/networks/volumes still need to be configured for that environment.
  Run integration suites serially when they share fixture-generated app IDs and package caches.
- Check CSharpier, spelling through the repository harness, guidance validation, and `git diff --check`.
- Review that actual engine commands use signing/payment keys, the extra layer is gone, all
  pre-engine instance tests pass, and no test calls a real payment or correspondence service.
- Produce focused commits on the existing `feat/` branch, report any remaining verification limits,
  and push the completed refactor under the user's existing branch-push authorization.

## Implementation and verification record

- Lifecycle references now become ordinary workflow steps with their own command key, operation ID,
  raw payload and stable step ID. The task-command wrapper, registry and executor are removed.
- The public command interface supports app-owned DTOs and scoped/factory registrations. Startup
  validation checks the complete registry and rejects duplicate, missing or URI-unsafe command keys.
- Payment cleanup and receipt generation reconcile their Storage metadata after lost responses.
  Signing PDF generation uses the same targeted reconciliation. Tests preserve the virtual process
  and unrelated carried data while reusing the saved document ID.
- The `workflow-commands` test app includes a separate `WorkflowCommandCustomer` assembly without
  friend access. It exercises custom process/service tasks, repeated command keys with different
  payloads, conditional declarations, persistence, scope disposal, retries and resume. Its payment
  scenario uses the real engine and Storage with a deterministic payment processor and PDF service.
- Full solution build passes. Core: 3,689 passed, 2 skipped. API: 525 passed, 1 skipped. Fiks: 208
  passed. Analyzers: 71 passed across the suite and focused snapshot recheck. Source generators:
  48 unit tests and 128 integration tests passed. Snapshots ran with `TF_BUILD=true`; only the
  intended public API change and shifted analyzer source locations were accepted.
- Live signing, payment, customer-command, instance-lock and workflow suites: 46 passed across the
  broad run and the corrected instance-lock fixture rerun. This includes all 17 new customer/payment
  cases, existing pre-engine signing instances, service pipelines, PDFs, hooks, failure/resume,
  eFormidling, side effects and single/multiple mailbox exchanges. The payment tests first reproduced
  two failed cleanups and a duplicate receipt, then passed with the reconciliation fixes.
- CSharpier checked 1,575 files. Spelling, guidance validation and diff whitespace checks pass.
  Verification used an isolated runtime and preserved the user's existing runtime.

External payment/correspondence providers are controlled in these tests; their production-side
idempotency guarantees are not established by this suite. Reconciliation preserves existing failure
classification and does not treat an unknown external result as success.

## Model allocation and parallel work

Use the primary model for public contracts, payload serialization, scope/lifetime changes, execution
semantics, payment/signing recovery fixes, and final review. Use `gpt-5.6-luna` for bounded mechanical
work once a compiled example and the shared signatures are fixed. Luna already performed the
read-only task/payment inventory for this plan; the primary model checked the payment findings.

| Work package | Model | Prerequisite | Ownership boundary | Acceptance |
| --- | --- | --- | --- | --- |
| Common API, serialization, dispatch, options, startup validation | Primary | Source audit | Shared Core/API infrastructure | App-assembly payload/scoped-command proof passes. |
| Signing command conversions | Luna | Frozen API and reference conversion | Six signing command files and their focused tests | Mechanical diff preserves behavior; primary reviews retries and failure mapping. |
| Payment command conversions | Luna | Frozen API and reference conversion | Two payment commands and focused tests | Existing state matrix passes; replay fixes remain primary-owned. |
| Integration fixture migration and new app scaffolding | Luna | Frozen API and scenario specifications | Shared test-app sources, decorators, registrations, new scenario skeleton | Builds and emits real command keys; primary supplies/reviews behavioral assertions. |
| Documentation, stale references, formatting | Luna | Implementation stable | Specified docs and leftover references only | Searches/checks pass; no blanket snapshot acceptance. |
| Recovery behavior, integration verdict, security/API review | Primary | Parallel edits integrated | Cross-cutting review and targeted fixes | All required cases pass with clear evidence. |

With four total agent slots, use one coordinating primary and at most three agents with disjoint file
ownership. Do not have agents edit shared contracts or run competing builds in the shared directory.
Batch test runs after parallel edits converge. Each mechanical assignment should include exact files,
the reference implementation, fixed signatures, invariants, and its required checks. Escalate a task
when it needs a semantic decision rather than letting a cheaper worker redesign the API.

Use fresh, small subtask context rather than copying this whole conversation into every mechanical
assignment. These are execution choices using the models available in this session, not an estimate
of monetary savings. Explicit delegation and calibrated test scope are consistent with the
[official OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model).

## Completion criteria

- Signing and payment lifecycle work appears as ordinary named engine commands with their own payloads.
- Each declared occurrence remains a separate durable step with its own engine step ID.
- No second task-command interface, executor, wrapper payload, or lifecycle index system remains.
- Custom tasks and both service-task interfaces can declare and run customer-owned ordinary commands.
- All task-specific conditions, hook/lock ordering, task tags, retry policies, and service-body semantics
  listed above are covered by passing tests.
- Pre-engine signing/payment instances remain usable; required recovery tests do not duplicate messages
  or receipts, discard paid data, or strand a completed transition after rights are revoked.
- Payload and DI behavior is proven from outside the Core assembly, not only by internal test access.
