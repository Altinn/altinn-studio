import React, { ReactNode } from 'react';
import { PolicyEditor as PolicyEditorImpl } from '@altinn/policy-editor';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { ErrorMessage } from '@digdir/design-system-react';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import {
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { TabContent } from '../../TabContent';
import {
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
} from '../../../utils/tabUtils/policyTabUtils';

export type PolicyTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the polciy for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const PolicyTab = ({ org, app }: PolicyTabProps): ReactNode => {
  const { t } = useTranslation();

  const {
    status: policyStatus,
    data: policyData,
    error: policyError,
  } = useAppPolicyQuery(org, app);
  const {
    status: actionStatus,
    data: actionData,
    error: actionError,
  } = useResourcePolicyActionsQuery(org, app);
  const {
    status: subjectStatus,
    data: subjectData,
    error: subjectError,
  } = useResourcePolicySubjectsQuery(org, app, true);

  const { mutate: updateAppPolicyMutation } = useAppPolicyMutation(org, app);

  const displayContent = () => {
    switch (mergeQueryStatuses(policyStatus, actionStatus, subjectStatus)) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {policyError && <ErrorMessage>{policyError.message}</ErrorMessage>}
            {actionError && <ErrorMessage>{actionError.message}</ErrorMessage>}
            {subjectError && <ErrorMessage>{subjectError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        // Merge the list of actions from the policy with the list of options to make sure
        // that "old" options are also added to the options list
        const mergedActionList = mergeActionsFromPolicyWithActionOptions(
          policyData.rules,
          actionData,
        );
        // Merge the list of subjects from the policy with the list of options to make sure
        // that "old" options are also added to the options list
        const mergedSubjectList = mergeSubjectsFromPolicyWithSubjectOptions(
          policyData.rules,
          subjectData,
        );

        return (
          <PolicyEditorImpl
            policy={policyData}
            actions={mergedActionList}
            subjects={mergedSubjectList}
            onSave={updateAppPolicyMutation}
            showAllErrors
            usageType='app'
          />
        );
      }
    }
  };
  return (
    <TabContent>
      <TabHeader text={t('settings_modal.policy_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
