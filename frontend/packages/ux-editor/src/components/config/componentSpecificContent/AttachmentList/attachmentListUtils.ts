import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';

export const reservedDataTypes = {
  includeAll: 'include-all',
  currentTask: 'current-task',
  refDataAsPdf: 'ref-data-as-pdf',
};

export const extractCurrentAvailableAttachments = (
  includeCurrentTask: boolean,
  attachments: AvailableAttachementLists,
): string[] =>
  includeCurrentTask ? attachments.attachmentsCurrentTasks : attachments.attachmentsAllTasks;

export const isSelectionValid = ({
  includePdf,
  selectedDataTypes,
}: InternalDataTypesFormat): boolean => {
  return includePdf || selectedDataTypes.length > 0;
};
