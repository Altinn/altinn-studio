import type { PolicyRule, PolicyRuleCard } from '../types';
import { mockAction1, mockAction2, mockActionTitle1, mockActionTitle2 } from './policyActionMocks';
import { mockPolicyResources, mockPolicyRuleResources } from './policySubResourceMocks';
import {
  mockSubjectBackendString1,
  mockSubjectBackendString3,
  mockSubjectTitle1,
  mockSubjectTitle3,
} from './policySubjectMocks';

export const mockRuleId1: string = 'r1';
export const mockRuleId2: string = 'r2';

export const mockPolicyRuleCard1: PolicyRuleCard = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectTitle1, mockSubjectTitle3],
  actions: [mockActionTitle1, mockActionTitle2],
  resources: mockPolicyRuleResources,
};
export const mockPolicyRuleCard2: PolicyRuleCard = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  resources: [[]],
};
export const mockPolicyRuleCards: PolicyRuleCard[] = [mockPolicyRuleCard1, mockPolicyRuleCard2];

export const mockPolicyRule1: PolicyRule = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectBackendString1, mockSubjectBackendString3],
  actions: [mockAction1.actionId, mockAction2.actionId],
  resources: mockPolicyResources,
};
export const mockPolicyRule2: PolicyRule = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  resources: [[]],
};
export const mockPolicyRules: PolicyRule[] = [mockPolicyRule1, mockPolicyRule2];
