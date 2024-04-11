import React, { useState } from 'react';
import classes from './CreateService.module.css';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { useAddRepoMutation } from 'dashboard/hooks/mutations/useAddRepoMutation';
import { DatamodelFormat } from 'app-shared/types/DatamodelFormat';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { NewApplicationForm } from 'dashboard/components/NewApplicationForm';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { type NewAppForm } from '../../types/NewAppForm';
import { DASHBOARD_ROOT_ROUTE } from 'app-shared/constants';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

const initialFormError: NewAppForm = {
  org: '',
  repoName: '',
};

type CreateServiceProps = {
  user: User;
  organizations: Organization[];
};
export const CreateService = ({ user, organizations }: CreateServiceProps): JSX.Element => {
  const dataModellingPreference: DatamodelFormat.XSD = DatamodelFormat.XSD;

  const { t } = useTranslation();

  const {
    mutate: addRepoMutation,
    isPending: isCreatingRepo,
    isSuccess: isCreatingRepoSuccess,
  } = useAddRepoMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });

  const [formError, setFormError] = useState<NewAppForm>(initialFormError);

  const createAppRepo = async (newAppForm: NewAppForm) => {
    const { org, repoName } = newAppForm;

    addRepoMutation(
      {
        org,
        repository: repoName,
        datamodellingPreference: dataModellingPreference,
      },
      {
        onSuccess: (): void => {
          const packagesRouter = new PackagesRouter({
            org,
            app: repoName,
          });
          packagesRouter.navigateToPackage('editorOverview');
        },
        onError: (error: AxiosError): void => {
          const appNameAlreadyExists = error.response.status === ServerCodes.Conflict;
          if (appNameAlreadyExists) {
            setFormError(
              (prevErrors): NewAppForm => ({
                ...prevErrors,
                repoName: t('dashboard.app_already_exists'),
              }),
            );
          }
        },
      },
    );
  };

  const selectedContext = useSelectedContext();

  return (
    <div className={classes.wrapper}>
      <NewApplicationForm
        onSubmit={createAppRepo}
        user={user}
        organizations={organizations}
        isLoading={isCreatingRepo || isCreatingRepoSuccess}
        submitButtonText={t('dashboard.create_service_btn')}
        formError={formError}
        setFormError={setFormError}
        cancelComponent={{
          type: 'link',
          href: `${DASHBOARD_ROOT_ROUTE}${selectedContext === SelectedContextType.Self ? '' : selectedContext}`,
        }}
      />
    </div>
  );
};
