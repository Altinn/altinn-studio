import React, { useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './NewInputFields.module.css';
import { useTranslation } from 'react-i18next';
import { StudioTextfield } from '@studio/components';
import type { AppResource, AppResourceFormError } from 'app-shared/types/AppResource';
import { ActionButtons } from './ActionButtons';
import { LanguageTextField } from './LanguageTextfield/LanguageTextfield';
import type { SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { validateAppResource } from '../utils/appResourceValidationUtils';
import { NavigationWarningDialog } from './NavigationWarningDialog/NavigationWarningDialog';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { ErrorSummary } from './ErrorSummary';
import { TranslationType } from 'app-development/features/appSettings/types/Translation';

const Y_POSITION_FOR_SCROLL_ON_SHOW_ERRORS: number = 200;

type NewInputFieldsProps = {
  appResource: AppResource;
  saveAppResource: (appResource: AppResource) => void; // Remove prop when endpoint is implemented
};

export function NewInputFields({
  appResource,
  saveAppResource,
}: NewInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const [translationType, setTranslationType] = useState<TranslationType>('none');
  const [updatedAppResource, setUpdatedAppResource] = useState<AppResource>(appResource);
  const [showAppResourceErrors, setShowAppResourceErrors] = useState<boolean>(false);

  const validationErrors: AppResourceFormError[] = validateAppResource(updatedAppResource, t);
  const serviceNameErrors: AppResourceFormError[] = getValidationErrorsForField(
    !showAppResourceErrors,
    validationErrors,
    'serviceName',
  );

  useBeforeUnload(updatedAppResource !== appResource);

  const saveAppConfig = (): void => {
    hideTranslationFields();
    if (validationErrors.length === 0) {
      setShowAppResourceErrors(false);
      saveAppResource(updatedAppResource);
      console.log('AppResource saved: ', updatedAppResource); // Will be removed when endpoint is implemented
    } else {
      setShowAppResourceErrors(true);
      window.scrollTo(0, Y_POSITION_FOR_SCROLL_ON_SHOW_ERRORS);
      console.error('Validation errors:', validationErrors); // Will be removed when endpoint is implemented
    }
  };

  const resetAppConfig = (): void => {
    hideTranslationFields();
    if (confirm(t('app_settings.about_tab_reset_confirmation'))) {
      setUpdatedAppResource(appResource);
      saveAppResource(appResource);
      setShowAppResourceErrors(false);
    }
  };

  const showServiceNameFields = (): void => setTranslationType('serviceName');
  const hideTranslationFields = (): void => setTranslationType('none');

  const onChangeServiceName = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppResource((oldVal: AppResource) => ({
      ...oldVal,
      serviceName: updatedLanguage,
    }));
  };

  const onChangeServiceId = (e: ChangeEvent<HTMLInputElement>): void => {
    setUpdatedAppResource((oldVal: AppResource) => ({
      ...oldVal,
      serviceId: e.target.value,
    }));
  };

  return (
    <div className={classes.wrapper}>
      {showAppResourceErrors && validationErrors.length > 0 && (
        <ErrorSummary
          validationErrors={validationErrors}
          onClickErrorLink={(field: TranslationType) => setTranslationType(field)}
        />
      )}
      <NavigationWarningDialog hasContentChanged={updatedAppResource !== appResource} />
      <StudioTextfield
        label={t('app_settings.about_tab_repo_label')}
        description={t('app_settings.about_tab_repo_description')}
        defaultValue={updatedAppResource.repositoryName}
        className={classes.textField}
        onFocus={hideTranslationFields}
        readOnly
      />
      <LanguageTextField
        label={t('app_settings.about_tab_name_label')}
        id={InputFieldIds.ServiceName}
        value={updatedAppResource.serviceName}
        onChange={onChangeServiceName}
        onFocus={showServiceNameFields}
        isTranslationPanelOpen={translationType === 'serviceName'}
        errors={serviceNameErrors}
        required
      />
      <StudioTextfield
        label={t('app_settings.about_tab_alt_id_label')}
        description={t('app_settings.about_tab_alt_id_description')}
        value={updatedAppResource.serviceId}
        onChange={onChangeServiceId}
        onFocus={hideTranslationFields}
        className={classes.textField}
        required={false}
        tagText={t('general.optional')}
      />
      <ActionButtons
        onSave={saveAppConfig}
        onReset={resetAppConfig}
        areButtonsDisabled={updatedAppResource === appResource}
      />
    </div>
  );
}

enum InputFieldIds {
  ServiceName = 'serviceName',
}

function getValidationErrorsForField(
  hideErrors: boolean,
  validationErrors: AppResourceFormError[],
  field: keyof AppResource,
): AppResourceFormError[] {
  if (hideErrors) return [];
  return validationErrors.filter((error) => error.field === field);
}
