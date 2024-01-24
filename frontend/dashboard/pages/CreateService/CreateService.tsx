import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { StudioButton, StudioSpinner } from '@studio/components';
import { ServiceOwnerSelector } from '../../components/ServiceOwnerSelector';
import { RepoNameInput } from '../../components/RepoNameInput';
import classes from './CreateService.module.css';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { useAddRepoMutation } from 'dashboard/hooks/mutations/useAddRepoMutation';
import { DatamodelFormat } from 'app-shared/types/DatamodelFormat';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useCreateAppFormValidation } from './hooks/useCreateAppFormValidation';
import { navigateToAppDevelopment } from './utils/navigationUtils';

const DASHBOARD_ROOT_ROUTE: string = '/';

const initialFormError: CreateAppForm = {
  org: '',
  repoName: '',
};

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

  const [formError, setFormError] = useState<CreateAppForm>(initialFormError);

  const {
    mutate: addRepoMutation,
    isPending: isCreatingRepo,
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

  const validateTextValue = (event: ChangeEvent<HTMLInputElement>) => {
    const { errorMessage: repoNameErrorMessage, isValid: isRepoNameValid } = validateRepoName(
      event.target.value,
    );
    setFormError((previous) => ({
      ...previous,
      repoName: isRepoNameValid ? '' : repoNameErrorMessage,
    }));
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
      <RepoNameInput
        name='repoName'
        errorMessage={formError.repoName}
        onChange={validateTextValue}
      />
      <div className={classes.actionContainer}>
        {isCreatingRepo || isCreatingRepoSuccess ? (
          <StudioSpinner spinnerText={t('dashboard.creating_your_service')} />
        ) : (
          <>
            <StudioButton type='submit' color='first' size='small'>
              {t('dashboard.create_service_btn')}
            </StudioButton>
            <Link to={DASHBOARD_ROOT_ROUTE}>{t('general.cancel')}</Link>
          </>
        )}
      </div>
    </form>
  );
};
