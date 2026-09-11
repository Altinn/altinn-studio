/** How grouped options (checkboxes, radio buttons) are laid out. */
export type LayoutStyle = 'column' | 'row' | 'table';

/**
 * Whether grouped options should be laid out horizontally. An explicit `layout` always wins;
 * otherwise short option lists are laid out in a row and longer ones in a column.
 */
export function shouldUseRowLayout({
  layout,
  optionsCount,
}: {
  layout?: LayoutStyle;
  optionsCount: number;
}): boolean {
  switch (layout) {
    case 'row':
      return true;
    case 'column':
      return false;
  }

  return optionsCount < 3;
}
