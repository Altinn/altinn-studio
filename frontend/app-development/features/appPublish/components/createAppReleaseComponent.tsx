import React, { useEffect, useRef, useState } from 'react';
import classes from './createAppReleaseComponent.module.css';
import type { ChangeEvent } from 'react';
import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { AppReleaseActions } from '../../../sharedResources/appRelease/appReleaseSlice';
import { TextField, TextArea, Button } from '@digdir/design-system-react';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';
import { versionNameValid } from './utils';
import { useTranslation } from 'react-i18next';

export function CreateReleaseComponent() {
  const dispatch = useAppDispatch();

  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');

  const releaseState: IAppReleaseState = useAppSelector((state) => state.appReleases);
  const createReleaseErrorCode: number = useAppSelector(
    (s) => s.appReleases.errors.createReleaseErrorCode
  );
  const repoStatus: IRepoStatusState = useAppSelector((state) => state.repoStatus);
  const { t } = useTranslation();

  const [openErrorPopover, setOpenErrorPopover] = useState<boolean>(
    createReleaseErrorCode !== null
  );
  const ref = useRef();

  useEffect(() => {
    if (createReleaseErrorCode !== null) {
      setOpenErrorPopover(true);
    }
  }, [createReleaseErrorCode]);

  const handleTagNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setTagName(e.currentTarget.value.toLowerCase());

  const handleBodyChange = (e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.currentTarget.value);

  function handleBuildVersionClick() {
    if (versionNameValid(releaseState.releases, tagName) && tagName !== '') {
      dispatch(
        AppReleaseActions.createAppRelease({
          tagName,
          name: tagName,
          body,
          targetCommitish: repoStatus.branch.master.commit.id,
        })
      );
      setTagName('');
      setBody('');
    }
    handlePopoverClose();
  }

  const handlePopoverClose = () => setOpenErrorPopover(false);

  if (releaseState.creatingRelease) {
    return null;
  }

  return (
    <>
      <div>
        <div className={classes.createReleaseFormItem}>
          {!versionNameValid(releaseState.releases, tagName) ? (
            <div className={classes.createReleaseInvalidTagName}>
              {t('app_create_release.release_versionnumber_validation')}
            </div>
          ) : null}
          <div style={{ width: '50%' }}>
            <TextField
              label={t('app_create_release.release_versionnumber')}
              onChange={handleTagNameChange}
              value={tagName}
              isValid={versionNameValid(releaseState.releases, tagName)}
            />
          </div>
        </div>
        <div className={classes.createReleaseFormItem}>
          <TextArea
            label={t('app_create_release.release_description')}
            value={body}
            onChange={handleBodyChange}
            rows={4}
          />
        </div>
        <div className={classes.createReleaseFormItem}>
          <Button
            ref={ref}
            onClick={handleBuildVersionClick}
            disabled={!versionNameValid(releaseState.releases, tagName) || !tagName}
          >
            {t('app_create_release.build_version')}
          </Button>
        </div>
      </div>
      <AltinnPopoverSimple
        open={createReleaseErrorCode !== null && openErrorPopover}
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
              &nbsp;
              {createReleaseErrorCode}
            </div>
          </div>
        </div>
      </AltinnPopoverSimple>
    </>
  );
}
