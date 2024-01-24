import React, { useState } from 'react';
import classes from './TextRow.module.css';
import type { UpsertTextResourceMutation } from './types';
import { TrashIcon, PencilIcon } from '@navikt/aksel-icons';
import { ErrorMessage, TableCell, TableRow, LegacyTextField } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';
import type { TextResourceIdMutation, TextResourceVariable, TextTableRowEntry } from './types';
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
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

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
    <TableRow>
      <TableCell>
        {showButton && (
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
                size='small'
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
          <TableCell key={translation.lang + '-' + textId} className={classes.textAreaCell}>
            <TextEntry
              {...translation}
              upsertTextResource={upsertTextResource}
              textId={textId}
              className={classes.textEntryComponent}
            />
          </TableCell>
        );
      })}
      <TableCell>
        <ButtonContainer>
          {textIdEditOpen ? (
            <div>
              <LegacyTextField
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
            <StudioButton
              aria-label={'toggle-textkey-edit'}
              icon={<PencilIcon className={classes.smallIcon} />}
              variant='tertiary'
              size='small'
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
