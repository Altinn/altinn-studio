import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import type {
  BpmnBusinessObjectEditor,
  BpmnExtensionElementsEditor,
} from '../../types/BpmnBusinessObjectEditor';
import type { BpmnDetails } from '../../types/BpmnDetails';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import { getBpmnEditorDetailsFromBusinessObject } from './bpmnObjectBuilders';

describe('bpmnObjectBuilders', () => {
  afterEach(jest.clearAllMocks);

  describe('getBpmnEditorDetailsFromBusinessObject', () => {
    const mockTypeTask: BpmnTypeEnum = BpmnTypeEnum.Task;
    const mockId: string = 'mockId';
    const mockName: string = 'mockName';
    const mockTaskTypeData: BpmnTaskType = 'data';

    const mockBpmnExtensionElements: BpmnExtensionElementsEditor = {
      values: [
        {
          taskType: mockTaskTypeData,
          $type: 'altinn:TaskExtension',
        },
      ],
    };

    const mockBpmnBusinessObject: BpmnBusinessObjectEditor = {
      $type: mockTypeTask,
      id: mockId,
      name: mockName,
      extensionElements: mockBpmnExtensionElements,
    };

    it('returns the BpmnDetails with correct values', () => {
      const bpmnDetails: BpmnDetails =
        getBpmnEditorDetailsFromBusinessObject(mockBpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toEqual(mockTaskTypeData);
    });

    it('finds the task type after an unrelated extension', () => {
      const bpmnDetails = getBpmnEditorDetailsFromBusinessObject({
        ...mockBpmnBusinessObject,
        extensionElements: {
          values: [
            { $type: 'other:Extension', taskType: 'other' },
            ...mockBpmnExtensionElements.values,
          ],
        },
      });

      expect(bpmnDetails.taskType).toBe('data');
    });

    it('handles an empty extension list', () => {
      const bpmnDetails = getBpmnEditorDetailsFromBusinessObject({
        ...mockBpmnBusinessObject,
        extensionElements: { values: [] },
      });

      expect(bpmnDetails.taskType).toBeNull();
    });

    it('returns taskType with value "null" when extensionElements are not present', () => {
      const bpmnBusinessObject: BpmnBusinessObjectEditor = {
        ...mockBpmnBusinessObject,
        extensionElements: undefined,
      };
      const bpmnDetails: BpmnDetails = getBpmnEditorDetailsFromBusinessObject(bpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toBeNull();
    });

    it('returns taskType with value "null" when extensionElements.values are not present', () => {
      const bpmnBusinessObject: BpmnBusinessObjectEditor = {
        ...mockBpmnBusinessObject,
        extensionElements: {
          ...mockBpmnExtensionElements,
          values: undefined,
        },
      };
      const bpmnDetails: BpmnDetails = getBpmnEditorDetailsFromBusinessObject(bpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toBeNull();
    });
  });
});
