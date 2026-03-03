import type React from 'react';

import type { GridCell, GridCellLabelFrom, GridCellText, GridComponentRef, ITableColumnProperties } from 'src/layout/common.generated';

export function isGridCellText(cell: GridCell): cell is GridCellText {
  return !!(cell && 'text' in cell && cell.text !== undefined);
}

export function isGridCellLabelFrom(cell: GridCell): cell is GridCellLabelFrom {
  return !!(cell && 'labelFrom' in cell && cell.labelFrom !== undefined);
}

export function isGridCellNode(cell: GridCell): cell is GridComponentRef {
  return !!(cell && 'component' in cell && cell.component);
}

export function getColumnStyles(columnSettings: ITableColumnProperties): React.CSSProperties {
  const lineWrap = columnSettings.textOverflow?.lineWrap || columnSettings.textOverflow?.lineWrap === undefined;
  const lineClampToggle = lineWrap ? 1 : 0;

  let width: string | number | undefined = columnSettings.width ?? 'auto';
  const widthPercentage = Number(width.substring(0, width.length - 1));
  if (width.charAt(width.length - 1) === '%' && widthPercentage) {
    width = `${widthPercentage * 0.837}%`;
  }

  const columnStyleVariables = {
    '--cell-max-number-of-lines': (columnSettings.textOverflow?.maxHeight ?? 2) * lineClampToggle,
    '--cell-text-alignment': columnSettings.alignText,
    '--cell-width': width,
    '--cell-word-break': lineWrap ? 'break-word' : 'normal',
  };

  return columnStyleVariables as React.CSSProperties;
}
