import { useMemo } from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { GridCell, GridRows, ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { usePdfExclusions } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getComponentDef } from 'src/layout';
import { isGridCellNode, isGridCellText } from 'src/layout/Grid/tools';
import { useHiddenColumns } from 'src/layout/RepeatingGroup/useHiddenColumns';
import { useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';

interface PositionedCell {
  cell: GridCell;
  start: number;
  span: number;
}

interface PositionedRow {
  header: boolean;
  cells: PositionedCell[];
}

export interface SummaryExtraRow {
  header: boolean;
  cells: { cell: GridCell; colSpan: number }[];
}

function positionRows(rows: GridRows, spans: Record<string, number> | undefined): PositionedRow[] {
  return rows.map((row, rowIdx) => {
    let start = 0;
    return {
      header: !!row.header,
      cells: row.cells.map((cell, cellIdx) => {
        const span = Math.max(1, spans?.[`${rowIdx}-${cellIdx}`] ?? 1);
        const positioned = { cell, start, span };
        start += span;
        return positioned;
      }),
    };
  });
}

function visibleRows(rows: PositionedRow[], hiddenIndices: Set<number>): SummaryExtraRow[] {
  return rows.map(({ header, cells }) => ({
    header,
    cells: cells.flatMap(({ cell, start, span }) => {
      const colSpan = Array.from({ length: span }, (_, offset) => start + offset).filter(
        (index) => !hiddenIndices.has(index),
      ).length;
      return colSpan ? [{ cell, colSpan }] : [];
    }),
  }));
}

export function useSummaryTableLayout({
  tableIds,
  tableColumns,
  rowsBefore,
  rowsAfter,
  pdfModeActive,
}: {
  tableIds: string[];
  tableColumns: ITableColumnFormatting | undefined;
  rowsBefore: GridRows | undefined;
  rowsAfter: GridRows | undefined;
  pdfModeActive: boolean;
}) {
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const configuredHiddenColumns = useHiddenColumns(tableColumns);
  const pdfExclusions = usePdfExclusions();
  const allExtraRows = useMemo(() => [...(rowsBefore ?? []), ...(rowsAfter ?? [])], [rowsBefore, rowsAfter]);
  const spanExpressions = useMemo(
    () =>
      Object.fromEntries(
        allExtraRows.flatMap((row, rowIdx) =>
          row.cells.map((cell, cellIdx) => [`${rowIdx}-${cellIdx}`, cell?.cellStyle?.colSpan]),
        ),
      ),
    [allExtraRows],
  );
  const spans = useEvalExpressionDictionary(spanExpressions, CommonExpressions.IGridColumnProperties.colSpan);
  const positionedRows = positionRows(allExtraRows, spans);

  const occupiedColumns = new Set<number>();
  for (const row of positionedRows) {
    for (const { cell, start, span } of row.cells) {
      const hasContent =
        (isGridCellText(cell) && !!cell.text) ||
        (isGridCellNode(cell) &&
          !!cell.component &&
          !!getComponentDef(layoutLookups.getComponent(cell.component).type).renderSummary2);
      if (hasContent) {
        for (let index = start; index < start + span; index++) {
          occupiedColumns.add(index);
        }
      }
    }
  }

  const columnSettings: ITableColumnFormatting = Object.fromEntries(
    Object.entries(tableColumns ?? {}).map(([id, column]) => [
      id,
      { ...column, hidden: configuredHiddenColumns.includes(id) },
    ]),
  );
  if (pdfModeActive) {
    for (const id of pdfExclusions.components) {
      columnSettings[id] = { ...columnSettings[id], hidden: true };
    }
  }
  for (const [index, id] of tableIds.entries()) {
    if (!getComponentDef(layoutLookups.getComponent(id).type).renderSummary2 && !occupiedColumns.has(index)) {
      columnSettings[id] = { ...columnSettings[id], hidden: true };
    }
  }

  const hiddenIndices = new Set(tableIds.flatMap((id, index) => (columnSettings[id]?.hidden ? [index] : [])));
  const visibleExtraRows = visibleRows(positionedRows, hiddenIndices);
  return {
    columnSettings,
    rowsBefore: visibleExtraRows.slice(0, rowsBefore?.length ?? 0),
    rowsAfter: visibleExtraRows.slice(rowsBefore?.length ?? 0),
  };
}
