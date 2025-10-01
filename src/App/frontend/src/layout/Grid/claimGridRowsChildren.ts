import type { GridRows } from 'src/layout/common.generated';
import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export function claimGridRowsChildren<T extends CompTypes>(
  { claimChild, getType, getCapabilities }: ChildClaimerProps<T>,
  rows: GridRows | undefined,
): void {
  if (!rows) {
    return;
  }

  for (const row of rows.values()) {
    for (const cell of row.cells.values()) {
      if (cell && 'component' in cell && cell.component) {
        const type = getType(cell.component);
        if (!type) {
          continue;
        }
        const capabilities = getCapabilities(type);
        if (!capabilities.renderInTable) {
          window.logWarn(
            `Grid-like component included a component '${cell.component}', which ` +
              `is a '${type}' and cannot be rendered in a table.`,
          );
          continue;
        }
        claimChild(cell.component);
      }
    }
  }
}
