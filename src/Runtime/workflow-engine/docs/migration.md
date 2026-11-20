# EF Core migrations

## Add a new migration

```bash
dotnet ef migrations add <MigrationName> \
  --project src/WorkflowEngine.Data \
  --startup-project tests/WorkflowEngine.TestApp
```

After generating, run `dotnet csharpier format` on the new migration files in `src/WorkflowEngine.Data/Migrations/`.

## List existing migrations

```bash
dotnet ef migrations list \
  --project src/WorkflowEngine.Data \
  --startup-project tests/WorkflowEngine.TestApp
```

## Remove the last migration (if not yet applied)

```bash
dotnet ef migrations remove \
  --project src/WorkflowEngine.Data \
  --startup-project tests/WorkflowEngine.TestApp
```

## Important notes

- Migrations are applied automatically on application startup via `DbMigrationService` — there is no need to run `dotnet ef database update` manually.
- Migration files live in `src/WorkflowEngine.Data/Migrations/`.
- The DbContext is `EngineDbContext` in `WorkflowEngine.Data`.
- Always format generated migration files with CSharpier before committing.

## Migrations must survive a re-run

Startup applies migrations, so a pod that crashes halfway through one runs it again on the next
start. A fully transactional migration commits atomically with its history row and needs no care.
One that mixes transactional steps with `suppressTransaction: true` SQL (`CREATE INDEX CONCURRENTLY`
and similar) does not: if the non-transactional part fails, the transactional part stays committed
while the migration is unrecorded. Write such a migration's steps as idempotent SQL
(`ADD COLUMN IF NOT EXISTS`, `DROP INDEX CONCURRENTLY IF EXISTS`, …), as
`20260723074600_AddStepDeferral` does.

Never change a migration that anyone may have applied, including to a local database: a database that
ran the old version reports no pending migrations and then fails on the missing column. Add a new
migration instead.

## Verify a hand-written migration

Migrations that need `CONCURRENTLY` or idempotent guards are written by hand. To show that one still
matches the model, commit first, then:

```bash
dotnet ef migrations has-pending-model-changes --project src/WorkflowEngine.Data --startup-project tests/WorkflowEngine.TestApp
dotnet ef migrations remove --project src/WorkflowEngine.Data --startup-project tests/WorkflowEngine.TestApp --force
dotnet ef migrations add <SameName> --project src/WorkflowEngine.Data --startup-project tests/WorkflowEngine.TestApp
git diff   # then: git checkout -- src/WorkflowEngine.Data/Migrations/
```

The model snapshot should come back byte-identical and the designer file should differ only in the
migration id. Compare the generated `Up()` with the hand-written one object by object: the only
legitimate differences are `CONCURRENTLY` index swaps, `IF [NOT] EXISTS` guards, and the ordering
those force.
