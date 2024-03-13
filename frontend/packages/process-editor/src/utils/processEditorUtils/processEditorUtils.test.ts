import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../types/BpmnDetails';
import { supportsProcessEditor, updateDataTaskTrackingLists } from './processEditorUtils';

describe('processEditorUtils', () => {
  describe('supportsProcessEditor', () => {
    it('returns true if version is newer than 8', () => {
      const result = supportsProcessEditor('8.1.2');
      expect(result).toBeTruthy();
    });

    it('returns false if version is older than 8', () => {
      const result = supportsProcessEditor('7.1.2');
      expect(result).toBeFalsy();
    });
  });

  describe('updateDataTaskTrackingLists', () => {
    it('calls the methods to add item to primary list and remove from secondary list', () => {
      const updatePrimaryList = jest.fn();
      const updateSecondaryList = jest.fn();
      const itemToAdd: BpmnDetails = {
        id: '1',
        name: 'test',
        taskType: 'data',
        type: BpmnTypeEnum.Task,
      };
      const secondaryList: BpmnDetails[] = [
        { id: '1', name: 'test', taskType: 'data', type: BpmnTypeEnum.Task },
      ];

      updateDataTaskTrackingLists(updatePrimaryList, updateSecondaryList, itemToAdd, secondaryList);

      expect(updatePrimaryList).toHaveBeenCalledTimes(1);
      expect(updateSecondaryList).toHaveBeenCalledTimes(1);
    });

    it('calls the methods to add item to primary list only when item is not in secondary list', () => {
      const updatePrimaryList = jest.fn();
      const updateSecondaryList = jest.fn();
      const itemToAdd: BpmnDetails = {
        id: '1',
        name: 'test',
        taskType: 'data',
        type: BpmnTypeEnum.Task,
      };
      const secondaryList: BpmnDetails[] = [
        { id: '2', name: 'test2', taskType: 'data', type: BpmnTypeEnum.Task },
      ];

      updateDataTaskTrackingLists(updatePrimaryList, updateSecondaryList, itemToAdd, secondaryList);

      expect(updatePrimaryList).toHaveBeenCalledTimes(1);
      expect(updateSecondaryList).not.toHaveBeenCalled();
    });
  });
});
