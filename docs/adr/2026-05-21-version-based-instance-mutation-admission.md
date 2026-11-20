# Use version-based admission for instance mutations

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 2026-05-21

## Result

This ADR resolves two related subdecisions:

- **Blob upload coordination**: blob uploads use Storage-owned references to immutable data element content, so a new upload writes to a new content version that does not become current until the database commits the data element update. The mechanism is defined in [Use Storage-owned references to immutable data element content](./2026-05-20-immutable-data-element-blob-references.md).
- **Mutation admission**: Storage and app-lib use scoped version-based admission for Storage-visible instance mutations.

Storage should expose versions with scopes that match the mutation being guarded. Workflow-owned aggregate mutations need a broad instance-level stale-writer fence, together with a transition-in-progress marker and idempotent aggregate saves. Task-bound mutations need an admission fence for relevant instance state, not necessarily only process state. Data element mutations need a narrower data element or content-version fence, so concurrent updates to different data elements do not unnecessarily reject each other.

The exact names of these versions are deferred. The important decision is that each version must describe the conflict scope it guards, and should not imply a narrower scope than the version actually has. Each version must change on every guarded mutation and must not be reused for the same scope, so a precondition cannot pass again after the guarded state has changed and later returned to an earlier value. A monotonic per-scope counter is a possible implementation, but the design does not rely on ordering between versions.

The existing instance lock concept should not be part of the correctness model for workflow-owned process transitions. The workflow engine should serialize transition workflows for the same instance, while version preconditions and transition ownership reject stale or unexpected writes.

Storage should not use an in-flight upload table or a PostgreSQL row lock during blob upload as the blob upload coordination mechanism for this design. Storage should not make the existing instance lock the primary mutation-admission mechanism, neither by rejecting on lock contention nor by waiting for the lock.

## Problem context

Several classes of race conditions can affect an instance:

- Workflow transitions need ownership of an instance while the process moves from one task to another. Mutations not caused by that workflow should not be able to change workflow-relevant state during the transition.
- Some non-workflow operations perform load-modify-save on data. If two requests load the same blob, apply different changes, and then save full replacement content, the last save can overwrite the earlier change.
- The frontend can hold a local copy of instance and data state. If that copy is stale, the user can unintentionally submit changes based on outdated process or data state.
- Slow requests, especially file uploads, can start while a task is still open but finish after a process transition has started or completed.

Current mitigations are partial:

- Workflow code currently uses instance locking while moving the process, but this does not by itself block all non-workflow actions.
- PATCH requests send only relevant changes instead of a full frontend copy of the model, and PATCH responses return updated data and instance state so the frontend can resync.
- App-lib tries to keep load-modify-save sequences inside one request, which reduces the race window but does not make concurrent requests safe.
- There is no general Storage-side guard that prevents a slow upload started in one task from becoming current after the instance has moved on.

## Decision drivers

- B1: Workflow-owned transitions must reject stale or zombie workflow updates.
- B2: Task-bound user writes must not be committed if they can't be completed before the process starts transitioning out of the task.
- B3: Load-modify-save operations must not silently lose concurrent changes to the same data element or instance metadata.
- B4: Independent mutations, such as concurrent updates to different data elements, should not conflict unnecessarily.
- B5: The solution should avoid long-lived database transactions and row locks around blob uploads.
- B6: The solution should reduce deadlock potential and broad lock contention.
- B7: The solution should support safe retries after ambiguous failures.
- B8: The solution should try to avoid relying on timeout expiry for correctness.
- B9: The implementation should be efficient and practical to introduce incrementally.

## Subdecisions

This ADR combines two related decisions that solve different parts of the problem.

Blob upload coordination decides how Storage handles the slow blob-upload step so that a slow upload cannot interact badly with concurrent mutations or process state changes. The alternatives differ in approach: decouple the upload from the commit so rejected uploads simply don't become current (U1), gate conflicting operations via an in-flight tracking table (U2), or serialize uploads with a database row lock (U3). The chosen answer is U1, immutable data element content references, as described in [Use Storage-owned references to immutable data element content](./2026-05-20-immutable-data-element-blob-references.md).

Mutation admission decides whether a Storage-visible mutation may commit. The alternatives differ in approach: expose versions that callers use as preconditions at commit time (M1), or serialize relevant mutations through the existing instance lock, either rejecting on contention (M2) or waiting briefly for the lock (M3). The chosen answer is M1, scoped version-based admission.

Alternatives for the first subdecision are prefixed `U`, and alternatives for the second `M`.

## Alternatives considered

### Blob upload coordination

- U1: Use immutable data element content references for upload staging.
- U2: Track in-flight uploads in a table with expiry.
- U3: Hold a PostgreSQL row lock on the instance while uploading blob content.

### Mutation admission

- M1: Use scoped version-based mutation admission.
- M2: Serialize relevant mutations through the instance lock, rejecting on contention.
- M3: Serialize relevant mutations through the instance lock, waiting briefly on contention.

## Alternative descriptions

### U1: Use immutable data element content references for upload staging

Blob uploads rely on immutable data element content references. A new upload writes to a new content version before the database update. If the later database transaction rejects the mutation because a version precondition no longer matches, the newly uploaded content never becomes current and can be deleted immediately or cleaned up later.

### U2: Track in-flight uploads in a table with expiry

Before Storage starts a blob upload, it records that an upload is in flight for the instance, or possibly for a more specific resource. Operations that need a stable instance state, such as process transitions, check this table before committing. If there are active uploads that could conflict with the operation, the operation is rejected or delayed.

When the upload finishes, Storage removes the in-flight row. The row has an expiry so abandoned rows do not block the instance forever if Storage crashes or fails before cleanup.

### U3: Hold a PostgreSQL row lock on the instance while uploading blob content

Storage opens a database transaction and locks the instance row before starting the blob upload. The lock is held until the upload has completed and Storage has committed or rejected the corresponding database update.

This makes the database row lock the serialization mechanism for conflicting instance mutations during uploads. Other updates that need the same instance row must wait or fail while the upload transaction is open.

### M1: Use scoped version-based mutation admission

Storage exposes versions that callers can use as preconditions when committing mutations. The versions have scopes that match the state the operation depends on. Workflow-owned aggregate saves use a broad instance-level version to detect stale or zombie workflows. Task-bound writes use an admission version for relevant instance state. Data element writes use a data element or content-version fence so updates to different data elements do not conflict unnecessarily.

Workflow execution for the same instance is serialized by the workflow engine. The existing instance lock is therefore not needed to prevent concurrent process/next executions in this alternative. Storage still needs version checks because they protect the commit boundary and detect stale or unexpected writes, including writes that do not originate from a concurrent process/next execution.

Idempotency keys are only needed for writes that use the broad instance-level version as their precondition, such as workflow-owned aggregate saves. Storage only needs to support replay of the latest successful update from the submitted previous version to the current version. If idempotency key `K` consumed broad instance-level version `X` and produced current version `Y`, a retry of `K` with expected version `X` can return or reconstruct the current result while `Y` is still current. Storage should not compare the retry request content with the original request content for this replay decision. The idempotency key identifies the logical workflow save, and the already committed Storage result is authoritative. If a retry has regenerated different staged artifacts, such as a slightly different PDF, Storage should still return the result from the first committed save; the new artifacts remain unreferenced and can be cleaned up. If the broad instance-level version is neither `X` nor `Y`, the retry must fail as stale or conflicted. Storage does not need to keep enough historical information to recreate older responses after later broad instance-level updates have committed.

This alternative assumes U1 for blob upload staging. Version checks handle the database commit boundary; immutable content references make rejected post-upload commits safe.

### M2: Serialize relevant mutations through the instance lock, rejecting on contention

Relevant instance mutations acquire the existing instance lock before doing their work and release it after committing, so at most one runs for an instance at a time. The lock is held for the request's processing duration, including any blob upload. If a request finds the lock already held, it fails immediately with a conflict, and the caller resyncs and retries. The lock has an expiry or TTL so it can recover if the holder crashes.

### M3: Serialize relevant mutations through the instance lock, waiting briefly on contention

This is the same as M2 — relevant mutations serialize through the existing instance lock — except that a request which finds the lock held waits a short, bounded time (a few seconds) for it to free up, and only fails with a conflict if the wait expires.

Because most requests are quick, the wait is usually short, so a second request that arrives during another's brief hold usually proceeds as soon as the lock frees, instead of bouncing back as a conflict for the caller to retry. A slow request, such as a large upload or a process/next execution, holds the lock longer, so others wait and then time out into a conflict. The wait timeout is a liveness bound, not a correctness boundary; the instance lock and its TTL provide the actual mutual exclusion and crash recovery.

## Pros and cons

### U1: Use immutable data element content references for upload staging

- Good, because it supports B2 and B3. Rejected post-upload commits do not make uploaded content current, so stale task-bound writes and stale data writes can be rejected at the database commit boundary.
- Good, because it supports B5. Blob uploads can happen outside database transactions and without holding a database row lock.
- Good, because it supports B8. Correctness depends on committed database references, not timeout expiry.
- Bad, because rejected writes may already have uploaded a new content version. That uploaded content must either be deleted immediately or left for cleanup as an unreferenced content version.

### U2: Track in-flight uploads in a table with expiry

- Good, because it directly models the slow-upload problem. A process transition can check for active uploads and reject or delay the transition while an upload is in flight.
- Good, because it avoids holding a PostgreSQL row lock or transaction open during the blob upload.
- Bad, because abandoned upload rows require expiry-based recovery. Until the row expires, valid operations may be blocked even though no upload is actually still running.
- Bad, because it adds a second transactional admission protocol. Starting an upload must atomically register the in-flight row and check the relevant transition or instance state, and transition start must atomically check the same scoped in-flight rows.
- Bad, because scoped in-flight rows must duplicate the conflict-scope model used by mutation admission. If the scopes are too broad, Storage blocks unrelated work. If they are too narrow or drift from the mutation-admission scopes, Storage can miss a conflicting upload.
- Bad, because it does not support B8. A timeout is a recovery heuristic, not a correctness boundary. If the timeout is too long, valid work is blocked unnecessarily. If it is too short, a still-running upload may be ignored.

### U3: Hold a PostgreSQL row lock on the instance while uploading blob content

- Good, because it is conceptually simple. The database row lock serializes conflicting instance mutations while the upload is in progress.
- Good, because it does not rely on timeout expiry for correctness. If the process or connection dies, PostgreSQL releases the transaction lock.
- Bad, because it does not support B5. Uploading to blob storage is a remote operation, and holding a database transaction open during that operation ties database locks and connections to upload duration.
- Bad, because it weakens B4 and B6. A row lock on the instance blocks broad categories of updates, including updates to unrelated data elements that might otherwise be safe to perform concurrently.
- Bad, because it scales poorly for large or slow uploads. The current Storage API allows large request bodies, so upload duration is not bounded tightly enough to make long-lived row locks a safe default.

### M1: Use scoped version-based mutation admission

- Good, because it supports B1. A broad instance-level version lets workflow aggregate saves fail when another workflow-relevant mutation has already changed the instance.
- Good, because it supports B2. An instance-state admission version and transition-in-progress marker let task-bound writes fail once transition out of the task has started, or after another relevant instance-state change has made the caller's view stale.
- Good, because it supports B3. PATCH requests, actions, and `altinnRowId` initialization can submit the data element or content version they loaded from. If another write to the same data element commits first, Storage rejects the stale metadata update instead of letting it overwrite the newer content.
- Good, because it supports B4. Data writes can use a data element scoped fence instead of a broad instance version, so concurrent updates to different data elements can both succeed.
- Good, because it supports B6. Scoped version checks avoid broad lock contention and allow independent mutations to proceed concurrently.
- Good, because it supports B7. Idempotency keys and current-version checks can distinguish safe retries from stale retries after ambiguous workflow save failures.
- Good, because it supports B8. Correctness depends on committed versions and explicit preconditions, not on an in-flight row expiring at the right time.
- Bad, because it introduces multiple concurrency concepts: broad instance-level versions, instance-state admission versions, data element or content versions, transition ownership, and idempotency for workflow saves.
- Bad, because callers must use the correct admission fence for their operation and handle conflict responses by resyncing or retrying when appropriate.
- Bad, because it depends on U1 for safe post-upload rejection. Without immutable content references, rejecting a metadata commit after upload could still expose overwritten blob content.

### M2: Serialize relevant mutations through the instance lock, rejecting on contention

- Good, because it reuses the existing instance lock concept instead of introducing several version scopes.
- Bad, because it does not support B4 or B6. An instance-scoped lock serializes independent mutations, including writes to different data elements that could safely proceed concurrently.
- Bad, because it weakens B5 when a request includes a slow upload or other slow work, since the lock is held for that duration and other instance mutations are rejected meanwhile.
- Bad, because it weakens B7 and B8. A lock expiry or TTL is needed for crash recovery, and valid work may wait for a stale lock to expire.
- Bad, because the lock rejects on any contention, not just real conflicts, so concurrent requests to the same instance — even to different data elements — return a conflict the caller must retry, adding round-trips under load.
- Bad, because idempotent replay for workflow aggregate saves would still need a separate mechanism. The lock serializes execution but does not by itself distinguish a safe replay from a stale update.

### M3: Serialize relevant mutations through the instance lock, waiting briefly on contention

M3 has the same pros and cons as M2, with these differences:

- Good, because a short bounded wait absorbs brief contention server-side, so quick concurrent requests usually succeed on the first attempt instead of bouncing back as conflicts to retry, reducing the round-trips M2 incurs under load.
- Bad, because a request that waits holds a connection or worker while blocked, so contention from slow requests can tie up resources until the wait times out.

## Decision rationale

The decision favors U1 and M1 because blob upload coordination and mutation admission are separate problems. Immutable content references solve the blob upload coordination problem without long-lived transactions, timeout-based in-flight rows, or overwritten blob paths. Scoped version-based admission solves the mutation admission problem without long-lived database locks or relying on timeout expiry.

The race conditions are not all lock-shaped, and not all conflicts have the same scope. Workflow transitions need broad stale-writer detection and safe retry semantics. Task-bound writes need admission based on relevant instance state (which may include but is not limited to process state). Load-modify-save operations need a stale-write fence at the data element commit boundary. Slow uploads need to be prevented from becoming current after the task state has moved on.

Version-based admission handles the commit boundary directly: a write is accepted only if the state in the relevant conflict scope still matches the version the caller based its work on. If a slow upload finishes after a process transition has advanced the relevant instance-state admission version, the metadata update can be rejected and the uploaded content can remain unreferenced. If two PATCH requests modify the same data element from the same original content, the first committed update changes the relevant data element or content version, and the second update is rejected instead of overwriting the first. If two requests update different data elements, they should not have to compete on the same broad instance version unless the operation also depends on broader instance state.

## Consequences

- Storage needs versions that change on every guarded mutation and are never reused per scope, usable as mutation preconditions and returned to clients. The exact names and representation are deferred.
- At least two conflict scopes are expected: a broad instance-level scope for workflow aggregate saves and a narrower data element or content scope for data writes.
- A separate instance-state admission scope may be needed for task-bound writes. It should not be named as if it only represents process state if it is also bumped by other mutation-relevant instance-state changes.
- The existing instance lock should not be required for workflow-owned process transition correctness when workflow execution is serialized per instance.
- Storage needs immutable data element content references, so rejected updates do not expose uploaded-but-uncommitted content as current.
- Workflow-owned saves need an aggregate, idempotent save path that validates the current broad instance-level version and returns the updated instance snapshot and new version.
- Idempotency records are only needed for broad instance-level versioned writes, and only need to support replay while the version produced by the original request is still current.
- Idempotency replay for workflow-owned aggregate saves should not depend on request content matching. The committed Storage result for the idempotency key and previous version is authoritative.
- Task-bound user writes need to include enough instance-state admission information to fail once the instance is no longer in the expected task, transition has started, or another relevant instance-state change has made the caller's view stale.
- App-lib PATCH requests, actions, and `altinnRowId` initialization need to pass the relevant version preconditions and handle stale-write rejections.
- Frontend clients should continue to send deltas and resync from responses so stale local state does not overwrite unrelated changes.
- Timeout-based locks or in-flight rows should not be the primary correctness mechanism for Storage mutation admission.
