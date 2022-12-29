import React from 'react';
import type { TextResourceFile, LangCode } from '@altinn/text-editor';
import { AltinnSpinner } from 'app-shared/components';
import { TextEditor } from '@altinn/text-editor';
import { getOrgApp } from '../../common/hooks';
import { useGetLanguagesQuery } from '../../services/languagesApi';
import {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} from '../../services/textsApi';
import { useSearchParams } from 'react-router-dom';

export const TextEditorImpl = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const getSelectedLangCode = () => searchParams.get('lang');
  const getSearchQuery = () => searchParams.get('search') || '';
  const orgApp = getOrgApp();
  const { data: appLangCodes } = useGetLanguagesQuery(orgApp);
  const setSelectedLangCode = (lang: string) => {
    const params: any = { lang };
    if (getSearchQuery().length > 0) {
      params.search = getSearchQuery();
    }
    setSearchParams(params);
  };
  const setSearchQuery = (search: string) => {
    const params: any = { lang: getSelectedLangCode() };
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };

  const {
    data: translations,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations,
  } = useGetAppTextsByLangCodeQuery(
    {
      ...orgApp,
      langCode: getSelectedLangCode(),
    },
    { skip: !getSelectedLangCode() }
  );

  const [updateLang] = useUpdateTranslationByLangCodeMutation();
  const [deleteLanguage] = useDeleteByLangCodeMutation();
  const [addLanguage] = useAddByLangCodeMutation();

  if (isInitialLoadingLang) {
    return (
      <div>
        <AltinnSpinner />
      </div>
    );
  }

  const handleAddLanguage = (langCode: LangCode) =>
    addLanguage({
      ...orgApp,
      langCode,
      resources: translations.resources.map(({ id }) => ({
        id,
        value: '',
      })),
    });

  const handleDeleteLanguage = (langCode: LangCode) =>
    deleteLanguage({
      ...orgApp,
      langCode,
    });

  const handleTranslationChange = (translations: TextResourceFile) =>
    updateLang({
      ...orgApp,
      langCode: getSelectedLangCode(),
      data: translations,
    });

  return (
    <>
      <TextEditor
        selectedLangCode={getSelectedLangCode()}
        searchQuery={getSearchQuery()}
        setSelectedLangCode={setSelectedLangCode}
        setSearchQuery={setSearchQuery}
        availableLangCodes={appLangCodes}
        translations={
          translations || {
            language: getSelectedLangCode(),
            resources: [],
          }
        }
        isFetchingTranslations={isFetchingTranslations}
        onTranslationChange={handleTranslationChange}
        onAddLang={handleAddLanguage}
        onDeleteLang={handleDeleteLanguage}
      />
    </>
  );
};
