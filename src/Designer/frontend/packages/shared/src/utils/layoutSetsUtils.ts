import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';
import type { LayoutSetModel } from '../types/api/dto/LayoutSetModel';
import type { UiFolderLayoutSetModel } from '../types/api/dto/UiFolderLayoutSetModel';
import { StringUtils } from '@studio/pure-functions';

export type LayoutSetResponse = LayoutSetModel | UiFolderLayoutSetModel;

export const getLayoutSetNameForCustomReceipt = (
  layoutSets: LayoutSetResponse[],
): string | undefined => {
  return layoutSets?.find((set) => getTaskId(set) === PROTECTED_TASK_NAME_CUSTOM_RECEIPT)?.id;
};

export const getLayoutSetIdValidationErrorKey = (
  newLayoutSetId: string,
  layoutSets: LayoutSetResponse[],
  oldLayoutSetId?: string,
): string => {
  if (oldLayoutSetId === newLayoutSetId) return null;
  if (!newLayoutSetId || newLayoutSetId.trim() === '') return 'validation_errors.required';
  if (newLayoutSetId.length === 1)
    return 'process_editor.configuration_panel_custom_receipt_layout_set_name_validation';
  if (!validateLayoutNameAndLayoutSetName(newLayoutSetId)) return 'validation_errors.name_invalid';
  if (layoutSets.some((set) => StringUtils.areCaseInsensitiveEqual(set.id, newLayoutSetId)))
    return 'process_editor.configuration_panel_layout_set_id_not_unique';
  return null;
};

export const getLayoutSetTypeTranslationKey = (
  layoutSet: LayoutSetModel | UiFolderLayoutSetModel,
): string => {
  if (layoutSet.type === 'subform') return 'ux_editor.subform';

  const taskType = getTaskType(layoutSet);

  if (taskType === '' && getTaskId(layoutSet) === PROTECTED_TASK_NAME_CUSTOM_RECEIPT) {
    return 'process_editor.configuration_panel_custom_receipt_accordion_header';
  }
  if (taskType) {
    return `process_editor.task_type.${taskType}`;
  }

  return '';
};

const getTaskType = (layoutSet: LayoutSetResponse): string | undefined => {
  if ('task' in layoutSet) {
    return layoutSet.task?.type;
  }

  if ('taskType' in layoutSet) {
    return layoutSet.taskType;
  }
  return '';
};

export const getTaskId = (layoutSet: LayoutSetResponse): string | undefined => {
  if ('task' in layoutSet) {
    return layoutSet.task?.id;
  }

  return layoutSet.id;
};
