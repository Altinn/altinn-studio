import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { UpsertTextResourcesMutation } from './types';
import { TrashIcon, PencilIcon } from '@navikt/aksel-icons';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ErrorMessage,
  Popover,
  PopoverVariant,
  TableCell,
  TableRow,
  TextField,
} from '@digdir/design-system-react';
import { ButtonColor } from '@altinn/altinn-design-system';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';
import { TextResourceIdMutation, TextResourceVariable, TextTableRowEntry } from './types';
import { validateTextId } from './utils';
import { TextEntry } from './TextEntry';
import { Variables } from './Variables';

export interface TextRowProps {
  idExists: (textResourceId: string) => boolean;
  removeEntry: ({ textId }) => void;
  textId: string;
  textRowEntries: TextTableRowEntry[];
  updateEntryId: (data: TextResourceIdMutation) => void;
  upsertTextResource: (data: UpsertTextResourcesMutation) => void;
  variables: TextResourceVariable[];
}

export const TextRow = ({
  textId,
  textRowEntries,
  upsertTextResource,
  removeEntry,
  updateEntryId,
  idExists,
  variables,
}: TextRowProps) => {
  const [textIdValue, setTextIdValue] = useState(textId);
  const [textIdEditOpen, setTextIdEditOpen] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const { t } = useTranslation();

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

  const handleDeleteClick = () => removeEntry({ textId });

  const toggleConfirmDeletePopover = () => setIsConfirmDeleteOpen((prev) => !prev);

  return (
    <TableRow data-testid={'lang-row'}>
      {textRowEntries.map((translation) => (
        <TableCell key={translation.lang + '-' + textId}>
          <TextEntry {...translation} upsertTextResource={upsertTextResource} textId={textId} />
        </TableCell>
      ))}
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
              {keyError ? <ErrorMessage>{keyError}</ErrorMessage> : null}
            </div>
          ) : (
            <div role='text' aria-readonly>
              {textIdValue}
            </div>
          )}
          <Button
            aria-label={'toggle-textkey-edit'}
            icon={<PencilIcon style={{ height: '16px', width: '16px' }} />}
            variant={ButtonVariant.Quiet}
            size={ButtonSize.Small}
            onClick={() => setTextIdEditOpen(!textIdEditOpen)}
          />
        </ButtonContainer>
      </TableCell>
      <TableCell>
        <Variables variables={variables} />
      </TableCell>
      <TableCell>
        <Popover
          title={'Slett_rad'}
          variant={PopoverVariant.Warning}
          placement={'left'}
          open={isConfirmDeleteOpen}
          trigger={
            <Button
              className={classes.deleteButton}
              icon={<TrashIcon title={`Slett ${textId}`} />}
              variant={ButtonVariant.Quiet}
              onClick={toggleConfirmDeletePopover}
              aria-label={t('schema_editor.delete')}
            >
              {t('schema_editor.delete')}
            </Button>
          }
        >
          {isConfirmDeleteOpen && (
            <div>
              <p>{t('schema_editor.textRow-title-confirmCancel-popover')}</p>
              <div className={classes.popoverButtons}>
                <Button onClick={handleDeleteClick} color={ButtonColor.Danger}>
                  <p>{t('schema_editor.textRow-confirm-cancel-popover')}</p>
                </Button>
                <Button
                  variant={ButtonVariant.Quiet}
                  onClick={toggleConfirmDeletePopover}
                  color={ButtonColor.Secondary}
                >
                  <p>{t('schema_editor.textRow-cancel-popover')}</p>
                </Button>
              </div>
            </div>
          )}
        </Popover>
      </TableCell>
    </TableRow>
  );
};
