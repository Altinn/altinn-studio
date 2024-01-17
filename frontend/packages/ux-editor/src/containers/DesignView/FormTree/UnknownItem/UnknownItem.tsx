import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, HelpText } from '@digdir/design-system-react';
import { QuestionmarkDiamondIcon, TrashIcon } from '@studio/icons';
import { IInternalLayout } from '../../../../types/global';
import { useDeleteUnknownComponentReference } from './useDeleteUnknownComponentReference';

import classes from './UnknownReferencedItem.module.css';

type UnknownReferencedItemProps = {
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
        <Button
          color='danger'
          icon={<TrashIcon />}
          onClick={handleDelete}
          size='small'
          title={t('general.delete')}
          variant='tertiary'
        />
        <HelpText size='small' title='Ukjent komponent' className={classes.helpText}>
          {t('ux_editor.unknown_group_reference', {
            id,
          })}
        </HelpText>
      </div>
    </div>
  );
};
