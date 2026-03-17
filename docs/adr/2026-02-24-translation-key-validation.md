# Translation key props use a branded type validated by an ESLint rule

- Status: Accepted
- Deciders: Team
- Date: 24.02.2026

## Result

A3: A branded `TranslationKey` type is used for props that carry translation keys. Callers wrap keys in `translationKey()`, which the existing ESLint language-key rule validates.

## Problem context

Some `src/app-components/` components accept translation keys as props — for example `emptyText` on `AppTable` or `header` on a table column. These are not pre-translated strings; the component translates them internally via `useTranslation()` (see [2026-02-19-app-components-i18n.md](./2026-02-19-app-components-i18n.md)).

When these props are typed as plain `string` there is no mechanism, no TypeScript nor ESlint, to ensure the string is actually a translation key. This can happen if the developer mistypes or changes either the reference or the key name without changing the other. Result: the UI renders the key instead of translated text -> no compile-time error, only runtime error.

The existing ESLint rule at `src/language/eslint.js` already validates string literals passed to `langAsString()`, `translate()`, and similar functions, but it has no way to detect a key embedded in a plain JSX string attribute.

## Decision drivers

- B1: Invalid or missing static translation keys must be caught before runtime — at lint time at the latest.
- B2: The solution must work for both static string literals and runtime variables without requiring two separate APIs or explicit casts.
- B3: The solution should aid developers in knowing the string or variable is being translated to ensure the developer passes actual translation keys.
- B4: The solution must not introduce coupling from `src/app-components/` to `src/language/` or `src/features/language/` (see the self-containment rule in [2024-10-17-app-component-library.md](./2024-10-17-app-component-library.md)).
- B5: The solution should be as simple as possible.

## Alternatives considered

- A1: Pre-translate strings before passing — callers call `langAsString('key')` and pass a plain `string` prop.
- A2: Extend the ESLint rule to check specific JSX prop names (e.g. `emptyText`, `header`) for known translation key props.
- A3: A branded `TranslationKey` type in `src/app-components/` with a `translationKey()` helper outside it, validated by extending the existing ESLint rule.

## Pros and cons

### A1 — Pre-translate before passing

- Good, because it satisfies B1: Wrong static translation keys are caught by the ESlint rule.
- Good, because it satisfies B2: the existing translation setup works for both static strings and variables.
- Good, because it satisfies B4: no new dependencies in `app-components`.
- Good, because it satisfied B5: no new types or infrastructure needed.
- Bad, because it does not satisfy B3: The developers have no indication of what string props are being translated or not. They have to enter the implementation of the app component to know so. This can lead to missing translations and/or

### A2 — Extend ESLint rule to check specific prop names

- Good, because it satisfies B1 for static string literals on listed props.
- Good, because it requires no TypeScript changes.
- Bad, because it requires maintaining an explicit list of prop names in the ESLint rule. New translation-key props are unprotected until someone adds them to the list.
- Bad, because it does not cover object-property keys such as `Column.header` inside a JSX expression — those are `Property` AST nodes, not JSX attributes, and require a different and more fragile rule branch.

### A3 — Branded `TranslationKey` type with `translationKey()` helper (chosen)

- Good, because it satisfies B1: the `translationKey()` helper is a regular function call, so the existing ESLint rule validates its string literal argument without any rule changes.
- Good, because it satisfies B2: static keys use `translationKey('some.key')` (validated) and runtime variables use `translationKey(variable)` (the ESLint rule ignores non-literals, same as `langAsString`). No second API or cast is needed.
- Good, because it satisfies B3: `emptyText='signee_list.no_signees'` is a compile-time type error — a `string` literal cannot be assigned to `TranslationKey`.
- Good, because it satisfies B4: the `TranslationKey` branded type is defined inside `src/app-components/types.ts`. The `translationKey()` helper and its dependency on `FixedLanguageList` live outside `app-components` in `src/AppComponentsBridge.tsx`.
- Good, because the helper uses a loose-autocomplete signature (`keyof FixedLanguageList | (string & {})`) giving IDE autocompletion for known keys while accepting runtime variables without a type error.
- Good, because it satisfies B3 in that translation-key props are self-documenting: the type `TranslationKey` communicates at a glance that the component will translate the value itself.
- Bad, because call sites must wrap keys in `translationKey('...')` rather than passing a bare string and the developers must learn that this exists. The overhead is one function call per prop, equivalent to the existing `langAsString('...')` pattern used everywhere else. Though this is a one time learning, and the same applies to everywhere a `TranslationKey` is required.

## Implementation notes

`TranslationKey` is defined in `src/app-components/types.ts` as a branded string:

```ts
export type TranslationKey = string & { __brand: 'TranslationKey' };
```

`translationKey()` lives in `src/AppComponentsBridge.tsx` alongside the bridge component. Its types are so that `translationKey(undefined)` returns `undefined` and `translationKey(key)` returns `TranslationKey`, avoiding the need for null-coalescing at call sites:

```ts
export function translationKey<K extends LooseAutocomplete<keyof FixedLanguageList> | undefined>(
  key: K,
) {
  return key as unknown as K extends undefined ? undefined : TranslationKey;
}
```

The ESLint rule at `src/language/eslint.js` lists `'translationKey'` in its `functionCalls` array and validates string literals passed to it.
