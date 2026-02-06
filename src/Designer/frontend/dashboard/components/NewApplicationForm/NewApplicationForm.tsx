import React, { type FormEvent, type ChangeEvent, useState } from 'react';
import { TemplateSelector } from '../TemplateSelector/TemplateSelector';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import classes from './NewApplicationForm.module.css';
import { StudioButton, StudioHeading, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ServiceOwnerSelector } from '../ServiceOwnerSelector';
import { RepoNameInput } from '../RepoNameInput';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { type NewAppForm } from '../../types/NewAppForm';
import { useCreateAppFormValidation } from './hooks/useCreateAppFormValidation';
import { Link } from 'react-router-dom';
import { useUserOrgPermissionQuery } from '../../hooks/queries/useUserOrgPermissionsQuery';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

type CancelButton = {
  onClick: () => void;
  type: 'button';
};

type CancelLink = {
  href: string;
  type: 'link';
};
export type ActionableElement = CancelButton | CancelLink;

export type NewApplicationFormProps = {
  onSubmit: (newAppForm: NewAppForm) => Promise<void>;
  user: User;
  organizations: Organization[];
  isLoading: boolean;
  shouldUseCustomTemplate?: boolean;
  submitButtonText: string;
  formError: NewAppForm;
  setFormError: React.Dispatch<React.SetStateAction<NewAppForm>>;
  actionableElement: ActionableElement;
};

export const NewApplicationForm = ({
  onSubmit,
  user,
  organizations,
  isLoading,
  shouldUseCustomTemplate = true,
  submitButtonText,
  formError,
  setFormError,
  actionableElement,
}: NewApplicationFormProps): React.JSX.Element => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const isCustomTemplatesEnabled = useFeatureFlag(FeatureFlag.CustomTemplates);
  const { validateRepoOwnerName, validateRepoName } = useCreateAppFormValidation();
  const defaultSelectedOrgOrUser: string =
    selectedContext === SelectedContextType.Self || selectedContext === SelectedContextType.All
      ? user.login
      : selectedContext;
  const [currentSelectedOrg, setCurrentSelectedOrg] = useState<string>(defaultSelectedOrgOrUser);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate>();
  const { data: userOrgPermission, isFetching } = useUserOrgPermissionQuery(currentSelectedOrg, {
    enabled: Boolean(currentSelectedOrg),
  });

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
      template: selectedTemplate || undefined,
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

  const createRepoAccessError: string =
    !userOrgPermission?.canCreateOrgRepo && !isFetching
      ? t('dashboard.missing_service_owner_rights_error_message')
      : '';

  const hasCreateRepoAccessError: boolean = Boolean(createRepoAccessError);

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      <StudioHeading level={1} spacing>
        {t('dashboard.new_service')}
      </StudioHeading>
      <ServiceOwnerSelector
        name='org'
        user={user}
        organizations={organizations}
        errorMessage={formError.org || createRepoAccessError}
        selectedOrgOrUser={defaultSelectedOrgOrUser}
        onChange={setCurrentSelectedOrg}
      />
      <RepoNameInput
        name='repoName'
        errorMessage={formError.repoName}
        onChange={validateTextValue}
      />
      {isCustomTemplatesEnabled && shouldUseCustomTemplate && (
        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onChange={setSelectedTemplate}
          username={user.login}
        />
      )}
      <div className={classes.actionContainer}>
        {isLoading ? (
          <StudioSpinner aria-hidden spinnerTitle={t('dashboard.creating_your_service')} />
        ) : (
          <>
            <StudioButton type='submit' variant='primary' disabled={hasCreateRepoAccessError}>
              {submitButtonText}
            </StudioButton>
            <CancelComponent actionableElement={actionableElement} />
          </>
        )}
      </div>
    </form>
  );
};

type CancelComponentProps = {
  actionableElement: ActionableElement;
};
const CancelComponent = ({ actionableElement }: CancelComponentProps) => {
  const { t } = useTranslation();

  switch (actionableElement.type) {
    case 'button':
      return (
        <StudioButton onClick={actionableElement.onClick} variant='tertiary'>
          {t('general.cancel')}
        </StudioButton>
      );
    case 'link':
      return <Link to={actionableElement.href}>{t('general.cancel')}</Link>;
  }
};
