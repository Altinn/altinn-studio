import type { CustomReceiptType } from '@altinn/process-editor/types/CustomReceiptType';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

/**
 * The custom receipt's layout set is named after its task, so the name is fixed and not user-editable.
 */
export const createNewCustomReceipt = (customReceipt: CustomReceiptType): LayoutSetConfig => ({
  id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
  dataType: customReceipt.dataModelId,
});
