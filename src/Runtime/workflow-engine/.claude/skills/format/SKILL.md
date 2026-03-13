---
name: format
description: Format C# files with CSharpier and verify the build passes. Use when formatting code, fixing build errors from formatting, or before committing changes.
---

## Format specific files

```bash
dotnet csharpier format <file-or-directory>
```

## Format all changed files

```bash
dotnet csharpier format .
```

## Verify formatting passes the build

```bash
dotnet build
```

The build enforces CSharpier formatting — unformatted files cause build errors.

## Configuration

Config file: `.csharpierrc.yaml`
- Print width: 120 characters
- Tab width: 4 spaces
- Use tabs: false

## When to format

- Always format new or modified C# files before committing.
- Run on generated files (e.g., EF Core migrations) before committing.
- If the build fails with formatting errors, run `dotnet csharpier format` on the offending files.
