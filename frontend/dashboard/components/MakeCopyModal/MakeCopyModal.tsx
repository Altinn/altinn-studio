import React, { forwardRef, useState } from 'react';
import { StudioModal } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import classes from './MakeCopyModal.module.css';
import { useTranslation } from 'react-i18next';
import { useCopyAppMutation } from 'dashboard/hooks/mutations/useCopyAppMutation';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../../hooks/queries';
import { NewApplicationForm } from '../NewApplicationForm';
import { type NewAppForm } from '../../types/NewAppForm';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export type MakeCopyModalProps = {
  open: boolean;
  onClose: () => void;
  serviceFullName: string;
};

export const MakeCopyModal = forwardRef<HTMLDialogElement, MakeCopyModalProps>(
  ({ open, onClose, serviceFullName }, ref) => {
    const { data: user } = useUserQuery();

    const { data: organizations } = useOrganizationsQuery();
    const {
      mutate: copyAppMutate,
      isPending: isCopyAppPending,
      isSuccess: isCopyAppSuccess,
    } = useCopyAppMutation({
      hideDefaultError: (error) => error?.response?.status === ServerCodes.Conflict,
    });

    const [formError, setFormError] = useState<NewAppForm>({ org: '', repoName: '' });

    const { t } = useTranslation();

    const navigateToEditorOverview = (org: string, app: string) => {
      const packagesRouter = new PackagesRouter({
        org,
        app,
      });
      packagesRouter.navigateToPackage('editorOverview', '?copiedApp=true');
    };

    const createClonedRepo = async (newAppForm: NewAppForm) => {
      const { org: newOrg, repoName: newRepoName } = newAppForm;
      const [org, app] = serviceFullName.split('/');

      copyAppMutate(
        { org, app, newRepoName, newOrg },
        {
          onSuccess: () => {
            navigateToEditorOverview(newOrg, newRepoName);
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

    return (
      <StudioModal
        ref={ref}
        isOpen={open}
        onClose={onClose}
        title={
          <Heading level={2} size='small' className={classes.modalHeading}>
            {t('dashboard.copy_application')}
          </Heading>
        }
        closeButtonLabel={t('dashboard.copy_modal_close_button_label')}
      >
        <div className={classes.modalContent}>
          <NewApplicationForm
            onSubmit={createClonedRepo}
            user={user}
            organizations={organizations}
            isLoading={isCopyAppPending || isCopyAppSuccess}
            submitButtonText={t('dashboard.make_copy')}
            formError={formError}
            setFormError={setFormError}
            actionableElement={{
              type: 'button',
              onClick: onClose,
            }}
          />
        </div>
      </StudioModal>
    );
  },
);

MakeCopyModal.displayName = 'MakeCopyModal';
