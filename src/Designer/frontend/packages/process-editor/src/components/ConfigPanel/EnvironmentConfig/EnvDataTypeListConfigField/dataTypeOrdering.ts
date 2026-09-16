/**
 * The selected data type ids, in the order they already had, with newly chosen ones appended.
 *
 * eFormidling ships the attachments in the order the file lists them - the order
 * `AltinnEFormidlingConfiguration.GetDataTypesForEnvironment` builds with `AddRange` - so the order
 * is part of what the panel must not change on its own. The multi-select reports whatever order it
 * likes: `StudioSuggestion` wraps Designsystemet's `EXPERIMENTAL_Suggestion`, and the prefix is the
 * library saying its behavior is not a contract. Rather than trust it either way, put the order
 * back here, where it is a function of its arguments and can be tested.
 */
export const orderSelectedDataTypes = (
  previousDataTypes: string[],
  selectedDataTypes: string[],
): string[] => [
  ...previousDataTypes.filter((dataType) => selectedDataTypes.includes(dataType)),
  ...selectedDataTypes.filter((dataType) => !previousDataTypes.includes(dataType)),
];
