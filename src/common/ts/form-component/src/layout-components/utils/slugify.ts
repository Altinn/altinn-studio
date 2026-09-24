/**
 * Makes a text usable as a DOM id by replacing whitespace with hyphens. Keeps every other
 * character untouched, so ids generated from labels stay stable for existing test selectors.
 */
export function slugify(text: string): string {
  return text.replace(/\s/g, '-');
}
