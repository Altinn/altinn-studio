import {
  getConfigTitleHelpTextKey,
  getConfigTitleKey,
  getDataTypeFromLayoutSetsWithExistingId,
} from './configPanelUtils';

describe('configPanelUtils', () => {
  describe('getConfigTitleKey', () => {
    it('returns data task key when taskType is "data"', () => {
      const key = getConfigTitleKey('data');
      expect(key).toEqual('process_editor.configuration_panel_data_task');
    });

    it('returns confirmation task key when taskType is "confirmation"', () => {
      const key = getConfigTitleKey('confirmation');
      expect(key).toEqual('process_editor.configuration_panel_confirmation_task');
    });

    it('returns feedback task key when taskType is "feedback"', () => {
      const key = getConfigTitleKey('feedback');
      expect(key).toEqual('process_editor.configuration_panel_feedback_task');
    });

    it('returns signing task key when taskType is "signing"', () => {
      const key = getConfigTitleKey('signing');
      expect(key).toEqual('process_editor.configuration_panel_signing_task');
    });
  });

  describe('getConfigTitleHelpTextKey', () => {
    it('returns data helptext key when taskType is "data"', () => {
      const key = getConfigTitleHelpTextKey('data');
      expect(key).toEqual('process_editor.configuration_panel_header_help_text_data');
    });

    it('returns confirmation helptext key when taskType is "confirmation"', () => {
      const key = getConfigTitleHelpTextKey('confirmation');
      expect(key).toEqual('process_editor.configuration_panel_header_help_text_confirmation');
    });

    it('returns feedback helptext key when taskType is "feedback"', () => {
      const key = getConfigTitleHelpTextKey('feedback');
      expect(key).toEqual('process_editor.configuration_panel_header_help_text_feedback');
    });

    it('returns signing helptext key when taskType is "signing"', () => {
      const key = getConfigTitleHelpTextKey('signing');
      expect(key).toEqual('process_editor.configuration_panel_header_help_text_signing');
    });
  });

  describe('getDataTypeFromLayoutSetsWithExistingId', () => {
    const layoutSetId1: string = 'layoutSet1';
    const layoutSetId2: string = 'layoutSet2';
    const layoutSetDataType1: string = 'dataType1';
    const layoutSetDataType2: string = 'dataType2';

    const layoutSets = {
      sets: [
        { id: layoutSetId1, dataType: layoutSetDataType1, tasks: [] },
        { id: layoutSetId2, dataType: layoutSetDataType2, tasks: [] },
      ],
    };

    it('returns existing data model id when layout set id matches', () => {
      const existingDataModelId = getDataTypeFromLayoutSetsWithExistingId(layoutSets, layoutSetId1);
      expect(existingDataModelId).toBe(layoutSetDataType1);
    });

    it('returns undefined when layout set id does not match', () => {
      const existingCustomReceiptLayoutSetId = 'nonExistentLayoutSet';
      const existingDataModelId = getDataTypeFromLayoutSetsWithExistingId(
        layoutSets,
        existingCustomReceiptLayoutSetId,
      );
      expect(existingDataModelId).toBeUndefined();
    });
  });
});
