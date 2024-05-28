import { type PolicyRuleContextProps } from '../../src/contexts/PolicyRuleContext';
import { mockPolicyRuleCard1 } from './policyRuleMocks';

export const mockPolicyRuleContextValue: PolicyRuleContextProps = {
  policyRule: mockPolicyRuleCard1,
  showAllErrors: false,
  hasResourceError: false,
  setHasResourceError: jest.fn(),
};
