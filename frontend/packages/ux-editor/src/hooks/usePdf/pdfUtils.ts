export const getComponentsInCurrentLayoutToExcludeFromPdf = (
  componentIdsInCurrentLayout: string[],
  allComponentsToExcludeInPdf: string[],
): string[] => {
  return componentIdsInCurrentLayout.filter((component) =>
    allComponentsToExcludeInPdf.includes(component),
  );
};

export const getRemainingComponentsToExcludeFromOtherLayouts = (
  allComponentsToExcludeInPdf: string[],
  componentIdsInCurrentLayout: string[],
): string[] => {
  return allComponentsToExcludeInPdf.filter(
    (component) => !componentIdsInCurrentLayout.includes(component),
  );
};
