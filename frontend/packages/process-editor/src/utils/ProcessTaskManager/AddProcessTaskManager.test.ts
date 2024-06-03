import { AddProcessTaskManager } from './AddProcessTaskManager';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { type TaskEvent } from '../ProcessTaskManager/types';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type BpmnTaskType } from '../../types/BpmnTaskType';

describe('AddProcessTaskManager', () => {
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

  const addLayoutSet = jest.fn();
  const addDataTypeToAppMetadata = jest.fn();
  const onProcessTaskAdd = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const createAddProcessTaskManager = (bpmnDetails: BpmnDetails) =>
    new AddProcessTaskManager(
      addLayoutSet,
      addDataTypeToAppMetadata,
      bpmnDetails,
      onProcessTaskAdd,
    );

  it('should add layoutSet when data-task is added', () => {
    const bpmnDetails = createBpmnDetails('testId', 'dataTask', 'data');
    const addProcessTaskManager = createAddProcessTaskManager(bpmnDetails);

    addProcessTaskManager.handleTaskAdd(createTaskEvent('data'));

    expect(addLayoutSet).toHaveBeenCalledWith({
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    });
  });

  it('should add layoutSet and dataType when PaymentTask is added', () => {
    const bpmnDetails = createBpmnDetails('testId', 'paymentTask', 'payment');
    const addProcessTaskManager = createAddProcessTaskManager(bpmnDetails);

    addProcessTaskManager.handleTaskAdd(
      createTaskEvent('payment', {
        taskType: 'payment',
        paymentConfig: { paymentDataType: 'paymentInformation' },
      }),
    );

    expect(addLayoutSet).toHaveBeenCalledWith({
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    });

    expect(addDataTypeToAppMetadata).toHaveBeenCalledWith({
      dataTypeId: 'paymentInformation',
      taskId: 'testId',
    });
  });

  it('should add layoutSet and datatype when signing task is added', () => {
    const bpmnDetails = createBpmnDetails('testId', 'signingTask', 'signing');
    const addProcessTaskManager = createAddProcessTaskManager(bpmnDetails);

    addProcessTaskManager.handleTaskAdd(
      createTaskEvent('signing', {
        taskType: 'signing',
        signatureConfig: { signatureDataType: 'signingInformation' },
      }),
    );

    expect(addDataTypeToAppMetadata).toHaveBeenCalledWith({
      dataTypeId: 'signingInformation',
      taskId: 'testId',
    });
  });

  it('should inform the consumer of the package that a task has been added with the taskEvent and taskType', () => {
    const bpmnDetails = createBpmnDetails('testId', 'signingTask', 'signing');
    const addProcessTaskManager = createAddProcessTaskManager(bpmnDetails);

    const taskEvent = createTaskEvent('signing', {
      taskType: 'signing',
      signatureConfig: { signatureDataType: 'signingInformation' },
    });

    addProcessTaskManager.handleTaskAdd(taskEvent);

    expect(onProcessTaskAdd).toHaveBeenCalledWith({
      taskEvent,
      taskType: 'signing',
    });
  });
});
