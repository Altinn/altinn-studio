import { type PolicyEditorContextProps } from '../../src/contexts/PolicyEditorContext';
import { mockActions } from './policyActionMocks';
import { mockPolicyRuleCards } from './policyRuleMocks';
import { mockSubjects } from './policySubjectMocks';
import { type PolicyEditorUsage } from '../../src/types';

const mockUsageType: PolicyEditorUsage = 'app';
const mockResourceType: string = 'urn:altinn';

export const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: mockPolicyRuleCards,
  actions: mockActions,
  subjects: mockSubjects,
  usageType: mockUsageType,
  resourceType: mockResourceType,
};
