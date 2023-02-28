import React, { useEffect, useState } from 'react';
import classes from './TextRow.module.css';
import type { TextDetail, TextResourceEntry } from './types';
import { Delete } from '@navikt/ds-icons';
import {
  Button,
  ButtonVariant,
  ErrorMessage,
  Popover,
  PopoverVariant,
  TextArea,
  TextField,
} from '@digdir/design-system-react';
import { Variables } from './Variables';
import { ButtonColor } from '@altinn/altinn-design-system';

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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

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
  const isIllegalId = (textIdToCheck: string) => Boolean(textIdToCheck.toLowerCase().match(' ')); // TODO: create matcher

  const validateTextId = (textIdToValidate: string): string => {
    if (!textIdToValidate) {
      return 'TextId kan ikke være tom';
    }

    if (idExists(textIdToValidate)) {
      return 'Denne IDen finnes allerede';
    }

    if (isIllegalId(textIdToValidate)) {
      return 'Det er ikke tillat med mellomrom i en textId';
    }

    return '';
  };

  const handleTextIdChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newTextId = event.currentTarget.value;
    const validationResult = validateTextId(newTextId);

    setKeyError(validationResult);
    setTextIdValue(newTextId);
  };

  const handleTextIdBlur = () => {
    if (!keyError && textId !== textIdValue) {
      updateEntryId({ oldId: textId, newId: textIdValue });
    }
  };

  const handleDeleteClick = () => {
    removeEntry({ textId });
  };

  const handleCancelClick = () => {
    setIsConfirmDeleteOpen((prev) => !prev);
  };

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
        <Popover
          title={'Slett_rad'}
          variant={PopoverVariant.Warning}
          placement={'left'}
          trigger={
            <Button
              className={classes.deleteButton}
              icon={<Delete title={`Slett ${textId}`} />}
              variant={ButtonVariant.Quiet}
              onClick={() => setIsConfirmDeleteOpen(true)}
            >
              <span>{`Slett`}</span>
            </Button>
          }
        >
          {isConfirmDeleteOpen && (
            <div>
              <p>Er du sikker på at du vil slette denne raden?</p>
              <div className={classes.popoverButtons}>
                <Button
                  className={classes.popoverConfirmBtn}
                  onClick={handleDeleteClick}
                  color={ButtonColor.Danger}
                >
                  Ja, slett raden
                </Button>
                <Button
                  variant={ButtonVariant.Quiet}
                  onClick={handleCancelClick}
                  color={ButtonColor.Secondary}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </Popover>
      </div>
    </li>
  );
};
