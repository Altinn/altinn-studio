import React, { useRef, useState } from 'react';
import type { ChangeEvent, MutableRefObject, ReactElement } from 'react';
import classes from './AppConfigForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioTextfield } from '@studio/components';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import { ActionButtons } from './ActionButtons';
import { InputfieldsWithTranslation } from './InputfieldsWithTranslation';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import { validateAppConfig } from '../utils/appConfigValidationUtils';
import { ErrorSummary } from './ErrorSummary';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import { ObjectUtils } from '@studio/pure-functions';
import { SwitchInput } from './SwitchInput';

export type AppConfigFormProps = {
  appConfig: AppConfigNew;
  saveAppConfig: (appConfig: AppConfigNew) => void; // Remove prop when endpoint is implemented
};

export function AppConfigForm({ appConfig, saveAppConfig }: AppConfigFormProps): ReactElement {
  const { t } = useTranslation();
  const [updatedAppConfig, setUpdatedAppConfig] = useState<AppConfigNew>(appConfig);
  const [showAppConfigErrors, setShowAppConfigErrors] = useState<boolean>(false);

  const errorSummaryRef: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(
    null,
  );

  const validationErrors: AppConfigFormError[] = validateAppConfig(updatedAppConfig, t);
  const serviceNameErrors: AppConfigFormError[] = getValidationErrorsForField(
    !showAppConfigErrors,
    validationErrors,
    'serviceName',
  );
  const descriptionErrors: AppConfigFormError[] = getValidationErrorsForField(
    !showAppConfigErrors,
    validationErrors,
    'description',
  );

  const rightDescriptionErrors: AppConfigFormError[] = getValidationErrorsForField(
    !showAppConfigErrors,
    validationErrors,
    'rightDescription',
  );

  useScrollIntoView(showAppConfigErrors, errorSummaryRef);

  const saveUpdatedAppConfig = (): void => {
    if (hasValidationErrors()) {
      setShowAppConfigErrors(true);
      return;
    }

    persistAppDetails();
  };

  const hasValidationErrors = (): boolean => {
    return validationErrors.length > 0;
  };

  const persistAppDetails = (): void => {
    setShowAppConfigErrors(false);
    saveAppConfig(updatedAppConfig);
    console.log('AppConfig saved: ', updatedAppConfig); // Will be removed when endpoint is implemented
  };

  const resetAppConfig = (): void => {
    if (confirm(t('app_settings.about_tab_reset_confirmation'))) {
      setUpdatedAppConfig(appConfig);
      setShowAppConfigErrors(false);
    }
  };

  const onChangeServiceName = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      serviceName: updatedLanguage,
    }));
  };

  const onChangeServiceId = (e: ChangeEvent<HTMLInputElement>): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      serviceId: e.target.value,
    }));
  };

  const onChangeDescription = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      description: updatedLanguage,
    }));
  };

  const onChangeHomepage = (e: ChangeEvent<HTMLInputElement>): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      homepage: e.target.value,
    }));
  };

  const onChangeDelegable = (e: ChangeEvent<HTMLInputElement>): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      isDelegable: e.target.checked,
    }));
  };

  const onChangeRightDescription = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: AppConfigNew) => ({
      ...oldVal,
      rightDescription: updatedLanguage,
    }));
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.formWrapper}>
        {showAppConfigErrors && validationErrors.length > 0 && (
          <ErrorSummary validationErrors={validationErrors} ref={errorSummaryRef} />
        )}
        <StudioTextfield
          label={t('app_settings.about_tab_repo_label')}
          description={t('app_settings.about_tab_repo_description')}
          defaultValue={updatedAppConfig.repositoryName}
          readOnly
        />
        <InputfieldsWithTranslation
          label={t('app_settings.about_tab_name_label')}
          description={t('app_settings.about_tab_name_description')}
          id={AppResourceFormFieldIds.ServiceName}
          value={updatedAppConfig.serviceName}
          updateLanguage={onChangeServiceName}
          errors={serviceNameErrors}
          required
        />
        <StudioTextfield
          label={t('app_settings.about_tab_alt_id_label')}
          description={t('app_settings.about_tab_alt_id_description')}
          value={updatedAppConfig.serviceId}
          onChange={onChangeServiceId}
          required={false}
          tagText={t('general.optional')}
        />
        <InputfieldsWithTranslation
          label={t('app_settings.about_tab_description_field_label')}
          description={t('app_settings.about_tab_description_field_description')}
          id={AppResourceFormFieldIds.Description}
          value={updatedAppConfig.description}
          updateLanguage={onChangeDescription}
          required
          isTextArea
          errors={descriptionErrors}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_homepage_field_label')}
          description={t('app_settings.about_tab_homepage_field_description')}
          value={updatedAppConfig.homepage}
          onChange={onChangeHomepage}
          required={false}
          tagText={t('general.optional')}
        />
        <SwitchInput
          switchAriaLabel={t('app_settings.about_tab_delegable_show_text', {
            shouldText: !updatedAppConfig.isDelegable
              ? t('app_settings.about_tab_switch_should_not')
              : '',
          })}
          cardHeading={t('app_settings.about_tab_delegable_field_label')}
          description={t('app_settings.about_tab_delegable_field_description')}
          checked={updatedAppConfig?.isDelegable ?? false}
          onChange={onChangeDelegable}
        />
        {updatedAppConfig.isDelegable && (
          <InputfieldsWithTranslation
            label={t('app_settings.about_tab_right_description_field_label')}
            description={t('app_settings.about_tab_right_description_field_description')}
            id={AppResourceFormFieldIds.RightDescription}
            value={updatedAppConfig.rightDescription}
            updateLanguage={onChangeRightDescription}
            required
            isTextArea
            errors={rightDescriptionErrors}
          />
        )}
      </div>
      <ActionButtons
        onSave={saveUpdatedAppConfig}
        onReset={resetAppConfig}
        areButtonsDisabled={ObjectUtils.areObjectsEqual(updatedAppConfig, appConfig)}
      />
    </div>
  );
}

enum AppResourceFormFieldIds {
  ServiceName = 'serviceName',
  Description = 'description',
  RightDescription = 'rightDescription',
}

function getValidationErrorsForField(
  hideErrors: boolean,
  validationErrors: AppConfigFormError[],
  field: keyof AppConfigNew,
): AppConfigFormError[] {
  if (hideErrors) return [];
  return validationErrors.filter((error) => error.field === field);
}
