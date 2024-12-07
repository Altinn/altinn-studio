import type { PolicyRule, PolicyRuleCard } from '../../src/types';
import { mockAction1, mockAction2, mockAction4 } from './policyActionMocks';
import {
  mockPolicyResources,
  mockPolicyRuleResources,
  mockPolicyRuleResourcesWithSingleNarrowingPolicy,
} from './policySubResourceMocks';
import {
  mockSubjectBackendString1,
  mockSubjectBackendString3,
  mockSubjectId1,
  mockSubjectId3,
} from './policySubjectMocks';

export const mockRuleId1: string = 'r1';
export const mockRuleId2: string = 'r2';
export const mockRuleId3: string = 'r3';

export const mockPolicyRuleCard1: PolicyRuleCard = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectId1, mockSubjectId3],
  actions: [mockAction1.actionId, mockAction2.actionId, mockAction4.actionId],
  accessPackages: [],
  resources: mockPolicyRuleResources,
};
export const mockPolicyRuleCard2: PolicyRuleCard = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  accessPackages: [],
  resources: [[]],
};
export const mockPolicyRuleCardWithSingleNarrowingPolicy: PolicyRuleCard = {
  ruleId: mockRuleId3,
  description: '',
  subject: [mockSubjectId1, mockSubjectId3],
  actions: [mockAction1.actionId, mockAction2.actionId, mockAction4.actionId],
  accessPackages: [],
  resources: mockPolicyRuleResourcesWithSingleNarrowingPolicy,
};
export const mockPolicyRuleCards: PolicyRuleCard[] = [mockPolicyRuleCard1, mockPolicyRuleCard2];

export const mockPolicyRule1: PolicyRule = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectBackendString1, mockSubjectBackendString3],
  actions: [mockAction1.actionId, mockAction2.actionId, mockAction4.actionId],
  accessPackages: [],
  resources: mockPolicyResources,
};
export const mockPolicyRule2: PolicyRule = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  resources: [[]],
  accessPackages: [],
};
export const mockPolicyRules: PolicyRule[] = [mockPolicyRule1, mockPolicyRule2];
