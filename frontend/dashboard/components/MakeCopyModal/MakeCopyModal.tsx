import type { MouseEvent, ChangeEvent } from 'react';
import React, { useState } from 'react';
import { StudioSpinner } from '@studio/components';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import type { PopoverOrigin } from '@mui/material';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { validateRepoName } from '../../utils/repoUtils';
import { Textfield } from '@digdir/design-system-react';
import classes from './MakeCopyModal.module.css';
import { SimpleContainer } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { useCopyAppMutation } from 'dashboard/hooks/mutations/useCopyAppMutation';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

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
  const {
    mutate: copyAppMutate,
    isPending: isCopyAppPending,
    isError: hasCopyAppError,
  } = useCopyAppMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });
  const [repoName, setRepoName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>(null);

  const { t } = useTranslation();

  const handleClone = async () => {
    if (validAppName()) {
      const [org, app] = serviceFullName.split('/');
      copyAppMutate(
        { org, app, repoName },
        {
          onSuccess: () => {
            window.location.href = `${APP_DEVELOPMENT_BASENAME}/${org}/${repoName}?copiedApp=true`;
          },
          onError: () => {
            if (hasCopyAppError) {
              setErrorMessage(t('dashboard.app_already_exists'));
            }
          },
        },
      );
    }
  };

  const closeHandler = (_x: string | MouseEvent<HTMLElement>, event?: MouseEvent<HTMLElement>) => {
    if (isCopyAppPending) {
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
    <AltinnPopoverSimple
      open={!!anchorEl}
      anchorEl={anchorEl}
      anchorOrigin={transformAnchorOrigin}
      transformOrigin={transformAnchorOrigin}
      handleClose={closeHandler}
      btnCancelText={isCopyAppPending ? null : t('general.cancel')}
      btnConfirmText={isCopyAppPending ? null : t('dashboard.make_copy')}
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
          <Textfield
            id='new-clone-name-input'
            label={t('dashboard.new_service_copy')}
            value={repoName}
            onChange={handleRepoNameUpdated}
            error={errorMessage}
          />
          {errorMessage && <div className={classes.errorMessage}>{errorMessage}</div>}
        </div>
        {isCopyAppPending && <StudioSpinner spinnerText={t('dashboard.creating_your_copy')} />}
      </SimpleContainer>
    </AltinnPopoverSimple>
  );
};
