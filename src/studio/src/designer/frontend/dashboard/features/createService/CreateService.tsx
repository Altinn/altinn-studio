import React, { useCallback, useState } from 'react';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { ServiceOwnerSelector } from './ServiceOwnerSelector';
import { RepoNameInput } from './RepoNameInput';
import { validateRepoName } from '../../common/utils';
import { useAppSelector } from '../../common/hooks';
import {
  DataModellingFormat,
  useAddRepoMutation,
} from '../../services/repoApi';
import { applicationAboutPage } from '../../common/utils/urlUtils';
import classes from './CreateService.module.css';
import { Button, ButtonColor } from '@altinn/altinn-design-system';

enum PageState {
  Idle = 'Idle',
  Creating = 'Creating',
}

interface IValidateInputs {
  selectedOrgOrUser: string;
  setOrgErrorMessage: (value: string) => void;
  setRepoErrorMessage: (value: string) => void;
  repoName: string;
  language: any;
}

const validateInputs = ({
  selectedOrgOrUser,
  setOrgErrorMessage,
  setRepoErrorMessage,
  repoName,
  language,
}: IValidateInputs) => {
  let isValid = true;
  const t = (key: string) => getLanguageFromKey(key, language);
  if (!selectedOrgOrUser) {
    setOrgErrorMessage(t('dashboard.field_cannot_be_empty'));
    isValid = false;
  }
  if (!repoName) {
    setRepoErrorMessage(t('dashboard.field_cannot_be_empty'));
    isValid = false;
  }
  if (repoName && !validateRepoName(repoName)) {
    setRepoErrorMessage(t('dashboard.service_name_has_illegal_characters'));
    isValid = false;
  }
  if (repoName.length > 30) {
    setRepoErrorMessage(t('dashboard.service_name_is_too_long'));
    isValid = false;
  }
  return isValid;
};

export const CreateService = () => {
  const language = useAppSelector((state) => state.language.language);
  const selectedFormat = DataModellingFormat.XSD;
  const [selectedOrgOrUser, setSelectedOrgOrUser] = useState('');
  const [orgErrorMessage, setOrgErrorMessage] = useState(null);
  const [repoErrorMessage, setRepoErrorMessage] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [pageState, setPageState] = useState(PageState.Idle);
  const [addRepo] = useAddRepoMutation();
  const t = (key: string) => getLanguageFromKey(key, language);
  const handleServiceOwnerChanged = useCallback((newValue: string) => {
    setSelectedOrgOrUser(newValue);
    setOrgErrorMessage(null);
  }, []);

  const handleRepoNameChanged = useCallback((newValue: string) => {
    setRepoName(newValue);
    setRepoErrorMessage(null);
  }, []);

  const handleCreateService = async () => {
    const isValid = validateInputs({
      selectedOrgOrUser,
      repoName,
      language,
      setRepoErrorMessage,
      setOrgErrorMessage,
    });

    if (isValid) {
      setPageState(PageState.Creating);

      try {
        const result = await addRepo({
          owner: selectedOrgOrUser,
          repoName: repoName,
          modelType: selectedFormat,
        }).unwrap();

        window.location.assign(
          applicationAboutPage({
            repoFullName: result.full_name,
          })
        );
      } catch (error) {
        if (error.status === 409) {
          setPageState(PageState.Idle);
          setRepoErrorMessage(t('dashboard.app_already_exist'));
        } else {
          setPageState(PageState.Idle);
          setRepoErrorMessage(t('dashboard.error_when_creating_app'));
        }
      }
    }
  };
  return (
    <div className={classes.createServiceContainer}>
      <ServiceOwnerSelector
        onServiceOwnerChanged={handleServiceOwnerChanged}
        errorMessage={orgErrorMessage}
        selectedOrgOrUser={selectedOrgOrUser}
      />
      <RepoNameInput
        onRepoNameChanged={handleRepoNameChanged}
        repoName={repoName}
        errorMessage={repoErrorMessage}
      />
      {pageState === PageState.Creating ? (
        <AltinnSpinner spinnerText={t('dashboard.creating_your_service')} />
      ) : (
        <div className={classes.buttonContainer}>
          <Button color={ButtonColor.Primary} onClick={handleCreateService}>
            {t('dashboard.create_service_btn')}
          </Button>
          <Button
            color={ButtonColor.Inverted}
            onClick={() => window.history.back()}
          >
            {t('general.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
};
