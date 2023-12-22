import { PolicyAction, PolicyRule, PolicySubject } from '@altinn/policy-editor';
import {
  mapPolicySubjectToSubjectTitle,
  mapResourceFromBackendToResource,
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  mapSubjectTitleToSubjectString,
  mapActionTitleToActionId,
  mapPolicyRuleToPolicyRuleBackendObject,
  createNewPolicyResource,
  mapPolicyActionsToActionTitle,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  convertSubjectStringToSubjectId,
  createNewSubjectFromSubjectString,
  convertSubjectStringToSubjectSource,
} from './index';
import {
  mockAction1,
  mockAction2,
  mockActionTitle1,
  mockActionTitle2,
  mockActions,
  mockPolicyResourceBackendString1,
  mockPolicyRule1,
  mockPolicyRuleCard1,
  mockPolicyRuleCards,
  mockPolicyRules,
  mockResource11,
  mockResource3,
  mockResourceType1,
  mockResourecId1,
  mockRuleId1,
  mockSubjectBackendString1,
  mockSubjectBackendString3,
  mockSubjectTitle1,
  mockSubjectTitle3,
  mockSubjects,
} from '../data-mocks';

describe('PolicyEditorUtils', () => {
  describe('mapPolicySubjectToSubjectTitle', () => {
    it('should map policy subjects to subject titles', () => {
      const mockBackendPolicySubjects: string[] = [
        mockSubjectBackendString1,
        mockSubjectBackendString3,
      ];
      const result = mapPolicySubjectToSubjectTitle(mockSubjects, mockBackendPolicySubjects);

      expect(result).toEqual([mockSubjectTitle1, mockSubjectTitle3]);
    });
  });

  describe('mapResourceFromBackendToResource', () => {
    it('should map a resource string to a resource object', () => {
      const result = mapResourceFromBackendToResource(mockPolicyResourceBackendString1);

      expect(result).toEqual({ type: mockResourceType1, id: mockResourecId1 });
    });
  });

  describe('mapPolicyActionsToActionTitle', () => {
    it('should map policy actions to action titles', () => {
      const mockBackendPolicyActions: string[] = [mockAction1.actionId, mockAction2.actionId];
      const result = mapPolicyActionsToActionTitle(mockActions, mockBackendPolicyActions);

      expect(result).toEqual([mockActionTitle1, mockActionTitle2]);
    });
  });

  describe('mapPolicyRulesBackendObjectToPolicyRuleCard', () => {
    it('should map policy rules from backend to policy rule cards', () => {
      const result = mapPolicyRulesBackendObjectToPolicyRuleCard(
        mockSubjects,
        mockActions,
        mockPolicyRules,
      );
      expect(result).toEqual(mockPolicyRuleCards);
    });
  });

  describe('mapSubjectTitleToSubjectString', () => {
    it('should map a subject title to a subject string', () => {
      const result = mapSubjectTitleToSubjectString(mockSubjects, mockSubjectTitle1);

      expect(result).toBe(mockSubjectBackendString1);
    });
  });

  describe('mapActionTitleToActionId', () => {
    it('should map an action title to an action id', () => {
      const result = mapActionTitleToActionId(mockActions, mockActionTitle1);

      expect(result).toBe(mockAction1.actionId);
    });
  });

  describe('mapPolicyRuleToPolicyRuleBackendObject', () => {
    it('should map a policy rule card to a policy rule backend object', () => {
      const result = mapPolicyRuleToPolicyRuleBackendObject(
        mockSubjects,
        mockActions,
        mockPolicyRuleCard1,
        mockRuleId1,
      );

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
});

const mockActionId1: string = 'action1';
const mockActionId2: string = 'action2';
const mockActionId3: string = 'action3';

const mockPolicyRulesActions: PolicyRule[] = [
  {
    ruleId: '1',
    description: '',
    subject: [],
    actions: [mockActionId1, mockActionId2],
    resources: [],
  },
  {
    ruleId: '2',
    description: '',
    subject: [],
    actions: [mockActionId3],
    resources: [],
  },
];
const mockPolicyActions: PolicyAction[] = [
  { actionId: mockActionId1, actionTitle: 'Action 1', actionDescription: '' },
  { actionId: mockActionId2, actionTitle: 'Action 2', actionDescription: '' },
];

const mockSubjectId1: string = 'subject1';
const mockSubjectId2: string = 'subject2';
const mockSubjectId3: string = 'subject3';
const mockSubjectSourceRolecode: string = 'urn:altinn:rolecode';
const mockSubjectSourceRolecodeWithoutUrn: string = 'altinn:rolecode';
const mockSubjectSourceOrg: string = 'urn:altinn:org';

const mockPolicySubject1: PolicySubject = {
  subjectId: mockSubjectId1,
  subjectTitle: 'Subject 1',
  subjectSource: mockSubjectSourceRolecode,
  subjectDescription: '',
};
const mockPolicySubject2: PolicySubject = {
  subjectId: mockSubjectId2,
  subjectTitle: 'Subject 2',
  subjectSource: mockSubjectSourceOrg,
  subjectDescription: '',
};
const mockPolicySubjects: PolicySubject[] = [mockPolicySubject1, mockPolicySubject2];

const mockSubjectString1: string = `${mockSubjectSourceRolecode}:${mockSubjectId1}`;

const mockPolicyRulesSubject: PolicyRule[] = [
  {
    ruleId: '1',
    description: '',
    subject: [mockSubjectString1, `${mockSubjectSourceOrg}:${mockSubjectId2}`],
    actions: [],
    resources: [],
  },
  {
    ruleId: '2',
    description: '',
    subject: [`${mockSubjectSourceRolecode}:${mockSubjectId3}`],
    actions: [],
    resources: [],
  },
];
describe('policyTabUtils', () => {
  describe('mergeActionsFromPolicyWithActionOptions', () => {
    it('merges actions from policy rules with existing action options', () => {
      const mergedActions = mergeActionsFromPolicyWithActionOptions(
        mockPolicyRulesActions,
        mockPolicyActions,
      );

      expect(mergedActions).toHaveLength(3);
      expect(mergedActions.map((action) => action.actionId)).toEqual([
        mockActionId1,
        mockActionId2,
        mockActionId3,
      ]);
    });
  });

  describe('mergeSubjectsFromPolicyWithSubjectOptions', () => {
    it('merges subjects from policy rules with existing subject options', () => {
      const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(
        mockPolicyRulesSubject,
        mockPolicySubjects,
      );

      expect(mergedSubjects).toHaveLength(3);
      expect(mergedSubjects.map((subject) => subject.subjectId)).toEqual([
        mockSubjectId1,
        mockSubjectId2,
        mockSubjectId3,
      ]);
    });
  });

  describe('convertSubjectStringToSubjectId', () => {
    it('converts subject string to subject ID correctly', () => {
      const subjectId = convertSubjectStringToSubjectId(mockSubjectString1);

      expect(subjectId).toBe(mockSubjectId1);
    });
  });

  describe('createNewSubjectFromSubjectString', () => {
    it('creates a new subject from subject string correctly', () => {
      const newSubject = createNewSubjectFromSubjectString(mockSubjectString1);

      expect(newSubject).toEqual({
        ...mockPolicySubject1,
        subjectSource: mockSubjectSourceRolecodeWithoutUrn,
        subjectTitle: mockSubjectId1,
      });
    });
  });

  describe('convertSubjectStringToSubjectSource', () => {
    it('converts subject string to subject source correctly', () => {
      const subjectSource = convertSubjectStringToSubjectSource(mockSubjectString1);
      expect(subjectSource).toBe(mockSubjectSourceRolecodeWithoutUrn);
    });
  });
});
