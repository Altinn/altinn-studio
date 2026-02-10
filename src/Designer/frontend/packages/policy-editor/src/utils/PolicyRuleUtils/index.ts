import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '@altinn/policy-editor/constants';
import type { PolicyAction, PolicyRuleCard, PolicySubject } from '../../types';

/**
 * Function to update the fields inside the rule object in the rule array.
 * This function has to be called every time an element inside the card is
 * changing so that the parent component knows that the child element is changed.
 * It also updates the complete list of policy rules.
 *
 * @param description the description
 * @param subjectTitles the selected subjectTitle array
 * @param actiontTitles the selected actions array
 * @param policyRuleResources the selected resources array
 * @param policyRuleId the id of the policy rule
 * @param currentRules list of current rules
 *
 * @returns a list of PolicyRuleCard with the updates rules
 */
export const getUpdatedRules = (
  updatedRule: PolicyRuleCard,
  policyRuleId: string,
  currentRules: PolicyRuleCard[],
): PolicyRuleCard[] => {
  const updatedRules = [...currentRules];
  const ruleIndex = currentRules.findIndex((rule) => rule.ruleId === policyRuleId);

  updatedRules[ruleIndex] = updatedRule;

  return updatedRules;
};

/**
 * Maps the action objects to option objects for display in the select component
 *
 * @param actions the list of possible actions
 * @param policyRule the current policy rule
 *
 * @returns a list of select options with value and label
 */
export const getActionOptions = (actions: PolicyAction[], policyRule: PolicyRuleCard) => {
  return actions
    .filter((a) => !policyRule.actions.includes(a.actionId))
    .map((a) => ({ value: a.actionId, label: a.actionId }));
};

/**
 * Gets the id of the policy
 *
 * @param policyRule the policyRule
 *
 * @returns the id
 */
export const getPolicyRuleIdString = (policyRule: PolicyRuleCard) => {
  return policyRule.ruleId.toString();
};

const isPersonSubject = (subjectUrn: string) => {
  return subjectUrn === 'urn:altinn:rolecode:PRIV' || subjectUrn === 'urn:altinn:rolecode:SELN';
};
export const getCcrSubjects = (subjects: PolicySubject[]) => {
  return subjects.filter((s) => s.provider?.code === 'sys-ccr');
};
export const getAltinnSubjects = (subjects: PolicySubject[]) => {
  return subjects.filter((s) => {
    const isAltinn = s.provider?.code === 'sys-altinn2' || s.provider?.code === 'sys-altinn3';
    const isPersonRole = isPersonSubject(s.legacyUrn);
    return isAltinn && !isPersonRole;
  });
};
export const getOtherSubjects = (subjects: PolicySubject[]) => {
  return subjects.filter((s) => {
    const isOther = s.provider?.code === INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE;
    return isOther;
  });
};

export const getPersonSubjects = (subjects: PolicySubject[]) => {
  return subjects.filter((s) => {
    return isPersonSubject(s.legacyUrn);
  });
};
