import type { ILayoutSettings } from 'app-shared/types/global';
import type { PageLayouts } from '../types';

/**
 * Returns the names of the pages in the order the app shows them. Pages missing from the order in
 * the settings file come last, so a page is never hidden from the editor.
 */
export function getPageNames(layouts: PageLayouts, settings?: ILayoutSettings): string[] {
  const existingPages = Object.keys(layouts);
  const orderedPages = (settings?.pages?.order ?? []).filter((page) =>
    existingPages.includes(page),
  );
  const unorderedPages = existingPages.filter((page) => !orderedPages.includes(page));
  return [...orderedPages, ...unorderedPages];
}
