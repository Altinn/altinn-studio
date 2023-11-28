import React, { useState } from 'react';
import { ServiceOwnerSelector } from '../../components/ServiceOwnerSelector';
import { RepoNameInput } from '../../components/RepoNameInput';
import classes from './CreateService.module.css';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Organization } from 'app-shared/types/Organization';
import { User } from 'app-shared/types/User';
import { useAddRepoMutation } from 'dashboard/hooks/mutations/useAddRepoMutation';
import { DatamodelFormat } from 'app-shared/types/DatamodelFormat';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { AltinnSpinner } from 'app-shared/components';
import { useCreateAppFormValidation } from './hooks/useCreateAppFormValidation';
import { navigateToAppDevelopment } from './utils/navigationUtils';

const DASHBOARD_ROOT_ROUTE: string = '/';

type CreateAppForm = {
  org?: string;
  repoName?: string;
};

type CreateServiceProps = {
  user: User;
  organizations: Organization[];
};
export const CreateService = ({ user, organizations }: CreateServiceProps): JSX.Element => {
  const dataModellingPreference: DatamodelFormat.XSD = DatamodelFormat.XSD;
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const { validateRepoOwnerName, validateRepoName } = useCreateAppFormValidation();

  const [formError, setFormError] = useState<CreateAppForm>({
    org: '',
    repoName: '',
  });

  const {
    mutate: addRepoMutation,
    isLoading: isCreatingRepo,
    isSuccess: isCreatingRepoSuccess,
  } = useAddRepoMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });

  const defaultSelectedOrgOrUser: string =
    selectedContext === SelectedContextType.Self ? user.login : selectedContext;
  const createAppRepo = async (createAppForm: CreateAppForm) => {
    addRepoMutation(
      {
        org: createAppForm.org,
        repository: createAppForm.repoName,
        datamodellingPreference: dataModellingPreference,
      },
      {
        onSuccess: (): void => {
          navigateToAppDevelopment(createAppForm.org, createAppForm.repoName);
        },
        onError: (error: AxiosError): void => {
          const appNameAlreadyExists = error.response.status === ServerCodes.Conflict;
          if (appNameAlreadyExists) {
            setFormError(
              (prevErrors): CreateAppForm => ({
                ...prevErrors,
                repoName: t('dashboard.app_already_exists'),
              }),
            );
          }
        },
      },
    );
  };

  const handleCreateAppFormSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);

    const createAppForm: CreateAppForm = {
      org: formData.get('org') as string,
      repoName: formData.get('repoName') as string,
    };

    const isFormValid: boolean = validateCreateAppForm(createAppForm);
    if (isFormValid) {
      await createAppRepo(createAppForm);
    }
  };

  const validateCreateAppForm = (createAppForm: CreateAppForm): boolean => {
    const { errorMessage: orgErrorMessage, isValid: isOrgValid } = validateRepoOwnerName(
      createAppForm.org,
    );
    const { errorMessage: repoNameErrorMessage, isValid: isRepoNameValid } = validateRepoName(
      createAppForm.repoName,
    );

    setFormError({
      org: isOrgValid ? '' : orgErrorMessage,
      repoName: isRepoNameValid ? '' : repoNameErrorMessage,
    });

    return isOrgValid && isRepoNameValid;
  };

  return (
    <form onSubmit={handleCreateAppFormSubmit} className={classes.createAppForm}>
      <ServiceOwnerSelector
        name='org'
        user={user}
        organizations={organizations}
        errorMessage={formError.org}
        selectedOrgOrUser={defaultSelectedOrgOrUser}
      />
      <RepoNameInput name='repoName' errorMessage={formError.repoName} />
      <div className={classes.actionContainer}>
        {isCreatingRepo || isCreatingRepoSuccess ? (
          <AltinnSpinner spinnerText={t('dashboard.creating_your_service')} />
        ) : (
          <>
            <Button type='submit' color='first' size='small'>
              {t('dashboard.create_service_btn')}
            </Button>
            <Link to={DASHBOARD_ROOT_ROUTE}>{t('general.cancel')}</Link>
          </>
        )}
      </div>
    </form>
  );
};
