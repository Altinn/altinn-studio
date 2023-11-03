import React, { useState } from 'react';
import { ServiceOwnerSelector } from '../../components/ServiceOwnerSelector';
import { RepoNameInput } from '../../components/RepoNameInput';
import { validateRepoName } from '../../utils/repoUtils';
import { applicationAboutPage } from '../../utils/urlUtils';
import classes from './CreateService.module.css';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Organization } from 'app-shared/types/Organization';
import { User } from 'app-shared/types/User';
import { useAddRepoMutation } from 'dashboard/hooks/mutations/useAddRepoMutation';
import { DatamodelFormat } from 'app-shared/types/DatamodelFormat';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { AltinnSpinner } from 'app-shared/components';

type CreateAppForm = {
  org?: string;
  repoName?: string;
};

type CreateServiceProps = {
  user: User;
  organizations: Organization[];
};
export const CreateService = ({ user, organizations }: CreateServiceProps): JSX.Element => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const navigate = useNavigate();

  const [formError, setFormError] = useState<CreateAppForm>({
    org: '',
    repoName: '',
  });

  const { mutateAsync: addRepo, isLoading: isCreatingRepo } = useAddRepoMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });

  const dataModellingPreference = DatamodelFormat.XSD;
  const defaultSelectedOrgOrUser: string =
    selectedContext === SelectedContextType.Self ? user.login : selectedContext;
  const createAppRepo = async (createAppForm: CreateAppForm) => {
    await addRepo(
      {
        org: createAppForm.org,
        repository: createAppForm.repoName,
        datamodellingPreference: dataModellingPreference,
      },
      {
        onSuccess: (repository): void => {
          window.location.assign(
            applicationAboutPage({
              org: repository.owner.login,
              repo: repository.name,
            }),
          );
        },
        onError: (error: AxiosError): void => {
          if (error.response.status === ServerCodes.Conflict) {
            setFormError((prevErrors) => ({
              ...prevErrors,
              repoName: t('dashboard.app_already_exists'),
            }));
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
    const { errorMessage: orgErrorMessage, isValid: isOrgValid } = orgValidation(createAppForm.org);
    const { errorMessage: repoNameErrorMessage, isValid: isRepoNameValid } = repoNameValidation(
      createAppForm.repoName,
    );

    setFormError({
      org: isOrgValid ? '' : t(orgErrorMessage),
      repoName: isRepoNameValid ? '' : t(repoNameErrorMessage),
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
        <Button type='submit' color='first' size='small' disabled={isCreatingRepo}>
          {isCreatingRepo ? (
            <AltinnSpinner size='xSmall' aria-label={t('dashboard.creating_your_service')} />
          ) : (
            <span>{t('dashboard.create_service_btn')}</span>
          )}
        </Button>
        <Button type='button' color='inverted' onClick={() => navigate(-1)} size='small'>
          {t('general.cancel')}
        </Button>
      </div>
    </form>
  );
};

// Utilities/Pure functions below.
type ValidationResult = {
  errorMessage: string | null;
  isValid: boolean;
};

const orgValidation = (selectedOrgOrUser: string | undefined): ValidationResult => {
  if (!selectedOrgOrUser) {
    return {
      errorMessage: 'dashboard.field_cannot_be_empty',
      isValid: false,
    };
  }
  return {
    errorMessage: null,
    isValid: true,
  };
};

const repoNameValidation = (repoName: string | undefined): ValidationResult => {
  if (!repoName) {
    return {
      errorMessage: 'dashboard.field_cannot_be_empty',
      isValid: false,
    };
  }
  if (repoName && !validateRepoName(repoName)) {
    return {
      errorMessage: 'dashboard.service_name_has_illegal_characters',
      isValid: false,
    };
  }

  const MAX_ALLOWED_NAME_LENGTH = 30;
  if (repoName.length > MAX_ALLOWED_NAME_LENGTH) {
    return {
      errorMessage: 'dashboard.service_name_is_too_long',
      isValid: false,
    };
  }

  return {
    errorMessage: null,
    isValid: true,
  };
};
