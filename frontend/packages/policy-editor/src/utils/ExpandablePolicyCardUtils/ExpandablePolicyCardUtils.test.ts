import {
  getUpdatedRules,
  getSubjectOptions,
  getActionOptions,
  getPolicyRuleIdString,
} from './index';
import type { PolicyRuleCard, PolicyAction, PolicySubject, PolicyRuleResource } from '../../types';

const mockRuleId1: string = 'r1';
const mockRuleId2: string = 'r2';

const mockResourecId: string = 'resource-1';
const mockResourceType: string = 'urn:test';

const mockActionTitle1: string = 'Action 1';
const mockActionTitle2: string = 'Action 2';
const mockActionTitle3: string = 'Action 3';

const mockSubjectTitle1: string = 'Subject 1';
const mockSubjectTitle2: string = 'Subject 2';
const mockSubjectTitle3: string = 'Subject 3';

const mockResource11: PolicyRuleResource = { type: mockResourceType, id: mockResourecId };
const mockResource12: PolicyRuleResource = { type: 'urn:test.1.2', id: '1.2' };
const mockResource21: PolicyRuleResource = { type: 'urn:test.2.1', id: '2.1' };
const mockResource1: PolicyRuleResource[] = [mockResource11, mockResource12];
const mockResource2: PolicyRuleResource[] = [mockResource21];
const mockPolicyResources: PolicyRuleResource[][] = [mockResource1, mockResource2];

const mockPolicyRule1: PolicyRuleCard = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectTitle1, mockSubjectTitle3],
  actions: [mockActionTitle1, mockActionTitle2],
  resources: mockPolicyResources,
};
const mockPolicyRule2: PolicyRuleCard = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  resources: [[]],
};
const mockPolicyRules: PolicyRuleCard[] = [mockPolicyRule1, mockPolicyRule2];

const mockAction1: PolicyAction = {
  actionId: 'a1',
  actionTitle: mockActionTitle1,
  actionDescription: null,
};
const mockAction2: PolicyAction = {
  actionId: 'a2',
  actionTitle: mockActionTitle2,
  actionDescription: null,
};
const mockAction3: PolicyAction = {
  actionId: 'a3',
  actionTitle: mockActionTitle3,
  actionDescription: null,
};
const mockActions: PolicyAction[] = [mockAction1, mockAction2, mockAction3];

const mockSubject1: PolicySubject = {
  subjectId: 's1',
  subjectSource: 'Subject1',
  subjectTitle: mockSubjectTitle1,
  subjectDescription: '',
};
const mockSubject2: PolicySubject = {
  subjectId: 'a2',
  subjectSource: 'Subject2',
  subjectTitle: mockSubjectTitle2,
  subjectDescription: '',
};
const mockSubject3: PolicySubject = {
  subjectId: 'a3',
  subjectSource: 'Subject3',
  subjectTitle: mockSubjectTitle3,
  subjectDescription: '',
};
const mockSubjects: PolicySubject[] = [mockSubject1, mockSubject2, mockSubject3];

describe('ExpandablePolicyCardUtils', () => {
  describe('getUpdatedRules', () => {
    it('should update a rule in the list', () => {
      const updatedRule = { ...mockPolicyRule1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(updatedRule, mockPolicyRule1.ruleId, mockPolicyRules);

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe('Updated Rule');
    });

    it('should handle updating a rule that does not exist', () => {
      const updatedRule = { ...mockPolicyRule1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(updatedRule, '789', mockPolicyRules);

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe(mockPolicyRule1.description);
    });
  });

  describe('getSubjectOptions', () => {
    it('should return subject options not included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, mockPolicyRule1);

      expect(subjectOptions.length).toBe(1); // Subject 1 and subject 3 are removed
      expect(subjectOptions.map((s) => s.value)).toEqual([mockSubjectTitle2]); // 2 not in the rule
    });

    it('should return all subject options if none are included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, mockPolicyRule2);

      expect(subjectOptions.length).toBe(3);
      expect(subjectOptions.map((s) => s.value)).toEqual([
        mockSubjectTitle1,
        mockSubjectTitle2,
        mockSubjectTitle3,
      ]);
    });

    it('should return an empty array if all subjects are included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, {
        ...mockPolicyRule1,
        subject: [mockSubjectTitle1, mockSubjectTitle2, mockSubjectTitle3],
      });

      expect(subjectOptions.length).toBe(0);
    });
  });

  describe('getActionOptions', () => {
    it('should return action options not included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRule1);

      expect(actionOptions.length).toBe(1); // Action 1 and action 2 are removed
      expect(actionOptions.map((a) => a.value)).toEqual([mockActionTitle3]); // 3 not in the rule
    });

    it('should return all action options if none are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRule2);

      expect(actionOptions.length).toBe(3);
      expect(actionOptions.map((a) => a.value)).toEqual([
        mockActionTitle1,
        mockActionTitle2,
        mockActionTitle3,
      ]);
    });

    it('should return an empty array if all actions are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, {
        ...mockPolicyRule1,
        actions: [mockActionTitle1, mockActionTitle2, mockActionTitle3],
      });

      expect(actionOptions.length).toBe(0);
    });
  });

  describe('getPolicyRuleIdString', () => {
    it('should return the string representation of the rule ID', () => {
      const ruleIdString = getPolicyRuleIdString(mockPolicyRule1);

      expect(ruleIdString).toBe(mockRuleId1);
    });
  });
});
