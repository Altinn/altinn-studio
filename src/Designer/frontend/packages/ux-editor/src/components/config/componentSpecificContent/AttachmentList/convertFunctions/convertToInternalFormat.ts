import { extractCurrentAvailableAttachments, reservedDataTypes } from '../attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from '../types';
import { ArrayUtils } from '@studio/pure-functions';

export const convertExternalToInternalFormat = (
  availableAttachments: AvailableAttachementLists,
  dataTypeIds: string[],
): InternalDataTypesFormat => ({
  includePdf: isPdfSelected(dataTypeIds),
  currentTask: isCurrentTaskSelected(dataTypeIds),
  selectedDataTypes: getSelectedDataTypes(dataTypeIds, availableAttachments),
});

const isPdfSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.refDataAsPdf) ||
  dataTypeIds.includes(reservedDataTypes.includeAll);

const isCurrentTaskSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.currentTask);

const getSelectedDataTypes = (
  dataTypeIds: string[],
  availableAttachments: AvailableAttachementLists,
): string[] => {
  const availableDataTypes = extractCurrentAvailableAttachments(
    isCurrentTaskSelected(dataTypeIds),
    availableAttachments,
  );
  const includeAllDataTypes = shouldIncludeAllDataTypes(dataTypeIds, availableDataTypes);
  const selectedDataTypeIds = ArrayUtils.intersection(dataTypeIds, availableDataTypes);

  return includeAllDataTypes ? availableDataTypes : selectedDataTypeIds;
};

const shouldIncludeAllDataTypes = (
  dataTypeIds: string[],
  availableDataTypes: string[],
): boolean => {
  const selectedDataTypeIds = ArrayUtils.intersection(dataTypeIds, availableDataTypes);
  const allDataTypesSelected = selectedDataTypeIds.length === availableDataTypes.length;
  //In cases when reserved data types are the only ones selected or no attachments (except pdf), we should include all data types
  const noAttachmentsAndNoPdf =
    selectedDataTypeIds.length === 0 && !dataTypeIds.includes(reservedDataTypes.refDataAsPdf);

  return allDataTypesSelected || noAttachmentsAndNoPdf;
};
