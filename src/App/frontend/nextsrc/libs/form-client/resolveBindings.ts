import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

/**
 * Extracts the field path string from a binding value that may be
 * either a plain string or an IDataModelReference ({ dataType, field }).
 */
export function extractField(binding: unknown): string {
  if (typeof binding === 'string') {
    return binding;
  }
  if (typeof binding === 'object' && binding !== null && 'field' in binding) {
    return (binding as { field: string }).field;
  }
  return String(binding ?? '');
}

/**
 * Inserts [rowIndex] into a field path right after the groupField prefix.
 *
 * Examples (groupField="people", rowIndex=0):
 *   "people"              → "people[0]"
 *   "people.name"         → "people[0].name"
 *   "people.addresses"    → "people[0].addresses"
 *   "unrelated.field"     → "unrelated.field"  (unchanged)
 */
function resolveField(field: string, groupField: string, rowIndex: number): string {
  const indexed = `${groupField}[${rowIndex}]`;
  if (field === groupField) {
    return indexed;
  }
  if (field.startsWith(`${groupField}.`)) {
    return indexed + field.slice(groupField.length);
  }
  return field;
}

/**
 * Resolves a single binding value, handling both string paths
 * and IDataModelReference objects ({ dataType, field }).
 */
function resolveBindingValue(value: unknown, groupField: string, rowIndex: number): unknown {
  if (typeof value === 'string') {
    return resolveField(value, groupField, rowIndex);
  }
  if (typeof value === 'object' && value !== null && 'field' in value) {
    const ref = value as { field: string };
    return { ...ref, field: resolveField(ref.field, groupField, rowIndex) };
  }
  return value;
}

/**
 * Resolves all binding values in a dataModelBindings record.
 */
function resolveBindings(
  bindings: Record<string, unknown>,
  groupField: string,
  rowIndex: number,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bindings)) {
    resolved[key] = resolveBindingValue(value, groupField, rowIndex);
  }
  return resolved;
}

/**
 * Returns a new array of children with all their dataModelBindings
 * resolved for the given group row.
 */
export function resolveChildBindings(
  children: ResolvedCompExternal[],
  groupField: string,
  rowIndex: number,
): ResolvedCompExternal[] {
  return children.map((child) => {
    let resolved = child;
    if (child.dataModelBindings) {
      const bindings = resolveBindings(child.dataModelBindings as Record<string, unknown>, groupField, rowIndex);
      resolved = { ...resolved, dataModelBindings: bindings } as ResolvedCompExternal;
    }
    if (child.children) {
      resolved = { ...resolved, children: resolveChildBindings(child.children, groupField, rowIndex) };
    }
    return resolved;
  });
}
