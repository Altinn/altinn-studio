import { RemoveProcessTaskManager } from './RemoveProcessTaskManager';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { type BpmnTaskType } from '../../types/BpmnTaskType';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { type TaskEvent } from '../ProcessTaskManager/types';
import { Policy } from 'app-shared/types/Policy';

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
          $type: BpmnTypeEnum.Task,
          extensionElements: extensionConfig ? { values: [extensionConfig] } : undefined,
        },
      },
    }) as TaskEvent;

  it('should remove layoutSet when the Task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'data', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'data');
    const currentPolicy: Policy = {
      requiredAuthenticationLevelOrg: '3',
      requiredAuthenticationLevelEndUser: '3',
      rules: [],
    };

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      'org',
      'app',
      layoutSets,
      deleteLayoutSet,
      jest.fn(),
      jest.fn(),
      bpmnDetails,
      currentPolicy,
    );

    removeProcessTaskManager.handleTaskRemove({} as TaskEvent);
    expect(deleteLayoutSet).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
  });

  it('should remove payment policy when the payment Task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'payment', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const mutateApplicationPolicy = jest.fn();
    const deleteDataTypeFromAppMetadata = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'payment');
    const currentPolicy: Policy = {
      requiredAuthenticationLevelOrg: '3',
      requiredAuthenticationLevelEndUser: '3',
      rules: [
        {
          ruleId: 'alreadyExistingRule',
          description: 'testDescription',
          subject: ['testSubject'],
          actions: ['pay'],
          resources: [['testResource']],
        },
      ],
    };

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      'org',
      'app',
      layoutSets,
      deleteLayoutSet,
      deleteDataTypeFromAppMetadata,
      mutateApplicationPolicy,
      bpmnDetails,
      currentPolicy,
    );

    removeProcessTaskManager.handleTaskRemove(createTaskEvent('payment'));
    expect(deleteDataTypeFromAppMetadata).toHaveBeenCalledWith({
      dataTypeId: undefined,
    });

    expect(mutateApplicationPolicy).toHaveBeenCalledWith({
      rules: [
        {
          actions: ['pay'],
          description: 'testDescription',
          resources: [['testResource']],
          ruleId: 'alreadyExistingRule',
          subject: ['testSubject'],
        },
      ],
    });
  });

  it('should remove datatype from app metadata when the signing Task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'signing', tasks: ['testTask'] }],
    };

    const deleteLayoutSet = jest.fn();
    const deleteDataTypeFromAppMetadata = jest.fn();
    const bpmnDetails = createBpmnDetails('testTask', 'testTask', 'signing');
    const currentPolicy: Policy = {
      requiredAuthenticationLevelOrg: '3',
      requiredAuthenticationLevelEndUser: '3',
      rules: [],
    };

    const removeProcessTaskManager = new RemoveProcessTaskManager(
      'org',
      'app',
      layoutSets,
      deleteLayoutSet,
      deleteDataTypeFromAppMetadata,
      jest.fn(),
      bpmnDetails,
      currentPolicy,
    );

    removeProcessTaskManager.handleTaskRemove(createTaskEvent('signing'));
    expect(deleteDataTypeFromAppMetadata).toHaveBeenCalled();
  });
});
