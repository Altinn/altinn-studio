import { PolicyAction, PolicyRule, PolicySubject } from '@altinn/policy-editor';
import {
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  getExistingActionIds,
  createNewActionFromActionString,
  getExistingSubjectIds,
  convertSubjectStringToSubjectId,
  createNewSubjectFromSubjectString,
  convertSubjectStringToSubjectSource,
} from './policyTabUtils';

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

  describe('getExistingActionIds', () => {
    it('gets existing action IDs correctly', () => {
      const existingActionIds = getExistingActionIds(mockPolicyActions);
      expect(existingActionIds).toEqual([mockActionId1, mockActionId2]);
    });
  });

  describe('createNewActionFromActionString', () => {
    const mockActionString: string = 'newAction';

    it('creates a new action from action string correctly', () => {
      const newAction = createNewActionFromActionString(mockActionString);

      expect(newAction).toEqual({
        actionId: mockActionString,
        actionTitle: mockActionString,
        actionDescription: null,
      });
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

  describe('getExistingSubjectIds', () => {
    it('gets existing subject IDs correctly', () => {
      const existingSubjectIds = getExistingSubjectIds(mockPolicySubjects);

      expect(existingSubjectIds).toEqual([mockSubjectId1, mockSubjectId2]);
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

      expect(newSubject).toEqual({ ...mockPolicySubject1, subjectTitle: mockSubjectId1 });
    });
  });

  describe('convertSubjectStringToSubjectSource', () => {
    it('converts subject string to subject source correctly', () => {
      const subjectSource = convertSubjectStringToSubjectSource(mockSubjectString1);

      expect(subjectSource).toBe(mockSubjectSourceRolecode);
    });
  });
});
