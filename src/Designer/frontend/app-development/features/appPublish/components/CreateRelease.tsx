import React, { useState } from 'react';
import classes from './CreateRelease.module.css';
import type { ChangeEvent } from 'react';
import { versionNameValid } from './utils';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { useCreateReleaseMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FormField } from 'app-shared/components/FormField';
import { StudioButton, StudioTextarea, StudioTextfield } from 'libs/studio-components-legacy/src';

export function CreateRelease() {
  const { org, app } = useStudioEnvironmentParams();
  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { refetch: getMasterBranchStatus } = useBranchStatusQuery(org, app, 'master');
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

  return (
    <div className={classes.createReleaseForm}>
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
        <StudioButton
          onClick={handleBuildVersionClick}
          disabled={!versionNameValid(releases, tagName) || !tagName}
        >
          {t('app_create_release.build_version')}
        </StudioButton>
      </div>
    </div>
  );
}
