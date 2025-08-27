import {
  getLayoutSetIdValidationErrorKey,
  getLayoutSetNameForCustomReceipt,
  getLayoutSetTypeTranslationKey,
} from 'app-shared/utils/layoutSetsUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { LayoutSetModel } from '../types/api/dto/LayoutSetModel';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from '../constants';

// Test data
const layoutSetName = 'layoutSet';
const taskIdCustomReceipt = 'CustomReceipt';

describe('getLayoutSetNameForCustomReceipt', () => {
  it('should return name of layoutSet if layoutSets includes a set with taskId "CustomReceipt"', () => {
    const layoutSetsWithCustomReceipt: LayoutSets = {
      sets: [{ id: layoutSetName, tasks: [taskIdCustomReceipt] }],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithCustomReceipt)).toBe(layoutSetName);
  });

  it('should return undefined if layoutSets does not include a set with taskId "CustomReceipt"', () => {
    const layoutSetsWithoutCustomReceipt: LayoutSets = {
      sets: [
        {
          id: layoutSetName,
          tasks: ['task_1'],
        },
      ],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithoutCustomReceipt)).toBeUndefined();
  });

  it('should return undefined if layoutSets is undefined', () => {
    const layoutSets = undefined;
    expect(getLayoutSetNameForCustomReceipt(layoutSets)).toBeUndefined();
  });

  it('should return undefined if sets of layoutSets is undefined', () => {
    const layoutSetsWithUndefinedSets: LayoutSets = {
      sets: undefined,
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithUndefinedSets)).toBeUndefined();
  });

  it('should return undefined if layoutSets has an empty list of sets', () => {
    const layoutSetsWithEmptySets: LayoutSets = {
      sets: [],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithEmptySets)).toBeUndefined();
  });

  it('should return undefined if layoutSets has a set with no task ids', () => {
    const layoutSetsWithUndefinedTasks: LayoutSets = {
      sets: [
        {
          id: layoutSetName,
          tasks: null,
        },
      ],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithUndefinedTasks)).toBeUndefined();
  });
});
describe('getLayoutSetIdValidationErrorKey', () => {
  it('should return error message when the user types just one character', () => {
    const newLayoutSetId = 'a';
    expect(getLayoutSetIdValidationErrorKey(newLayoutSetId, { sets: [] })).toBe(
      'process_editor.configuration_panel_custom_receipt_layout_set_name_validation',
    );
  });

  it('should return error message when the user types whitespace', () => {
    const newLayoutSetId = ' ';
    expect(getLayoutSetIdValidationErrorKey(newLayoutSetId, { sets: [] })).toBe(
      'validation_errors.required',
    );
  });

  it('should return error message when the user types an existing layout set name', () => {
    const existingLayoutSetId = 'layoutSetId';
    const layoutSets: LayoutSets = {
      sets: [
        {
          id: existingLayoutSetId,
          tasks: ['task_1'],
        },
      ],
    };
    expect(getLayoutSetIdValidationErrorKey(existingLayoutSetId, layoutSets)).toBe(
      'process_editor.configuration_panel_layout_set_id_not_unique',
    );
  });

  it('should return error message when the user types an existing layout set name (case-insensitive)', () => {
    const existingLayoutSetId = 'layoutSetId';
    const existingLayoutSetIdUpperCase = existingLayoutSetId.toUpperCase();
    const layoutSets: LayoutSets = {
      sets: [
        {
          id: existingLayoutSetId,
          tasks: ['task_1'],
        },
      ],
    };
    expect(getLayoutSetIdValidationErrorKey(existingLayoutSetIdUpperCase, layoutSets)).toBe(
      'process_editor.configuration_panel_layout_set_id_not_unique',
    );
  });

  it('should return null when the user types the same name as the original name', () => {
    const existingLayoutSetId = 'layoutSetId';
    expect(
      getLayoutSetIdValidationErrorKey(existingLayoutSetId, { sets: [] }, existingLayoutSetId),
    ).toBe(null);
  });
});
describe('getLayoutSetTypeTranslationKey', () => {
  it('should return "ux_editor.subform" when layoutSet type is "subform"', () => {
    const layoutSet: LayoutSetModel = {
      id: 'test',
      dataType: null,
      type: 'subform',
      task: { id: null, type: null },
    };
    expect(getLayoutSetTypeTranslationKey(layoutSet)).toBe('ux_editor.subform');
  });

  it('should return "process_editor.configuration_panel_custom_receipt_accordion_header" when layoutSet task id is "CustomReceipt"', () => {
    const layoutSet: LayoutSetModel = {
      id: 'test',
      dataType: null,
      type: null,
      task: { id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT, type: '' },
    };
    expect(getLayoutSetTypeTranslationKey(layoutSet)).toBe(
      'process_editor.configuration_panel_custom_receipt_accordion_header',
    );
  });
});
