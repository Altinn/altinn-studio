import type { FormEvent, ReactElement } from 'react';
import React, { useState } from 'react';
import classes from './InputFields.module.css';
import { useTranslation } from 'react-i18next';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { StudioTextfield } from '@studio/components';

type AppConfigForm = Pick<AppConfig, 'serviceName' | 'serviceId'>;

export type InputFieldsProps = {
  appConfig: AppConfig;
  onSave: (appConfig: AppConfig) => void;
};

export function InputFields({ appConfig, onSave }: InputFieldsProps): ReactElement {
  const { t } = useTranslation();

  const [appConfigFormErrors, setAppConfigFormErrors] = useState<
    Pick<AppConfigForm, 'serviceName'>
  >({ serviceName: '' });

  const handleAppConfigFormBlur = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const form = Object.fromEntries(formData) as AppConfigForm;
    const isFormValid = validateForm(form);
    if (isFormValid) {
      onSave({ ...appConfig, ...form });
    }
  };

  const validateForm = (form: AppConfigForm): Boolean => {
    if (form.serviceName.length <= 0) {
      setAppConfigFormErrors({ serviceName: t('app_settings.about_tab_name_error') });
      return false;
    }
    setAppConfigFormErrors({ serviceName: '' });
    return true;
  };

  return (
    <form className={classes.wrapper} onBlur={handleAppConfigFormBlur}>
      <StudioTextfield
        label={t('app_settings.about_tab_repo_label')}
        description={t('app_settings.about_tab_repo_description')}
        defaultValue={appConfig.repositoryName}
        className={classes.textField}
        readOnly
      />
      <StudioTextfield
        label={t('app_settings.about_tab_name_label')}
        description={t('app_settings.about_tab_name_description')}
        name='serviceName'
        error={appConfigFormErrors.serviceName}
        defaultValue={appConfig.serviceName}
        className={classes.textField}
      />
      <StudioTextfield
        label={t('app_settings.about_tab_alt_id_label')}
        description={t('app_settings.about_tab_alt_id_description')}
        name='serviceId'
        defaultValue={appConfig.serviceId}
        className={classes.textField}
      />
      <StudioTextfield
        label='homepage'
        description={t('app_settings.about_tab_alt_id_description')}
        name='homepage'
        defaultValue={appConfig.serviceId}
        className={classes.textField}
      />

      <StudioTextfield
        label='homepage'
        description={t('app_settings.about_tab_alt_id_description')}
        name='homepage'
        defaultValue={appConfig.serviceId}
        className={classes.textField}
      />
    </form>
  );
}
