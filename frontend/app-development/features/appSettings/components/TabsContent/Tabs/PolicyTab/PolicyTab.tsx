import type { ReactElement } from 'react';
import React from 'react';
import {
  PolicyEditor as PolicyEditorImpl,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
} from '@altinn/policy-editor';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { TabPageHeader } from '../../TabPageHeader';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { StudioValidationMessage } from '@studio/components';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import {
  useResourceAccessPackagesQuery,
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { TabPageWrapper } from '../../TabPageWrapper';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function PolicyTab(): ReactElement {
  const { t } = useTranslation();

  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.policy_tab_heading')} />
      <PolicyTabContent />
    </TabPageWrapper>
  );
}

function PolicyTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
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
  const {
    status: accessPackageStatus,
    data: accessPackageData,
    error: accessPackageError,
  } = useResourceAccessPackagesQuery(org, app);

  const { mutate: updateAppPolicyMutation } = useAppPolicyMutation(org, app);

  switch (mergeQueryStatuses(policyStatus, actionStatus, subjectStatus, accessPackageStatus)) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {policyError && <StudioValidationMessage>{policyError.message}</StudioValidationMessage>}
          {actionError && <StudioValidationMessage>{actionError.message}</StudioValidationMessage>}
          {subjectError && (
            <StudioValidationMessage>{subjectError.message}</StudioValidationMessage>
          )}
          {accessPackageError && (
            <StudioValidationMessage>{accessPackageError.message}</StudioValidationMessage>
          )}
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
          accessPackages={accessPackageData}
          onSave={updateAppPolicyMutation}
          showAllErrors
          usageType='app'
        />
      );
    }
  }
}
