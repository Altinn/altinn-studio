export const reservedDataTypes = {
  includeAll: 'include-all',
  currentTask: 'current-task',
  refDataAsPdf: 'refDataAsPdf',
};

export const translateToAllAttachments = (includePdf: boolean, onlyCurrentTask: boolean) => {
  const allAttachments: string[] = includePdf ? [reservedDataTypes.includeAll] : [];

  if (onlyCurrentTask) {
    allAttachments.push(reservedDataTypes.currentTask);
  }
  return allAttachments;
};

export const translateToSomeAttachments = (
  includePdf: boolean,
  onlyCurrentTask: boolean,
  selectedAttachments: string[],
) => {
  if (includePdf) {
    selectedAttachments.push(reservedDataTypes.refDataAsPdf);
  }
  if (onlyCurrentTask) {
    selectedAttachments.push(reservedDataTypes.currentTask);
  }
  return selectedAttachments;
};
