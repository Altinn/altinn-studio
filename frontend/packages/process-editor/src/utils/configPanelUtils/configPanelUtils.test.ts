import { getConfigTitleHelpTextKey, getConfigTitleKey } from './configPanelUtils';

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
});
