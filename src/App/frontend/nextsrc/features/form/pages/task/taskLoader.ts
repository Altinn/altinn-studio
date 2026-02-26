import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { DataApi } from 'nextsrc/core/apiClient/dataApi';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { LayoutApi } from 'nextsrc/core/apiClient/layoutApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { formClient } from 'nextsrc/index';
import { routeBuilders } from 'nextsrc/routesBuilder';

import type { ILayoutSettings } from 'src/layout/common.generated';

export type TaskLoaderData = DataTaskLoaderData | NonDataTaskLoaderData;

export interface DataTaskLoaderData {
  taskType: 'data';
  layoutSettings: ILayoutSettings;
  layout: Awaited<ReturnType<typeof LayoutApi.getLayout>>;
  instance: Awaited<ReturnType<typeof InstanceApi.getInstance>>;
  dataElement: Awaited<ReturnType<typeof DataApi.getDataObject>>;
  instanceOwnerPartyId: string;
  instanceGuid: string;
  dataElementId: string;
}

export function isDataTask(data: TaskLoaderData): data is DataTaskLoaderData {
  return data.taskType === 'data';
}

export interface NonDataTaskLoaderData {
  taskType: string;
  instanceOwnerPartyId: string;
  instanceGuid: string;
}

export const taskLoader = async ({ params }: LoaderFunctionArgs): Promise<TaskLoaderData> => {
  const { taskId, instanceOwnerPartyId, instanceGuid } = params;

  if (!taskId || !instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Route params missing: taskId, instanceOwnerPartyId, or instanceGuid');
  }

  const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });

  if (instance.process.ended || !instance.process.currentTask) {
    throw redirect(routeBuilders.processEnd({ instanceOwnerPartyId, instanceGuid }));
  }

  const altinnTaskType = instance.process.currentTask.altinnTaskType;

  if (altinnTaskType !== 'data') {
    return { taskType: altinnTaskType, instanceOwnerPartyId, instanceGuid };
  }

  const layoutSettings = GlobalData.ui.folders[taskId];

  if (!layoutSettings) {
    throw new Error(`No UI folder found for task: ${taskId}`);
  }

  const dataType = layoutSettings.defaultDataType;

  if (!dataType) {
    throw new Error(`No defaultDataType configured for task: ${taskId}`);
  }

  const [layout, dataModelSchema, validationConfig] = await Promise.all([
    LayoutApi.getLayout(taskId),
    LayoutApi.getDataModelSchema(dataType),
    LayoutApi.getValidationConfig(dataType),
  ]);

  if (instance.data.length < 1) {
    throw new Error('No data element found on instance');
  }

  if (instance.data.length > 1) {
    throw new Error('Multiple data elements not supported yet');
  }

  const dataObjectGuid = instance.data[0].id;

  if (!dataObjectGuid) {
    throw new Error('Data element has no ID');
  }

  formClient.setDataModelSchema(dataModelSchema);
  formClient.setLayoutCollection(layout);
  formClient.setExpressionValidationConfig(validationConfig);

  if ('order' in layoutSettings.pages) {
    formClient.setPageOrder(layoutSettings.pages.order);
  }

  const dataElement = await DataApi.getDataObject({ instanceOwnerPartyId, instanceGuid, dataObjectGuid });
  formClient.setFormData(dataElement);

  return {
    taskType: 'data',
    layoutSettings,
    layout,
    instance,
    dataElement,
    instanceOwnerPartyId,
    instanceGuid,
    dataElementId: dataObjectGuid,
  };
};
