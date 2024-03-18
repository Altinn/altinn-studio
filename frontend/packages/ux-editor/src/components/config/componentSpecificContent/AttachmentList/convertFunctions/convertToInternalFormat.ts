import { getCurrentAttachments, reservedDataTypes } from '../attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from '../types';
import { ArrayUtils } from '@studio/pure-functions';

export const convertExternalToInternalFormat = (
  availableAttachments: AvailableAttachementLists,
  dataTypeIds: string[],
): InternalDataTypesFormat => {
  const convertedSelectedDataTypes = getSelectedDataTypes(dataTypeIds, availableAttachments);

  return {
    includePdf: isPdfSelected(dataTypeIds),
    currentTask: isCurrentTaskSelected(dataTypeIds),
    selectedDataTypes: convertedSelectedDataTypes,
  };
};

const isPdfSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.refDataAsPdf) ||
  dataTypeIds.includes(reservedDataTypes.includeAll);

const isCurrentTaskSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.currentTask);

const isIncludeAllSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.includeAll);

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
  const allDataTypesSelected =
    removeReservedTypes(dataTypeIds).length === availableDataTypes.length;
  const includesIncludeAll = isIncludeAllSelected(dataTypeIds);
  const noAttachments = dataTypeIds.length === 0;
  const onlyCurrentTask = isCurrentTaskSelected(dataTypeIds) && dataTypeIds.length === 1;

  return includesIncludeAll || allDataTypesSelected || noAttachments || onlyCurrentTask;
};
