import { getCurrentAttachments, reservedDataTypes } from './attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';
import { ArrayUtils } from '@studio/pure-functions';

export const convertExternalToInternalFormat = (
  availableAttachments: AvailableAttachementLists,
  dataTypeIds: string[],
): InternalDataTypesFormat => {
  const dataTypesWithoutReservedTypes = ArrayUtils.intersection(
    dataTypeIds,
    Object.values(reservedDataTypes),
    false,
  );
  const includeCurrentTask = dataTypeIds.includes(reservedDataTypes.currentTask);
  const currentAttachments = getCurrentAttachments(includeCurrentTask, availableAttachments);
  const includeAllAttachments = isAllAttachmentsSelectedExternal(
    dataTypeIds,
    dataTypesWithoutReservedTypes,
    currentAttachments,
    includeCurrentTask,
  );

  return {
    includePdf: isPdfSelected(dataTypeIds),
    currentTask: includeCurrentTask,
    selectedDataTypes: includeAllAttachments ? currentAttachments : dataTypesWithoutReservedTypes,
  };
};

const isPdfSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.refDataAsPdf) ||
  dataTypeIds.includes(reservedDataTypes.includeAll);

const isAllAttachmentsSelectedExternal = (
  dataTypeIds: string[],
  dataTypesWithoutReservedTypes: string[],
  attachments: string[],
  includeCurrentTask: boolean,
): boolean => {
  const allAttachmentsSelected = dataTypesWithoutReservedTypes.length === attachments.length;
  const includesIncludeAll = dataTypeIds.includes(reservedDataTypes.includeAll);
  const noAttachments = dataTypeIds.length === 0;
  const onlyCurrentTask = includeCurrentTask && dataTypeIds.length === 1;

  return includesIncludeAll || allAttachmentsSelected || noAttachments || onlyCurrentTask;
};
