import React, { useState } from 'react';
import type { TextResourceFile, LangCode } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl } from '@altinn/text-editor';
import { Button, ButtonColor, ButtonVariant, Panel } from '@altinn/altinn-design-system';
import { AltinnSpinner } from 'app-shared/components';
import { getOrgApp } from '../../common/hooks';
import { useGetLanguagesQuery } from '../../services/languagesApi';
import {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} from '../../services/textsApi';
import { Link, useSearchParams } from 'react-router-dom';
import { Dialog } from '@mui/material';
import classes from 'app-shared/features/dataModelling/DataModelling.module.css';
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from 'app-shared/features/dataModelling/functions/localStorage';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { ILanguage } from '@altinn/schema-editor/types';

interface TextEditorProps extends React.PropsWithChildren<any> {
  language: ILanguage;
}

export const TextEditor = ({ language }: TextEditorProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const t = (key: string) => getLanguageFromKey(key, language);

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorageItem('hideTextsIntroPage') ?? false
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

  const handleTranslationChange = (translations: TextResourceFile) =>
    updateLang({
      ...orgApp,
      langCode: selectedLangCode,
      data: translations,
    });
  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorageItem('hideTextsIntroPage', true));
  return (
    <>
      <Dialog open={!hideIntroPage}>
        <Panel forceMobileLayout={true} title={t('text_editor.info_dialog_title')}>
          <div>
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
          </div>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Primary}
              onClick={() => setHideIntroPage(true)}
              variant={ButtonVariant.Outline}
            >
              {t('general.close')}
            </Button>
          </span>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Secondary}
              onClick={handleHideIntroPageButtonClick}
              variant={ButtonVariant.Outline}
            >
              {t('general.do_not_show_anymore')}
            </Button>
          </span>
        </Panel>
      </Dialog>
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
        onAddLang={handleAddLanguage}
        onDeleteLang={handleDeleteLanguage}
      />
    </>
  );
};
