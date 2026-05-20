import { useState } from 'react';
import classes from './CreateRelease.module.css';
import type { ChangeEvent } from 'react';
import { versionNameValid } from './utils';
import { useBranchStatusQuery, useAppReleasesQuery, useOrgListQuery } from '../../../hooks/queries';
import { useCreateReleaseMutation } from '../../../hooks/mutations';
import { useGetSelectedScopesQuery } from '../../../hooks/queries/useGetSelectedScopesQuery';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FormField } from 'app-shared/components/FormField';
import {
  StudioAlert,
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextarea,
  StudioTextfield,
} from '@studio/components';
import { useAppValidationQuery } from 'app-development/hooks/queries/useAppValidationQuery';
import { AppValidationDialog } from 'app-shared/components/AppValidationDialog/AppValidationDialog';
import { appHasCriticalValidationErrors } from 'app-shared/utils/appValidationUtils';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { hasDefaultMaskinportenScopes } from 'app-development/utils/maskinportenScopes';
import { isVersionAtLeast } from 'app-development/utils/versionUtils';
import { isServiceOwnerOrg } from 'app-development/utils/serviceOwnerOrgUtils';

export function CreateRelease() {
  const { org, app } = useStudioEnvironmentParams();
  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: appVersion } = useAppVersionQuery(org, app);
  const { data: orgs = {} } = useOrgListQuery();
  const repoOwnerIsServiceOwner = isServiceOwnerOrg(orgs, org);
  const { data: selectedMaskinportenScopes } = useGetSelectedScopesQuery(repoOwnerIsServiceOwner);
  const { refetch: getMasterBranchStatus } = useBranchStatusQuery(org, app, 'master');
  const { data: appValidationResult } = useAppValidationQuery(org, app);
  const { t } = useTranslation();

  const handleTagNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setTagName(e.currentTarget.value.toLowerCase());

  const handleBodyChange = (e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.currentTarget.value);

  const mutation = useCreateReleaseMutation(org, app);
  const handleBuildVersionClick = async () => {
    if (versionNameValid(releases, tagName) && tagName !== '') {
      const { data: newMasterBranchStatus } = await getMasterBranchStatus();
      mutation.mutate({
        tagName,
        name: tagName,
        body,
        targetCommitish: newMasterBranchStatus.commit.id,
      });
      setTagName('');
      setBody('');
    }
  };

  const appHasCriticalErrors = appHasCriticalValidationErrors(
    Object.keys(appValidationResult?.errors ?? {}),
  );
  const validVersionName = tagName && versionNameValid(releases, tagName);
  const canBuild = validVersionName;
  const shouldShowMaskinportenScopesNotice =
    appVersion !== undefined &&
    repoOwnerIsServiceOwner &&
    selectedMaskinportenScopes !== undefined &&
    isVersionAtLeast(appVersion.backendVersion, 9, 0, 0) &&
    !hasDefaultMaskinportenScopes(selectedMaskinportenScopes);

  return (
    <div className={classes.createReleaseForm}>
      {appValidationResult?.isValid === false && appHasCriticalErrors && (
        <StudioAlert data-color='danger'>
          <StudioHeading data-size='xs'>{t('app_create_release.validation_errors')}</StudioHeading>
          <StudioDialog.TriggerContext>
            <Trans i18nKey='app_create_release.validation_error_message'>
              <StudioDialog.Trigger
                className={classes.validationDialogTrigger}
                variant='tertiary'
              ></StudioDialog.Trigger>
            </Trans>
            <AppValidationDialog />
          </StudioDialog.TriggerContext>
        </StudioAlert>
      )}
      {appValidationResult?.isValid === false && !appHasCriticalErrors && (
        <StudioAlert data-color='warning'>
          <StudioHeading data-size='xs'>{t('app_create_release.validation_warning')}</StudioHeading>
          <StudioDialog.TriggerContext>
            <Trans i18nKey='app_create_release.validation_warning_message'>
              <StudioDialog.Trigger
                className={classes.validationDialogTrigger}
                variant='tertiary'
              ></StudioDialog.Trigger>
            </Trans>
            <AppValidationDialog />
          </StudioDialog.TriggerContext>
        </StudioAlert>
      )}
      {shouldShowMaskinportenScopesNotice && (
        <StudioAlert data-color='info'>
          <StudioParagraph>{t('app_create_release.maskinporten_scopes_auto_add')}</StudioParagraph>
        </StudioAlert>
      )}
      <FormField
        value={tagName}
        customValidationRules={(value: string) => {
          const trimmedValue = value.trim().toLowerCase();
          if (releases.some((release) => release.tagName.toLowerCase() === trimmedValue)) {
            return t('app_create_release.release_version_number_already_exists');
          }
          return versionNameValid(releases, trimmedValue)
            ? ''
            : t('app_create_release.release_version_number_validation');
        }}
        customValidationMessages={(errorCode) => errorCode}
        renderField={({ fieldProps }) => (
          <div className={classes.releaseVersionInput}>
            <StudioTextfield
              {...fieldProps}
              label={t('app_create_release.release_version_number')}
              onChange={handleTagNameChange}
            />
          </div>
        )}
      />
      <FormField
        value={body}
        renderField={({ fieldProps }) => (
          <StudioTextarea
            {...fieldProps}
            label={t('app_create_release.release_description')}
            value={body}
            onChange={handleBodyChange}
            rows={4}
          />
        )}
      />
      <div>
        <StudioButton onClick={handleBuildVersionClick} disabled={!canBuild}>
          {t('app_create_release.build_version')}
        </StudioButton>
      </div>
    </div>
  );
}
