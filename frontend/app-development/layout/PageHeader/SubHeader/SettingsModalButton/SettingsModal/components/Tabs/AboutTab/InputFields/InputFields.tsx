import type { ChangeEvent, ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './InputFields.module.css';
import { useTranslation } from 'react-i18next';
import {
  StudioTextfield,
  StudioLabelAsParagraph,
  StudioParagraph,
  StudioIconTextfield,
  StudioProperty,
} from '@studio/components';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import { recommendedLanguages } from '../utils/getAppTitlesToDisplay';

export type ServiceNames<T extends string> = {
  [key in T]: string | undefined;
};

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
  const [displayAllLanguages, setDisplayAllLanguages] = useState<boolean>(false);

  const restAppTitleLanguages = Object.keys(serviceNames).filter(
    (lang) => !recommendedLanguages.includes(lang),
  );
  const rendertext = displayAllLanguages
    ? t('settings_modal.about_tab.hide_languages')
    : t('settings_modal.about_tab.show_more_languages');

  const renderIcon = displayAllLanguages ? (
    <ChevronUpIcon className={classes.upIcon} />
  ) : (
    <ChevronDownIcon className={classes.downIcon} />
  );

  return (
    <div>
      <StudioLabelAsParagraph>{t('settings_modal.about_tab_name_label')}</StudioLabelAsParagraph>
      <StudioParagraph size={'small'}>
        {t('settings_modal.about_tab_name_description')}
      </StudioParagraph>
      {recommendedLanguages.map((lang: string) => (
        <EditServiceNameForLanguage
          language={lang}
          key={lang}
          serviceName={serviceNames[lang]}
          {...rest}
        />
      ))}
      {displayAllLanguages &&
        restAppTitleLanguages.map((lang: string) => (
          <EditServiceNameForLanguage
            key={lang}
            language={lang}
            serviceName={serviceNames[lang]}
            {...rest}
          />
        ))}
      <StudioProperty.Button
        property={rendertext}
        onClick={() => setDisplayAllLanguages((prev) => !prev)}
        icon={renderIcon}
      ></StudioProperty.Button>
    </div>
  );
}

type EditServiceNameForLanguageProps = {
  appLangCodes: string[];
  language: string;
  onSave: (serviceName: string, language: string) => void;
  serviceName: string | undefined;
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

  const validateServiceName = (newServiceName: string): boolean => {
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
      size='small'
      label={t(`language.${language}`)}
      description={description}
      error={serviceNameError}
      value={serviceName}
      onBlur={handleOnBlur}
      readOnly={!appHasLanguageTranslation}
      className={classes.serviceName}
    />
  );
}
