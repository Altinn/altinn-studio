import React, { useState } from 'react';
import classes from './TextEditor.module.css';
import type { LangCode, TextResourceFile } from './types';
import type { RightMenuProps } from './RightMenu';
import { RightMenu } from './RightMenu';
import { AltinnSpinner } from 'app-shared/components';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { getLanguageName, getRandNumber } from './utils';
import { TextList } from './TextList';

export interface ILanguageEditorProps {
  fetchedTextIds?: string[];
  isFetchingTextIds: boolean;
  translations: TextResourceFile;
  onTranslationChange: (translations: TextResourceFile) => void;
  selectedLangCode: string;
  onSelectedLanguageChange: (langCode: LangCode) => void;
  availableLanguageCodes: string[];
  onAddLanguage: (langCode: LangCode) => void;
  onDeleteLanguage: (langCode: LangCode) => void;
}

export const TextEditor = ({
  fetchedTextIds,
  isFetchingTextIds,
  translations,
  selectedLangCode,
  onTranslationChange,
  onSelectedLanguageChange,
  availableLanguageCodes,
  onAddLanguage,
  onDeleteLanguage,
}: ILanguageEditorProps) => {
  const [textIds, setTextIds] = useState<string[]>(fetchedTextIds || []);
  const rightMenuProps: RightMenuProps = {
    selectedLangCode,
    onSelectedLanguageChange,
    availableLanguageCodes,
    onAddLanguage,
    onDeleteLanguage,
  };
  const handleTextIdChange = ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
    const updatedLanguage = { ...translations };
    updatedLanguage[newValue] = updatedLanguage[oldValue];
    delete updatedLanguage[oldValue];
    onTranslationChange(updatedLanguage);
    const renamedIds = [...textIds];
    renamedIds.splice(
      textIds.findIndex((v) => v === oldValue),
      1,
      newValue
    );
    setTextIds(renamedIds);
  };

  const languageName = getLanguageName({ code: selectedLangCode });

  const handleTranslationChange = ({ newValue, textId }: { newValue: string; textId: string }) => {
    const updatedLanguage = {
      ...translations,
    };
    updatedLanguage[textId] = newValue;

    onTranslationChange(updatedLanguage);
  };
  const handleAddNewEntryClick = () => {
    const newId = getRandNumber();
    const newIdList = [`id_${newId}`, ...textIds];
    setTextIds(newIdList);
  };

  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__body}>
        {isFetchingTextIds ? (
          <div>
            <AltinnSpinner />
          </div>
        ) : (
          <>
            <div className={classes.TextEditor__topRow}>
              <Button
                variant={ButtonVariant.Filled}
                color={ButtonColor.Primary}
                onClick={handleAddNewEntryClick}
              >
                Ny tekst
              </Button>
            </div>
            <TextList
              textIds={textIds}
              languageName={languageName}
              langCode={selectedLangCode}
              translations={translations}
              onTextIdChange={handleTextIdChange}
              onTranslationChange={handleTranslationChange}
            />
          </>
        )}
      </div>
      <RightMenu {...rightMenuProps} />
    </div>
  );
};
