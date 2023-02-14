import React, { useEffect, useState } from 'react';
import type { LangCode, TextResourceFile } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { getOrgApp } from '../../common/hooks';
import { useGetLanguagesQuery } from '../../services/languagesApi';
import {
  useAddByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useGetAppTextsByLangCodeQuery,
  useUpdateTextIdMutation,
  useUpdateTranslationByLangCodeMutation,
} from '../../services/textsApi';
import { Link, useSearchParams } from 'react-router-dom';
import classes from './TextEditor.module.css';
import { getLocalStorage, setLocalStorage } from 'app-shared/utils/localStorage';
import type { LanguageTree } from 'app-shared/utils/language';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';

interface TextEditorProps extends React.PropsWithChildren<any> {
  language: LanguageTree;
}
const storageGroupName = 'textEditorStorage';
export const TextEditor = ({ language }: TextEditorProps) => {
  const [searchParams, setSearchParams] = useSearchParams({ lang: defaultLangCode });
  const selectedLangCode = searchParams.get('lang');
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
    const params: any = { lang: selectedLangCode };
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };

  const {
    data: translations,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations,
    refetch: refetchTextLang,
  } = useGetAppTextsByLangCodeQuery(
    {
      ...orgApp,
      langCode: selectedLangCode,
    },
    { skip: !selectedLangCode }
  );

  const [updateLang] = useUpdateTranslationByLangCodeMutation();
  const [deleteLanguage] = useDeleteByLangCodeMutation();
  const [addLanguage] = useAddByLangCodeMutation();
  const [updateTextId] = useUpdateTextIdMutation();

  const t = (key: string) => getLanguageFromKey(key, language);

  /*
   * Temporary fix to make sure to have the latest text-resources fetched.
   * This issue will be fixed when we have implemented React Query with shared state/cache
   */
  useEffect(() => {
    refetchTextLang();
  }, [refetchTextLang]);

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorage(storageGroupName, 'hideTextsIntroPage') ?? false
  );
  if (isInitialLoadingLang) {
    return <AltinnSpinner />;
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

  const handleTranslationChange = (changedTranslations: TextResourceFile) =>
    updateLang({
      ...orgApp,
      langCode: selectedLangCode,
      data: changedTranslations,
    });
  const handleTextIdChange = (mutation: TextResourceIdMutation) =>
    updateTextId({
      ...orgApp,
      mutations: [mutation],
    });
  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorage(storageGroupName, 'hideTextsIntroPage', true));
  return (
    <>
      <PopoverPanel
        forceMobileLayout={true}
        variant={PanelVariant.Info}
        open={!hideIntroPage}
        side={'bottom'}
        title={t('text_editor.info_dialog_title')}
        trigger={<span className={'sr-only'} />}
        onOpenChange={() => setHideIntroPage(!hideIntroPage)}
      >
        <p>{t('text_editor.info_dialog_1')}</p>
        <p>
          <Link
            target={'_blank'}
            to={`/../designer/${orgApp.org}/${orgApp.app}/Text`}
            relative={'path'}
          >
            {t('text_editor.info_dialog_nav_to_old')}
          </Link>
        </p>
        <span className={classes.buttons}>
          <Button
            color={ButtonColor.Primary}
            onClick={() => setHideIntroPage(true)}
            variant={ButtonVariant.Outline}
          >
            {t('general.close')}
          </Button>
          <Button
            color={ButtonColor.Secondary}
            onClick={handleHideIntroPageButtonClick}
            variant={ButtonVariant.Outline}
          >
            {t('general.do_not_show_anymore')}
          </Button>
        </span>
      </PopoverPanel>
      <TextEditorImpl
        selectedLangCode={selectedLangCode}
        searchQuery={getSearchQuery()}
        setSelectedLangCode={setSelectedLangCode}
        setSearchQuery={setSearchQuery}
        availableLangCodes={appLangCodes}
        translations={
          translations || {
            language: selectedLangCode,
            resources: [],
          }
        }
        isFetchingTranslations={isFetchingTranslations}
        onTranslationChange={handleTranslationChange}
        onTextIdChange={handleTextIdChange}
        onAddLang={handleAddLanguage}
        onDeleteLang={handleDeleteLanguage}
      />
    </>
  );
};
