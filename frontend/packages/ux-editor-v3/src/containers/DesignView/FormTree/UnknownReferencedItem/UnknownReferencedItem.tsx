import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpText } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { QuestionmarkDiamondIcon, TrashIcon } from '@studio/icons';
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
          size='small'
          title={t('general.delete')}
          variant='tertiary'
        />
        <HelpText
          size='small'
          title={t('ux_editor.unknown_group_reference_help_text_title')}
          className={classes.helpText}
        >
          {t('ux_editor.unknown_group_reference', {
            id,
          })}
        </HelpText>
      </div>
    </div>
  );
};
