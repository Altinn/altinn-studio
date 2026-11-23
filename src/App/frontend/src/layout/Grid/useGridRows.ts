import { useMemo } from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { GridCell, GridRow, GridRows } from '@app/layout-contract/generated/common.generated';

import { getGridCellHiddenExpr, isGridCellNode, isGridRowHidden, useHiddenInRows } from 'src/layout/Grid/tools';
import { useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';

export interface GridRowLayout extends Omit<GridRow, 'cells'> {
  cells: { cell: GridCell; columnIndex: number; colSpan: number }[];
}

/** Resolves row visibility and physical column positions before a table chooses which columns to display. */
export function useGridRows(rows: GridRows | undefined) {
  const hiddenComponents = useHiddenInRows(rows);
  const spanExpressions = useMemo(
    () =>
      Object.fromEntries(
        (rows ?? []).flatMap((row, rowIndex) =>
          row.cells.map((cell, cellIndex) => [`${rowIndex}-${cellIndex}`, cell?.cellStyle?.colSpan]),
        ),
      ),
    [rows],
  );
  const spans = useEvalExpressionDictionary(spanExpressions, CommonExpressions.IGridColumnProperties.colSpan);
  const hiddenExpressions = useMemo(
    () =>
      Object.fromEntries(
        (rows?.find((row) => row.header)?.cells ?? []).map((cell, index) => [index, getGridCellHiddenExpr(cell)]),
      ),
    [rows],
  );
  const hidden = useEvalExpressionDictionary(hiddenExpressions, CommonExpressions.ITableColumnProperties.hidden);
  const sourceRows = rows ?? [];
  const positionedRows: GridRowLayout[] = sourceRows.map((row, rowIndex) => {
    let columnIndex = 0;
    return {
      ...row,
      cells: row.cells.map((cell, cellIndex) => {
        const colSpan = Math.max(1, spans?.[`${rowIndex}-${cellIndex}`] ?? 1);
        const positioned = { cell, columnIndex, colSpan };
        columnIndex += colSpan;
        return positioned;
      }),
    };
  });
  const hiddenColumns = new Set<number>();
  positionedRows
    .find((row) => row.header)
    ?.cells.forEach(({ columnIndex, colSpan }, index) => {
      if (hidden?.[index]) {
        for (let column = columnIndex; column < columnIndex + colSpan; column++) {
          hiddenColumns.add(column);
        }
      }
    });
  const visible = positionedRows.filter((_, index) => !isGridRowHidden(sourceRows[index], hiddenComponents));

  return {
    hasContentInColumn(column: number, hasContent: (cell: GridCell) => boolean) {
      return (
        !hiddenColumns.has(column) &&
        visible.some((row) =>
          row.cells.some(
            ({ cell, columnIndex, colSpan }) =>
              column >= columnIndex &&
              column < columnIndex + colSpan &&
              !(isGridCellNode(cell) && cell.component && hiddenComponents[cell.component]) &&
              hasContent(cell),
          ),
        )
      );
    },
    visibleRows(excludedColumns: number[] = []): GridRowLayout[] {
      const excluded = new Set([...hiddenColumns, ...excludedColumns]);
      return visible.map((row) => ({
        ...row,
        cells: row.cells.flatMap(({ cell, columnIndex, colSpan }) => {
          let visibleSpan = 0;
          for (let column = columnIndex; column < columnIndex + colSpan; column++) {
            if (!excluded.has(column)) {
              visibleSpan++;
            }
          }
          return visibleSpan ? [{ cell, columnIndex, colSpan: visibleSpan }] : [];
        }),
      }));
    },
  };
}
