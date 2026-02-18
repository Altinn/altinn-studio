# Active Entity Constraint — Implementation Guide

This document captures the full design, reasoning, and implementation plan for enforcing a constraint that ensures **at most one active entity of a given type exists at any time**. It is written to be revisited in the context of the real codebase, where the generic `Entity` models will be replaced with actual domain entities.

---

## The Business Rule

> A single entity of a given type may be "active" at any time.

**Active** is defined as two tiers:

- **Tier 1 — Processing:** At most one entity of a given type may have status `Processing`.
- **Tier 2 — Queued:** At most one entity of a given type may have status `Queued`, *and only if* that queued entity has a dependency path (direct or transitive) that leads to the currently `Processing` entity of the same type.

Entities with status `Finished` or `Failed` are ignored entirely by this constraint.

The rationale for allowing a queued entity is to permit pre-scheduling the next unit of work in a chain, without allowing arbitrary concurrent queuing of the same type.

---

## Graph Terminology

Entities may declare **dependencies** on other entities of the same type. A dependency means: *"I cannot start until my dependency is finished."*

- **Dependency (downward):** Entity A depends on Entity B. A → B.
- **Dependent / Upstream (upward):** Entity A is upstream of Entity B if A depends on B, or A depends on something that depends on B (transitively).

The constraint check traverses in **both directions** depending on the step:

| Step | Direction | Purpose |
|------|-----------|---------|
| Does the new entity connect to the processing one? | Downward (follow the new entity's dependencies) | Determine if the new entity is part of the active chain |
| Is there already a queued entity of this type in the chain? | Upward (who depends on the processing entity, transitively) | Find conflicts in the existing graph |

---

## Validation Logic (Step by Step)

```
Insert new entity of type T
        │
        ▼
Is there a processing entity of type T?
  NO  → ✅ Allow insert
  YES →
        Does the new entity's dependency graph reach the processing entity?
          NO  → ✅ Allow insert (new entity is on an unrelated chain)
          YES →
                Does the upstream graph of the processing entity
                already contain a queued entity of type T (other than the new one)?
                  NO  → ✅ Allow insert
                  YES → ❌ Reject — constraint violation
```

---

## Why a PostgreSQL Stored Function

The validation requires **two recursive graph traversals**, which are not expressible in LINQ. Raw SQL is therefore unavoidable for this check. The decision to use a stored function rather than inline raw SQL is justified by:

1. **Execution plan caching.** PostgreSQL plans and caches stored function queries after the first call. Recursive CTEs are non-trivial to plan; ad-hoc strings are re-planned on every execution.
2. **Startup registration via migration service.** The application already has a migration service that can register server-side objects at startup using `CREATE OR REPLACE FUNCTION`, which is idempotent. This eliminates the usual downside of stored procedures (schema drift) because the function definition is always pushed from source.
3. **Separation of concerns.** The recursive SQL is isolated in a `.sql` file that is versionable, reviewable, and independent of C# compilation.

---

## Concurrency Safety

The application uses **PostgreSQL advisory locks** cooperatively across endpoints that require exclusive database access during a calculation phase. This feature follows the same pattern.

The advisory lock key is derived deterministically from the entity type string. This ensures that two concurrent requests for the same entity type are serialized — one will wait at the lock acquisition until the other commits or rolls back.

This means:
- No `SELECT FOR UPDATE` is needed on the processing entity row.
- No trigger-based enforcement is needed.
- The validation query always sees a consistent snapshot for the type it is validating.

The sequence within the transaction is:

1. Acquire `pg_advisory_xact_lock(key)` — blocks concurrent requests for the same type.
2. Insert the new entity record.
3. Insert its dependency records.
4. Call `SaveChangesAsync` — flushes to the DB inside the transaction (not yet visible to other connections).
5. Call the stored function — the recursive CTE can now see the complete graph including the new entity's dependencies.
6. If the function returns a violation, throw and let the transaction roll back.
7. Otherwise, commit.

Step 4 before step 5 is **critical** — the function must see the dependency rows to correctly evaluate whether the new entity connects to the processing one.

---

## Components to Implement

### 1. Entity Model

Replace the generic `Entity` and `EntityDependency` below with your actual domain entities. The properties that **must** exist (by whatever name) for this feature are:

| Generic Name | Required? | Purpose |
|---|---|---|
| `Id` (UUID) | ✅ | Primary key, passed to the stored function |
| `Type` (string or enum) | ✅ | Used to scope the constraint per type |
| `Status` (enum) | ✅ | Must represent at minimum: `Queued`, `Processing`, `Finished`, `Failed` |
| `EntityDependency.EntityId` | ✅ | The entity that has a dependency |
| `EntityDependency.DependsOnId` | ✅ | The entity being depended on |

If your real entity already has these concepts under different names, the stored function's column references (`type`, `status`, `entity_id`, `depends_on_id`) will need to be updated to match the actual table/column names as generated by EF conventions or `[Column]` attributes.

---

### 2. DbContext Configuration

Ensure the following indexes exist. These are non-negotiable for traversal performance:

```csharp
// On the dependency join table
e.HasIndex(x => x.DependsOnId); // upward traversal — most important
e.HasIndex(x => x.EntityId);    // downward traversal

// On the main entity table
e.HasIndex(x => new { x.Type, x.Status }); // fast lookup of processing entity
```

If the join table entity is not a first-class EF entity (e.g. implicit many-to-many), you will need to make it explicit to configure these indexes. The stored function depends on them being present.

---

### 3. Stored Function SQL

File location: `Sql/Functions/check_active_entity_constraint.sql`
Mark as `EmbeddedResource` in the `.csproj`.

```sql
CREATE OR REPLACE FUNCTION check_active_entity_constraint(
    p_new_entity_id UUID,
    p_entity_type   TEXT
) RETURNS TABLE(processing_id UUID, conflicting_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE
    -- Step 1: Find the currently processing entity of this type
    processing AS (
        SELECT id FROM entities
        WHERE type = p_entity_type
          AND status = 'Processing'
        LIMIT 1
    ),
    -- Step 2: Walk the new entity's dependencies downward
    -- to check if it connects to the processing entity
    new_entity_deps AS (
        SELECT depends_on_id AS id
        FROM entity_dependencies
        WHERE entity_id = p_new_entity_id

        UNION

        SELECT ed.depends_on_id
        FROM entity_dependencies ed
        INNER JOIN new_entity_deps ned ON ed.entity_id = ned.id
    ),
    -- Step 3: Confirm the connection exists
    connects_to_processing AS (
        SELECT 1 AS connected
        FROM new_entity_deps ned
        INNER JOIN processing p ON ned.id = p.id
    ),
    -- Step 4: Walk upstream from the processing entity
    -- to find everything that (transitively) depends on it
    upstream AS (
        SELECT ed.entity_id AS id
        FROM entity_dependencies ed
        INNER JOIN processing p ON ed.depends_on_id = p.id

        UNION

        SELECT ed.entity_id
        FROM entity_dependencies ed
        INNER JOIN upstream u ON ed.depends_on_id = u.id
    ),
    -- Step 5: Check if any upstream entity is already queued for this type
    conflicting AS (
        SELECT e.id AS conflicting_id
        FROM entities e
        INNER JOIN upstream u ON e.id = u.id
        WHERE e.type = p_entity_type
          AND e.status = 'Queued'
          AND e.id != p_new_entity_id
        LIMIT 1
    )
    -- Only return a row if the new entity is connected AND there is a conflict
    SELECT p.id, c.conflicting_id
    FROM processing p
    LEFT JOIN connects_to_processing cp ON TRUE
    LEFT JOIN conflicting c ON TRUE
    WHERE cp.connected IS NOT NULL;
END;
$$;
```

> **When adapting to real entities:** Replace `entities`, `entity_dependencies`, `type`, `status`, `entity_id`, and `depends_on_id` with the actual table and column names from your schema. The status string values (`'Processing'`, `'Queued'`) must match exactly what EF writes — check whether your enum is stored as a string or integer, and adjust accordingly. If stored as integer, replace with the corresponding integer values.

---

### 4. Startup Registration

In your existing migration service, add a step to register all embedded SQL functions after EF migrations have run:

```csharp
private async Task RegisterFunctionsAsync(CancellationToken ct)
{
    var assembly = typeof(DatabaseMigrationService).Assembly;
    var resourceNames = assembly.GetManifestResourceNames()
        .Where(n => n.Contains(".Sql.Functions."));

    foreach (var name in resourceNames)
    {
        await using var stream = assembly.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        var sql = await reader.ReadToEndAsync(ct);

        logger.LogInformation("Registering database function: {Resource}", name);
        await db.Database.ExecuteSqlRawAsync(sql, ct);
    }
}
```

`CREATE OR REPLACE FUNCTION` is idempotent — safe to run on every startup. If you ever need to change the function **signature** (parameters or return type), you must `DROP FUNCTION` first, which should be done as an explicit EF migration rather than through this startup mechanism.

Add the embedded resource declaration to your `.csproj`:

```xml
<ItemGroup>
  <EmbeddedResource Include="Sql\Functions\*.sql" />
</ItemGroup>
```

---

### 5. Validator Service

```csharp
public class EntityGraphValidator(AppDbContext db)
{
    public async Task ValidateNewEntityAsync(Guid newEntityId, string entityType, CancellationToken ct = default)
    {
        var violation = await db.Database
            .SqlQuery<ValidationViolation>(
                $"SELECT * FROM check_active_entity_constraint({newEntityId}, {entityType})")
            .FirstOrDefaultAsync(ct);

        if (violation?.ConflictingId is not null)
        {
            throw new ActiveEntityConstraintException(
                entityType,
                violation.ProcessingId,
                violation.ConflictingId.Value);
        }
    }

    private record ValidationViolation(Guid ProcessingId, Guid? ConflictingId);
}

public class ActiveEntityConstraintException(string type, Guid processingId, Guid conflictingId)
    : Exception(
        $"Cannot queue entity of type '{type}': entity {conflictingId} is already queued " +
        $"and connected to the currently processing entity {processingId}.");
```

Register both as scoped services in your DI setup.

---

### 6. Advisory Lock Key

The lock key must be stable and deterministic. Use a seeded hash of the entity type string — do **not** use `string.GetHashCode()` as it is randomized per process in .NET.

```csharp
public static class AdvisoryLock
{
    public static long KeyForEntityType(string entityType)
    {
        unchecked
        {
            int hash = 17;
            foreach (char c in entityType)
                hash = hash * 31 + c;
            return Math.Abs((long)hash) & 0x7FFFFFFF;
        }
    }
}
```

If your codebase already has a lock key derivation convention, use that instead — just ensure the same type string always produces the same key.

---

### 7. API Endpoint

The full transaction sequence in the endpoint:

```csharp
[HttpPost]
public async Task<IActionResult> CreateEntity(CreateEntityRequest request, CancellationToken ct)
{
    var lockKey = AdvisoryLock.KeyForEntityType(request.Type);

    await using var tx = await db.Database.BeginTransactionAsync(ct);

    // 1. Serialize all requests for this entity type
    await db.Database.ExecuteSqlRawAsync(
        "SELECT pg_advisory_xact_lock({0})", [lockKey], ct);

    // 2. Build and insert the entity
    var entity = new Entity
    {
        Id = Guid.NewGuid(),
        Type = request.Type,
        Status = EntityStatus.Queued,
        CreatedAt = DateTimeOffset.UtcNow
    };
    db.Entities.Add(entity);

    // 3. Insert dependencies
    if (request.DependsOnIds is { Count: > 0 })
    {
        db.EntityDependencies.AddRange(
            request.DependsOnIds.Select(depId => new EntityDependency
            {
                EntityId = entity.Id,
                DependsOnId = depId
            }));
    }

    // 4. Flush to DB — dependencies must be visible to the validator
    await db.SaveChangesAsync(ct);

    // 5. Validate — throws ActiveEntityConstraintException on violation
    await validator.ValidateNewEntityAsync(entity.Id, entity.Type, ct);

    // 6. Commit
    await tx.CommitAsync(ct);

    return Ok(new { entity.Id });
}
```

---

## Adaptation Checklist

When integrating into the real codebase, work through this list:

- [ ] Identify the real entity table name and confirm column names for `type` and `status`
- [ ] Confirm how `EntityStatus` is stored in Postgres — string vs integer. Update the SQL literals accordingly (`'Processing'` → `2` if integer, for example)
- [ ] Identify or create the dependency join table and confirm its column names (`entity_id`, `depends_on_id` or equivalents)
- [ ] Confirm the three required indexes exist or add them via a new EF migration
- [ ] Place the `.sql` file in `Sql/Functions/` and mark it as `EmbeddedResource`
- [ ] Add `RegisterFunctionsAsync` to the existing migration service
- [ ] Register `EntityGraphValidator` in DI
- [ ] Wire the advisory lock key derivation to your existing lock conventions if applicable
- [ ] Add integration tests covering: no processing entity, new entity not connected, valid queued slot, and the conflict case

---

## What This Does Not Cover

- **Cycle detection** in the dependency graph. If cycles are possible in your data, the recursive CTEs will infinite-loop. Add cycle guards using the path-array technique or PostgreSQL 14's `CYCLE` clause before deploying if this is a concern.
- **Multiple processing entities.** The function assumes the `LIMIT 1` on the processing query is safe — i.e. your system enforces elsewhere that only one processing entity per type exists. If that is not guaranteed, the constraint logic should be revisited.
- **Status transitions.** This constraint is enforced on insert only. If status updates (e.g. re-queuing a failed entity) can also create violations, the validator should be called from those endpoints too with the same advisory lock pattern.
