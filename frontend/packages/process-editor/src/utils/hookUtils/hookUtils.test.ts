import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import type { BpmnBusinessObjectViewer } from '../../types/BpmnBusinessObjectViewer';
import type {
  BpmnBusinessObjectEditor,
  BpmnExtensionElementsEditor,
} from '../../types/BpmnBusinessObjectEditor';
import type { BpmnDetails } from '../../types/BpmnDetails';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import {
  getBpmnEditorDetailsFromBusinessObject,
  getBpmnViewerDetailsFromBusinessObject,
  getLayoutSetIdFromTaskId,
} from './hookUtils';

describe('hookUtils', () => {
  afterEach(jest.clearAllMocks);

  describe('getBpmnViewerDetailsFromBusinessObject', () => {
    const mockTypeTask: BpmnTypeEnum = BpmnTypeEnum.Task;
    const mockId: string = 'mockId';
    const mockName: string = 'mockName';
    const mockTaskTypeData: BpmnTaskType = 'data';

    const mockBpmnBusinessObject: BpmnBusinessObjectViewer = {
      $type: mockTypeTask,
      id: mockId,
      name: mockName,
      $attrs: {
        'altinn:tasktype': mockTaskTypeData,
      },
    };

    it('returns the BpmnDetails with correct values', () => {
      const bpmnDetails: BpmnDetails =
        getBpmnViewerDetailsFromBusinessObject(mockBpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toEqual(mockTaskTypeData);
    });

    it('returns taskType with value "null" when $attrs are not present', () => {
      const bpmnBusinessObject: BpmnBusinessObjectViewer = {
        ...mockBpmnBusinessObject,
        $attrs: undefined,
      };
      const bpmnDetails: BpmnDetails = getBpmnViewerDetailsFromBusinessObject(bpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toBeNull();
    });
  });

  describe('getBpmnEditorDetailsFromBusinessObject', () => {
    const mockTypeTask: BpmnTypeEnum = BpmnTypeEnum.Task;
    const mockTypeEndEvent: BpmnTypeEnum = BpmnTypeEnum.EndEvent;
    const mockId: string = 'mockId';
    const mockName: string = 'mockName';
    const mockTaskTypeData: BpmnTaskType = 'data';

    const mockBpmnExtensionElements: BpmnExtensionElementsEditor = {
      values: [
        {
          taskType: mockTaskTypeData,
          $type: 'altinn:taskType',
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

    it('returns taskType with value "null" when etensionElements are not present', () => {
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

    it('returns taskType with value "null" when etensionElements.values are not present', () => {
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

    it('returns taskType with value "endEvent" when etensionElements are not present and $type is endEvent', () => {
      const bpmnBusinessObject: BpmnBusinessObjectEditor = {
        ...mockBpmnBusinessObject,
        $type: mockTypeEndEvent,
        extensionElements: undefined,
      };
      const bpmnDetails: BpmnDetails = getBpmnEditorDetailsFromBusinessObject(bpmnBusinessObject);
      expect(bpmnDetails.id).toEqual(mockId);
      expect(bpmnDetails.name).toEqual(mockName);
      expect(bpmnDetails.type).toEqual(mockTypeTask);
      expect(bpmnDetails.taskType).toBeNull();
    });
  });

  const mockTaskId = 'mockId';
  const bpmnDetailsMock: BpmnDetails = {
    id: mockTaskId,
    name: 'mockName',
    type: BpmnTypeEnum.Task,
    taskType: 'data',
  };

  const layoutSets = {
    sets: [
      { id: 'layoutSet1', tasks: ['task1'] },
      { id: 'layoutSet2', tasks: ['task2'] },
    ],
  };

  describe('getLayoutSetIdFromTaskId', () => {
    it('should return the layout set id corresponding to the task id', () => {
      const result = getLayoutSetIdFromTaskId({ ...bpmnDetailsMock, id: 'task1' }, layoutSets);
      expect(result).toBe('layoutSet1');
    });

    it('should return undefined if task id does not exist in any layout set', () => {
      const result = getLayoutSetIdFromTaskId(bpmnDetailsMock, layoutSets);
      expect(result).toBeUndefined();
    });

    it('should return undefined if layout sets are empty', () => {
      const layoutSets = { sets: [] };
      const result = getLayoutSetIdFromTaskId(bpmnDetailsMock, layoutSets);
      expect(result).toBeUndefined();
    });
  });
});
