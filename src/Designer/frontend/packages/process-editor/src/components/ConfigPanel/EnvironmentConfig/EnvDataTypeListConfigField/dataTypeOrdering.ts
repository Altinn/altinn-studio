/**
 * The selected data type ids in the order they already had, with newly chosen ones appended.
 * eFormidling ships the attachments in file order, and the multi-select does not promise to
 * report its selection in any particular order.
 */
export const orderSelectedDataTypes = (
  previousDataTypes: string[],
  selectedDataTypes: string[],
): string[] => [
  ...previousDataTypes.filter((dataType) => selectedDataTypes.includes(dataType)),
  ...selectedDataTypes.filter((dataType) => !previousDataTypes.includes(dataType)),
];
