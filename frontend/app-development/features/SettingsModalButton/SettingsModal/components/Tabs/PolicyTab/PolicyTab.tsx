import React, { ReactNode } from 'react';
import { PolicyEditor as PolicyEditorImpl } from '@altinn/policy-editor';
import type { PolicyAction, Policy, PolicySubject } from '@altinn/policy-editor';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';

/**
 * The different actions a policy can have. TODO - Find out if there should be more.
 * Issue: #10882
 */
const actionData: PolicyAction[] = [
  { actionId: 'read', actionTitle: 'Les', actionDescription: null },
  { actionId: 'write', actionTitle: 'Skriv', actionDescription: null },
  { actionId: 'delete', actionTitle: 'Slett', actionDescription: null },
  {
    actionId: 'instantiate',
    actionTitle: 'Instansier',
    actionDescription: null,
  },
  { actionId: 'confirm', actionTitle: 'Bekreft', actionDescription: null },
  { actionId: 'complete', actionTitle: 'Fullfør', actionDescription: null },
  { actionId: 'sign', actionTitle: 'Sign', actionDescription: null },
];

/**
 * The different subjects a policy can have. TODO - Find out if there should be more.
 * Issue: #10882
 */
const subjectData: PolicySubject[] = [
  {
    subjectDescription: 'Daglig leder fra enhetsregisteret',
    subjectId: 'DAGL',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Daglig leder',
  },
  {
    subjectDescription: 'Regnskapsfører',
    subjectId: 'REGNA',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Regnskapsfører',
  },
  {
    subjectDescription: '[ORG] - TODO',
    subjectId: '[ORG]',
    subjectSource: '[ORG]',
    subjectTitle: '[ORG]',
  },
  {
    subjectDescription: 'Subject 4',
    subjectId: 'sub4',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Subject 4',
  },
];

export type PolicyTabProps = {
  /**
   * The policy to show
   */
  policy: Policy;
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the polciy for an app
 *
 * @property {Policy}[policy] - The policy to show
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const PolicyTab = ({ policy, org, app }: PolicyTabProps): ReactNode => {
  const { t } = useTranslation();

  // Mutation function to update policy
  const { mutate: updateAppPolicyMutation } = useAppPolicyMutation(org, app);

  return (
    <div>
      <TabHeader text={t('settings_modal.policy_tab_heading')} />
      <PolicyEditorImpl
        policy={policy}
        actions={actionData}
        // TODO - Find out the list of subjects: Issue: #10882
        subjects={subjectData}
        onSave={updateAppPolicyMutation}
        // TODO - Find out how errors should be handled for apps, then refactor. Issue: #10881
        showAllErrors={false}
        usageType='app'
      />
    </div>
  );
};
