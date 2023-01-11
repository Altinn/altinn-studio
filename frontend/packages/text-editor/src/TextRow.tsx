import React, { useEffect, useState } from 'react';
import classes from './TextRow.module.css';
import type { TextDetail, TextResourceEntry } from './types';
import { Delete } from '@navikt/ds-icons';
import { TextArea, TextField } from '@altinn/altinn-design-system';
import { Button, ButtonVariant, ErrorMessage, } from '@digdir/design-system-react';
import { Variables } from './Variables';

export interface LangRowProps {
  textId: string;
  textData: TextDetail;
  langName: string;
  idExists: (textResourceId: string) => boolean;
  upsertEntry: (entry: TextResourceEntry) => void;
  removeEntry: ({ textId }) => void;
  updateEntryId: ({ oldId, newId }) => void;
}

export const TextRow = ({
  textId,
  langName,
  textData,
  upsertEntry,
  removeEntry,
  updateEntryId,
  idExists,
}: LangRowProps) => {
  const [textIdValue, setTextIdValue] = useState(textId);
  const [textEntryValue, setTextEntryValue] = useState(textData?.value || '');
  const [keyError, setKeyError] = useState('');
  useEffect(() => {
    setTextEntryValue(textData?.value || '');
  }, [textData]);
  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextEntryValue(e.currentTarget.value);

  const handleTextEntryBlur = () => {
    if (textData?.value !== textEntryValue) {
      upsertEntry({ ...textData, id: textId, value: textEntryValue });
    }
  };
  const isIllegalId = (textId: string) => Boolean(textId.toLowerCase().match(' ')); // TODO: create matcher
  const handleTextIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    if (!newValue) {
      setKeyError('TextId kan ikke være tom');
    } else if (idExists(newValue)) {
      setKeyError('Denne IDen finnes allerede');
    } else if (isIllegalId(newValue)) {
      setKeyError('Det er ikke tillat med mellomrom i en textId');
    } else {
      setKeyError('');
    }
    setTextIdValue(newValue || '');
  };
  const handleTextIdBlur = () => {
    if (!keyError && textId !== textIdValue) {
      updateEntryId({ oldId: textId, newId: textIdValue });
    }
  };

  const handleDeleteClick = () => removeEntry({ textId });

  const idForValue = `value-${langName}-${textId}`;
  const variables = textData?.variables || [];

  const [infoboxOpen, setInfoboxOpen] = useState(false);

  return (
    <li data-testid={'lang-row'} className={classes.textRow}>
      <div className={classes.leftCol}>
        <TextArea
          label={langName}
          resize='vertical'
          id={idForValue}
          value={textEntryValue}
          onBlur={handleTextEntryBlur}
          onChange={handleTextEntryChange}
          rows={3}
        />
        <Variables
          infoboxOpen={infoboxOpen}
          setInfoboxOpen={setInfoboxOpen}
          variables={variables}
        />
      </div>
      <div className={classes.centerCol}>
        <TextField
          isValid={!keyError}
          value={textIdValue}
          type='text'
          onBlur={handleTextIdBlur}
          onChange={handleTextIdChange}
          label={'ID'}
        />
        {keyError ? <ErrorMessage>{keyError}</ErrorMessage> : null}
      </div>
      <div className={classes.rightCol}>
        <Button
          data-testid={'delete-button'}
          className={classes.deleteButton}
          onClick={handleDeleteClick}
          icon={<Delete />}
          variant={ButtonVariant.Quiet}
        >
          <span className={'sr-only'}>{`Slett ${textId}`}</span>
        </Button>
      </div>
    </li>
  );
};
