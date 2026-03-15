# Translation key ownership in app-components

- Status: Proposed
- Deciders: Team
- Date: 19.02.2026

## Result

B: `app-components` defines its own key namespace. The app maps its keys to them in the bridge component, using a data-driven approach: the bridge supplies a raw translation function and a mapping object; `app-components` owns the resolution logic.

This option was chosen because independence is an explicit goal for `app-components` (see [2024-10-17-app-component-library.md](./2024-10-17-app-component-library.md) and [2026-02-19-app-components-i18n.md](./2026-02-19-app-components-i18n.md)), and Option B is the only one that delivers it fully. Option A leaves an undeclared coupling to the app's key naming conventions that won't surface until something breaks silently or the components are used in a new context.

The cost of Option B is low: the key type is a single union and the mapping is a trivial object literal in the bridge. TypeScript enforces both — adding a new key to a component without updating the bridge is a compile error. The discipline is essentially free.

The bridge provides configuration data only; it does not implement the resolution algorithm. This keeps the bridge declarative and ensures that any future change to how `app-components` resolves keys (fallback behavior, parameter handling) is contained entirely within `app-components` and does not require changes to the app.

## Problem context

[2026-02-19-app-components-i18n.md](./2026-02-19-app-components-i18n.md) established that `app-components` will receive a translation function and text resources via a scoped context, whilst [2026-02-24-translation-key-validation.md](./2026-02-24-translation-key-validation.md) defines how to make sure strings passed are real translation keys and that developers know that the strings or variables they are passing are being translated. The type of the AppComponentProvider interface is defined by `app-components` itself, ensuring the component library owns its own contract. Consumers of the `app-components` "lib", implements this contract.

In addition to this translation function and making sure static strings that are passed exist in the consumer app's translation keys, we have certain cases where we need a default translation, but static strings, or internal _translationKeys_, which are defaults or internal values to the components. But these keys need to point to values, which need to follow the current language. I.e. they need to be translated too.

The open question is: who owns these static translation _keys_ that components use when calling the translation function?

The keys used today are `'general.loading'` (Button), `'general.page_number'` (Pagination), `input_components.remaining_characters` and `input_components.exceeded_max_limit`. These keys currently exist in the app's static language files (`src/language/texts/`) and may also be overridden by dynamic text resources fetched from the API.

Currently, we also ensure that the string literals passed are valid through the eslint rule in `src/App/frontend/src/language/eslint.js`, but this is an implicit binding between the `app` and `app-components`. Thus, if one day we decide to move `app-components` outside of the `src/App/frontend/src/` folder, this will no longer work, but without any indication that anything has changed.

## Decision drivers

- B1: `app-components` must not depend on the app's internal naming conventions or key structure.
- B2: The interface between `app-components` and the app should be explicit and type-safe.
- B3: Adding a new translated string to a component should be low-friction.
- B4: `app-components` should be usable outside this app (Storybook, Studio, future apps) without requiring knowledge of this app's key names.

## Alternatives considered

- A: Components reference the app's own key names directly (e.g. `'general.loading'`).
- B: `app-components` defines its own key namespace; the app maps its keys to them.
- C: Each component that uses such static strings, exposes them as props. The app then needs to populate these props each time a component is used and sends down the appropriate key which is then translated in the `app-component`.

## Pros and cons

### A — Use the app's key names directly

Components call `t('general.loading')` using the same key strings as the rest of the app.

- Good, because it satisfies B3: no mapping step, adding a translated string requires no extra work beyond calling `t(key)`.
- Good, because the keys are already generic enough (`general.*`) that they don't feel app-specific.
- Bad, because it does not satisfy B1: if the app renames a key, the component breaks with no TypeScript error.
- Bad, because it does not satisfy B2: the set of keys a component uses is invisible — there is no enforced contract that the translation function covers them.
- Bad, because it does not satisfy B4: any external consumer must replicate the app's exact key names to use the components correctly.
- Bad, because `app-components` silently takes on an undeclared dependency on the app's key naming conventions.

### B — `app-components` defines its own key namespace

`app-components` defines its own key namespace and owns the resolution logic. The app provides two things: a raw translation function and a mapping object from `app-components` keys to the app's own keys. `app-components` uses both internally via `useTranslation`.

```ts
// Defined in src/app-components/AppComponentsProvider.tsx
type AppComponentTranslationKey = 'button.loading' | 'pagination.page_number';
export type TranslationKeyMap = Record<AppComponentTranslationKey, string>;
```

```ts
// Wired up in the app bridge
const translationKeyMap: TranslationKeyMap = {
  'button.loading': 'general.loading',
  'pagination.page_number': 'general.page_number',
};
<AppComponentsProvider t={langAsString} translationKeyMap={translationKeyMap}>
```

```ts
// Resolution owned by app-components
return (key, params) => context.t(context.translationKeyMap[key], params);
```

- Good, because it satisfies B1: `app-components` is fully decoupled from the app's key naming.
- Good, because it satisfies B2: `Record<AppComponentTranslationKey, string>` (not `Partial`) means TypeScript enforces that the app supplies every key. Missing keys are compile errors.
- Good, because it satisfies B4: external consumers see a clear, self-contained list of what they must provide.
- Good, because the bridge is declarative — it supplies configuration data only, not logic. The resolution algorithm is fully encapsulated in `app-components`.
- Bad, because it does not fully satisfy B3: adding a new translated string requires updating the key type in `app-components` _and_ adding the mapping in the app's bridge. Two touch points instead of one.

### C — Components expose translation keys as props

Each component that needs a static translated string exposes a prop for the key. The app passes its own key string at each usage site, and `app-components` calls `t(propKey)` internally.

```tsx
// The app passes its own key as a prop at each usage site
<Button loadingKey='general.loading' />;

// app-components translates it internally
t(props.loadingKey); // → "Loading..."
```

- Good, because it satisfies B1: no key names are hardcoded inside `app-components`.
- Good, because it satisfies B4: external consumers supply keys from their own translation system without needing to know this app's key names.
- Good, because no central mapping object or `app-components`-owned namespace is needed — simpler than B at the provider level.
- Bad, because it does not fully satisfy B2: TypeScript enforces that the prop is provided, but the value is a plain `string` — there is no enforcement that the key actually resolves to anything in the translation system.
- Bad, because it does not satisfy B3: adding a new translated string requires adding a prop to the component and updating every usage site in the app. The number of touch points grows with usage, not with the number of keys.
- Bad, because it scatters the "which key to use" concern across all call sites rather than centralizing it in one mapping.
