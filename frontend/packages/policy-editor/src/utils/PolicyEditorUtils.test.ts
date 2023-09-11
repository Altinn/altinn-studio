import {
  mapPolicySubjectToSubjectTitle,
  mapResourceFromBackendToResource,
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  mapSubjectTitleToSubjectString,
  mapActionTitleToActionId,
  mapPolicyRuleToPolicyRuleBackendObject,
  createNewPolicyResource,
  mapPolicyActionsToActionTitle,
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
        mockPolicyRules
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
        mockRuleId1
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
