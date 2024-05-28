import { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import type { TaskEvent } from '@altinn/process-editor/utils/ProcessTaskManager';
import { OnProcessTaskRemoveHandler } from './OnProcessTaskRemoveHandler';

describe('OnProcessTaskRemoveHandler', () => {
  it('should remove payment policy from current policy when task type is payment', () => {
    const org = 'testOrg';
    const app = 'testApp';

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

    const mutateApplicationPolicy = jest.fn();
    const taskMetadata: OnProcessTaskEvent = {
      taskType: 'payment',
      taskEvent: {
        element: {
          id: 'testElementId',
          businessObject: {},
        },
      } as TaskEvent,
    };

    const onProcessTaskRemoveHandler = new OnProcessTaskRemoveHandler(
      org,
      app,
      currentPolicy,
      mutateApplicationPolicy,
    );
    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(taskMetadata);

    expect(mutateApplicationPolicy).toHaveBeenCalledWith(expectedResponse);
  });
});
