import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';
import type { LayoutSetModel } from '../types/api/dto/LayoutSetModel';
import { StringUtils } from 'libs/studio-pure-functions/src';

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
  if (newLayoutSetId.length === 1)
    return 'process_editor.configuration_panel_custom_receipt_layout_set_name_validation';
  if (!validateLayoutNameAndLayoutSetName(newLayoutSetId)) return 'validation_errors.name_invalid';
  if (layoutSets.sets.some((set) => StringUtils.areCaseInsensitiveEqual(set.id, newLayoutSetId)))
    return 'process_editor.configuration_panel_layout_set_id_not_unique';
  return null;
};

export const getLayoutSetTypeTranslationKey = (layoutSet: LayoutSetModel): string => {
  if (layoutSet.type === 'subform') return 'ux_editor.subform';
  if (layoutSet.task?.type === '' && layoutSet.task?.id === PROTECTED_TASK_NAME_CUSTOM_RECEIPT) {
    return 'process_editor.configuration_panel_custom_receipt_accordion_header';
  }
  if (layoutSet.task?.type) {
    return `process_editor.task_type.${layoutSet.task.type}`;
  }

  return '';
};
