import { createSelector } from 'reselect';

import { getInstancePdf, mapInstanceAttachments } from 'src/utils/attachmentsUtils';
import type { IRuntimeState } from 'src/types';
import type { IData } from 'src/types/shared';

const selectDataTypes = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata?.dataTypes;
const selectInstanceData = (state: IRuntimeState) => state.instanceData.instance?.data;
const selectCurrentTaskId = (state: IRuntimeState) => state.instanceData.instance?.process?.currentTask?.elementId;

export const selectDataTypesByIds = (dataTypeIds: string[] | undefined) =>
  createSelector(
    selectDataTypes,
    selectCurrentTaskId,
    selectInstanceData,
    (dataTypes = [], currentTask, instanceData) => {
      const relevantDataTypes = dataTypes?.filter((type) => type.taskId === currentTask);
      return instanceData?.filter((dataElement) => {
        if (dataTypeIds) {
          return dataTypeIds.findIndex((id) => dataElement.dataType === id) > -1;
        }
        return relevantDataTypes.findIndex((type) => dataElement.dataType === type.id) > -1;
      });
    },
  );

export const selectAttachments = (includePDF: boolean = false, dataForTask: IData[] | undefined) =>
  createSelector(selectDataTypes, selectCurrentTaskId, (dataTypes, currentTaskId) => {
    const appLogicDataTypes = dataTypes?.filter((dataType) => dataType.appLogic && dataType.taskId === currentTaskId);
    return includePDF
      ? getInstancePdf(dataForTask)
      : mapInstanceAttachments(dataForTask, appLogicDataTypes?.map((type) => type.id) || []);
  });
