import { AddProcessTaskManager } from './AddProcessTaskManager';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { type TaskEvent } from '../ProcessTaskManager/types';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type Policy } from '../../utils/policy/types';
import { type BpmnTaskType } from '../../types/BpmnTaskType';

describe('AddProcessTaskManager', () => {
  const org = 'testOrg';
  const app = 'testApp';

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
  const mutateApplicationPolicy = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const createAddProcessTaskManager = (
    bpmnDetails: BpmnDetails,
    currentPolicy: Policy = { rules: [] },
  ) =>
    new AddProcessTaskManager(
      org,
      app,
      addLayoutSet,
      addDataTypeToAppMetadata,
      mutateApplicationPolicy,
      bpmnDetails,
      currentPolicy,
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

  it('should add data-type and add default payment policy when PaymentTask is added', () => {
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
    });

    expect(mutateApplicationPolicy).toHaveBeenCalledWith({
      rules: [
        {
          ruleId: 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testId',
          description:
            'Rule that defines that user with specified role(s) can pay, reject and confirm for testOrg/testApp when it is in payment task',
          subject: [],
          actions: ['read', 'pay', 'confirm', 'reject'],
          resources: [
            ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:testId'],
          ],
        },
      ],
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

    expect(addLayoutSet).toHaveBeenCalledWith({
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    });

    expect(addDataTypeToAppMetadata).toHaveBeenCalledWith({
      dataTypeId: 'signingInformation',
    });
  });
});
