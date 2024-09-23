import type { FormEvent, ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './InputFields.module.css';
import { useTranslation } from 'react-i18next';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { Textfield } from '@digdir/designsystemet-react';

type AppConfigForm = Pick<AppConfig, 'serviceName' | 'serviceId'>;

export type InputFieldsProps = {
  appConfig: AppConfig;
  onSave: (appConfig: AppConfig) => void;
};

export const InputFields = ({ appConfig, onSave }: InputFieldsProps): ReactNode => {
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
      setAppConfigFormErrors({ serviceName: t('settings_modal.about_tab_name_error') });
      return false;
    }
    setAppConfigFormErrors({ serviceName: '' });
    return true;
  };

  return (
    <form className={classes.wrapper} onBlur={handleAppConfigFormBlur}>
      <Textfield
        label={t('settings_modal.about_tab_repo_label')}
        description={t('settings_modal.about_tab_repo_description')}
        size='small'
        defaultValue={appConfig.repositoryName}
        readOnly
      />
      <Textfield
        label={t('settings_modal.about_tab_name_label')}
        description={t('settings_modal.about_tab_name_description')}
        size='small'
        name='serviceName'
        error={appConfigFormErrors.serviceName}
        defaultValue={appConfig.serviceName}
      />
      <Textfield
        label={t('settings_modal.about_tab_alt_id_label')}
        description={t('settings_modal.about_tab_alt_id_description')}
        size='small'
        name='serviceId'
        defaultValue={appConfig.serviceId}
      />
    </form>
  );
};
