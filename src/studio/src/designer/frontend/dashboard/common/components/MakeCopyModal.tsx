import { Typography } from '@material-ui/core';
import { AltinnSpinner } from 'app-shared/components';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';
import * as React from 'react';
import { DashboardActions } from '../../resources/fetchDashboardResources/dashboardSlice';
import { appNameRegex } from '../../features/createService/createNewService';
import { PopoverOrigin } from '@material-ui/core/Popover';
import { useAppSelector, useAppDispatch } from 'common/hooks';

export interface IMakeCopyModalProps {
  anchorEl: HTMLElement;
  handleClose: (event?: React.MouseEvent<HTMLElement>) => void;
  serviceFullName: string;
}

const transformAnchorOrigin: PopoverOrigin = {
  vertical: 'center',
  horizontal: 'center',
};

const paperProps = {
  style: {
    margin: '2.4rem',
  },
};

const typographyStyle = {
  marginTop: '1.6rem',
  marginBottom: '1.6rem',
};

const inputHeaderStyling = {
  fontSize: '18px',
};

export const MakeCopyModal = ({
  anchorEl,
  handleClose,
  serviceFullName,
}: IMakeCopyModalProps) => {
  const language = useAppSelector((state) => state.language.language);
  const [repoName, setRepoName] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const dispatch = useAppDispatch();

  const handleClone = async () => {
    if (validAppName()) {
      setIsLoading(true);
      try {
        const [org, app] = serviceFullName.split('/');

        const url = `${window.location.origin}/designer/api/v1/repos/copyapp?org=${org}&sourceRepository=${app}&targetRepository=${repoName}`;
        await post(url);
        dispatch(
          DashboardActions.fetchServices({
            url: `${window.location.origin}/designer/api/v1/user/repos`,
          }),
        );
        window.location.href = `${window.location.origin}/designer/${org}/${repoName}#/about?copiedApp=true`;
      } catch (error) {
        if (error?.response?.status === 409) {
          setErrorMessage(
            getLanguageFromKey('dashboard.app_already_exist', language),
          );
        } else {
          setErrorMessage(
            getParsedLanguageFromKey('dashboard.unknown_error_copy', language),
          );
        }
      }
      setIsLoading(false);
    }
  };

  const closeHandler = (
    _x: string | React.MouseEvent<HTMLElement>,
    event?: React.MouseEvent<HTMLElement>,
  ) => {
    if (isLoading) {
      return;
    }
    if (typeof _x !== 'string') {
      handleClose(_x);
    } else {
      handleClose(event);
    }
  };

  const handleRepoNameUpdated = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRepoName(event.target.value);
  };

  const validAppName = (): boolean => {
    if (!repoName) {
      setErrorMessage(
        getLanguageFromKey('dashboard.field_cannot_be_empty', language),
      );
      return false;
    }

    if (!appNameRegex.test(repoName)) {
      setErrorMessage(
        getLanguageFromKey(
          'dashboard.service_name_has_illegal_characters',
          language,
        ),
      );
      return false;
    }

    if (repoName.length > 30) {
      setErrorMessage(
        getLanguageFromKey('dashboard.service_name_is_too_long', language),
      );
      return false;
    }
    return true;
  };

  return (
    <AltinnPopoverSimple
      anchorEl={anchorEl}
      anchorOrigin={transformAnchorOrigin}
      transformOrigin={transformAnchorOrigin}
      handleClose={closeHandler}
      btnCancelText={
        isLoading ? null : getLanguageFromKey('general.cancel', language)
      }
      btnConfirmText={
        isLoading ? null : getLanguageFromKey('dashboard.make_copy', language)
      }
      btnClick={handleClone}
      paperProps={paperProps}
      btnPrimaryId='clone-button'
      btnSecondaryId='cancel-button'
    >
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.copy_application', language)}
      </Typography>
      <Typography variant='body1' style={typographyStyle}>
        {getLanguageFromKey('dashboard.copy_application_description', language)}
      </Typography>
      <AltinnInputField
        id='new-clone-name'
        textFieldId='new-clone-name-input'
        inputHeader={getLanguageFromKey('dashboard.new_service_copy', language)}
        inputHeaderStyling={inputHeaderStyling}
        inputValue={repoName}
        onChangeFunction={handleRepoNameUpdated}
        error={errorMessage}
        clearError={() => setErrorMessage(null)}
      />
      {isLoading && (
        <AltinnSpinner
          spinnerText={getLanguageFromKey(
            'dashboard.creating_your_copy',
            language,
          )}
        />
      )}
    </AltinnPopoverSimple>
  );
};

export default MakeCopyModal;
