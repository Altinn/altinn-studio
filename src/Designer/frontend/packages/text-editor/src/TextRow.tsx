import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { TextResourceIdMutation, TextResourceVariable, TextTableRowEntry } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { TrashIcon, PencilIcon } from 'libs/studio-icons/src';
import { Table } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { validateTextId } from './utils';
import { TextEntry } from './TextEntry';
import { Variables } from './Variables';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton, StudioTextfield } from '@studio/components-legacy';

export interface TextRowProps {
  idExists: (newTextId: string, oldTextId: string) => boolean;
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

  const validateNewTextId = (newTextId: string): string | undefined =>
    idExists(newTextId, textId)
      ? t('text_editor.key.error_duplicate')
      : validateTextId(newTextId) && t(validateTextId(newTextId));

  const handleTextIdBlur = () => {
    updateEntryId({ oldId: textId, newId: textIdValue });
  };

  const handleDeleteClick = () => {
    removeEntry({ textId });
  };

  return (
    <Table.Row>
      <Table.Cell>
        {showDeleteButton && (
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.textRow-deletion-confirm')}
            onConfirm={handleDeleteClick}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            triggerProps={{
              className: classes.deleteButton,
              icon: <TrashIcon title={`Slett ${textId}`} />,
              variant: 'tertiary',
              onClick: () => setIsConfirmDeleteDialogOpen((prevState) => !prevState),
              'aria-label': t('schema_editor.delete'),
              children: t('schema_editor.delete'),
            }}
          >
            <p>{t('schema_editor.textRow-deletion-text')}</p>
          </AltinnConfirmDialog>
        )}
      </Table.Cell>
      {selectedLanguages.map((lang) => {
        let translation = textRowEntries.find((e) => e.lang === lang);
        if (!translation) {
          translation = {
            lang,
            translation: '',
          };
        }
        return (
          <Table.Cell
            key={translation.lang + '-' + textId}
            className={`${classes.textAreaCell} ${classes.cellContent}`}
          >
            <TextEntry
              {...translation}
              upsertTextResource={upsertTextResource}
              textId={textId}
              className={classes.textEntryComponent}
            />
          </Table.Cell>
        );
      })}
      <Table.Cell className={classes.cellContent}>
        <div className={classes.textIdContainer}>
          {textIdEditOpen ? (
            <StudioTextfield
              value={textIdValue}
              aria-label={t('text_editor.key.edit', { textKey: textIdValue })}
              error={keyError}
              onBlur={keyError ? undefined : handleTextIdBlur}
              onChange={(e) => handleTextIdChange(e.target.value)}
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
        </div>
      </Table.Cell>
      <Table.Cell>
        <Variables variables={textVariables} />
      </Table.Cell>
    </Table.Row>
  );
};
