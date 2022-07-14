import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { AltinnSpinner, Select } from 'altinn-shared/components';
import { Box } from '@material-ui/core';
import * as React from 'react';
import { useAppSelector, useAppDispatch } from 'src/common/hooks';
import { useGetAppLanguageQuery } from 'src/services/LanguageApi';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';

export const LanguageSelector = () => {
  const language = useAppSelector((state) => state.language.language || {});
  const { isSuccess, data, isLoading } = useGetAppLanguageQuery();
  const selectedAppLanguage = useAppSelector(appLanguageStateSelector);

  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const dispatch = useAppDispatch();
  const handleAppLanguageChange = (languageCode: string) => {
    dispatch(
      LanguageActions.updateSelectedAppLanguage({ selected: languageCode }),
    );
  };

  return (
    <Box
      display='flex'
      flexDirection='column'
      className='mb-1'
    >
      {isLoading && <AltinnSpinner />}
      {isSuccess && (
        <>
          <label
            className='a-form-label'
            htmlFor='app-language-select'
          >
            {getTextFromAppOrDefault(
              'language.selector.label',
              textResources,
              language,
              null,
              true,
            )}
          </label>
          <Select
            options={data.map((l) => ({
              value: l.language,
              label: getTextFromAppOrDefault(
                'language.full_name.' + l.language,
                textResources,
                language,
                null,
                true,
              ),
            }))}
            onChange={(ev) => handleAppLanguageChange(ev.target.value)}
            value={selectedAppLanguage}
            id='app-language-select'
          />
        </>
      )}
    </Box>
  );
};
