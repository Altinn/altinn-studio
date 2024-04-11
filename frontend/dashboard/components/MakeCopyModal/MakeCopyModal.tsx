import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { StudioButton, StudioModal, StudioSpinner } from '@studio/components';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { Heading } from '@digdir/design-system-react';
import classes from './MakeCopyModal.module.css';
import { useTranslation } from 'react-i18next';
import { useCopyAppMutation } from 'dashboard/hooks/mutations/useCopyAppMutation';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ServiceOwnerSelector } from '../ServiceOwnerSelector';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { RepoNameInput } from '../RepoNameInput';
import { useCreateAppFormValidation } from 'dashboard/pages/CreateService/hooks/useCreateAppFormValidation';

/*export interface IMakeCopyModalProps {
  anchorEl: HTMLElement;
  handleClose: (event?: MouseEvent<HTMLElement>) => void;
  serviceFullName: string;
}*/
type CreateAppForm = {
  org?: string;
  repoName?: string;
};
const initialFormError: CreateAppForm = {
  org: '',
  repoName: '',
};

export type MakeCopyModalProps = {
  open: boolean;
  onClose: () => void;
  serviceFullName: string;
};

export const MakeCopyModal = ({ open, onClose, serviceFullName }: MakeCopyModalProps) => {
  const {
    mutate: copyAppMutate,
    isPending: isCopyAppPending,
    isSuccess: isCopyAppSuccess,
  } = useCopyAppMutation({
    hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
  });

  const { validateRepoOwnerName, validateRepoName } = useCreateAppFormValidation();

  const [formError, setFormError] = useState<CreateAppForm>(initialFormError);

  const { t } = useTranslation();

  const createClonedRepo = async (createAppForm: CreateAppForm) => {
    const { org, repoName } = createAppForm;
    const [, app] = serviceFullName.split('/');

    console.log('org', org);
    console.log('repoName', repoName);
    console.log('app', app);

    copyAppMutate(
      { org, app, repoName },
      {
        onSuccess: () => {
          window.location.href = `${APP_DEVELOPMENT_BASENAME}/${org}/${repoName}?copiedApp=true`;
          // Maybe: navigateToAppDevelopment(createAppForm.org, createAppForm.repoName);
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

  const handleClone = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);

    const org: string = formData.get('org') as string;
    const repoName: string = formData.get('repoName') as string;

    const createAppForm: CreateAppForm = {
      org,
      repoName,
    };

    const isFormValid: boolean = validateCreateAppForm(createAppForm);

    if (isFormValid) {
      await createClonedRepo(createAppForm);
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

  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const selectedContext = useSelectedContext();

  const defaultSelectedOrgOrUser: string =
    selectedContext === SelectedContextType.Self || selectedContext === SelectedContextType.All
      ? user.login
      : selectedContext;

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
    <StudioModal
      isOpen={open}
      onClose={onClose}
      title={
        <Heading level={2} size='small' className={classes.modalHeading}>
          {t('dashboard.copy_application')}
        </Heading>
      }
      closeButtonLabel={t('dashboard.copy_modal_close_button_label')}
    >
      <form onSubmit={handleClone} className={classes.modalContent}>
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
        <div className={classes.buttonWrapper}>
          {isCopyAppPending || isCopyAppSuccess ? (
            <StudioSpinner showSpinnerTitle spinnerTitle={t('dashboard.creating_your_service')} />
          ) : (
            <>
              <StudioButton type='submit' variant='primary' size='small'>
                {t('dashboard.make_copy')}
              </StudioButton>
              <StudioButton onClick={onClose} variant='tertiary' size='small'>
                {t('general.cancel')}
              </StudioButton>
            </>
          )}
        </div>
      </form>
    </StudioModal>
  );
};
