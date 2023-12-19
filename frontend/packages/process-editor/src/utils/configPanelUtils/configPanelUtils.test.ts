import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import {
  filterOutRefDataAsPdf,
  getApplicationMetadataWithUpdatedDataTypes,
  getConfigTitleHelpTextKey,
  getConfigTitleKey,
  getSelectedDataTypes,
  getValidDataTypeIdsAndTaskIds,
  mapDataTypesToDataTypeIdAndTaskIds,
} from './configPanelUtils';
import { DataTypeIdAndTaskId } from '../../types/DataTypeIdAndTaskId';
import {
  mockApplicationMetadata,
  mockDataTypeId1,
  mockDataTypeTaskId1,
  mockDataTypes,
} from '../../mocks/applicationMetadataMock';

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

  describe('getValidDataTypeIdsAndTaskIds', () => {
    it('returns empty array if applicationMetadata.dataTypes is falsy', () => {
      const result = getValidDataTypeIdsAndTaskIds({
        ...mockApplicationMetadata,
        dataTypes: null,
      });
      expect(result).toEqual([]);
    });

    it('returns empty array if filtered data types list is empty', () => {
      const result = getValidDataTypeIdsAndTaskIds({
        ...mockApplicationMetadata,
        dataTypes: [],
      });
      expect(result).toEqual([]);
    });

    it('returns mapped data types if dataTypes list is valid', () => {
      const result = getValidDataTypeIdsAndTaskIds(mockApplicationMetadata);
      expect(result).toEqual([{ dataTypeId: mockDataTypeId1, taskId: mockDataTypeTaskId1 }]);
    });
  });

  describe('filterOutRefDataAsPdf', () => {
    it('filters out "ref-data-as-pdf" from data types list', () => {
      const mockDataTypes: DataTypeElement[] = [{ id: mockDataTypeId1 }, { id: 'ref-data-as-pdf' }];
      const result = filterOutRefDataAsPdf(mockDataTypes);
      expect(result).toEqual([{ id: mockDataTypeId1 }]);
      expect(result).toHaveLength(1);
    });
  });

  describe('mapDataTypesToDataTypeIdAndTaskIds', () => {
    it('maps data types to DataTypeIdAndTaskId format', () => {
      const result = mapDataTypesToDataTypeIdAndTaskIds(mockDataTypes);
      expect(result).toEqual([{ dataTypeId: mockDataTypeId1, taskId: mockDataTypeTaskId1 }]);
    });
  });

  describe('getSelectedDataTypes', () => {
    it('returns selected data types for a given bpmnTaskId', () => {
      const mockDataTypeIdAndTaskId: DataTypeIdAndTaskId[] = [
        { dataTypeId: 'type1', taskId: 'task1' },
        { dataTypeId: 'type2', taskId: 'task2' },
      ];
      const result = getSelectedDataTypes('task2', mockDataTypeIdAndTaskId);
      expect(result).toEqual(['type2']);
    });
  });

  describe('getApplicationMetadataWithUpdatedDataTypes', () => {
    it('updates taskIds in the copied applicationMetadata', () => {
      const bpmnTaskId: string = 'newTask';
      const result = getApplicationMetadataWithUpdatedDataTypes(
        mockApplicationMetadata,
        bpmnTaskId,
        [mockDataTypeId1],
      );
      expect(result.dataTypes[0].taskId).toEqual(bpmnTaskId);
    });

    it('removes taskIds when it is not in the selected list', () => {
      const bpmnTaskId: string = 'newTask';

      const oldAppData: ApplicationMetadata = {
        ...mockApplicationMetadata,
        dataTypes: [...mockApplicationMetadata.dataTypes, { id: 'id', taskId: 'taskId' }],
      };

      const result = getApplicationMetadataWithUpdatedDataTypes(oldAppData, bpmnTaskId, [
        mockDataTypeId1,
      ]);
      expect(result.dataTypes[0].taskId).not.toBeNull();
      expect(result.dataTypes[1].taskId).toBeNull();

      const result2 = getApplicationMetadataWithUpdatedDataTypes(result, bpmnTaskId, []);
      expect(result2.dataTypes[0].taskId).toBeNull();
      expect(result2.dataTypes[1].taskId).toBeNull();
    });
  });
});
