import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { TextResourceFile } from './types';

type IdChange = { from: string; to?: string };
type TranslationChange = { textId: string; to?: string };

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

export interface LanguageRowProps {
  languageName: string;
  langCode: string;
  textId: string;
  textResources?: TextResourceFile;
  onTextIdChange: (change: IdChange) => void;
  onTranslationChange: (change: TranslationChange) => void;
  onRemoveEntry: (textId: string) => void;
  idExists: (textResourceId: string) => boolean;
}

export const TextRow = ({
  languageName,
  langCode,
  textId,
  textResources,
  onTextIdChange,
  onTranslationChange,
  onRemoveEntry,
  idExists,
}: LanguageRowProps) => {
  const getTextResource = (id: string) => (textResources || {})[id];
  const [idValue, setIdValue] = useState(textId);
  const [translationValue, setTranslationValue] = useState(getTextResource(textId));
  const [textIdError, setTextIdError] = useState('');

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.currentTarget.value;
    setTextIdError('');
    setIdValue(newId);
    if (idExists(newId)) {
      setTextIdError('Denne IDen finnes allerede');
    }
  };
  const handleTranslationValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTranslationValue(e.currentTarget.value);

  const handleIdBlur = () => {
    if (!textIdError && textId !== idValue) {
      onTextIdChange({ from: textId, to: idValue });
    }
  };

  const handleTranslationValueBlur = () => {
    if (getTextResource(textId) || '' !== translationValue) {
      onTranslationChange({ to: translationValue, textId });
    }
  };

  const handleDeleteClick = () => onRemoveEntry(textId);

  const variables = [];

  const translationDomId = `value-${langCode}-${textId}`;
  const [infoboxOpen, setInfoboxOpen] = useState(false);

  return (
    <div data-testid={'lang-row'} className={classes.textRow}>
      <div className={classes.leftCol}>
        <TextField
          isValid={!textIdError}
          value={idValue}
          type='text'
          onBlur={handleIdBlur}
          onChange={handleIdChange}
          label={'ID'}
        />
        {textIdError ? <ErrorMessage>{textIdError}</ErrorMessage> : null}
      </div>
      <div className={classes.centerCol}>
        <label htmlFor={translationDomId}>{languageName}</label>
        <div>
          <TextArea
            resize='vertical'
            id={translationDomId}
            value={translationValue}
            onBlur={handleTranslationValueBlur}
            onChange={handleTranslationValueChange}
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
