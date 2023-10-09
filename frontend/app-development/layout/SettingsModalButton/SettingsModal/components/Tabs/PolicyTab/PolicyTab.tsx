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

export type PolicyTabProps = {
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
  } = useResourcePolicySubjectsQuery(org, app);

  const { mutate: updateAppPolicyMutation } = useAppPolicyMutation(org, app);

  const displayContent = () => {
    switch (mergeQueryStatuses(policyStatus, actionStatus, subjectStatus)) {
      case 'loading': {
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
        return (
          <PolicyEditorImpl
            policy={policyData}
            actions={actionData}
            subjects={subjectData}
            onSave={updateAppPolicyMutation}
            showAllErrors
            usageType='app'
          />
        );
      }
    }
  };
  return (
    <div>
      <TabHeader text={t('settings_modal.policy_tab_heading')} />
      {displayContent()}
    </div>
  );
};
