/**
 * Shared classification for a layout component's props, used to drive the Storybook docs layout.
 *
 * - `config` — props that map 1:1 to the component's Studio-configurable options.
 * - `runtime` — internal wiring supplied by the runtime wrapper (data binding, display overrides,
 *   validation state, event handlers). NOT part of the Studio configuration.
 */
export type PropCategory = 'config' | 'runtime';

/**
 * An exhaustive map from every prop of `TProps` to its {@link PropCategory}. Use it with `satisfies`
 * so adding a prop without classifying it is a compile error:
 *
 * ```ts
 * export const INPUT_PROP_CATEGORIES = { id: 'config', value: 'runtime', ... } satisfies PropCategories<InputLayoutProps>;
 * ```
 */
export type PropCategories<TProps> = Record<keyof TProps, PropCategory>;

/** Splits a {@link PropCategories} map into the configurable and runtime prop-name lists. */
export function splitPropKeys(categories: Record<string, PropCategory>): {
  configKeys: string[];
  runtimeKeys: string[];
} {
  const configKeys: string[] = [];
  const runtimeKeys: string[] = [];
  for (const [key, category] of Object.entries(categories)) {
    (category === 'config' ? configKeys : runtimeKeys).push(key);
  }
  return { configKeys, runtimeKeys };
}
