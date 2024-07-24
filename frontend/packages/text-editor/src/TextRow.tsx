import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { TextResourceIdMutation, TextResourceVariable, TextTableRowEntry } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { TrashIcon, PencilIcon } from '@studio/icons';
import { TableCell, TableRow, Textfield } from '@digdir/designsystemet-react';

import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';

import { validateTextId } from './utils';
import { TextEntry } from './TextEntry';
import { Variables } from './Variables';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton } from '@studio/components';

export interface TextRowProps {
  idExists: (textResourceId: string) => boolean;
  removeEntry: ({ textId }) => void;
  textId: string;
  textRowEntries: TextTableRowEntry[];
  updateEntryId: (data: TextResourceIdMutation) => void;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
  variables: TextResourceVariable[];
  selectedLanguages: string[];
  showEditButton?: boolean;
  showDeleteButton?: boolean;
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
  showEditButton = true,
  showDeleteButton = true,
}: TextRowProps) => {
  const [textIdValue, setTextIdValue] = useState(textId);
  const [textIdEditOpen, setTextIdEditOpen] = useState(false);
  const [textVariables] = useState(variables);
  const [keyError, setKeyError] = useState('');
  const { t } = useTranslation();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  const handleTextIdChange = (newTextId: string): void => {
    const error = validateNewTextId(newTextId);

    setKeyError(error || '');
    setTextIdValue(newTextId);
  };

  const validateNewTextId = (newTextId: string): string | null => {
    if (newTextId === textId) {
      return null;
    }

    if (idExists(newTextId)) {
      return t('text_editor.key.error_duplicate');
    }
    const textIdValidationResult = validateTextId(newTextId);
    return textIdValidationResult ? t(textIdValidationResult) : null;
  };

  const handleTextIdBlur = () => {
    updateEntryId({ oldId: textId, newId: textIdValue });
  };

  const handleDeleteClick = () => {
    removeEntry({ textId });
  };

  return (
    <TableRow>
      <TableCell>
        {showDeleteButton && (
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.textRow-deletion-confirm')}
            onConfirm={handleDeleteClick}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            trigger={
              <StudioButton
                className={classes.deleteButton}
                icon={<TrashIcon title={`Slett ${textId}`} />}
                variant='tertiary'
                onClick={() => setIsConfirmDeleteDialogOpen((prevState) => !prevState)}
                aria-label={t('schema_editor.delete')}
              >
                {t('schema_editor.delete')}
              </StudioButton>
            }
          >
            <p>{t('schema_editor.textRow-deletion-text')}</p>
          </AltinnConfirmDialog>
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
          <TableCell
            key={translation.lang + '-' + textId}
            className={`${classes.textAreaCell} ${classes.cellContent}`}
          >
            <TextEntry
              {...translation}
              upsertTextResource={upsertTextResource}
              textId={textId}
              className={classes.textEntryComponent}
            />
          </TableCell>
        );
      })}
      <TableCell className={classes.cellContent}>
        <ButtonContainer className={classes.textIdContainer}>
          {textIdEditOpen ? (
            <Textfield
              value={textIdValue}
              aria-label={t('text_editor.key.edit', { textKey: textIdValue })}
              error={keyError}
              onBlur={keyError ? undefined : handleTextIdBlur}
              onChange={(e) => handleTextIdChange(e.target.value)}
              size='small'
            />
          ) : (
            <div role='text' aria-readonly className={classes.textId}>
              <span>{textIdValue}</span>
            </div>
          )}
          {showEditButton && (
            <StudioButton
              aria-label={t('text_editor.toggle_edit_mode', { textKey: textIdValue })}
              icon={<PencilIcon />}
              variant='tertiary'
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
