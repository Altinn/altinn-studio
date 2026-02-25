# Translation key props use a branded type validated by an ESLint rule

- Status: Proposed
- Deciders: Team
- Date: 24.02.2026

## Result

A3: A branded `TranslationKey` type is used for props that carry translation keys. Callers wrap keys in `translationKey()`, which the existing ESLint language-key rule validates.

## Problem context

Some `src/app-components/` components accept translation keys as props — for example `emptyText` on `AppTable` or `header` on a table column. These are not pre-translated strings; the component translates them internally via `useTranslation()` (see [2026-02-19-app-components-i18n.md](./2026-02-19-app-components-i18n.md)).

When these props are typed as plain `string` there is no mechanism, no TypeScript nor ESlint, to ensure the string is actually a translation key. This can happen if the developer mistypes or changes either the reference or the key name without changing the other. Result: the UI renders the key instead of translated text -> no compile time error, only runtime error.

The existing ESLint rule at `src/language/eslint.js` already validates string literals passed to `langAsString()`, `translate()`, and similar functions, but it has no way to detect a key embedded in a plain JSX string attribute.

## Decision drivers

- B1: Invalid or missing translation keys must be caught before runtime — at lint time at the latest.
- B2: The solution must not allow silently passing a raw, untranslated key where a translated string is expected.
- B3: The solution must work for both static string literals and runtime variables without requiring two separate APIs or explicit casts.
- B4: The solution must not introduce coupling from `src/app-components/` to `src/language/` or `src/features/language/` (see the self-containment rule in [2024-10-17-app-component-library.md](./2024-10-17-app-component-library.md)).

## Alternatives considered

- A1: Pre-translate strings before passing — callers call `langAsString('key')` and pass a plain `string` prop.
- A2: Extend the ESLint rule to check specific JSX prop names (e.g. `emptyText`, `header`) for known translation key props.
- A3: A branded `TranslationKey` type in `src/app-components/` with a `translationKey()` helper outside it, validated by extending the existing ESLint rule.

## Pros and cons

### A1 — Pre-translate before passing

- Good, because components accept plain `string` — no new types or infrastructure needed.
- Good, because it satisfies B4: no new dependencies in `app-components`.
- Bad, because it does not satisfy B2: TypeScript accepts `emptyText='signee_list.no_signees'` (a raw key literal assigned directly to a `string` prop) without error. The bug is silent.
- Bad, because it does not satisfy B1: the ESLint rule only validates string literals inside recognized function calls such as `langAsString('...')`. A bare JSX attribute like `emptyText='...'` is invisible to it.

### A2 — Extend ESLint rule to check specific prop names

- Good, because it satisfies B1 for static string literals on listed props.
- Good, because it requires no TypeScript changes.
- Bad, because it requires maintaining an explicit list of prop names in the ESLint rule. New translation-key props are unprotected until someone adds them to the list.
- Bad, because it does not satisfy B2: a plain `string` prop still accepts a raw key literal and TypeScript cannot distinguish it from a translated string. The ESLint rule only runs at lint time.
- Bad, because it does not cover object-property keys such as `Column.header` inside a JSX expression — those are `Property` AST nodes, not JSX attributes, and require a different and more fragile rule branch.

### A3 — Branded `TranslationKey` type with `translationKey()` helper (chosen)

- Good, because it satisfies B2: `emptyText='signee_list.no_signees'` is a compile-time type error — a `string` literal cannot be assigned to `TranslationKey`.
- Good, because it satisfies B1: the `translationKey()` helper is a regular function call, so the existing ESLint rule validates its string literal argument without any rule changes.
- Good, because it satisfies B3: static keys use `translationKey('some.key')` (validated) and runtime variables use `translationKey(variable)` (the ESLint rule ignores non-literals, same as `langAsString`). No second API or cast is needed.
- Good, because it satisfies B4: the `TranslationKey` branded type is defined inside `src/app-components/types.ts`. The `translationKey()` helper and its dependency on `FixedLanguageList` live outside `app-components` in `src/AppComponentsBridge.tsx`.
- Good, because the helper uses a loose-autocomplete signature (`keyof FixedLanguageList | (string & {})`) giving IDE autocompletion for known keys while accepting runtime variables without a type error.
- Good, because translation-key props are self-documenting: the type `TranslationKey` communicates at a glance that the component will translate the value itself.
- Bad, because call sites must wrap keys in `translationKey('...')` rather than passing a bare string. The overhead is one function call per prop, equivalent to the existing `langAsString('...')` pattern used everywhere else.

## Implementation notes

`TranslationKey` is defined in `src/app-components/types.ts` as a branded string:

```ts
export type TranslationKey = string & { __brand: 'TranslationKey' };
```

`translationKey()` lives in `src/AppComponentsBridge.tsx` alongside the bridge component. It is overloaded so that `translationKey(undefined)` returns `undefined` and `translationKey(key)` returns `TranslationKey`, avoiding the need for null-coalescing at call sites:

```ts
export function translationKey(key: undefined): undefined;
export function translationKey(key: LooseAutocomplete<keyof FixedLanguageList>): TranslationKey;
export function translationKey(
  key: LooseAutocomplete<keyof FixedLanguageList> | undefined,
): TranslationKey | undefined;
```

The ESLint rule at `src/language/eslint.js` already lists `'translationKey'` in its `functionCalls` array and validates string literals passed to it, so no rule changes are required.
