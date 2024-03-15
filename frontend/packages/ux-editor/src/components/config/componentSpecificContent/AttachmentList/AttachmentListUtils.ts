import { ArrayUtils } from '@studio/pure-functions';

export const reservedDataTypes = {
  includeAll: 'include-all',
  currentTask: 'current-task',
  refDataAsPdf: 'ref-data-as-pdf',
};

export type AttachmentsFormat = {
  attachmentsCurrentTasks: string[];
  attachmentsAllTasks: string[];
};

export type InternalDataTypesFormat = {
  currentTask: boolean;
  includePdf: boolean;
  selectedDataTypes: string[];
};

export type ConvertInternalToExternalFormat = {
  availableAttachments: AttachmentsFormat;
  dataTypeIds: InternalDataTypesFormat;
};

export const convertInternalToExternalFormat = ({
  availableAttachments,
  dataTypeIds,
}: ConvertInternalToExternalFormat): string[] => {
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

type ConvertExternalToInternalFormat = {
  availableAttachments: AttachmentsFormat;
  dataTypeIds: string[];
};

export const convertExternalToInternalFormat = ({
  availableAttachments,
  dataTypeIds,
}: ConvertExternalToInternalFormat) => {
  const dataTypesWithoutReservedTypes = ArrayUtils.intersection(
    dataTypeIds,
    Object.values(reservedDataTypes),
    false,
  );
  const includeCurrentTask = dataTypeIds.includes(reservedDataTypes.currentTask);

  const currentAttachments = getCurrentAttachments(includeCurrentTask, availableAttachments);

  const includeAllAttachments = isAllAttachmentsSelected(
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

const getCurrentAttachments = (
  includeCurrentTask: boolean,
  attachments: AttachmentsFormat,
): string[] =>
  includeCurrentTask ? attachments.attachmentsCurrentTasks : attachments.attachmentsAllTasks;

const isPdfSelected = (dataTypeIds: string[]): boolean =>
  dataTypeIds.includes(reservedDataTypes.refDataAsPdf) ||
  dataTypeIds.includes(reservedDataTypes.includeAll);

const isAllAttachmentsSelected = (
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

export const selectionIsValid = ({
  includePdf,
  selectedDataTypes,
}: InternalDataTypesFormat): boolean => {
  return includePdf || selectedDataTypes.length > 0;
};
