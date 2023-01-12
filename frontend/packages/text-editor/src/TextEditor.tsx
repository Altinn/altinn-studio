import React, { useCallback, useEffect, useState } from 'react';
import classes from './TextEditor.module.css';
import type {
  LangCode,
  TextResourceEntry,
  TextResourceFile,
  TextResourceEntryDeletion,
  TextResourceIdMutation,
} from './types';
import { AltinnSpinner } from 'app-shared/components';
import { SearchField } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { RightMenu } from './RightMenu';
import { getRandNumber } from './utils';
import {
  generateTextResourceFile,
  mapTextResources,
  removeTextEntry,
  updateTextEntryId,
  upsertTextEntry,
} from './mutations';
import { defaultLangCode } from './constants';
import { TextList } from './TextList';

export interface TextEditorProps {
  translations: TextResourceFile;
  isFetchingTranslations: boolean;
  onTranslationChange: (translations: TextResourceFile) => void;
  selectedLangCode: string;
  searchQuery: string;
  setSelectedLangCode: (langCode: LangCode) => void;
  setSearchQuery: (searchQuery: string) => void;
  availableLangCodes: string[];
  onAddLang: (langCode: LangCode) => void;
  onDeleteLang: (langCode: LangCode) => void;
}

export const TextEditor = ({
  translations,
  selectedLangCode,
  searchQuery,
  onTranslationChange,
  isFetchingTranslations,
  setSelectedLangCode,
  setSearchQuery,
  availableLangCodes,
  onAddLang,
  onDeleteLang,
}: TextEditorProps) => {
  const { resources } = translations;
  const [textIds, setTextIds] = useState(resources.map(({ id }) => id) || []);
  const getUpdatedTexts = useCallback(() => mapTextResources(resources), [resources]);
  const [texts, setTexts] = useState(getUpdatedTexts());
  useEffect(() => {
    if (!availableLangCodes?.includes(selectedLangCode)) {
      setSelectedLangCode(defaultLangCode);
    }
  }, [setSelectedLangCode, selectedLangCode, availableLangCodes]);
  useEffect(() => {
    setTexts(getUpdatedTexts());
  }, [getUpdatedTexts, resources]);

  const handleAddNewEntryClick = () => {
    const newId = `id_${getRandNumber()}`;
    setSearchQuery('');
    onTranslationChange(
      upsertTextEntry(translations, {
        id: newId,
        value: '',
      })
    );
    setTextIds([newId, ...textIds]);
  };
  const removeEntry = ({ textId }: TextResourceEntryDeletion) => {
    const mutatedIds = textIds.filter((v) => v !== textId);
    const mutatedEntries = removeTextEntry(texts, textId);
    onTranslationChange(
      generateTextResourceFile(translations.language, mutatedIds, mutatedEntries)
    );
    setTextIds(mutatedIds);
  };
  const upsertEntry = (entry: TextResourceEntry) =>
    onTranslationChange(upsertTextEntry(translations, entry));
  const updateEntryId = ({ oldId, newId }: TextResourceIdMutation) => {
    onTranslationChange(updateTextEntryId(translations, oldId, newId));
    const mutatingIds = [...textIds];
    const idx = mutatingIds.findIndex((v) => v === oldId);
    mutatingIds[idx] = newId;
    setTextIds(mutatingIds);
  };
  const handleSearchChange = (event: any) => setSearchQuery(event.target.value);
  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__main}>
        <div className={classes.TextEditor__topRow}>
          <Button
            variant={ButtonVariant.Filled}
            color={ButtonColor.Primary}
            onClick={handleAddNewEntryClick}
            disabled={isFetchingTranslations}
            data-testid='text-editor-btn-add'
          >
            Ny tekst
          </Button>
          <div>
            <SearchField
              label='Søk etter tekst eller id'
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        <TextList
          textIds={textIds}
          selectedLangCode={selectedLangCode}
          searchQuery={searchQuery}
          texts={texts}
          upsertEntry={upsertEntry}
          removeEntry={removeEntry}
          updateEntryId={updateEntryId}
        />
        {isFetchingTranslations ? <AltinnSpinner /> : null}
      </div>
      <RightMenu
        onAddLang={onAddLang}
        onDeleteLang={onDeleteLang}
        selectedLangCode={selectedLangCode}
        onSelectedLangChange={setSelectedLangCode}
        availableLangCodes={availableLangCodes || [defaultLangCode]}
      />
    </div>
  );
};
