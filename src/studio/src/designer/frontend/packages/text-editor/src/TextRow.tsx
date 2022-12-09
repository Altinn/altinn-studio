import React, { useState } from 'react';
import { TextField, ErrorMessage, TextArea } from '@altinn/altinn-design-system';
import type { Translations } from './types';
import TrashIcon from './trash.svg';

import classes from './TextRow.module.css';

type OnIdChangeProps = {
  oldValue: string;
  newValue: string;
};

type OnValueChangeProps = {
  newValue: string;
  textId: string;
};

export interface LanguageRowProps {
  languageName: string;
  langCode: string;
  textId: string;
  translations: Translations;

  // TODO: Cleanup/simplify these, could probably stick with just `onTranslationChange`? See how they are used in TextEditor.tsx - they all end up calling the same callback with the same args
  onTextIdChange: ({ oldValue, newValue }: OnIdChangeProps) => void;
  onValueChange: ({ newValue, textId }: OnValueChangeProps) => void;
  onDeleteText: (textId: string) => void;
}

export const TextRow = ({
  languageName,
  textId,
  onTextIdChange,
  onValueChange,
  translations,
  onDeleteText,
  langCode,
}: LanguageRowProps) => {
  const [idValue, setIdValue] = useState(textId);
  const [translationValue, setTranslationValue] = useState(translations[textId]);
  const [textIdError, setTextIdError] = useState('');

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setTextIdError('');
    setIdValue(newValue);
    const newValueAlreadyExists = Object.keys(translations)
      .filter((key) => key !== textId)
      .some((key) => key === newValue);
    if (newValueAlreadyExists) {
      setTextIdError('Denne IDen finnes allerede');
    }
  };

  const handleIdBlur = () => {
    if (!textIdError) {
      onTextIdChange({ oldValue: textId, newValue: idValue });
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    setTranslationValue(newValue);
  };

  const handleValueBlur = () => {
    onValueChange({ newValue: translationValue, textId });
  };

  const handleDeleteClick = () => {
    onDeleteText(textId);
  };

  const idForId = `id-${langCode}-${textId}`;
  const idForValue = `value-${langCode}-${textId}`;

  return (
    <div data-testid={'lang-row'} className={classes.LanguageRow}>
      <div>
        <div className={classes.LanguageRow__id}>
          <div className={classes.LanguageRow__id__label}>
            <div>
              <label htmlFor={idForId}>ID</label>
            </div>
            <div>
              <TextField
                isValid={!textIdError}
                id={idForId}
                value={idValue}
                type='text'
                onBlur={handleIdBlur}
                onChange={handleIdChange}
              />
              {textIdError ? <ErrorMessage>{textIdError}</ErrorMessage> : null}
            </div>
          </div>
          <div>
            <button
              data-testid={'delete-button'}
              className={classes['LanguageRow__delete-button']}
              onClick={handleDeleteClick}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor={idForValue}>{languageName}</label>
        <div>
          <TextArea
            resize='vertical'
            id={idForValue}
            value={translationValue}
            onBlur={handleValueBlur}
            onChange={handleValueChange}
            rows={6}
          />
        </div>
      </div>
    </div>
  );
};
