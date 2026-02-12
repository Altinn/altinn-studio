import React, { useState } from 'react';
import classes from './CreateService.module.css';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { useAddRepoMutation } from '../../hooks/mutations/useAddRepoMutation';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { NewApplicationForm } from '../../components/NewApplicationForm';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import type { NewAppForm } from '../../types/NewAppForm';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useSubroute } from '../../hooks/useSubRoute';

export type CreateServiceFormError = {
  org?: string;
  repoName?: string;
  template?: string;
};
const initialFormError: CreateServiceFormError = {
  org: '',
  repoName: '',
  template: '',
};

export type CreateServiceProps = {
  user: User;
  organizations: Organization[];
};
export const CreateService = ({ user, organizations }: CreateServiceProps): JSX.Element => {
  const { t } = useTranslation();

  const {
    mutate: addRepoMutation,
    isPending: isCreatingRepo,
    isSuccess: isCreatingRepoSuccess,
  } = useAddRepoMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });

  const [formError, setFormError] = useState<CreateServiceFormError>(initialFormError);

  const selectedContext = useSelectedContext();
  const subroute = useSubroute();

  const navigateToEditorOverview = (org: string, app: string) => {
    const packagesRouter = new PackagesRouter({
      org,
      app,
    });
    packagesRouter.navigateToPackage('editorOverview');
  };

  const createAppRepo = async (newAppForm: NewAppForm) => {
    const { org, repoName, template } = newAppForm;

    addRepoMutation(
      {
        org,
        repository: repoName,
        template: template ? { id: template.id, owner: template.owner } : undefined,
      },
      {
        onSuccess: (): void => {
          navigateToEditorOverview(org, repoName);
        },
        onError: (error: AxiosError): void => {
          const appNameAlreadyExists = error.response.status === ServerCodes.Conflict;
          const templateError =
            error.response?.status === ServerCodes.BadRequest &&
            error.response?.data?.['error'] === 'CustomTemplateException';

          if (appNameAlreadyExists) {
            setFormError(
              (prevErrors): CreateServiceFormError => ({
                ...prevErrors,
                repoName: t('dashboard.app_already_exists'),
              }),
            );
          } else if (templateError) {
            // error message when template application fails
            setFormError(
              (prevErrors): CreateServiceFormError => ({
                ...prevErrors,
                template: t('dashboard.new_application_form.template_error'),
              }),
            );
          }
        },
      },
    );
  };

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
          href: `/${subroute}/${selectedContext}`,
        }}
      />
    </div>
  );
};
