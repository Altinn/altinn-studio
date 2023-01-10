import React, { useEffect, useRef, useState } from 'react';
import classes from './createAppReleaseComponent.module.css';
import type { ChangeEvent } from 'react';
import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { AppReleaseActions } from '../../../sharedResources/appRelease/appReleaseSlice';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { TextField, TextArea, Button } from '@altinn/altinn-design-system';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';

export function CreateReleaseComponent() {
  const dispatch = useAppDispatch();

  const [tagName, setTagName] = useState<string>('');
  const [body, setBody] = useState<string>('');

  const releaseState: IAppReleaseState = useAppSelector((state) => state.appReleases);
  const createReleaseErrorCode: number = useAppSelector(
    (state) => state.appReleases.errors.createReleaseErrorCode
  );
  const repoStatus: IRepoStatusState = useAppSelector((state) => state.repoStatus);
  const language: any = useAppSelector((state) => state.languageState.language);

  const [openErrorPopover, setOpenErrorPopover] = useState<boolean>(
    createReleaseErrorCode !== null
  );
  const ref = useRef();

  useEffect(() => {
    if (createReleaseErrorCode !== null) {
      setOpenErrorPopover(true);
    }
  }, [createReleaseErrorCode]);

  function versionNameValid(): boolean {
    for (const release of releaseState.releases) {
      if (
        release.tagName.toLowerCase() === tagName.trim() &&
        (release.build.result === BuildResult.succeeded ||
          release.build.status === BuildStatus.inProgress)
      ) {
        return false;
      }
    }
    if (tagName[0] === '.' || tagName[0] === '-') {
      return false;
    }
    if (!tagName.match(new RegExp('^[a-z0-9.-]*$'))) {
      return false;
    }
    return tagName.length <= 128;
  }

  function handleTagNameChange(event: ChangeEvent<HTMLInputElement>) {
    setTagName(event.currentTarget.value.toLowerCase());
  }

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.currentTarget.value);
  }

  function handleBuildVersionClick() {
    if (versionNameValid() && tagName !== '') {
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

  function handlePopoverClose() {
    setOpenErrorPopover(false);
  }

  if (releaseState.creatingRelease) {
    return null;
  }

  return (
    <>
      <div>
        <div className={classes.createReleaseFormItem}>
          {!versionNameValid() ? (
            <div className={classes.createReleaseInvalidTagName}>
              {getLanguageFromKey('app_create_release.release_versionnumber_validation', language)}
            </div>
          ) : null}
          <div style={{ width: '50%' }}>
            <TextField
              label={getLanguageFromKey('app_create_release.release_versionnumber', language)}
              onChange={handleTagNameChange}
              value={tagName}
              isValid={versionNameValid()}
            />
          </div>
        </div>
        <div className={classes.createReleaseFormItem}>
          <TextArea
            label={getLanguageFromKey('app_create_release.release_description', language)}
            value={body}
            onChange={handleBodyChange}
            rows={4}
          />
        </div>
        <div className={classes.createReleaseFormItem}>
          <Button ref={ref} onClick={handleBuildVersionClick}>
            {getLanguageFromKey('app_create_release.build_version', language)}
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
              {getLanguageFromKey('app_create_release_errors.build_cannot_start', language)}
              &nbsp;
              <a href='mailto:tjenesteeier@altinn.no' target='_blank' rel='noreferrer'>
                {getLanguageFromKey('app_create_release_errors.altinn_servicedesk', language)}
              </a>
            </div>
            <div className={classes.popoverTechnicalErrorText}>
              {getLanguageFromKey('app_create_release_errors.technical_error_code', language)}
              &nbsp;
              {createReleaseErrorCode}
            </div>
          </div>
        </div>
      </AltinnPopoverSimple>
    </>
  );
}
