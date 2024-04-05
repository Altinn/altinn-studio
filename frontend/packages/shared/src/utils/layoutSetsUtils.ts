import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';

export const getLayoutSetNameForCustomReceipt = (layoutSets: LayoutSets): string | undefined => {
  return layoutSets?.sets?.find((set) => set.tasks.includes(PROTECTED_TASK_NAME_CUSTOM_RECEIPT))
    ?.id;
};

export const getLayoutSetIdValidationErrorKey = (
  layoutSets: LayoutSets,
  oldLayoutSetId: string,
  newLayoutSetId: string,
): string => {
  if (oldLayoutSetId === newLayoutSetId) return null;
  if (!validateLayoutNameAndLayoutSetName(newLayoutSetId)) return 'ux_editor.pages_error_format';
  if (!newLayoutSetId) return 'validation_errors.required';
  if (layoutSets.sets.some((set) => set.id === newLayoutSetId))
    return 'process_editor.configuration_panel_layout_set_id_not_unique';
  return null;
};
