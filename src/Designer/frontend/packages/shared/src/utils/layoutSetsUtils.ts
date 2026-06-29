import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';
import type { LayoutSetModel } from '../types/api/dto/LayoutSetModel';
import type { UiFolderLayoutSetModel } from '../types/api/dto/UiFolderLayoutSetModel';
import { StringUtils } from '@studio/pure-functions';

/**
 * Returns the task a layout set is connected to, normalizing across app-frontend versions.
 * In v4 the connection is sent as `taskId`. In v9 `taskId` is absent and the task id is the
 * layout set id itself.
 */
export const getTaskIdForLayoutSet = (layoutSet: LayoutSetConfig): string =>
  layoutSet.taskId ?? layoutSet.id;

export const getLayoutSetNameForCustomReceipt = (layoutSets: LayoutSets): string | undefined => {
  return layoutSets?.find(
    (set) => getTaskIdForLayoutSet(set) === PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
  )?.id;
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
  if (layoutSets?.some((set) => StringUtils.areCaseInsensitiveEqual(set.id, newLayoutSetId)))
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

const getTaskType = (layoutSet: LayoutSetModel | UiFolderLayoutSetModel): string | undefined => {
  if ('task' in layoutSet) {
    return layoutSet.task?.type;
  }

  if ('taskType' in layoutSet) {
    return layoutSet.taskType;
  }
  return '';
};

const getTaskId = (layoutSet: LayoutSetModel | UiFolderLayoutSetModel): string | undefined => {
  if ('task' in layoutSet) {
    return layoutSet.task?.id;
  }

  return layoutSet.id;
};
