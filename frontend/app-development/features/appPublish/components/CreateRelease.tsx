import React, { useState } from 'react';
import classes from './CreateRelease.module.css';
import type { ChangeEvent } from 'react';
import { Textfield, Textarea } from '@digdir/design-system-react';
import { versionNameValid } from './utils';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { useCreateReleaseMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { FormField } from 'app-shared/components/FormField';
import { StudioButton } from '@studio/components';

export function CreateRelease() {
  const { org, app } = useStudioUrlParams();
  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: masterBranchStatus } = useBranchStatusQuery(org, app, 'master');
  const { t } = useTranslation();

  const handleTagNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setTagName(e.currentTarget.value.toLowerCase());

  const handleBodyChange = (e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.currentTarget.value);

  const mutation = useCreateReleaseMutation(org, app);
  const handleBuildVersionClick = () => {
    if (versionNameValid(releases, tagName) && tagName !== '') {
      mutation.mutate({
        tagName,
        name: tagName,
        body,
        targetCommitish: masterBranchStatus.commit.id,
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
            return t('app_create_release.release_versionnumber_already_exists');
          }
          return versionNameValid(releases, trimmedValue)
            ? ''
            : t('app_create_release.release_versionnumber_validation');
        }}
        customValidationMessages={(errorCode) => errorCode}
        renderField={({ fieldProps }) => (
          <div className={classes.releaseVersionInput}>
            <Textfield
              {...fieldProps}
              label={t('app_create_release.release_versionnumber')}
              onChange={handleTagNameChange}
            />
          </div>
        )}
      />
      <FormField
        value={body}
        renderField={({ fieldProps }) => (
          <Textarea
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
          size='small'
        >
          {t('app_create_release.build_version')}
        </StudioButton>
      </div>
    </div>
  );
}
