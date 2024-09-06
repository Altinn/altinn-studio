import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';

export const getLayoutSetNameForCustomReceipt = (layoutSets: LayoutSets): string | undefined => {
  return layoutSets?.sets?.find((set) => set.tasks?.includes(PROTECTED_TASK_NAME_CUSTOM_RECEIPT))
    ?.id;
};

export const getLayoutSetIdValidationErrorKey = (
  newLayoutSetId: string,
  layoutSets: LayoutSets,
  oldLayoutSetId?: string,
): string => {
  if (oldLayoutSetId === newLayoutSetId) return null;
  if (!newLayoutSetId || newLayoutSetId.trim() === '') return 'validation_errors.required';
  if (!validateLayoutNameAndLayoutSetName(newLayoutSetId)) return 'ux_editor.pages_error_format';
  if (newLayoutSetId.length === 1)
    return 'process_editor.configuration_panel_custom_receipt_layout_set_name_validation';
  if (layoutSets.sets.some((set) => set.id === newLayoutSetId))
    return 'process_editor.configuration_panel_layout_set_id_not_unique';
  return null;
};
