import { PaymentPolicyBuilder } from './PaymentPolicyBuilder';
import type { Policy } from '../../../utils/policy/types';

describe('DefaultPaymentPolicyBuilder', () => {
  it('should build a default payment policy based on org, app and taskId as input parameters', () => {
    const testInData = {
      org: 'testOrg',
      app: 'testApp',
      taskId: 'testTaskId',
    };

    const expectedOutputData: Policy = {
      rules: [
        {
          ruleId: 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testTaskId',
          description:
            'Rule that defines that user with specified role(s) can pay, reject and confirm for testOrg/testApp when it is in payment task',
          subject: [],
          actions: ['read', 'pay', 'confirm', 'reject'],
          resources: [
            ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:testTaskId'],
          ],
        },
      ],
    };

    const paymentPolicyBuilder = new PaymentPolicyBuilder(testInData.org, testInData.app);

    const policy = paymentPolicyBuilder.getDefaultPaymentPolicy(testInData.taskId);
    expect(policy).toEqual(expectedOutputData);
  });
});
