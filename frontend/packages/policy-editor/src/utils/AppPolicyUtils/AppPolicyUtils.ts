import type {
  AppPolicyActionMap,
  PolicyEditorUsage,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
} from '../../types';

export const APP_SUBRESOURCE_DEFAULT_LIMITATIONS = {
  'urn:altinn:org': '[org]',
  'urn:altinn:app': '[app]',
};
export const SERVICE_OWNER_SUBJECT_CODE = '[org]';
export const SERVICE_OWNER_SUBJECT_NAME = 'Tjenesteeier';

/**
 * Get the display name for a subject
 * @param subject The subject to get the display name for
 * @param allSubjects
 * @returns The display name for the subject, or the subject itself if no display name is found
 */
export const getSubjectDisplayName = (subject: string, allSubjects: PolicySubject[]): string => {
  if (subject.toLowerCase() === SERVICE_OWNER_SUBJECT_CODE) {
    return SERVICE_OWNER_SUBJECT_NAME;
  }
  return (
    allSubjects.find((sub) => sub.subjectId.toLowerCase() === subject.toLowerCase())
      ?.subjectTitle || subject
  );
};

/**
 *
 * @param rules Filters out only the rules that have the provided subject (case-insensitive)
 * @param subject
 * @returns The filtered rules
 */
export const filterRulesWithSubject = (
  rules: PolicyRuleCard[],
  subject: string,
): PolicyRuleCard[] => {
  return rules.filter((rule) =>
    rule.subject.map((s) => s.toLowerCase()).includes(subject.toLowerCase()),
  );
};

/**
 * Filters out all default app limitations from a list of sub-resource limitations
 * @param appResources The resources to filter
 * @returns The filtered resources
 */
export const filterDefaultAppLimitations = (
  appResources: PolicyRuleResource[],
): PolicyRuleResource[] => {
  const subResourceDefaultTypes = Object.keys(APP_SUBRESOURCE_DEFAULT_LIMITATIONS);
  if (!appResources.find((r) => subResourceDefaultTypes.includes(r.type))) {
    return undefined;
  }

  return appResources.filter((r) => !subResourceDefaultTypes.includes(r.type));
};

/**
 * Extracts all unique subjects from a list of policy rules
 * @param rules The policy rules to extract subjects from
 * @returns The list of unique subjects
 */
export const extractAllUniqueSubjects = (rules: PolicyRuleCard[]): string[] => {
  const subjects: string[] = [];
  rules.forEach((rule) => {
    rule.subject.forEach((s) => {
      if (!subjects.includes(s.toLowerCase())) {
        subjects.push(s.toLowerCase());
      }
    });
  });
  return subjects;
};

/**
 * Extracts all unique actions from a list of policy rules
 * @param rules The policy rules to extract actions from
 * @returns The list of unique actions
 */
export const extractAllUniqueActions = (rules: PolicyRuleCard[]): string[] => {
  const actions: string[] = [];
  rules.forEach((rule) => {
    rule.actions.forEach((a) => {
      if (!actions.includes(a)) {
        actions.push(a);
      }
    });
  });
  return actions;
};

/**
 * Get the display text key for a subject category
 * @param subject The subject to get the category text key for
 * @param subjects The list of all subjects
 * @returns The text key for the subject category
 */
export const getSubjectCategoryTextKey = (
  subject: string,
  subjects: PolicySubject[],
): string | undefined => {
  const source = subjects.find(
    (sub) => sub.subjectId.toLowerCase() === subject.toLowerCase(),
  )?.subjectSource;
  if (!source) {
    return 'policy_editor.role_category.unknown';
  }
  return `policy_editor.role_category.${source.replace(':', '_')}`;
};

/**
 * Get complete sub-resource display text, including limitations
 * @param resources The resources to get the display text for
 * @param usageType The usage type for the policy editor
 * @returns The display text
 */
export const getSubResourceDisplayText = (
  resources: PolicyRuleResource[],
  usageType: PolicyEditorUsage,
  t: (key: string) => string,
): string => {
  if (usageType === 'app') {
    const limitations = filterDefaultAppLimitations(resources)
      .map((r) => r.id)
      .join(' - ');
    if (limitations && limitations.length > 0) {
      return limitations;
    }
    return t('policy_editor._subresource_covers.whole_service');
  }
  return resources.map((r) => r.id).join(' - ');
};

/**
 * Maps actions to the resources they cover for a specific role
 * @param policyRules The policy rules to map actions for
 * @param subject The subject to map actions for
 * @param usageType The usage type for the policy editor
 * @returns A map of actions to the resources they cover
 */
export const mapActionsForRole = (
  policyRules: PolicyRuleCard[],
  subject: string,
  usageType: PolicyEditorUsage,
  t: (key: string) => string,
): AppPolicyActionMap => {
  const result = {};
  filterRulesWithSubject(policyRules, subject).forEach((rule) => {
    const covers = rule.resources
      .map((r) => getSubResourceDisplayText(r, usageType, t).concat(` (${rule.ruleId})`))
      .join(', ');

    rule.actions.forEach((action) => {
      if (!result[action]) {
        result[action] = `${covers}`;
      } else {
        result[action] += `, ${covers}`;
      }
    });
  });
  return result;
};
