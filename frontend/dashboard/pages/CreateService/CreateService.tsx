import React, { useCallback, useState } from 'react';
import { AltinnSpinner } from 'app-shared/components';
import { ServiceOwnerSelector } from '../../components/ServiceOwnerSelector';
import { RepoNameInput } from '../../components/RepoNameInput';
import { validateRepoName } from '../../utils/repoUtils';
import { DataModellingFormat, useAddRepoMutation } from '../../services/repoApi';
import { applicationAboutPage } from '../../utils/urlUtils';
import classes from './CreateService.module.css';
import { Button, ButtonColor } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

enum PageState {
  Idle = 'Idle',
  Creating = 'Creating',
}

interface IValidateInputs {
  selectedOrgOrUser: string;
  setOrgErrorMessage: (value: string) => void;
  setRepoErrorMessage: (value: string) => void;
  repoName: string;
  t: typeof i18next.t;
}

const validateInputs = ({
  selectedOrgOrUser,
  setOrgErrorMessage,
  setRepoErrorMessage,
  repoName,
  t,
}: IValidateInputs) => {
  let isValid = true;
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
  const selectedFormat = DataModellingFormat.XSD;
  const [selectedOrgOrUser, setSelectedOrgOrUser] = useState('');
  const [orgErrorMessage, setOrgErrorMessage] = useState(null);
  const [repoErrorMessage, setRepoErrorMessage] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [pageState, setPageState] = useState(PageState.Idle);
  const [addRepo] = useAddRepoMutation();
  const { t } = useTranslation();
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
      t,
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
            org: result.owner.login,
            repo: result.name,
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
          <Button color={ButtonColor.Inverted} onClick={() => window.history.back()}>
            {t('general.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
};
