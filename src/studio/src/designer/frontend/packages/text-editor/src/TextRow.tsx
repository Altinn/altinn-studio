import React, { useState } from 'react';
import {
  Button,
  ButtonVariant,
  ErrorMessage,
  TextArea,
  TextField,
} from '@altinn/altinn-design-system';
import type { Translations } from './types';
import { Delete } from '@navikt/ds-icons';

import classes from './TextRow.module.css';

type OnIdChangeProps = {
  oldValue: string;
  newValue: string;
};

type OnValueChangeProps = {
  newValue: string;
  translationKey: string;
};

export interface ILanguageRowProps {
  languageName: string;
  langCode: string;
  translationKey: string;
  translations: Translations;

  // TODO: Cleanup/simplify these, could probably stick with just `onTranslationChange`? See how they are used in TextEditor.tsx - they all end up calling the same callback with the same args
  onIdChange: ({ oldValue, newValue }: OnIdChangeProps) => void;
  onValueChange: ({ newValue, translationKey }: OnValueChangeProps) => void;
  onTranslationChange: ({ translations }: { translations: Translations }) => void;
}

export const TextRow = ({
  languageName,
  translationKey,
  onIdChange,
  onValueChange,
  translations,
  onTranslationChange,
  langCode,
}: ILanguageRowProps) => {
  const [idValue, setIdValue] = useState(translationKey);
  const [valueValue, setValueValue] = useState(translations[translationKey]);
  const [keyError, setKeyError] = useState('');

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setKeyError('');
    setIdValue(newValue);
    const newValueAlreadyExists = Object.keys(translations)
      .filter((key) => key !== translationKey)
      .some((key) => key === newValue);
    if (newValueAlreadyExists) {
      setKeyError('Denne IDen finnes allerede');
    }
  };

  const handleIdBlur = () => {
    if (!keyError) {
      onIdChange({ oldValue: translationKey, newValue: idValue });
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    setValueValue(newValue);
  };

  const handleValueBlur = () => {
    onValueChange({ newValue: valueValue, translationKey });
  };

  const handleDeleteClick = () => {
    const newObj = JSON.parse(JSON.stringify(translations));
    delete newObj[translationKey];

    onTranslationChange({
      translations: newObj,
    });
  };

  const idForId = `id-${langCode}-${translationKey}`;
  const idForValue = `value-${langCode}-${translationKey}`;

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
                isValid={!keyError}
                id={idForId}
                value={idValue}
                type='text'
                onBlur={handleIdBlur}
                onChange={handleIdChange}
              />
              {keyError ? <ErrorMessage>{keyError}</ErrorMessage> : null}
            </div>
          </div>
          <div>
            <Button
              data-testid={'delete-button'}
              className={classes['LanguageRow__delete-button']}
              onClick={handleDeleteClick}
              icon={<Delete />}
              variant={ButtonVariant.Quiet}
            />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor={idForValue}>{languageName}</label>
        <div>
          <TextArea
            resize='vertical'
            id={idForValue}
            value={valueValue}
            onBlur={handleValueBlur}
            onChange={handleValueChange}
            rows={6}
          />
        </div>
      </div>
    </div>
  );
};
