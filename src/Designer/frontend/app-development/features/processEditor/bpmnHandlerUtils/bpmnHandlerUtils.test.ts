import { mockBpmnDetails } from '../../../../packages/process-editor/test/mocks/bpmnDetailsMock';
import { getLayoutSetIdFromTaskId } from './bpmnHandlerUtils';

const layoutSets = [
  { id: 'layoutSet1', taskId: 'task1' },
  { id: 'layoutSet2', taskId: 'task2' },
];

describe('bpmnHandlerUtils', () => {
  describe('getLayoutSetIdFromTaskId', () => {
    it('should return the layout set id corresponding to the task id', () => {
      const result = getLayoutSetIdFromTaskId('task1', layoutSets);
      expect(result).toBe('layoutSet1');
    });

    it('should return undefined if task id does not exist in any layout set', () => {
      const result = getLayoutSetIdFromTaskId(mockBpmnDetails.id, layoutSets);
      expect(result).toBeUndefined();
    });

    it('should return undefined if layout sets are empty', () => {
      const layoutSets = [];
      const result = getLayoutSetIdFromTaskId(mockBpmnDetails.id, layoutSets);
      expect(result).toBeUndefined();
    });
  });
});
