# Instance locking for mutating process operations

- Status: Accepted
- Deciders: Team Altinn Studio, squad flyt
- Date: 03.11.2025

## Result

A2: PostgreSQL lock table

## Problem context

We have had several nasty race condition-based bugs, where simultaneous mutating requests conflict with each other and modify instance state in parallel, causing various issues and invalid states. We want to introduce a lock system, such that only one mutating request to the application will be processed at once. For now, we limit the scope to handle requests to /process/next.

Two calls to /process/next close in time may be intentional, or unintentional. If it is intentional, we may ideally want to block in the second request until the first request is completed, and then continue with the next task. However, since we don't have any way to know which task a call to /process/next intends to advance from or to, we will just let the second request fail.

If handling of a request by the /process/next endpoint failed for some reason (e.g. the application crashed), the instance may be in an unknown state. Ideally, we should know that we can retry calling /process/next without any bad consequences (like something being done twice). It is however out of scope for this ADR to take care of this.

## Decision drivers

- B1: Must be easy to implement.
- B2: Must not negatively impact application availability or introduce new failure modes (e.g., connection pool exhaustion, deadlocks).
- B3: Must reliably prevent race conditions that cause invalid instance states.
- B4: Nice to have: Should provide visibility into locked instances for debugging and monitoring.
- B5: Should be compatible with or easily replaceable by the new process engine architecture.
- B6: Should not require significant changes to deployment or monitoring.
- B7: Should not require new infrastructure/dependencies.
- B8: Must not require changes in apps.

## Alternatives considered

### A1: PostgreSQL advisory locks

Use PostgreSQL's built-in advisory lock functionality (`pg_advisory_lock`),
which would hold the lock for the duration of process/next request.
The lock would be scoped to connection/transaction.

How it works:
- Acquire an advisory lock using instance ID as the lock key
- Hold the lock for the duration of the request
- Release the lock when processing completes

Decision: Rejected due to connection pool concerns, connections are expensive in PostgreSQL due to its' process-per-connection model

### Option A2: PostgreSQL lock table (SELECTED)

Create a dedicated table to track instance locks with timestamps and metadata. Use a short-lived advisory lock to ensure that only one transaction at a time can insert a lock record for a given instance. The lock token returned to the caller is composed from the row ID and a random secret. Only a hash of the secret is stored in the database.

#### How it works

Create the following table:

```sql
CREATE TABLE storage.instancelocks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instanceinternalid BIGINT NOT NULL,
    lockedat TIMESTAMPTZ NOT NULL,
    lockeduntil TIMESTAMPTZ NOT NULL,
    lockedby TEXT NOT NULL,
    secrethash BYTEA NOT NULL
);

CREATE INDEX instancelocks_instanceinternalid
    ON storage.instancelocks (instanceinternalid);
```

Summary of the locking flow:

1. Acquire: The application generates a random secret and SHA256-hashes it. A stored procedure inserts a row into `storage.instancelocks` with the hash, returning the row `id`. The application combines `{id, secret}` into a base64url-encoded token returned to the caller.
2. Process: Perform the process transition.
3. Release: Call the update stored procedure with TTL=0 and the token (secret is hashed and verified against the stored hash). This sets `lockeduntil = NOW()`, effectively releasing the lock.

In more detail:

To acquire the lock, call the following stored procedure:

```sql
CREATE OR REPLACE PROCEDURE storage.acquireinstancelock(
    _instanceinternalid BIGINT,
    _ttl INTERVAL,
    _lockedby TEXT,
    _secrethash BYTEA,
    INOUT _result TEXT DEFAULT NULL,
    INOUT _id BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $BODY$
DECLARE
    _lock_exists BOOLEAN;
    _now TIMESTAMPTZ;
BEGIN
    PERFORM pg_advisory_xact_lock(_instanceinternalid);

    SELECT clock_timestamp() INTO _now;

    SELECT true FROM storage.instancelocks
    WHERE instanceinternalid = _instanceinternalid
    AND lockeduntil > _now
    INTO _lock_exists;

    IF _lock_exists THEN
        _result := 'lock_held';
        RETURN;
    END IF;

    INSERT INTO storage.instancelocks (instanceinternalid, lockedat, lockeduntil, lockedby, secrethash)
    VALUES (_instanceinternalid, _now, _now + _ttl, _lockedby, _secrethash)
    RETURNING id INTO _id;

    _result := 'ok';
END;
$BODY$;
```

If `_result` is `'lock_held'`, the lock is already held by another request. If `'ok'`, `_id` contains the row ID used (together with the unhashed secret) to form the lock token.

To release (or extend) the lock, call the following stored procedure with the desired TTL (0 for release):

```sql
CREATE OR REPLACE PROCEDURE storage.updateinstancelock(
    _id BIGINT,
    _instanceinternalid BIGINT,
    _ttl INTERVAL,
    _secrethash BYTEA,
    INOUT _result TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $BODY$
DECLARE
    _locked_until TIMESTAMPTZ;
    _stored_hash BYTEA;
    _now TIMESTAMPTZ;
BEGIN
    PERFORM pg_advisory_xact_lock(_instanceinternalid);

    SELECT lockeduntil, secrethash FROM storage.instancelocks
    WHERE id = _id AND instanceinternalid = _instanceinternalid
    INTO _locked_until, _stored_hash;

    IF _locked_until IS null THEN
        _result := 'lock_not_found';
        RETURN;
    END IF;

    IF _stored_hash != _secrethash THEN
        _result := 'token_mismatch';
        RETURN;
    END IF;

    SELECT clock_timestamp() INTO _now;

    IF _locked_until <= _now THEN
        _result := 'lock_expired';
        RETURN;
    END IF;

    UPDATE storage.instancelocks
    SET lockeduntil = _now + _ttl
    WHERE id = _id;

    _result := 'ok';
END;
$BODY$;
```

The procedure verifies that the lock exists, the secret hash matches, and the lock has not expired before updating. Possible `_result` values: `'ok'`, `'lock_not_found'`, `'token_mismatch'`, `'lock_expired'`.

Decision: Selected.

### Option A3: Distributed locks/leader election

There are various mechanisms that could allow us to have a leader process to coordinate/keep state relating to active process/next requests:
- Kubernetes API with it's optimstic concurrency mechanism (`resourceVersion` as a precondition)
- PostgreSQL long-running advisory locks (connection scoped)

We could then have processes, e.g. in Storage
- Compete for leadership
- Track process/next requests

Decision: Rejected.

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
- No new infrastructure/dependencies (B7)
- No change required in apps (B8)

#### Cons

- Critical issue: Requires holding a database connection open for the entire request duration (B2)
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
- Supports all decision drivers (B1-B8)

#### Cons

- Requires new database table
- Small performance overhead (2 additional database round-trips per process transition)
- Potential for stale locks if lock release fails (mitigated by expiration)

### A3

#### Cons

- Tight coupling to Kubernetes
- Hard to implement (B1)
- Provides no persistence/durability

### A4

#### Pros
- Operations can be safely retried

#### Cons
- Does not support B1: Requires significant changes to the process handling
- Requires changes to the storage API. We may end up with needing some sort of lock there instead
