import { type PolicyEditorContextProps } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { mockActions } from './policyActionMocks';
import {
  mockPolicyRuleCards,
  mockPolicyRuleCardWithSingleNarrowingPolicy,
} from './policyRuleMocks';
import { mockSubjects } from './policySubjectMocks';
import { type PolicyEditorUsage } from '@altinn/policy-editor/types';
import { mockResourecId1 } from './policySubResourceMocks';

const mockUsageType: PolicyEditorUsage = 'app';
const mockResourceType: string = 'urn:altinn';

export const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: mockPolicyRuleCards,
  setPolicyRules: jest.fn(),
  actions: mockActions,
  subjects: mockSubjects,
  accessPackages: [],
  usageType: mockUsageType,
  resourceType: mockResourceType,
  showAllErrors: false,
  resourceId: mockResourecId1,
  savePolicy: jest.fn(),
};

export const mockPolicyEditorContextValueWithSingleNarrowingPolicy: PolicyEditorContextProps = {
  policyRules: [mockPolicyRuleCardWithSingleNarrowingPolicy],
  setPolicyRules: jest.fn(),
  actions: mockActions,
  subjects: mockSubjects,
  accessPackages: [],
  usageType: mockUsageType,
  resourceType: mockResourceType,
  showAllErrors: false,
  resourceId: mockResourecId1,
  savePolicy: jest.fn(),
};
