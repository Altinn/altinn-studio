import React, { useState } from 'react';
import classes from './createAppReleaseComponent.module.css';
import type { ChangeEvent } from 'react';
import { LegacyTextField as TextField, TextArea, Button } from '@digdir/design-system-react';
import { versionNameValid } from './utils';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { useCreateReleaseMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export function CreateReleaseComponent() {
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
      {!versionNameValid(releases, tagName) ? (
        <div className={classes.createReleaseInvalidTagName}>
          {t('app_create_release.release_versionnumber_validation')}
        </div>
      ) : null}
      <div className={classes.releaseVersionInput}>
        <TextField
          label={t('app_create_release.release_versionnumber')}
          onChange={handleTagNameChange}
          value={tagName}
          isValid={versionNameValid(releases, tagName)}
        />
      </div>
      <div>
        <TextArea
          label={t('app_create_release.release_description')}
          value={body}
          onChange={handleBodyChange}
          rows={4}
        />
      </div>
      <div>
        <Button
          onClick={handleBuildVersionClick}
          disabled={!versionNameValid(releases, tagName) || !tagName}
          size='small'
        >
          {t('app_create_release.build_version')}
        </Button>
      </div>
    </div>
  );
}
