import React, { useEffect, useState } from 'react';
import type { LangCode, TextResourceFile } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import classes from './TextEditor.module.css';
import { getLocalStorage, setLocalStorage } from 'app-shared/utils/localStorage';
import { TextResourceIdMutation, UpsertTextResourcesMutation } from '@altinn/text-editor/src/types';
import { useTranslation } from 'react-i18next';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useReloadTextResourceFiles,
  useTextIdMutation,
  useTextLanguages,
  useTextResourceFiles,
  useTranslationByLangCodeMutation,
  useUpsertTextResourcesMutation,
} from '../../query-hooks/text';

const storageGroupName = 'textEditorStorage';

export const TextEditor = () => {
  const [searchParams, setSearchParams] = useSearchParams({ lang: '', search: '' });
  const selectedLangCodes = searchParams.get('lang').split('-');
  const getSearchQuery = () => searchParams.get('search') || '';
  const { org, app } = useParams();

  const { data: appLangCodes } = useTextLanguages(org, app);
  const results = useTextResourceFiles(org, app, selectedLangCodes);
  const reloadTextResourceFiles = useReloadTextResourceFiles(org, app);
  const setSelectedLangCodes = async (langs: string[]) => {
    const params: any = { lang: langs.join('-') };
    if (getSearchQuery().length > 0) {
      params.search = searchParams.get('search');
    }
    await setSearchParams(params);
    // Just do a reload of all textfiles to avoid hanging deleted texts and
    // hanging new tekst.
    await reloadTextResourceFiles();
  };

  const setSearchQuery = (search: string) => {
    const params: any = { lang: searchParams.get('lang') };
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };
  useEffect(() => {
    if (appLangCodes && !appLangCodes.includes(selectedLangCodes[0])) {
      setSelectedLangCodes([defaultLangCode]).then();
    }
  }, [appLangCodes, selectedLangCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const [textResourceFiles, setTextResourceFiles] = useState<TextResourceFile[]>([]);

  const isInitialLoadingLang = results.filter((r) => r.isLoading).length > 0;
  const isFetchingTranslations = results.filter((r) => r.isFetching).length > 0;

  useEffect(
    () =>
      setTextResourceFiles(results.filter((r) => r.data).map((r) => r.data) as TextResourceFile[]),
    [isInitialLoadingLang, isFetchingTranslations] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { t } = useTranslation();

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorage(storageGroupName, 'hideTextsIntroPage') ?? false
  );

  const { mutate: addLanguageMutation } = useAddLanguageMutation(org, app);
  const handleAddLanguage = (language: LangCode) =>
    addLanguageMutation({
      language,
      resources: textResourceFiles[0].resources.map(({ id, value }) => ({
        id,
        value: ['appName', 'ServiceName'].includes(id) ? value : '',
      })),
    });

  const { mutate: deleteLanguageMutation } = useDeleteLanguageMutation(org, app);
  const { mutate: transMutation } = useTranslationByLangCodeMutation(org, app, selectedLangCodes);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorage(storageGroupName, 'hideTextsIntroPage', true));

  const { mutate: textResourceMutation } = useUpsertTextResourcesMutation(org, app);
  const upsertTextResource = (data: UpsertTextResourcesMutation) => {
    textResourceMutation(data);
    let itsAnInsert = true;
    textResourceFiles.forEach((file) =>
      file.resources.forEach((entry) => {
        if (entry.id === data.textId && file.language === data.language) {
          entry.value = data.translation;
          itsAnInsert = false;
        }
      })
    );
    // It's an insert
    if (itsAnInsert && data.language === selectedLangCodes[0]) {
      textResourceFiles.forEach((file) =>
        file.resources.push({
          id: data.textId,
          value: '',
          variables: null,
        })
      );
    }
    setTextResourceFiles(textResourceFiles);
  };

  if (isInitialLoadingLang || isFetchingTranslations || textResourceFiles.length === 0) {
    return <AltinnSpinner />;
  }

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
          <Link target={'_blank'} to={`/../designer/${org}/${app}/Text`} relative={'path'}>
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
        addLanguage={handleAddLanguage}
        availableLanguages={appLangCodes}
        deleteLanguage={(langCode: LangCode) => deleteLanguageMutation({ langCode })}
        searchQuery={getSearchQuery()}
        setSearchQuery={setSearchQuery}
        setSelectedLangCodes={setSelectedLangCodes}
        textResourceFiles={textResourceFiles || []}
        updateTextId={(data: TextResourceIdMutation) => textIdMutation([data])}
        upsertTextResource={upsertTextResource}
        upsertTextResourceFile={(data: TextResourceFile) => transMutation(data)}
      />
    </>
  );
};
