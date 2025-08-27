import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { StudioHelpText } from 'libs/studio-components/src';
import { QuestionmarkDiamondIcon, TrashIcon } from 'libs/studio-icons/src';
import type { IInternalLayout } from '../../../../types/global';
import { useDeleteUnknownComponentReference } from './useDeleteUnknownComponentReference';
import classes from './UnknownReferencedItem.module.css';

export type UnknownReferencedItemProps = {
  id: string;
  layout: IInternalLayout;
};
export const UnknownReferencedItem = ({ id, layout }: UnknownReferencedItemProps) => {
  const { t } = useTranslation();
  const deleteUnknownComponentReference = useDeleteUnknownComponentReference();

  const handleDelete = async (): Promise<void> => {
    await deleteUnknownComponentReference(layout, id);
  };

  return (
    <div className={classes.unknownReferencedItem}>
      <div className={classes.title}>
        <QuestionmarkDiamondIcon />
        {id}
      </div>
      <div className={classes.title}>
        <StudioButton
          color='danger'
          icon={<TrashIcon />}
          onClick={handleDelete}
          title={t('general.delete')}
          variant='tertiary'
        />
        <StudioHelpText
          aria-label={t('ux_editor.unknown_group_reference_help_text_title')}
          className={classes.helpText}
        >
          {t('ux_editor.unknown_group_reference', {
            id,
          })}
        </StudioHelpText>
      </div>
    </div>
  );
};
