import { RemoveProcessTaskManager } from './RemoveProcessTaskManager';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { type BpmnTaskType } from '../../types/BpmnTaskType';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { type TaskEvent } from '../ProcessTaskManager/types';

describe('RemoveProcessTaskManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  const createBpmnDetails = (id: string, name: string, taskType: BpmnTaskType): BpmnDetails => ({
    id,
    name,
    taskType,
    type: BpmnTypeEnum.Task,
  });

  const createTaskEvent = (taskType: string, extensionConfig?: object): TaskEvent =>
    ({
      element: {
        businessObject: {
          id: 'testEventId',
          $type: taskType,
          extensionElements: extensionConfig ? { values: [extensionConfig] } : undefined,
        },
      },
    }) as TaskEvent;

  it('should remove layoutSet when data-task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'data', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'data');

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      layoutSets,
      deleteLayoutSet,
      jest.fn(),
      bpmnDetails,
      jest.fn(),
    );

    removeProcessTaskManager.handleTaskRemove({} as TaskEvent);
    expect(deleteLayoutSet).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
  });

  it('should remove datatype from app metadata when the signing Task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'signing', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const deleteDataTypeFromAppMetadata = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'signing');

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      layoutSets,
      deleteLayoutSet,
      deleteDataTypeFromAppMetadata,
      bpmnDetails,
      jest.fn(),
    );

    removeProcessTaskManager.handleTaskRemove(createTaskEvent('signing'));
    expect(deleteDataTypeFromAppMetadata).toHaveBeenCalled();
  });

  it('should remove datatype and layoutSet when the payment Task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'payment', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const deleteDataTypeFromAppMetadata = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'payment');

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      layoutSets,
      deleteLayoutSet,
      deleteDataTypeFromAppMetadata,
      bpmnDetails,
      jest.fn(),
    );

    removeProcessTaskManager.handleTaskRemove(createTaskEvent('payment'));
    expect(deleteDataTypeFromAppMetadata).toHaveBeenCalled();
    expect(deleteLayoutSet).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
  });

  it('should inform the consumer of the package that a task has been removed with the taskEvent and taskType', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'payment', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const deleteDataTypeFromAppMetadata = jest.fn();
    const onProcessTaskRemove = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'payment');

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      layoutSets,
      deleteLayoutSet,
      deleteDataTypeFromAppMetadata,
      bpmnDetails,
      onProcessTaskRemove,
    );

    removeProcessTaskManager.handleTaskRemove(createTaskEvent('payment'));
    expect(onProcessTaskRemove).toHaveBeenCalledWith({
      taskEvent: createTaskEvent('payment'),
      taskType: 'payment',
    });
  });
});
