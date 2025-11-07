# Instance locking for mutating process operations

- Status: Proposed
- Deciders: Team Altinn Studio, squad flyt
- Date: 03.11.2025

## Result

A2: PostgreSQL lock table

## Problem context

We have had several nasty race condition based bugs, where simultaneous mutating requests conflict with each other and modify instance state in parallel, causing various issues and invalid states. We want to introduce a lock system, such that only one mutating request to the application will be processed at once. For now, we limit the scope to handle requests to /process/next.

Two calls to /process/next close in time may be intentional, or unintentional. If it is intentional, we may ideally want to block in the second request until the first request is completed, and then continue with the next task. However, since we don't have any way to know which task a call to /process/next intends to advance from or to, we will just let the second request fail.

If handling of a request by the /process/next endpoint failed for some reason (e.g. the application crashed), the instance may be in an unknown state. Ideally, we should know that we can retry calling /process/next without any bad consequences (like something being done twice). It is however out of scope for this ADR to take care of this.

## Decision drivers

- B1: Must be easy to implement.
- B2: Must not negatively impact application availability or introduce new failure modes (e.g., connection pool exhaustion, deadlocks).
- B3: Must reliably prevent race conditions that cause invalid instance states.
- B4: Nice to have: Should provide visibility into locked instances for debugging and monitoring.
- B5: Should be compatible with or easily replaceable by the new process engine architecture.
- B6: Should not require significant changes to deployment or monitoring.

## Alternatives considered

### A1: PostgreSQL advisory locks

Use PostgreSQL's built-in advisory lock functionality (`pg_advisory_lock`).

How it works:
- Acquire an advisory lock using instance ID as the lock key
- Hold the lock for the duration of the request
- Release the lock when processing completes

Decision: Rejected due to connection pool concerns.

### Option A2: PostgreSQL lock table (SELECTED)

Create a dedicated table to track instance locks with timestamps and metadata. Use a short-lived advisory lock to ensure that only one transaction at a time can insert a lock record for a given instance.

#### How it works

Create the following table:

```sql
CREATE TABLE instance_locks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instance_id BIGINT NOT NULL,
    lock_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMPTZ NOT NULL,
    locked_by VARCHAR(255) NOT NULL
);
```

Summary of the locking flow:

1. Acquire: `INSERT INTO instance_locks` with current instance ID and expiration (e.g. 5 minutes) to receive a token in column `lock_token`.
2. Process: Perform the process transition.
3. Release: `UPDATE instance_locks SET locked_until = CURRENT_TIMESTAMP WHERE lock_token = ?` with token from 1.

In more detail:

To acquire the lock, run the following query:

```sql
WITH lock_attempt AS (
  SELECT pg_try_advisory_xact_lock(:instanceId) AS acquired
)
INSERT INTO instance_locks (instance_id, locked_until, locked_by)
SELECT :instanceId, CURRENT_TIMESTAMP + :expiration, :lockedBy
FROM lock_attempt
WHERE acquired = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM instance_locks
    WHERE instance_id = :instanceId
      AND locked_until > CURRENT_TIMESTAMP
  )
RETURNING lock_token;
```

If no rows are returned, we where unable to acquire the lock. Otherwise we got a token that we keep until the lock is released.

To release the lock, run this query:

```sql
UPDATE instance_locks
SET locked_until = CURRENT_TIMESTAMP
WHERE lock_token = :lockToken;
```

Decision: Selected.

### Option A3: Kubernetes leader election

???

### Option A4: Optimistic concurrency control with idempotency keys

Implement optimistic updates with use of idempotency keys throughout the process.

How it works:
- Each operation in the process uses an idempotency key.
- Instance state updates need to happen such that they don't revert state or result in an invalid state if we do the same update multiple times.

Decision: Rejected. Idempotency ensures operations can be retried without duplicate effects. This prevents issues with e.g. network failures or crashing processes, where we didn't get to know the result of an operation or were unable to store the result. This is out of scope for now, but will be considered for the new process engine.

## Pros and cons

### A1

#### Pros

- Native database feature, no additional tables needed
- Guaranteed cleanup on connection close
- Simple implementation

#### Cons

- Critical issue: Requires holding a database connection open for the entire request duration
    - Would exhaust connection pool quickly under moderate load if there are a high proportion of long-running requests
    - All applications share a single database instance, so long-held connections would impact other applications
    - Could create cascading failures if connection pool is exhausted

### A2

#### Pros

- Simple to implement
- Works with connection pooling (acquire lock -> release connection -> reacquire for release)
- Can include debugging metadata (creation, expiration)
- Queryable for monitoring and troubleshooting
- Automatic cleanup via expiration timestamps
- Supports all decision drivers (B1-B6)

#### Cons

- Requires new database table
- Small performance overhead (2 additional database round-trips per process transition)
- Potential for stale locks if lock release fails (mitigated by expiration)

### A3

#### Cons

- Tight coupling to Kubernetes

### A4

#### Pros
- Operations can be safely retried

#### Cons
- Does not support B1: Requires requires significant changes to the process handling
- Requires changes to the storage API. We may end up with needing some sort of lock there instead
