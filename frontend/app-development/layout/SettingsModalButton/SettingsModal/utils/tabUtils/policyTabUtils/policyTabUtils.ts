import { PolicyAction, PolicyRule, PolicySubject } from '@altinn/policy-editor';
import { deepCopy } from 'app-shared/pure';

/**
 * Merges actions from policy rules with existing action options.
 *
 * @param {PolicyRule[]} rules - The policy rules containing actions to be merged.
 * @param {PolicyAction[]} actions - The existing policy actions to merge with.
 *
 * @returns {PolicyAction[]} - The merged policy actions.
 */
export const mergeActionsFromPolicyWithActionOptions = (
  rules: PolicyRule[],
  actions: PolicyAction[],
): PolicyAction[] => {
  const existingActionIds = getExistingActionIds(actions);
  const copiedActions = deepCopy(actions);

  rules.forEach((rule) => {
    rule.actions.forEach((actionString) => {
      if (!existingActionIds.includes(actionString)) {
        const newAction: PolicyAction = createNewActionFromActionString(actionString);
        copiedActions.push(newAction);
        existingActionIds.push(actionString);
      }
    });
  });

  return copiedActions;
};

export const getExistingActionIds = (actions: PolicyAction[]): string[] =>
  actions.map((action) => action.actionId);

export const createNewActionFromActionString = (actionString: string): PolicyAction => ({
  actionId: actionString,
  actionTitle: actionString,
  actionDescription: null,
});

/**
 * Merges subjects from policy rules with existing subject options.
 *
 * @param {PolicyRule[]} rules - The policy rules containing subjects to be merged.
 * @param {PolicySubject[]} subjects - The existing policy subjects to merge with.
 *
 * @returns {PolicySubject[]} - The merged policy subjects.
 */
export const mergeSubjectsFromPolicyWithSubjectOptions = (
  rules: PolicyRule[],
  subjects: PolicySubject[],
): PolicySubject[] => {
  const existingSubjectIds = getExistingSubjectIds(subjects);
  const copiedSubjects = deepCopy(subjects);

  rules.forEach((rule) => {
    rule.subject.forEach((subjectString) => {
      const subjectId = convertSubjectStringToSubjectId(subjectString);

      if (!existingSubjectIds.includes(subjectId)) {
        const newSubject: PolicySubject = createNewSubjectFromSubjectString(subjectString);
        copiedSubjects.push(newSubject);
        existingSubjectIds.push(subjectId);
      }
    });
  });

  return copiedSubjects;
};

export const getExistingSubjectIds = (subjects: PolicySubject[]): string[] =>
  subjects.map((subject) => subject.subjectId);

export const convertSubjectStringToSubjectId = (subjectString: string): string => {
  const subjectStringAsArray: string[] = subjectString.split(':');
  return subjectStringAsArray[subjectStringAsArray.length - 1]; // The final element is the ID
};

export const createNewSubjectFromSubjectString = (subjectString: string): PolicySubject => {
  const subjectId: string = convertSubjectStringToSubjectId(subjectString);
  return {
    subjectId: subjectId,
    subjectTitle: subjectId,
    subjectSource: convertSubjectStringToSubjectSource(subjectString),
    subjectDescription: '',
  };
};

export const convertSubjectStringToSubjectSource = (subjectString: string): string => {
  const subjectStringAsArray: string[] = subjectString.split(':');
  return subjectStringAsArray.slice(0, subjectStringAsArray.length - 1).join(':');
};
