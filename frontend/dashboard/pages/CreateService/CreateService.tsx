import React, { useState } from 'react';
import classes from './CreateService.module.css';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { useAddRepoMutation } from '../../hooks/mutations/useAddRepoMutation';
import { DataModelFormat } from 'app-shared/types/DataModelFormat';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { NewApplicationForm } from '../../components/NewApplicationForm';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { type NewAppForm } from '../../types/NewAppForm';
import { DASHBOARD_ROOT_ROUTE } from 'app-shared/constants';
import { useSelectedContext } from '../../hooks/useSelectedContext';
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
  const dataModellingPreference: DataModelFormat.XSD = DataModelFormat.XSD;

  const { t } = useTranslation();

  const {
    mutate: addRepoMutation,
    isPending: isCreatingRepo,
    isSuccess: isCreatingRepoSuccess,
  } = useAddRepoMutation({
    hideDefaultError: (error) => error?.response?.status === ServerCodes.Conflict,
  });

  const [formError, setFormError] = useState<NewAppForm>(initialFormError);

  const navigateToEditorOverview = (org: string, app: string) => {
    const packagesRouter = new PackagesRouter({
      org,
      app,
    });
    packagesRouter.navigateToPackage('editorOverview');
  };

  const createAppRepo = async (newAppForm: NewAppForm) => {
    const { org, repoName } = newAppForm;

    addRepoMutation(
      {
        org,
        repository: repoName,
        dataModellingPreference: dataModellingPreference,
      },
      {
        onSuccess: (): void => {
          navigateToEditorOverview(org, repoName);
        },
        onError: (error): void => {
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
        actionableElement={{
          type: 'link',
          href: `${DASHBOARD_ROOT_ROUTE}${selectedContext === SelectedContextType.Self ? '' : selectedContext}`,
        }}
      />
    </div>
  );
};
