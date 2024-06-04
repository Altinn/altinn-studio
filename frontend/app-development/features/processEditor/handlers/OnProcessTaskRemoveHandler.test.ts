import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { OnProcessTaskRemoveHandler } from './OnProcessTaskRemoveHandler';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { BpmnTypeEnum } from '@altinn/process-editor/enum/BpmnTypeEnum';
import type { TaskEvent } from '@altinn/process-editor/types/TaskEvent';
import { BpmnBusinessObjectEditor } from '@altinn/process-editor/types/BpmnBusinessObjectEditor';

const orgMock = 'testOrg';
const appMock = 'testApp';
const currentPolicyMock: Policy = {
  requiredAuthenticationLevelOrg: '3',
  requiredAuthenticationLevelEndUser: '3',
  rules: [],
};
const layoutSetsMock = {
  sets: [],
};

const mutateApplicationPolicyMock = jest.fn();
const deleteDataTypeFromAppMetadataMock = jest.fn();
const deletelayoutSetMock = jest.fn();

const createTaskMetadataMock = (
  taskType: string,
  businessObject?: BpmnBusinessObjectEditor,
): OnProcessTaskEvent => ({
  taskType: taskType,
  taskEvent: {
    element: {
      id: 'testElementId',
      businessObject: {
        ...(businessObject || {}),
      },
    },
  } as TaskEvent,
});

const createOnRemoveProcessTaskHandler = ({ currentPolicy, layoutSets }: any) => {
  return new OnProcessTaskRemoveHandler(
    orgMock,
    appMock,
    currentPolicy || currentPolicyMock,
    layoutSets || layoutSetsMock,
    mutateApplicationPolicyMock,
    deleteDataTypeFromAppMetadataMock,
    deletelayoutSetMock,
  );
};

describe('OnProcessTaskRemoveHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should remove layoutSet when data-task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'data', tasks: ['testElementId'] }],
    };

    const taskMetadata = createTaskMetadataMock('data', {
      id: 'testEventId',
      $type: BpmnTypeEnum.Task,
      extensionElements: undefined,
    });

    const onProcessTaskRemoveHandler = createOnRemoveProcessTaskHandler({
      layoutSets,
    });

    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(taskMetadata);
    expect(deletelayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
    expect(deleteDataTypeFromAppMetadataMock).not.toHaveBeenCalled();
  });

  it('should remove payment policy from current policy when task type is payment', () => {
    const currentPolicy: Policy = {
      requiredAuthenticationLevelOrg: '3',
      requiredAuthenticationLevelEndUser: '3',
      rules: [
        {
          ruleId: 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testElementId',
          actions: ['read'],
          description: 'This should be deleted',
          resources: [],
          subject: [],
        },
        {
          ruleId: 'existingRuleId',
          actions: ['read'],
          description: 'Simple Existing Rule',
          resources: [],
          subject: [],
        },
      ],
    };

    const expectedResponse: Policy = {
      requiredAuthenticationLevelEndUser: '3',
      requiredAuthenticationLevelOrg: '3',
      rules: [
        {
          actions: ['read'],
          description: 'Simple Existing Rule',
          resources: [],
          ruleId: 'existingRuleId',
          subject: [],
        },
      ],
    };

    const onProcessTaskRemoveHandler = createOnRemoveProcessTaskHandler({
      currentPolicy,
    });
    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(createTaskMetadataMock('payment'));

    expect(mutateApplicationPolicyMock).toHaveBeenCalledWith(expectedResponse);
    expect(mutateApplicationPolicyMock).toHaveBeenCalledTimes(1);
    expect(deletelayoutSetMock).not.toHaveBeenCalled();
  });

  it('should delete layoutSet for payment-task if layoutSet exists', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'payment', tasks: ['testElementId'] }],
    };

    const taskMetadata = createTaskMetadataMock('payment', {
      id: 'testEventId',
      $type: BpmnTypeEnum.Task,
      extensionElements: undefined,
    });

    const onProcessTaskRemoveHandler = createOnRemoveProcessTaskHandler({
      layoutSets,
    });

    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(taskMetadata);
    expect(deletelayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
  });

  it('should remove datatype from app metadata and delete layoutSet when the signing task is deleted', () => {
    const layoutSets: LayoutSets = {
      sets: [{ id: 'testLayoutSetId', dataType: 'signing', tasks: ['testElementId'] }],
    };

    const taskMetadata = createTaskMetadataMock('signing', {
      id: 'testEventId',
      $type: BpmnTypeEnum.Task,
      extensionElements: undefined,
    });

    const onProcessTaskRemoveHandler = createOnRemoveProcessTaskHandler({
      layoutSets,
    });

    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(taskMetadata);
    expect(deleteDataTypeFromAppMetadataMock).toHaveBeenCalled();
    expect(deletelayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'testLayoutSetId' });
    expect(mutateApplicationPolicyMock).not.toHaveBeenCalled();
  });
});
