import React, { useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './NewInputFields.module.css';
import { useTranslation } from 'react-i18next';
import { StudioTextfield, StudioErrorSummary } from '@studio/components';
import type { AppResource, AppResourceFormError } from 'app-shared/types/AppResource';
import { ActionButtons } from './ActionButtons';
import { LanguageTextField } from './LanguageTextfield/LanguageTextfield';
import type { Translation } from 'app-development/features/appSettings/types/Translation';
import type { SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { validateAppResource } from '../utils/appResourceValidationUtils';
import { NavigationWarningDialog } from '../NavigationWarningDialog/NavigationWarningDialog';
import { useBeforeUnload } from '../hooks/useBeforeUnload';

// TODO - Take in prop to say that user has changed tab
type NewInputFieldsProps = {
  appResource: AppResource;
  saveAppResource: (appResource: AppResource) => void; // Remove prop when endpoint is implemented
};

export function NewInputFields({
  appResource,
  saveAppResource,
}: NewInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const [translationType, setTranslationType] = useState<Translation>('none');
  const [updatedAppResource, setUpdatedAppResource] = useState<AppResource>(appResource);
  const [showAppResourceErrors, setShowAppResourceErrors] = useState<boolean>(false);

  const validationErrors: AppResourceFormError[] = validateAppResource(updatedAppResource, t);

  useBeforeUnload(updatedAppResource !== appResource);

  const saveAppConfig = () => {
    if (validationErrors.length === 0) {
      setShowAppResourceErrors(false);
      saveAppResource(updatedAppResource);
      console.log('AppResource saved: ', updatedAppResource);
    } else {
      setShowAppResourceErrors(true);
      window.scrollTo(0, 0);
      console.error('Validation errors:', validationErrors);
      // Show some message about that errors need to be fixed
    }
  };

  const resetAppConfig = () => {
    if (confirm(t('app_settings.about_tab_reset_confirmation'))) {
      setUpdatedAppResource(appResource);
      saveAppResource(appResource);
      setShowAppResourceErrors(false);
    }
  };

  const showServiceNameFields = (): void => setTranslationType('serviceName');
  const hideTranslationFields = (): void => setTranslationType('none');

  return (
    <div className={classes.wrapper}>
      {/* TODO - Add ErrorSummary component here */}
      {showAppResourceErrors && validationErrors.length > 0 && (
        <StudioErrorSummary>
          <StudioErrorSummary.Heading>
            {t('app_settings.about_tab_error_summary_header')}
          </StudioErrorSummary.Heading>
          <StudioErrorSummary.List>
            {validationErrors.map((error: AppResourceFormError) => {
              const href = `#${error.field}${error.index !== undefined && typeof error.index === 'number' ? `-${error.index}` : ''}`;

              return (
                <StudioErrorSummary.Item key={JSON.stringify(error)}>
                  <StudioErrorSummary.Link href={href}>
                    {t(`app_settings.about_tab_error_${error.field}`, {
                      field: error.field,
                      error: error.error,
                    })}
                  </StudioErrorSummary.Link>
                </StudioErrorSummary.Item>
              );
            })}
          </StudioErrorSummary.List>
        </StudioErrorSummary>
      )}
      <NavigationWarningDialog hasContentChanged={updatedAppResource !== appResource} />
      <StudioTextfield
        label={t('app_settings.about_tab_repo_label')}
        description={t('app_settings.about_tab_repo_description')}
        defaultValue={updatedAppResource.repositoryName}
        className={classes.textField}
        readOnly
      />
      <LanguageTextField
        label={t('app_settings.about_tab_name_label')}
        id={InputFieldIds.ServiceName}
        value={updatedAppResource.serviceName}
        onChange={(updatedLanguage: SupportedLanguage) => {
          setUpdatedAppResource((oldVal: AppResource) => ({
            ...oldVal,
            serviceName: updatedLanguage,
          }));
        }}
        onFocus={showServiceNameFields}
        isTranslationPanelOpen={translationType === 'serviceName'}
        errors={
          showAppResourceErrors
            ? validationErrors.filter((error) => error.field === 'serviceName')
            : []
        }
        required
      />
      <StudioTextfield
        label={t('app_settings.about_tab_alt_id_label')}
        description={t('app_settings.about_tab_alt_id_description')}
        value={updatedAppResource.serviceId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setUpdatedAppResource((oldVal: AppResource) => ({
            ...oldVal,
            serviceId: e.target.value,
          }));
        }}
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
