import { useBoundValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { DataModelBinding } from 'nextsrc/libs/form-client/resolveBindings';

/**
 * Reads the display value for a single cell in the repeating group table.
 * Extracts simpleBinding from the child component's dataModelBindings
 * and returns the string representation of the value.
 */
export function useRowCellValue(child: ResolvedCompExternal, parentBinding: string, rowIndex: number): string {
  const bindings = child.dataModelBindings as Record<string, unknown> | undefined;
  const simpleBinding = bindings?.simpleBinding as string | DataModelBinding | undefined;
  const simpleBindingField = simpleBinding ? extractField(simpleBinding) : undefined;

  const { value } = useBoundValue(simpleBinding ?? '', parentBinding, simpleBindingField ? rowIndex : undefined);

  if (!simpleBindingField) {
    return '';
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}
