import type { IDataModelReference } from 'src/layout/common.generated';

export type RowContext = {
  groupBinding: IDataModelReference;
  rowIndex: number;
  rowId: string;
};

/**
 * Returns the data model path for the innermost repeating-group row.
 * Components outside repeating groups do not have a current data model path.
 */
export function getCurrentDataModelPath(rowContexts: RowContext[]): IDataModelReference | undefined {
  const current = rowContexts[rowContexts.length - 1];
  if (!current) {
    return undefined;
  }

  return {
    dataType: current.groupBinding.dataType,
    field: `${current.groupBinding.field}[${current.rowIndex}]`,
  };
}

export function appendRowContext(
  rowContexts: RowContext[],
  groupBinding: IDataModelReference,
  row: { index: number; uuid: string },
): RowContext[] {
  return [...rowContexts, { groupBinding, rowIndex: row.index, rowId: row.uuid }];
}

export function applyRowContextToComponentId(baseId: string, rowContexts: RowContext[]): string {
  return rowContexts.length === 0 ? baseId : `${baseId}-${rowContexts.map((row) => row.rowIndex).join('-')}`;
}

export function rowContextsToIdMutators(rowContexts: RowContext[]): ((id: string) => string)[] {
  return rowContexts.map(
    ({ rowIndex }) =>
      (id: string) =>
        `${id}-${rowIndex}`,
  );
}
