# Internationalization in app-components

- Status: Accepted
- Deciders: Team
- Date: 19.02.2026

## Result

A1: A scoped context internal to `src/app-components/` exposes a minimal translation function and a translation React Component. The wider app wires them up once via a bridge component placed inside `GlobalFormDataReadersProvider`.

## Problem context

`src/app-components/` is intended to contain self-contained, "dumb" UI components with no dependencies on the wider app (see [2024-10-17-app-component-library.md](./2024-10-17-app-component-library.md)). However, some components need to display translated strings — for example, an aria-label on a loading spinner or a page number label in a pagination control.

The naive solution of importing `useLanguage` from `src/features/language/` directly violates the self-containment requirement and re-introduces the tight coupling ADR 001 set out to remove.

## Decision drivers

- B1: Components in `src/app-components/` must not import from outside `src/app-components/`.
- B2: Language switching must be reactive — components must re-render when the language changes.
- B3: The solution must be simple to use inside components and cheap to wire up in the app.
- B4: The solution must be easy to test in isolation (Storybook, unit tests).

## Alternatives considered

- A1: Scoped context inside `src/app-components/` accepting a minimal translation function.
- A2: Pre-translated strings passed as props by the caller.
- A3: Translation function passed as a prop by the caller.
- A4: Module-level singleton — a mutable global translation function.
- A5: Dedicated i18n library (e.g. `react-i18next`) scoped to `app-components`.

## Pros and cons

### A1 — Scoped context (chosen)

- Good, because it satisfies B1: components only import from within `src/app-components/`.
- Good, because it satisfies B2: React context is reactive; language changes propagate automatically.
- Good, because it satisfies B3: wire-up cost is paid once at the app level; components just call a hook.
- Good, because it satisfies B4: tests pass `t={(key) => key}` or a fixture function — no mocking of `useLanguage`'s dependency tree.
- Good, because the interface is narrow: `(key: string, params?: (string | number | undefined)[]) => string`. Only the minimal surface the components actually need is exposed.
- Bad, because components are not 100% standalone — they require the provider to be present. Mitigated by a clear error message when the provider is missing.

### A2 — Pre-translated props

- Good, because components are fully standalone with zero i18n knowledge.
- Good, because it satisfies B1 and B4.
- Bad, because it does not scale: as more components need more strings, each gets its own set of string props, leading to inconsistent APIs and prop proliferation.
- Bad, because callers must know and supply every text a component needs, spreading that responsibility across the codebase.

### A3 — Translation function as prop

- Good, because components remain unaware of the i18n implementation.
- Bad, because components still need to know the translation keys they use, creating hidden coupling.
- Bad, because every call site must thread the function through, which is repetitive and unusual for a UI component API.
- Bad, because it does not scale across many components for the same reasons as A2.

### A4 — Module-level singleton

- Good, because no context or provider is needed — components just import and call `t()`.
- Good, because it satisfies B1.
- Bad, because it does not satisfy B2: the singleton is not reactive. Changing the language updates the function reference but does not trigger re-renders in components that have already rendered.
- Bad, because global mutable state is an anti-pattern in React and makes the data flow opaque.
- Bad, because it is harder to test: the global state leaks between tests unless explicitly reset.

### A5 — Dedicated i18n library

- Good, because the library is genuinely self-contained; `app-components` depends only on the library, not on the app.
- Good, because it satisfies B1 and B2.
- Bad, because it introduces an external dependency and significant setup overhead for a problem that is fully solved by a single function interface.
- Bad, because translation resources would need to be maintained separately from the app's own text resources, creating duplication.

## Implementation notes

The context lives at `src/app-components/AppComponentsProvider.tsx` and exposes `AppComponentsProvider` and `useTranslation`. The app side contains a small bridge component that calls `useLanguage()` and passes `langAsString` to the provider.
