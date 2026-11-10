import type { CompSubformSerialized } from '@app/layout-contract/generated/components/Subform/serialized.generated';

export type TableColumn = CompSubformSerialized['tableColumns'][number];

export function getTableColumnCellValue({ cellContent }: TableColumn): string {
  if ('query' in cellContent) return cellContent.query;
  return typeof cellContent.value === 'string'
    ? cellContent.value
    : JSON.stringify(cellContent.value);
}
