import { extractCurrentAvailableAttachments, reservedDataTypes } from '../attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from '../types';

export const convertInternalToExternalFormat = (
  availableAttachments: AvailableAttachementLists,
  dataTypeIds: InternalDataTypesFormat,
): string[] => {
  const { currentTask: includeCurrentTask } = dataTypeIds;

  const currentAttachments = extractCurrentAvailableAttachments(
    includeCurrentTask,
    availableAttachments,
  );
  const selectedDataTypesExternalFormat = convertSelectedDataTypes(dataTypeIds, currentAttachments);

  if (includeCurrentTask) {
    selectedDataTypesExternalFormat.push(reservedDataTypes.currentTask);
  }

  return selectedDataTypesExternalFormat;
};

const convertSelectedDataTypes = (
  dataTypeIds: InternalDataTypesFormat,
  currentAttachments: string[],
) => {
  const { includePdf, selectedDataTypes } = dataTypeIds;

  const includeAllAttachments = selectedDataTypes.length === currentAttachments.length;

  return includeAllAttachments
    ? convertAllAttachToExternalFormat(includePdf)
    : convertSomeAttachToExternalFormat(selectedDataTypes, includePdf);
};

const convertAllAttachToExternalFormat = (includePdf: boolean): string[] =>
  includePdf ? [reservedDataTypes.includeAll] : [];

const convertSomeAttachToExternalFormat = (
  selectedDataTypes: string[],
  includePdf: boolean,
): string[] =>
  includePdf ? [...selectedDataTypes, reservedDataTypes.refDataAsPdf] : selectedDataTypes;
