import { type PolicyRuleContextProps } from '../../src/contexts/PolicyRuleContext';
import { mockPolicyRuleCard1 } from './policyRuleMocks';

export const mockPolicyRuleContextValue: PolicyRuleContextProps = {
  policyRule: mockPolicyRuleCard1,
  showAllErrors: false,
  uniqueId: 'id',
  hasResourceError: false,
  setHasResourceError: jest.fn(),
  hasActionsError: false,
  setHasActionsError: jest.fn(),
  hasSubjectsError: false,
  setHasSubjectsError: jest.fn(),
};
