import React from 'react';

import { Select } from '@digdir/design-system-react';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { useGetAppLanguageQuery } from 'src/services/LanguageApi';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

export const LanguageSelector = () => {
  const language = useAppSelector((state) => state.language.language);
  const selectedAppLanguage = useAppSelector(appLanguageStateSelector);
  const textResources = useAppSelector((state) => state.textResources.resources);

  const { data: appLanguages, isError: appLanguageError } = useGetAppLanguageQuery();
  const dispatch = useAppDispatch();

  const handleAppLanguageChange = (languageCode: string) => {
    dispatch(ProfileActions.updateSelectedAppLanguage({ selected: languageCode }));
  };

  if (appLanguageError) {
    console.error('Failed to load app languages.');
    return null;
  }

  if (appLanguages && language) {
    return (
      <div style={{ minWidth: 150 }}>
        <Select
          label={getTextFromAppOrDefault('language.selector.label', textResources, language, undefined, true)}
          options={appLanguages.map((lang) => ({
            value: lang.language,
            label: getTextFromAppOrDefault(
              `language.full_name.${lang.language}`,
              textResources,
              language,
              undefined,
              true,
            ),
          }))}
          onChange={(value) => handleAppLanguageChange(value)}
          value={selectedAppLanguage}
        />
      </div>
    );
  }

  return <AltinnSpinner />;
};
