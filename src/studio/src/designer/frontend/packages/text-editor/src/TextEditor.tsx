import React from 'react';
import classes from './TextEditor.module.css';
import type { LangCode, TextResourceEntry, TextResourceFile } from './types';
import type { RightMenuProps } from './RightMenu';
import { AltinnSpinner } from 'app-shared/components';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { RightMenu } from './RightMenu';
import { TextRow } from './TextRow';
import { getLanguageName, getRandNumber } from './utils';
import { findTextEntry, removeTextEntry, upsertTextEntry } from './mutations';

export interface ILanguageEditorProps {
  translations: TextResourceFile;
  isFetchingTranslations: boolean;
  onTranslationChange: (translations: TextResourceFile) => void;
  selectedLangCode: string;
  onSelectedLanguageChange: (langCode: LangCode) => void;
  availableLanguageCodes: string[];
  onAddLanguage: (langCode: LangCode) => void;
  onDeleteLanguage: (langCode: LangCode) => void;
}

export const TextEditor = ({
  translations,
  selectedLangCode,
  onTranslationChange,
  isFetchingTranslations,
  onSelectedLanguageChange,
  availableLanguageCodes,
  onAddLanguage,
  onDeleteLanguage,
}: ILanguageEditorProps) => {
  const rightMenuProps: RightMenuProps = {
    selectedLangCode,
    onSelectedLanguageChange,
    availableLanguageCodes,
    onAddLanguage,
    onDeleteLanguage,
  };
  const languageName = getLanguageName({ code: selectedLangCode });
  /*
const handleIdChange = ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
  if (oldValue === newValue) {
    return;
  }
  // TODO: Ensure index does not change, to avoid it looking like the row disappears
  const updatedLanguage = { ...translations };
  updatedLanguage[newValue] = updatedLanguage[oldValue];
  delete updatedLanguage[oldValue];

  onTranslationChange({ translations: updatedLanguage });
};

const handleValueChange = ({
  newValue,
  translationKey,
}: {
  newValue: string;
  translationKey: string;
}) => onTranslationChange(upsertTextEntry(translations, { id: translationKey, value: newValue }));
*/
  const handleAddNewEntryClick = () =>
    onTranslationChange(
      upsertTextEntry(translations, {
        id: `id_${getRandNumber()}`,
        value: '',
      })
    );

  const removeEntry = (entryId: string) =>
    onTranslationChange(removeTextEntry(translations, entryId));
  const idExits = (entryId: string) => Boolean(findTextEntry(translations, entryId));
  const upsertEntry = (entry: TextResourceEntry) => upsertTextEntry(translations, entry);

  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__body}>
        {isFetchingTranslations ? (
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
            {translations &&
              translations.resources.map((entry) => (
                <TextRow
                  key={`${selectedLangCode}.${entry.id}`}
                  languageName={languageName}
                  langCode={selectedLangCode}
                  textResourceEntry={entry}
                  idExists={idExits}
                  upsertEntry={upsertEntry}
                  removeEntry={removeEntry}
                />
              ))}
          </>
        )}
      </div>
      <RightMenu {...rightMenuProps} />
    </div>
  );
};
