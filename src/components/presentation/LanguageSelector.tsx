import React from 'react';

import { Combobox } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage, useSetCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useGetAppLanguageQuery } from 'src/features/language/textResources/useGetAppLanguagesQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import comboboxClasses from 'src/styles/combobox.module.css';

export const LanguageSelector = ({ hideLabel }: { hideLabel?: boolean }) => {
  const { langAsString } = useLanguage();
  const currentLanguage = useCurrentLanguage();
  const { setWithLanguageSelector } = useSetCurrentLanguage();

  const { data: appLanguages, isError: appLanguageError } = useGetAppLanguageQuery();
  // Combobox crashes if the value is not present in the options
  const selectedLanguage = appLanguages?.filter((lang) => lang === currentLanguage) ?? [];

  const handleAppLanguageChange = (values: string[]) => {
    const lang = values.at(0);
    if (lang) {
      setWithLanguageSelector(lang);
    }
  };

  if (appLanguageError) {
    console.error('Failed to load app languages.');
    return null;
  }

  if (appLanguages) {
    return (
      <Combobox
        size='sm'
        hideLabel={hideLabel}
        label={langAsString('language.selector.label')}
        onValueChange={handleAppLanguageChange}
        value={selectedLanguage}
        className={comboboxClasses.container}
      >
        {appLanguages?.map((lang) => (
          <Combobox.Option
            key={lang}
            value={lang}
            displayValue={langAsString(`language.full_name.${lang}`)}
          >
            <Lang id={`language.full_name.${lang}`} />
          </Combobox.Option>
        ))}
      </Combobox>
    );
  }

  return <AltinnSpinner />;
};
