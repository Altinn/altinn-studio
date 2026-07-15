import type { CustomReceiptType } from '@altinn/process-editor/types/CustomReceiptType';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export const createNewCustomReceipt = (
  customReceipt: CustomReceiptType,
  hasFixedName: boolean,
): LayoutSetConfig => {
  if (!hasFixedName) {
    return {
      id: customReceipt.layoutSetId,
      dataType: customReceipt.dataModelId,
      taskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    };
  }

  return {
    id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    dataType: customReceipt.dataModelId,
  };
};
