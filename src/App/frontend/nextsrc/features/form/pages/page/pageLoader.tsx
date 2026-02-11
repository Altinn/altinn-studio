import type { LoaderFunctionArgs } from 'react-router-dom';

import { DataApi } from 'nextsrc/core/apiClient/dataApi';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { LayoutApi } from 'nextsrc/core/apiClient/layoutApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { formClient } from 'nextsrc/index';

export const pageLoader = async ({
  params,
}: LoaderFunctionArgs<{ instanceOwnerPartyId: string; instanceGuid: string; taskId: string; pageId: string }>) => {
  const { instanceOwnerPartyId, instanceGuid, pageId, taskId } = params;

  if (!pageId || !taskId || !instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Route params missing');
  }

  const layoutSet = GlobalData.layoutSetByTaskId(taskId);

  if (!layoutSet?.id) {
    throw new Error('No layoutset ID, this is an error');
  }

  const layout = await LayoutApi.getLayout(layoutSet?.id);

  formClient.setLayoutCollection(layout);

  const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });

  if (instance.data.length > 1) {
    throw new Error('this instance has more than one data element, we do not support this yet, please fix');
  }

  const dataObjectGuid = instance.data[0].id;

  if (!dataObjectGuid) {
    throw new Error('No data element, we did not expect this');
  }

  if (!layout) {
    throw new Error('No layout, this is an error');
  }

  const dataElement = await DataApi.getDataObject({ instanceOwnerPartyId, instanceGuid, dataObjectGuid });

  formClient.setFormData(dataElement);

  return { instance, layout, dataElement };
};
