/**
 * Preserve attachment order for eFormidling. The selector can return existing IDs in a different
 * order; append only new selections.
 */
export const orderSelectedDataTypes = (
  previousDataTypes: string[],
  selectedDataTypes: string[],
): string[] => [
  ...previousDataTypes.filter((dataType) => selectedDataTypes.includes(dataType)),
  ...selectedDataTypes.filter((dataType) => !previousDataTypes.includes(dataType)),
];
