import React, { useRef, useState } from 'react';
import classes from './createAppReleaseComponent.module.css';
import type { ChangeEvent } from 'react';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { TextField, TextArea, Button } from '@digdir/design-system-react';
import { versionNameValid } from './utils';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { useParams } from 'react-router-dom';
import { useCreateReleaseMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';

export function CreateReleaseComponent() {
  const { org, app } = useParams();
  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: masterBranchStatus } = useBranchStatusQuery(org, app, 'master');
  const { t } = useTranslation();
  const [openErrorPopover, setOpenErrorPopover] = useState<boolean>(false);
  const ref = useRef();

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
    setOpenErrorPopover(false);
  };

  const handlePopoverClose = () => setOpenErrorPopover(false);

  return (
    <>
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
            ref={ref}
            onClick={handleBuildVersionClick}
            disabled={!versionNameValid(releases, tagName) || !tagName}
          >
            {t('app_create_release.build_version')}
          </Button>
        </div>
      </div>
      <AltinnPopoverSimple
        open={openErrorPopover}
        anchorEl={ref.current}
        handleClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        paperProps={{
          classes: {
            root: classes.createReleaseErrorPopoverRoot,
          },
        }}
      >
        <div>
          <div style={{ padding: 0 }}>
            <i className={`${classes.popoverErrorIcon} ai ai-circle-exclamation`} />
          </div>
          <div style={{ padding: 0 }}>
            <div className={classes.popoverErrorText}>
              {t('app_create_release_errors.build_cannot_start')}
              &nbsp;
              <a href='mailto:tjenesteeier@altinn.no' target='_blank' rel='noreferrer'>
                {t('app_create_release_errors.altinn_servicedesk')}
              </a>
            </div>
            <div className={classes.popoverTechnicalErrorText}>
              {t('app_create_release_errors.technical_error_code')}
            </div>
          </div>
        </div>
      </AltinnPopoverSimple>
    </>
  );
}
