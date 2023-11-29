import React, { useMemo } from 'react';

import { Select } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useCurrentLanguage, useSetCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useGetAppLanguageQuery } from 'src/features/language/textResources/useGetAppLanguagesQuery';
import { useLanguage } from 'src/features/language/useLanguage';

export const LanguageSelector = ({ hideLabel }: { hideLabel?: boolean }) => {
  const { langAsString } = useLanguage();
  const selectedLanguage = useCurrentLanguage();
  const { setWithLanguageSelector } = useSetCurrentLanguage();

  const { data: appLanguages, isError: appLanguageError } = useGetAppLanguageQuery();

  const handleAppLanguageChange = (languageCode: string) => {
    setWithLanguageSelector(languageCode);
  };

  const optionsMap = useMemo(
    () =>
      appLanguages?.map((lang) => ({
        label: langAsString(`language.full_name.${lang.language}`),
        value: lang.language,
      })),
    [appLanguages, langAsString],
  );

  if (appLanguageError) {
    console.error('Failed to load app languages.');
    return null;
  }

  if (appLanguages) {
    return (
      <div style={{ minWidth: 160 }}>
        <Select
          label={!hideLabel ? langAsString('language.selector.label') : undefined}
          options={optionsMap || []}
          onChange={(value) => handleAppLanguageChange(value)}
          value={selectedLanguage}
        />
      </div>
    );
  }

  return <AltinnSpinner />;
};
