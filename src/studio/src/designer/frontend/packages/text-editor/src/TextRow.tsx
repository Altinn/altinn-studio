import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { TextResourceEntry } from './types';
import { Delete } from '@navikt/ds-icons';
import {
  Button,
  ButtonVariant,
  ErrorMessage,
  TextArea,
  TextField,
} from '@altinn/altinn-design-system';

export interface ILanguageRowProps {
  languageName: string;
  langCode: string;
  textResourceEntry: TextResourceEntry;
  // TODO: Cleanup/simplify these, could probably stick with just `onTranslationChange`? See how they are used in TextEditor.tsx - they all end up calling the same callback with the same args
  upsertEntry: (entry: TextResourceEntry) => void;
  removeEntry: (textResourceId: string) => void;
  idExists: (textResourceId: string) => boolean;
}

export const TextRow = ({
  languageName,
  langCode,
  textResourceEntry,
  upsertEntry,
  removeEntry,
  idExists,
}: ILanguageRowProps) => {
  const [idValue, setIdValue] = useState(textResourceEntry.id);
  const [valueValue, setValueValue] = useState(textResourceEntry.value);
  const [keyError, setKeyError] = useState('');

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    if (idExists(newValue)) {
      setKeyError('Denne IDen finnes allerede');
    } else {
      setKeyError('');
      setIdValue(newValue);
    }
  };

  const handleIdBlur = () => {
    if (!keyError) {
      // would have done something herer
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setValueValue(e.currentTarget.value);

  const handleValueBlur = () => upsertEntry({ id: textResourceEntry.id, value: valueValue });

  const handleDeleteClick = () => removeEntry(textResourceEntry.id);

  const idForValue = `value-${langCode}-${textResourceEntry.id}`;

  return (
    <div data-testid={'lang-row'} className={classes.textRow}>
      <div className={classes.leftCol}>
        <TextField
          isValid={!keyError}
          value={idValue}
          type='text'
          onBlur={handleIdBlur}
          onChange={handleIdChange}
          label={'ID'}
        />
        {keyError ? <ErrorMessage>{keyError}</ErrorMessage> : null}
      </div>
      <div className={classes.centerCol}>
        <label htmlFor={idForValue}>{languageName}</label>
        <TextArea
          resize='vertical'
          id={idForValue}
          value={valueValue}
          onBlur={handleValueBlur}
          onChange={handleValueChange}
          rows={3}
        />
      </div>
      <div className={classes.rightCol}>
        <Button
          data-testid={'delete-button'}
          className={classes.deleteButton}
          onClick={handleDeleteClick}
          icon={<Delete />}
          variant={ButtonVariant.Quiet}
        />
      </div>
    </div>
  );
};
