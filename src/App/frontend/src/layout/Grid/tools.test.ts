import { getGridCellHiddenExpr } from 'src/layout/Grid/tools';
import type { GridCell } from 'src/layout/common.generated';

describe('getGridCellHiddenExpr', () => {
  it('returns undefined for non-object or null cells', () => {
    expect(getGridCellHiddenExpr(null as unknown as GridCell)).toBeUndefined();
    expect(getGridCellHiddenExpr(undefined as unknown as GridCell)).toBeUndefined();
    expect(getGridCellHiddenExpr('text' as unknown as GridCell)).toBeUndefined();
  });

  it('reads hidden from columnOptions when present', () => {
    const cell = { columnOptions: { hidden: true } } as GridCell;
    expect(getGridCellHiddenExpr(cell)).toBe(true);
  });

  it('returns undefined when hidden is only set in cellStyle', () => {
    const cell = {
      cellStyle: { hidden: true },
    } as GridCell;
    expect(getGridCellHiddenExpr(cell)).toBeUndefined();
  });

  it('reads hidden from columnOptions when both are set', () => {
    const cell = {
      columnOptions: { hidden: true },
      cellStyle: { hidden: false },
    } as GridCell;
    expect(getGridCellHiddenExpr(cell)).toBe(true);
  });
});
