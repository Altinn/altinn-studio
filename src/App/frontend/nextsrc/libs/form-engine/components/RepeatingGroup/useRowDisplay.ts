import { useBoundValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

/**
 * Reads the display value for a single cell in the repeating group table.
 * Extracts simpleBinding from the child component's dataModelBindings
 * and returns the string representation of the value.
 */
export function useRowCellValue(
  child: ResolvedCompExternal,
  parentBinding: string,
  rowIndex: number,
): string {
  const bindings = child.dataModelBindings as Record<string, unknown> | undefined;
  const simpleBinding = bindings?.simpleBinding ? extractField(bindings.simpleBinding) : undefined;

  const { value } = useBoundValue(simpleBinding ?? '', parentBinding, simpleBinding ? rowIndex : undefined);

  if (!simpleBinding) {
    return '';
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}
