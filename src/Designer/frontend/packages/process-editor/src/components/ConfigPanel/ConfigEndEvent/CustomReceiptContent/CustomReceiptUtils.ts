import type { CustomReceiptType } from '@altinn/process-editor/types/CustomReceiptType';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import type { AppVersion } from 'app-shared/types/AppVersion';
import {
  isVersionEqualOrGreater,
  MINIMUM_APPLIB_VERSION_FOR_FIXED_CUSTOM_RECEIPT_NAME,
} from '../../../../utils/processEditorUtils/processEditorUtils';

/**
 * From v9 the custom receipt's layout set is named after its task, so the name is fixed and no longer
 * user-editable.
 */
export const hasFixedCustomReceiptName = (appVersion?: AppVersion): boolean =>
  isVersionEqualOrGreater(
    appVersion?.backendVersion ?? '',
    MINIMUM_APPLIB_VERSION_FOR_FIXED_CUSTOM_RECEIPT_NAME,
  );

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
