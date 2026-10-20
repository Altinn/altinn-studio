import { vi } from 'vitest';
import { type PolicyEditorContextProps } from '../../src/contexts/PolicyEditorContext';
import { mockActions } from './policyActionMocks';
import {
  mockPolicyRuleCards,
  mockPolicyRuleCardWithSingleNarrowingPolicy,
} from './policyRuleMocks';
import { mockSubjects } from './policySubjectMocks';
import { type PolicyEditorUsage } from '../../src/types';
import { mockResourecId1 } from './policySubResourceMocks';

const mockUsageType: PolicyEditorUsage = 'app';
const mockResourceType: string = 'urn:altinn';

export const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: mockPolicyRuleCards,
  setPolicyRules: vi.fn(),
  actions: mockActions,
  subjects: mockSubjects,
  accessPackages: [],
  usageType: mockUsageType,
  resourceType: mockResourceType,
  showAllErrors: false,
  resourceId: mockResourecId1,
  savePolicy: vi.fn(),
};

export const mockPolicyEditorContextValueWithSingleNarrowingPolicy: PolicyEditorContextProps = {
  policyRules: [mockPolicyRuleCardWithSingleNarrowingPolicy],
  setPolicyRules: vi.fn(),
  actions: mockActions,
  subjects: mockSubjects,
  accessPackages: [],
  usageType: mockUsageType,
  resourceType: mockResourceType,
  showAllErrors: false,
  resourceId: mockResourecId1,
  savePolicy: vi.fn(),
};
