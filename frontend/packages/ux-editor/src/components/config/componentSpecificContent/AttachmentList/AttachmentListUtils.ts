export const reservedDataTypes = {
  includeAll: 'include-all',
  currentTask: 'current-task',
  refDataAsPdf: 'ref-data-as-pdf',
};

type convertAttachmentsToBackendArgs = {
  includeAllAttachments: boolean;
  includePdf: boolean;
  onlyCurrentTask: boolean;
  selectedAttachments: string[];
};

export const convertAttachmentsToBackend = (args: convertAttachmentsToBackendArgs) => {
  const { includeAllAttachments, includePdf, onlyCurrentTask, selectedAttachments } = args;
  return includeAllAttachments
    ? convertAllToBackend(includePdf, onlyCurrentTask)
    : convertSomeToBackend(includePdf, onlyCurrentTask, selectedAttachments);
};

const convertAllToBackend = (includePdf: boolean, onlyCurrentTask: boolean) => {
  const allAttachments: string[] = includePdf ? [reservedDataTypes.includeAll] : [];

  if (onlyCurrentTask) {
    allAttachments.push(reservedDataTypes.currentTask);
  }
  return allAttachments;
};

const convertSomeToBackend = (
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
