import React, { useMemo, useEffect, useState } from 'react';
import classes from './TextEditor.module.css';
import type {
  LangCode,
  TextResourceEntryDeletion,
  TextResourceIdMutation,
  UpsertTextResourceMutation,
} from './types';
import { SearchField } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { RightMenu } from './RightMenu';
import { getRandNumber, mapResourceFilesToTableRows } from './utils';
import { defaultLangCode } from './constants';
import { TextList } from './TextList';
import ISO6391 from 'iso-639-1';
import { ITextResources } from 'app-shared/types/global';

export interface TextEditorProps {
  addLanguage: (language: LangCode) => void;
  availableLanguages: string[];
  deleteLanguage: (language: LangCode) => void;
  searchQuery: string;
  selectedLangCodes: LangCode[];
  setSearchQuery: (searchQuery: string) => void;
  setSelectedLangCodes: (language: LangCode[]) => void;
  textResourceFiles: ITextResources;
  updateTextId: (data: TextResourceIdMutation) => void;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
}

export const TextEditor = ({
  addLanguage,
  availableLanguages,
  deleteLanguage,
  searchQuery,
  selectedLangCodes,
  setSearchQuery,
  setSelectedLangCodes,
  textResourceFiles,
  updateTextId,
  upsertTextResource,
}: TextEditorProps) => {
  const resourceRows = mapResourceFilesToTableRows(textResourceFiles);
  const availableLangCodesFiltered = useMemo(
    () => availableLanguages?.filter((code) => ISO6391.validate(code)),
    [availableLanguages]
  );

  const handleAddNewEntryClick = () => {
    const textId = `id_${getRandNumber()}`;
    availableLangCodesFiltered.forEach((language) =>
      upsertTextResource({ language, textId, translation: '' })
    );
    setSearchQuery('');
  };

  const removeEntry = ({ textId }: TextResourceEntryDeletion) => {
    try {
      updateTextId({ oldId: textId });
    } catch (e: unknown) {
      console.error('Deleting text failed:\n', e);
    }
  };

  const updateEntryId = ({ oldId, newId }: TextResourceIdMutation) => {
    try {
      updateTextId({ oldId, newId });
    } catch (e: unknown) {
      console.error('Renaming text-id failed:\n', e);
    }
  };
  const handleSearchChange = (event: any) => setSearchQuery(event.target.value);
  const initialSelectedLangCodes = JSON.parse(localStorage.getItem('selectedLanguages')) || [];
  [selectedLangCodes, setSelectedLangCodes] = useState<LangCode[]>(initialSelectedLangCodes);
  
  useEffect(() => {
   localStorage.setItem('selectedLanguages', JSON.stringify(selectedLangCodes));
 }, [selectedLangCodes]);

  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__main}>
        <div className={classes.TextEditor__topRow}>
          <Button
            variant={ButtonVariant.Filled}
            color={ButtonColor.Primary}
            onClick={handleAddNewEntryClick}
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
        <div className={classes.TextEditor__body}>
          <TextList
            removeEntry={removeEntry}
            resourceRows={resourceRows}
            searchQuery={searchQuery}
            updateEntryId={updateEntryId}
            upsertTextResource={upsertTextResource}
            selectedLanguages={selectedLangCodes}
          />
        </div>
      </div>
      <RightMenu
        addLanguage={addLanguage}
        availableLanguages={availableLangCodesFiltered || [defaultLangCode]}
        deleteLanguage={deleteLanguage}
        selectedLanguages={selectedLangCodes}
        setSelectedLanguages={setSelectedLangCodes}
      />
    </div>
  );
};
