# Shared code

This directory holds code that several product areas share, grouped by stack. Code shared within only one product
area goes in that area's own `common` directory, such as [`src/Runtime/common`](../Runtime/common).

- [`dotnet/Altinn.Studio.Common`](dotnet/Altinn.Studio.Common) has .NET hosting and assertion helpers. Designer, the
  App backend and several runtime services use it.
- [`expression-tests`](expression-tests/README.md) has expression tests that both App frontend and App backend run.
- [`ts`](ts/README.md) has TypeScript and React libraries for forms, which App frontend and Designer use.

The products build and ship separately, so a change here can break several of them.

Keep each package focused, with a small public surface and explicit dependencies. Use the project boundaries of each
stack instead of a general utilities package. Add a stack directory only when there is shared code for it.
