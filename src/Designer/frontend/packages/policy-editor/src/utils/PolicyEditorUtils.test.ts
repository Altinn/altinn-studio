import {
  mapResourceFromBackendToResource,
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  mapPolicyRuleToPolicyRuleBackendObject,
  createNewPolicyResource,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  convertSubjectStringToSubjectId,
  createNewSubjectFromSubjectString,
} from './index';
import {
  mockAction1,
  mockAction2,
  mockAction3,
  mockAction4,
} from '../../test/mocks/policyActionMocks';
import {
  mockPolicyRule1,
  mockPolicyRuleCard1,
  mockPolicyRuleCards,
  mockPolicyRules,
  mockRuleId1,
} from '../../test/mocks/policyRuleMocks';
import {
  mockSubject1,
  mockSubject2,
  mockSubject3,
  mockSubjectId1,
  mockSubjectId3,
} from '../../test/mocks/policySubjectMocks';
import {
  mockResource11,
  mockResource3,
  mockResourceType1,
  mockResourecId1,
  mockPolicyResourceBackendString1,
} from '../../test/mocks/policySubResourceMocks';

describe('PolicyEditorUtils', () => {
  describe('mapResourceFromBackendToResource', () => {
    it('should map a resource string to a resource object', () => {
      const result = mapResourceFromBackendToResource(mockPolicyResourceBackendString1);

      expect(result).toEqual({ type: mockResourceType1, id: mockResourecId1 });
    });
  });

  describe('mapPolicyRulesBackendObjectToPolicyRuleCard', () => {
    it('should map policy rules from backend to policy rule cards', () => {
      const result = mapPolicyRulesBackendObjectToPolicyRuleCard(mockPolicyRules);
      expect(result).toEqual(mockPolicyRuleCards);
    });
  });

  describe('mapPolicyRuleToPolicyRuleBackendObject', () => {
    it('should map a policy rule card to a policy rule backend object', () => {
      const mockPolicyRule = {
        ...mockPolicyRuleCard1,
        subject: [mockSubjectId1, mockSubjectId3],
      };
      const result = mapPolicyRuleToPolicyRuleBackendObject(mockPolicyRule, mockRuleId1);

      expect(result).toEqual(mockPolicyRule1);
    });
  });

  describe('createNewPolicyResource', () => {
    it('should create a new policy resource with "resourcetype" and "resourceid" for usagetype resource', () => {
      const result = createNewPolicyResource('resource', mockResourceType1, mockResourecId1);

      expect(result).toEqual([mockResource11]);
    });

    it('should create a new policy resource with "org" and "app" for usagetype app', () => {
      const result = createNewPolicyResource('app', mockResourceType1, '');

      expect(result).toEqual(mockResource3);
    });
  });

  describe('mergeActionsFromPolicyWithActionOptions', () => {
    it('merges actions from policy rules with existing action options', () => {
      const mergedActions = mergeActionsFromPolicyWithActionOptions(
        [mockPolicyRule1],
        [mockAction3],
      );

      expect(mergedActions).toHaveLength(4);
      expect(mergedActions.map((action) => action.actionId)).toEqual([
        mockAction3.actionId,
        mockAction1.actionId,
        mockAction2.actionId,
        mockAction4.actionId,
      ]);
    });
  });

  describe('mergeSubjectsFromPolicyWithSubjectOptions', () => {
    it('merges subjects from policy rules with existing subject options', () => {
      const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(
        [mockPolicyRule1],
        [mockSubject2],
      );

      expect(mergedSubjects).toHaveLength(3);
      expect(mergedSubjects.map((subject) => subject.urn)).toEqual([
        mockSubject2.urn,
        mockSubject1.urn,
        mockSubject3.urn,
      ]);
    });
  });

  describe('convertSubjectStringToSubjectId', () => {
    it('converts subject string to subject ID correctly', () => {
      const subjectId = convertSubjectStringToSubjectId(mockSubjectId1);

      expect(subjectId).toBe('s1');
    });
  });

  describe('createNewSubjectFromSubjectString', () => {
    it('creates a new subject from subject string correctly', () => {
      const newSubject = createNewSubjectFromSubjectString('urn:altinn:rolecode:S4');

      expect(newSubject).toEqual({
        legacyRoleCode: 's4',
        name: 'S4',
        legacyUrn: 'urn:altinn:rolecode:S4',
        urn: 'urn:altinn:rolecode:S4',
        description: '',
        id: '',
        provider: {
          code: 'sys-internal',
          id: '',
          name: '',
        },
      });
    });
  });
});
