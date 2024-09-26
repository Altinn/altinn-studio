import { type PolicyRuleContextProps } from '../../src/contexts/PolicyRuleContext';
import {
  mockPolicyRuleCard1,
  mockPolicyRuleCardWithSingleNarrowingPolicy,
} from './policyRuleMocks';
import { type PolicyError } from '../../src/types';

const policyError: PolicyError = {
  resourceError: false,
  subjectsError: false,
  actionsError: false,
};

export const mockPolicyRuleContextValue: PolicyRuleContextProps = {
  policyRule: mockPolicyRuleCard1,
  showAllErrors: false,
  uniqueId: 'id',
  policyError,
  setPolicyError: jest.fn(),
};

export const mockPolicyRuleContextValueWithSingleNarrowingPolicy: PolicyRuleContextProps = {
  policyRule: mockPolicyRuleCardWithSingleNarrowingPolicy,
  showAllErrors: false,
  uniqueId: 'id',
  policyError,
  setPolicyError: jest.fn(),
};
