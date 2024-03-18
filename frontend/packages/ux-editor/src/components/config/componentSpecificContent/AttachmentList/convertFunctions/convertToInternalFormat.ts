import { getCurrentAttachments, reservedDataTypes } from '../AttachmentListUtils';
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
  const availableDataTypes = getCurrentAttachments(
    isCurrentTaskSelected(dataTypeIds),
    availableAttachments,
  );
  const includeAllDataTypes = shouldIncludeAllDataTypes(dataTypeIds, availableDataTypes);

  return includeAllDataTypes ? availableDataTypes : removeReservedTypes(dataTypeIds);
};

const removeReservedTypes = (dataTypeIds: string[]): string[] =>
  ArrayUtils.intersection(dataTypeIds, Object.values(reservedDataTypes), false);

const shouldIncludeAllDataTypes = (
  dataTypeIds: string[],
  availableDataTypes: string[],
): boolean => {
  const selectedDataTypeIds = removeReservedTypes(dataTypeIds);
  const allDataTypesSelected = selectedDataTypeIds.length === availableDataTypes.length;
  const noAttachments = selectedDataTypeIds.length === 0;

  return allDataTypesSelected || noAttachments;
};
