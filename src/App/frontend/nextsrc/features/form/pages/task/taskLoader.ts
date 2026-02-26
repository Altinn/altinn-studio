import type { LoaderFunctionArgs } from 'react-router';

import { DataApi } from 'nextsrc/core/apiClient/dataApi';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { LayoutApi } from 'nextsrc/core/apiClient/layoutApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { formClient } from 'nextsrc/index';

export const taskLoader = async ({ params }: LoaderFunctionArgs) => {
  const { taskId, instanceOwnerPartyId, instanceGuid } = params;

  if (!taskId || !instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Route params missing: taskId, instanceOwnerPartyId, or instanceGuid');
  }

  const layoutSet = GlobalData.layoutSetByTaskId(taskId);

  if (!layoutSet?.id) {
    throw new Error(`No layout set found for task: ${taskId}`);
  }

  const [layoutSettings, layout, instance, dataModelSchema, validationConfig] = await Promise.all([
    LayoutApi.getLayoutSettings(layoutSet.id),
    LayoutApi.getLayout(layoutSet.id),
    InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid }),
    LayoutApi.getDataModelSchema(layoutSet.dataType),
    LayoutApi.getValidationConfig(layoutSet.dataType),
  ]);

  if (!layoutSettings) {
    throw new Error('layoutSettings is undefined');
  }

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
    layoutSettings,
    layout,
    instance,
    dataElement,
    instanceOwnerPartyId,
    instanceGuid,
    dataElementId: dataObjectGuid,
  };
};
