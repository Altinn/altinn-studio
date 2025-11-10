import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { OnProcessTaskAddHandler, AllowedContributor } from './OnProcessTaskAddHandler';
import type { TaskEvent } from '@altinn/process-editor/types/TaskEvent';
import type { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';
import { app, org } from '@studio/testing/testids';
import { getMockBpmnElementForTask } from '../../../../packages/process-editor/test/mocks/bpmnDetailsMock';
import type { BpmnBusinessObjectEditor } from '@altinn/process-editor/types/BpmnBusinessObjectEditor';

jest.mock('@altinn/process-editor/utils/bpmnModeler/StudioModeler', () => {
  const actual = jest.requireActual('@altinn/process-editor/utils/bpmnModeler/StudioModeler');
  return {
    ...actual,
    StudioModeler: jest.fn().mockImplementation((args) => {
      const instance = new actual.StudioModeler(args);
      instance.getElement = jest.fn().mockReturnValue(instance.element);
      return instance;
    }),
  };
});

const currentPolicyMock: Policy = {
  requiredAuthenticationLevelOrg: '3',
  requiredAuthenticationLevelEndUser: '3',
  rules: [],
};
const addLayoutSetMock = jest.fn();
const mutateApplicationPolicyMock = jest.fn();
const addDataTypeToAppMetadataMock = jest.fn();

const createOnProcessTaskHandler = () =>
  new OnProcessTaskAddHandler(
    org,
    app,
    currentPolicyMock,
    addLayoutSetMock,
    mutateApplicationPolicyMock,
    addDataTypeToAppMetadataMock,
  );

const testElementId = 'testElementId';
const createTaskEvent = (businessObject?: BpmnBusinessObjectEditor): TaskEvent =>
  ({
    element: {
      id: testElementId,
      businessObject: {
        ...(businessObject || {}),
      },
    },
  }) as TaskEvent;

describe('OnProcessTaskAddHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add layoutSet when data-task is added', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    onProcessTaskAddHandler.handleOnProcessTaskAdd({
      taskEvent: createTaskEvent(getMockBpmnElementForTask('data').businessObject),
      taskType: 'data',
    });

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: { id: testElementId, tasks: [testElementId] },
      layoutSetIdToUpdate: testElementId,
      taskType: 'data',
    });
    expect(addLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(addDataTypeToAppMetadataMock).not.toHaveBeenCalled();
    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });

  it('should add layoutSet, dataTypes and default policy when payment task is added', () => {
    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'payment',
      taskEvent: createTaskEvent(getMockBpmnElementForTask('payment').businessObject),
    };

    const expectedResponse: Policy = {
      requiredAuthenticationLevelEndUser: '3',
      requiredAuthenticationLevelOrg: '3',
      rules: [
        {
          actions: ['read', 'pay', 'confirm', 'reject'],
          description:
            'Rule that defines that user with specified role(s) can pay, reject and confirm for testOrg/testApp when it is in payment task',
          resources: [
            ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:testElementId'],
          ],
          ruleId: 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testElementId',
          subject: [],
        },
      ],
    };

    const onProcessTaskAddHandler = createOnProcessTaskHandler();
    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: {
        id: 'testElementId',
        tasks: ['testElementId'],
      },
      layoutSetIdToUpdate: 'testElementId',
      taskType: 'payment',
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(2);
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(1, {
      allowedContributers: [AllowedContributor.AppOwned],
      dataTypeId: 'paymentInformation-1234',
      taskId: 'testElementId',
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(2, {
      allowedContributers: [AllowedContributor.AppOwned],
      dataTypeId: 'paymentReceiptPdf-1234',
      taskId: 'testElementId',
    });
    expect(mutateApplicationPolicyMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('should add layoutset and datatype when signing task is added', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'signing',
      taskEvent: createTaskEvent(getMockBpmnElementForTask('signing').businessObject),
    };

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: {
        id: 'testElementId',
        tasks: ['testElementId'],
      },
      layoutSetIdToUpdate: 'testElementId',
      taskType: 'signing',
    });

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributers: [AllowedContributor.AppOwned],
      dataTypeId: 'signatureInformation-1234',
      taskId: 'testElementId',
    });
    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });

  it('should add layoutset and datatype when userControlledSigning task is added', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'signing',
      taskEvent: createTaskEvent(getMockBpmnElementForTask('signing').businessObject),
    };

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: {
        id: 'testElementId',
        tasks: ['testElementId'],
      },
      layoutSetIdToUpdate: 'testElementId',
      taskType: 'signing',
    });

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributers: [AllowedContributor.AppOwned],
      dataTypeId: 'signatureInformation-1234',
      taskId: 'testElementId',
    });

    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });

  it.each(['confirmation', 'feedback'])(
    'should not add layoutSet, dataType or default policy when task type is %s',
    (task) => {
      const onProcessTaskAddHandler = createOnProcessTaskHandler();

      onProcessTaskAddHandler.handleOnProcessTaskAdd({
        taskEvent: createTaskEvent(),
        taskType: task as BpmnTaskType,
      });

      expect(addLayoutSetMock).not.toHaveBeenCalled();
      expect(addDataTypeToAppMetadataMock).not.toHaveBeenCalled();
      expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
    },
  );
});
