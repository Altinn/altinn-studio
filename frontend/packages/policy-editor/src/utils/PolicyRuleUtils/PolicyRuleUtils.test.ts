import {
  getUpdatedRules,
  getSubjectOptions,
  getActionOptions,
  getPolicyRuleIdString,
} from './index';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
  mockActions,
} from '../../../test/mocks/policyActionMocks';
import {
  mockPolicyRuleCard1,
  mockPolicyRuleCard2,
  mockPolicyRuleCards,
  mockRuleId1,
} from '../../../test/mocks/policyRuleMocks';
import {
  mockSubjects,
  mockSubjectId1,
  mockSubjectId2,
  mockSubjectId3,
} from '../../../test/mocks/policySubjectMocks';

describe('PolicyRuleUtils', () => {
  describe('getUpdatedRules', () => {
    it('should update a rule in the list', () => {
      const updatedRule = { ...mockPolicyRuleCard1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(
        updatedRule,
        mockPolicyRuleCard1.ruleId,
        mockPolicyRuleCards,
      );

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe('Updated Rule');
    });

    it('should handle updating a rule that does not exist', () => {
      const updatedRule = { ...mockPolicyRuleCard1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(updatedRule, '789', mockPolicyRuleCards);

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe(mockPolicyRuleCard1.description);
    });
  });

  describe('getSubjectOptions', () => {
    it('should return subject options not included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, mockPolicyRuleCard1);

      expect(subjectOptions).toHaveLength(1); // Subject 1 and subject 3 are removed
      expect(subjectOptions.map((s) => s.value)).toEqual([mockSubjectId2]); // 2 not in the rule
    });

    it('should return all subject options if none are included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, mockPolicyRuleCard2);

      expect(subjectOptions.length).toBe(3);
      expect(subjectOptions.map((s) => s.value)).toEqual([
        mockSubjectId1,
        mockSubjectId2,
        mockSubjectId3,
      ]);
    });

    it('should return an empty array if all subjects are included in the policy rule', () => {
      const subjectOptions = getSubjectOptions(mockSubjects, {
        ...mockPolicyRuleCard1,
        subject: [mockSubjectId1, mockSubjectId2, mockSubjectId3],
      });

      expect(subjectOptions).toHaveLength(0);
    });
  });

  describe('getActionOptions', () => {
    it('should return action options not included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRuleCard1);

      expect(actionOptions.length).toBe(1); // Action 1 and action 2 are removed
      expect(actionOptions.map((a) => a.value)).toEqual([mockActionId3]); // 3 not in the rule
    });

    it('should return all action options if none are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRuleCard2);

      expect(actionOptions.length).toBe(4);
      expect(actionOptions.map((a) => a.value)).toEqual([
        mockActionId1,
        mockActionId2,
        mockActionId3,
        mockActionId4,
      ]);
    });

    it('should return an empty array if all actions are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, {
        ...mockPolicyRuleCard1,
        actions: [mockActionId1, mockActionId2, mockActionId3, mockActionId4],
      });

      expect(actionOptions.length).toBe(0);
    });
  });

  describe('getPolicyRuleIdString', () => {
    it('should return the string representation of the rule ID', () => {
      const ruleIdString = getPolicyRuleIdString(mockPolicyRuleCard1);

      expect(ruleIdString).toBe(mockRuleId1);
    });
  });
});
