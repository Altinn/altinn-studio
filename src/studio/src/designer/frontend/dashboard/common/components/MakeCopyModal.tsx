import type { MouseEvent, ChangeEvent } from 'react';
import React, { useState } from 'react';
import { AltinnSpinner } from 'app-shared/components';
import { AltinnPopoverComponent } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';
import { DashboardActions } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { PopoverOrigin } from '@mui/material/Popover';
import { useNavigate } from 'react-router-dom';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { validateRepoName } from '../utils';
import { useAppDispatch, useAppSelector } from '../hooks';
import { TextField } from '@altinn/altinn-design-system';
import { copyAppPath, userReposPath } from 'app-shared/api-paths';
import classes from './MakeCopyModal.module.css';
import { SimpleContainer } from 'app-shared/primitives';

export interface IMakeCopyModalProps {
  anchorEl: HTMLElement;
  handleClose: (event?: MouseEvent<HTMLElement>) => void;
  serviceFullName: string;
}

const transformAnchorOrigin: PopoverOrigin = {
  vertical: 'center',
  horizontal: 'center',
};

export const MakeCopyModal = ({ anchorEl, handleClose, serviceFullName }: IMakeCopyModalProps) => {
  const language = useAppSelector((state) => state.language.language);
  const navigate = useNavigate();
  const [repoName, setRepoName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const t = (key: string) => getLanguageFromKey(key, language);
  const handleClone = async () => {
    if (validAppName()) {
      setIsLoading(true);
      try {
        const [org, app] = serviceFullName.split('/');
        await post(copyAppPath(org, app, repoName));
        dispatch(DashboardActions.fetchServices({ url: userReposPath() }));
        navigate(`${APP_DEVELOPMENT_BASENAME}/${org}/${repoName}?copiedApp=true`);
      } catch (error) {
        error?.response?.status === 409
          ? setErrorMessage(t('dashboard.app_already_exist'))
          : setErrorMessage(t('dashboard.unknown_error_copy'));
      }
      setIsLoading(false);
    }
  };

  const closeHandler = (_x: string | MouseEvent<HTMLElement>, event?: MouseEvent<HTMLElement>) => {
    if (isLoading) {
      return;
    }
    if (typeof _x !== 'string') {
      handleClose(_x);
    } else {
      handleClose(event);
    }
  };

  const handleRepoNameUpdated = (event: ChangeEvent<HTMLInputElement>) =>
    setRepoName(event.target.value);

  const validAppName = (): boolean => {
    if (!repoName) {
      setErrorMessage(t('dashboard.field_cannot_be_empty'));
      return false;
    }
    if (repoName.length > 30) {
      setErrorMessage(t('dashboard.service_name_is_too_long'));
      return false;
    }
    if (!validateRepoName(repoName)) {
      setErrorMessage(t('dashboard.service_name_has_illegal_characters'));
      return false;
    }
    return true;
  };

  return (
    <AltinnPopoverComponent
      open={!!anchorEl}
      anchorEl={anchorEl}
      anchorOrigin={transformAnchorOrigin}
      transformOrigin={transformAnchorOrigin}
      handleClose={closeHandler}
      btnCancelText={isLoading ? null : t('general.cancel')}
      btnConfirmText={isLoading ? null : t('dashboard.make_copy')}
      btnClick={handleClone}
      paperProps={{
        style: {
          margin: '2.4rem',
        },
      }}
      btnPrimaryId='clone-button'
      btnSecondaryId='cancel-button'
    >
      <SimpleContainer>
        <h2>{t('dashboard.copy_application')}</h2>
        <p>{t('dashboard.copy_application_description')}</p>
        <div>
          <TextField
            id='new-clone-name-input'
            label={t('dashboard.new_service_copy')}
            value={repoName}
            onChange={handleRepoNameUpdated}
            isValid={errorMessage === null}
          />
          {errorMessage && <div className={classes.errorMessage}>{errorMessage}</div>}
        </div>
        {isLoading && <AltinnSpinner spinnerText={t('dashboard.creating_your_copy')} />}
      </SimpleContainer>
    </AltinnPopoverComponent>
  );
};
