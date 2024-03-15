import { getCurrentAttachments, reservedDataTypes } from './attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';

export const convertInternalToExternalFormat = (
  availableAttachments: AvailableAttachementLists,
  dataTypeIds: InternalDataTypesFormat,
): string[] => {
  const { selectedDataTypes, includePdf, currentTask: includeCurrentTask } = dataTypeIds;

  const currentAttachments = getCurrentAttachments(includeCurrentTask, availableAttachments);

  const includeAllAttachments = selectedDataTypes.length === currentAttachments.length;

  const dataTypeIdsExternalFormat = includeAllAttachments
    ? convertAllAttachToExternalFormat(includePdf)
    : convertSomeAttachToExternalFormat(selectedDataTypes, includePdf);

  if (includeCurrentTask) {
    dataTypeIdsExternalFormat.push(reservedDataTypes.currentTask);
  }

  return dataTypeIdsExternalFormat;
};

const convertAllAttachToExternalFormat = (includePdf: boolean): string[] =>
  includePdf ? [reservedDataTypes.includeAll] : [];

const convertSomeAttachToExternalFormat = (
  selectedDataTypes: string[],
  includePdf: boolean,
): string[] =>
  includePdf ? [...selectedDataTypes, reservedDataTypes.refDataAsPdf] : selectedDataTypes;
