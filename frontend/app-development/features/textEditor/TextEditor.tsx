import React, { useEffect, useState } from 'react';
import type { LangCode } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { PageSpinner } from 'app-shared/components';
import { useParams, useSearchParams } from 'react-router-dom';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { useLanguagesQuery, useTextResourcesQuery } from '../../hooks/queries';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useTextIdMutation,
  useUpsertTextResourceMutation,
} from '../../hooks/mutations';

export const TextEditor = () => {
  const [searchParams, setSearchParams] = useSearchParams({ lang: '', search: '' });
  const [selectedLangCodes, setSelectedLangCodes] = useState<LangCode[]>([]);

  const handleSelectedLangCodes = (value: LangCode[]) => {
    setSelectedLangCodes(value?.length > 0 ? value : [defaultLangCode]);
  };
  useEffect(() => {
    const initialSelectedLangCodes = JSON.parse(localStorage.getItem('selectedLanguages'));
    handleSelectedLangCodes(initialSelectedLangCodes);
  }, []);

useEffect(() => {
  localStorage.setItem('selectedLanguages', JSON.stringify(selectedLangCodes));
}, [selectedLangCodes]);

  const getSearchQuery = () => searchParams.get('search') || '';
  const { org, app } = useParams();

  const { data: appLangCodes } = useLanguagesQuery(org, app);
  const {
    data: textResources,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations
  } = useTextResourcesQuery(org, app);

  const setSearchQuery = (search: string) => {
    const params: any = {};
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };

  const { mutate: addLanguageMutation } = useAddLanguageMutation(org, app);
  const handleAddLanguage = (language: LangCode) =>
    addLanguageMutation({
      language,
      resources: Object.values(textResources)[0].map(({ id, value }) => ({
        id,
        value: ['appName', 'ServiceName'].includes(id) ? value : '',
      })),
    });

  const { mutate: deleteLanguageMutation } = useDeleteLanguageMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  if (isInitialLoadingLang || isFetchingTranslations || !textResources) {
    return <PageSpinner />;
  }

  return (
    <TextEditorImpl
      addLanguage={handleAddLanguage}
      availableLanguages={appLangCodes}
      deleteLanguage={(langCode: LangCode) => deleteLanguageMutation({ langCode })}
      searchQuery={getSearchQuery()}
      selectedLangCodes={selectedLangCodes}
      setSearchQuery={setSearchQuery}
      setSelectedLangCodes={handleSelectedLangCodes}
      textResourceFiles={textResources}
      updateTextId={(data: TextResourceIdMutation) => textIdMutation([data])}
      upsertTextResource={upsertTextResource}
    />
  );
};
