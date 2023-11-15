import { createSelector } from 'reselect';

import { DataTypeReference, filterDisplayAttachments, filterDisplayPdfAttachments } from 'src/utils/attachmentsUtils';
import type { IRuntimeState } from 'src/types';
import type { IData, IInstance, IProcess } from 'src/types/shared';

const selectDataTypes = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata?.dataTypes;

export const selectDataTypesByIds = (
  dataTypeIds: string[] | undefined,
  instance: IInstance | undefined,
  process: IProcess | undefined,
) =>
  createSelector(selectDataTypes, (dataTypes = []) => {
    const currentTaskId = process?.currentTask?.elementId;
    const relevantDataTypes = dataTypes.filter((type) => !type.taskId || type.taskId === currentTaskId);
    const useSpecificDataTypeIds = dataTypeIds && !dataTypeIds?.includes(DataTypeReference.IncludeAll);
    const dataElements = instance?.data || [];

    return dataElements.filter((dataElement) =>
      useSpecificDataTypeIds
        ? dataTypeIds.includes(dataElement.dataType)
        : relevantDataTypes.some((type) => type.id === dataElement.dataType),
    );
  });

export const selectAttachments = (dataForTask: IData[], includePdf: boolean, process: IProcess | undefined) =>
  createSelector(selectDataTypes, (dataTypes) => {
    const currentTaskId = process?.currentTask?.elementId;
    const defaultElementIds =
      dataTypes?.filter((dataType) => dataType.appLogic && dataType.taskId === currentTaskId).map((type) => type.id) ||
      [];

    const pdfAttachments = includePdf ? filterDisplayPdfAttachments(dataForTask) : [];
    const otherAttachments = filterDisplayAttachments(dataForTask, defaultElementIds);

    return [...pdfAttachments, ...otherAttachments];
  });
