import { AddProcessTaskManager } from './AddProcessTaskManager';
import { BpmnTypeEnum } from '@altinn/process-editor/enum/BpmnTypeEnum';
import { TaskEvent } from '@altinn/process-editor/classes/ProcessTaskManager/types';
import { BpmnDetails } from '@altinn/process-editor/types/BpmnDetails';
import { Policy } from '@altinn/process-editor/utils/policy/types';

describe('AddProcessTaskManager', () => {
  it('should add layoutSet when data-task is added', () => {
    const org = 'testOrg';
    const app = 'testApp';
    const addLayoutSet = jest.fn();
    const addDataTypeToAppMetadata = jest.fn();

    const bpmnDetails: BpmnDetails = {
      id: 'testId',
      name: 'dataTask',
      taskType: 'data',
      type: BpmnTypeEnum.Task,
    };
    const currentPolicy: Policy = { rules: [] };

    const addProcessTaskManager = new AddProcessTaskManager(
      org,
      app,
      addLayoutSet,
      addDataTypeToAppMetadata,
      bpmnDetails,
      currentPolicy,
    );

    addProcessTaskManager.handleTaskAdd({
      element: { businessObject: { id: 'testEventId', $type: BpmnTypeEnum.Task } },
    } as TaskEvent);

    const expectedResult = {
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    };
    expect(addLayoutSet).toHaveBeenCalledWith(expectedResult);
  });

  it('should add data-type and add default payment policy when PaymentTask is added', () => {
    const org = 'testOrg';
    const app = 'testApp';
    const addLayoutSet = jest.fn();
    const addDataTypeToAppMetadata = jest.fn();

    const bpmnDetails: BpmnDetails = {
      id: 'testId',
      name: 'paymentTask',
      taskType: 'payment',
      type: BpmnTypeEnum.Task,
    };
    const currentPolicy: Policy = { rules: [] };

    const addProcessTaskManager = new AddProcessTaskManager(
      org,
      app,
      addLayoutSet,
      addDataTypeToAppMetadata,
      bpmnDetails,
      currentPolicy,
    );

    addProcessTaskManager.handleTaskAdd({
      element: {
        businessObject: {
          id: 'testEventId',
          $type: BpmnTypeEnum.Task,
          extensionElements: {
            values: [
              { taskType: 'payment', paymentConfig: { paymentDataType: 'paymentInformation' } },
            ],
          },
        },
      },
    } as TaskEvent);

    const expectedAddLayoutSetResults = {
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    };

    const expectedAddDataTypeToAppMetadataResults = {
      dataTypeId: 'paymentInformation',
      policy: {
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
      },
    };

    expect(addLayoutSet).toHaveBeenCalledWith(expectedAddLayoutSetResults);
    expect(addDataTypeToAppMetadata).toHaveBeenCalledWith(expectedAddDataTypeToAppMetadataResults);
  });

  it('should add layoutSet and datatype when signing task is added', () => {
    const org = 'testOrg';
    const app = 'testApp';
    const addLayoutSet = jest.fn();
    const addDataTypeToAppMetadata = jest.fn();

    const bpmnDetails: BpmnDetails = {
      id: 'testId',
      name: 'signingTask',
      taskType: 'signing',
      type: BpmnTypeEnum.Task,
    };
    const currentPolicy: Policy = { rules: [] };

    const addProcessTaskManager = new AddProcessTaskManager(
      org,
      app,
      addLayoutSet,
      addDataTypeToAppMetadata,
      bpmnDetails,
      currentPolicy,
    );

    addProcessTaskManager.handleTaskAdd({
      element: {
        businessObject: {
          id: 'testEventId',
          $type: BpmnTypeEnum.Task,
          extensionElements: {
            values: [
              { taskType: 'signing', signatureConfig: { signatureDataType: 'signingInformation' } },
            ],
          },
        },
      },
    } as TaskEvent);

    const expectedAddLayoutSetResults = {
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    };

    const expectedAddDataTypeToAppMetadataResults = {
      dataTypeId: 'signingInformation',
    };

    expect(addLayoutSet).toHaveBeenCalledWith(expectedAddLayoutSetResults);
    expect(addDataTypeToAppMetadata).toHaveBeenCalledWith(expectedAddDataTypeToAppMetadataResults);
  });
});
