import {
  mapResourceFromBackendToResource,
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  mapPolicyRuleToPolicyRuleBackendObject,
  createNewPolicyResource,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  convertSubjectStringToSubjectId,
  createNewSubjectFromSubjectString,
  getNewRuleId,
  findSubject,
  hasSubject,
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
  mockPolicyRuleCard2,
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
import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '../constants';

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
      expect(mergedSubjects.map((subject) => subject.legacyUrn)).toEqual([
        mockSubject2.legacyUrn,
        mockSubject1.legacyUrn,
        mockSubject3.legacyUrn,
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
        id: 'urn:altinn:rolecode:S4',
        provider: {
          code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
          id: '',
          name: '',
        },
      });
    });
  });

  describe('hasSubject', () => {
    it('returns true when subjectList contains exact urn (case-insensitive)', () => {
      const subjects = ['urn:altinn:role:Revisor'];
      expect(hasSubject(subjects, 'urn:altinn:role:revisor')).toBe(true);
    });

    it('returns true when subjectList matches legacy urn', () => {
      const subjects = ['urn:altinn:role:skatt'];
      expect(hasSubject(subjects, 'some-other', 'URN:ALTINN:ROLE:SKATT')).toBe(true);
    });

    it('returns false when not found', () => {
      const subjects = ['urn:altinn:role:one'];
      expect(hasSubject(subjects, 'urn:altinn:role:two')).toBe(false);
    });
  });

  describe('findSubject', () => {
    it('finds by urn (case-insensitive)', () => {
      const found = findSubject([mockSubject1, mockSubject2], mockSubject1.urn.toUpperCase());
      expect(found).toBe(mockSubject1);
    });

    it('finds by legacyUrn (case-insensitive)', () => {
      const found = findSubject([mockSubject1, mockSubject2], mockSubject2.legacyUrn.toUpperCase());
      expect(found).toBe(mockSubject2);
    });

    it('returns undefined when not present', () => {
      const found = findSubject([mockSubject1], 'urn:altinn:role:missing');
      expect(found).toBeUndefined();
    });
  });

  describe('getNewRuleId', () => {
    it('returns "1" when no numeric ids present or rules empty', () => {
      const rules = [{ ...mockPolicyRuleCard1, ruleId: 'xyz' }];
      expect(getNewRuleId(rules)).toBe('1');
    });

    it('returns next numeric id after the largest numbered id', () => {
      const rules = [mockPolicyRuleCard2, { ...mockPolicyRuleCard1, ruleId: 'foo' }];
      expect(getNewRuleId(rules)).toBe('3');
    });

    it('handles non-sequential numeric ids', () => {
      const rules = [{ ...mockPolicyRuleCard2, ruleId: '10' }, mockPolicyRuleCard1];
      expect(getNewRuleId(rules)).toBe('11');
    });
  });
});
