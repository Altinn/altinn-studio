import type { ChangeEvent, ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './InputFields.module.css';
import { useTranslation } from 'react-i18next';
import {
  StudioTextfield,
  StudioLabelAsParagraph,
  StudioParagraph,
  StudioIconTextfield,
} from '@studio/components';

export type ServiceNames<T extends string> = {
  [key in T]: string | undefined;
};

export enum RecommendedLanguageFlags {
  nb = '🇳🇴',
  nn = '🇳🇴',
  en = '🇬🇧',
}

export type InputFieldsProps<T extends string> = {
  appLangCodes: string[];
  onSave: (serviceName: string, language: string) => void;
  repositoryName: string;
  serviceNames: ServiceNames<T>;
};

export function InputFields<T extends string>({
  repositoryName,
  ...rest
}: InputFieldsProps<T>): ReactNode {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <StudioTextfield
        label={t('settings_modal.about_tab_repo_label')}
        description={t('settings_modal.about_tab_repo_description')}
        size='small'
        value={repositoryName}
        readOnly
      />
      <EditServiceNames {...rest} />
    </div>
  );
}

type EditServiceNamesNameProps<T extends string> = Omit<InputFieldsProps<T>, 'repositoryName'>;

function EditServiceNames<T extends string>({
  serviceNames,
  ...rest
}: EditServiceNamesNameProps<T>): React.ReactElement {
  const { t } = useTranslation();

  const appTitleLanguages = Object.keys(serviceNames);

  return (
    <div>
      <StudioLabelAsParagraph>{t('settings_modal.about_tab_name_label')}</StudioLabelAsParagraph>
      <StudioParagraph size={'small'}>
        {t('settings_modal.about_tab_name_description')}
      </StudioParagraph>
      {appTitleLanguages.map((lang: string) => (
        <EditServiceNameForLanguage
          key={lang}
          language={lang}
          serviceName={serviceNames[lang]}
          {...rest}
        />
      ))}
    </div>
  );
}

type EditServiceNameForLanguageProps = {
  appLangCodes: string[];
  language: string;
  onSave: (serviceName: string, language: string) => void;
  serviceName: string;
};

function EditServiceNameForLanguage({
  appLangCodes,
  language,
  onSave,
  serviceName,
}: EditServiceNameForLanguageProps): React.ReactElement {
  const { t } = useTranslation();
  const [serviceNameError, setServiceNameError] = useState<string>('');

  const appHasLanguageTranslation = appLangCodes.includes(language);

  const handleOnBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const isValid = validateServiceName(event.target.value);
    if (isValid) onSave(event.target.value, language);
  };

  const validateServiceName = (newServiceName: string): Boolean => {
    if (newServiceName.length <= 0) {
      setServiceNameError(t('settings_modal.about_tab_name_error'));
      return false;
    }
    setServiceNameError('');
    return true;
  };

  const description: string =
    !appHasLanguageTranslation && t('settings_modal.about_tab_app_title_no_translation_file');

  return (
    <StudioIconTextfield
      icon={RecommendedLanguageFlags[language]}
      size='small'
      label={t(`language.${language}`)}
      description={description}
      error={serviceNameError}
      value={serviceName}
      onBlur={handleOnBlur}
      readOnly={!appHasLanguageTranslation}
    />
  );
}
