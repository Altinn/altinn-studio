import React, { forwardRef, useState } from 'react';
import { StudioModal } from '@studio/components-legacy';
import { useForwardedRef } from '@studio/hooks';
import { useTranslation } from 'react-i18next';
import { useCopyAppMutation } from '../../hooks/mutations/useCopyAppMutation';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../../hooks/queries';
import { NewApplicationForm } from '../NewApplicationForm';
import { type NewAppForm } from '../../types/NewAppForm';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export type MakeCopyModalProps = {
  open?: boolean;
  onClose: () => void;
  serviceFullName: string;
};

export const MakeCopyModal = forwardRef<HTMLDialogElement, MakeCopyModalProps>(
  ({ open, onClose, serviceFullName }, ref) => {
    const { data: user } = useUserQuery();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const { data: organizations } = useOrganizationsQuery();
    const {
      mutate: copyAppMutate,
      isPending: isCopyAppPending,
      isSuccess: isCopyAppSuccess,
    } = useCopyAppMutation({
      hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
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

    const closeDialog = () => {
      dialogRef.current?.close();
      onClose();
    };

    return (
      <StudioModal.Dialog
        closeButtonTitle={t('dashboard.copy_modal_close_button_label')}
        heading={t('dashboard.copy_application')}
        open={open}
        ref={dialogRef}
      >
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
            onClick: closeDialog,
          }}
        />
      </StudioModal.Dialog>
    );
  },
);

MakeCopyModal.displayName = 'MakeCopyModal';
