import { Typography } from '@material-ui/core';
import { AltinnSpinner } from 'app-shared/components';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { IRepository } from 'app-shared/types';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardActions } from '../../resources/fetchDashboardResources/dashboardSlice';
import { appNameRegex } from '../createService/createNewService';

export interface IMakeCopyModalProps {
  anchorEl: HTMLElement;
  handleClose: (event?: React.MouseEvent<HTMLElement>) => void;
  service: IRepository;
}

function MakeCopyModal(props: IMakeCopyModalProps) {
  const {
    anchorEl, handleClose, service,
  } = props;
  const language = useSelector((state: IDashboardAppState) => state.language.language);
  const [repoName, setRepoName] = React.useState<string>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const dispatch = useDispatch();

  const handleClone = async () => {
    if (validAppName()) {
      setIsLoading(true);
      try {
        const [org, app] = service.full_name.split('/');
        const url = `${window.location.origin}/designerapi/Repository/CopyApp?org=${org}&sourceRepository=${app}&targetRepository=${repoName}`;
        await post(url);
        dispatch(DashboardActions.fetchServices({
          url: `${window.location.origin}/designerapi/Repository/UserRepos`,
        }));
        handleClose();
      } catch (error) {
        if (error?.response?.status !== 409) {
          setErrorMessage(getLanguageFromKey('dashboard.app_already_exist', language));
        } else {
          setErrorMessage(getParsedLanguageFromKey('dashboard.unknown_error_copy', language));
        }
      }
      setIsLoading(false);
    }
  };

  const closeHandler = (_x: string | React.MouseEvent<HTMLElement>, event?: React.MouseEvent<HTMLElement>) => {
    if (typeof _x !== 'string') {
      handleClose(_x);
    } else {
      handleClose(event);
    }
  };

  const handleRepoNameUpdated = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRepoName(event.target.value);
  };

  const validAppName = (): boolean => {
    if (!repoName) {
      setErrorMessage(getLanguageFromKey('dashboard.field_cannot_be_empty', language));
      return false;
    }

    if (repoName && !appNameRegex.test(repoName)) {
      setErrorMessage(getLanguageFromKey('dashboard.service_name_has_illegal_characters', language));
      return false;
    }

    if (repoName.length > 30) {
      setErrorMessage(getLanguageFromKey('dashboard.service_name_is_too_long', language));
      return false;
    }
    return true;
  };

  return (
    <AltinnPopoverSimple
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
      transformOrigin={{ vertical: 'center', horizontal: 'center' }}
      handleClose={closeHandler}
      btnCancelText={isLoading ? null : getLanguageFromKey('general.cancel', language)}
      btnConfirmText={isLoading ? null : getLanguageFromKey('dashboard.make_copy', language)}
      btnClick={handleClone}
      paperProps={{ style: { margin: '2.4rem' } }}
    >
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.copy_application', language)}
      </Typography>
      <Typography variant='body1' style={{ marginTop: '1.6rem', marginBottom: '1.6rem' }}>
        {getLanguageFromKey('dashboard.copy_application_description', language)}
      </Typography>
      <AltinnInputField
        id='new-clone-name'
        inputHeader={getLanguageFromKey('dashboard.new_service_copy', language)}
        inputHeaderStyling={{ fontSize: '18px' }}
        inputValue={repoName}
        onChangeFunction={handleRepoNameUpdated}
        error={errorMessage}
        clearError={() => setErrorMessage(null)}
      />
      {isLoading &&
        <AltinnSpinner
          spinnerText={getLanguageFromKey('dashboard.creating_your_copy', language)}
        />
      }
    </AltinnPopoverSimple>
  );
}

export default MakeCopyModal;
