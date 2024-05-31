import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { TaskEvent } from '@altinn/process-editor/utils/ProcessTaskManager';
import { OnProcessTaskAddHandler } from './OnProcessTaskAddHandler';
import { BpmnTypeEnum } from '@altinn/process-editor/enum/BpmnTypeEnum';

const orgMock = 'testOrg';
const appMock = 'testApp';
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
    orgMock,
    appMock,
    currentPolicyMock,
    addLayoutSetMock,
    mutateApplicationPolicyMock,
    addDataTypeToAppMetadataMock,
  );

const createTaskEvent = (extensionConfig?: object): TaskEvent =>
  ({
    element: {
      id: 'testId',
      businessObject: {
        id: 'testEventId',
        $type: BpmnTypeEnum.Task,
        extensionElements: extensionConfig ? { values: [extensionConfig] } : undefined,
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
      taskEvent: createTaskEvent(),
      taskType: 'data',
    });

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: { id: 'testId', tasks: ['testId'] },
      layoutSetIdToUpdate: 'testId',
    });
  });

  it('should add layoutSet, dataType and default policy when payment task is added', () => {
    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'payment',
      taskEvent: {
        element: {
          id: 'testElementId',
          businessObject: {
            id: 'testEventId',
            $type: BpmnTypeEnum.Task,
            extensionElements: {
              values: [
                {
                  paymentConfig: { paymentDataType: 'paymentInformation' },
                },
              ],
            },
          },
        },
      } as TaskEvent,
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
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({ dataTypeId: 'paymentInformation' });
    expect(mutateApplicationPolicyMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('should add datatype when signing task is added', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'signing',
      taskEvent: {
        element: {
          id: 'testElementId',
          businessObject: {
            id: 'testEventId',
            $type: BpmnTypeEnum.Task,
            extensionElements: {
              values: [
                {
                  signatureConfig: { signatureDataType: 'signingInformation' },
                },
              ],
            },
          },
        },
      } as TaskEvent,
    };

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      dataTypeId: 'signingInformation',
    });
  });
});
