import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PolicyRuleCard, PolicyRuleResource } from '../../types';
import {
  extractAllUniqueAccessPackages,
  extractAllUniqueActions,
  extractAllUniqueSubjects,
  filterDefaultAppLimitations,
  filterRulesWithSubject,
  getSubResourceDisplayText,
  getSubjectCategoryTextKey,
  getSubjectDisplayName,
  mapActionsForRoleOrAccessPackage,
} from './index';

describe('AppPolicyUtils', () => {
  describe('filterRulesWithSubject', () => {
    it('should return a list of rules with the provided subject', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['read'],
          resources: [],
          subject: ['subject2'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const filteredRules = filterRulesWithSubject(rules, 'subject1');
      expect(filteredRules).toEqual([
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
      ]);
    });

    it('should return an empty list if no rules have the provided subject', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['read'],
          resources: [],
          subject: ['subject2'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const filteredRules = filterRulesWithSubject(rules, 'subject3');
      expect(filteredRules).toEqual([]);
    });
  });

  describe('filterDefaultAppLimitations', () => {
    it('should filter out all default app limitations', () => {
      const appResources = [
        {
          type: 'urn:altinn:org',
          id: 'org',
        },
        {
          type: 'urn:altinn:app',
          id: 'app',
        },
        {
          type: 'urn:altinn:appresource',
          id: 'resource',
        },
      ];
      const filteredResources = filterDefaultAppLimitations(appResources);
      expect(filteredResources).toEqual([
        {
          type: 'urn:altinn:appresource',
          id: 'resource',
        },
      ]);
    });

    it('should return the input array if no default app limitations are present', () => {
      const appResources = [
        {
          type: 'urn:altinn:appresource',
          id: 'resource',
        },
      ];
      const filteredResources = filterDefaultAppLimitations(appResources);
      expect(filteredResources).toEqual(appResources);
    });

    it('should return an empty list if only default app limitations are present', () => {
      const appResources = [
        {
          type: 'urn:altinn:org',
          id: 'org',
        },
        {
          type: 'urn:altinn:app',
          id: 'app',
        },
      ];
      const filteredResources = filterDefaultAppLimitations(appResources);
      expect(filteredResources).toEqual([]);
    });
  });

  describe('extractAllUniqueActions', () => {
    it('should return a list of unique actions from a list of policy rules', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [],
          subject: [],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['read'],
          resources: [],
          subject: [],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: [],
          description: 'test',
        },
      ];
      const actions = extractAllUniqueActions(rules);
      expect(actions).toEqual(['read', 'write']);
    });

    it('should return an empty list if the list of policy rules is empty', () => {
      const rules: PolicyRuleCard[] = [];
      const actions = extractAllUniqueActions(rules);
      expect(actions).toEqual([]);
    });
  });

  describe('extractAllUniqueSubjects', () => {
    it('should return a list of unique subjects from a list of policy rules', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['read'],
          resources: [],
          subject: ['subject2'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const subjects = extractAllUniqueSubjects(rules);
      expect(subjects).toEqual(['subject1', 'subject2']);
    });

    it('should return an empty list if the list of policy rules is empty', () => {
      const rules: PolicyRuleCard[] = [];
      const subjects = extractAllUniqueSubjects(rules);
      expect(subjects).toEqual([]);
    });
  });

  describe('extractAllUniqueAccessPackages', () => {
    it('should return a list of unique access packages from a list of policy rules', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: [],
          resources: [],
          subject: [],
          accessPackages: ['package1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: [],
          resources: [],
          subject: [],
          accessPackages: ['package2'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [],
          subject: [],
          accessPackages: ['package1', 'package3'],
          description: 'test',
        },
      ];
      const actions = extractAllUniqueAccessPackages(rules);
      expect(actions).toEqual(['package1', 'package2', 'package3']);
    });

    it('should return an empty list if the list of policy rules is empty', () => {
      const rules: PolicyRuleCard[] = [];
      const actions = extractAllUniqueAccessPackages(rules);
      expect(actions).toEqual([]);
    });

    it('should return an empty list if no access packages are present', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: [],
          resources: [],
          subject: [],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: [],
          resources: [],
          subject: [],
          description: 'test',
        },
      ];
      const actions = extractAllUniqueAccessPackages(rules);
      expect(actions).toEqual([]);
    });
  });

  describe('getSubResourceDisplayText', () => {
    it('should return the display text for an app sub-resource with no limitations', () => {
      const resource: PolicyRuleResource[] = [
        {
          type: 'urn:altinn:org',
          id: '[org]',
        },
        {
          type: 'urn:altinn:app',
          id: '[app]',
        },
      ];
      const displayText = getSubResourceDisplayText(resource, 'app', textMock);
      expect(displayText).toEqual('[mockedText(policy_editor._subresource_covers.whole_service)]');
    });

    it('should return the display text for an app sub-resource with limitations', () => {
      const resource: PolicyRuleResource[] = [
        {
          type: 'urn:altinn:org',
          id: '[org]',
        },
        {
          type: 'urn:altinn:app',
          id: '[app]',
        },
        {
          type: 'urn:altinn:task',
          id: 'task_1',
        },
      ];
      const displayText = getSubResourceDisplayText(resource, 'app', textMock);
      expect(displayText).toEqual('task_1');
    });

    it('should return the display text for a generic sub-resource with limitations', () => {
      const resource: PolicyRuleResource[] = [
        {
          type: 'urn:altinn:org',
          id: '[org]',
        },
        {
          type: 'urn:altinn:app',
          id: '[app]',
        },
        {
          type: 'urn:altinn:task',
          id: 'task_1',
        },
      ];
      const displayText = getSubResourceDisplayText(resource, 'resource', textMock);
      expect(displayText).toEqual('[org] - [app] - task_1');
    });
  });

  describe('getSubjectCategoryTextKey', () => {
    it('should return the text key for the subject category', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: 'subject2',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 2',
          subjectDescription: 'Role 2 description',
        },
      ];
      const textKey = getSubjectCategoryTextKey('subject1', subjects);
      expect(textKey).toEqual('policy_editor.role_category.altinn_role');
    });

    it('should return unknown key if the subject is not found', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'urn:altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: 'subject2',
          subjectSource: 'urn:altinn:role',
          subjectTitle: 'Role 2',
          subjectDescription: 'Role 2 description',
        },
      ];
      const textKey = getSubjectCategoryTextKey('subject3', subjects);
      expect(textKey).toEqual('policy_editor.role_category.unknown');
    });
  });

  describe('mapActionsForRole', () => {
    it('should return a list of actions mapped to a role', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read', 'write'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['start'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject2'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write', 'start'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const mappedActions = mapActionsForRoleOrAccessPackage(rules, 'subject1', 'app', textMock);
      expect(mappedActions).toEqual({
        read: '[mockedText(policy_editor._subresource_covers.whole_service)] (1)',
        write:
          '[mockedText(policy_editor._subresource_covers.whole_service)] (1), [mockedText(policy_editor._subresource_covers.whole_service)] (3)',
        start: '[mockedText(policy_editor._subresource_covers.whole_service)] (3)',
      });
    });

    it('should return a map of actions to the sub-resources they cover for a given role', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
              {
                type: 'urn:altinn:task',
                id: 'task_1',
              },
            ],
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
              {
                type: 'urn:altinn:task',
                id: 'task_2',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['instantiate'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const mappedActions = mapActionsForRoleOrAccessPackage(rules, 'subject1', 'app', textMock);
      expect(mappedActions).toEqual({
        read: 'task_1 (1), task_2 (1)',
        write: '[mockedText(policy_editor._subresource_covers.whole_service)] (3)',
        instantiate: '[mockedText(policy_editor._subresource_covers.whole_service)] (2)',
      });
    });

    it('should return a map of actions to the sub-resources they cover for a given access package', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
              {
                type: 'urn:altinn:task',
                id: 'task_1',
              },
            ],
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
              {
                type: 'urn:altinn:task',
                id: 'task_2',
              },
            ],
          ],
          subject: ['subject1'],
          accessPackages: ['package1'],
          description: 'test',
        },
        {
          ruleId: '2',
          actions: ['instantiate'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          accessPackages: ['package1'],
          description: 'test',
        },
        {
          ruleId: '3',
          actions: ['write'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
            ],
          ],
          subject: ['subject1'],
          accessPackages: ['package1'],
          description: 'test',
        },
      ];
      const mappedActions = mapActionsForRoleOrAccessPackage(
        rules,
        'package1',
        'app',
        textMock,
        true,
      );
      expect(mappedActions).toEqual({
        read: 'task_1 (1), task_2 (1)',
        write: '[mockedText(policy_editor._subresource_covers.whole_service)] (3)',
        instantiate: '[mockedText(policy_editor._subresource_covers.whole_service)] (2)',
      });
    });

    it('should return an empty map if the list of rules is empty', () => {
      const rules: PolicyRuleCard[] = [];
      const mappedActions = mapActionsForRoleOrAccessPackage(rules, 'subject1', 'app', textMock);
      expect(mappedActions).toEqual({});
    });

    it('should return an empty map if the subject does not match any rules', () => {
      const rules: PolicyRuleCard[] = [
        {
          ruleId: '1',
          actions: ['read'],
          resources: [
            [
              {
                type: 'urn:altinn:org',
                id: '[org]',
              },
              {
                type: 'urn:altinn:app',
                id: '[app]',
              },
              {
                type: 'urn:altinn:task',
                id: 'task_1',
              },
            ],
          ],
          subject: ['subject1'],
          description: 'test',
        },
      ];
      const mappedActions = mapActionsForRoleOrAccessPackage(rules, 'subject2', 'app', textMock);
      expect(mappedActions).toEqual({});
    });
  });

  describe('getSubjectDisplayName', () => {
    it('should return the display name for a subject', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: 'subject2',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 2',
          subjectDescription: 'Role 2 description',
        },
      ];
      const displayName = getSubjectDisplayName('subject1', subjects);
      expect(displayName).toEqual('Role 1');
    });

    it('should return the subject ID if the subject is not found', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'urn:altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: 'subject2',
          subjectSource: 'urn:altinn:role',
          subjectTitle: 'Role 2',
          subjectDescription: 'Role 2 description',
        },
      ];
      const displayName = getSubjectDisplayName('subject3', subjects);
      expect(displayName).toEqual('subject3');
    });

    it('should return the service owner display name for the service owner subject', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: '[org]',
          subjectSource: 'altinn:org',
          subjectTitle: 'Tjenesteeier',
          subjectDescription: 'Tjenesteeier',
        },
      ];
      const displayName = getSubjectDisplayName('[org]', subjects);
      expect(displayName).toEqual('Tjenesteeier');
    });

    it('should return the service owner display name for the service owner subject regardless of case', () => {
      const subjects = [
        {
          subjectId: 'subject1',
          subjectSource: 'altinn:role',
          subjectTitle: 'Role 1',
          subjectDescription: 'Role 1 description',
        },
        {
          subjectId: '[org]',
          subjectSource: 'altinn:org',
          subjectTitle: 'Tjenesteeier',
          subjectDescription: 'Tjenesteeier',
        },
      ];
      const displayName = getSubjectDisplayName('SUBJECT1', subjects);
      expect(displayName).toEqual('Role 1');
    });
  });
});
