import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { UpsertTextResourceMutation } from './types';
import { TrashIcon, PencilIcon } from '@navikt/aksel-icons';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ErrorMessage,
  TableCell,
  TableRow,
  TextField,
} from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';
import { TextResourceIdMutation, TextResourceVariable, TextTableRowEntry } from './types';
import { validateTextId } from './utils';
import { TextEntry } from './TextEntry';
import { Variables } from './Variables';
import { AltinnConfirmPopover } from 'app-shared/components';

export interface TextRowProps {
  idExists: (textResourceId: string) => boolean;
  removeEntry: ({ textId }) => void;
  textId: string;
  textRowEntries: TextTableRowEntry[];
  updateEntryId: (data: TextResourceIdMutation) => void;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
  variables: TextResourceVariable[];
  selectedLanguages: string[];
  showButton?: boolean;
}

export const TextRow = ({
  textId,
  textRowEntries,
  upsertTextResource,
  removeEntry,
  updateEntryId,
  idExists,
  variables,
  selectedLanguages,
  showButton = true,
}: TextRowProps) => {
  const [textIdValue, setTextIdValue] = useState(textId);
  const [textIdEditOpen, setTextIdEditOpen] = useState(false);
  const [textVariables] = useState(variables);
  const [keyError, setKeyError] = useState('');
  const { t } = useTranslation();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>();

  const handleTextIdChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newTextId = event.currentTarget.value;
    if (newTextId !== textId) {
      if (idExists(newTextId)) {
        setKeyError('Denne IDen finnes allerede');
      } else {
        setKeyError(validateTextId(newTextId));
      }
      setTextIdValue(newTextId);
    }
  };

  const handleTextIdBlur = () => {
    if (!keyError && textId !== textIdValue) {
      updateEntryId({ oldId: textId, newId: textIdValue });
    }
  };

  const handleDeleteClick = () => {
    removeEntry({ textId });
  };

  return (
    <TableRow data-testid={'lang-row'}>
      <TableCell>
        {showButton && (
          <AltinnConfirmPopover
            open={isConfirmDeleteOpen}
            confirmText={t('schema_editor.textRow-confirm-cancel-popover')}
            onConfirm={handleDeleteClick}
            onClose={() => setIsConfirmDeleteOpen(false)}
            placement='bottom'
            trigger={
              <Button
                className={classes.deleteButton}
                icon={<TrashIcon title={`Slett ${textId}`} />}
                variant={ButtonVariant.Quiet}
                onClick={() => setIsConfirmDeleteOpen((prevState) => !prevState)}
                aria-label={t('schema_editor.delete')}
              >
                {t('schema_editor.delete')}
              </Button>
            }
          >
            <p>{t('schema_editor.textRow-title-confirmCancel-popover')}</p>
          </AltinnConfirmPopover>
        )}
      </TableCell>
      {selectedLanguages.map((lang) => {
        let translation = textRowEntries.find((e) => e.lang === lang);
        if (!translation) {
          translation = {
            lang,
            translation: '',
          };
        }
        return (
          <TableCell key={translation.lang + '-' + textId} className={classes.textAreaCell}>
            <TextEntry {...translation} upsertTextResource={upsertTextResource} textId={textId} className={classes.textEntryComponent}/>
          </TableCell>
        );
      })}
      <TableCell>
        <ButtonContainer>
          {textIdEditOpen ? (
            <div>
              <TextField
                aria-label={'tekst key edit'}
                isValid={!keyError}
                value={textIdValue}
                type='text'
                onBlur={handleTextIdBlur}
                onChange={handleTextIdChange}
              />
              {keyError ? <ErrorMessage role='alertdialog'>{keyError}</ErrorMessage> : null}
            </div>
          ) : (
            <div role='text' aria-readonly className={classes.textId}>
              <span>{textIdValue}</span>
            </div>
          )}
          {showButton && (
            <Button
              aria-label={'toggle-textkey-edit'}
              icon={<PencilIcon className={classes.smallIcon} />}
              variant={ButtonVariant.Quiet}
              size={ButtonSize.Small}
              onClick={() => setTextIdEditOpen(!textIdEditOpen)}
            />
          )}
        </ButtonContainer>
      </TableCell>
      <TableCell>
        <Variables variables={textVariables} />
      </TableCell>
    </TableRow>
  );
};
