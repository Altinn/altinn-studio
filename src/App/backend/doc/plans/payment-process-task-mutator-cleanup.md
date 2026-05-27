# Payment Process Task Mutator Cleanup

## Problem

`PaymentProcessTask.End(...)` now writes the generated receipt through `IInstanceDataMutator`, but `Start(...)` and `Abandon(...)` still call into `IPaymentService.CancelAndDeleteAnyExistingPayment(...)`.

That service path deletes payment data through `IDataService`, which means workflow-engine-owned cleanup still bypasses the mutator and storage batching model.

## Target State

- `PaymentProcessTask` owns its task lifecycle mutations through `IInstanceDataMutator`
- Task-owned payment cleanup happens in the same unit of work as the rest of the workflow-engine step
- `IPaymentService` can still support direct controller/user-action flows, but process-task cleanup must not depend on direct storage writes

## Proposed Changes

### 1. Move task cleanup logic into `PaymentProcessTask`

Add private helpers in `PaymentProcessTask` that:

- find the current task's payment data element
- inspect whether payment data exists
- terminate the active payment with the payment processor when needed
- remove the payment data element through `IInstanceDataMutator`

The task should decide cleanup based on task-owned data, not by calling a direct-write service wrapper.

### 2. Keep `IPaymentService` focused on direct flows

Leave `IPaymentService` in place for:

- payment startup from request-driven flows
- payment status checks
- webhook handling

But stop using `CancelAndDeleteAnyExistingPayment(...)` from workflow-engine task code.

### 3. Reuse processor lookup logic without duplicating too much behavior

If needed, extract a narrow helper so `PaymentProcessTask` can:

- load payment info
- resolve the configured payment processor
- call `TerminatePayment(...)`

without pulling the full `IDataService` write path along with it.

## Affected Areas

- `src/Altinn.App.Core/Internal/Process/ProcessTasks/PaymentProcessTask.cs`
- `src/Altinn.App.Core/Features/Payment/Services/IPaymentService.cs`
- `src/Altinn.App.Core/Features/Payment/Services/PaymentService.cs`
- payment process task tests

## Test Plan

- unit tests for `PaymentProcessTask.Start(...)`
  - removes stale unpaid payment data through the mutator
  - does not delete already-paid payment data
  - terminates processor payment before removing local state
- unit tests for `PaymentProcessTask.Abandon(...)`
  - same cleanup semantics as start
- confirm `PaymentProcessTask.End(...)` still updates/adds receipt PDF through the mutator

## Definition of Done

- no workflow-engine-owned payment cleanup path performs direct storage deletes
- payment task tests pass
- relevant Core/API/integration slices still pass

