import React, { type FormEvent, type ChangeEvent } from 'react';
import classes from './NewApplicationForm.module.css';
import { StudioButton, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ServiceOwnerSelector } from '../ServiceOwnerSelector';
import { RepoNameInput } from '../RepoNameInput';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { type NewAppForm } from '../../types/NewAppForm';
import { useCreateAppFormValidation } from './hooks/useCreateAppFormValidation';
import { Link } from 'react-router-dom';

type CancelButton = {
  onClick: () => void;
  type: 'button';
};

type CancelLink = {
  href: string;
  type: 'link';
};
export type CancelComponent = CancelButton | CancelLink;

export type NewApplicationFormProps = {
  onSubmit: (newAppForm: NewAppForm) => Promise<void>;
  user: User;
  organizations: Organization[];
  isLoading: boolean;
  submitButtonText: string;
  formError: NewAppForm;
  setFormError: React.Dispatch<React.SetStateAction<NewAppForm>>;
  cancelComponent: CancelComponent;
};

export const NewApplicationForm = ({
  onSubmit,
  user,
  organizations,
  isLoading,
  submitButtonText,
  formError,
  setFormError,
  cancelComponent,
}: NewApplicationFormProps): React.JSX.Element => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const { validateRepoOwnerName, validateRepoName } = useCreateAppFormValidation();

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);
    const newAppForm: NewAppForm = {
      org: formData.get('org') as string,
      repoName: formData.get('repoName') as string,
    };

    const isFormValid: boolean = validateNewAppForm(newAppForm);

    if (isFormValid) {
      await onSubmit(newAppForm);
    }
  };

  const validateNewAppForm = (newAppForm: NewAppForm): boolean => {
    const { errorMessage: orgErrorMessage, isValid: isOrgValid } = validateRepoOwnerName(
      newAppForm.org,
    );
    const { errorMessage: repoNameErrorMessage, isValid: isRepoNameValid } = validateRepoName(
      newAppForm.repoName,
    );

    setFormError({
      org: isOrgValid ? '' : orgErrorMessage,
      repoName: isRepoNameValid ? '' : repoNameErrorMessage,
    });

    return isOrgValid && isRepoNameValid;
  };

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
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
        {isLoading ? (
          <StudioSpinner showSpinnerTitle spinnerTitle={t('dashboard.creating_your_service')} />
        ) : (
          <>
            <StudioButton type='submit' variant='primary' size='small'>
              {submitButtonText}
            </StudioButton>
            <CancelComponent cancelComponent={cancelComponent} />
          </>
        )}
      </div>
    </form>
  );
};

type CancelComponentProps = {
  cancelComponent: CancelComponent;
};
const CancelComponent = ({ cancelComponent }: CancelComponentProps) => {
  const { t } = useTranslation();

  switch (cancelComponent.type) {
    case 'button':
      return (
        <StudioButton onClick={cancelComponent.onClick} variant='tertiary' size='small'>
          {t('general.cancel')}
        </StudioButton>
      );
    case 'link':
      return <Link to={cancelComponent.href}>{t('general.cancel')}</Link>;
  }
};
