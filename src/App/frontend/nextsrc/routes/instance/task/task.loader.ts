import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { DataApi } from 'nextsrc/core/api-client/data.api';
import { InstanceApi } from 'nextsrc/core/api-client/instance.api';
import { LayoutApi } from 'nextsrc/core/api-client/layout.api';
import { GlobalData } from 'nextsrc/core/globalData';
import { formClient } from 'nextsrc/index';
import { routeBuilders } from 'nextsrc/routesBuilder';

import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IData } from 'src/types/shared';

export type TaskLoaderData = DataTaskLoaderData | NonDataTaskLoaderData;

export interface DataTaskLoaderData {
  taskType: 'data';
  layoutSettings: ILayoutSettings;
  layout: Awaited<ReturnType<typeof LayoutApi.getLayout>>;
  instance: Awaited<ReturnType<typeof InstanceApi.getInstance>>;
  instanceOwnerPartyId: string;
  instanceGuid: string;
  dataElementIds: Record<string, string>;
}

export function isDataTask(data: TaskLoaderData): data is DataTaskLoaderData {
  return data.taskType === 'data';
}

export interface NonDataTaskLoaderData {
  taskType: string;
  instanceOwnerPartyId: string;
  instanceGuid: string;
}

/**
 * Scans all layout components for unique dataType values referenced in bindings.
 * String bindings are assumed to use the defaultDataType.
 */
function collectReferencedDataTypes(layout: ILayoutCollection, defaultDataType: string): Set<string> {
  const dataTypes = new Set<string>([defaultDataType]);

  for (const page of Object.values(layout)) {
    const components = page?.data?.layout ?? [];
    for (const component of components) {
      const bindings = (component as unknown as Record<string, unknown>).dataModelBindings;
      if (bindings && typeof bindings === 'object') {
        for (const binding of Object.values(bindings as Record<string, unknown>)) {
          if (typeof binding === 'object' && binding !== null && 'dataType' in binding) {
            const dt = (binding as { dataType: unknown }).dataType;
            if (typeof dt === 'string') {
              dataTypes.add(dt);
            }
          }
        }
      }
    }
  }
  return dataTypes;
}

/**
 * Builds a mapping from dataType to dataElementId using instance data elements.
 */
function buildDataElementMap(instanceData: IData[], dataTypes: Set<string>): Record<string, string> {
  const dataElementIds: Record<string, string> = {};

  for (const dataType of dataTypes) {
    const element = instanceData.find((d) => d.dataType === dataType);
    if (element) {
      dataElementIds[dataType] = element.id;
    }
  }

  return dataElementIds;
}

/**
 * Fetches schema, validation config, and data for each data type in parallel.
 * Registers everything with the formClient.
 */
async function loadDataModels(
  dataTypes: Set<string>,
  dataElementIds: Record<string, string>,
  instanceOwnerPartyId: string,
  instanceGuid: string,
): Promise<void> {
  const loadPromises = [...dataTypes].map(async (dataType) => {
    const dataElementId = dataElementIds[dataType];
    if (!dataElementId) {
      return;
    }

    const [schema, validationConfig, data] = await Promise.all([
      LayoutApi.getDataModelSchema(dataType),
      LayoutApi.getValidationConfig(dataType),
      DataApi.getDataObject({ instanceOwnerPartyId, instanceGuid, dataObjectGuid: dataElementId }),
    ]);

    formClient.setDataModelSchema(schema, dataType);
    formClient.setExpressionValidationConfig(validationConfig, dataType);
    formClient.setFormData(data, dataType);
  });

  await Promise.all(loadPromises);
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

  const defaultDataType = layoutSettings.defaultDataType;

  if (!defaultDataType) {
    throw new Error(`No defaultDataType configured for task: ${taskId}`);
  }

  const layout = await LayoutApi.getLayout(taskId);

  formClient.setDefaultDataType(defaultDataType);
  formClient.setLayoutCollection(layout);

  if ('order' in layoutSettings.pages) {
    formClient.setPageOrder(layoutSettings.pages.order);
  }

  const referencedDataTypes = collectReferencedDataTypes(layout, defaultDataType);
  const dataElementIds = buildDataElementMap(instance.data, referencedDataTypes);
  await loadDataModels(referencedDataTypes, dataElementIds, instanceOwnerPartyId, instanceGuid);

  return {
    taskType: 'data',
    layoutSettings,
    layout,
    instance,
    instanceOwnerPartyId,
    instanceGuid,
    dataElementIds,
  };
};
