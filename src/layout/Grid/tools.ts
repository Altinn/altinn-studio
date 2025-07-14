import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useExternalItem } from 'src/utils/layout/hooks';
import { typedBoolean } from 'src/utils/typing';
import type {
  GridCell,
  GridCellLabelFrom,
  GridCellText,
  GridComponentRef,
  GridRow,
  GridRows,
} from 'src/layout/common.generated';

const emptyArray: never[] = [];

export function useBaseIdsFromGrid(baseComponentId: string, enabled = true) {
  const rows = useExternalItem(baseComponentId, 'Grid').rows;
  const hiddenInRows = useHiddenInRows(rows);
  return enabled && rows ? baseIdsFromGridRows(rows, hiddenInRows) : emptyArray;
}

export function useBaseIdsFromGridRows(rows: GridRows | undefined, enabled = true) {
  const canRender = useHasCapability('renderInTable');
  const hiddenInRows = useHiddenInRows(rows);
  return enabled && rows ? baseIdsFromGridRows(rows, hiddenInRows).filter(canRender) : emptyArray;
}

function baseIdsFromGridRows(rows: GridRows, hiddenInRow: HiddenInRow): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (isGridRowHidden(row, hiddenInRow)) {
      continue;
    }

    out.push(...baseIdsFromGridRow(row));
  }

  return out.length ? out : emptyArray;
}

export function baseIdsFromGridRow(row: GridRow): string[] {
  const out: string[] = [];
  for (const cell of row.cells) {
    if (isGridCellNode(cell)) {
      const baseId = cell.component ?? '';
      out.push(baseId);
    }
  }

  return out.length ? out : emptyArray;
}

type HiddenInRow = ReturnType<typeof useIsHiddenInRow | typeof useHiddenInRows>;

function useIsHiddenInRow(row: GridRow) {
  const baseIds = row.cells
    .map((cell) => (isGridCellNode(cell) && cell.component ? cell.component : undefined))
    .filter(typedBoolean);

  return useIsHiddenMulti(baseIds);
}

function useHiddenInRows(rows: GridRows | undefined) {
  const baseIds =
    rows
      ?.map((row) => row.cells.map((cell) => (isGridCellNode(cell) && cell.component ? cell.component : undefined)))
      .flat()
      .filter(typedBoolean) ?? emptyArray;

  return useIsHiddenMulti(baseIds);
}

export function useIsGridRowHidden(row: GridRow) {
  const hiddenFromRow = useIsHiddenInRow(row);
  return isGridRowHidden(row, hiddenFromRow);
}

export function isGridRowHidden(row: GridRow, hiddenInRow: HiddenInRow) {
  let atLeastNoneNodeExists = false;
  const allCellsAreHidden = row.cells.every((cell) => {
    if (isGridCellNode(cell) && cell.component) {
      atLeastNoneNodeExists = true;
      return hiddenInRow[cell.component];
    }

    // Non-component cells always collapse and hide if components in other cells are hidden
    return true;
  });

  return atLeastNoneNodeExists && allCellsAreHidden;
}

export function isGridCellText(cell: GridCell): cell is GridCellText {
  return !!(cell && 'text' in cell && cell.text !== undefined);
}

export function isGridCellLabelFrom(cell: GridCell): cell is GridCellLabelFrom {
  return !!(cell && 'labelFrom' in cell && cell.labelFrom !== undefined);
}

export function isGridCellEmpty(cell: GridCell): boolean {
  return cell === null || (isGridCellText(cell) && cell.text === '');
}

export function isGridCellNode(cell: GridCell): cell is GridComponentRef {
  return !!(cell && 'component' in cell && cell.component);
}
