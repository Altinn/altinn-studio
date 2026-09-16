import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import {
  OnProcessTaskAddHandler,
  AllowedContributor,
  AllowedContentType,
} from './OnProcessTaskAddHandler';
import type { TaskEvent } from '@altinn/process-editor/types/TaskEvent';
import type { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';
import { app, org } from '@studio/testing/testids';
import {
  getMockBpmnElementForTask,
  mockBpmnElementForSigningTaskWithPdf,
  mockBpmnElementForUserControlledSigningTask,
  mockSigneeStatesDataTypeId,
  mockSigningPdfDataTypeId,
} from '../../test/mocks/bpmnDetailsMock';
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
const defaultLayoutSetConfig = {
  id: testElementId,
  taskId: testElementId,
};

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
      layoutSetConfig: defaultLayoutSetConfig,
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
      layoutSetConfig: defaultLayoutSetConfig,
      taskType: 'payment',
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(2);
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(1, {
      allowedContributors: [AllowedContributor.AppOwned],
      dataTypeId: 'paymentInformation-1234',
      taskId: testElementId,
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(2, {
      allowedContributors: [AllowedContributor.AppOwned],
      allowedContentTypes: [AllowedContentType.Pdf],
      dataTypeId: 'paymentReceiptPdf-1234',
      taskId: testElementId,
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
      layoutSetConfig: defaultLayoutSetConfig,
      taskType: 'signing',
    });

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributors: [AllowedContributor.AppOwned],
      dataTypeId: 'signatureInformation-1234',
      taskId: testElementId,
    });
    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });

  it('should also add the signee states and signing pdf datatypes when userControlledSigning task is added', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'signing',
      taskEvent: createTaskEvent(
        mockBpmnElementForUserControlledSigningTask.businessObject as BpmnBusinessObjectEditor,
      ),
    };

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetConfig: defaultLayoutSetConfig,
      taskType: 'signing',
    });

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributors: [AllowedContributor.AppOwned],
      dataTypeId: 'signatureInformation-1234',
      taskId: testElementId,
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributors: [AllowedContributor.AppOwned],
      dataTypeId: mockSigneeStatesDataTypeId,
      taskId: testElementId,
    });
    // The runtime writes the generated pdf to this data type at task end, and fails the task when the
    // data type is missing or does not accept a pdf.
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributors: [AllowedContributor.AppOwned],
      allowedContentTypes: [AllowedContentType.Pdf],
      dataTypeId: mockSigningPdfDataTypeId,
      taskId: testElementId,
    });

    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });

  // The runtime generates the pdf whenever the task declares a data type for it, not when the signing
  // is user controlled, so the pdf must be registered for a task that carries neither signee states
  // nor a signee provider. The literal values are deliberate: they are the strings the app runtime
  // compares against, and asserting the enum against itself would let either value be changed freely.
  it('should register the signing pdf datatype for a signing task that is not user controlled', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'signing',
      taskEvent: createTaskEvent(
        mockBpmnElementForSigningTaskWithPdf.businessObject as BpmnBusinessObjectEditor,
      ),
    };

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(2);
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(1, {
      allowedContributors: ['app:owned'],
      dataTypeId: 'signatureInformation-1234',
      taskId: testElementId,
    });
    expect(addDataTypeToAppMetadataMock).toHaveBeenNthCalledWith(2, {
      allowedContributors: ['app:owned'],
      allowedContentTypes: ['application/pdf'],
      dataTypeId: mockSigningPdfDataTypeId,
      taskId: testElementId,
    });
  });

  it('should not register a signee states datatype when the signing task does not declare one', () => {
    const onProcessTaskAddHandler = createOnProcessTaskHandler();

    const businessObjectWithoutSigneeStates = {
      extensionElements: {
        values: [
          {
            $type: 'altinn:TaskExtension',
            signatureConfig: {
              signatureDataType: 'signatureInformation-1234',
              signeeProviderId: 'myProvider',
            },
          },
        ],
      },
    } as unknown as BpmnBusinessObjectEditor;

    onProcessTaskAddHandler.handleOnProcessTaskAdd({
      taskType: 'signing',
      taskEvent: createTaskEvent(businessObjectWithoutSigneeStates),
    });

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      allowedContributors: [AllowedContributor.AppOwned],
      dataTypeId: 'signatureInformation-1234',
      taskId: testElementId,
    });
  });

  // The new service task types need no layout set, data type or policy rule of their own, so no
  // branch in the handler matches them and nothing happens.
  it.each(['confirmation', 'feedback', 'subformPdf', ''])(
    'should not add layoutSet, dataType or default policy when task type is "%s"',
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
