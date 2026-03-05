---
name: migration
description: Manage EF Core database migrations. Use when adding, listing, or removing migrations for the workflow engine.
---

## Add a new migration

```bash
dotnet ef migrations add <MigrationName> \
  --project src/WorkflowEngine.Data \
  --startup-project src/WorkflowEngine.Api
```

After generating, run `dotnet csharpier format` on the new migration files in `src/WorkflowEngine.Data/Migrations/`.

## List existing migrations

```bash
dotnet ef migrations list \
  --project src/WorkflowEngine.Data \
  --startup-project src/WorkflowEngine.Api
```

## Remove the last migration (if not yet applied)

```bash
dotnet ef migrations remove \
  --project src/WorkflowEngine.Data \
  --startup-project src/WorkflowEngine.Api
```

## Important notes

- Migrations are applied automatically on application startup via `DbMigrationService` — there is no need to run `dotnet ef database update` manually.
- Migration files live in `src/WorkflowEngine.Data/Migrations/`.
- The DbContext is `EngineDbContext` in `WorkflowEngine.Data`.
- Always format generated migration files with CSharpier before committing.
