import type { IDataModelReference, IMapping } from 'src/layout/common.generated';
import type { CompExternal, CompIntermediate, CompTypes, IDataModelBindings } from 'src/layout/layout';

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

function transposeChildBinding(field: string, groupField: string, rowIndex: number): string | undefined {
  const groupPrefix = `${groupField}.`;
  if (!field.startsWith(groupPrefix)) {
    return undefined;
  }

  return `${groupField}[${rowIndex}]${field.slice(groupField.length)}`;
}

export function getIndexedDataModelReference(
  reference: IDataModelReference,
  rowContexts: RowContext[],
): IDataModelReference {
  let indexed = reference;
  for (const { groupBinding, rowIndex } of rowContexts) {
    if (indexed.dataType !== groupBinding.dataType || indexed.field === groupBinding.field) {
      continue;
    }

    const field = transposeChildBinding(indexed.field, groupBinding.field, rowIndex);
    if (field) {
      indexed = { dataType: indexed.dataType, field };
    }
  }

  return indexed;
}

function isDataModelReference(reference: unknown): reference is IDataModelReference {
  return (
    typeof reference === 'object' &&
    reference !== null &&
    'dataType' in reference &&
    typeof reference.dataType === 'string' &&
    'field' in reference &&
    typeof reference.field === 'string'
  );
}

export function getIndexedDataModelBindings<T extends CompTypes = CompTypes>(
  bindings: IDataModelBindings<T> | undefined,
  rowContexts: RowContext[],
): IDataModelBindings<T> | undefined {
  if (!bindings) {
    return bindings;
  }

  const clone = { ...bindings };
  for (const key of Object.keys(clone)) {
    const target = clone[key];
    if (isDataModelReference(target)) {
      clone[key] = getIndexedDataModelReference(target, rowContexts);
    }
  }

  return clone;
}

export function getIndexedMapping(mapping: IMapping | undefined, rowContexts: RowContext[]): IMapping | undefined {
  if (!mapping) {
    return undefined;
  }

  const clone = { ...mapping };
  for (const [markerIndex, { rowIndex }] of rowContexts.entries()) {
    for (const key of Object.keys(clone)) {
      const value = clone[key];
      const newKey = key.replace(`[{${markerIndex}}]`, `[${rowIndex}]`);
      delete clone[key];
      clone[newKey] = value;
    }
  }

  return clone;
}

export function getRuntimeIntermediateItem<T extends CompTypes>(
  component: CompExternal<T>,
  rowContexts: RowContext[],
): CompIntermediate<T> {
  const clone = { ...component } as CompIntermediate<T>;
  if ('mapping' in clone) {
    clone.mapping = getIndexedMapping(clone.mapping, rowContexts);
  }
  if ('dataModelBindings' in clone && clone.dataModelBindings !== undefined) {
    clone.dataModelBindings = getIndexedDataModelBindings(clone.dataModelBindings, rowContexts);
  }

  clone.id = applyRowContextToComponentId(clone.id, rowContexts);

  return clone;
}
