/**
 * The Studio-configurable prop categories, in the order they should appear in the docs.
 * They mirror the configuration sections a service owner sees in Altinn Studio:
 */
export const STUDIO_CATEGORIES = [
  { category: 'text', label: 'Text' },
  { category: 'data', label: 'Data' },
  { category: 'content', label: 'Innhold' },
] as const;

/**
 * All categories for a storybook property.
 * `runtime` is internal wiring supplied by the runtime wrapper ( display overrides, validation state, event handlers) and is NOT part of the Studio configuration.
 */
export type PropCategory = (typeof STUDIO_CATEGORIES)[number]['category'] | 'runtime';

/**
 * An exhaustive map from every prop of `TProps` to its {@link PropCategory}. Use it with `satisfies`
 * so adding a prop without classifying it is a compile error:
 *
 * ```ts
 * export const DEMO_PROP_CATEGORIES = { id: 'content', title: 'text', dataValue: 'runtime', ... } satisfies PropCategories<DemoLayoutComponentProps>;
 * ```
 */
export type PropCategories<TProps> = Record<keyof TProps, PropCategory>;

export function groupPropKeys(
  categories: Record<string, PropCategory>,
): Record<PropCategory, string[]> {
  const groups: Record<PropCategory, string[]> = { text: [], data: [], content: [], runtime: [] };
  for (const [key, category] of Object.entries(categories)) {
    groups[category].push(key);
  }
  return groups;
}
