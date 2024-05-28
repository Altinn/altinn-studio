import React from 'react';
import classes from './ActionAndSubjectListItem.module.css';
import { Chip } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type ActionAndSubjectListItemProps = {
  title: string;
  onRemove: () => void;
};

export const ActionAndSubjectListItem = ({
  title,
  onRemove,
}: ActionAndSubjectListItemProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <Chip.Removable
        aria-label={`${t('general.delete')} ${title}`}
        size='small'
        onClick={onRemove}
      >
        {title}
      </Chip.Removable>
    </div>
  );
};
