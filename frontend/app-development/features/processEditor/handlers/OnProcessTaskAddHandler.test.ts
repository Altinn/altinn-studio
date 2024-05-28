import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import type { TaskEvent } from '@altinn/process-editor/utils/ProcessTaskManager';
import { OnProcessTaskAddHandler } from './OnProcessTaskAddHandler';

describe('OnProcessTaskAddHandler', () => {
  it('should add default payment policy to current policy when task type is payment', () => {
    const org = 'testOrg';
    const app = 'testApp';
    const currentPolicy: Policy = {
      requiredAuthenticationLevelOrg: '3',
      requiredAuthenticationLevelEndUser: '3',
      rules: [],
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

    const onProcessTaskAddHandler = new OnProcessTaskAddHandler(
      org,
      app,
      currentPolicy,
      mutateApplicationPolicy,
    );

    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);
    expect(mutateApplicationPolicy).toHaveBeenCalledWith(expectedResponse);
  });
});
