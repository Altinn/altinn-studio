import React, { useEffect, useState } from 'react';
import classes from './TextRow.module.css';
import type { TextDetail, TextResourceEntry } from './types';
import { Delete, InformationColored } from '@navikt/ds-icons';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ErrorMessage,
  PanelVariant,
  PopoverPanel,
  TextArea,
  TextField,
} from '@altinn/altinn-design-system';

export interface ILangRowProps {
  textId: string;
  langName: string;
  langCode: string;
  textResourceEntry: TextDetail;
  upsertEntry: (entry: TextResourceEntry) => void;
  removeEntry: (textResourceId: string) => void;
  updateEntryId: (oldId: string, newId: string) => void;
  idExists: (textResourceId: string) => boolean;
}

export const TextRow = ({
  textId,
  langName,
  langCode,
  textResourceEntry,
  upsertEntry,
  removeEntry,
  updateEntryId,
  idExists,
}: ILangRowProps) => {
  const [idValue, setIdValue] = useState(textId);
  const [valueValue, setValueValue] = useState(textResourceEntry?.value || '');
  const [keyError, setKeyError] = useState('');
  useEffect(() => {
    setValueValue(textResourceEntry?.value || '');
  }, [textResourceEntry]);
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    if (idExists(newValue)) {
      setKeyError('Denne IDen finnes allerede');
    } else {
      setKeyError('');
    }
    setIdValue(newValue);
  };
  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setValueValue(e.currentTarget.value);

  const handleIdBlur = () => {
    if (!keyError && textId !== idValue) {
      updateEntryId(textId, idValue);
    }
  };

  const handleValueBlur = () => {
    if (textResourceEntry?.value !== valueValue) {
      upsertEntry({ id: textId, value: valueValue });
    }
  };

  const handleDeleteClick = () => removeEntry(textId);

  const idForValue = `value-${langCode}-${textId}`;
  const variables = textResourceEntry?.variables || [];

  const [infoboxOpen, setInfoboxOpen] = useState(false);

  return (
    <li data-testid={'lang-row'} className={classes.textRow}>
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
        <label htmlFor={idForValue}>{langName}</label>
        <TextArea
          resize='vertical'
          id={idForValue}
          value={valueValue}
          onBlur={handleValueBlur}
          onChange={handleValueChange}
          rows={3}
        />
        {variables.map((variable) => (
          <div
            key={variable.key}
            className={classes.chip}
            title={'Det er ikke lagt til støtte for redigering av variabler i Studio.'}
          >
            {variable.key}: {variable.dataSource}
          </div>
        ))}
        {variables.length > 0 && (
          <span className={classes.infoButton}>
            <PopoverPanel
              title={'Kun for visning'}
              variant={PanelVariant.Info}
              trigger={
                <Button
                  icon={<InformationColored />}
                  variant={ButtonVariant.Quiet}
                  size={ButtonSize.Small}
                />
              }
              open={infoboxOpen}
              onOpenChange={setInfoboxOpen}
            >
              <div>Det er ikke mulig å redigere variabler i Studio.</div>
            </PopoverPanel>
          </span>
        )}
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
    </li>
  );
};
