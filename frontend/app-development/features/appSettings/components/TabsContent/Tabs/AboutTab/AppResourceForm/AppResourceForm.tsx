import React, { useRef, useState } from 'react';
import type { ChangeEvent, MutableRefObject, ReactElement } from 'react';
import classes from './AppResourceForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioTextfield } from '@studio/components';
import type { AppResource, AppResourceFormError } from 'app-shared/types/AppResource';
import { ActionButtons } from './ActionButtons';
import { LanguageTextfield } from './LanguageTextfield/LanguageTextfield';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import { validateAppResource } from '../utils/appResourceValidationUtils';
import { ErrorSummary } from './ErrorSummary';
import type { TranslationType } from 'app-development/features/appSettings/types/Translation';
import { useScrollIntoView } from '../hooks/useScrollIntoView';

export type AppResourceFormProps = {
  appResource: AppResource;
  saveAppResource: (appResource: AppResource) => void; // Remove prop when endpoint is implemented
};

export function AppResourceForm({
  appResource,
  saveAppResource,
}: AppResourceFormProps): ReactElement {
  const { t } = useTranslation();
  const [translationType, setTranslationType] = useState<TranslationType>('none');
  const [updatedAppResource, setUpdatedAppResource] = useState<AppResource>(appResource);
  const [showAppResourceErrors, setShowAppResourceErrors] = useState<boolean>(false);

  const errorSummaryRef: MutableRefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  const validationErrors: AppResourceFormError[] = validateAppResource(updatedAppResource, t);
  const serviceNameErrors: AppResourceFormError[] = getValidationErrorsForField(
    !showAppResourceErrors,
    validationErrors,
    'serviceName',
  );

  useScrollIntoView(showAppResourceErrors, errorSummaryRef);

  const saveAppConfig = (): void => {
    hideTranslationFields();

    if (hasValidationErrors()) {
      setShowAppResourceErrors(true);
      return;
    }

    persistAppDetails();
  };

  const hasValidationErrors = (): boolean => {
    return validationErrors.length > 0;
  };

  const persistAppDetails = (): void => {
    setShowAppResourceErrors(false);
    saveAppResource(updatedAppResource);
    console.log('AppResource saved: ', updatedAppResource); // Will be removed when endpoint is implemented
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
      <div className={classes.formWrapper}>
        {showAppResourceErrors && validationErrors.length > 0 && (
          <ErrorSummary
            validationErrors={validationErrors}
            onClickErrorLink={(field: TranslationType) => setTranslationType(field)}
            ref={errorSummaryRef}
          />
        )}
        <StudioTextfield
          label={t('app_settings.about_tab_repo_label')}
          description={t('app_settings.about_tab_repo_description')}
          defaultValue={updatedAppResource.repositoryName}
          onFocus={hideTranslationFields}
          readOnly
        />
        <LanguageTextfield
          label={t('app_settings.about_tab_name_label')}
          description={t('app_settings.about_tab_name_description')}
          id={AppResourceFormFieldIds.ServiceName}
          value={updatedAppResource.serviceName}
          updateLanguage={onChangeServiceName}
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
          required={false}
          tagText={t('general.optional')}
        />
      </div>
      <ActionButtons
        onSave={saveAppConfig}
        onReset={resetAppConfig}
        areButtonsDisabled={updatedAppResource === appResource}
      />
    </div>
  );
}

enum AppResourceFormFieldIds {
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
