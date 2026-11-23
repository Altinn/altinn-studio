import type { LayoutComponent, PageLayouts } from '../types';
import { getInlineOptions } from './optionUtils';

/** A text the app shows, and where it is shown. */
export type TextRow = {
  textKey: string;
  pageName: string;
  /** Undefined for the name of the page itself. */
  component?: LayoutComponent;
  /** The text property, such as `title`, or `option` for the label of an option. */
  property?: string;
};

/** The texts of every page in order: the page name first, then the texts of each component. */
export function getTextRows(layouts: PageLayouts, pageNames: string[]): TextRow[] {
  const rows: TextRow[] = [];
  const seen = new Set<string>();
  const add = (row: TextRow): void => {
    if (seen.has(row.textKey)) return;
    seen.add(row.textKey);
    rows.push(row);
  };
  pageNames.forEach((pageName) => {
    add({ textKey: pageName, pageName });
    layouts[pageName]?.data.layout.forEach((component) => {
      Object.entries(component.textResourceBindings ?? {}).forEach(([property, textKey]) => {
        if (typeof textKey === 'string') add({ textKey, pageName, component, property });
      });
      getInlineOptions(component).forEach(({ label }) =>
        add({ textKey: label, pageName, component, property: 'option' }),
      );
    });
  });
  return rows;
}

/** Counts the texts that have a value in the main language but none in the other. */
export function countMissing(
  rows: TextRow[],
  mainTexts: Record<string, string>,
  otherTexts: Record<string, string>,
): number {
  return rows.filter(({ textKey }) => mainTexts[textKey] && !otherTexts[textKey]).length;
}
