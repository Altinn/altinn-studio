import type { GridCell, ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { usePdfExclusions } from 'src/features/form/layoutSettings/processLayoutSettings';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { getComponentDef } from 'src/layout';
import { isGridCellNode, isGridCellText } from 'src/layout/Grid/tools';
import { useGridRows } from 'src/layout/Grid/useGridRows';
import { useHiddenColumns } from 'src/layout/RepeatingGroup/useHiddenColumns';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { useComponentConfig } from 'src/utils/layout/hooks';

/** Shared column selection for the editable table and its summary, evaluated at the group location. */
export function useTableLayout(baseComponentId: string, mode: 'form' | 'summary' = 'form') {
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const tableIds = useTableComponentIds(baseComponentId);
  const configuredHidden = useHiddenColumns(config.tableColumns);
  const pdfMode = usePdfModeActive();
  const pdfExclusions = usePdfExclusions();
  const before = useGridRows(config.rowsBefore);
  const after = useGridRows(config.rowsAfter);
  const canSummarize = (id: string) => !!getComponentDef(layoutLookups.getComponent(id).type).renderSummary2;
  const hasSummaryContent = (cell: GridCell) =>
    (isGridCellText(cell) && !!cell.text) || (isGridCellNode(cell) && !!cell.component && canSummarize(cell.component));

  const hiddenColumns = new Set(configuredHidden);
  if (mode === 'summary') {
    for (const [index, id] of tableIds.entries()) {
      if (
        !canSummarize(id) &&
        !before.hasContentInColumn(index, hasSummaryContent) &&
        !after.hasContentInColumn(index, hasSummaryContent)
      ) {
        hiddenColumns.add(id);
      }
    }
    if (pdfMode) {
      for (const id of pdfExclusions.components) {
        hiddenColumns.add(id);
      }
    }
  }
  const columnSettings: ITableColumnFormatting = Object.fromEntries(
    [...new Set([...Object.keys(config.tableColumns ?? {}), ...hiddenColumns])].map((id) => [
      id,
      { ...config.tableColumns?.[id], hidden: hiddenColumns.has(id) },
    ]),
  );
  const hiddenIndices = tableIds.flatMap((id, index) => (hiddenColumns.has(id) ? [index] : []));
  return {
    columns: tableIds.filter((id) => !hiddenColumns.has(id)),
    hiddenColumns: [...hiddenColumns],
    columnSettings,
    rowsBefore: before.visibleRows(hiddenIndices),
    rowsAfter: after.visibleRows(hiddenIndices),
  };
}
